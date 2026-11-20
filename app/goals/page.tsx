"use client";
import { useState } from "react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useHydrated } from "@/lib/useHydrated";
import { PageSkeleton } from "@/components/ui/skeleton";
import { projectGoal } from "@/lib/goals";
import { formatMoney, formatMoneyShort } from "@/lib/finance";
import { SavingsGoal } from "@/types";
import { GoalModal } from "@/components/goals/goal-modal";
import {
  Target,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  PiggyBank,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

export default function GoalsPage() {
  const hydrated = useHydrated();
  const { goals = [], wallets, contributeGoal, deleteGoal, settings } = useFinanceStore();
  const { privacyMode } = settings;

  const [modalOpen, setModalOpen] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<SavingsGoal | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<SavingsGoal | null>(null);

  // Dialog nạp thêm tiền
  const [contributingGoal, setContributingGoal] = useState<SavingsGoal | null>(null);
  const [contribAmount, setContribAmount] = useState("");
  const [contribWalletId, setContribWalletId] = useState<string>("");

  if (!hydrated) return <PageSkeleton />;

  const totalSaved = goals.reduce((s, g) => s + g.saved, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target, 0);
  const completedCount = goals.filter((g) => g.target > 0 && g.saved >= g.target).length;

  const formatInput = (val: string) => {
    const num = val.replace(/\D/g, "");
    return num ? new Intl.NumberFormat("vi-VN").format(Number(num)) : "";
  };

  const handleContribute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributingGoal) return;
    const num = parseInt(contribAmount.replace(/\D/g, ""), 10);
    if (!num || num <= 0) return;

    contributeGoal(contributingGoal.id, num, contribWalletId || undefined);
    setContributingGoal(null);
    setContribAmount("");
    setContribWalletId("");
  };

  return (
    <div className="pb-24 md:pb-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-800 text-[var(--color-text-primary)]">
            Mục tiêu tiết kiệm
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Theo dõi tiến độ & ngày dự kiến đạt được theo tốc độ tiết kiệm thực tế
          </p>
        </div>

        <button
          onClick={() => {
            setGoalToEdit(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3.5 py-2 text-xs font-600 text-white shadow-sm active:scale-95 transition-transform"
        >
          <Plus size={16} strokeWidth={2} />
          <span>Thêm mục tiêu</span>
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card p-4">
          <p className="text-xs text-[var(--color-text-secondary)] mb-1">Đã tiết kiệm</p>
          <p className="text-2xl font-800 text-[var(--color-accent)] tabular-nums">
            {privacyMode ? "••••• ₫" : formatMoney(totalSaved)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-[var(--color-text-secondary)] mb-1">Tổng mục tiêu</p>
          <p className="text-xl font-700 text-[var(--color-text-primary)] tabular-nums">
            {privacyMode ? "••••• ₫" : formatMoney(totalTarget)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-[var(--color-text-secondary)] mb-1">Hoàn thành</p>
          <p className="text-xl font-700 text-[var(--color-income)] tabular-nums">
            {completedCount} / {goals.length} mục tiêu
          </p>
        </div>
      </div>

      {/* Goal cards */}
      {goals.length === 0 ? (
        <div className="card p-10 flex flex-col items-center text-center">
          <Target size={48} strokeWidth={1.25} className="text-[var(--color-border)] mb-3" />
          <h2 className="text-base font-600 text-[var(--color-text-primary)] mb-1">
            Chưa có mục tiêu tiết kiệm nào
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] mb-4">
            Đặt mục tiêu mua laptop, đi du lịch hoặc quỹ dự phòng để có động lực tiết kiệm
          </p>
          <button
            onClick={() => {
              setGoalToEdit(null);
              setModalOpen(true);
            }}
            className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white text-xs font-600"
          >
            + Tạo mục tiêu đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((g) => {
            const p = projectGoal(g);
            return (
              <div key={g.id} className="card p-5 space-y-4 card-hover">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center text-white flex-shrink-0"
                      style={{ backgroundColor: g.color }}
                    >
                      <PiggyBank size={20} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-700 text-[var(--color-text-primary)] truncate">
                        {g.name}
                      </h3>
                      {g.deadline && (
                        <p className="text-[11px] text-[var(--color-text-secondary)] flex items-center gap-1">
                          <Calendar size={11} />
                          Hạn: {format(new Date(g.deadline), "dd/MM/yyyy", { locale: vi })}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setGoalToEdit(g);
                        setModalOpen(true);
                      }}
                      className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
                      title="Sửa mục tiêu"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setGoalToDelete(g)}
                      className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-expense)] hover:bg-[var(--color-expense)]/10"
                      title="Xóa mục tiêu"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Số tiền & % */}
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-800 text-[var(--color-text-primary)] tabular-nums">
                      {privacyMode ? "••••• ₫" : formatMoney(g.saved)}
                    </span>
                    <span
                      className="text-sm font-800 tabular-nums"
                      style={{ color: p.isComplete ? "var(--color-income)" : g.color }}
                    >
                      {Math.round(p.percent)}%
                    </span>
                  </div>

                  <div className="h-2.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${p.percent}%`,
                        backgroundColor: p.isComplete ? "var(--color-income)" : g.color,
                      }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-[var(--color-text-secondary)] tabular-nums">
                    <span>Mục tiêu: {privacyMode ? "•••••" : formatMoney(g.target)}</span>
                    <span>
                      {p.isComplete
                        ? "Đã hoàn thành!"
                        : `Còn thiếu ${privacyMode ? "•••••" : formatMoney(p.remaining)}`}
                    </span>
                  </div>
                </div>

                {/* Dự báo ngày đạt mục tiêu */}
                <div className="rounded-[var(--radius-md)] bg-[var(--color-bg)] border border-[var(--color-border)] p-3 text-xs space-y-1.5">
                  {p.isComplete ? (
                    <div className="flex items-center gap-1.5 font-600 text-[var(--color-income)]">
                      <CheckCircle2 size={15} />
                      <span>Chúc mừng! Bạn đã đạt mục tiêu này.</span>
                    </div>
                  ) : p.etaDate ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--color-text-secondary)] flex items-center gap-1">
                          <TrendingUp size={13} />
                          Dự kiến đạt vào:
                        </span>
                        <span className="font-700 text-[var(--color-text-primary)] tabular-nums">
                          {format(p.etaDate, "dd/MM/yyyy", { locale: vi })} (~{p.daysToGoal} ngày)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[var(--color-text-secondary)]">Tốc độ hiện tại:</span>
                        <span className="font-600 text-[var(--color-text-primary)] tabular-nums">
                          ~{formatMoneyShort(Math.round(p.monthlyRate))}/tháng
                        </span>
                      </div>
                      {p.onTrack !== null && (
                        <div
                          className={cn(
                            "flex items-center gap-1 text-[11px] font-600 pt-1",
                            p.onTrack ? "text-[var(--color-income)]" : "text-amber-600 dark:text-amber-400"
                          )}
                        >
                          {p.onTrack ? (
                            <>
                              <CheckCircle2 size={12} /> Đúng tiến độ so với hạn mong muốn
                            </>
                          ) : (
                            <>
                              <AlertTriangle size={12} />
                              Cần để dành ~{formatMoneyShort(p.requiredMonthly ?? 0)}/tháng để kịp hạn
                            </>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-[11px] text-[var(--color-text-secondary)]">
                      Chưa có khoản nạp gần đây — nạp thêm để hệ thống tính ngày dự kiến đạt mục tiêu.
                    </p>
                  )}
                </div>

                {/* Action button */}
                {!p.isComplete && (
                  <button
                    onClick={() => {
                      setContributingGoal(g);
                      setContribAmount("");
                      setContribWalletId("");
                    }}
                    className="w-full h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] text-xs font-700 text-[var(--color-text-primary)] transition-colors"
                  >
                    + Nạp thêm vào mục tiêu
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Goal Modal */}
      <GoalModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        goalToEdit={goalToEdit}
      />

      {/* Contribute Dialog */}
      <Dialog.Root
        open={Boolean(contributingGoal)}
        onOpenChange={(o) => !o && setContributingGoal(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed z-50 bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm rounded-t-[var(--radius-xl)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-lg)] md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-[var(--radius-xl)]">
            <Dialog.Title className="text-base font-600 text-[var(--color-text-primary)] mb-1">
              Nạp vào: {contributingGoal?.name}
            </Dialog.Title>
            <Dialog.Description className="text-xs text-[var(--color-text-secondary)] mb-4">
              Cập nhật tiến độ tiết kiệm và tự tính lại ngày dự kiến hoàn thành.
            </Dialog.Description>
            <form onSubmit={handleContribute} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatInput(contribAmount)}
                  onChange={(e) => setContribAmount(e.target.value.replace(/\D/g, ""))}
                  placeholder="Số tiền nạp..."
                  required
                  autoFocus
                  className="w-full h-11 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 pr-8 text-lg font-700 tabular-nums text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-secondary)]">
                  ₫
                </span>
              </div>

              <div>
                <label className="text-[11px] font-500 text-[var(--color-text-secondary)] mb-1 block">
                  Trừ từ ví (tùy chọn)
                </label>
                <select
                  value={contribWalletId}
                  onChange={(e) => setContribWalletId(e.target.value)}
                  className="w-full h-10 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 text-xs text-[var(--color-text-primary)]"
                >
                  <option value="">Chỉ ghi nhận mục tiêu (không trừ ví)</option>
                  {wallets
                    .filter((w) => !w.isLocked)
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({formatMoney(w.balance)})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="flex-1 h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] text-xs font-500"
                  >
                    Hủy
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={!contribAmount}
                  className="flex-1 h-10 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white text-xs font-700 disabled:opacity-50"
                >
                  Xác nhận nạp
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Goal Dialog */}
      <Dialog.Root open={Boolean(goalToDelete)} onOpenChange={(o) => !o && setGoalToDelete(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed z-50 bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm rounded-t-[var(--radius-xl)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-lg)] md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-[var(--radius-xl)]">
            <Dialog.Title className="text-base font-600 text-[var(--color-text-primary)] mb-2">
              Xóa mục tiêu {goalToDelete?.name}?
            </Dialog.Title>
            <Dialog.Description className="text-xs text-[var(--color-text-secondary)] mb-5">
              Xóa thẻ mục tiêu này không làm thay đổi số dư các ví hiện có của bạn.
            </Dialog.Description>
            <div className="flex gap-3">
              <Dialog.Close asChild>
                <button className="flex-1 h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] text-xs font-500">
                  Hủy
                </button>
              </Dialog.Close>
              <button
                onClick={() => {
                  if (goalToDelete) deleteGoal(goalToDelete.id);
                  setGoalToDelete(null);
                }}
                className="flex-1 h-10 rounded-[var(--radius-md)] bg-[var(--color-expense)]/10 text-xs font-600 text-[var(--color-expense)]"
              >
                Xóa
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
