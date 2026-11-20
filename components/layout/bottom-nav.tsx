"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  List,
  Wallet,
  BarChart2,
  Plus,
  ArrowLeftRight,
  ArrowDownUp,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { AddTransactionModal } from "@/components/transactions/add-transaction-modal";
import { TransferModal } from "@/components/wallets/transfer-modal";
import { useUIStore } from "@/store/useUIStore";
import * as Dialog from "@radix-ui/react-dialog";

const NAV_ITEMS = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/transactions", label: "Giao dịch", icon: List },
  { href: "/wallets", label: "Ví tiền", icon: Wallet },
  { href: "/reports", label: "Báo cáo", icon: BarChart2 },
];

export function BottomNav() {
  const pathname = usePathname();
  const setQuickAddOpen = useUIStore((s) => s.setQuickAddOpen);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [addTxOpen, setAddTxOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const left = NAV_ITEMS.slice(0, 2);
  const right = NAV_ITEMS.slice(2, 4);

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-surface)] safe-area-pb">
        <div className="flex items-center justify-around h-16">
          {left.map(({ href, label, icon: Icon }) => (
            <NavItem key={href} href={href} label={label} Icon={Icon} active={pathname === href} />
          ))}

          {/* FAB — Quick action */}
          <button
            onClick={() => setQuickMenuOpen(true)}
            className={cn(
              "relative -top-5 flex h-14 w-14 items-center justify-center rounded-full",
              "bg-[var(--color-accent)] text-white shadow-lg",
              "active:scale-95 transition-transform duration-100"
            )}
            aria-label="Thao tác nhanh"
          >
            <Plus size={24} strokeWidth={2.5} />
          </button>

          {right.map(({ href, label, icon: Icon }) => (
            <NavItem key={href} href={href} label={label} Icon={Icon} active={pathname === href} />
          ))}
        </div>
      </nav>

      {/* Quick Actions Sheet on Mobile */}
      <Dialog.Root open={quickMenuOpen} onOpenChange={setQuickMenuOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed z-50 bottom-0 left-0 right-0 rounded-t-[var(--radius-xl)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-lg)] space-y-3">
            <Dialog.Title className="text-sm font-600 text-[var(--color-text-secondary)] uppercase tracking-wider text-center">
              Thao tác nhanh
            </Dialog.Title>
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <button
                onClick={() => {
                  setQuickMenuOpen(false);
                  setQuickAddOpen(true);
                }}
                className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-[var(--radius-lg)] bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 active:scale-95 transition-transform"
              >
                <div className="w-9 h-9 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white">
                  <Sparkles size={18} strokeWidth={2} />
                </div>
                <span className="text-xs font-700 text-[var(--color-accent)]">Nhập nhanh</span>
              </button>

              <button
                onClick={() => {
                  setQuickMenuOpen(false);
                  setAddTxOpen(true);
                }}
                className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-[var(--radius-lg)] bg-[var(--color-bg)] border border-[var(--color-border)] active:scale-95 transition-transform"
              >
                <div className="w-9 h-9 rounded-full bg-[var(--color-accent)]/15 flex items-center justify-center text-[var(--color-accent)]">
                  <ArrowDownUp size={18} strokeWidth={2} />
                </div>
                <span className="text-xs font-600 text-[var(--color-text-primary)]">Thu / Chi</span>
              </button>

              <button
                onClick={() => {
                  setQuickMenuOpen(false);
                  setTransferOpen(true);
                }}
                className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-[var(--radius-lg)] bg-[var(--color-bg)] border border-[var(--color-border)] active:scale-95 transition-transform"
              >
                <div className="w-9 h-9 rounded-full bg-[var(--color-income)]/15 flex items-center justify-center text-[var(--color-income)]">
                  <ArrowLeftRight size={18} strokeWidth={2} />
                </div>
                <span className="text-xs font-600 text-[var(--color-text-primary)]">Chuyển ví</span>
              </button>
            </div>

            {/* Quick links cho các trang phụ trên mobile */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--color-border)] text-xs">
              <Link
                href="/goals"
                onClick={() => setQuickMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-bg)] text-[var(--color-text-primary)] font-600"
              >
                <Target size={15} className="text-[var(--color-accent)]" /> Mục tiêu tiết kiệm
              </Link>
              <Link
                href="/debts"
                onClick={() => setQuickMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-bg)] text-[var(--color-text-primary)] font-600"
              >
                <Users size={15} className="text-[var(--color-accent)]" /> Sổ nợ & Chia tiền
              </Link>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <AddTransactionModal open={addTxOpen} onClose={() => setAddTxOpen(false)} />
      <TransferModal open={transferOpen} onClose={() => setTransferOpen(false)} />
    </>
  );
}

function NavItem({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors",
        active
          ? "text-[var(--color-accent)] font-600"
          : "text-[var(--color-text-secondary)]"
      )}
    >
      <Icon
        size={20}
        strokeWidth={active ? 2 : 1.75}
        className={active ? "text-[var(--color-accent)]" : ""}
      />
      <span>{label}</span>
    </Link>
  );
}
