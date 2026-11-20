/**
 * lib/monthly-report.ts — Báo cáo tháng & lời nhắc dựa trên quy tắc (không dùng AI)
 */
import { Budget, CategoryId, Transaction } from "@/types";
import { format, getDaysInMonth, parseISO, subMonths } from "date-fns";
import { CATEGORIES } from "./constants";
import {
  filterByMonth,
  formatMoney,
  getBudgetProgress,
  getCategoryStats,
  getTotalExpense,
  getTotalIncome,
} from "./finance";

export type InsightLevel = "warn" | "info" | "good";

export interface Insight {
  id: string;
  level: InsightLevel;
  message: string;
}

export interface TopCategory {
  categoryId: CategoryId;
  name: string;
  color: string;
  amount: number;
  share: number; // % trên tổng chi
  prevAmount: number;
  change: number | null; // % so với tháng trước
}

export interface MonthlyReport {
  month: string;
  prevMonth: string;
  income: number;
  expense: number;
  prevIncome: number;
  prevExpense: number;
  incomeChange: number | null;
  expenseChange: number | null;
  net: number;
  savingsRate: number | null;
  top3: TopCategory[];
  insights: Insight[];
  txCount: number;
}

/** % thay đổi; null khi tháng trước bằng 0 (không so sánh được) */
export function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

const CATEGORY_TIPS: Partial<Record<CategoryId, string>> = {
  food: "thử tự nấu 2–3 bữa/tuần hoặc mang cơm đi học",
  shopping: "thử quy tắc chờ 48 giờ trước khi mua món không thiết yếu",
  entertainment: "đặt một mức trần cố định cho giải trí mỗi tuần",
  transport: "cân nhắc xe buýt hoặc đi chung thay vì gọi xe",
};

const LEVEL_ORDER: Record<InsightLevel, number> = { warn: 0, info: 1, good: 2 };
const SMALL_SPEND = 50_000;

