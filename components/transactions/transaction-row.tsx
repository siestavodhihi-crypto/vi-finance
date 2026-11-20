"use client";
import { Transaction } from "@/types";
import { CATEGORIES } from "@/lib/constants";
import { formatMoney, formatDateRelative } from "@/lib/finance";
import { useFinanceStore } from "@/store/useFinanceStore";
import { CategoryIcon } from "./category-icon";
import { cn } from "@/lib/utils";
import { Trash2, Pencil, ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { EditTransactionModal } from "./edit-transaction-modal";

interface TransactionRowProps {
  transaction: Transaction;
  showDate?: boolean;
}

export function TransactionRow({ transaction, showDate = true }: TransactionRowProps) {
  const { settings, deleteTransaction, wallets } = useFinanceStore();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const cat = CATEGORIES[transaction.categoryId];
  const sourceWallet = wallets.find((w) => w.id === transaction.walletId);
  const destWallet = transaction.toWalletId
    ? wallets.find((w) => w.id === transaction.toWalletId)
    : null;

  const isTransfer = transaction.type === "transfer";

  let amountColor = "text-[var(--color-expense)]";
  let prefix = "-";

  if (transaction.type === "income") {
    amountColor = "text-[var(--color-income)]";
    prefix = "+";
  } else if (isTransfer) {
    amountColor = "text-[var(--color-accent)]";
    prefix = "⇄ ";
  }

  return (
    <>
      <div className="group flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-3 hover:bg-[var(--color-bg)] card-hover transition-all">
        {/* Category icon bubble */}
        <div
          className="flex-shrink-0 h-10 w-10 rounded-[var(--radius-md)] flex items-center justify-center"
          style={{
            backgroundColor: isTransfer
              ? "rgba(200, 164, 74, 0.15)"
              : `${cat?.color ?? "#8A8780"}20`,
          }}
        >
          {isTransfer ? (
            <ArrowLeftRight size={18} strokeWidth={2} className="text-[var(--color-accent)]" />
          ) : (
            <CategoryIcon
              categoryId={transaction.categoryId}
              size={18}
              strokeWidth={1.75}
              className="text-[var(--color-text-primary)]"
            />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-500 text-[var(--color-text-primary)] truncate">
            {transaction.note || (isTransfer ? "Chuyển tiền nội bộ" : cat?.name)}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)] truncate">
            {isTransfer ? (
              <span>
                {sourceWallet?.name || "Ví"} → {destWallet?.name || "Ví"}
              </span>
            ) : (
              <span>
                {cat?.name} · {sourceWallet?.name}
              </span>
            )}
            {showDate && ` · ${formatDateRelative(transaction.date)}`}
          </p>
        </div>

        {/* Amount */}
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-700 tabular-nums", amountColor)}>
            {settings.privacyMode
              ? "••••• ₫"
              : `${prefix}${formatMoney(transaction.amount)}`}
          </span>

          {/* Action buttons (Edit & Delete) — visible on desktop hover, or compact */}
          <div className="flex items-center gap-1 opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center justify-center h-7 w-7 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)] transition-colors"
              aria-label="Sửa giao dịch"
              title="Sửa giao dịch"
            >
              <Pencil size={13} strokeWidth={1.75} />
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              className="flex items-center justify-center h-7 w-7 rounded-[var(--radius-sm)] text-[var(--color-expense)] hover:bg-[var(--color-expense)]/10 transition-colors"
              aria-label="Xóa giao dịch"
              title="Xóa giao dịch"
            >
              <Trash2 size={13} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      <EditTransactionModal
        transaction={transaction}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />

      {/* Confirm delete dialog */}
      <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed z-50 bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm rounded-t-[var(--radius-xl)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-lg)] md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-[var(--radius-xl)]">
            <Dialog.Title className="text-base font-600 text-[var(--color-text-primary)] mb-2">
              Xóa giao dịch?
            </Dialog.Title>
            <Dialog.Description className="text-sm text-[var(--color-text-secondary)] mb-5">
              {transaction.note || cat?.name} · {formatMoney(transaction.amount)}. Số dư các ví liên quan sẽ được tự động hoàn lại.
            </Dialog.Description>
            <div className="flex gap-3">
              <Dialog.Close asChild>
                <button className="flex-1 h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm font-500 text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition-colors">
                  Hủy
                </button>
              </Dialog.Close>
              <button
                onClick={() => {
                  deleteTransaction(transaction.id);
                  setConfirmOpen(false);
                }}
                className="flex-1 h-11 rounded-[var(--radius-md)] bg-[var(--color-expense)]/10 text-sm font-600 text-[var(--color-expense)] hover:bg-[var(--color-expense)]/20 transition-colors"
              >
                Xóa
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
