import { describe, it, expect } from "vitest";
import { format } from "date-fns";
import { projectGoal } from "@/lib/goals";
import { ME, splitDebts, splitEqual, splitItemized, summarizeDebts } from "@/lib/split";
import { buildMonthlyReport, pctChange } from "@/lib/monthly-report";
import { Budget, Debt, SavingsGoal, Transaction } from "@/types";

const NOW = new Date(2026, 10, 20, 12, 0, 0); // 20/11/2026

function goal(partial: Partial<SavingsGoal>): SavingsGoal {
  return {
    id: "g",
    name: "Laptop",
    target: 10_000_000,
    saved: 0,
    color: "#000",
    icon: "Target",
    createdAt: "2026-08-01T00:00:00",
    contributions: [],
    ...partial,
  };
}

describe("Mục tiêu tiết kiệm — projectGoal", () => {
  it("tính % hoàn thành và ngày dự kiến theo tốc độ 60 ngày gần nhất", () => {
    // 2tr trong 60 ngày → 33.333đ/ngày, còn 6tr → 180 ngày
    const p = projectGoal(
      goal({
        saved: 4_000_000,
        contributions: [
          { id: "1", amount: 2_000_000, date: "2026-08-01T08:00:00" }, // ngoài cửa sổ
          { id: "2", amount: 1_000_000, date: "2026-10-01T08:00:00" },
          { id: "3", amount: 1_000_000, date: "2026-11-10T08:00:00" },
        ],
      }),
      NOW
    );
    expect(p.percent).toBe(40);
    expect(p.remaining).toBe(6_000_000);
    expect(Math.round(p.monthlyRate)).toBe(1_000_000);
    expect(p.daysToGoal).toBe(180);
    expect(format(p.etaDate!, "yyyy-MM-dd")).toBe("2027-05-19");
  });

  it("chưa có khoản nạp nào → chưa dự báo được", () => {
    const p = projectGoal(goal({ saved: 0 }), NOW);
    expect(p.daysToGoal).toBeNull();
    expect(p.etaDate).toBeNull();
  });

  it("đã đủ tiền → 100%, hoàn thành", () => {
    const p = projectGoal(goal({ saved: 12_000_000 }), NOW);
    expect(p.percent).toBe(100);
    expect(p.isComplete).toBe(true);
    expect(p.daysToGoal).toBe(0);
  });

  it("mục tiêu bằng 0 không gây chia cho 0", () => {
    const p = projectGoal(goal({ target: 0, saved: 0 }), NOW);
    expect(p.percent).toBe(0);
    expect(Number.isFinite(p.percent)).toBe(true);
  });

  it("vừa nạp lần đầu: tốc độ tính tối thiểu trên 7 ngày, không bị thổi phồng", () => {
    const p = projectGoal(
      goal({ saved: 700_000, contributions: [{ id: "1", amount: 700_000, date: "2026-11-20T08:00:00" }] }),
      NOW
    );
    expect(p.dailyRate).toBe(100_000);
  });

  it("so với hạn chót: kịp / không kịp và số tiền cần mỗi tháng", () => {
    const base = {
      saved: 4_000_000,
      contributions: [{ id: "1", amount: 2_000_000, date: "2026-10-21T08:00:00" }],
    };
    // tốc độ 2tr/30 ngày → còn 6tr cần 90 ngày
    const late = projectGoal(goal({ ...base, deadline: "2026-12-20" }), NOW);
    expect(late.onTrack).toBe(false);
    expect(late.requiredMonthly).toBe(6_000_000);

    const ok = projectGoal(goal({ ...base, deadline: "2027-06-01" }), NOW);
    expect(ok.onTrack).toBe(true);
  });
});

describe("Chia tiền nhóm", () => {
  it("chia đều, phần lẻ được phân bổ để tổng luôn khớp", () => {
    const s = splitEqual(100_000, [ME, "Minh", "Lan"]);
    expect(Object.values(s).reduce((a, b) => a + b, 0)).toBe(100_000);
    expect(Object.values(s).sort()).toEqual([33_333, 33_333, 33_334]);
  });

  it("chia theo món + phí ship chia đều", () => {
    const s = splitItemized(
      [
        { id: "1", name: "Lẩu", amount: 300_000, sharedBy: [] }, // cả nhóm
        { id: "2", name: "Bia", amount: 100_000, sharedBy: ["Minh", "Lan"] },
        { id: "3", name: "Trà sữa", amount: 40_000, sharedBy: [ME] },
      ],
      [ME, "Minh", "Lan"],
      30_000
    );
    expect(s[ME]).toBe(100_000 + 40_000 + 10_000);
    expect(s["Minh"]).toBe(100_000 + 50_000 + 10_000);
    expect(s["Lan"]).toBe(100_000 + 50_000 + 10_000);
  });

  it("tôi trả → mọi người nợ tôi; người khác trả → tôi nợ người đó", () => {
    const shares = { [ME]: 150_000, Minh: 150_000, Lan: 150_000 };
    expect(splitDebts(shares, ME)).toEqual([
      { person: "Minh", direction: "they_owe", amount: 150_000 },
      { person: "Lan", direction: "they_owe", amount: 150_000 },
    ]);
    expect(splitDebts(shares, "Minh")).toEqual([
      { person: "Minh", direction: "i_owe", amount: 150_000 },
    ]);
  });

  it("tổng hợp sổ nợ bỏ qua khoản đã trả và bù trừ theo người", () => {
    const d = (p: Partial<Debt>): Debt => ({
      id: Math.random().toString(),
      person: "Minh",
      amount: 0,
      direction: "they_owe",
      note: "",
      date: "2026-11-01",
      settled: false,
      ...p,
    });
    const s = summarizeDebts([
      d({ amount: 200_000 }),
      d({ amount: 50_000, direction: "i_owe" }),
      d({ person: "Lan", amount: 80_000, direction: "i_owe" }),
      d({ person: "Hùng", amount: 999_000, settled: true }),
    ]);
    expect(s.theyOwe).toBe(200_000);
    expect(s.iOwe).toBe(130_000);
    expect(s.people.find((p) => p.person === "Minh")?.net).toBe(150_000);
    expect(s.people.some((p) => p.person === "Hùng")).toBe(false);
  });
});

