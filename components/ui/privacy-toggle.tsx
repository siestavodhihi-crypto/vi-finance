"use client";
import { Eye, EyeOff } from "lucide-react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { cn } from "@/lib/utils";

export function PrivacyToggle({ className }: { className?: string }) {
  const { settings, togglePrivacyMode } = useFinanceStore();

  return (
    <button
      onClick={togglePrivacyMode}
      className={cn(
        "flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium",
        "text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]",
        "transition-colors duration-150",
        className
      )}
      aria-label={settings.privacyMode ? "Hiện số tiền" : "Ẩn số tiền"}
    >
      {settings.privacyMode ? (
        <EyeOff size={18} strokeWidth={1.75} />
      ) : (
        <Eye size={18} strokeWidth={1.75} />
      )}
      <span className="hidden lg:inline">
        {settings.privacyMode ? "Hiện" : "Ẩn"}
      </span>
    </button>
  );
}
