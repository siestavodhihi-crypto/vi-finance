"use client";
import { Coins, Plus } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PrivacyToggle } from "@/components/ui/privacy-toggle";
import { useState } from "react";
import { AddTransactionModal } from "@/components/transactions/add-transaction-modal";

export function TopBar() {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <header className="md:hidden sticky top-0 z-20 flex items-center justify-between px-4 h-14 bg-[var(--color-surface)]/90 backdrop-blur-sm border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[var(--radius-md)] bg-[var(--color-accent)] flex items-center justify-center">
            <Coins size={15} strokeWidth={2} className="text-white" />
          </div>
          <span className="text-base font-700 text-[var(--color-text-primary)]">Vàng</span>
        </div>

        <div className="flex items-center gap-1">
          <PrivacyToggle />
          <ThemeToggle />
          <button
            onClick={() => setAddOpen(true)}
            className="ml-1 flex items-center gap-1 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3 py-1.5 text-sm font-600 text-white active:scale-95 transition-transform"
            aria-label="Thêm giao dịch"
          >
            <Plus size={16} strokeWidth={2} />
          </button>
        </div>
      </header>

      <AddTransactionModal open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}
