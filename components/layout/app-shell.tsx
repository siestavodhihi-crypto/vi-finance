"use client";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { TopBar } from "@/components/layout/top-bar";
import { QuickAddModal } from "@/components/quick-add/quick-add-modal";
import { PageSkeleton } from "@/components/ui/skeleton";
import { NetworkBanner } from "@/components/ui/network-banner";
import { useFinanceStore } from "@/store/useFinanceStore";

const AUTH_PATHS = ["/login", "/auth/callback"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const syncLoading = useFinanceStore((s) => s.syncLoading);

  if (AUTH_PATHS.includes(pathname)) {
    return (
      <>
        <NetworkBanner />
        {children}
      </>
    );
  }

  return (
    <>
      <NetworkBanner />
      <Sidebar />
      <TopBar />
      <main className="md:ml-56 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-5 md:px-6 md:py-6">
          {syncLoading ? <PageSkeleton /> : children}
        </div>
      </main>
      <BottomNav />
      <QuickAddModal />
    </>
  );
}
