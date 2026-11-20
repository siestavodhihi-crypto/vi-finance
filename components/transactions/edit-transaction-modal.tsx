"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ArrowUpCircle, ArrowDownCircle, ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/constants";
import { getVietnamDateString } from "@/lib/finance";
import { Transaction, TransactionType, CategoryId } from "@/types";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/components/transactions/category-icon";

interface EditTransactionModalProps {
  transaction: Transaction | null;
  open: boolean;
  onClose: () => void;
}

export function EditTransactionModal(props: EditTransactionModalProps) {
  if (!props.open || !props.transaction) return null;
  return (
    <EditTransactionModalInner
      key={props.transaction.id}
      transaction={props.transaction}
      open={props.open}
      onClose={props.onClose}
    />
  );
}

function EditTransactionModalInner({
  transaction,
  open,
  onClose,
}: {
  transaction: Transaction;
  open: boolean;
  onClose: () => void;
}) {
  const { wallets, updateTransaction } = useFinanceStore();

  const [type, setType] = useState<TransactionType>(transaction.type);
  const [amount, setAmount] = useState(String(transaction.amount));
  const [categoryId, setCategoryId] = useState<CategoryId>(transaction.categoryId);
  const [walletId, setWalletId] = useState(transaction.walletId);
  const [toWalletId, setToWalletId] = useState(transaction.toWalletId || "");
  const [note, setNote] = useState(transaction.note || "");
  const [date, setDate] = useState(
    transaction.date ? transaction.date.slice(0, 10) : getVietnamDateString()
  );

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const formatInput = (val: string) => {
    const num = val.replace(/\D/g, "");
    if (!num) return "";
    return new Intl.NumberFormat("vi-VN").format(Number(num));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;
    const numAmount = parseInt(amount.replace(/\D/g, ""), 10);
    if (!numAmount || numAmount <= 0) return;

    updateTransaction(transaction.id, {
      type,
      amount: numAmount,
      categoryId,
      walletId,
      toWalletId: type === "transfer" ? toWalletId : undefined,
      note: note.trim(),
      date: `${date}T${transaction.date?.slice(11, 19) || "12:00:00"}`,
    });

    onClose();
  };

  if (!transaction) return null;

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
            <Dialog.Title className="text-base font-600 text-[var(--color-text-primary)]">
              Sửa giao dịch
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-[var(--radius-sm)] p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]">
                <X size={18} strokeWidth={1.75} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type toggle */}
            <div className="flex gap-2 rounded-[var(--radius-md)] bg-[var(--color-bg)] p-1">
              {(["expense", "income", "transfer"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setType(t);
                    if (t === "income") setCategoryId("salary");
                    else if (t === "expense") setCategoryId("food");
                    else setCategoryId("savings");
                  }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] py-1.5 text-xs font-500 transition-all",
                    type === t
                      ? t === "expense"
                        ? "bg-[var(--color-expense)] text-white shadow-sm"
                        : t === "income"
                        ? "bg-[var(--color-income)] text-white shadow-sm"
                        : "bg-[var(--color-accent)] text-white shadow-sm"
                      : "text-[var(--color-text-secondary)]"
                  )}
                >
                  {t === "expense" ? (
                    <ArrowDownCircle size={14} />
                  ) : t === "income" ? (
                    <ArrowUpCircle size={14} />
                  ) : (
                    <ArrowLeftRight size={14} />
                  )}
                  {t === "expense" ? "Chi" : t === "income" ? "Thu" : "Chuyển"}
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
                  className="w-full h-11 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 pr-8 text-xl font-700 text-[var(--color-text-primary)] tabular-nums focus:outline-none focus:border-[var(--color-accent)]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-secondary)]">
                  ₫
                </span>
              </div>
            </div>

            {/* Category (if not transfer) */}
            {type !== "transfer" && (
              <div>
                <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-2 block">
                  Danh mục
                </label>
                <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-[var(--radius-md)] p-2 text-xs transition-all",
                        categoryId === cat.id
                          ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)] ring-1 ring-[var(--color-accent)]"
                          : "bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
                      )}
                    >
                      <CategoryIcon categoryId={cat.id} size={16} />
                      <span className="text-[10px] text-center leading-tight truncate w-full">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Wallet Selection */}
            {type === "transfer" ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                    Từ ví
                  </label>
                  <select
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                    className="w-full h-10 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-xs text-[var(--color-text-primary)]"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                    Đến ví
                  </label>
                  <select
                    value={toWalletId}
                    onChange={(e) => setToWalletId(e.target.value)}
                    className="w-full h-10 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-xs text-[var(--color-text-primary)]"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                  Ví
                </label>
                <select
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  className="w-full h-10 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-xs text-[var(--color-text-primary)]"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Note & Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                  Ngày
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-10 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-xs text-[var(--color-text-primary)]"
                />
              </div>
              <div>
                <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                  Ghi chú
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi chú..."
                  className="w-full h-10 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-xs text-[var(--color-text-primary)]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!amount}
              className="w-full h-11 rounded-[var(--radius-md)] bg-[var(--color-accent)] font-600 text-white transition-all active:scale-[0.97] disabled:opacity-50"
            >
              Lưu thay đổi
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
