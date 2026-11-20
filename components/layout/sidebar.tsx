"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  List,
  Wallet,
  PieChart,
  CalendarClock,
  Target,
  Users,
  BarChart2,
  Settings,
  Sparkles,
  LogIn,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PrivacyToggle } from "@/components/ui/privacy-toggle";
import { useUIStore } from "@/store/useUIStore";
import { useFinanceStore } from "@/store/useFinanceStore";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const NAV_ITEMS = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/transactions", label: "Giao dịch", icon: List },
  { href: "/wallets", label: "Ví tiền", icon: Wallet },
  { href: "/budget", label: "Ngân sách", icon: PieChart },
  { href: "/bills", label: "Hóa đơn", icon: CalendarClock },
  { href: "/goals", label: "Mục tiêu", icon: Target },
  { href: "/debts", label: "Sổ nợ & Chia tiền", icon: Users },
  { href: "/reports", label: "Báo cáo", icon: BarChart2 },
  { href: "/settings", label: "Cài đặt", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const setQuickAddOpen = useUIStore((s) => s.setQuickAddOpen);
  const user = useFinanceStore((s) => s.user);

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
      toast.success("Đã đăng xuất");
    }
    router.replace("/login");
  };

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-56 border-r border-[var(--color-border)] bg-[var(--color-surface)] z-30 py-5 px-3">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 px-3 mb-5 group">
        <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-accent)] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
          <Wallet size={18} strokeWidth={2.2} className="text-[var(--color-accent-fg)]" />
        </div>
        <div>
          <span className="text-lg font-800 tracking-tight text-[var(--color-text-primary)] block leading-none">
            Ví
          </span>
          <span className="text-[10px] text-[var(--color-text-secondary)]">Tiền của bạn, gọn hơn</span>
        </div>
      </Link>

      {/* Quick-Add Button (Ctrl+K) */}
      <button
        onClick={() => setQuickAddOpen(true)}
        className="mb-4 flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-xs font-600 text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent-text)] transition-colors"
      >
        <span className="flex items-center gap-2">
          <Sparkles size={14} className="text-[var(--color-accent-text)]" />
          Nhập nhanh
        </span>
        <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
          ⌘K
        </kbd>
      </button>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-500 transition-colors duration-150",
                active
                  ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-text)] font-700"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]"
              )}
            >
              <Icon
                size={18}
                strokeWidth={active ? 2.1 : 1.75}
                className={active ? "text-[var(--color-accent-text)]" : ""}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className="space-y-1 border-t border-[var(--color-border)] pt-3 mt-2">
        <PrivacyToggle className="w-full justify-start" />
        <ThemeToggle className="w-full justify-start" />
        {user ? (
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-xs font-500 text-[var(--color-text-secondary)] hover:bg-[var(--color-expense)]/10 hover:text-[var(--color-expense)] transition-colors"
            title={user.email}
          >
            <LogOut size={16} strokeWidth={1.75} className="flex-shrink-0" />
            <span className="truncate">{user.email}</span>
          </button>
        ) : (
          <Link
            href="/login"
            className="w-full flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-xs font-600 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors"
          >
            <LogIn size={16} strokeWidth={1.75} />
            <span>Đăng nhập / Đồng bộ</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
