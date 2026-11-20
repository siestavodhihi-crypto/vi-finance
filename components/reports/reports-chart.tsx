"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatMoney, formatMoneyShort } from "@/lib/finance";

export interface MonthlyTrendPoint {
  month: string;
  label: string;
  income: number;
  expense: number;
}

export function SixMonthBarChart({ data }: { data: MonthlyTrendPoint[] }) {
  return (
    <div className="h-48" role="img" aria-label="Biểu đồ thu chi 6 tháng gần đây">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={4} margin={{ left: -20 }}>
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
  );
}
