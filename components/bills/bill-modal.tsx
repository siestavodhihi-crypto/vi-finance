"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X, CalendarClock } from "lucide-react";
import { useState, useEffect } from "react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { RecurringBill, CategoryId } from "@/types";
import { cn } from "@/lib/utils";

interface BillModalProps {
  open: boolean;
  onClose: () => void;
  billToEdit?: RecurringBill | null;
}

export function BillModal({ open, onClose, billToEdit }: BillModalProps) {
  const { wallets, addBill, updateBill } = useFinanceStore();

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<CategoryId>("rent");
  const [dueDay, setDueDay] = useState(5);
  const [walletId, setWalletId] = useState(wallets[0]?.id ?? "");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (billToEdit) {
      setName(billToEdit.name);
      setAmount(String(billToEdit.amount));
      setCategoryId(billToEdit.categoryId);
      setDueDay(billToEdit.dueDay);
      setWalletId(billToEdit.walletId);
      setNote(billToEdit.note || "");
    } else {
      setName("");
      setAmount("");
      setCategoryId("rent");
      setDueDay(5);
      setWalletId(wallets[0]?.id ?? "");
      setNote("");
    }
  }, [billToEdit, open, wallets]);

  const formatInput = (val: string) => {
    const num = val.replace(/\D/g, "");
    if (!num) return "";
    return new Intl.NumberFormat("vi-VN").format(Number(num));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseInt(amount.replace(/\D/g, ""), 10);
    if (!name.trim() || !numAmount || numAmount <= 0) return;

    if (billToEdit) {
      updateBill(billToEdit.id, {
        name: name.trim(),
        amount: numAmount,
        categoryId,
        dueDay: Number(dueDay),
        walletId,
        note: note.trim(),
      });
    } else {
      addBill({
        name: name.trim(),
        amount: numAmount,
        categoryId,
        dueDay: Number(dueDay),
        walletId,
        note: note.trim(),
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
                <CalendarClock size={18} strokeWidth={2} />
              </div>
              <Dialog.Title className="text-base font-600 text-[var(--color-text-primary)]">
                {billToEdit ? "Sửa hóa đơn định kỳ" : "Thêm hóa đơn định kỳ"}
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
                Tên hóa đơn
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tiền phòng trọ, điện nước, Internet, Spotify..."
                required
                className="w-full h-11 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>

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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                  Danh mục
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value as CategoryId)}
                  className="w-full h-10 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-xs text-[var(--color-text-primary)] focus:outline-none"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                  Ngày đến hạn (Hàng tháng)
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={dueDay}
                  onChange={(e) => setDueDay(Number(e.target.value))}
                  className="w-full h-10 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-xs text-[var(--color-text-primary)] tabular-nums focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                Ví thanh toán mặc định
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

            <div>
              <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                Ghi chú
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Số phòng, mã hợp đồng..."
                className="w-full h-10 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-xs text-[var(--color-text-primary)]"
              />
            </div>

            <button
              type="submit"
              disabled={!amount || !name.trim()}
              className="w-full h-11 rounded-[var(--radius-md)] bg-[var(--color-accent)] font-600 text-white transition-all active:scale-[0.97] disabled:opacity-50"
            >
              {billToEdit ? "Lưu thay đổi" : "Thêm hóa đơn"}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
