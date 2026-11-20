"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X, PieChart } from "lucide-react";
import { useState } from "react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { Budget, CategoryId } from "@/types";
import { cn } from "@/lib/utils";

interface BudgetModalProps {
  open: boolean;
  onClose: () => void;
  budgetToEdit?: Budget | null;
  currentMonth: string;
}

export function BudgetModal(props: BudgetModalProps) {
  if (!props.open) return null;
  return <BudgetModalInner key={props.budgetToEdit?.id ?? "new"} {...props} />;
}

function BudgetModalInner({
  open,
  onClose,
  budgetToEdit,
  currentMonth,
}: BudgetModalProps) {
  const { budgets, addBudget, updateBudget } = useFinanceStore();

  const existingCategoryIds = budgets
    .filter((b) => b.month === currentMonth && (!budgetToEdit || b.id !== budgetToEdit.id))
    .map((b) => b.categoryId);

  const availableCategories = EXPENSE_CATEGORIES.filter(
    (c) => !existingCategoryIds.includes(c.id)
  );

  const [categoryId, setCategoryId] = useState<CategoryId>(
    budgetToEdit?.categoryId ?? availableCategories[0]?.id ?? "food"
  );
  const [limit, setLimit] = useState(budgetToEdit ? String(budgetToEdit.limit) : "");

  const formatInput = (val: string) => {
    const num = val.replace(/\D/g, "");
    if (!num) return "";
    return new Intl.NumberFormat("vi-VN").format(Number(num));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numLimit = parseInt(limit.replace(/\D/g, ""), 10);
    if (!numLimit || numLimit <= 0) return;

    if (budgetToEdit) {
      updateBudget(budgetToEdit.id, numLimit);
    } else {
      addBudget({
        categoryId,
        limit: numLimit,
        month: currentMonth,
      });
    }

    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed z-50 bg-[var(--color-surface)] shadow-[var(--shadow-lg)]",
            "left-1/2 -translate-x-1/2",
            "bottom-0 w-full rounded-t-[var(--radius-xl)] md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:w-full md:max-w-md md:rounded-[var(--radius-xl)]",
            "p-5 space-y-4 max-h-[90dvh] overflow-y-auto"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/15 flex items-center justify-center text-[var(--color-accent)]">
                <PieChart size={18} strokeWidth={2} />
              </div>
              <Dialog.Title className="text-base font-600 text-[var(--color-text-primary)]">
                {budgetToEdit ? "Sửa ngân sách" : "Đặt ngân sách mới"}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="rounded-[var(--radius-sm)] p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]">
                <X size={18} strokeWidth={1.75} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                Danh mục chi tiêu
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value as CategoryId)}
                disabled={Boolean(budgetToEdit)}
                className="w-full h-11 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] disabled:opacity-70"
              >
                {(budgetToEdit ? EXPENSE_CATEGORIES : availableCategories).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                Hạn mức ngân sách tháng
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatInput(limit)}
                  onChange={(e) => setLimit(e.target.value.replace(/\D/g, ""))}
                  placeholder="0"
                  required
                  className="w-full h-11 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 pr-8 text-xl font-700 text-[var(--color-text-primary)] tabular-nums focus:outline-none focus:border-[var(--color-accent)]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-secondary)]">
                  ₫
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-text-secondary)] mt-1.5">
                💡 Thanh tiến độ sẽ chuyển sang <strong className="text-amber-500">màu vàng ở mức 80%</strong> và <strong className="text-[var(--color-expense)]">màu đỏ khi vượt 100%</strong>.
              </p>
            </div>

            <button
              type="submit"
              disabled={!limit}
              className="w-full h-11 rounded-[var(--radius-md)] bg-[var(--color-accent)] font-600 text-white transition-all active:scale-[0.97] disabled:opacity-50"
            >
              {budgetToEdit ? "Lưu thay đổi" : "Tạo ngân sách"}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
