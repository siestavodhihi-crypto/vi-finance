"use client";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen flex items-center justify-center p-4 bg-[#F5F4F0] text-[#1A1A18]">
        <div className="max-w-md w-full rounded-2xl bg-white border border-[#E8E6DF] p-6 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-[#C0392B]/10 text-[#C0392B] flex items-center justify-center mx-auto">
            <AlertTriangle size={24} />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[#C0392B]">
              Lỗi hệ thống (500)
            </p>
            <h1 className="text-lg font-bold">Không thể hiển thị ứng dụng</h1>
            <p className="text-xs text-[#6B6860]">
              Vui lòng tải lại trang hoặc kiểm tra kết nối mạng của bạn.
            </p>
          </div>
          <button
            onClick={reset}
            className="w-full h-10 rounded-xl bg-[#C8A44A] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
          >
            <RefreshCw size={14} /> Tải lại ứng dụng
          </button>
        </div>
      </body>
    </html>
  );
}
