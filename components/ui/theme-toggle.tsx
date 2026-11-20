"use client";
import { useTheme } from "@/components/providers";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  const cycle = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const icon =
    theme === "dark" ? (
      <Moon size={18} strokeWidth={1.75} />
    ) : theme === "light" ? (
      <Sun size={18} strokeWidth={1.75} />
    ) : (
      <Monitor size={18} strokeWidth={1.75} />
    );

  const label =
    theme === "dark" ? "Dark" : theme === "light" ? "Light" : "System";

  return (
    <button
      onClick={cycle}
      className={cn(
        "flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium",
        "text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]",
        "transition-colors duration-150",
        className
      )}
      aria-label={`Chế độ giao diện: ${label}`}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}