export function buildMonthlyReport(params: {
  transactions: Transaction[];
  month: string; // "YYYY-MM"
  budgets?: Budget[];
  now?: Date;
}): MonthlyReport {
  const { transactions, month, budgets = [], now = new Date() } = params;
  const prevMonth = format(subMonths(parseISO(`${month}-01`), 1), "yyyy-MM");

  const cur = filterByMonth(transactions, month);
  const prev = filterByMonth(transactions, prevMonth);

  const income = getTotalIncome(cur);
  const expense = getTotalExpense(cur);
  const prevIncome = getTotalIncome(prev);
  const prevExpense = getTotalExpense(prev);
  const net = income - expense;
  const savingsRate = income > 0 ? (net / income) * 100 : null;
  const expenseChange = pctChange(expense, prevExpense);

  const curStats = getCategoryStats(cur, "expense");
  const prevMap = new Map(getCategoryStats(prev, "expense").map((s) => [s.categoryId, s.amount]));

  const top3: TopCategory[] = curStats.slice(0, 3).map((s) => {
    const prevAmount = prevMap.get(s.categoryId) ?? 0;
    return {
      categoryId: s.categoryId,
      name: s.name,
      color: s.color,
      amount: s.amount,
      share: expense > 0 ? (s.amount / expense) * 100 : 0,
      prevAmount,
      change: pctChange(s.amount, prevAmount),
    };
  });

  // ── Lời nhắc theo quy tắc ───────────────────────────────────
  const insights: Insight[] = [];
  const pct = (n: number) => `${Math.round(Math.abs(n))}%`;

  if (income === 0 && expense === 0) {
    insights.push({
      id: "no-data",
      level: "info",
      message: "Chưa có giao dịch nào trong tháng này. Hãy ghi lại khoản đầu tiên nhé!",
    });
  } else {
    // R1. Thu – chi
    if (net < 0) {
      insights.push({
        id: "overspend",
        level: "warn",
        message: `Tháng này bạn chi nhiều hơn thu ${formatMoney(-net)}. Hãy xem lại các khoản chưa thật cần.`,
      });
    } else if (savingsRate !== null && savingsRate >= 20) {
      insights.push({
        id: "good-savings",
        level: "good",
        message: `Bạn để dành được ${pct(savingsRate)} thu nhập — rất tốt, cứ giữ nhịp này!`,
      });
    }

    // R2. So với tháng trước
    if (expenseChange === null) {
      if (prev.length === 0) {
        insights.push({
          id: "no-prev",
          level: "info",
          message: "Chưa có dữ liệu tháng trước để so sánh.",
        });
      }
    } else if (expenseChange >= 15) {
      insights.push({
        id: "expense-up",
        level: "warn",
        message: `Chi tiêu tăng ${pct(expenseChange)} so với tháng trước (thêm ${formatMoney(expense - prevExpense)}).`,
      });
    } else if (expenseChange <= -10) {
      insights.push({
        id: "expense-down",
        level: "good",
        message: `Chi tiêu giảm ${pct(expenseChange)} so với tháng trước — bớt được ${formatMoney(prevExpense - expense)}.`,
      });
    }

    // R3. Một danh mục chiếm quá nửa ngân quỹ
    const top = top3[0];
    if (top && top.share >= 40) {
      const tip = CATEGORY_TIPS[top.categoryId] ?? "xem lại các khoản trong mục này";
      insights.push({
        id: "top-heavy",
        level: "warn",
        message: `${top.name} chiếm ${pct(top.share)} tổng chi — ${tip}.`,
      });
    }

    // R4. Danh mục tăng mạnh nhất (≥ 30% và ≥ 100k)
    const rising = curStats
      .map((s) => ({ s, p: prevMap.get(s.categoryId) ?? 0 }))
      .filter(({ s, p }) => p > 0 && s.amount - p >= 100_000 && (s.amount - p) / p >= 0.3)
      .sort((a, b) => b.s.amount - b.p - (a.s.amount - a.p))[0];
    if (rising) {
      insights.push({
        id: "category-up",
        level: "warn",
        message: `${rising.s.name} tăng ${pct(((rising.s.amount - rising.p) / rising.p) * 100)} so với tháng trước (thêm ${formatMoney(rising.s.amount - rising.p)}).`,
      });
    }

    // R5. Ngân sách (tối đa 2 lời nhắc)
    let budgetNotes = 0;
    for (const b of budgets.filter((x) => x.month === month)) {
      if (budgetNotes >= 2) break;
      const p = getBudgetProgress(b, transactions);
      const name = CATEGORIES[b.categoryId]?.name ?? b.categoryId;
      if (p.isOver) {
        insights.push({
          id: `budget-over-${b.categoryId}`,
          level: "warn",
          message: `Đã vượt ngân sách ${name} ${formatMoney(p.spent - b.limit)}.`,
        });
        budgetNotes++;
      } else if (p.percentage >= 80) {
        insights.push({
          id: `budget-near-${b.categoryId}`,
          level: "info",
          message: `${name} đã dùng ${pct(p.percentage)} ngân sách, còn ${formatMoney(p.remaining)}.`,
        });
        budgetNotes++;
      }
    }

    // R6. Chi tiêu lặt vặt
    const small = cur.filter((t) => t.type === "expense" && t.amount <= SMALL_SPEND);
    if (small.length >= 8) {
      insights.push({
        id: "small-spends",
        level: "info",
        message: `Có ${small.length} khoản chi nhỏ dưới 50k, cộng lại ${formatMoney(small.reduce((s, t) => s + t.amount, 0))} — lặt vặt nhưng không hề nhỏ.`,
      });
    }

    // R7. Dự báo cuối tháng (chỉ cho tháng hiện tại, từ ngày 5)
    if (format(now, "yyyy-MM") === month && net >= 0 && income > 0) {
      const day = now.getDate();
      const days = getDaysInMonth(now);
      if (day >= 5 && day < days) {
        const projected = (expense / day) * days;
        if (projected > income) {
          insights.push({
            id: "projection",
            level: "warn",
            message: `Với tốc độ hiện tại, cuối tháng bạn sẽ chi khoảng ${formatMoney(Math.round(projected / 1000) * 1000)}, vượt thu nhập.`,
          });
        }
      }
    }
  }

  insights.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);

  return {
    month,
    prevMonth,
    income,
    expense,
    prevIncome,
    prevExpense,
    incomeChange: pctChange(income, prevIncome),
    expenseChange,
    net,
    savingsRate,
    top3,
    insights: insights.slice(0, 6),
    txCount: cur.length,
  };
}
