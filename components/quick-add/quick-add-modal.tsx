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
  Wand2,
  Trash2,
  Loader2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { format, subDays } from "date-fns";
import { toast } from "sonner";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useUIStore } from "@/store/useUIStore";
import { parseQuickAdd } from "@/lib/quick-add-parser";
import { formatMoney, getVietnamDateString } from "@/lib/finance";
import { CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/constants";
import { CategoryId } from "@/types";
import { ParsedAiTx } from "@/lib/ai-quick-add";
import { getSupabaseClient } from "@/lib/supabase/client";
import { CategoryIcon } from "@/components/transactions/category-icon";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "hôm nay đổ xăng 70k",
  "trà sữa 35k momo",
  "sáng ăn phở 40k, chiều trà sữa 55k momo",
  "+1.5tr làm thêm",
];

export function QuickAddModal() {
  const { quickAddOpen, setQuickAddOpen, toggleQuickAdd } = useUIStore();

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

  // AI multi-item / smart parsing state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiItems, setAiItems] = useState<ParsedAiTx[] | null>(null);

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

  const handleAskAi = async () => {
    if (!raw.trim() || aiLoading) return;
    setAiLoading(true);
    setAiError(null);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const sb = getSupabaseClient();
      if (sb) {
        const { data } = await sb.auth.getSession();
        if (data.session?.access_token) {
          headers["Authorization"] = `Bearer ${data.session.access_token}`;
        }
      }

      const res = await fetch("/api/ai-parse-tx", {
        method: "POST",
        headers,
        body: JSON.stringify({
          text: raw.trim(),
          today: getVietnamDateString(),
          wallets: wallets.map((w) => ({ id: w.id, name: w.name })),
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setAiError(json.error || "AI không nhận diện được câu này.");
        return;
      }

      const items = json.items as ParsedAiTx[];
      if (items.length === 1) {
        // Điền thẳng vào preview tag cho người dùng kiểm tra & bấm Enter lưu
        const it = items[0];
        setAiItems(null);
        setOverrideType(it.type);
        setOverrideCategory(it.categoryId);
        setOverrideWallet(it.walletId ?? defaultWalletId);
        setOverrideDate(it.date);
        setOverrideNote(it.note);
        toast.info("AI đã nhận diện xong — kiểm tra lại rồi bấm Lưu nhé!");
      } else {
        setAiItems(items);
        toast.info(`AI tách được ${items.length} giao dịch — kiểm tra rồi bấm Lưu tất cả!`);
      }
    } catch {
      setAiError("Lỗi kết nối AI. Bạn vẫn có thể lưu trực tiếp bằng nhận diện nhanh.");
    } finally {
      setAiLoading(false);
    }
  };

  const canSaveSingle = parsed.amount !== null && parsed.amount > 0 && Boolean(effectiveWalletId);
  const canSaveMulti = Boolean(aiItems && aiItems.length > 0 && defaultWalletId);
  const canSave = aiItems ? canSaveMulti : canSaveSingle;

  const handleSave = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSave) return;

    const nowTime = format(new Date(), "HH:mm:ss");

    if (aiItems && aiItems.length > 0) {
      for (const it of aiItems) {
        addTransaction({
          type: it.type,
          amount: it.amount,
          categoryId: it.categoryId,
          walletId: it.walletId || defaultWalletId,
          note: it.note || CATEGORIES[it.categoryId]?.name || "",
          date: `${it.date}T${nowTime}`,
        });
      }
      onClose();
      return;
    }

    if (!parsed.amount) return;
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
            "top-[8%] md:top-[15%] w-[calc(100%-24px)] max-w-lg",
            "rounded-[var(--radius-xl)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-lg)]",
            "overflow-hidden max-h-[85dvh] flex flex-col"
          )}
        >
          <form onSubmit={handleSave} className="flex flex-col overflow-hidden">
            {/* Header + Input */}
            <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-[var(--color-border)]">
              <Sparkles size={18} strokeWidth={2} className="text-[var(--color-accent-text)] flex-shrink-0" />
              <Dialog.Title className="sr-only">Nhập nhanh giao dịch</Dialog.Title>
              <input
                ref={inputRef}
                type="text"
                value={raw}
                onChange={(e) => {
                  setRaw(e.target.value);
                  setOverrideType(null);
                  setOverrideCategory(null);
                  setOverrideWallet(null);
                  setOverrideDate(null);
                  setOverrideNote(null);
                  setAiItems(null);
                  setAiError(null);
                }}
                placeholder='Nhập tự nhiên: "hôm nay đổ xăng 70k", "sáng phở 40k, chiều trà sữa 55k"...'
                className="flex-1 bg-transparent text-sm sm:text-base font-500 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/60 focus:outline-none"
              />
              {raw.trim() && (
                <button
                  type="button"
                  onClick={handleAskAi}
                  disabled={aiLoading}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-accent-soft)] text-[var(--color-accent-text)] text-xs font-700 hover:opacity-90 flex-shrink-0 disabled:opacity-50"
                  title="Nhờ AI Gemini hiểu câu phức tạp hoặc nhiều món cùng lúc"
                >
                  {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                  <span>AI</span>
                </button>
              )}
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

            {/* Body */}
            <div className="p-4 space-y-3 overflow-y-auto">
              {aiError && (
                <p className="text-xs text-[var(--color-expense)] bg-[var(--color-expense)]/8 border border-[var(--color-expense)]/25 rounded-[var(--radius-sm)] px-3 py-2">
                  {aiError}
                </p>
              )}

              {!raw.trim() ? (
                <div className="space-y-2.5">
                  <p className="text-xs font-500 text-[var(--color-text-secondary)]">
                    Gõ câu tiếng Việt bất kỳ (hoặc bấm nút <strong>AI</strong> nếu câu dài / nhiều khoản):
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
                        className="px-3 py-1.5 rounded-full text-xs font-500 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent-text)] transition-colors"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              ) : aiItems ? (
                /* Multi-transaction preview from AI */
                <div className="space-y-2">
                  <p className="text-xs font-700 text-[var(--color-accent-text)]">
                    AI nhận diện được {aiItems.length} giao dịch:
                  </p>
                  {aiItems.map((it, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] bg-[var(--color-bg)] border border-[var(--color-border)] px-3 py-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CategoryIcon categoryId={it.categoryId} size={16} />
                        <div className="min-w-0">
                          <p className="font-600 text-[var(--color-text-primary)] truncate">
                            {it.note || CATEGORIES[it.categoryId]?.name}
                          </p>
                          <p className="text-[11px] text-[var(--color-text-secondary)]">
                            {CATEGORIES[it.categoryId]?.name} ·{" "}
                            {wallets.find((w) => w.id === (it.walletId || defaultWalletId))?.name} ·{" "}
                            {it.date}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={cn(
                            "font-700 tabular-nums",
                            it.type === "income"
                              ? "text-[var(--color-income)]"
                              : "text-[var(--color-expense)]"
                          )}
                        >
                          {it.type === "income" ? "+" : "-"}
                          {formatMoney(it.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setAiItems((prev) => {
                              if (!prev) return null;
                              const next = prev.filter((_, i) => i !== idx);
                              return next.length > 0 ? next : null;
                            })
                          }
                          aria-label="Bỏ giao dịch này"
                          className="p-1 text-[var(--color-expense)] hover:bg-[var(--color-expense)]/10 rounded"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Single transaction instant preview */
                <div className="space-y-3">
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
                        <p className="text-xs font-500 text-[var(--color-text-secondary)]">
                          Chưa thấy số tiền — gõ thêm (vd: 70k) hoặc bấm nút <strong>AI</strong>
                        </p>
                      )}
                    </div>

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

                  {/* Preview Tags */}
                  <div className="flex flex-wrap gap-2">
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

                    <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-bg)] border border-[var(--color-border)] text-xs hover:border-[var(--color-accent)] cursor-pointer">
                      <WalletIcon size={14} className="text-[var(--color-accent-text)]" />
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
                Bấm <strong>AI</strong> cho câu dài/nhiều món · <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] font-600">Enter</kbd> lưu
              </span>
              <button
                type="submit"
                disabled={!canSave || aiLoading}
                className={cn(
                  "ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-[var(--color-accent-fg)] text-xs font-700",
                  "active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                )}
              >
                <CornerDownLeft size={14} />
                <span>
                  {aiItems ? `Lưu tất cả (${aiItems.length})` : "Lưu giao dịch"}
                </span>
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
