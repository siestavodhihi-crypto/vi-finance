"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { CategoryStat, DailyTotal } from "@/types";
import { formatMoney, formatMoneyShort } from "@/lib/finance";

export function Last14DaysBarChart({ data }: { data: DailyTotal[] }) {
  return (
    <div className="h-44" role="img" aria-label="Biểu đồ dòng tiền 14 ngày gần nhất">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={2} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }}
            tickLine={false}
            axisLine={false}
            interval={2}
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
                <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 shadow-[var(--shadow-md)] text-xs">
                  <p className="font-600 text-[var(--color-text-primary)] mb-1">{label}</p>
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
          <Bar dataKey="income" name="income" fill="var(--color-income)" radius={[3, 3, 0, 0]} maxBarSize={16} />
          <Bar dataKey="expense" name="expense" fill="var(--color-expense)" radius={[3, 3, 0, 0]} maxBarSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryDonutChart({
  data,
  privacyMode,
}: {
  data: CategoryStat[];
  privacyMode: boolean;
}) {
  return (
    <div className="h-52" role="img" aria-label="Biểu đồ tròn phân bổ chi tiêu theo danh mục">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="40%"
            cy="50%"
            innerRadius={55}
            outerRadius={75}
            paddingAngle={2}
            dataKey="amount"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            content={() => (
              <ul className="space-y-1.5 text-xs max-h-48 overflow-y-auto pr-1">
                {data.slice(0, 6).map((s) => (
                  <li key={s.categoryId} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <span className="text-[var(--color-text-secondary)] truncate max-w-[85px]">{s.name}</span>
                    <span className="font-600 text-[var(--color-text-primary)] tabular-nums ml-auto">
                      {privacyMode ? "••" : `${s.percentage}%`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
