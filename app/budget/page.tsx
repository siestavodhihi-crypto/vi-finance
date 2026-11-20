"use client";
import { useMemo, useState } from "react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useHydrated } from "@/lib/useHydrated";
import { PageSkeleton } from "@/components/ui/skeleton";
import {
  filterByMonth,
  getCurrentMonth,
  formatMoney,
  getBudgetProgress,
} from "@/lib/finance";
import { CATEGORIES, EXPENSE_CATEGORIES } from "@/lib/constants";
import { CategoryIcon } from "@/components/transactions/category-icon";
import { BudgetModal } from "@/components/budget/budget-modal";
import { Budget } from "@/types";
import { cn } from "@/lib/utils";
import {
  PieChart,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

export default function BudgetPage() {
  const hydrated = useHydrated();
  const { transactions, budgets, deleteBudget, settings } = useFinanceStore();
  const { privacyMode } = settings;

  const [modalOpen, setModalOpen] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState<Budget | null>(null);
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);

  const currentMonth = getCurrentMonth();
  const monthTxs = useMemo(
    () => filterByMonth(transactions, currentMonth),
    [transactions, currentMonth]
  );

  const totalBudgetLimit = budgets.reduce((sum, b) => sum + b.limit, 0);
  const totalBudgetSpent = budgets.reduce((sum, b) => {
    const { spent } = getBudgetProgress(b, monthTxs);
    return sum + spent;
  }, 0);

  const overallPct = totalBudgetLimit > 0 ? (totalBudgetSpent / totalBudgetLimit) * 100 : 0;

  const handleEdit = (b: Budget) => {
    setBudgetToEdit(b);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setBudgetToEdit(null);
    setModalOpen(true);
  };

  if (!hydrated) {
    return <PageSkeleton />;
  }

  return (
    <div className="pb-24 md:pb-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-800 text-[var(--color-text-primary)]">
            Ngân sách tháng {currentMonth.slice(5)}
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Thiết lập hạn mức chi tiêu để kiểm soát tài chính
          </p>
        </div>

        <button
          onClick={handleCreate}
          className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3.5 py-2 text-xs font-600 text-white shadow-sm active:scale-95 transition-transform"
        >
          <Plus size={16} strokeWidth={2} />
          <span>Đặt ngân sách</span>
        </button>
      </div>

      {/* Overview Card */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-600 text-[var(--color-text-secondary)] uppercase tracking-wider">
            Tổng ngân sách đã đặt
          </p>
          <span
            className={cn(
              "text-xs font-700 px-2 py-0.5 rounded-[var(--radius-sm)]",
              overallPct > 100
                ? "bg-[var(--color-expense)]/15 text-[var(--color-expense)]"
                : overallPct >= 80
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400"
                : "bg-[var(--color-income)]/15 text-[var(--color-income)]"
            )}
          >
            {Math.round(overallPct)}% đã dùng
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-800 text-[var(--color-text-primary)] tabular-nums">
            {privacyMode ? "••••• ₫" : formatMoney(totalBudgetSpent)}
            <span className="text-sm font-500 text-[var(--color-text-secondary)] ml-1">
              / {privacyMode ? "•••••" : formatMoney(totalBudgetLimit)}
            </span>
          </div>

          <span className="text-xs text-[var(--color-text-secondary)]">
            {totalBudgetLimit >= totalBudgetSpent ? (
              <span>Còn lại {formatMoney(totalBudgetLimit - totalBudgetSpent)}</span>
            ) : (
              <span className="text-[var(--color-expense)] font-600">
                Vượt {formatMoney(totalBudgetSpent - totalBudgetLimit)}!
              </span>
            )}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2.5 rounded-full bg-[var(--color-border)]">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              overallPct > 100
                ? "bg-[var(--color-expense)]"
                : overallPct >= 80
                ? "bg-amber-500"
                : "bg-[var(--color-income)]"
            )}
            style={{ width: `${Math.min(overallPct, 100)}%` }}
          />
        </div>

        <div className="flex items-center gap-4 text-[11px] text-[var(--color-text-secondary)] pt-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--color-income)]" />
            &lt; 80%: An toàn
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            80% - 100%: Cảnh báo vàng
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--color-expense)]" />
            &gt; 100%: Báo động đỏ
          </span>
        </div>
      </div>

      {/* Budget Item List */}
      {budgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center p-8 card">
          <PieChart size={48} strokeWidth={1.25} className="text-[var(--color-border)] mb-3" />
          <h2 className="text-base font-600 text-[var(--color-text-primary)] mb-1">
            Chưa có danh mục ngân sách nào
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] mb-4">
            Đặt ngân sách cho ăn uống, đi lại, mua sắm để không tiêu lẹm
          </p>
          <button
            onClick={handleCreate}
            className="px-3.5 py-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white text-xs font-600 shadow-sm"
          >
            + Đặt ngân sách đầu tiên
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map((budget) => {
            const { spent, remaining, percentage, isOver, status, barColor } =
              getBudgetProgress(budget, monthTxs);
            const cat = CATEGORIES[budget.categoryId];

            return (
              <div
                key={budget.id}
                className={cn(
                  "card p-4 space-y-3 card-hover transition-all",
                  status === "danger"
                    ? "border-l-4 border-l-[var(--color-expense)]"
                    : status === "warning"
                    ? "border-l-4 border-l-amber-500"
                    : "border-l-4 border-l-[var(--color-income)]"
                )}
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-[var(--radius-md)] flex items-center justify-center"
                      style={{ backgroundColor: `${cat?.color ?? "#8A8780"}20` }}
                    >
                      <CategoryIcon
                        categoryId={budget.categoryId}
                        size={20}
                        strokeWidth={1.75}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-700 text-[var(--color-text-primary)]">
                          {cat?.name}
                        </h3>
                        {status === "danger" && (
                          <span className="flex items-center gap-1 text-[10px] font-700 text-[var(--color-expense)] bg-[var(--color-expense)]/10 px-2 py-0.5 rounded-full">
                            <AlertCircle size={10} /> Đã vượt 100%
                          </span>
                        )}
                        {status === "warning" && (
                          <span className="flex items-center gap-1 text-[10px] font-700 text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full">
                            <AlertTriangle size={10} /> Chạm 80%
                          </span>
                        )}
                        {status === "normal" && (
                          <span className="flex items-center gap-1 text-[10px] font-600 text-[var(--color-income)] bg-[var(--color-income)]/10 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={10} /> An toàn
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        Đã tiêu {privacyMode ? "•••••" : formatMoney(spent)} / Hạn mức{" "}
                        {privacyMode ? "•••••" : formatMoney(budget.limit)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(budget)}
                      className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
                      title="Sửa hạn mức"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setBudgetToDelete(budget)}
                      className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-expense)] hover:bg-[var(--color-expense)]/10"
                      title="Xóa ngân sách"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="h-2.5 rounded-full bg-[var(--color-border)]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        status === "danger"
                          ? "bg-[var(--color-expense)]"
                          : status === "warning"
                          ? "bg-amber-500"
                          : "bg-[var(--color-income)]"
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="font-600 tabular-nums text-[var(--color-text-primary)]">
                      {Math.round((spent / budget.limit) * 100)}%
                    </span>
                    <span
                      className={cn(
                        "font-600 tabular-nums",
                        isOver ? "text-[var(--color-expense)]" : "text-[var(--color-income)]"
                      )}
                    >
                      {isOver
                        ? `Vượt quá ${formatMoney(Math.abs(remaining))}`
                        : `Còn lại ${formatMoney(remaining)}`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <BudgetModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        budgetToEdit={budgetToEdit}
        currentMonth={currentMonth}
      />

      {/* Confirm Delete Dialog */}
      <Dialog.Root open={Boolean(budgetToDelete)} onOpenChange={(o) => !o && setBudgetToDelete(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed z-50 bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm rounded-t-[var(--radius-xl)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-lg)] md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-[var(--radius-xl)]">
            <Dialog.Title className="text-base font-600 text-[var(--color-text-primary)] mb-2">
              Xóa ngân sách {budgetToDelete && CATEGORIES[budgetToDelete.categoryId]?.name}?
            </Dialog.Title>
            <Dialog.Description className="text-xs text-[var(--color-text-secondary)] mb-5">
              Hạn mức {budgetToDelete && formatMoney(budgetToDelete.limit)} sẽ bị xóa. Lịch sử giao dịch không bị ảnh hưởng.
            </Dialog.Description>
            <div className="flex gap-3">
              <Dialog.Close asChild>
                <button className="flex-1 h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] text-xs font-500 text-[var(--color-text-primary)] hover:bg-[var(--color-border)]">
                  Hủy
                </button>
              </Dialog.Close>
              <button
                onClick={() => {
                  if (budgetToDelete) deleteBudget(budgetToDelete.id);
                  setBudgetToDelete(null);
                }}
                className="flex-1 h-10 rounded-[var(--radius-md)] bg-[var(--color-expense)]/10 text-xs font-600 text-[var(--color-expense)] hover:bg-[var(--color-expense)]/20"
              >
                Xóa ngân sách
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
