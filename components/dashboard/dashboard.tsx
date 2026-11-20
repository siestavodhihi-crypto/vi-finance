"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useUIStore } from "@/store/useUIStore";
import { useHydrated } from "@/lib/useHydrated";
import { PageSkeleton, Skeleton } from "@/components/ui/skeleton";
import {
  formatMoney,
  formatMoneyShort,
  getTotalIncome,
  getTotalExpense,
  filterByMonth,
  getCurrentMonth,
  getDailySpent,
  getDailyRemaining,
  getLast14DaysTotals,
  getCategoryStats,
  getSafeToSpendDetail,
} from "@/lib/finance";
import { cn } from "@/lib/utils";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  Lock,
  Plus,
  CalendarClock,
  Sparkles,
} from "lucide-react";
import { TransactionRow } from "@/components/transactions/transaction-row";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { AddTransactionModal } from "@/components/transactions/add-transaction-modal";
import { TransferModal } from "@/components/wallets/transfer-modal";
import Link from "next/link";

const Last14DaysBarChart = dynamic(
  () => import("./dashboard-charts").then((m) => m.Last14DaysBarChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-44 w-full rounded-[var(--radius-md)]" />,
  }
);

const CategoryDonutChart = dynamic(
  () => import("./dashboard-charts").then((m) => m.CategoryDonutChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-52 w-full rounded-[var(--radius-md)]" />,
  }
);

function AmountDisplay({
  amount,
  privacyMode,
  className,
}: {
  amount: number;
  privacyMode: boolean;
  className?: string;
}) {
  if (privacyMode) {
    return <span className={cn("tracking-widest", className)}>••••• ₫</span>;
  }
  return <span className={cn("tabular-nums", className)}>{formatMoney(amount)}</span>;
}

