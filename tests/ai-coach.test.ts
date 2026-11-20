import { describe, it, expect } from "vitest";
import { parseAiCoachResponse, AiCoachInputSchema } from "@/lib/ai-coach";

describe("parseAiCoachResponse — kiểm định phản hồi Trợ lý AI", () => {
  it("parse thành công JSON nhận xét chuẩn", () => {
    const raw = JSON.stringify({
      score: 82.4,
      headline: "Tháng này bạn kiểm soát tiền khá ổn, giữ nhịp này là cuối tháng rủng rỉnh!",
      strengths: ["Để dành được 30% thu nhập", "Không vượt ngân sách ăn uống"],
      warnings: ["Chi trà sữa tăng nhẹ tuần qua"],
      action_tips: ["Giới hạn trà sữa còn 2 ly/tuần", "Nạp thêm 200k vào quỹ đổi laptop"],
      daily_reminder: "Hôm nay chỉ nên tiêu dưới 150k để giữ nhịp tiết kiệm nhé!",
    });

    const res = parseAiCoachResponse(raw);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.score).toBe(82);
      expect(res.data.strengths).toHaveLength(2);
      expect(res.data.action_tips).toHaveLength(2);
    }
  });

  it("tách được JSON khi bị bọc markdown ```json ... ```", () => {
    const raw = `\`\`\`json
    {
      "score": 65,
      "headline": "Tạm ổn nhưng cần bớt mua sắm.",
      "strengths": ["Đã đóng đủ tiền trọ"],
      "warnings": [],
      "action_tips": ["Chờ 48 giờ trước khi bấm mua Shopee"],
      "daily_reminder": "Nghĩ kỹ 5 giây trước khi quẹt ví nha!"
    }
    \`\`\``;
    expect(parseAiCoachResponse(raw).ok).toBe(true);
  });

  it("từ chối khi điểm ngoài khoảng 0-100 hoặc JSON lỗi", () => {
    expect(parseAiCoachResponse("").ok).toBe(false);
    expect(parseAiCoachResponse("không phải json").ok).toBe(false);
    expect(
      parseAiCoachResponse(
        JSON.stringify({
          score: 150,
          headline: "abc",
          strengths: [],
          warnings: [],
          action_tips: ["a"],
          daily_reminder: "b",
        })
      ).ok
    ).toBe(false);
  });

  it("AiCoachInputSchema kiểm tra hợp lệ dữ liệu gửi lên", () => {
    const ok = AiCoachInputSchema.safeParse({
      month: "2026-11",
      income: 4_000_000,
      expense: 2_500_000,
      prevIncome: 3_500_000,
      prevExpense: 2_200_000,
      safeToSpendDaily: 150_000,
      daysRemaining: 10,
      availableBalance: 2_000_000,
      lockedSavings: 500_000,
      unpaidBills: 300_000,
      topCategories: [{ name: "Ăn uống", amount: 1_200_000, share: 48 }],
      budgets: [],
      goals: [],
    });
    expect(ok.success).toBe(true);
  });
});
