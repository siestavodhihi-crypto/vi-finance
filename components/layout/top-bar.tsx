"use client";
import { Coins, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PrivacyToggle } from "@/components/ui/privacy-toggle";
import { useUIStore } from "@/store/useUIStore";

export function TopBar() {
  const setQuickAddOpen = useUIStore((s) => s.setQuickAddOpen);

  return (
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
          onClick={() => setQuickAddOpen(true)}
          className="ml-1 flex items-center justify-center gap-1 min-h-[44px] rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3 py-2 text-xs font-700 text-[var(--color-accent-fg)] active:scale-95 transition-transform"
          aria-label="Nhập nhanh giao dịch"
        >
          <Sparkles size={14} strokeWidth={2} />
          <span>Nhanh</span>
        </button>
      </div>
    </header>
  );
}
