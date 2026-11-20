import { describe, it, expect } from "vitest";
import {
  calculateSafeToSpend,
  getDaysRemainingInMonth,
  getDaysInCalendarMonth,
  getVietnamDateString,
  getVietnamMonthString,
  getSafeToSpendDetail,
  getTotalIncome,
  getTotalExpense,
  getBudgetProgress,
  formatMoney,
  formatMoneyShort,
} from "@/lib/finance";
import { Transaction, Budget, Wallet, RecurringBill } from "@/types";

describe("Safe-to-Spend Formula", () => {
  it("Ca thông thường: tính đúng số tiền an toàn để tiêu mỗi ngày", () => {
    // Quỹ khả dụng: 3.000.000, hóa đơn: 500.000, tiết kiệm: 500.000, còn 10 ngày
    // Pool = 3.000.000 - 500.000 - 500.000 = 2.000.000
    // Mỗi ngày = 2.000.000 / 10 = 200.000
    const result = calculateSafeToSpend({
      availableBalance: 3_000_000,
      unpaidBills: 500_000,
      lockedSavings: 500_000,
      daysRemaining: 10,
    });
    expect(result).toBe(200_000);
  });

  describe("Ca biên (Edge cases)", () => {
    it("Ca biên 1: Ngày cuối tháng (daysRemaining = 1)", () => {
      // Khi chỉ còn 1 ngày, safe-to-spend bằng toàn bộ quỹ còn lại
      const result = calculateSafeToSpend({
        availableBalance: 1_200_000,
        unpaidBills: 200_000,
        lockedSavings: 0,
        daysRemaining: 1,
      });
      expect(result).toBe(1_000_000);
    });

    it("Ca biên 2: Số dư âm hoặc thâm hụt (pool < 0)", () => {
      // Số dư khả dụng 500k nhưng hóa đơn cần trả tới 1.500k -> thâm hụt 1.000k
      // Mặc định trả về 0 để người dùng biết không an toàn để tiêu thêm
      const safeDefault = calculateSafeToSpend({
        availableBalance: 500_000,
        unpaidBills: 1_500_000,
        lockedSavings: 0,
        daysRemaining: 10,
      });
      expect(safeDefault).toBe(0);

      // Khi allowNegative: true, trả về đúng số âm chia đều
      const safeWithNegative = calculateSafeToSpend(
        {
          availableBalance: 500_000,
          unpaidBills: 1_500_000,
          lockedSavings: 0,
          daysRemaining: 10,
        },
        { allowNegative: true }
      );
      expect(safeWithNegative).toBe(-100_000);
    });

    it("Ca biên 2b: Số dư ví bị âm thực tế (availableBalance < 0)", () => {
      const result = calculateSafeToSpend({
        availableBalance: -300_000,
        unpaidBills: 100_000,
        lockedSavings: 0,
        daysRemaining: 5,
      });
      expect(result).toBe(0);
    });

    it("Ca biên 3: Chia cho 0 (daysRemaining <= 0 hoặc không hợp lệ)", () => {
      // daysRemaining = 0
      const zeroDays = calculateSafeToSpend({
        availableBalance: 2_000_000,
        unpaidBills: 0,
        lockedSavings: 0,
        daysRemaining: 0,
      });
      expect(zeroDays).toBe(0);
      expect(Number.isFinite(zeroDays)).toBe(true);

      // daysRemaining âm
      const negativeDays = calculateSafeToSpend({
        availableBalance: 2_000_000,
        unpaidBills: 0,
        lockedSavings: 0,
        daysRemaining: -5,
      });
      expect(negativeDays).toBe(0);

      // daysRemaining NaN
      const nanDays = calculateSafeToSpend({
        availableBalance: 2_000_000,
        unpaidBills: 0,
        lockedSavings: 0,
        daysRemaining: NaN,
      });
      expect(nanDays).toBe(0);
    });

    it("Hàm getDaysRemainingInMonth: trả về 1 vào ngày cuối tháng", () => {
      // Ngày 30/11/2026 (ngày cuối tháng 11 có 30 ngày)
      const lastDayOfNov = new Date(2026, 10, 30);
      expect(getDaysRemainingInMonth(lastDayOfNov)).toBe(1);

      // Ngày 20/11/2026 (còn 11 ngày: 30 - 20 + 1 = 11)
      const midNov = new Date(2026, 10, 20);
      expect(getDaysRemainingInMonth(midNov)).toBe(11);

      // Ngày 01/11/2026 (còn đủ 30 ngày)
      const firstDayOfNov = new Date(2026, 10, 1);
      expect(getDaysRemainingInMonth(firstDayOfNov)).toBe(30);
    });

    it("Hàm getSafeToSpendDetail: tính đúng từ ví, hóa đơn và tiền tiết kiệm khóa", () => {
      const wallets: Wallet[] = [
        { id: "w1", name: "Tiền mặt", balance: 500_000, icon: "Wallet", color: "#fff", isLocked: false },
        { id: "w2", name: "Ngân hàng", balance: 4_500_000, icon: "CreditCard", color: "#fff", isLocked: false },
        { id: "w3", name: "Heo đất khóa", balance: 2_000_000, icon: "PiggyBank", color: "#fff", isLocked: true },
      ];

      const bills: RecurringBill[] = [
        { id: "b1", name: "Tiền trọ", amount: 2_000_000, categoryId: "rent", dueDay: 5, walletId: "w2", paidMonths: ["2026-11"] }, // Đã trả
        { id: "b2", name: "Tiền điện", amount: 300_000, categoryId: "utilities", dueDay: 10, walletId: "w2", paidMonths: [] }, // Chưa trả
        { id: "b3", name: "Internet", amount: 150_000, categoryId: "internet", dueDay: 15, walletId: "w2", paidMonths: [] }, // Chưa trả
      ];

      // Available: 500k + 4.500k = 5.000k
      // Locked: 2.000k
      // Unpaid bills: 300k + 150k = 450k
      // Pool = 5.000k - 450k - 2.000k = 2.550k
      const detail = getSafeToSpendDetail({
        wallets,
        recurringBills: bills,
        currentDate: new Date(2026, 10, 20), // 11 ngày còn lại
        currentMonth: "2026-11",
      });

      expect(detail.availableBalance).toBe(5_000_000);
      expect(detail.lockedSavings).toBe(2_000_000);
      expect(detail.unpaidBills).toBe(450_000);
      expect(detail.pool).toBe(2_550_000);
      expect(detail.daysRemaining).toBe(11);
      expect(Math.round(detail.dailyAmount)).toBe(Math.round(2_550_000 / 11));
    });
  });
});

