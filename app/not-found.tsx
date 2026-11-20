import Link from "next/link";
import { Compass, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="card max-w-md w-full p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)] flex items-center justify-center mx-auto">
          <Compass size={24} strokeWidth={1.75} />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-700 uppercase tracking-wider text-[var(--color-accent)]">
            Lỗi 404
          </p>
          <h1 className="text-xl font-800 text-[var(--color-text-primary)]">
            Không tìm thấy trang này
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            Đường dẫn bạn vừa mở không tồn tại hoặc đã được di chuyển.
          </p>
        </div>
        <Link
          href="/"
          className="w-full h-10 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white text-xs font-700 inline-flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
        >
          <Home size={14} /> Quay lại Tổng quan
        </Link>
      </div>
    </div>
  );
}
