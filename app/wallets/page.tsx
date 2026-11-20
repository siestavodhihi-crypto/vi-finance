"use client";
import { useState } from "react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useHydrated } from "@/lib/useHydrated";
import { PageSkeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/finance";
import { Wallet } from "@/types";
import { WalletModal } from "@/components/wallets/wallet-modal";
import { TransferModal } from "@/components/wallets/transfer-modal";
import { CategoryIcon } from "@/components/transactions/category-icon";
import {
  Plus,
  ArrowLeftRight,
  Lock,
  Pencil,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

export default function WalletsPage() {
  const hydrated = useHydrated();
  const { wallets, deleteWallet, settings } = useFinanceStore();
  const { privacyMode } = settings;

  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [walletToEdit, setWalletToEdit] = useState<Wallet | null>(null);
  const [walletToDelete, setWalletToDelete] = useState<Wallet | null>(null);

  const totalAssets = wallets.reduce((s, w) => s + w.balance, 0);
  const availableWallets = wallets.filter((w) => !w.isLocked);
  const lockedWallets = wallets.filter((w) => w.isLocked);

  const availableTotal = availableWallets.reduce((s, w) => s + w.balance, 0);
  const lockedTotal = lockedWallets.reduce((s, w) => s + w.balance, 0);

  const handleEdit = (w: Wallet) => {
    setWalletToEdit(w);
    setWalletModalOpen(true);
  };

  const handleCreate = () => {
    setWalletToEdit(null);
    setWalletModalOpen(true);
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
            Ví của tôi
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Quản lý các tài khoản tiền mặt, ngân hàng, ví điện tử và quỹ tiết kiệm
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTransferModalOpen(true)}
            className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-600 text-[var(--color-text-primary)] hover:border-[var(--color-accent)]"
          >
            <ArrowLeftRight size={14} />
            <span>Chuyển ví</span>
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3.5 py-2 text-xs font-600 text-white shadow-sm active:scale-95 transition-transform"
          >
            <Plus size={16} strokeWidth={2} />
            <span>Thêm ví</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total */}
        <div className="card p-4">
          <p className="text-xs text-[var(--color-text-secondary)] font-500 mb-1">
            Tổng tài sản ({wallets.length} ví)
          </p>
          <p className="text-2xl font-800 text-[var(--color-accent)] tabular-nums">
            {privacyMode ? "••••• ₫" : formatMoney(totalAssets)}
          </p>
        </div>

        {/* Spendable */}
        <div className="card p-4 border-l-4 border-l-[var(--color-income)]">
          <div className="flex items-center gap-1.5 mb-1">
            <ShieldCheck size={14} className="text-[var(--color-income)]" />
            <p className="text-xs text-[var(--color-income)] font-600">
              Ví khả dụng ({availableWallets.length})
            </p>
          </div>
          <p className="text-xl font-700 text-[var(--color-income)] tabular-nums">
            {privacyMode ? "••••• ₫" : formatMoney(availableTotal)}
          </p>
          <p className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">
            Dùng để chi tiêu sinh hoạt hàng ngày
          </p>
        </div>

        {/* Locked */}
        <div className="card p-4 border-l-4 border-l-[var(--color-accent)]">
          <div className="flex items-center gap-1.5 mb-1">
            <Lock size={14} className="text-[var(--color-accent)]" />
            <p className="text-xs text-[var(--color-accent)] font-600">
              Ví tiết kiệm đã khóa ({lockedWallets.length})
            </p>
          </div>
          <p className="text-xl font-700 text-[var(--color-accent)] tabular-nums">
            {privacyMode ? "••••• ₫" : formatMoney(lockedTotal)}
          </p>
          <p className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">
            Bảo toàn trong Safe-to-Spend
          </p>
        </div>
      </div>

      {/* Wallet List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {wallets.map((w) => (
          <div
            key={w.id}
            className="card p-5 space-y-3 card-hover relative group transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: w.color }}
                >
                  <CategoryIcon iconName={w.icon} size={22} className="text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-700 text-[var(--color-text-primary)]">
                      {w.name}
                    </h3>
                    {w.isLocked && (
                      <span className="flex items-center gap-0.5 text-[10px] font-600 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                        <Lock size={10} /> Đã khóa
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Số dư ban đầu: {formatMoney(w.initialBalance ?? w.balance)}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleEdit(w)}
                  className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
                  title="Sửa ví"
                >
                  <Pencil size={14} />
                </button>
                {wallets.length > 1 && (
                  <button
                    onClick={() => setWalletToDelete(w)}
                    className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-expense)] hover:bg-[var(--color-expense)]/10"
                    title="Xóa ví"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Current Balance */}
            <div className="pt-2 border-t border-[var(--color-border)]/60 flex items-baseline justify-between">
              <span className="text-xs font-500 text-[var(--color-text-secondary)]">
                Số dư hiện tại:
              </span>
              <span className="text-xl font-800 text-[var(--color-text-primary)] tabular-nums">
                {privacyMode ? "••••• ₫" : formatMoney(w.balance)}
              </span>
            </div>

            {w.note && (
              <p className="text-[11px] text-[var(--color-text-secondary)] italic">
                {w.note}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Modals */}
      <WalletModal
        open={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        walletToEdit={walletToEdit}
      />
      <TransferModal
        open={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
      />

      {/* Confirm delete dialog */}
      <Dialog.Root open={Boolean(walletToDelete)} onOpenChange={(o) => !o && setWalletToDelete(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed z-50 bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm rounded-t-[var(--radius-xl)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-lg)] md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-[var(--radius-xl)]">
            <Dialog.Title className="text-base font-600 text-[var(--color-text-primary)] mb-2">
              Xóa ví {walletToDelete?.name}?
            </Dialog.Title>
            <Dialog.Description className="text-xs text-[var(--color-text-secondary)] mb-5">
              Hành động này sẽ xóa ví khỏi danh sách. Số dư còn lại là {walletToDelete && formatMoney(walletToDelete.balance)}.
            </Dialog.Description>
            <div className="flex gap-3">
              <Dialog.Close asChild>
                <button className="flex-1 h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] text-xs font-500 text-[var(--color-text-primary)] hover:bg-[var(--color-border)]">
                  Hủy
                </button>
              </Dialog.Close>
              <button
                onClick={() => {
                  if (walletToDelete) deleteWallet(walletToDelete.id);
                  setWalletToDelete(null);
                }}
                className="flex-1 h-10 rounded-[var(--radius-md)] bg-[var(--color-expense)]/10 text-xs font-600 text-[var(--color-expense)] hover:bg-[var(--color-expense)]/20"
              >
                Xóa ví
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