describe("Báo cáo tháng & lời nhắc theo quy tắc", () => {
  let n = 0;
  const tx = (type: Transaction["type"], amount: number, categoryId: Transaction["categoryId"], date: string): Transaction => ({
    id: `t${n++}`,
    type,
    amount,
    categoryId,
    walletId: "cash",
    note: "",
    date: `${date}T10:00:00`,
    createdAt: `${date}T10:00:00`,
  });

  const data: Transaction[] = [
    // Tháng 10
    tx("income", 3_000_000, "family", "2026-10-02"),
    tx("expense", 600_000, "food", "2026-10-05"),
    tx("expense", 200_000, "shopping", "2026-10-06"),
    // Tháng 11
    tx("income", 3_000_000, "family", "2026-11-02"),
    tx("expense", 1_500_000, "food", "2026-11-03"),
    tx("expense", 500_000, "shopping", "2026-11-04"),
    tx("expense", 100_000, "transport", "2026-11-05"),
    tx("transfer", 9_000_000, "savings", "2026-11-06"), // không tính
  ];
  const budgets: Budget[] = [{ id: "b", categoryId: "food", limit: 1_200_000, month: "2026-11" }];

  const report = buildMonthlyReport({ transactions: data, month: "2026-11", budgets, now: new Date(2026, 11, 5) });

  it("so sánh với tháng trước (chuyển ví không tính vào chi)", () => {
    expect(report.expense).toBe(2_100_000);
    expect(report.prevExpense).toBe(800_000);
    expect(Math.round(report.expenseChange!)).toBe(163);
    expect(Math.round(report.savingsRate!)).toBe(30);
  });

  it("top 3 danh mục tốn nhất, kèm thay đổi so với tháng trước", () => {
    expect(report.top3.map((t) => t.categoryId)).toEqual(["food", "shopping", "transport"]);
    expect(report.top3[0].change).toBe(150);
    expect(report.top3[2].change).toBeNull(); // tháng trước không có
  });

  it("sinh lời nhắc đúng quy tắc, cảnh báo xếp trước", () => {
    const ids = report.insights.map((i) => i.id);
    expect(ids).toContain("expense-up");
    expect(ids).toContain("top-heavy");
    expect(ids).toContain("category-up");
    expect(ids).toContain("budget-over-food");
    expect(ids).toContain("good-savings");
    expect(report.insights[0].level).toBe("warn");
    expect(report.insights.at(-1)?.level).toBe("good");
  });

  it("dự báo vượt thu nhập khi đang giữa tháng", () => {
    const mid = buildMonthlyReport({ transactions: data, month: "2026-11", now: new Date(2026, 10, 20) });
    // 2.1tr / 20 ngày × 30 = 3.15tr > 3tr
    expect(mid.insights.some((i) => i.id === "projection")).toBe(true);
  });

  it("nhắc khoản chi lặt vặt khi có ≥ 8 khoản dưới 50k", () => {
    const small = Array.from({ length: 9 }, () => tx("expense", 30_000, "food", "2026-11-10"));
    const r = buildMonthlyReport({ transactions: small, month: "2026-11", now: new Date(2026, 11, 1) });
    expect(r.insights.some((i) => i.id === "small-spends")).toBe(true);
    expect(r.insights.some((i) => i.id === "no-prev")).toBe(true);
  });

  it("tháng trống và chia cho 0 an toàn", () => {
    const r = buildMonthlyReport({ transactions: [], month: "2026-11", now: new Date(2026, 11, 1) });
    expect(r.insights.map((i) => i.id)).toEqual(["no-data"]);
    expect(r.savingsRate).toBeNull();
    expect(pctChange(100, 0)).toBeNull();
  });
});
