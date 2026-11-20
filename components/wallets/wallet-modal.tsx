"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Wallet as WalletIcon, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { Wallet } from "@/types";
import { cn } from "@/lib/utils";

interface WalletModalProps {
  open: boolean;
  onClose: () => void;
  walletToEdit?: Wallet | null;
}

const WALLET_ICONS = ["Wallet", "CreditCard", "Smartphone", "PiggyBank", "Landmark"];
const WALLET_COLORS = ["#C8A44A", "#2D7D5F", "#D82D8B", "#8B6F4A", "#3B82F6", "#7C6FCD"];

export function WalletModal({ open, onClose, walletToEdit }: WalletModalProps) {
  const { addWallet, updateWallet } = useFinanceStore();

  const [name, setName] = useState("");
  const [initialBalance, setInitialBalance] = useState("");
  const [icon, setIcon] = useState("Wallet");
  const [color, setColor] = useState("#C8A44A");
  const [isLocked, setIsLocked] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (walletToEdit) {
      setName(walletToEdit.name);
      setInitialBalance(String(walletToEdit.initialBalance ?? walletToEdit.balance));
      setIcon(walletToEdit.icon);
      setColor(walletToEdit.color);
      setIsLocked(Boolean(walletToEdit.isLocked));
      setNote(walletToEdit.note || "");
    } else {
      setName("");
      setInitialBalance("");
      setIcon("Wallet");
      setColor("#C8A44A");
      setIsLocked(false);
      setNote("");
    }
  }, [walletToEdit, open]);

  const formatInput = (val: string) => {
    const num = val.replace(/\D/g, "");
    if (!num) return "";
    return new Intl.NumberFormat("vi-VN").format(Number(num));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const balanceNum = parseInt(initialBalance.replace(/\D/g, "") || "0", 10);

    if (walletToEdit) {
      updateWallet(walletToEdit.id, {
        name: name.trim(),
        icon,
        color,
        isLocked,
        note: note.trim(),
      });
    } else {
      addWallet({
        name: name.trim(),
        balance: balanceNum,
        initialBalance: balanceNum,
        icon,
        color,
        isLocked,
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
            <Dialog.Title className="text-base font-600 text-[var(--color-text-primary)]">
              {walletToEdit ? "Sửa thông tin ví" : "Thêm ví mới"}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-[var(--radius-sm)] p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]">
                <X size={18} strokeWidth={1.75} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                Tên ví
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví Tiền mặt, Vietcombank, Momo..."
                required
                className="w-full h-11 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>

            {!walletToEdit && (
              <div>
                <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                  Số dư ban đầu
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatInput(initialBalance)}
                    onChange={(e) => setInitialBalance(e.target.value.replace(/\D/g, ""))}
                    placeholder="0"
                    className="w-full h-11 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 pr-8 text-lg font-700 text-[var(--color-text-primary)] tabular-nums focus:outline-none focus:border-[var(--color-accent)]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-secondary)]">
                    ₫
                  </span>
                </div>
              </div>
            )}

            {/* Color picker */}
            <div>
              <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1.5 block">
                Màu sắc nhận diện
              </label>
              <div className="flex gap-2">
                {WALLET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-transform",
                      color === c ? "scale-110 border-[var(--color-text-primary)]" : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Locked Savings toggle */}
            <div className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-[var(--color-bg)] border border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <Lock size={16} strokeWidth={2} className="text-[var(--color-accent)]" />
                <div>
                  <p className="text-xs font-600 text-[var(--color-text-primary)]">Ví tiết kiệm đã khóa</p>
                  <p className="text-[11px] text-[var(--color-text-secondary)]">
                    Trừ khỏi quỹ Safe-to-Spend để tránh tiêu lẹm
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isLocked}
                onChange={(e) => setIsLocked(e.target.checked)}
                className="h-4 w-4 rounded accent-[var(--color-accent)]"
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
                placeholder="Mô tả mục đích sử dụng ví..."
                className="w-full h-10 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>

            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full h-11 rounded-[var(--radius-md)] bg-[var(--color-accent)] font-600 text-white transition-all active:scale-[0.97] disabled:opacity-50"
            >
              {walletToEdit ? "Lưu thay đổi" : "Tạo ví"}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
