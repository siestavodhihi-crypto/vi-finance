"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  List,
  Wallet,
  PieChart,
  CalendarClock,
  BarChart2,
  Settings,
  Coins,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PrivacyToggle } from "@/components/ui/privacy-toggle";

const NAV_ITEMS = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/transactions", label: "Giao dịch", icon: List },
  { href: "/wallets", label: "Ví tiền", icon: Wallet },
  { href: "/budget", label: "Ngân sách", icon: PieChart },
  { href: "/bills", label: "Hóa đơn", icon: CalendarClock },
  { href: "/reports", label: "Báo cáo", icon: BarChart2 },
  { href: "/settings", label: "Cài đặt", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-56 border-r border-[var(--color-border)] bg-[var(--color-surface)] z-30 py-5 px-3">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 px-3 mb-6 group">
        <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-accent)] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
          <Coins size={18} strokeWidth={2} className="text-white" />
        </div>
        <div>
          <span className="text-lg font-800 tracking-tight text-[var(--color-text-primary)] block leading-none">
            Vàng
          </span>
          <span className="text-[10px] text-[var(--color-text-secondary)]">Quản lý tài chính</span>
        </div>
      </Link>

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
                  ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-600"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
              )}
            >
              <Icon
                size={18}
                strokeWidth={active ? 2 : 1.75}
                className={active ? "text-[var(--color-accent)]" : ""}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className="space-y-1 border-t border-[var(--color-border)] pt-4">
        <PrivacyToggle className="w-full justify-start" />
        <ThemeToggle className="w-full justify-start" />
      </div>
    </aside>
  );
}
