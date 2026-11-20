"use client";
import { useMemo, useState } from "react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useHydrated } from "@/lib/useHydrated";
import { PageSkeleton } from "@/components/ui/skeleton";
import { summarizeDebts } from "@/lib/split";
import { formatDateRelative, formatMoney } from "@/lib/finance";
import { DebtModal } from "@/components/debts/debt-modal";
import { SplitModal } from "@/components/debts/split-modal";
import {
  Users,
  Plus,
  CheckCircle2,
  Undo2,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";

type FilterTab = "open" | "they_owe" | "i_owe" | "settled";

export default function DebtsPage() {
  const hydrated = useHydrated();
  const {
    debts = [],
    splits = [],
    toggleSettleDebt,
    deleteDebt,
    deleteSplitBill,
    settings,
  } = useFinanceStore();
  const { privacyMode } = settings;

  const [tab, setTab] = useState<"debts" | "splits">("debts");
  const [filter, setFilter] = useState<FilterTab>("open");
  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [splitModalOpen, setSplitModalOpen] = useState(false);

  const summary = useMemo(() => summarizeDebts(debts), [debts]);

  const filteredDebts = useMemo(() => {
    return debts.filter((d) => {
      if (filter === "open") return !d.settled;
      if (filter === "settled") return d.settled;
      return !d.settled && d.direction === filter;
    });
  }, [debts, filter]);

  if (!hydrated) return <PageSkeleton />;

  return (
    <div className="pb-24 md:pb-8 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-800 text-[var(--color-text-primary)]">
            Sổ nợ & Chia tiền nhóm
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Ghi ai nợ mình, mình nợ ai & chia hóa đơn đi chơi rõ ràng từng đồng
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSplitModalOpen(true)}
            className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-600 text-[var(--color-text-primary)] hover:border-[var(--color-accent)]"
          >
            <Users size={15} />
            <span>Chia tiền nhóm</span>
          </button>
          <button
            onClick={() => setDebtModalOpen(true)}
            className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3.5 py-2 text-xs font-600 text-white shadow-sm active:scale-95 transition-transform"
          >
            <Plus size={16} strokeWidth={2} />
            <span>Ghi nợ</span>
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card p-4 border-l-4 border-l-[var(--color-income)]">
          <p className="text-xs font-600 text-[var(--color-income)] mb-1 flex items-center gap-1">
            <ArrowDownLeft size={14} /> Họ nợ tôi
          </p>
          <p className="text-2xl font-800 text-[var(--color-income)] tabular-nums">
            {privacyMode ? "••••• ₫" : formatMoney(summary.theyOwe)}
          </p>
        </div>
        <div className="card p-4 border-l-4 border-l-[var(--color-expense)]">
          <p className="text-xs font-600 text-[var(--color-expense)] mb-1 flex items-center gap-1">
            <ArrowUpRight size={14} /> Tôi nợ họ
          </p>
          <p className="text-2xl font-800 text-[var(--color-expense)] tabular-nums">
            {privacyMode ? "••••• ₫" : formatMoney(summary.iOwe)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-500 text-[var(--color-text-secondary)] mb-1">
            Cân đối ròng
          </p>
          <p
            className={cn(
              "text-2xl font-800 tabular-nums",
              summary.net >= 0 ? "text-[var(--color-income)]" : "text-[var(--color-expense)]"
            )}
          >
            {privacyMode
              ? "••••• ₫"
              : `${summary.net > 0 ? "+" : ""}${formatMoney(summary.net)}`}
          </p>
        </div>
      </div>

      {/* Tổng hợp theo từng người */}
      {summary.people.length > 0 && (
        <div className="card p-4 space-y-2.5">
          <h2 className="text-xs font-700 uppercase tracking-wider text-[var(--color-text-secondary)]">
            Tổng hợp theo người (chưa trả)
          </h2>
          <div className="flex flex-wrap gap-2">
            {summary.people.map((p) => (
              <div
                key={p.person}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] text-xs"
              >
                <span className="font-700 text-[var(--color-text-primary)]">{p.person}</span>
                <span
                  className={cn(
                    "font-700 tabular-nums",
                    p.net >= 0 ? "text-[var(--color-income)]" : "text-[var(--color-expense)]"
                  )}
                >
                  {p.net >= 0 ? "nợ bạn " : "bạn nợ "}
                  {privacyMode ? "•••" : formatMoney(Math.abs(p.net))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main section tabs */}
      <div className="flex gap-2 border-b border-[var(--color-border)]">
        <button
          onClick={() => setTab("debts")}
          className={cn(
            "px-4 py-2.5 text-xs font-700 border-b-2 transition-colors",
            tab === "debts"
              ? "border-[var(--color-accent)] text-[var(--color-accent)]"
              : "border-transparent text-[var(--color-text-secondary)]"
          )}
        >
          Sổ nợ ({debts.filter((d) => !d.settled).length} chưa trả)
        </button>
        <button
          onClick={() => setTab("splits")}
          className={cn(
            "px-4 py-2.5 text-xs font-700 border-b-2 transition-colors",
            tab === "splits"
              ? "border-[var(--color-accent)] text-[var(--color-accent)]"
              : "border-transparent text-[var(--color-text-secondary)]"
          )}
        >
          Lịch sử chia nhóm ({splits.length})
        </button>
      </div>

      {tab === "debts" ? (
        <div className="space-y-3">
          {/* Filter pills */}
          <div className="flex gap-1.5 overflow-x-auto text-xs">
            {[
              { id: "open", label: "Chưa trả" },
              { id: "they_owe", label: "Họ nợ tôi" },
              { id: "i_owe", label: "Tôi nợ họ" },
              { id: "settled", label: "Đã trả" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as FilterTab)}
                className={cn(
                  "px-3 py-1.5 rounded-full whitespace-nowrap font-500 transition-colors",
                  filter === f.id
                    ? "bg-[var(--color-accent)] text-white font-600"
                    : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)]"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredDebts.length === 0 ? (
            <div className="card p-8 text-center text-xs text-[var(--color-text-secondary)]">
              Không có khoản nợ nào trong mục này.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredDebts.map((d) => (
                <div
                  key={d.id}
                  className={cn(
                    "card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                    d.settled && "opacity-70"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0",
                        d.direction === "they_owe"
                          ? "bg-[var(--color-income)]/15 text-[var(--color-income)]"
                          : "bg-[var(--color-expense)]/15 text-[var(--color-expense)]"
                      )}
                    >
                      {d.direction === "they_owe" ? (
                        <ArrowDownLeft size={18} />
                      ) : (
                        <ArrowUpRight size={18} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-700 text-[var(--color-text-primary)]">
                          {d.direction === "they_owe"
                            ? `${d.person} nợ bạn`
                            : `Bạn nợ ${d.person}`}
                        </span>
                        {d.settled && (
                          <span className="text-[10px] font-700 px-2 py-0.5 rounded-full bg-[var(--color-income)]/15 text-[var(--color-income)]">
                            Đã trả
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {d.note} · {formatDateRelative(d.date)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <span
                      className={cn(
                        "text-base font-800 tabular-nums",
                        d.direction === "they_owe"
                          ? "text-[var(--color-income)]"
                          : "text-[var(--color-expense)]"
                      )}
                    >
                      {privacyMode ? "••••• ₫" : formatMoney(d.amount)}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => toggleSettleDebt(d.id)}
                        className={cn(
                          "inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-600 transition-colors",
                          d.settled
                            ? "border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                            : "bg-[var(--color-income)] text-white active:scale-95"
                        )}
                      >
                        {d.settled ? (
                          <>
                            <Undo2 size={12} /> Chưa trả
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={13} /> Đã trả
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => deleteDebt(d.id)}
                        className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-expense)] hover:bg-[var(--color-expense)]/10"
                        title="Xóa"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {splits.length === 0 ? (
            <div className="card p-8 flex flex-col items-center text-center">
              <Receipt size={40} strokeWidth={1.25} className="text-[var(--color-border)] mb-3" />
              <p className="text-sm font-600 text-[var(--color-text-primary)] mb-1">
                Chưa có buổi chia tiền nào
              </p>
              <button
                onClick={() => setSplitModalOpen(true)}
                className="mt-2 px-3.5 py-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white text-xs font-600"
              >
                + Chia tiền nhóm ngay
              </button>
            </div>
          ) : (
            splits.map((sp) => (
              <div key={sp.id} className="card p-4 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-700 text-[var(--color-text-primary)]">
                      {sp.title}
                    </h3>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {sp.payer} trả · {sp.mode === "equal" ? "Chia đều" : "Chia theo món"} ·{" "}
                      {formatDateRelative(sp.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-800 text-[var(--color-accent)] tabular-nums">
                      {privacyMode ? "••••• ₫" : formatMoney(sp.total)}
                    </span>
                    <button
                      onClick={() => deleteSplitBill(sp.id)}
                      className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-expense)] hover:bg-[var(--color-expense)]/10"
                      title="Xóa hóa đơn chia nhóm"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1 border-t border-[var(--color-border)]/50 text-xs">
                  {Object.entries(sp.shares).map(([member, amt]) => (
                    <span
                      key={member}
                      className="px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--color-bg)] text-[var(--color-text-secondary)]"
                    >
                      <strong className="text-[var(--color-text-primary)]">{member}:</strong>{" "}
                      <span className="tabular-nums">
                        {privacyMode ? "•••" : formatMoney(amt)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <DebtModal open={debtModalOpen} onClose={() => setDebtModalOpen(false)} />
      <SplitModal open={splitModalOpen} onClose={() => setSplitModalOpen(false)} />
    </div>
  );
}
