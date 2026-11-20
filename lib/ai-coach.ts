/**
 * lib/ai-coach.ts
 * Schema Zod & parser an toàn cho tính năng Trợ lý AI đánh giá tài chính.
 */
import { z } from "zod";

export const AiCoachInputSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  income: z.number().finite().nonnegative(),
  expense: z.number().finite().nonnegative(),
  prevIncome: z.number().finite().nonnegative(),
  prevExpense: z.number().finite().nonnegative(),
  safeToSpendDaily: z.number().finite().nonnegative(),
  daysRemaining: z.number().int().min(1).max(31),
  availableBalance: z.number().finite(),
  lockedSavings: z.number().finite().nonnegative(),
  unpaidBills: z.number().finite().nonnegative(),
  topCategories: z
    .array(
      z.object({
        name: z.string().max(60),
        amount: z.number().finite().nonnegative(),
        share: z.number().finite().min(0).max(100),
      })
    )
    .max(6),
  budgets: z
    .array(
      z.object({
        name: z.string().max(60),
        spent: z.number().finite().nonnegative(),
        limit: z.number().finite().positive(),
        percentage: z.number().finite().nonnegative(),
      })
    )
    .max(10),
  goals: z
    .array(
      z.object({
        name: z.string().max(80),
        saved: z.number().finite().nonnegative(),
        target: z.number().finite().positive(),
        percent: z.number().finite().min(0).max(100),
      })
    )
    .max(6),
});

export type AiCoachInput = z.infer<typeof AiCoachInputSchema>;

export const AiCoachOutputSchema = z.object({
  score: z.number().finite().min(0).max(100),
  headline: z.string().trim().min(1),
  strengths: z.array(z.string().trim().min(1)).max(4).default([]),
  warnings: z.array(z.string().trim().min(1)).max(4).default([]),
  action_tips: z.array(z.string().trim().min(1)).min(1).max(4),
  daily_reminder: z.string().trim().min(1),
});

export type AiCoachAdvice = z.infer<typeof AiCoachOutputSchema>;

export type ParseAiCoachResult =
  | { ok: true; data: AiCoachAdvice }
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

export function parseAiCoachResponse(raw: string | null | undefined): ParseAiCoachResult {
  if (!raw || !raw.trim()) {
    return { ok: false, error: "AI không trả về nhận xét. Vui lòng thử lại." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonText(raw));
  } catch {
    return { ok: false, error: "Không đọc được định dạng nhận xét từ AI." };
  }

  const res = AiCoachOutputSchema.safeParse(parsed);
  if (!res.success) {
    return { ok: false, error: "Dữ liệu nhận xét từ AI không đúng cấu trúc." };
  }

  return {
    ok: true,
    data: {
      ...res.data,
      score: Math.round(res.data.score),
    },
  };
}

export const AI_COACH_JSON_SCHEMA = {
  type: "object",
  properties: {
    score: {
      type: "number",
      description: "Điểm sức khỏe tài chính từ 0 đến 100",
    },
    headline: {
      type: "string",
      description: "1 câu tóm tắt tình hình chi tiêu tháng này bằng tiếng Việt thân thiện, gần gũi với sinh viên",
    },
    strengths: {
      type: "array",
      items: { type: "string" },
      description: "1 đến 3 điểm người dùng đang làm tốt",
    },
    warnings: {
      type: "array",
      items: { type: "string" },
      description: "0 đến 3 rủi ro hoặc thói quen dễ làm cháy túi",
    },
    action_tips: {
      type: "array",
      items: { type: "string" },
      description: "2 đến 3 gợi ý cụ thể, thực tế, dễ áp dụng ngay tuần này để tiết kiệm",
    },
    daily_reminder: {
      type: "string",
      description: "1 câu nhắc nhở ngắn gọn, tích cực cho hôm nay (dưới 25 từ)",
    },
  },
  required: ["score", "headline", "strengths", "warnings", "action_tips", "daily_reminder"],
};
