import { describe, it, expect } from "vitest";
import { parseAmount, parseQuickAdd } from "@/lib/quick-add-parser";
import { Wallet } from "@/types";

const WALLETS: Wallet[] = [
  { id: "cash", name: "Tiền mặt", balance: 0, icon: "Wallet", color: "#000" },
  { id: "bank", name: "Vietcombank (VCB)", balance: 0, icon: "CreditCard", color: "#000" },
  { id: "momo", name: "Ví MoMo", balance: 0, icon: "Smartphone", color: "#000" },
  { id: "savings-locked", name: "Ống heo", balance: 0, icon: "PiggyBank", color: "#000", isLocked: true },
];

describe("parseAmount — các cách viết số tiền", () => {
  it.each([
    ["35k", 35_000],
    ["35 k", 35_000],
    ["2.5k", 2_500],
    ["1k5", 1_500],
    ["50 nghìn", 50_000],
    ["50 ngàn", 50_000],
    ["50 nghin", 50_000],
    ["1tr5", 1_500_000],
    ["2tr500", 2_500_000],
    ["1tr05", 1_050_000],
    ["1.5tr", 1_500_000],
    ["1,5tr", 1_500_000],
    ["2 triệu", 2_000_000],
    ["2 triệu 5", 2_500_000],
    ["3 củ", 3_000_000],
    ["1 tỷ", 1_000_000_000],
    ["29.000đ", 29_000],
    ["1.500.000", 1_500_000],
    ["50000", 50_000],
    ["45", 45_000], // số trần < 1000 hiểu là nghìn
    ["500đ", 500],
  ])("%s → %d", (input, expected) => {
    expect(parseAmount(input)?.amount).toBe(expected);
  });

  it("không nhận nhầm đơn vị khác (35kg, 29 ngày)", () => {
    expect(parseAmount("35kg")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
  });

  it("ưu tiên cụm có đơn vị hơn số trần", () => {
    expect(parseAmount("sách giải tích 1 120k")?.amount).toBe(120_000);
  });
});

type Case = {
  input: string;
  amount: number | null;
  type?: "income" | "expense";
  category?: string;
  wallet?: string;
  note?: string;
  dateOffset?: number;
};

const CASES: Case[] = [
  { input: "trà sữa 35k", amount: 35_000, type: "expense", category: "food", note: "trà sữa" },
  { input: "trà sữa 35k momo", amount: 35_000, category: "food", wallet: "momo", note: "trà sữa" },
  { input: "cơm trưa 40k tiền mặt", amount: 40_000, category: "food", wallet: "cash", note: "cơm trưa" },
  { input: "grab 45k momo", amount: 45_000, category: "transport", wallet: "momo", note: "grab" },
  { input: "grab 45k bằng momo", amount: 45_000, wallet: "momo", note: "grab" },
  { input: "tiền trọ 2tr5", amount: 2_500_000, category: "rent", note: "tiền trọ" },
  { input: "lương làm thêm 1.5tr", amount: 1_500_000, type: "income", category: "freelance" },
  { input: "mẹ gửi 3 triệu", amount: 3_000_000, type: "income", category: "family", note: "mẹ gửi" },
  { input: "bánh mì 15 nghìn", amount: 15_000, category: "food" },
  { input: "xăng 50 ngàn", amount: 50_000, category: "transport" },
  { input: "sách giải tích 120k ck", amount: 120_000, category: "education", wallet: "bank", note: "sách giải tích" },
  { input: "tiền điện 320k", amount: 320_000, category: "utilities" },
  { input: "wifi 110k", amount: 110_000, category: "internet" },
  { input: "50.000 tiền mạng", amount: 50_000, category: "internet" },
  { input: "xem phim cgv 90k", amount: 90_000, category: "entertainment" },
  { input: "thuốc cảm 25k", amount: 25_000, category: "health" },
  { input: "áo thun 1tr2", amount: 1_200_000, category: "shopping" },
  { input: "+500k dạy kèm", amount: 500_000, type: "income", category: "freelance", note: "dạy kèm" },
  { input: "cà phê 29.000đ", amount: 29_000, category: "food", note: "cà phê" },
  { input: "1,5tr tiền phòng", amount: 1_500_000, category: "rent", note: "tiền phòng" },
  { input: "phở 45", amount: 45_000, category: "food" },
  { input: "hôm qua trà sữa 55k", amount: 55_000, category: "food", dateOffset: -1, note: "trà sữa" },
  { input: "hôm kia gửi xe 5k", amount: 5_000, category: "transport", dateOffset: -2 },
  { input: "nhận thưởng 2 củ", amount: 2_000_000, type: "income", category: "salary" },
  { input: "shopee 250k", amount: 250_000, category: "shopping" },
  { input: "1k5 trà đá", amount: 1_500, category: "food", note: "trà đá" },
  { input: "TRÀ SỮA 35K", amount: 35_000, category: "food" },
  { input: "tra sua 35k", amount: 35_000, category: "food" }, // gõ không dấu
  { input: "2 triệu 5 tiền học", amount: 2_500_000, category: "education" },
  { input: "nhận tiền Minh trả 50k", amount: 50_000, type: "income", category: "other" },
  { input: "abc", amount: null, category: "other", type: "expense" },
  { input: "", amount: null, category: "other", type: "expense", note: "" },
  { input: "   ", amount: null, category: "other", type: "expense", note: "" },
  { input: "mua đồ mà quên giá", amount: null, category: "shopping", type: "expense" },
  { input: "0k trà đá", amount: null, category: "food", type: "expense" },
  { input: "tiền thưởng dự án 1.2 tỷ ck", amount: 1_200_000_000, type: "income", category: "salary", wallet: "bank" },
];

describe(`parseQuickAdd — ${CASES.length} câu mẫu tiếng Việt`, () => {
  it.each(CASES)("$input", (c) => {
    const r = parseQuickAdd(c.input, WALLETS);
    expect(r.amount).toBe(c.amount);
    if (c.type) expect(r.type).toBe(c.type);
    if (c.category) expect(r.categoryId).toBe(c.category);
    if (c.wallet) expect(r.walletId).toBe(c.wallet);
    if (c.note !== undefined) expect(r.note).toBe(c.note);
    expect(r.dateOffset).toBe(c.dateOffset ?? 0);
  });

  it("không đoán ví khi câu không nhắc tới ví", () => {
    expect(parseQuickAdd("trà sữa 35k", WALLETS).walletId).toBeUndefined();
  });

  it("nhận diện theo tên ví người dùng tự đặt", () => {
    const custom: Wallet[] = [{ id: "w9", name: "Thẻ sinh viên", balance: 0, icon: "Wallet", color: "#000" }];
    expect(parseQuickAdd("cơm 30k thẻ sinh viên", custom).walletId).toBe("w9");
  });

  it("xử lý ghi chú rất dài (> 1000 ký tự) nhanh chóng, không bị treo", () => {
    const longNote = "mua đồ siêu thị " + "rất nhiều món ngon ".repeat(80) + " 150k momo";
    const r = parseQuickAdd(longNote, WALLETS);
    expect(r.amount).toBe(150_000);
    expect(r.walletId).toBe("momo");
    expect(r.note.length).toBeGreaterThan(500);
  });
});
