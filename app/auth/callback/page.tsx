"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getSupabaseClient } from "@/lib/supabase/client";
import { PageSkeleton } from "@/components/ui/skeleton";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      router.replace("/");
      return;
    }

    let done = false;
    const finish = (path: string, errorMsg?: string) => {
      if (done) return;
      done = true;
      if (errorMsg) toast.error(errorMsg);
      router.replace(path);
    };

    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const urlError =
      params.get("error_description") ||
      params.get("error") ||
      hashParams.get("error_description") ||
      hashParams.get("error");

    if (urlError) {
      finish("/login", `Đăng nhập Google thất bại: ${urlError}`);
      return;
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        toast.success("Đăng nhập Google thành công!");
        finish("/");
      }
    });

    const code = params.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (error) {
          finish("/login", `Không xác thực được phiên Google: ${error.message}`);
        } else if (data.session) {
          toast.success("Đăng nhập Google thành công!");
          finish("/");
        }
      });
    } else {
      // Implicit hash flow (#access_token=...) hoặc session đã có sẵn
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          finish("/");
        }
      });
    }

    // Timeout an toàn nếu không nhận được session sau 5 giây
    const timer = setTimeout(() => {
      finish("/login", "Không nhận được phiên đăng nhập. Vui lòng thử lại.");
    }, 5000);

    return () => {
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="max-w-md mx-auto p-6">
      <PageSkeleton />
    </div>
  );
}
