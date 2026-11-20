"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { DebtDirection } from "@/types";
import { cn } from "@/lib/utils";

interface DebtModalProps {
  open: boolean;
  onClose: () => void;
}

export function DebtModal({ open, onClose }: DebtModalProps) {
  const { addDebt } = useFinanceStore();
  const [direction, setDirection] = useState<DebtDirection>("they_owe");
  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    if (open) {
      setPerson("");
      setAmount("");
      setNote("");
      setDate(new Date().toISOString().slice(0, 10));
    }
  }, [open]);

  const formatInput = (val: string) => {
    const num = val.replace(/\D/g, "");
    return num ? new Intl.NumberFormat("vi-VN").format(Number(num)) : "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(amount.replace(/\D/g, ""), 10);
    if (!person.trim() || !num || num <= 0) return;

    addDebt({
      person: person.trim(),
      amount: num,
      direction,
      note: note.trim() || (direction === "they_owe" ? "Cho mượn tiền" : "Mượn tiền"),
      date: `${date}T12:00:00`,
    });
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
            "p-5 space-y-4"
          )}
        >
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-base font-600 text-[var(--color-text-primary)]">
              Ghi khoản nợ mới
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-[var(--radius-sm)] p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2 rounded-[var(--radius-md)] bg-[var(--color-bg)] p-1">
              <button
                type="button"
                onClick={() => setDirection("they_owe")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] py-2 text-xs font-600 transition-all",
                  direction === "they_owe"
                    ? "bg-[var(--color-income)] text-white shadow-sm"
                    : "text-[var(--color-text-secondary)]"
                )}
              >
                <ArrowDownLeft size={15} /> Họ nợ tôi
              </button>
              <button
                type="button"
                onClick={() => setDirection("i_owe")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] py-2 text-xs font-600 transition-all",
                  direction === "i_owe"
                    ? "bg-[var(--color-expense)] text-white shadow-sm"
                    : "text-[var(--color-text-secondary)]"
                )}
              >
                <ArrowUpRight size={15} /> Tôi nợ họ
              </button>
            </div>

            <div>
              <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                Tên người
              </label>
              <input
                type="text"
                value={person}
                onChange={(e) => setPerson(e.target.value)}
                placeholder="Minh, Lan, Hùng..."
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
                  Lý do / Ghi chú
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Tiền ăn, đặt hộ..."
                  className="w-full h-10 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-xs text-[var(--color-text-primary)]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!person.trim() || !amount}
              className="w-full h-11 rounded-[var(--radius-md)] bg-[var(--color-accent)] font-600 text-white active:scale-[0.97] transition-all disabled:opacity-50"
            >
              Lưu vào sổ nợ
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
