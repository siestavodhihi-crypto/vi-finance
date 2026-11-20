"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useHydrated } from "@/lib/useHydrated";
import { PageSkeleton, Skeleton } from "@/components/ui/skeleton";
import {
  filterByMonth,
  getCurrentMonth,
  getTotalIncome,
  getTotalExpense,
  formatMoney,
  formatMonth,
} from "@/lib/finance";
import { buildMonthlyReport } from "@/lib/monthly-report";
import { CategoryIcon } from "@/components/transactions/category-icon";
import { AiCoachCard } from "@/components/reports/ai-coach-card";
import {
  BarChart2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  CheckCircle2,
  Award,
} from "lucide-react";
import { addMonths, format, parseISO, subMonths } from "date-fns";
import { cn } from "@/lib/utils";

const SixMonthBarChart = dynamic(
  () => import("@/components/reports/reports-chart").then((m) => m.SixMonthBarChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-48 w-full rounded-[var(--radius-md)]" />,
  }
);

function ChangeBadge({
  value,
  invert = false,
}: {
  value: number | null;
  invert?: boolean; // chi tiêu: giảm là tốt (xanh), tăng là xấu (đỏ)
}) {
  if (value === null) {
    return (
      <span className="text-[11px] text-[var(--color-text-secondary)]">
        Chưa có tháng trước
      </span>
    );
  }
  const up = value > 0;
  const good = invert ? !up : up;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-600 tabular-nums",
        good ? "text-[var(--color-income)]" : "text-[var(--color-expense)]"
      )}
    >
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {up ? "+" : ""}
      {Math.round(value)}% so với tháng trước
    </span>
  );
}