describe("Chuyển tiền giữa các ví (Transfer)", () => {
  it("Giao dịch loại 'transfer' KHÔNG được tính vào tổng thu hoặc tổng chi", () => {
    const transactions: Transaction[] = [
      {
        id: "tx-income",
        type: "income",
        amount: 3_000_000,
        categoryId: "salary",
        walletId: "bank",
        note: "Lương tháng",
        date: "2026-11-05T08:00:00",
        createdAt: "2026-11-05T08:00:00",
      },
      {
        id: "tx-expense",
        type: "expense",
        amount: 50_000,
        categoryId: "food",
        walletId: "cash",
        note: "Ăn trưa",
        date: "2026-11-06T12:00:00",
        createdAt: "2026-11-06T12:00:00",
      },
      {
        id: "tx-transfer",
        type: "transfer",
        amount: 500_000,
        categoryId: "savings",
        walletId: "bank",
        toWalletId: "cash",
        note: "Rút tiền ATM từ ngân hàng vào ví tiền mặt",
        date: "2026-11-07T10:00:00",
        createdAt: "2026-11-07T10:00:00",
      },
    ];

    // Thu: đúng 3.000.000 (không tính 500k transfer)
    expect(getTotalIncome(transactions)).toBe(3_000_000);

    // Chi: đúng 50.000 (không tính 500k transfer)
    expect(getTotalExpense(transactions)).toBe(50_000);
  });
});

describe("Ngân sách (Budget color rules)", () => {
  const budget: Budget = {
    id: "b1",
    categoryId: "food",
    limit: 1_000_000,
    month: "2026-11",
  };

  it("Tiêu dưới 80%: hiển thị bình thường (status: 'normal', màu xanh)", () => {
    const transactions: Transaction[] = [
      {
        id: "t1",
        type: "expense",
        amount: 600_000, // 60%
        categoryId: "food",
        walletId: "cash",
        note: "Ăn uống",
        date: "2026-11-10T10:00:00",
        createdAt: "2026-11-10T10:00:00",
      },
    ];

    const progress = getBudgetProgress(budget, transactions);
    expect(progress.percentage).toBe(60);
    expect(progress.status).toBe("normal");
    expect(progress.isOver).toBe(false);
    expect(progress.barColor).toBe("var(--color-income)");
  });

  it("Tiêu đạt 80% đến 100%: cảnh báo vàng (status: 'warning', màu vàng)", () => {
    const transactions: Transaction[] = [
      {
        id: "t1",
        type: "expense",
        amount: 850_000, // 85%
        categoryId: "food",
        walletId: "cash",
        note: "Ăn uống",
        date: "2026-11-15T10:00:00",
        createdAt: "2026-11-15T10:00:00",
      },
    ];

    const progress = getBudgetProgress(budget, transactions);
    expect(progress.percentage).toBe(85);
    expect(progress.status).toBe("warning");
    expect(progress.isOver).toBe(false);
    expect(progress.barColor).toBe("var(--color-accent)");
  });

  it("Tiêu vượt 100%: báo động đỏ (status: 'danger', màu đỏ)", () => {
    const transactions: Transaction[] = [
      {
        id: "t1",
        type: "expense",
        amount: 1_150_000, // 115%
        categoryId: "food",
        walletId: "cash",
        note: "Ăn uống quá đà",
        date: "2026-11-20T10:00:00",
        createdAt: "2026-11-20T10:00:00",
      },
    ];

    const progress = getBudgetProgress(budget, transactions);
    expect(progress.status).toBe("danger");
    expect(progress.isOver).toBe(true);
    expect(progress.barColor).toBe("var(--color-expense)");
    expect(progress.remaining).toBe(-150_000);
  });
});

