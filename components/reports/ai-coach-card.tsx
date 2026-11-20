"use client";
import { useState } from "react";
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  BellRing,
} from "lucide-react";
import { useFinanceStore } from "@/store/useFinanceStore";
import {
  filterByMonth,
  getBudgetProgress,
  getSafeToSpendDetail,
} from "@/lib/finance";
import { MonthlyReport } from "@/lib/monthly-report";
import { CATEGORIES } from "@/lib/constants";
import { projectGoal } from "@/lib/goals";
import { AiCoachAdvice, AiCoachInput } from "@/lib/ai-coach";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface AiCoachCardProps {
  report: MonthlyReport;
  selectedMonth: string;
}

export function AiCoachCard({ report, selectedMonth }: AiCoachCardProps) {
  const { transactions, wallets, budgets, recurringBills, goals, settings } =
    useFinanceStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advice, setAdvice] = useState<AiCoachAdvice | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);

    try {
      const safe = getSafeToSpendDetail({
        wallets,
        recurringBills,
        extraLockedSavings: settings.lockedSavings,
        currentMonth: selectedMonth,
      });

      const monthTxs = filterByMonth(transactions, selectedMonth);

      const payload: AiCoachInput = {
        month: selectedMonth,
        income: report.income,
        expense: report.expense,
        prevIncome: report.prevIncome,
        prevExpense: report.prevExpense,
        safeToSpendDaily: Math.max(0, safe.dailyAmount),
        daysRemaining: safe.daysRemaining,
        availableBalance: safe.availableBalance,
        lockedSavings: safe.lockedSavings,
        unpaidBills: safe.unpaidBills,
        topCategories: report.top3.map((c) => ({
          name: c.name,
          amount: c.amount,
          share: Math.min(100, Math.max(0, c.share)),
        })),
        budgets: budgets
          .filter((b) => b.month === selectedMonth)
          .slice(0, 10)
          .map((b) => {
            const p = getBudgetProgress(b, monthTxs);
            return {
              name: CATEGORIES[b.categoryId]?.name ?? b.categoryId,
              spent: p.spent,
              limit: b.limit,
              percentage: p.percentage,
            };
          }),
        goals: goals.slice(0, 6).map((g) => {
          const p = projectGoal(g);
          return {
            name: g.name,
            saved: g.saved,
            target: g.target,
            percent: p.percent,
          };
        }),
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const sb = getSupabaseClient();
      if (sb) {
        const { data } = await sb.auth.getSession();
        if (data.session?.access_token) {
          headers["Authorization"] = `Bearer ${data.session.access_token}`;
        }
      }

      const res = await fetch("/api/ai-coach", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setError(json.error || "Không thể phân tích lúc này. Vui lòng thử lại.");
        return;
      }

      setAdvice(json.data as AiCoachAdvice);
    } catch {
      setError("Lỗi mạng khi gọi Trợ lý AI. Kiểm tra kết nối và thử lại nhé.");
    } finally {
      setLoading(false);
    }
  };

  const scoreTone =
    !advice
      ? ""
      : advice.score >= 75
      ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-text)]"
      : advice.score >= 50
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
      : "bg-[var(--color-expense)]/12 text-[var(--color-expense)]";

  return (
    <div className="card p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-accent-soft)] text-[var(--color-accent-text)] flex items-center justify-center flex-shrink-0">
            <Sparkles size={18} strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-sm font-700 text-[var(--color-text-primary)]">
              Trợ lý AI đánh giá chi tiêu
            </h2>
            <p className="text-[11px] text-[var(--color-text-secondary)]">
              Chấm điểm, nhận xét tiến trình & gợi ý tiết kiệm riêng cho bạn
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={loading}
          className="min-h-[44px] md:min-h-0 inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-xs font-700 text-[var(--color-accent-fg)] active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              <span>Đang phân tích...</span>
            </>
          ) : advice ? (
            <>
              <RefreshCw size={14} />
              <span>Phân tích lại</span>
            </>
          ) : (
            <>
              <Sparkles size={14} />
              <span>Nhờ AI đánh giá</span>
            </>
          )}
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3 pt-1">
          <Skeleton className="h-14 w-full rounded-[var(--radius-md)]" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Skeleton className="h-24 w-full rounded-[var(--radius-md)]" />
            <Skeleton className="h-24 w-full rounded-[var(--radius-md)]" />
          </div>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-expense)]/30 bg-[var(--color-expense)]/8 p-3.5 text-xs text-[var(--color-expense)] flex items-start gap-2">
          <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty prompt state */}
      {!loading && !error && !advice && (
        <p className="text-xs text-[var(--color-text-secondary)] rounded-[var(--radius-md)] bg-[var(--color-bg)] px-3.5 py-3">
          Bấm <strong>&ldquo;Nhờ AI đánh giá&rdquo;</strong> để AI chấm điểm sức khỏe tài chính tháng{" "}
          <strong>{selectedMonth.slice(5)}</strong>, chỉ ra điểm tốt, nguy cơ cháy túi và gợi ý cách tiết kiệm phù hợp với sinh viên.
        </p>
      )}

      {/* AI Advice Result */}
      {!loading && advice && (
        <div className="space-y-4">
          {/* Score + Headline */}
          <div className="flex items-center gap-4 rounded-[var(--radius-md)] bg-[var(--color-bg)] p-4 border border-[var(--color-border)]">
            <div
              className={cn(
                "w-14 h-14 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 font-800 tabular-nums",
                scoreTone
              )}
            >
              <span className="text-xl leading-none">{advice.score}</span>
              <span className="text-[10px] font-600 opacity-80">/100</span>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-600 uppercase tracking-wider text-[var(--color-text-secondary)]">
                Điểm sức khỏe tài chính
              </p>
              <p className="text-sm font-700 text-[var(--color-text-primary)] leading-snug mt-0.5">
                {advice.headline}
              </p>
            </div>
          </div>

          {/* Strengths & Warnings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {advice.strengths.length > 0 && (
              <div className="rounded-[var(--radius-md)] bg-[var(--color-accent-soft)]/60 border border-[var(--color-accent)]/20 p-3.5 space-y-2">
                <p className="font-700 text-[var(--color-accent-text)] flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> Bạn đang làm tốt
                </p>
                <ul className="space-y-1.5 text-[var(--color-text-primary)]">
                  {advice.strengths.map((s, i) => (
                    <li key={i} className="leading-relaxed">
                      • {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {advice.warnings.length > 0 && (
              <div className="rounded-[var(--radius-md)] bg-[var(--color-expense)]/8 border border-[var(--color-expense)]/20 p-3.5 space-y-2">
                <p className="font-700 text-[var(--color-expense)] flex items-center gap-1.5">
                  <AlertTriangle size={14} /> Cần chú ý
                </p>
                <ul className="space-y-1.5 text-[var(--color-text-primary)]">
                  {advice.warnings.map((w, i) => (
                    <li key={i} className="leading-relaxed">
                      • {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Action tips */}
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 space-y-2 text-xs">
            <p className="font-700 text-[var(--color-text-primary)] flex items-center gap-1.5">
              <Lightbulb size={14} className="text-[var(--color-warning)]" /> Gợi ý tiết kiệm tuần này
            </p>
            <ul className="space-y-1.5 text-[var(--color-text-secondary)]">
              {advice.action_tips.map((tip, i) => (
                <li key={i} className="leading-relaxed">
                  {i + 1}. {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Daily reminder */}
          <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] bg-[var(--color-hero-bg)] text-[var(--color-hero-fg)] px-4 py-3 text-xs">
            <BellRing size={15} className="text-emerald-300 flex-shrink-0" />
            <p className="font-500 leading-relaxed">
              <strong>Nhắc nhẹ hôm nay:</strong> {advice.daily_reminder}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
