"use client";
import { useEffect, useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";
import { toast } from "sonner";

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function NetworkBanner() {
  const online = useSyncExternalStore(
    subscribeOnline,
    () => (typeof navigator !== "undefined" ? navigator.onLine : true),
    () => true
  );

  useEffect(() => {
    const onOffline = () =>
      toast.error("Mất kết nối mạng. Thay đổi mới sẽ chưa thể đồng bộ lên Supabase.");
    const onOnline = () => toast.success("Đã khôi phục kết nối mạng!");

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-[var(--color-expense)] px-4 py-2 text-xs font-600 text-white"
    >
      <WifiOff size={14} />
      <span>Bạn đang ngoại tuyến (Offline) — dữ liệu chưa thể đồng bộ lên Supabase.</span>
    </div>
  );
}