describe("Format tiền", () => {
  it("Format đúng chuẩn Việt Nam", () => {
    expect(formatMoney(1_500_000)).toBe("1.500.000 ₫");
    expect(formatMoney(0)).toBe("0 ₫");
    expect(formatMoney(-50_000)).toBe("-50.000 ₫");
  });

  it("Format ngắn gọn cho biểu đồ", () => {
    expect(formatMoneyShort(1_500_000)).toBe("1.5 tr");
    expect(formatMoneyShort(50_000)).toBe("50k");
    expect(formatMoneyShort(2_000_000_000)).toBe("2.0 tỷ");
  });

  it("Xử lý số tiền rất lớn và giá trị không hữu hạn (NaN / Infinity)", () => {
    expect(formatMoney(999_999_999_999)).toBe("999.999.999.999 ₫");
    expect(formatMoneyShort(10_000_000_000)).toBe("10.0 tỷ");
    expect(formatMoney(NaN)).toBe("0 ₫");
    expect(formatMoney(Infinity)).toBe("0 ₫");
    expect(formatMoneyShort(NaN)).toBe("0");

    const hugeSafe = calculateSafeToSpend({
      availableBalance: 999_000_000_000,
      unpaidBills: 0,
      lockedSavings: 0,
      daysRemaining: 10,
    });
    expect(hugeSafe).toBe(99_900_000_000);
    expect(Number.isFinite(hugeSafe)).toBe(true);
  });
});

describe("Trường hợp biên thời gian: Múi giờ Việt Nam (UTC+7) & Tháng 2 nhuận", () => {
  it("Chuyển đổi đúng sang ngày/tháng Việt Nam UTC+7 khi thời điểm UTC ở cuối ngày trước", () => {
    // 2026-11-30 18:00:00 UTC = 2026-12-01 01:00:00 giờ Việt Nam (UTC+7)
    const lateUtc = new Date("2026-11-30T18:00:00Z");
    expect(getVietnamDateString(lateUtc)).toBe("2026-12-01");
    expect(getVietnamMonthString(lateUtc)).toBe("2026-12");
    // Tháng 12 có 31 ngày -> ngày 01/12 còn đủ 31 ngày
    expect(getDaysRemainingInMonth(lateUtc)).toBe(31);
  });

  it("Tính đúng tháng 2 năm nhuận (2024: 29 ngày) và năm không nhuận (2026: 28 ngày)", () => {
    expect(getDaysInCalendarMonth(2024, 2)).toBe(29);
    expect(getDaysInCalendarMonth(2026, 2)).toBe(28);
    expect(getDaysInCalendarMonth(2000, 2)).toBe(29); // chia hết cho 400
    expect(getDaysInCalendarMonth(2100, 2)).toBe(28); // chia hết cho 100 nhưng không cho 400

    // Năm nhuận 2024
    expect(getDaysRemainingInMonth(new Date("2024-02-01T05:00:00Z"))).toBe(29);
    expect(getDaysRemainingInMonth(new Date("2024-02-29T05:00:00Z"))).toBe(1);

    // Năm không nhuận 2026
    expect(getDaysRemainingInMonth(new Date("2026-02-01T05:00:00Z"))).toBe(28);
    expect(getDaysRemainingInMonth(new Date("2026-02-28T05:00:00Z"))).toBe(1);
  });

  it("Hóa đơn ĐÃ TRẢ trong tháng KHÔNG bị trừ lại vào Safe-to-Spend", () => {
    const wallets: Wallet[] = [
      { id: "w1", name: "Ngân hàng", balance: 3_000_000, icon: "CreditCard", color: "#fff", isLocked: false },
    ];
    const bills: RecurringBill[] = [
      { id: "b1", name: "Tiền trọ", amount: 2_500_000, categoryId: "rent", dueDay: 5, walletId: "w1", paidMonths: ["2026-11"] },
    ];
    const detail = getSafeToSpendDetail({
      wallets,
      recurringBills: bills,
      currentDate: new Date("2026-11-21T05:00:00Z"), // còn 10 ngày (21..30)
      currentMonth: "2026-11",
    });
    expect(detail.unpaidBills).toBe(0);
    expect(detail.pool).toBe(3_000_000);
    expect(detail.dailyAmount).toBe(300_000);
  });
});
