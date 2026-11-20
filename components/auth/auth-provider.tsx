"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useFinanceStore } from "@/store/useFinanceStore";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const loadFromSupabase = useFinanceStore((s) => s.loadFromSupabase);
  const enterDemoMode = useFinanceStore((s) => s.enterDemoMode);
  const clearUserData = useFinanceStore((s) => s.clearUserData);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      enterDemoMode();
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) return;

    let mounted = true;

    // Kiểm tra session hiện tại
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const sessionUser = data.session?.user;
      if (sessionUser) {
        loadFromSupabase({
          id: sessionUser.id,
          email: sessionUser.email ?? "",
          name: sessionUser.user_metadata?.full_name ?? sessionUser.user_metadata?.name,
        });
      } else {
        clearUserData();
        if (!PUBLIC_PATHS.includes(pathname)) {
          router.replace("/login");
        }
      }
    });

    // Lắng nghe thay đổi trạng thái đăng nhập / đăng xuất
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      const u = session?.user;
      if (u && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        loadFromSupabase({
          id: u.id,
          email: u.email ?? "",
          name: u.user_metadata?.full_name ?? u.user_metadata?.name,
        });
      } else if (event === "SIGNED_OUT") {
        clearUserData();
        router.replace("/login");
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [pathname, router, loadFromSupabase, enterDemoMode, clearUserData]);

  return <>{children}</>;
}
