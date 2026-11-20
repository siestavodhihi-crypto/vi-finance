"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useFinanceStore } from "@/store/useFinanceStore";
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
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowLeftRight,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  Lock,
  Plus,
  CalendarClock,
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

  // Safe-to-Spend calculation
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
      {/* Greeting & Quick Action buttons */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-500 text-[var(--color-text-secondary)] capitalize">{today}</p>
          <h1 className="text-2xl font-800 tracking-tight text-[var(--color-text-primary)]">
            Xin chào! 👋
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTransferOpen(true)}
            className="hidden sm:flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-600 text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all"
          >
            <ArrowLeftRight size={14} strokeWidth={2} />
            <span>Chuyển ví</span>
          </button>
          <button
            onClick={() => setAddTxOpen(true)}
            className="flex items-center gap-1.5 min-h-[44px] md:min-h-0 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3.5 py-2 text-xs font-700 text-[var(--color-accent-fg)] active:scale-95 transition-all shadow-sm"
          >
            <Plus size={16} strokeWidth={2} />
            <span>Ghi chép</span>
          </button>
        </div>
      </div>

      {/* Hero — Total Assets */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-600 uppercase tracking-wider text-[var(--color-text-secondary)]">
            Tổng tài sản hiện có
          </p>
          <Link
            href="/wallets"
            className="text-xs font-600 text-[var(--color-accent-text)] hover:underline"
          >
            Chi tiết ví ({wallets.length}) →
          </Link>
        </div>

        <div className="mb-4">
          <AmountDisplay
            amount={totalAssets}
            privacyMode={privacyMode}
            className="text-4xl sm:text-5xl font-800 text-[var(--color-accent-text)] leading-none"
          />
        </div>

        {/* Income / Expense summary row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] bg-[var(--color-income)]/10 px-3.5 py-2.5 border border-[var(--color-income)]/20">
            <ArrowUpCircle size={20} strokeWidth={2} className="text-[var(--color-income)] flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-600 uppercase tracking-wider text-[var(--color-income)]">
                Thu tháng {format(new Date(), "MM")}
              </p>
              <AmountDisplay
                amount={monthIncome}
                privacyMode={privacyMode}
                className="text-sm sm:text-base font-700 text-[var(--color-income)] block truncate"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] bg-[var(--color-expense)]/10 px-3.5 py-2.5 border border-[var(--color-expense)]/20">
            <ArrowDownCircle size={20} strokeWidth={2} className="text-[var(--color-expense)] flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-600 uppercase tracking-wider text-[var(--color-expense)]">
                Chi tháng {format(new Date(), "MM")}
              </p>
              <AmountDisplay
                amount={monthExpense}
                privacyMode={privacyMode}
                className="text-sm sm:text-base font-700 text-[var(--color-expense)] block truncate"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SAFE-TO-SPEND CARD (Công thức sinh viên an tâm không lo đói) */}
      <div className="card p-5 border-l-4 border-l-[var(--color-accent)]">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} strokeWidth={2} className="text-[var(--color-accent)]" />
            <h2 className="text-sm font-700 text-[var(--color-text-primary)]">
              Mức tiêu an toàn hôm nay (Safe-to-Spend)
            </h2>
          </div>
          <span className="text-[11px] font-600 text-[var(--color-text-secondary)] bg-[var(--color-bg)] px-2.5 py-1 rounded-[var(--radius-sm)]">
            Còn {safeDetail.daysRemaining} ngày trong tháng
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-3">
          <AmountDisplay
            amount={Math.round(safeDetail.dailyAmount)}
            privacyMode={privacyMode}
            className={cn(
              "text-3xl font-800",
              safeDetail.dailyAmount > 0
                ? "text-[var(--color-income)]"
                : "text-[var(--color-expense)]"
            )}
          />
          <span className="text-xs text-[var(--color-text-secondary)] font-medium">/ ngày</span>
        </div>

        {/* Formula breakdown */}
        <div className="rounded-[var(--radius-md)] bg-[var(--color-bg)] p-3 text-xs space-y-2 border border-[var(--color-border)]">
          <div className="flex justify-between items-center text-[var(--color-text-secondary)]">
            <span>Ví khả dụng (tiền có thể tiêu):</span>
            <span className="font-600 text-[var(--color-text-primary)] tabular-nums">
              {privacyMode ? "•••••" : formatMoney(safeDetail.availableBalance)}
            </span>
          </div>
          <div className="flex justify-between items-center text-[var(--color-text-secondary)]">
            <span className="flex items-center gap-1">
              <CalendarClock size={12} />
              Hóa đơn chưa thanh toán:
            </span>
            <span className="font-600 text-[var(--color-expense)] tabular-nums">
              -{privacyMode ? "•••••" : formatMoney(safeDetail.unpaidBills)}
            </span>
          </div>
          {safeDetail.lockedSavings > 0 && (
            <div className="flex justify-between items-center text-[var(--color-text-secondary)]">
              <span className="flex items-center gap-1">
                <Lock size={12} />
                Tiền tiết kiệm đã khóa:
              </span>
              <span className="font-600 text-[var(--color-accent)] tabular-nums">
                -{privacyMode ? "•••••" : formatMoney(safeDetail.lockedSavings)}
              </span>
            </div>
          )}
          <div className="border-t border-[var(--color-border)] pt-1.5 flex justify-between font-600">
            <span className="text-[var(--color-text-primary)]">Quỹ chi tiêu tự do còn lại:</span>
            <span
              className={cn(
                "tabular-nums",
                safeDetail.pool >= 0 ? "text-[var(--color-income)]" : "text-[var(--color-expense)]"
              )}
            >
              {privacyMode ? "•••••" : formatMoney(safeDetail.pool)}
            </span>
          </div>
        </div>
      </div>

      {/* Daily limit card */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs font-500 text-[var(--color-text-secondary)]">
              Hạn mức chi tiêu đặt ra hôm nay
            </p>
            <p className="text-sm font-600 text-[var(--color-text-primary)]">
              {privacyMode ? (
                <span className="tracking-widest">•••••</span>
              ) : (
                <span className="tabular-nums">
                  Đã tiêu {formatMoney(dailySpent)} / {formatMoney(dailyLimit)}
                </span>
              )}
            </p>
          </div>
          <div
            className={cn(
              "text-xs font-600 px-2.5 py-1 rounded-[var(--radius-sm)]",
              dailyPct >= 100
                ? "bg-[var(--color-expense)]/15 text-[var(--color-expense)]"
                : dailyPct >= 75
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                : "bg-[var(--color-income)]/15 text-[var(--color-income)]"
            )}
          >
            {dailyRemaining >= 0 ? `Còn ${formatMoneyShort(dailyRemaining)}` : `Vượt ${formatMoneyShort(Math.abs(dailyRemaining))}`}
          </div>
        </div>
        <div className="h-2 rounded-full bg-[var(--color-border)]">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              dailyPct >= 100
                ? "bg-[var(--color-expense)]"
                : dailyPct >= 75
                ? "bg-amber-500"
                : "bg-[var(--color-income)]"
            )}
            style={{ width: `${dailyPct}%` }}
          />
        </div>
      </div>

      {/* 14-day bar chart */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-700 text-[var(--color-text-primary)]">
            Dòng tiền 14 ngày qua
          </h2>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
              <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-income)]" /> Thu
            </span>
            <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
              <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-expense)]" /> Chi
            </span>
          </div>
        </div>

        {!hasData ? (
          <EmptyChartState />
        ) : (
          <Last14DaysBarChart data={chartData} />
        )}
      </div>

      {/* Category donut chart */}
      {catStats.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-700 text-[var(--color-text-primary)]">
              Phân bổ chi tiêu tháng này
            </h2>
            <Link href="/budget" className="text-xs font-600 text-[var(--color-accent-text)] hover:underline">
              Quản lý ngân sách →
            </Link>
          </div>
          <CategoryDonutChart data={catStats} privacyMode={privacyMode} />
        </div>
      )}

      {/* Recent transactions */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-700 text-[var(--color-text-primary)]">
            5 Giao dịch gần nhất
          </h2>
          <Link
            href="/transactions"
            className="text-xs font-600 text-[var(--color-accent)] hover:underline"
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
      <TrendingUp size={40} strokeWidth={1.25} className="text-[var(--color-border)] mb-3" />
      <p className="text-sm text-[var(--color-text-secondary)]">Chưa có dữ liệu giao dịch</p>
    </div>
  );
}

function EmptyTransactions({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <TrendingDown size={40} strokeWidth={1.25} className="text-[var(--color-border)] mb-3" />
      <p className="text-sm font-600 text-[var(--color-text-primary)] mb-1">Chưa có giao dịch</p>
      <p className="text-xs text-[var(--color-text-secondary)] mb-3">
        Bắt đầu ghi chép các khoản chi tiêu nhỏ nhất
      </p>
      <button
        onClick={onAdd}
        className="px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white text-xs font-600"
      >
        + Thêm giao dịch đầu tiên
      </button>
    </div>
  );
}
