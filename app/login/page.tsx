"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Mail, Lock, LogIn, UserPlus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useFinanceStore } from "@/store/useFinanceStore";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const enterDemoMode = useFinanceStore((s) => s.enterDemoMode);
  const configured = isSupabaseConfigured();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase) {
      toast.error("Chưa cấu hình biến môi trường Supabase trong .env.local");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Đăng nhập thành công!");
        router.replace("/");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Đăng ký thành công! Đã tạo ví & danh mục mặc định.");
          router.replace("/");
        } else {
          toast.success("Đã gửi email xác nhận. Vui lòng kiểm tra hộp thư của bạn!");
          setMode("signin");
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đăng nhập thất bại";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      toast.error("Chưa cấu hình biến môi trường Supabase trong .env.local");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg)]">
      <div className="w-full max-w-md card p-6 sm:p-8 space-y-6 shadow-[var(--shadow-lg)]">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--color-accent)] flex items-center justify-center mx-auto shadow-sm">
            <Coins size={24} strokeWidth={2} className="text-white" />
          </div>
          <h1 className="text-2xl font-800 tracking-tight text-[var(--color-text-primary)]">
            Vàng
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Quản lý tài chính cá nhân tối giản cho sinh viên
          </p>
        </div>

        {!configured && (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 p-3 text-xs text-[var(--color-text-primary)]">
            Chưa cấu hình <code className="font-700">.env.local</code> cho Supabase. Bạn có thể xem hướng dẫn trong <code className="font-700">README.md</code> hoặc dùng thử chế độ Demo bên dưới.
          </div>
        )}

        {/* Google OAuth */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading || !configured}
          className="w-full h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-bg)] text-sm font-600 text-[var(--color-text-primary)] flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
            <path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"/>
            <path fill="#FBBC05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 0 0 0 10.76l3.98-3.09z"/>
            <path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/>
          </svg>
          Tiếp tục với Google
        </button>

        <div className="relative flex items-center justify-center">
          <div className="w-full border-t border-[var(--color-border)]" />
          <span className="px-3 text-[11px] bg-[var(--color-surface)] text-[var(--color-text-secondary)] absolute">
            hoặc bằng Email
          </span>
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-[var(--radius-md)] bg-[var(--color-bg)] p-1">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={cn(
              "flex-1 py-2 text-xs font-600 rounded-[var(--radius-sm)] transition-colors",
              mode === "signin"
                ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm"
                : "text-[var(--color-text-secondary)]"
            )}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={cn(
              "flex-1 py-2 text-xs font-600 rounded-[var(--radius-sm)] transition-colors",
              mode === "signup"
                ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm"
                : "text-[var(--color-text-secondary)]"
            )}
          >
            Tạo tài khoản
          </button>
        </div>

        {/* Email + Password form */}
        <form onSubmit={handleEmailAuth} className="space-y-3.5">
          <div>
            <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
              Email
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ban@email.com"
                required
                className="w-full h-11 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] pl-9 pr-3 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                minLength={6}
                required
                className="w-full h-11 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] pl-9 pr-3 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !configured}
            className="w-full h-11 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white text-sm font-700 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {mode === "signin" ? <LogIn size={16} /> : <UserPlus size={16} />}
            {loading
              ? "Đang xử lý..."
              : mode === "signin"
              ? "Đăng nhập"
              : "Đăng ký miễn phí"}
          </button>
        </form>

        {/* Demo fallback */}
        <div className="pt-2 border-t border-[var(--color-border)] text-center">
          <button
            type="button"
            onClick={() => {
              enterDemoMode();
              toast.info("Đang dùng chế độ Demo với dữ liệu mẫu");
              router.replace("/");
            }}
            className="inline-flex items-center gap-1.5 text-xs font-600 text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
          >
            <Sparkles size={13} />
            Dùng thử nhanh với dữ liệu mẫu (không cần đăng nhập)
          </button>
        </div>
      </div>
    </div>
  );
}