export function Dashboard() {
  const hydrated = useHydrated();
  const setQuickAddOpen = useUIStore((s) => s.setQuickAddOpen);
  const { transactions, wallets, settings, recurringBills } = useFinanceStore();
  const { privacyMode, dailyLimit } = settings;

  const [addTxOpen, setAddTxOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const currentMonth = getCurrentMonth();
  const monthTxs = useMemo(
    () => filterByMonth(transactions, currentMonth),
    [transactions, currentMonth]
  );

  const totalAssets = wallets.reduce((s, w) => s + w.balance, 0);
  const monthIncome = getTotalIncome(monthTxs);
  const monthExpense = getTotalExpense(monthTxs);

  const safeDetail = useMemo(
    () =>
      getSafeToSpendDetail({
        wallets,
        recurringBills,
        extraLockedSavings: settings.lockedSavings,
        currentMonth,
      }),
    [wallets, recurringBills, settings.lockedSavings, currentMonth]
  );

  const dailySpent = getDailySpent(transactions);
  const dailyRemaining = getDailyRemaining(transactions, dailyLimit);
  const dailyPct = Math.min((dailySpent / dailyLimit) * 100, 100);

  const chartData = useMemo(() => getLast14DaysTotals(transactions), [transactions]);
  const catStats = useMemo(() => getCategoryStats(monthTxs, "expense"), [monthTxs]);

  const recentTxs = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5),
    [transactions]
  );

  const today = format(new Date(), "EEEE, dd/MM/yyyy", { locale: vi });
  const hasData = transactions.length > 0;

  if (!hydrated) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-5 pb-24 md:pb-8">
      {/* Top Greeting & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-500 text-[var(--color-text-secondary)] capitalize">{today}</p>
          <h1 className="text-2xl font-800 tracking-tight text-[var(--color-text-primary)]">
            Tổng quan tài chính
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setQuickAddOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-600 text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-colors"
          >
            <Sparkles size={14} className="text-[var(--color-accent-text)]" />
            <span>Nhập nhanh</span>
            <kbd className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg)] text-[var(--color-text-secondary)]">
              ⌘K
            </kbd>
          </button>
          <button
            onClick={() => setTransferOpen(true)}
            className="hidden md:inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-600 text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-colors"
          >
            <ArrowLeftRight size={14} strokeWidth={2} />
            <span>Chuyển ví</span>
          </button>
          <button
            onClick={() => setAddTxOpen(true)}
            className="flex items-center gap-1.5 min-h-[44px] md:min-h-0 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-xs font-700 text-[var(--color-accent-fg)] active:scale-95 transition-all shadow-sm"
          >
            <Plus size={16} strokeWidth={2.25} />
            <span>Ghi chép</span>
          </button>
        </div>
      </div>

      {/* HERO CARD — Deep Matcha Apple-Wallet / Wise style */}
      <div className="card-hero p-6 sm:p-7 space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-600 uppercase tracking-widest text-[var(--color-hero-muted)]">
            Tổng tài sản
          </span>
          <Link
            href="/wallets"
            className="text-xs font-600 text-[var(--color-hero-muted)] hover:text-white transition-colors"
          >
            {wallets.length} ví đang dùng →
          </Link>
        </div>

        <div>
          <AmountDisplay
            amount={totalAssets}
            privacyMode={privacyMode}
            className="text-4xl sm:text-5xl font-800 tracking-tight text-[var(--color-hero-fg)] leading-none"
          />
        </div>

        {/* Income / Expense Glass Pills */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[var(--radius-md)] bg-white/10 backdrop-blur-sm px-4 py-3 border border-white/10">
            <div className="flex items-center gap-1.5 text-[11px] font-500 text-[var(--color-hero-muted)] mb-1">
              <ArrowDownLeft size={14} className="text-emerald-300" />
              <span>Thu tháng {format(new Date(), "MM")}</span>
            </div>
            <AmountDisplay
              amount={monthIncome}
              privacyMode={privacyMode}
              className="text-base sm:text-lg font-700 text-white block truncate"
            />
          </div>

          <div className="rounded-[var(--radius-md)] bg-white/10 backdrop-blur-sm px-4 py-3 border border-white/10">
            <div className="flex items-center gap-1.5 text-[11px] font-500 text-[var(--color-hero-muted)] mb-1">
              <ArrowUpRight size={14} className="text-rose-300" />
              <span>Chi tháng {format(new Date(), "MM")}</span>
            </div>
            <AmountDisplay
              amount={monthExpense}
              privacyMode={privacyMode}
              className="text-base sm:text-lg font-700 text-white block truncate"
            />
          </div>
        </div>
      </div>

      {/* BENTO ROW 1: Safe-to-Spend + Hạn mức hôm nay */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Safe-to-Spend (3 cols) */}
        <div className="card p-5 lg:col-span-3 flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--color-accent-soft)] text-[var(--color-accent-text)] flex items-center justify-center">
                <ShieldCheck size={17} strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-sm font-700 text-[var(--color-text-primary)] leading-tight">
                  Tiêu an toàn hôm nay
                </h2>
                <p className="text-[11px] text-[var(--color-text-secondary)]">
                  Safe-to-Spend · Còn {safeDetail.daysRemaining} ngày
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-baseline gap-1.5">
            <AmountDisplay
              amount={Math.round(safeDetail.dailyAmount)}
              privacyMode={privacyMode}
              className={cn(
                "text-3xl font-800 tracking-tight",
                safeDetail.dailyAmount > 0
                  ? "text-[var(--color-accent-text)]"
                  : "text-[var(--color-expense)]"
              )}
            />
            <span className="text-xs text-[var(--color-text-secondary)] font-500">/ ngày</span>
          </div>

          <div className="rounded-[var(--radius-md)] bg-[var(--color-bg)] p-3 text-xs space-y-1.5">
            <div className="flex justify-between text-[var(--color-text-secondary)]">
              <span>Ví khả dụng</span>
              <span className="font-600 text-[var(--color-text-primary)] tabular-nums">
                {privacyMode ? "•••••" : formatMoney(safeDetail.availableBalance)}
              </span>
            </div>
            <div className="flex justify-between text-[var(--color-text-secondary)]">
              <span className="inline-flex items-center gap-1">
                <CalendarClock size={12} /> Hóa đơn chưa trả
              </span>
              <span className="font-600 text-[var(--color-expense)] tabular-nums">
                -{privacyMode ? "•••••" : formatMoney(safeDetail.unpaidBills)}
              </span>
            </div>
            {safeDetail.lockedSavings > 0 && (
              <div className="flex justify-between text-[var(--color-text-secondary)]">
                <span className="inline-flex items-center gap-1">
                  <Lock size={12} /> Tiết kiệm khóa
                </span>
                <span className="font-600 text-[var(--color-accent-text)] tabular-nums">
                  -{privacyMode ? "•••••" : formatMoney(safeDetail.lockedSavings)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Hạn mức hôm nay (2 cols) */}
        <div className="card p-5 lg:col-span-2 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-700 text-[var(--color-text-primary)]">
              Hạn mức hôm nay
            </h2>
            <span
              className={cn(
                "text-[11px] font-700 px-2.5 py-1 rounded-full",
                dailyPct >= 100
                  ? "bg-[var(--color-expense)]/12 text-[var(--color-expense)]"
                  : dailyPct >= 80
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                  : "bg-[var(--color-accent-soft)] text-[var(--color-accent-text)]"
              )}
            >
              {Math.round(dailyPct)}%
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-2xl font-800 tabular-nums text-[var(--color-text-primary)]">
              {privacyMode
                ? "••••• ₫"
                : dailyRemaining >= 0
                ? formatMoney(dailyRemaining)
                : `-${formatMoney(Math.abs(dailyRemaining))}`}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {dailyRemaining >= 0 ? "Còn lại hôm nay" : "Đã vượt hạn mức hôm nay"} ·{" "}
              {privacyMode ? "•••" : `đã tiêu ${formatMoneyShort(dailySpent)} / ${formatMoneyShort(dailyLimit)}`}
            </p>
          </div>

          <div className="space-y-2">
            <div className="h-2.5 rounded-full bg-[var(--color-bg)] overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  dailyPct >= 100
                    ? "bg-[var(--color-expense)]"
                    : dailyPct >= 80
                    ? "bg-[var(--color-warning)]"
                    : "bg-[var(--color-accent)]"
                )}
                style={{ width: `${dailyPct}%` }}
              />
            </div>
            <Link
              href="/settings"
              className="text-[11px] font-600 text-[var(--color-accent-text)] hover:underline inline-block"
            >
              Điều chỉnh hạn mức →
            </Link>
          </div>
        </div>
      </div>

      {/* BENTO ROW 2: Biểu đồ 14 ngày + Phân bổ danh mục */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-700 text-[var(--color-text-primary)]">
              Dòng tiền 14 ngày qua
            </h2>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-income)]" /> Thu
              </span>
              <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-expense)]" /> Chi
              </span>
            </div>
          </div>

          {!hasData ? <EmptyChartState /> : <Last14DaysBarChart data={chartData} />}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-700 text-[var(--color-text-primary)]">
              Phân bổ chi tiêu tháng này
            </h2>
            <Link
              href="/budget"
              className="text-xs font-600 text-[var(--color-accent-text)] hover:underline"
            >
              Ngân sách →
            </Link>
          </div>
          {catStats.length === 0 ? (
            <EmptyChartState />
          ) : (
            <CategoryDonutChart data={catStats} privacyMode={privacyMode} />
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-700 text-[var(--color-text-primary)]">
            5 giao dịch gần nhất
          </h2>
          <Link
            href="/transactions"
            className="text-xs font-600 text-[var(--color-accent-text)] hover:underline"
          >
            Xem tất cả ({transactions.length}) →
          </Link>
        </div>

        {recentTxs.length === 0 ? (
          <EmptyTransactions onAdd={() => setAddTxOpen(true)} />
        ) : (
          <div className="divide-y divide-[var(--color-border)]/50">
            {recentTxs.map((tx) => (
              <TransactionRow key={tx.id} transaction={tx} />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AddTransactionModal open={addTxOpen} onClose={() => setAddTxOpen(false)} />
      <TransferModal open={transferOpen} onClose={() => setTransferOpen(false)} />
    </div>
  );
}

function EmptyChartState() {
  return (
    <div className="flex flex-col items-center justify-center h-44 text-center">
      <TrendingUp size={36} strokeWidth={1.25} className="text-[var(--color-border)] mb-2" />
      <p className="text-xs text-[var(--color-text-secondary)]">Chưa có dữ liệu giao dịch</p>
    </div>
  );
}

function EmptyTransactions({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <TrendingDown size={38} strokeWidth={1.25} className="text-[var(--color-border)] mb-2" />
      <p className="text-sm font-600 text-[var(--color-text-primary)] mb-1">Chưa có giao dịch</p>
      <p className="text-xs text-[var(--color-text-secondary)] mb-3">
        Bắt đầu ghi chép từ những khoản nhỏ nhất
      </p>
      <button
        onClick={onAdd}
        className="min-h-[44px] px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-[var(--color-accent-fg)] text-xs font-700"
      >
        + Thêm giao dịch đầu tiên
      </button>
    </div>
  );
}
