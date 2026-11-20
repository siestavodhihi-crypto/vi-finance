import { describe, it, expect } from "vitest";
import { parseReceiptResponse, mapSuggestedCategory } from "@/lib/receipt-parser";
import { SlidingWindowRateLimiter } from "@/lib/rate-limit";

describe("parseReceiptResponse — phân tích & kiểm định JSON hóa đơn", () => {
  it("parse thành công JSON hóa đơn tiếng Việt chuẩn", () => {
    const raw = JSON.stringify({
      merchant: "Highlands Coffee",
      date: "2026-11-20",
      total: 89000,
      items: [
        { name: "Phin Sữa Đá M", amount: 39000 },
        { name: "Trà Sen Vàng M", amount: 50000 },
      ],
      suggested_category: "food",
    });

    const res = parseReceiptResponse(raw);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.merchant).toBe("Highlands Coffee");
      expect(res.data.date).toBe("2026-11-20");
      expect(res.data.total).toBe(89000);
      expect(res.data.items).toHaveLength(2);
      expect(res.data.suggested_category).toBe("food");
    }
  });

  it("tách được JSON khi AI bọc trong markdown ```json ... ```", () => {
    const raw = `Đây là kết quả:\n\`\`\`json
    {
      "merchant": "WinMart+",
      "date": null,
      "total": 125500,
      "items": [{ "name": "Mì gói", "amount": 25500 }],
      "suggested_category": "Ăn uống"
    }
    \`\`\``;

    const res = parseReceiptResponse(raw);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.merchant).toBe("WinMart+");
      expect(res.data.date).toBeNull();
      expect(res.data.total).toBe(125500);
      expect(res.data.suggested_category).toBe("food");
    }
  });

  it("từ chối khi AI trả về rỗng hoặc không phải JSON", () => {
    expect(parseReceiptResponse("").ok).toBe(false);
    expect(parseReceiptResponse(null).ok).toBe(false);
    expect(parseReceiptResponse("Xin lỗi tôi không đọc được ảnh này").ok).toBe(false);
    expect(parseReceiptResponse("{ merchant: Highlands }").ok).toBe(false);
    expect(parseReceiptResponse("[1, 2, 3]").ok).toBe(false);
  });

  it("từ chối khi tổng tiền bằng 0 hoặc số âm", () => {
    const zero = JSON.stringify({
      merchant: "Quán cơm",
      date: "2026-11-20",
      total: 0,
      items: [],
      suggested_category: "food",
    });
    expect(parseReceiptResponse(zero).ok).toBe(false);

    const negative = JSON.stringify({
      merchant: "Quán cơm",
      date: "2026-11-20",
      total: -50000,
      items: [],
      suggested_category: "food",
    });
    expect(parseReceiptResponse(negative).ok).toBe(false);
  });

  it("từ chối khi total sai kiểu dữ liệu (chuỗi thay vì số) hoặc thiếu trường total", () => {
    const strTotal = JSON.stringify({
      merchant: "Quán cơm",
      date: "2026-11-20",
      total: "50.000đ",
      items: [],
      suggested_category: "food",
    });
    expect(parseReceiptResponse(strTotal).ok).toBe(false);

    const missingTotal = JSON.stringify({
      merchant: "Quán cơm",
      items: [],
    });
    expect(parseReceiptResponse(missingTotal).ok).toBe(false);
  });

  it("từ chối khi có món trong items mang giá âm", () => {
    const negItem = JSON.stringify({
      merchant: "Siêu thị",
      date: "2026-11-20",
      total: 50000,
      items: [{ name: "Giảm giá lỗi", amount: -10000 }],
      suggested_category: "food",
    });
    expect(parseReceiptResponse(negItem).ok).toBe(false);
  });

  it("chuẩn hóa ngày sai định dạng hoặc ngày không tồn tại về null thay vì crash", () => {
    const badDate = JSON.stringify({
      merchant: "Circle K",
      date: "2026-02-31", // ngày không tồn tại
      total: 32000,
      items: [],
      suggested_category: "food",
    });
    const res = parseReceiptResponse(badDate);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.date).toBeNull();
    }
  });

  it("mapSuggestedCategory ánh xạ đúng tiếng Việt, tiếng Anh và fallback 'other'", () => {
    expect(mapSuggestedCategory("food")).toBe("food");
    expect(mapSuggestedCategory("Ăn uống")).toBe("food");
    expect(mapSuggestedCategory("Di chuyển")).toBe("transport");
    expect(mapSuggestedCategory("Nhà thuốc")).toBe("health");
    expect(mapSuggestedCategory("không biết mục gì")).toBe("other");
  });
});

describe("SlidingWindowRateLimiter — giới hạn tốc độ theo user", () => {
  it("chặn khi vượt giới hạn và tách biệt từng user", () => {
    const limiter = new SlidingWindowRateLimiter(2, 60_000);
    const t0 = 1_000_000;

    expect(limiter.check("user:A", t0).allowed).toBe(true);
    expect(limiter.check("user:A", t0 + 1000).allowed).toBe(true);

    const blocked = limiter.check("user:A", t0 + 2000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);

    // User B vẫn được gọi bình thường
    expect(limiter.check("user:B", t0 + 2000).allowed).toBe(true);

    // Sau khi hết cửa sổ thời gian, User A được gọi lại
    expect(limiter.check("user:A", t0 + 61_000).allowed).toBe(true);
  });
});
