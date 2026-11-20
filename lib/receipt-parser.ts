/**
 * lib/receipt-parser.ts
 * Parse & validate JSON kết quả đọc hóa đơn từ AI bằng try/catch + Zod.
 */
import { z } from "zod";
import { CategoryId } from "@/types";
import { CATEGORIES } from "./constants";
import { stripDiacritics } from "./quick-add-parser";

const VALID_CATEGORY_IDS = Object.keys(CATEGORIES) as CategoryId[];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarDate(dateStr: string): boolean {
  if (!DATE_RE.test(dateStr)) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function mapSuggestedCategory(raw: string): CategoryId {
  if (!raw || typeof raw !== "string") return "other";
  const cleaned = stripDiacritics(raw.toLowerCase()).trim();

  // Khớp trực tiếp slug CategoryId
  if ((VALID_CATEGORY_IDS as string[]).includes(cleaned)) {
    return cleaned as CategoryId;
  }

  // Khớp theo tên tiếng Việt của CATEGORIES
  for (const cat of Object.values(CATEGORIES)) {
    if (stripDiacritics(cat.name.toLowerCase()) === cleaned) {
      return cat.id;
    }
  }

  // Khớp từ khóa phổ biến
  if (/an|uong|food|cafe|coffee|tra sua|restaurant|sieu thi|mart|grocery/.test(cleaned)) {
    return "food";
  }
  if (/di chuyen|transport|grab|xang|xe|taxi|bus/.test(cleaned)) return "transport";
  if (/mua sam|shopping|quan ao|fashion|retail/.test(cleaned)) return "shopping";
  if (/giai tri|entertainment|phim|cinema|game/.test(cleaned)) return "entertainment";
  if (/suc khoe|health|thuoc|pharmacy|medical/.test(cleaned)) return "health";
  if (/hoc|education|sach|book|stationery/.test(cleaned)) return "education";
  if (/tro|rent|housing/.test(cleaned)) return "rent";
  if (/dien|nuoc|utilities|bill/.test(cleaned)) return "utilities";
  if (/mang|internet|wifi|telecom/.test(cleaned)) return "internet";

  return "other";
}

export const ReceiptItemSchema = z.object({
  name: z.string().trim().min(1, "Tên món không được trống"),
  amount: z
    .number()
    .finite("Giá món không hợp lệ")
    .nonnegative("Giá món không được âm"),
});

export const ReceiptSchema = z.object({
  merchant: z.string().trim().default(""),
  date: z
    .string()
    .nullable()
    .optional()
    .transform((val) => {
      if (!val) return null;
      const trimmed = val.trim();
      return isValidCalendarDate(trimmed) ? trimmed : null;
    }),
  total: z
    .number()
    .finite("Tổng tiền không hợp lệ")
    .positive("Tổng tiền phải lớn hơn 0"),
  items: z.array(ReceiptItemSchema).default([]),
  suggested_category: z
    .string()
    .default("other")
    .transform((val) => mapSuggestedCategory(val)),
});

export type ParsedReceipt = z.infer<typeof ReceiptSchema>;

export type ParseReceiptResult =
  | { ok: true; data: ParsedReceipt }
  | { ok: false; error: string };

/** Trích chuỗi JSON từ output có thể bị bọc ```json ... ``` hoặc chữ thừa */
function extractJsonText(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

export function parseReceiptResponse(raw: string | null | undefined): ParseReceiptResult {
  if (!raw || !raw.trim()) {
    return {
      ok: false,
      error: "AI không trả về dữ liệu. Vui lòng chụp lại rõ hơn hoặc nhập tay.",
    };
  }

  let parsedUnknown: unknown;
  try {
    parsedUnknown = JSON.parse(extractJsonText(raw));
  } catch {
    return {
      ok: false,
      error: "Không đọc được định dạng JSON từ hóa đơn. Vui lòng nhập tay.",
    };
  }

  if (!parsedUnknown || typeof parsedUnknown !== "object" || Array.isArray(parsedUnknown)) {
    return {
      ok: false,
      error: "Dữ liệu hóa đơn trả về không đúng cấu trúc. Vui lòng nhập tay.",
    };
  }

  const validated = ReceiptSchema.safeParse(parsedUnknown);
  if (!validated.success) {
    const firstIssue = validated.error.issues[0];
    const detail = firstIssue?.message || "Dữ liệu hóa đơn không hợp lệ";
    return {
      ok: false,
      error: `Không thể xác nhận hóa đơn (${detail}). Vui lòng kiểm tra và nhập tay.`,
    };
  }

  return {
    ok: true,
    data: {
      ...validated.data,
      total: Math.round(validated.data.total),
      items: validated.data.items.map((it) => ({
        name: it.name,
        amount: Math.round(it.amount),
      })),
    },
  };
}

/** JSON Schema gửi kèm cho Gemini Structured Output */
export const RECEIPT_RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    merchant: {
      type: "string",
      description: "Tên cửa hàng, quán ăn hoặc nhà cung cấp trên hóa đơn",
    },
    date: {
      type: "string",
      description: "Ngày giao dịch định dạng YYYY-MM-DD (bỏ qua nếu không đọc được trên hóa đơn)",
    },
    total: {
      type: "number",
      description: "Tổng số tiền thanh toán cuối cùng tính bằng VNĐ (số nguyên dương)",
    },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          amount: { type: "number" },
        },
        required: ["name", "amount"],
      },
    },
    suggested_category: {
      type: "string",
      description:
        "Một trong các giá trị: food, transport, shopping, entertainment, health, education, rent, utilities, internet, other",
    },
  },
  required: ["merchant", "total", "items", "suggested_category"],
};
