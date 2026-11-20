/**
 * lib/quick-add-parser.ts
 * Bộ phân tích câu nhập nhanh tiếng Việt — thuần quy tắc, không dùng AI.
 *
 *  "trà sữa 35k momo"      → 35.000 ₫ · Ăn uống · Ví MoMo
 *  "tiền trọ 2tr5 ck"      → 2.500.000 ₫ · Tiền trọ · Ngân hàng
 *  "hôm qua grab 45 nghìn" → 45.000 ₫ · Di chuyển · hôm qua
 */
import { CategoryId, Wallet } from "@/types";
import { CATEGORIES } from "./constants";

// ── Helpers: so khớp không phân biệt dấu ─────────────────────

const VARIANTS: Record<string, string> = {
  a: "aàáảãạăằắẳẵặâầấẩẫậ",
  e: "eèéẻẽẹêềếểễệ",
  i: "iìíỉĩị",
  o: "oòóỏõọôồốổỗộơờớởỡợ",
  u: "uùúủũụưừứửữự",
  y: "yỳýỷỹỵ",
  d: "dđ",
};

/** Ranh giới từ hỗ trợ Unicode (\b của JS chỉ hiểu ASCII) */
const B = "(?<![\\p{L}\\p{N}])";
const E = "(?![\\p{L}\\p{N}])";

