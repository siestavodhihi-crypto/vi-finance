"use client";
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App ErrorBoundary]", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="card max-w-md w-full p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-[var(--color-expense)]/12 text-[var(--color-expense)] flex items-center justify-center mx-auto">
          <AlertTriangle size={24} strokeWidth={1.75} />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-700 uppercase tracking-wider text-[var(--color-expense)]">
            Lỗi 500
          </p>
          <h1 className="text-xl font-800 text-[var(--color-text-primary)]">
            Đã có sự cố xảy ra
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            Ứng dụng gặp lỗi không mong muốn. Dữ liệu tài chính của bạn vẫn an toàn — hãy thử tải lại trang nhé.
          </p>
        </div>

        <div className="flex gap-2.5 pt-2">
          <button
            onClick={reset}
            className="flex-1 h-10 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white text-xs font-700 inline-flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
          >
            <RefreshCw size={14} /> Thử lại
          </button>
          <Link
            href="/"
            className="flex-1 h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] text-xs font-600 inline-flex items-center justify-center gap-1.5 hover:bg-[var(--color-bg)]"
          >
            <Home size={14} /> Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
