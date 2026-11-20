import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { TopBar } from "@/components/layout/top-bar";

export const metadata: Metadata = {
  title: "Vàng — Quản lý tài chính cá nhân",
  description: "Ứng dụng quản lý tiền bạc đơn giản cho sinh viên",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)]">
        <Providers>
          {/* Desktop Sidebar */}
          <Sidebar />

          {/* Mobile Top Bar */}
          <TopBar />

          {/* Main content area */}
          <main className="md:ml-56 min-h-screen">
            <div className="max-w-4xl mx-auto px-4 py-5 md:px-6 md:py-6">
              {children}
            </div>
          </main>

          {/* Mobile Bottom Nav */}
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
