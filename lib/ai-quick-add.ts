/**
 * lib/ai-quick-add.ts
 * Schema Zod & parser an toàn cho AI nhận diện giao dịch từ câu tiếng Việt tự nhiên.
 * Hỗ trợ nhận diện 1 hoặc nhiều giao dịch trong cùng một câu.
 */
import { z } from "zod";
import { CategoryId } from "@/types";
import { mapSuggestedCategory } from "./receipt-parser";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const AiParseTxRequestSchema = z.object({
  text: z.string().trim().min(1, "Vui lòng nhập nội dung giao dịch").max(500),
  today: z.string().regex(DATE_RE),
  wallets: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1).max(80),
      })
    )
    .max(20)
    .default([]),
});

export type AiParseTxRequest = z.infer<typeof AiParseTxRequestSchema>;

const RawItemSchema = z.object({
  type: z.enum(["income", "expense"]).default("expense"),
  amount: z.number().finite().positive("Số tiền phải lớn hơn 0"),
  category: z.string().default("other"),
  wallet_id: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  note: z.string().trim().default(""),
});

const RawOutputSchema = z.object({
  items: z.array(RawItemSchema).min(1, "Không nhận diện được giao dịch nào").max(10),
});

export interface ParsedAiTx {
  type: "income" | "expense";
  amount: number;
  categoryId: CategoryId;
  walletId?: string;
  date: string; // YYYY-MM-DD
  note: string;
}

export type ParseAiQuickAddResult =
  | { ok: true; items: ParsedAiTx[] }
  | { ok: false; error: string };

function extractJsonText(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}

export function parseAiQuickAddResponse(
  raw: string | null | undefined,
  validWalletIds: string[],
  fallbackDate: string
): ParseAiQuickAddResult {
  if (!raw || !raw.trim()) {
    return { ok: false, error: "AI không trả về dữ liệu. Hãy thử diễn đạt rõ số tiền hơn nhé." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonText(raw));
  } catch {
    return { ok: false, error: "Không đọc được định dạng JSON từ AI." };
  }

  const res = RawOutputSchema.safeParse(parsed);
  if (!res.success) {
    return {
      ok: false,
      error: "AI chưa nhận diện được số tiền hợp lệ. Bạn thử ghi rõ số tiền (vd: 70k, 1tr5).",
    };
  }

  const walletSet = new Set(validWalletIds);
  const items: ParsedAiTx[] = res.data.items.map((it) => {
    const safeDate = it.date && DATE_RE.test(it.date.trim()) ? it.date.trim() : fallbackDate;
    const safeWallet =
      it.wallet_id && walletSet.has(it.wallet_id) ? it.wallet_id : undefined;

    return {
      type: it.type,
      amount: Math.round(it.amount),
      categoryId: mapSuggestedCategory(it.category),
      walletId: safeWallet,
      date: safeDate,
      note: it.note,
    };
  });

  return { ok: true, items };
}

export const AI_QUICK_ADD_JSON_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      description: "Danh sách 1 hoặc nhiều giao dịch trích xuất từ câu của người dùng",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["income", "expense"],
            description: "income nếu là thu nhập (lương, thưởng, ba mẹ gửi, làm thêm, được trả tiền), expense nếu là chi tiêu",
          },
          amount: {
            type: "number",
            description: "Số tiền bằng VNĐ (số nguyên dương, vd 70k = 70000, 1tr5 = 1500000)",
          },
          category: {
            type: "string",
            description:
              "Một trong các slug: food, transport, shopping, entertainment, health, education, rent, utilities, internet, salary, family, freelance, savings, other",
          },
          wallet_id: {
            type: ["string", "null"],
            description: "ID chính xác của ví nếu câu có nhắc tới ví, hoặc null nếu không nhắc",
          },
          date: {
            type: ["string", "null"],
            description: "Ngày giao dịch định dạng YYYY-MM-DD tính theo ngày hôm nay, hoặc null nếu là hôm nay",
          },
          note: {
            type: "string",
            description: "Mô tả ngắn gọn, tự nhiên bằng tiếng Việt (vd: Đổ xăng, Trà sữa Gong Cha)",
          },
        },
        required: ["type", "amount", "category", "wallet_id", "date", "note"],
      },
    },
  },
  required: ["items"],
};
