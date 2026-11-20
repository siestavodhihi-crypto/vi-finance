"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { cn } from "@/lib/utils";
import { formatMoney, getVietnamDateString } from "@/lib/finance";

interface TransferModalProps {
  open: boolean;
  onClose: () => void;
}

export function TransferModal(props: TransferModalProps) {
  if (!props.open) return null;
  return <TransferModalInner {...props} />;
}

function TransferModalInner({ open, onClose }: TransferModalProps) {
  const { wallets, transferMoney } = useFinanceStore();
  const [fromWalletId, setFromWalletId] = useState(wallets[0]?.id ?? "");
  const [toWalletId, setToWalletId] = useState(wallets[1]?.id ?? wallets[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => getVietnamDateString());

  const fromWallet = wallets.find((w) => w.id === fromWalletId);

  const formatInput = (val: string) => {
    const num = val.replace(/\D/g, "");
    if (!num) return "";
    return new Intl.NumberFormat("vi-VN").format(Number(num));
  };

  const handleSwap = () => {
    setFromWalletId(toWalletId);
    setToWalletId(fromWalletId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseInt(amount.replace(/\D/g, ""), 10);
    if (!numAmount || numAmount <= 0) return;
    if (fromWalletId === toWalletId) return;

    transferMoney({
      fromWalletId,
      toWalletId,
      amount: numAmount,
      note: note.trim() || undefined,
      date: `${date}T${new Date().toTimeString().slice(0, 8)}`,
    });

    setAmount("");
    setNote("");
    onClose();
  };

  const isInvalid = !amount || fromWalletId === toWalletId || (fromWallet && fromWallet.balance < parseInt(amount.replace(/\D/g, "") || "0", 10));

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
                <ArrowLeftRight size={18} strokeWidth={2} />
              </div>
              <Dialog.Title className="text-base font-600 text-[var(--color-text-primary)]">
                Chuyển tiền giữa các ví
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="rounded-[var(--radius-sm)] p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]">
                <X size={18} strokeWidth={1.75} />
              </button>
            </Dialog.Close>
          </div>

          <p className="text-xs text-[var(--color-text-secondary)]">
            Chuyển tiền chỉ luân chuyển số dư giữa các ví, <strong className="text-[var(--color-text-primary)]">không tính vào tổng thu/chi</strong> của bạn.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* From Wallet -> To Wallet */}
            <div className="space-y-2 rounded-[var(--radius-md)] bg-[var(--color-bg)] p-3 border border-[var(--color-border)]">
              <div>
                <label className="text-xs font-500 text-[var(--color-text-secondary)] block mb-1">
                  Từ ví (Nguồn)
                </label>
                <select
                  value={fromWalletId}
                  onChange={(e) => setFromWalletId(e.target.value)}
                  className="w-full h-10 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (Số dư: {formatMoney(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Swap button */}
              <div className="flex justify-center my-1">
                <button
                  type="button"
                  onClick={handleSwap}
                  className="p-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-colors"
                  title="Đổi chiều ví"
                >
                  <ArrowLeftRight size={16} strokeWidth={2} />
                </button>
              </div>

              <div>
                <label className="text-xs font-500 text-[var(--color-text-secondary)] block mb-1">
                  Đến ví (Đích)
                </label>
                <select
                  value={toWalletId}
                  onChange={(e) => setToWalletId(e.target.value)}
                  className="w-full h-10 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (Số dư: {formatMoney(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              {fromWalletId === toWalletId && (
                <p className="text-xs text-[var(--color-expense)] mt-1">
                  Ví nguồn và ví đích phải khác nhau!
                </p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                Số tiền chuyển
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

            {/* Note & Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                  Ngày chuyển
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-10 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
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
                  placeholder="Rút tiền, nạp ví..."
                  className="w-full h-10 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isInvalid}
              className={cn(
                "w-full h-11 rounded-[var(--radius-md)] bg-[var(--color-accent)] font-600 text-white",
                "transition-all duration-100 active:scale-[0.97]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              Xác nhận chuyển tiền
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
