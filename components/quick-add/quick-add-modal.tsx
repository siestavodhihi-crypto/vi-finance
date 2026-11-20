"use client";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  Sparkles,
  CornerDownLeft,
  Calendar,
  Wallet as WalletIcon,
  Tag,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { format, subDays } from "date-fns";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useUIStore } from "@/store/useUIStore";
import { parseQuickAdd } from "@/lib/quick-add-parser";
import { formatMoney } from "@/lib/finance";
import { CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/constants";
import { CategoryId } from "@/types";
import { CategoryIcon } from "@/components/transactions/category-icon";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "trà sữa 35k momo",
  "tiền trọ 2tr5 ck",
  "hôm qua grab 45 nghìn",
  "+1.5tr làm thêm",
];

export function QuickAddModal() {
  const { quickAddOpen, setQuickAddOpen, toggleQuickAdd } = useUIStore();

  // Phím tắt toàn cục Ctrl+K / Cmd+K
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggleQuickAdd();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleQuickAdd]);

  if (!quickAddOpen) return null;
  return <QuickAddModalInner onClose={() => setQuickAddOpen(false)} />;
}

function QuickAddModalInner({ onClose }: { onClose: () => void }) {
  const { wallets, addTransaction } = useFinanceStore();

  const [raw, setRaw] = useState("");
  const [overrideType, setOverrideType] = useState<"income" | "expense" | null>(null);
  const [overrideCategory, setOverrideCategory] = useState<CategoryId | null>(null);
  const [overrideWallet, setOverrideWallet] = useState<string | null>(null);
  const [overrideDate, setOverrideDate] = useState<string | null>(null);
  const [overrideNote, setOverrideNote] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(id);
  }, []);

  const parsed = useMemo(() => parseQuickAdd(raw, wallets), [raw, wallets]);

  const defaultWalletId = wallets.find((w) => !w.isLocked)?.id ?? wallets[0]?.id ?? "";

  const effectiveType = overrideType ?? parsed.type;
  const effectiveCategory = overrideCategory ?? parsed.categoryId;
  const effectiveWalletId = overrideWallet ?? parsed.walletId ?? defaultWalletId;
  const effectiveDate = useMemo(() => {
    if (overrideDate) return overrideDate;
    const d = subDays(new Date(), -parsed.dateOffset);
    return format(d, "yyyy-MM-dd");
  }, [overrideDate, parsed.dateOffset]);
  const effectiveNote = overrideNote !== null ? overrideNote : parsed.note;

  const availableCategories =
    effectiveType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const canSave = parsed.amount !== null && parsed.amount > 0 && Boolean(effectiveWalletId);

  const handleSave = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSave || !parsed.amount) return;

    const nowTime = format(new Date(), "HH:mm:ss");
    addTransaction({
      type: effectiveType,
      amount: parsed.amount,
      categoryId: effectiveCategory,
      walletId: effectiveWalletId,
      note: effectiveNote || CATEGORIES[effectiveCategory]?.name || "",
      date: `${effectiveDate}T${nowTime}`,
    });

    onClose();
  };

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed z-50 left-1/2 -translate-x-1/2",
            "top-[10%] md:top-[18%] w-[calc(100%-24px)] max-w-lg",
            "rounded-[var(--radius-xl)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-lg)]",
            "overflow-hidden"
          )}
        >
          <form onSubmit={handleSave}>
            {/* Header + Input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--color-border)]">
              <Sparkles size={18} strokeWidth={2} className="text-[var(--color-accent)] flex-shrink-0" />
              <Dialog.Title className="sr-only">Nhập nhanh giao dịch</Dialog.Title>
              <input
                ref={inputRef}
                type="text"
                value={raw}
                onChange={(e) => {
                  setRaw(e.target.value);
                  // Reset override khi người dùng tiếp tục gõ câu mới
                  setOverrideType(null);
                  setOverrideCategory(null);
                  setOverrideWallet(null);
                  setOverrideDate(null);
                  setOverrideNote(null);
                }}
                placeholder='Nhập nhanh: "trà sữa 35k momo", "tiền trọ 2tr5 ck"...'
                className="flex-1 bg-transparent text-base font-500 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/60 focus:outline-none"
              />
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-[var(--radius-sm)] p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
                  aria-label="Đóng"
                >
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>

            {/* Body: Preview tags hoặc gợi ý câu mẫu */}
            <div className="p-4 space-y-4">
              {!raw.trim() ? (
                <div className="space-y-2.5">
                  <p className="text-xs font-500 text-[var(--color-text-secondary)]">
                    Thử nhập nhanh (bấm để điền thử):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLES.map((ex) => (
                      <button
                        key={ex}
                        type="button"
                        onClick={() => {
                          setRaw(ex);
                          inputRef.current?.focus();
                        }}
                        className="px-3 py-1.5 rounded-full text-xs font-500 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Số tiền nhận diện */}
                  <div className="flex items-center justify-between rounded-[var(--radius-md)] bg-[var(--color-bg)] px-3.5 py-2.5 border border-[var(--color-border)]">
                    <div>
                      <p className="text-[11px] font-500 text-[var(--color-text-secondary)]">
                        Số tiền nhận diện
                      </p>
                      {parsed.amount ? (
                        <p
                          className={cn(
                            "text-2xl font-800 tabular-nums",
                            effectiveType === "income"
                              ? "text-[var(--color-income)]"
                              : "text-[var(--color-expense)]"
                          )}
                        >
                          {effectiveType === "income" ? "+" : "-"}
                          {formatMoney(parsed.amount)}
                        </p>
                      ) : (
                        <p className="text-sm font-500 text-[var(--color-text-secondary)]">
                          Chưa thấy số tiền (vd: 35k, 1tr5, 50 nghìn...)
                        </p>
                      )}
                    </div>

                    {/* Toggle Thu / Chi */}
                    <button
                      type="button"
                      onClick={() => {
                        const next = effectiveType === "expense" ? "income" : "expense";
                        setOverrideType(next);
                        if (next === "income" && CATEGORIES[effectiveCategory].type === "expense") {
                          setOverrideCategory("other");
                        } else if (next === "expense" && CATEGORIES[effectiveCategory].type === "income") {
                          setOverrideCategory("other");
                        }
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-600 transition-colors",
                        effectiveType === "income"
                          ? "bg-[var(--color-income)]/15 text-[var(--color-income)]"
                          : "bg-[var(--color-expense)]/15 text-[var(--color-expense)]"
                      )}
                      title="Bấm để đổi Thu / Chi"
                    >
                      {effectiveType === "income" ? (
                        <ArrowUpCircle size={14} />
                      ) : (
                        <ArrowDownCircle size={14} />
                      )}
                      {effectiveType === "income" ? "Thu nhập" : "Chi tiêu"}
                    </button>
                  </div>

                  {/* Preview Tags có thể chỉnh trực tiếp */}
                  <div className="flex flex-wrap gap-2">
                    {/* Tag Danh mục */}
                    <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-bg)] border border-[var(--color-border)] text-xs hover:border-[var(--color-accent)] cursor-pointer">
                      <CategoryIcon categoryId={effectiveCategory} size={14} />
                      <select
                        value={effectiveCategory}
                        onChange={(e) => setOverrideCategory(e.target.value as CategoryId)}
                        className="bg-transparent font-600 text-[var(--color-text-primary)] focus:outline-none cursor-pointer"
                        aria-label="Danh mục"
                      >
                        {availableCategories.map((c) => (
                          <option key={c.id} value={c.id} className="bg-[var(--color-surface)]">
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    {/* Tag Ví */}
                    <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-bg)] border border-[var(--color-border)] text-xs hover:border-[var(--color-accent)] cursor-pointer">
                      <WalletIcon size={14} className="text-[var(--color-accent)]" />
                      <select
                        value={effectiveWalletId}
                        onChange={(e) => setOverrideWallet(e.target.value)}
                        className="bg-transparent font-600 text-[var(--color-text-primary)] focus:outline-none cursor-pointer"
                        aria-label="Ví"
                      >
                        {wallets.map((w) => (
                          <option key={w.id} value={w.id} className="bg-[var(--color-surface)]">
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    {/* Tag Ngày */}
                    <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-bg)] border border-[var(--color-border)] text-xs hover:border-[var(--color-accent)] cursor-pointer">
                      <Calendar size={14} className="text-[var(--color-text-secondary)]" />
                      <input
                        type="date"
                        value={effectiveDate}
                        onChange={(e) => setOverrideDate(e.target.value)}
                        className="bg-transparent font-500 text-[var(--color-text-primary)] focus:outline-none cursor-pointer"
                        aria-label="Ngày"
                      />
                    </label>
                  </div>

                  {/* Ghi chú */}
                  <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2">
                    <Tag size={13} className="text-[var(--color-text-secondary)] flex-shrink-0" />
                    <input
                      type="text"
                      value={effectiveNote}
                      onChange={(e) => setOverrideNote(e.target.value)}
                      placeholder="Ghi chú giao dịch..."
                      className="flex-1 bg-transparent text-xs text-[var(--color-text-primary)] focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-bg)]/60 border-t border-[var(--color-border)]">
              <span className="text-[11px] text-[var(--color-text-secondary)] hidden sm:inline">
                Phím tắt: <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] font-600">Ctrl+K</kbd> mở · <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] font-600">Enter</kbd> lưu
              </span>
              <button
                type="submit"
                disabled={!canSave}
                className={cn(
                  "ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white text-xs font-700",
                  "active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                )}
              >
                <CornerDownLeft size={14} />
                <span>Lưu giao dịch</span>
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
