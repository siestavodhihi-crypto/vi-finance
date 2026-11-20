"use client";
import { useMemo } from "react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useHydrated } from "@/lib/useHydrated";
import { PageSkeleton } from "@/components/ui/skeleton";
import {
  filterByMonth,
  getCurrentMonth,
  getTotalIncome,
  getTotalExpense,
  getCategoryStats,
  formatMoney,
  formatMoneyShort,
} from "@/lib/finance";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { BarChart2 } from "lucide-react";

export default function ReportsPage() {
  const hydrated = useHydrated();
  const { transactions } = useFinanceStore();

  const months = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const txs = filterByMonth(transactions, key);
      result.push({
        month: key,
        label: `T${d.getMonth() + 1}`,
        income: getTotalIncome(txs),
        expense: getTotalExpense(txs),
      });
    }
    return result;
  }, [transactions]);

  const thisMonthTxs = useMemo(
    () => filterByMonth(transactions, getCurrentMonth()),
    [transactions]
  );
  const catStats = useMemo(() => getCategoryStats(thisMonthTxs, "expense"), [thisMonthTxs]);

  if (!hydrated) {
    return <PageSkeleton />;
  }

  return (
    <div className="pb-24 md:pb-8 space-y-5">
      <h1 className="text-xl font-700 text-[var(--color-text-primary)]">Báo cáo</h1>

      {/* 6-month chart */}
      <div className="card p-5">
        <h2 className="text-sm font-600 text-[var(--color-text-primary)] mb-4">
          6 tháng gần đây
        </h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={months} barGap={4} margin={{ left: -20 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatMoneyShort(v)}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 shadow-[var(--shadow-md)] text-xs space-y-1">
                      <p className="font-600">{label}</p>
                      {payload.map((p) => (
                        <p key={p.dataKey as string} style={{ color: p.color }}>
                          {p.name === "income" ? "Thu: " : "Chi: "}
                          {formatMoney(p.value as number)}
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Bar dataKey="income" name="income" fill="var(--color-income)" radius={[3, 3, 0, 0]} maxBarSize={22} />
              <Bar dataKey="expense" name="expense" fill="var(--color-expense)" radius={[3, 3, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top categories */}
      <div className="card p-5">
        <h2 className="text-sm font-600 text-[var(--color-text-primary)] mb-4">
          Chi tiêu theo danh mục (tháng này)
        </h2>
        {catStats.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <BarChart2 size={40} strokeWidth={1.25} className="text-[var(--color-border)] mb-3" />
            <p className="text-sm text-[var(--color-text-secondary)]">Chưa có dữ liệu</p>
          </div>
        ) : (
          <div className="space-y-3">
            {catStats.map((s) => (
              <div key={s.categoryId}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-500 text-[var(--color-text-primary)]">{s.name}</span>
                  <span className="tabular-nums text-[var(--color-text-secondary)]">
                    {formatMoney(s.amount)} · {s.percentage}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--color-border)]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${s.percentage}%`, backgroundColor: s.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
