import { describe, it, expect } from "vitest";
import {
  exportTransactionsToCsv,
  createBackupJson,
  parseBackupJson,
} from "@/lib/export-import";
import {
  SAMPLE_WALLETS,
  SAMPLE_TRANSACTIONS,
  SAMPLE_BUDGETS,
  SAMPLE_RECURRING_BILLS,
  SAMPLE_GOALS,
  SAMPLE_DEBTS,
  SAMPLE_SPLITS,
} from "@/lib/sample-data";

describe("exportTransactionsToCsv — xuất CSV UTF-8 BOM", () => {
  it("bắt đầu bằng ký tự UTF-8 BOM và giữ đúng dấu tiếng Việt", () => {
    const csv = exportTransactionsToCsv(SAMPLE_TRANSACTIONS.slice(0, 3), SAMPLE_WALLETS);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Ngày,Loại,Danh mục,Số tiền (VNĐ),Ví,Ví nhận,Ghi chú");
    expect(csv).toContain("Ba mẹ gửi tiền sinh hoạt tháng 11");
  });

  it("escape đúng dấu phẩy, ngoặc kép và chống formula injection (=SUM...)", () => {
    const csv = exportTransactionsToCsv(
      [
        {
          id: "t1",
          type: "expense",
          amount: 45000,
          categoryId: "food",
          walletId: "cash",
          note: '=SUM(A1:A2), "quán phở"',
          date: "2026-11-20T08:00:00",
          createdAt: "2026-11-20T08:00:00",
        },
      ],
      SAMPLE_WALLETS
    );
    expect(csv).toContain(`"'=SUM(A1:A2), ""quán phở"""`);
    expect(csv).toContain("-45000");
  });
});

describe("createBackupJson & parseBackupJson — sao lưu và khôi phục JSON", () => {
  it("sao lưu và đọc lại đầy đủ toàn bộ dữ liệu không mất mát", () => {
    const payload = {
      wallets: SAMPLE_WALLETS,
      transactions: SAMPLE_TRANSACTIONS,
      budgets: SAMPLE_BUDGETS,
      recurringBills: SAMPLE_RECURRING_BILLS,
      goals: SAMPLE_GOALS,
      debts: SAMPLE_DEBTS,
      splits: SAMPLE_SPLITS,
    };

    const json = createBackupJson(payload);
    const parsed = parseBackupJson(json);

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.wallets).toHaveLength(SAMPLE_WALLETS.length);
      expect(parsed.data.transactions).toHaveLength(SAMPLE_TRANSACTIONS.length);
      expect(parsed.data.goals).toHaveLength(SAMPLE_GOALS.length);
      expect(parsed.data.debts).toHaveLength(SAMPLE_DEBTS.length);
    }
  });

  it("từ chối tệp rỗng, JSON lỗi cú pháp, hoặc sai phiên bản / sai ứng dụng", () => {
    expect(parseBackupJson("").ok).toBe(false);
    expect(parseBackupJson("{ broken").ok).toBe(false);
    expect(parseBackupJson(JSON.stringify({ version: 99, app: "other", data: {} })).ok).toBe(false);
  });
});
