import { describe, it, expect } from "vitest";
import { parseAiQuickAddResponse } from "@/lib/ai-quick-add";

const WALLET_IDS = ["cash", "bank", "momo"];
const TODAY = "2026-11-20";

describe("parseAiQuickAddResponse — AI nhận diện giao dịch tiếng Việt", () => {
  it("nhận diện chuẩn 1 câu đơn: 'hôm nay đổ xăng 70k'", () => {
    const raw = JSON.stringify({
      items: [
        {
          type: "expense",
          amount: 70000,
          category: "transport",
          wallet_id: "cash",
          date: "2026-11-20",
          note: "Đổ xăng",
        },
      ],
    });

    const res = parseAiQuickAddResponse(raw, WALLET_IDS, TODAY);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.items).toHaveLength(1);
      expect(res.items[0]).toEqual({
        type: "expense",
        amount: 70000,
        categoryId: "transport",
        walletId: "cash",
        date: "2026-11-20",
        note: "Đổ xăng",
      });
    }
  });

  it("tách được nhiều giao dịch trong cùng 1 câu & xử lý wallet_id lạ an toàn", () => {
    const raw = `\`\`\`json
    {
      "items": [
        { "type": "expense", "amount": 40000, "category": "Ăn uống", "wallet_id": "cash", "date": null, "note": "Bún bò sáng" },
        { "type": "expense", "amount": 55000, "category": "food", "wallet_id": "momo", "date": "2026-11-20", "note": "Matcha latte" },
        { "type": "income", "amount": 500000, "category": "freelance", "wallet_id": "fake-id", "date": "bad-date", "note": "Dạy kèm" }
      ]
    }
    \`\`\``;

    const res = parseAiQuickAddResponse(raw, WALLET_IDS, TODAY);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.items).toHaveLength(3);
      expect(res.items[0].categoryId).toBe("food");
      expect(res.items[0].date).toBe(TODAY);
      expect(res.items[2].walletId).toBeUndefined();
      expect(res.items[2].date).toBe(TODAY);
    }
  });

  it("từ chối khi JSON lỗi, rỗng, hoặc số tiền <= 0", () => {
    expect(parseAiQuickAddResponse("", WALLET_IDS, TODAY).ok).toBe(false);
    expect(parseAiQuickAddResponse("abc", WALLET_IDS, TODAY).ok).toBe(false);
    expect(
      parseAiQuickAddResponse(
        JSON.stringify({
          items: [{ type: "expense", amount: 0, category: "food", note: "test" }],
        }),
        WALLET_IDS,
        TODAY
      ).ok
    ).toBe(false);
    expect(
      parseAiQuickAddResponse(
        JSON.stringify({
          items: [{ type: "expense", amount: -10000, category: "food", note: "test" }],
        }),
        WALLET_IDS,
        TODAY
      ).ok
    ).toBe(false);
  });
});
