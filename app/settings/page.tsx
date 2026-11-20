"use client";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useHydrated } from "@/lib/useHydrated";
import { PageSkeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/finance";
import { DEFAULT_DAILY_LIMIT } from "@/lib/constants";

export default function SettingsPage() {
  const hydrated = useHydrated();
  const { settings, updateSettings, wallets } = useFinanceStore();

  const totalAssets = wallets.reduce((s, w) => s + w.balance, 0);

  if (!hydrated) {
    return <PageSkeleton />;
  }

  return (
    <div className="pb-24 md:pb-8 space-y-5">
      <h1 className="text-xl font-700 text-[var(--color-text-primary)]">Cài đặt</h1>

      {/* Summary */}
      <div className="card p-4">
        <p className="text-xs text-[var(--color-text-secondary)] mb-1">Tổng tài sản</p>
        <p className="text-2xl font-700 tabular-nums text-[var(--color-accent)]">
          {settings.privacyMode ? "••••• ₫" : formatMoney(totalAssets)}
        </p>
      </div>

      {/* Daily limit */}
      <div className="card p-4 space-y-3">
        <h2 className="text-sm font-600 text-[var(--color-text-primary)]">Hạn mức chi tiêu hàng ngày</h2>
        <input
          type="number"
          value={settings.dailyLimit}
          onChange={(e) => updateSettings({ dailyLimit: Number(e.target.value) })}
          className="w-full h-11 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm text-[var(--color-text-primary)] tabular-nums focus:outline-none focus:border-[var(--color-accent)]"
          step={10000}
          min={0}
        />
        <p className="text-xs text-[var(--color-text-secondary)]">
          Hiện tại: {formatMoney(settings.dailyLimit)} / ngày
        </p>
      </div>

      {/* Privacy */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-500 text-[var(--color-text-primary)]">Chế độ riêng tư</p>
            <p className="text-xs text-[var(--color-text-secondary)]">Ẩn tất cả số tiền</p>
          </div>
          <button
            onClick={() => updateSettings({ privacyMode: !settings.privacyMode })}
            className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
              settings.privacyMode ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"
            }`}
            role="switch"
            aria-checked={settings.privacyMode}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                settings.privacyMode ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      {/* App info */}
      <div className="card p-4 text-center space-y-1">
        <p className="text-sm font-600 text-[var(--color-accent)]">Vàng</p>
        <p className="text-xs text-[var(--color-text-secondary)]">Phiên bản 0.1.0 — Lưu trữ cục bộ</p>
      </div>
    </div>
  );
}