export default function ReportsPage() {
  const hydrated = useHydrated();
  const { transactions, budgets, settings } = useFinanceStore();
  const { privacyMode } = settings;

  const [selectedMonth, setSelectedMonth] = useState(() => getCurrentMonth());

  const report = useMemo(
    () =>
      buildMonthlyReport({
        transactions,
        month: selectedMonth,
        budgets,
      }),
    [transactions, selectedMonth, budgets]
  );

  const months6 = useMemo(() => {
    const result = [];
    const base = parseISO(`${selectedMonth}-01`);
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(base, i);
      const key = format(d, "yyyy-MM");
      const txs = filterByMonth(transactions, key);
      result.push({
        month: key,
        label: `T${d.getMonth() + 1}`,
        income: getTotalIncome(txs),
        expense: getTotalExpense(txs),
      });
    }
    return result;
  }, [transactions, selectedMonth]);

  if (!hydrated) return <PageSkeleton />;

  const shiftMonth = (delta: number) => {
    const d = parseISO(`${selectedMonth}-01`);
    setSelectedMonth(format(addMonths(d, delta), "yyyy-MM"));
  };

  return (
    <div className="pb-24 md:pb-8 space-y-5">
      {/* Header + Month switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-800 text-[var(--color-text-primary)]">
            Báo cáo tháng
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)]">
            So sánh với tháng trước, top 3 khoản tốn nhất & lời nhắc tự động
          </p>
        </div>

        <div className="inline-flex items-center gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
          <button
            onClick={() => shiftMonth(-1)}
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
            aria-label="Tháng trước"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="px-3 text-xs font-700 capitalize text-[var(--color-text-primary)] min-w-[110px] text-center">
            {formatMonth(selectedMonth)}
          </span>
          <button
            onClick={() => shiftMonth(1)}
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
            aria-label="Tháng sau"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* 3 thẻ so sánh tháng này vs tháng trước */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card p-4 space-y-1">
          <p className="text-xs text-[var(--color-text-secondary)]">Tổng thu nhập</p>
          <p className="text-2xl font-800 text-[var(--color-income)] tabular-nums">
            {privacyMode ? "••••• ₫" : formatMoney(report.income)}
          </p>
          <ChangeBadge value={report.incomeChange} />
        </div>

        <div className="card p-4 space-y-1">
          <p className="text-xs text-[var(--color-text-secondary)]">Tổng chi tiêu</p>
          <p className="text-2xl font-800 text-[var(--color-expense)] tabular-nums">
            {privacyMode ? "••••• ₫" : formatMoney(report.expense)}
          </p>
          <ChangeBadge value={report.expenseChange} invert />
        </div>

        <div className="card p-4 space-y-1">
          <p className="text-xs text-[var(--color-text-secondary)]">Dư ròng tháng này</p>
          <p
            className={cn(
              "text-2xl font-800 tabular-nums",
              report.net >= 0 ? "text-[var(--color-accent)]" : "text-[var(--color-expense)]"
            )}
          >
            {privacyMode
              ? "••••• ₫"
              : `${report.net > 0 ? "+" : ""}${formatMoney(report.net)}`}
          </p>
          <p className="text-[11px] text-[var(--color-text-secondary)]">
            {report.savingsRate !== null
              ? `Tỷ lệ để dành: ${Math.round(report.savingsRate)}%`
              : "Chưa có thu nhập"}
          </p>
        </div>
      </div>

      {/* Trợ lý AI đánh giá & nhắc nhở tiết kiệm */}
      <AiCoachCard report={report} selectedMonth={selectedMonth} />

      {/* Lời nhắc ngắn gọn theo quy tắc */}
      <div className="card p-5 space-y-3">
        <h2 className="text-sm font-700 text-[var(--color-text-primary)]">
          Nhận xét nhanh tháng {selectedMonth.slice(5)}
        </h2>
        <div className="space-y-2">
          {report.insights.map((ins) => (
            <div
              key={ins.id}
              className={cn(
                "flex items-start gap-2.5 rounded-[var(--radius-md)] px-3.5 py-2.5 text-xs border",
                ins.level === "warn"
                  ? "bg-[var(--color-expense)]/8 border-[var(--color-expense)]/25 text-[var(--color-text-primary)]"
                  : ins.level === "good"
                  ? "bg-[var(--color-income)]/8 border-[var(--color-income)]/25 text-[var(--color-text-primary)]"
                  : "bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text-secondary)]"
              )}
            >
              {ins.level === "warn" ? (
                <AlertTriangle size={15} className="text-[var(--color-expense)] flex-shrink-0 mt-0.5" />
              ) : ins.level === "good" ? (
                <CheckCircle2 size={15} className="text-[var(--color-income)] flex-shrink-0 mt-0.5" />
              ) : (
                <Info size={15} className="text-[var(--color-accent)] flex-shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{ins.message}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top 3 danh mục tốn nhất */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Award size={17} className="text-[var(--color-accent)]" />
          <h2 className="text-sm font-700 text-[var(--color-text-primary)]">
            Top 3 danh mục tốn nhất
          </h2>
        </div>

        {report.top3.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <BarChart2 size={36} strokeWidth={1.25} className="text-[var(--color-border)] mb-2" />
            <p className="text-xs text-[var(--color-text-secondary)]">
              Chưa có khoản chi nào trong tháng này
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {report.top3.map((cat, idx) => (
              <div key={cat.categoryId} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] text-[11px] font-800 flex items-center justify-center text-[var(--color-accent)] flex-shrink-0">
                      {idx + 1}
                    </span>
                    <CategoryIcon categoryId={cat.categoryId} size={16} />
                    <span className="text-sm font-600 text-[var(--color-text-primary)] truncate">
                      {cat.name}
                    </span>
                    <span className="text-[11px] font-600 text-[var(--color-text-secondary)] tabular-nums">
                      ({Math.round(cat.share)}%)
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-700 tabular-nums text-[var(--color-text-primary)]">
                      {privacyMode ? "••••• ₫" : formatMoney(cat.amount)}
                    </p>
                    <ChangeBadge value={cat.change} invert />
                  </div>
                </div>
                <div className="h-2 rounded-full bg-[var(--color-border)]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${cat.share}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6-month chart (lazy-loaded) */}
      <div className="card p-5">
        <h2 className="text-sm font-700 text-[var(--color-text-primary)] mb-4">
          Xu hướng 6 tháng gần đây
        </h2>
        <SixMonthBarChart data={months6} />
      </div>
    </div>
  );
}
