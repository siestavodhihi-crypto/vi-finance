"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/constants";
import { TransactionType, CategoryId } from "@/types";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";
import { CategoryIcon } from "@/components/transactions/category-icon";

interface AddTransactionModalProps {
  open: boolean;
  onClose: () => void;
  defaultType?: TransactionType;
}

export function AddTransactionModal({
  open,
  onClose,
  defaultType = "expense",
}: AddTransactionModalProps) {
  const { wallets, addTransaction } = useFinanceStore();
  const [type, setType] = useState<"income" | "expense">(
    defaultType === "transfer" ? "expense" : defaultType
  );
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<CategoryId>("food");
  const [walletId, setWalletId] = useState(wallets[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setDate(new Date().toISOString().slice(0, 10));
    }
  }, [open]);

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseInt(amount.replace(/\D/g, ""), 10);
    if (!numAmount || numAmount <= 0) return;
    setSubmitting(true);
    addTransaction({
      type,
      amount: numAmount,
      categoryId,
      walletId,
      note,
      date: `${date}T${new Date().toTimeString().slice(0, 8)}`,
    });
    // Reset
    setAmount("");
    setNote("");
    setSubmitting(false);
    onClose();
  };

  const formatInput = (val: string) => {
    const num = val.replace(/\D/g, "");
    if (!num) return "";
    return new Intl.NumberFormat("vi-VN").format(Number(num));
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <Dialog.Content
          className={cn(
            "fixed z-50 bg-[var(--color-surface)] shadow-[var(--shadow-lg)]",
            "left-1/2 -translate-x-1/2",
            "bottom-0 w-full rounded-t-[var(--radius-xl)] md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:w-full md:max-w-md md:rounded-[var(--radius-xl)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
            "data-[state=open]:duration-220 data-[state=closed]:duration-180",
            "max-h-[90dvh] overflow-y-auto"
          )}
        >
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <Dialog.Title className="text-base font-600 text-[var(--color-text-primary)]">
                Thêm giao dịch
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-[var(--radius-sm)] p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] transition-colors">
                  <X size={18} strokeWidth={1.75} />
                </button>
              </Dialog.Close>
            </div>

            {/* Type toggle */}
            <div className="flex gap-2 rounded-[var(--radius-md)] bg-[var(--color-bg)] p-1">
              {(["expense", "income"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setType(t);
                    setCategoryId(t === "income" ? "family" : "food");
                  }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 rounded-[var(--radius-sm)] py-2 text-sm font-500 transition-all duration-150",
                    type === t
                      ? t === "expense"
                        ? "bg-[var(--color-expense)] text-white shadow-sm"
                        : "bg-[var(--color-income)] text-white shadow-sm"
                      : "text-[var(--color-text-secondary)]"
                  )}
                >
                  {t === "expense" ? (
                    <ArrowDownCircle size={16} strokeWidth={1.75} />
                  ) : (
                    <ArrowUpCircle size={16} strokeWidth={1.75} />
                  )}
                  {t === "expense" ? "Chi tiêu" : "Thu nhập"}
                </button>
              ))}
            </div>

            {/* Amount */}
            <div>
              <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                Số tiền
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatInput(amount)}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                  placeholder="0"
                  required
                  className={cn(
                    "w-full h-11 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)]",
                    "px-3 pr-8 text-xl font-700 text-[var(--color-text-primary)] tabular-nums",
                    "placeholder:text-[var(--color-text-secondary)]/50 focus:outline-none focus:border-[var(--color-accent)] focus:shadow-[var(--shadow-focus)]",
                    "transition-all duration-150"
                  )}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-secondary)]">
                  ₫
                </span>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-2 block">
                Danh mục
              </label>
              <div className="grid grid-cols-4 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-[var(--radius-md)] p-2 text-xs transition-all duration-150",
                      categoryId === cat.id
                        ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)] ring-1 ring-[var(--color-accent)]"
                        : "bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
                    )}
                  >
                    <CategoryIcon categoryId={cat.id} size={18} />
                    <span className="text-[10px] text-center leading-tight">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                Ghi chú
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Mô tả giao dịch..."
                className={cn(
                  "w-full h-11 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)]",
                  "px-3 text-sm text-[var(--color-text-primary)]",
                  "placeholder:text-[var(--color-text-secondary)]/50 focus:outline-none focus:border-[var(--color-accent)] focus:shadow-[var(--shadow-focus)]",
                  "transition-all duration-150"
                )}
              />
            </div>

            {/* Date & Wallet row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                  Ngày
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={cn(
                    "w-full h-11 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)]",
                    "px-3 text-sm text-[var(--color-text-primary)]",
                    "focus:outline-none focus:border-[var(--color-accent)] focus:shadow-[var(--shadow-focus)]",
                    "transition-all duration-150"
                  )}
                />
              </div>
              <div>
                <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                  Ví
                </label>
                <select
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  className={cn(
                    "w-full h-11 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)]",
                    "px-3 text-sm text-[var(--color-text-primary)]",
                    "focus:outline-none focus:border-[var(--color-accent)] focus:shadow-[var(--shadow-focus)]",
                    "transition-all duration-150"
                  )}
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !amount}
              className={cn(
                "w-full h-11 rounded-[var(--radius-md)] bg-[var(--color-accent)] font-600 text-white",
                "transition-all duration-100 active:scale-[0.97]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {submitting ? "Đang lưu..." : "Lưu giao dịch"}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