export function stripDiacritics(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** "tra sua" → pattern khớp cả "trà sữa", "tra sua", "trà sua"... */
export function keywordPattern(keyword: string): string {
  const base = stripDiacritics(keyword.toLowerCase()).trim();
  return base
    .split(/\s+/)
    .map((word) =>
      [...word].map((ch) => (VARIANTS[ch] ? `[${VARIANTS[ch]}]` : escapeRe(ch))).join("")
    )
    .join("\\s+");
}

function kwRegex(keyword: string, prefix = ""): RegExp {
  return new RegExp(`${B}${prefix}${keywordPattern(keyword)}${E}`, "u");
}

// ── Số tiền ──────────────────────────────────────────────────

export interface AmountMatch {
  amount: number;
  index: number;
  length: number;
  hasUnit: boolean;
}

const NUM = "\\d+(?:[.,]\\d+)?";
const toNum = (s: string) => parseFloat(s.replace(",", "."));
/** "5" → 0.5, "25" → 0.25, "500" → 0.5 (dùng cho 1tr5, 2tr500, 1k5) */
const frac = (digits: string) => Number(digits) / 10 ** digits.length;

interface AmountRule {
  re: RegExp;
  calc: (m: RegExpMatchArray) => number;
  unit: boolean;
}

const AMOUNT_RULES: AmountRule[] = [
  // 1tr5, 2tr500, 1 triệu 2, 1 củ 5
  {
    re: new RegExp(`${B}(\\d+)\\s*(?:triệu|trieu|tr|củ|cu)\\s*(\\d{1,3})${E}`, "gu"),
    calc: (m) => (Number(m[1]) + frac(m[2])) * 1e6,
    unit: true,
  },
  // 1 tỷ, 1.2 tỷ
  {
    re: new RegExp(`${B}(${NUM})\\s*(?:tỷ|tỉ|ty)${E}`, "gu"),
    calc: (m) => toNum(m[1]) * 1e9,
    unit: true,
  },
  // 2tr, 1.5tr, 1,5 triệu, 2 củ
  {
    re: new RegExp(`${B}(${NUM})\\s*(?:triệu|trieu|tr|củ|cu)${E}`, "gu"),
    calc: (m) => toNum(m[1]) * 1e6,
    unit: true,
  },
  // 1k5 → 1.500
  {
    re: new RegExp(`${B}(\\d+)\\s*k\\s*(\\d{1,3})${E}`, "gu"),
    calc: (m) => (Number(m[1]) + frac(m[2])) * 1e3,
    unit: true,
  },
  // 35k, 50 nghìn, 50 ngàn, 2.5k
  {
    re: new RegExp(`${B}(${NUM})\\s*(?:nghìn|nghin|ngàn|ngan|ng|k)${E}`, "gu"),
    calc: (m) => toNum(m[1]) * 1e3,
    unit: true,
  },
  // 29.000đ, 50000, 45 (số trần < 1000 được hiểu là nghìn)
  {
    re: new RegExp(`${B}(\\d{1,3}(?:[.,]\\d{3})+|\\d+)\\s*(đồng|dong|vnđ|vnd|đ)?${E}`, "gu"),
    calc: (m) => {
      const raw = m[1];
      const hasSeparator = /[.,]\d{3}/.test(raw);
      const n = Number(raw.replace(/[.,]/g, ""));
      if (!m[2] && !hasSeparator && n < 1000) return n * 1000;
      return n;
    },
    unit: false,
  },
];

/**
 * Tìm số tiền đầu tiên trong câu. Ưu tiên cụm có đơn vị (k, tr, nghìn...)
 * hơn số trần, để "sách giải tích 1 120k" ra 120.000 chứ không phải 1.000.
 */
export function parseAmount(input: string): AmountMatch | null {
  const text = input.normalize("NFC").toLowerCase();
  const found: AmountMatch[] = [];

  for (const rule of AMOUNT_RULES) {
    for (const m of text.matchAll(rule.re)) {
      const amount = Math.round(rule.calc(m));
      if (amount > 0 && Number.isFinite(amount)) {
        found.push({ amount, index: m.index ?? 0, length: m[0].length, hasUnit: rule.unit });
      }
    }
  }
  if (found.length === 0) return null;

  const pool = found.some((f) => f.hasUnit) ? found.filter((f) => f.hasUnit) : found;
  pool.sort((a, b) => a.index - b.index || b.length - a.length);
  return pool[0];
}

// ── Danh mục ─────────────────────────────────────────────────

/** Từ khóa viết không dấu. Từ khóa dài hơn thắng (vd "tien nuoc" > "nuoc"). */
const CATEGORY_KEYWORDS: Partial<Record<CategoryId, string[]>> = {
  food: [
    "an", "an sang", "an trua", "an toi", "an vat", "an uong", "com", "pho", "bun", "mi",
    "mien", "chao", "banh mi", "banh", "tra sua", "tra da", "tra chanh", "tra dao", "cafe",
    "ca phe", "cf", "nuoc", "nuoc ngot", "sinh to", "lau", "nuong", "do an", "sieu thi",
    "di cho", "gong cha", "highlands", "phuc long", "mixue", "kfc", "lotteria", "pizza", "bia",
  ],
  transport: [
    "grab", "gojek", "xanh sm", "taxi", "xe om", "xe buyt", "xe bus", "bus", "xang",
    "do xang", "gui xe", "ve xe", "sua xe", "di lai",
  ],
  shopping: [
    "mua", "ao", "quan", "giay", "dep", "tui", "shopee", "lazada", "tiki", "tiktok shop",
    "my pham", "dien thoai", "tai nghe", "quan ao", "mua sam",
  ],
  entertainment: [
    "phim", "xem phim", "cgv", "lotte cinema", "game", "nap game", "karaoke", "netflix",
    "spotify", "youtube premium", "du lich", "bida", "giai tri",
  ],
  health: ["thuoc", "kham", "benh vien", "nha thuoc", "gym", "vitamin", "nha khoa", "suc khoe"],
  education: [
    "sach", "giao trinh", "hoc phi", "photo", "in tai lieu", "khoa hoc", "but", "tieng anh",
    "ielts", "hoc", "tien hoc",
  ],
  rent: ["tien tro", "tien phong", "phong tro", "thue nha", "tien nha", "nha tro"],
  utilities: ["tien dien", "tien nuoc", "dien nuoc", "dien", "gas", "hoa don"],
  internet: ["tien mang", "cuoc mang", "wifi", "internet", "4g", "5g", "goi data", "nap the"],
  salary: ["luong", "nhan luong", "tien thuong", "nhan thuong", "thuong tet"],
  family: [
    "me gui", "ba gui", "bo gui", "gia dinh", "nha gui", "me cho", "bo cho", "ba cho",
    "tien nha cho", "li xi", "mung tuoi",
  ],
  freelance: [
    "lam them", "day kem", "gia su", "freelance", "part time", "ban hang", "ban do", "hoa hong",
  ],
  savings: ["tiet kiem", "gui tiet kiem"],
};

const CATEGORY_MATCHERS = Object.entries(CATEGORY_KEYWORDS).flatMap(([id, kws]) =>
  (kws ?? []).map((kw) => ({ id: id as CategoryId, score: kw.length, re: kwRegex(kw) }))
);

const INCOME_HINTS = ["nhan", "duoc cho", "thu nhap", "hoan tien", "duoc tra"].map((kw) => kwRegex(kw));

// ── Ví ───────────────────────────────────────────────────────

const norm = (s: string) => stripDiacritics(s.toLowerCase());
/** Cho phép nuốt luôn từ nối "bằng"/"qua" phía trước tên ví khi làm sạch ghi chú */
const WALLET_PREFIX = "(?:(?:bằng|bang|qua)\\s+)?";

const WALLET_HINTS: { kws: string[]; match: (w: Wallet) => boolean }[] = [
  {
    kws: ["momo", "vi momo"],
    match: (w) => w.id === "momo" || norm(w.name).includes("momo"),
  },
  {
    kws: ["zalopay", "zalo pay"],
    match: (w) => norm(w.name).includes("zalo"),
  },
  {
    kws: ["tien mat", "cash", "tm"],
    match: (w) => w.id === "cash" || /tien mat|cash/.test(norm(w.name)),
  },
  {
    kws: [
      "ck", "chuyen khoan", "quet the", "the ngan hang", "bank", "ngan hang", "atm", "vcb",
      "vietcombank", "techcombank", "tcb", "mbbank", "mb bank", "acb", "bidv", "tpbank", "vpbank",
    ],
    match: (w) =>
      w.id === "bank" ||
      /ngan hang|bank|vcb|vietcombank|techcombank|bidv|acb|tpbank|vpbank|\bmb\b/.test(norm(w.name)),
  },
];

// ── Ngày ─────────────────────────────────────────────────────

const DATE_HINTS: { re: RegExp; offset: number }[] = [
  { re: kwRegex("hom kia"), offset: -2 },
  { re: kwRegex("hom qua"), offset: -1 },
  { re: kwRegex("toi qua"), offset: -1 },
  { re: kwRegex("hom nay"), offset: 0 },
];

// ── Kết quả ──────────────────────────────────────────────────

export interface QuickAddResult {
  amount: number | null;
  type: "income" | "expense";
  categoryId: CategoryId;
  walletId?: string;
  dateOffset: number; // 0 = hôm nay, -1 = hôm qua
  note: string;
  matched: { category: boolean; wallet: boolean; date: boolean };
}

type Range = [number, number];

export function parseQuickAdd(input: string, wallets: Wallet[] = []): QuickAddResult {
  const original = input.normalize("NFC");
  const text = original.toLowerCase();
  const remove: Range[] = [];

  // 1. Số tiền
  const amt = parseAmount(text);
  if (amt) remove.push([amt.index, amt.index + amt.length]);

  // 2. Ngày
  let dateOffset = 0;
  let dateMatched = false;
  for (const { re, offset } of DATE_HINTS) {
    const m = re.exec(text);
    if (m) {
      dateOffset = offset;
      dateMatched = true;
      remove.push([m.index, m.index + m[0].length]);
      break;
    }
  }

  // 3. Ví — ưu tiên tên ví người dùng đặt, rồi mới tới từ khóa gợi ý
  let walletId: string | undefined;
  const tryWallet = (pattern: string, id: string) => {
    if (walletId) return;
    const m = new RegExp(`${B}${WALLET_PREFIX}${pattern}${E}`, "u").exec(text);
    if (m) {
      walletId = id;
      remove.push([m.index, m.index + m[0].length]);
    }
  };
  for (const w of wallets) {
    const name = w.name.replace(/\(.*?\)/g, "").trim();
    if (name.length >= 3) tryWallet(keywordPattern(name), w.id);
  }
  for (const hint of WALLET_HINTS) {
    const target = wallets.find(hint.match);
    if (!target) continue;
    for (const kw of hint.kws) tryWallet(keywordPattern(kw), target.id);
  }

  // 4. Danh mục — chấm điểm theo độ dài từ khóa
  let categoryId: CategoryId = "other";
  let bestScore = 0;
  for (const m of CATEGORY_MATCHERS) {
    if (m.score > bestScore && m.re.test(text)) {
      bestScore = m.score;
      categoryId = m.id;
    }
  }

  // 5. Loại giao dịch
  const plus = /^\s*\+/.test(text);
  const incomeHint = INCOME_HINTS.some((re) => re.test(text));
  const catType = CATEGORIES[categoryId].type;
  let type: "income" | "expense" = "expense";
  if (plus || incomeHint || catType === "income") type = "income";
  if (type === "income" && catType === "expense") categoryId = "other";

  // 6. Ghi chú = câu gốc trừ đi các phần đã nhận diện
  let note = original;
  [...remove]
    .sort((a, b) => b[0] - a[0])
    .forEach(([s, e]) => {
      note = note.slice(0, s) + " " + note.slice(e);
    });
  note = note
    .replace(/^\s*\+/, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s,.;:–-]+|[\s,.;:–-]+$/g, "")
    .trim();

  return {
    amount: amt?.amount ?? null,
    type,
    categoryId,
    walletId,
    dateOffset,
    note,
    matched: { category: bestScore > 0, wallet: Boolean(walletId), date: dateMatched },
  };
}
