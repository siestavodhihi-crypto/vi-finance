"use client";
import { useRef, useState } from "react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useHydrated } from "@/lib/useHydrated";
import { PageSkeleton } from "@/components/ui/skeleton";
import { formatMoney, getVietnamDateString } from "@/lib/finance";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  exportTransactionsToCsv,
  createBackupJson,
  parseBackupJson,
  downloadTextFile,
} from "@/lib/export-import";
import {
  LogIn,
  LogOut,
  Cloud,
  Database,
  Compass,
  Download,
  Upload,
  FileSpreadsheet,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useUIStore } from "@/store/useUIStore";
import * as Dialog from "@radix-ui/react-dialog";

export default function SettingsPage() {
  const hydrated = useHydrated();
  const router = useRouter();
  const setOnboardingOpen = useUIStore((s) => s.setOnboardingOpen);
  const {
    settings,
    updateSettings,
    wallets,
    transactions,
    budgets,
    recurringBills,
    goals,
    debts,
    splits,
    user,
    dataMode,
    importBackup,
    deleteAccountAndData,
  } = useFinanceStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const totalAssets = wallets.reduce((s, w) => s + w.balance, 0);

  if (!hydrated) {
    return <PageSkeleton />;
  }

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
      toast.success("Đã đăng xuất");
    }
    router.replace("/login");
  };

  const handleExportCsv = () => {
    if (transactions.length === 0) {
      toast.info("Chưa có giao dịch nào để xuất CSV.");
      return;
    }
    const csv = exportTransactionsToCsv(transactions, wallets);
    const today = getVietnamDateString();
    downloadTextFile(csv, `vang-giao-dich-${today}.csv`, "text/csv;charset=utf-8");
    toast.success(`Đã xuất ${transactions.length} giao dịch ra file CSV (UTF-8 BOM).`);
  };

  const handleExportJson = () => {
    const json = createBackupJson({
      wallets,
      transactions,
      budgets,
      recurringBills,
      goals,
      debts,
      splits,
    });
    const today = getVietnamDateString();
    downloadTextFile(json, `vang-backup-${today}.json`, "application/json;charset=utf-8");
    toast.success("Đã tải xuống bản sao lưu toàn bộ dữ liệu (JSON).");
  };

  const handleImportJson = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseBackupJson(text);
      if (!parsed.ok) {
        toast.error(parsed.error);
        return;
      }
      await importBackup(parsed.data);
    } catch {
      toast.error("Không thể đọc tệp sao lưu này.");
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmText.trim().toUpperCase() !== "XOA") return;
    setDeleting(true);
    try {
      await deleteAccountAndData();
      setDeleteDialogOpen(false);
      router.replace("/login");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không xóa được tài khoản";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="pb-24 md:pb-8 space-y-5">
      <h1 className="text-xl font-800 text-[var(--color-text-primary)]">Cài đặt</h1>

      {/* Tài khoản & Đồng bộ Supabase */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[var(--color-accent)]/15 flex items-center justify-center text-[var(--color-accent-text)] flex-shrink-0">
              {dataMode === "supabase" ? <Cloud size={18} /> : <Database size={18} />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-700 text-[var(--color-text-primary)] truncate">
                {user ? user.email : "Chế độ Demo cục bộ"}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {dataMode === "supabase"
                  ? "Đang đồng bộ trực tiếp với Supabase (RLS bảo vệ)"
                  : isSupabaseConfigured()
                  ? "Chưa đăng nhập — bấm đăng nhập để đồng bộ đám mây"
                  : "Chưa cấu hình .env.local cho Supabase"}
              </p>
            </div>
          </div>

          {user ? (
            <button
              onClick={handleSignOut}
              className="min-h-[44px] md:min-h-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--color-expense)]/10 text-xs font-600 text-[var(--color-expense)] hover:bg-[var(--color-expense)]/20"
            >
              <LogOut size={14} /> Đăng xuất
            </button>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="min-h-[44px] md:min-h-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-xs font-700 text-[var(--color-accent-fg)]"
            >
              <LogIn size={14} /> Đăng nhập
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="card p-4">
        <p className="text-xs text-[var(--color-text-secondary)] mb-1">Tổng tài sản</p>
        <p className="text-2xl font-700 tabular-nums text-[var(--color-accent-text)]">
          {settings.privacyMode ? "••••• ₫" : formatMoney(totalAssets)}
        </p>
      </div>

      {/* Daily limit */}
      <div className="card p-4 space-y-3">
        <label htmlFor="daily-limit-input" className="text-sm font-600 text-[var(--color-text-primary)] block">
          Hạn mức chi tiêu hàng ngày
        </label>
        <input
          id="daily-limit-input"
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
            aria-label="Bật tắt chế độ riêng tư ẩn số tiền"
            className={`relative h-7 w-12 rounded-full transition-colors duration-200 ${
              settings.privacyMode ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"
            }`}
            role="switch"
            aria-checked={settings.privacyMode}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                settings.privacyMode ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Dữ liệu & Sao lưu (CSV / JSON Export & Import) */}
      <div className="card p-4 space-y-3">
        <div>
          <h2 className="text-sm font-700 text-[var(--color-text-primary)]">
            Xuất dữ liệu & Sao lưu
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Xuất giao dịch ra Excel (CSV UTF-8 BOM) hoặc sao lưu / khôi phục toàn bộ dữ liệu JSON
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            handleImportJson(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            onClick={handleExportCsv}
            className="min-h-[44px] flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs font-600 text-[var(--color-text-primary)] hover:border-[var(--color-accent)]"
          >
            <FileSpreadsheet size={15} className="text-[var(--color-income)]" />
            Xuất CSV (Excel)
          </button>

          <button
            onClick={handleExportJson}
            className="min-h-[44px] flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs font-600 text-[var(--color-text-primary)] hover:border-[var(--color-accent)]"
          >
            <Download size={15} className="text-[var(--color-accent-text)]" />
            Sao lưu JSON
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs font-600 text-[var(--color-text-primary)] hover:border-[var(--color-accent)]"
          >
            <Upload size={15} />
            Nhập lại JSON
          </button>
        </div>
      </div>

      {/* Onboarding re-run */}
      <div className="card p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-600 text-[var(--color-text-primary)]">
            Hướng dẫn thiết lập nhanh (3 bước)
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Nhập lại số dư ví, hóa đơn cố định và ngân sách đầu tiên
          </p>
        </div>
        <button
          onClick={() => setOnboardingOpen(true)}
          className="min-h-[44px] px-3.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] text-xs font-600 text-[var(--color-text-primary)] hover:border-[var(--color-accent)] inline-flex items-center gap-1.5 flex-shrink-0"
        >
          <Compass size={15} /> Mở lại
        </button>
      </div>

      {/* Vùng nguy hiểm: Xóa tài khoản & toàn bộ dữ liệu */}
      <div className="card p-4 border border-[var(--color-expense)]/30 space-y-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle size={18} className="text-[var(--color-expense)] flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-700 text-[var(--color-expense)]">
              Xóa tài khoản & toàn bộ dữ liệu
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Xóa vĩnh viễn mọi ví, giao dịch, ngân sách, mục tiêu, sổ nợ và ảnh hóa đơn. Hành động này không thể hoàn tác.
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setConfirmText("");
            setDeleteDialogOpen(true);
          }}
          className="min-h-[44px] inline-flex items-center gap-1.5 px-4 rounded-[var(--radius-md)] bg-[var(--color-expense)]/10 text-xs font-700 text-[var(--color-expense)] hover:bg-[var(--color-expense)]/20"
        >
          <Trash2 size={14} /> Xóa tài khoản & dữ liệu
        </button>
      </div>

      {/* App info */}
      <div className="card p-4 text-center space-y-1">
        <p className="text-sm font-600 text-[var(--color-accent-text)]">Vàng</p>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Phiên bản 1.0.0 — Next.js + Supabase + PWA
        </p>
      </div>

      {/* Confirm Delete Account Dialog */}
      <Dialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-24px)] max-w-sm rounded-[var(--radius-xl)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-lg)] space-y-4">
            <Dialog.Title className="text-base font-700 text-[var(--color-expense)]">
              Xác nhận xóa vĩnh viễn?
            </Dialog.Title>
            <Dialog.Description className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              Hãy sao lưu file JSON trước nếu bạn muốn giữ lại dữ liệu. Nhập chữ{" "}
              <strong className="text-[var(--color-text-primary)]">XOA</strong> vào ô dưới để xác nhận xóa toàn bộ dữ liệu và tài khoản.
            </Dialog.Description>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder='Nhập "XOA" để xác nhận'
              className="w-full h-11 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm text-[var(--color-text-primary)]"
            />
            <div className="flex gap-2">
              <Dialog.Close asChild>
                <button className="flex-1 h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] text-xs font-600">
                  Hủy
                </button>
              </Dialog.Close>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || confirmText.trim().toUpperCase() !== "XOA"}
                className="flex-1 h-11 rounded-[var(--radius-md)] bg-[var(--color-expense)] text-white text-xs font-700 disabled:opacity-40"
              >
                {deleting ? "Đang xóa..." : "Xóa vĩnh viễn"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
