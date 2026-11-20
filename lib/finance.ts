/**
 * lib/finance.ts
 * Pure financial calculation functions — no side effects, fully testable.
 */

import {
  Transaction,
  CategoryStat,
  DailyTotal,
  Budget,
  CategoryId,
  Wallet,
  RecurringBill,
  SafeToSpendInput,
  SafeToSpendOptions,
  SafeToSpendDetail,
} from "@/types";
import { CATEGORIES } from "./constants";
import {
  format,
  startOfMonth,
  endOfMonth,
  parseISO,
  isWithinInterval,
  startOfDay,
  endOfDay,
} from "date-fns";
import { vi } from "date-fns/locale";

// ── Format ──────────────────────────────────────────────────

/**
 * Format a VND amount: 1500000 → "1.500.000 ₫"
 */
export function formatMoney(amount: number): string {
  const isNeg = amount < 0;
  const formatted = new Intl.NumberFormat("vi-VN", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
  return `${isNeg ? "-" : ""}${formatted} ₫`;
}

/**
 * Short format: 1500000 → "1.5 tr", 1200000000 → "1.2 tỷ"
 */
export function formatMoneyShort(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(1)} tỷ`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1)} tr`;
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(0)}k`;
  }
  return `${sign}${abs}`;
}

/**
 * Format date to Vietnamese display
 */
export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "dd/MM/yyyy", { locale: vi });
  } catch {
    return dateStr;
  }
}

export function formatDateRelative(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")) {
      return "Hôm nay";
    }
    if (format(date, "yyyy-MM-dd") === format(yesterday, "yyyy-MM-dd")) {
      return "Hôm qua";
    }
    return format(date, "dd/MM", { locale: vi });
  } catch {
    return dateStr;
  }
}

export function formatMonth(dateStr: string): string {
  try {
    return format(parseISO(dateStr + "-01"), "MMMM yyyy", { locale: vi });
  } catch {
    return dateStr;
  }
}

// ── Totals (Chuyển tiền KHÔNG tính vào thu/chi) ───────────────

export function getTotalIncome(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getTotalExpense(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getNetBalance(transactions: Transaction[]): number {
  return getTotalIncome(transactions) - getTotalExpense(transactions);
}

// ── Date filtering ───────────────────────────────────────────

export function filterByMonth(
  transactions: Transaction[],
  monthStr: string // "YYYY-MM"
): Transaction[] {
  const ref = parseISO(monthStr + "-01");
  const start = startOfMonth(ref);
  const end = endOfMonth(ref);
  return transactions.filter((t) => {
    const d = parseISO(t.date);
    return isWithinInterval(d, { start, end });
  });
}

export function filterByDay(
  transactions: Transaction[],
  date: Date
): Transaction[] {
  const start = startOfDay(date);
  const end = endOfDay(date);
  return transactions.filter((t) =>
    isWithinInterval(parseISO(t.date), { start, end })
  );
}

// ── Charts ───────────────────────────────────────────────────

/**
 * Build 14-day daily totals for the bar chart
 */
export function getLast14DaysTotals(transactions: Transaction[]): DailyTotal[] {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }

  return days.map((day) => {
    const dayTxs = filterByDay(transactions, day);
    return {
      date: format(day, "dd/MM"),
      fullDate: format(day, "yyyy-MM-dd"),
      income: getTotalIncome(dayTxs),
      expense: getTotalExpense(dayTxs),
    };
  });
}

/**
 * Category breakdown for pie/donut chart
 */
export function getCategoryStats(
  transactions: Transaction[],
  type: "income" | "expense" = "expense"
): CategoryStat[] {
  const filtered = transactions.filter((t) => t.type === type);
  const total = filtered.reduce((sum, t) => sum + t.amount, 0);

  const grouped: Record<string, number> = {};
  for (const t of filtered) {
    grouped[t.categoryId] = (grouped[t.categoryId] || 0) + t.amount;
  }

  return Object.entries(grouped)
    .map(([categoryId, amount]): CategoryStat => {
      const cat = CATEGORIES[categoryId as CategoryId];
      return {
        categoryId: categoryId as CategoryId,
        name: cat?.name ?? categoryId,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
        color: cat?.color ?? "#8A8780",
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

// ── Budget (Vàng ở 80%, Đỏ khi vượt 100%) ─────────────────────

export type BudgetStatus = "normal" | "warning" | "danger";

export interface BudgetProgress {
  spent: number;
  remaining: number;
  percentage: number;
  isOver: boolean;
  status: BudgetStatus;
  barColor: string;
}

export function getBudgetProgress(
  budget: Budget,
  transactions: Transaction[]
): BudgetProgress {
  const monthTxs = filterByMonth(transactions, budget.month);
  const spent = monthTxs
    .filter((t) => t.type === "expense" && t.categoryId === budget.categoryId)
    .reduce((sum, t) => sum + t.amount, 0);

  const remaining = budget.limit - spent;
  const percentage = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
  const isOver = spent > budget.limit;

  let status: BudgetStatus = "normal";
  let barColor = "var(--color-income)"; // xanh dưới 80%

  if (isOver || percentage > 100) {
    status = "danger";
    barColor = "var(--color-expense)"; // Đỏ khi vượt 100%
  } else if (percentage >= 80) {
    status = "warning";
    barColor = "var(--color-accent)"; // Vàng ở 80% - 100%
  }

  return {
    spent,
    remaining,
    percentage: Math.min(percentage, 100),
    isOver,
    status,
    barColor,
  };
}

// ── Safe-to-Spend ─────────────────────────────────────────────
/**
 * Công thức:
 * Safe-to-Spend = (số dư ví khả dụng − hóa đơn chưa trả − tiền tiết kiệm đã khóa) / số ngày còn lại trong tháng
 *
 * Xử lý ca biên:
 * 1. Ngày cuối tháng: daysRemaining = 1 → chia cho 1.
 * 2. Số dư âm hoặc pool <= 0:
 *    - Mặc định: trả về 0 (không thể tiêu thêm an toàn).
 *    - allowNegative: true: trả về pool / daysRemaining để phục vụ phân tích.
 * 3. Chia cho 0 (daysRemaining <= 0):
 *    - Trả về 0 an toàn, không sinh NaN hoặc Infinity.
 */

export function calculateSafeToSpend(
  input: SafeToSpendInput,
  options: SafeToSpendOptions = {}
): number {
  const { availableBalance, unpaidBills, lockedSavings, daysRemaining } = input;

  // Xử lý ca biên chia cho 0 hoặc số ngày không hợp lệ
  if (!daysRemaining || daysRemaining <= 0 || !Number.isFinite(daysRemaining)) {
    return 0;
  }

  // Quỹ khả dụng còn lại để chi tiêu tự do
  const pool = availableBalance - unpaidBills - lockedSavings;

  // Xử lý ca biên số dư âm hoặc thâm hụt
  if (pool <= 0) {
    return options.allowNegative ? pool / daysRemaining : 0;
  }

  return pool / daysRemaining;
}

/**
 * Tính số ngày còn lại trong tháng (tính cả ngày hiện tại)
 * Ca biên ngày cuối tháng: trả về đúng 1
 */
export function getDaysRemainingInMonth(date: Date = new Date()): number {
  const lastDay = endOfMonth(date).getDate(); // 28, 29, 30 hoặc 31
  const currentDay = date.getDate();
  const diff = lastDay - currentDay + 1;
  return Math.max(1, diff);
}

/**
 * Tính toán chi tiết Safe-to-Spend từ danh sách ví và hóa đơn định kỳ
 */
export function getSafeToSpendDetail(params: {
  wallets: Wallet[];
  recurringBills: RecurringBill[];
  extraLockedSavings?: number;
  currentDate?: Date;
  currentMonth?: string;
}): SafeToSpendDetail {
  const now = params.currentDate ?? new Date();
  const monthKey = params.currentMonth ?? format(now, "yyyy-MM");

  // 1. Số dư ví khả dụng (ví không bị khóa)
  const availableBalance = params.wallets
    .filter((w) => !w.isLocked)
    .reduce((sum, w) => sum + w.balance, 0);

  // 2. Tiền tiết kiệm đã khóa (từ ví bị khóa + extra)
  const lockedInWallets = params.wallets
    .filter((w) => w.isLocked)
    .reduce((sum, w) => sum + w.balance, 0);
  const lockedSavings = lockedInWallets + (params.extraLockedSavings || 0);

  // 3. Hóa đơn chưa thanh toán trong tháng hiện tại
  const unpaidBills = params.recurringBills
    .filter((b) => !b.paidMonths.includes(monthKey))
    .reduce((sum, b) => sum + b.amount, 0);

  // 4. Số ngày còn lại trong tháng
  const daysRemaining = getDaysRemainingInMonth(now);

  const pool = availableBalance - unpaidBills - lockedSavings;
  const dailyAmount = calculateSafeToSpend({
    availableBalance,
    unpaidBills,
    lockedSavings,
    daysRemaining,
  });

  return {
    availableBalance,
    unpaidBills,
    lockedSavings,
    daysRemaining,
    pool,
    dailyAmount,
    isNegative: pool < 0,
  };
}

// ── Daily limit ──────────────────────────────────────────────

export function getDailySpent(transactions: Transaction[], date?: Date): number {
  const target = date ?? new Date();
  return filterByDay(transactions, target)
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getDailyRemaining(
  transactions: Transaction[],
  dailyLimit: number,
  date?: Date
): number {
  return dailyLimit - getDailySpent(transactions, date);
}

// ── Helpers ──────────────────────────────────────────────────

export function getCurrentMonth(): string {
  return format(new Date(), "yyyy-MM");
}

export function groupTransactionsByDate(
  transactions: Transaction[]
): Map<string, Transaction[]> {
  const groups = new Map<string, Transaction[]>();
  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  for (const t of sorted) {
    const key = t.date.slice(0, 10);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }
  return groups;
}
