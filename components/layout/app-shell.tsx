"use client";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { TopBar } from "@/components/layout/top-bar";
import { QuickAddModal } from "@/components/quick-add/quick-add-modal";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-[var(--radius-md)] focus:bg-[var(--color-accent)] focus:text-[var(--color-accent-fg)] focus:font-700 focus:text-xs"
      >
        Bỏ qua tới nội dung chính
      </a>
      <NetworkBanner />
      <Sidebar />
      <TopBar />
      <main id="main-content" className="md:ml-56 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-5 md:px-6 md:py-6">
          {syncLoading ? <PageSkeleton /> : children}
        </div>
      </main>
      <BottomNav />
      <QuickAddModal />
      <OnboardingWizard />
    </>
  );
}
