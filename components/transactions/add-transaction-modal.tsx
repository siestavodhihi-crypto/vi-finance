"use client";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  ArrowUpCircle,
  ArrowDownCircle,
  Camera,
  Image as ImageIcon,
  ScanLine,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Trash2,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useFinanceStore } from "@/store/useFinanceStore";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/constants";
import { TransactionType, CategoryId } from "@/types";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/components/transactions/category-icon";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney, getVietnamDateString } from "@/lib/finance";
import { ParsedReceipt } from "@/lib/receipt-parser";
import { getSupabaseClient } from "@/lib/supabase/client";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

interface AddTransactionModalProps {
  open: boolean;
  onClose: () => void;
  defaultType?: TransactionType;
}

export function AddTransactionModal(props: AddTransactionModalProps) {
  if (!props.open) return null;
  return <AddTransactionModalInner {...props} />;
}

function AddTransactionModalInner({
  open,
  onClose,
  defaultType = "expense",
}: AddTransactionModalProps) {
  const { wallets, addTransaction, user, dataMode } = useFinanceStore();

  const [type, setType] = useState<"income" | "expense">(
    defaultType === "transfer" ? "expense" : defaultType
  );
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<CategoryId>("food");
  const [walletId, setWalletId] = useState(wallets[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => getVietnamDateString());
  const [submitting, setSubmitting] = useState(false);

  // Receipt scanning state
  const [showScanner, setShowScanner] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [attachReceipt, setAttachReceipt] = useState(false); // Mặc định KHÔNG lưu ảnh
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<ParsedReceipt | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Dọn object URL khi unmount để tránh rò rỉ bộ nhớ
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const clearReceipt = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setReceiptFile(null);
    setAttachReceipt(false);
    setScanError(null);
    setScannedResult(null);
  };

  const handleFileSelected = async (file: File | undefined) => {
    if (!file) return;
    setScanError(null);
    setScannedResult(null);

    if (file.size > MAX_FILE_BYTES) {
      setScanError("Ảnh vượt quá 5MB. Vui lòng chọn ảnh nhẹ hơn hoặc nhập tay.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setReceiptFile(file);
    setShowScanner(true);
    setScanning(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Gửi kèm access token Supabase (nếu đã đăng nhập) để rate limit chính xác theo user_id
      const headers: Record<string, string> = {};
      const sb = getSupabaseClient();
      if (sb) {
        const { data } = await sb.auth.getSession();
        if (data.session?.access_token) {
          headers["Authorization"] = `Bearer ${data.session.access_token}`;
        }
      }

      const res = await fetch("/api/scan-receipt", {
        method: "POST",
        headers,
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        setScanError(
          json.error || "Không đọc được hóa đơn. Vui lòng kiểm tra và nhập tay."
        );
        return;
      }

      const data = json.data as ParsedReceipt;
      setScannedResult(data);

      // Điền sẵn vào form để người dùng KIỂM TRA & SỬA (KHÔNG tự lưu!)
      setType("expense");
      setAmount(String(data.total));
      setCategoryId(data.suggested_category);
      if (data.date) setDate(data.date);

      const itemsSummary =
        data.items.length > 0
          ? ` (${data.items.slice(0, 2).map((i) => i.name).join(", ")}${
              data.items.length > 2 ? "..." : ""
            })`
          : "";
      setNote(`${data.merchant || "Hóa đơn"}${itemsSummary}`.trim());

      toast.info("Đã đọc hóa đơn — vui lòng kiểm tra lại số tiền và danh mục trước khi lưu.");
    } catch {
      setScanError("Lỗi mạng khi gửi ảnh hóa đơn. Bạn có thể thử lại hoặc nhập tay bên dưới.");
    } finally {
      setScanning(false);
    }
  };

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseInt(amount.replace(/\D/g, ""), 10);
    if (!numAmount || numAmount <= 0) return;

    setSubmitting(true);
    // Chỉ truyền receiptFile nếu người dùng chủ động bật "Đính kèm ảnh vào giao dịch"
    const fileToAttach = attachReceipt && receiptFile ? receiptFile : undefined;

    addTransaction(
      {
        type,
        amount: numAmount,
        categoryId,
        walletId: walletId || wallets[0]?.id || "",
        note,
        date: `${date || new Date().toISOString().slice(0, 10)}T${new Date()
          .toTimeString()
          .slice(0, 8)}`,
      },
      fileToAttach
    );

    setAmount("");
    setNote("");
    clearReceipt();
    setSubmitting(false);
    onClose();
  };

  const formatInput = (val: string) => {
    const num = val.replace(/\D/g, "");
    if (!num) return "";
    return new Intl.NumberFormat("vi-VN").format(Number(num));
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed z-50 bg-[var(--color-surface)] shadow-[var(--shadow-lg)]",
            "left-1/2 -translate-x-1/2",
            "bottom-0 w-full rounded-t-[var(--radius-xl)] md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:w-full md:max-w-md md:rounded-[var(--radius-xl)]",
            "max-h-[90dvh] overflow-y-auto"
          )}
        >
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <Dialog.Title className="text-base font-600 text-[var(--color-text-primary)]">
                Thêm giao dịch
              </Dialog.Title>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowScanner((v) => !v)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-600 border transition-colors",
                    showScanner
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/12 text-[var(--color-accent)]"
                      : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)]"
                  )}
                >
                  <ScanLine size={14} />
                  Quét hóa đơn
                </button>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-[var(--radius-sm)] p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] transition-colors"
                  >
                    <X size={18} strokeWidth={1.75} />
                  </button>
                </Dialog.Close>
              </div>
            </div>

            {/* Khu vực Quét hóa đơn */}
            {showScanner && (
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-3 space-y-3">
                {/* Input file ẩn cho Camera và Thư viện */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    handleFileSelected(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleFileSelected(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />

                {!previewUrl ? (
                  <div className="space-y-2">
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Chụp hoặc chọn ảnh hóa đơn (tối đa 5MB). Ảnh chỉ dùng để đọc chữ và{" "}
                      <strong className="text-[var(--color-text-primary)]">không tự động lưu</strong>.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex items-center justify-center gap-1.5 h-10 rounded-[var(--radius-sm)] bg-[var(--color-accent)] text-white text-xs font-600 active:scale-95 transition-transform"
                      >
                        <Camera size={15} /> Chụp ảnh
                      </button>
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="flex items-center justify-center gap-1.5 h-10 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-600 text-[var(--color-text-primary)] hover:border-[var(--color-accent)]"
                      >
                        <ImageIcon size={15} /> Chọn thư viện
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {/* Ảnh xem trước */}
                    <div className="relative flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt="Xem trước hóa đơn"
                        className="w-16 h-20 object-cover rounded-[var(--radius-sm)] border border-[var(--color-border)] flex-shrink-0"
                      />

                      <div className="flex-1 min-w-0">
                        {scanning ? (
                          <div className="space-y-2">
                            <p className="text-xs font-600 text-[var(--color-accent)]">
                              Đang đọc hóa đơn...
                            </p>
                            <Skeleton className="h-3.5 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        ) : scanError ? (
                          <div className="space-y-1">
                            <p className="text-xs font-600 text-[var(--color-expense)] flex items-center gap-1">
                              <AlertCircle size={13} /> Đọc hóa đơn không thành công
                            </p>
                            <p className="text-[11px] text-[var(--color-text-secondary)]">
                              {scanError}
                            </p>
                          </div>
                        ) : scannedResult ? (
                          <div className="space-y-1">
                            <p className="text-xs font-600 text-[var(--color-income)] flex items-center gap-1">
                              <CheckCircle2 size={13} /> Đã điền vào form — hãy kiểm tra lại
                            </p>
                            <p className="text-[11px] text-[var(--color-text-secondary)] truncate">
                              {scannedResult.merchant || "Hóa đơn"} · {formatMoney(scannedResult.total)}
                            </p>
                            {scannedResult.items.length > 0 && (
                              <p className="text-[10px] text-[var(--color-text-secondary)] truncate">
                                {scannedResult.items.length} món:{" "}
                                {scannedResult.items.map((i) => i.name).join(", ")}
                              </p>
                            )}
                          </div>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={clearReceipt}
                        className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:text-[var(--color-expense)] hover:bg-[var(--color-expense)]/10"
                        title="Xóa ảnh"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Tùy chọn quyền riêng tư: Đính kèm ảnh (mặc định TẮT) */}
                    {!scanning && (
                      <label className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--color-border)]/70 text-[11px] cursor-pointer">
                        <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                          <Paperclip size={12} />
                          Đính kèm ảnh vào giao dịch{" "}
                          {dataMode !== "supabase" || !user
                            ? "(cần đăng nhập Supabase)"
                            : "(lưu riêng tư)"}
                        </span>
                        <input
                          type="checkbox"
                          checked={attachReceipt}
                          disabled={dataMode !== "supabase" || !user}
                          onChange={(e) => setAttachReceipt(e.target.checked)}
                          className="h-3.5 w-3.5 rounded accent-[var(--color-accent)]"
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Type toggle */}
            <div className="flex gap-2 rounded-[var(--radius-md)] bg-[var(--color-bg)] p-1">
              {(["expense", "income"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setType(t);
                    setCategoryId(t === "income" ? "family" : "food");
                  }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 rounded-[var(--radius-sm)] py-2 text-sm font-500 transition-all duration-150",
                    type === t
                      ? t === "expense"
                        ? "bg-[var(--color-expense)] text-white shadow-sm"
                        : "bg-[var(--color-income)] text-white shadow-sm"
                      : "text-[var(--color-text-secondary)]"
                  )}
                >
                  {t === "expense" ? (
                    <ArrowDownCircle size={16} strokeWidth={1.75} />
                  ) : (
                    <ArrowUpCircle size={16} strokeWidth={1.75} />
                  )}
                  {t === "expense" ? "Chi tiêu" : "Thu nhập"}
                </button>
              ))}
            </div>

            {/* Amount */}
            <div>
              <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                Số tiền
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatInput(amount)}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                  placeholder="0"
                  required
                  className={cn(
                    "w-full h-11 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)]",
                    "px-3 pr-8 text-xl font-700 text-[var(--color-text-primary)] tabular-nums",
                    "placeholder:text-[var(--color-text-secondary)]/50 focus:outline-none focus:border-[var(--color-accent)] focus:shadow-[var(--shadow-focus)]",
                    "transition-all duration-150"
                  )}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-secondary)]">
                  ₫
                </span>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-2 block">
                Danh mục
              </label>
              <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-[var(--radius-md)] p-2 text-xs transition-all duration-150",
                      categoryId === cat.id
                        ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)] ring-1 ring-[var(--color-accent)]"
                        : "bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
                    )}
                  >
                    <CategoryIcon categoryId={cat.id} size={18} />
                    <span className="text-[10px] text-center leading-tight truncate w-full">
                      {cat.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                Ghi chú
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Mô tả giao dịch..."
                className={cn(
                  "w-full h-11 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)]",
                  "px-3 text-sm text-[var(--color-text-primary)]",
                  "placeholder:text-[var(--color-text-secondary)]/50 focus:outline-none focus:border-[var(--color-accent)] focus:shadow-[var(--shadow-focus)]",
                  "transition-all duration-150"
                )}
              />
            </div>

            {/* Date & Wallet row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                  Ngày
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={cn(
                    "w-full h-11 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)]",
                    "px-3 text-sm text-[var(--color-text-primary)]",
                    "focus:outline-none focus:border-[var(--color-accent)] focus:shadow-[var(--shadow-focus)]",
                    "transition-all duration-150"
                  )}
                />
              </div>
              <div>
                <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                  Ví
                </label>
                <select
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  className={cn(
                    "w-full h-11 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)]",
                    "px-3 text-sm text-[var(--color-text-primary)]",
                    "focus:outline-none focus:border-[var(--color-accent)] focus:shadow-[var(--shadow-focus)]",
                    "transition-all duration-150"
                  )}
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || scanning || !amount}
              className={cn(
                "w-full h-11 rounded-[var(--radius-md)] bg-[var(--color-accent)] font-600 text-white",
                "transition-all duration-100 active:scale-[0.97]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {submitting
                ? "Đang lưu..."
                : scannedResult
                ? "Xác nhận & Lưu giao dịch"
                : "Lưu giao dịch"}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
