"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import { Wallet, CalendarClock, PieChart, Check, ArrowRight, ArrowLeft, X } from "lucide-react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useUIStore } from "@/store/useUIStore";
import { getCurrentMonth } from "@/lib/finance";
import { CategoryId } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "vang-onboarding-done";

export function OnboardingWizard() {
  const { onboardingOpen, setOnboardingOpen } = useUIStore();
  const { transactions, wallets, syncLoading, dataMode } = useFinanceStore();

  // Tự mở cho người dùng mới (0 giao dịch, chưa hoàn tất onboarding)
  useEffect(() => {
    if (syncLoading) return;
    if (typeof window === "undefined") return;
    const done = localStorage.getItem(STORAGE_KEY) === "1";
    if (!done && dataMode === "supabase" && transactions.length === 0 && wallets.length > 0) {
      setOnboardingOpen(true);
    }
  }, [syncLoading, dataMode, transactions.length, wallets.length, setOnboardingOpen]);

  if (!onboardingOpen) return null;

  const markDone = () => {
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, "1");
    setOnboardingOpen(false);
  };

  return <OnboardingWizardInner onClose={markDone} />;
}

function OnboardingWizardInner({ onClose }: { onClose: () => void }) {
  const { wallets, updateWallet, addWallet, addBill, addBudget } = useFinanceStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Bước 1: Số dư ví ban đầu
  const [walletBalances, setWalletBalances] = useState<Record<string, string>>(() =>
    Object.fromEntries(wallets.slice(0, 3).map((w) => [w.id, w.balance ? String(w.balance) : ""]))
  );

  // Bước 2: Hóa đơn cố định
  const [billName, setBillName] = useState("Tiền phòng trọ");
  const [billAmount, setBillAmount] = useState("2500000");
  const [billDueDay, setBillDueDay] = useState(5);
  const [billCategory, setBillCategory] = useState<CategoryId>("rent");

  // Bước 3: Ngân sách đầu tiên
  const [budgetCategory, setBudgetCategory] = useState<CategoryId>("food");
  const [budgetLimit, setBudgetLimit] = useState("1500000");

  const formatInput = (val: string) => {
    const num = val.replace(/\D/g, "");
    return num ? new Intl.NumberFormat("vi-VN").format(Number(num)) : "";
  };

  const handleSaveStep1 = () => {
    if (wallets.length === 0) {
      addWallet({
        name: "Tiền mặt",
        balance: 0,
        initialBalance: 0,
        icon: "Wallet",
        color: "#C8A44A",
        isLocked: false,
      });
    } else {
      for (const w of wallets.slice(0, 3)) {
        const raw = walletBalances[w.id];
        if (raw !== undefined && raw !== "") {
          const num = parseInt(raw.replace(/\D/g, "") || "0", 10);
          if (num !== w.balance) {
            updateWallet(w.id, { balance: num, initialBalance: num });
          }
        }
      }
    }
    setStep(2);
  };

  const handleSaveStep2 = () => {
    const amt = parseInt(billAmount.replace(/\D/g, "") || "0", 10);
    if (billName.trim() && amt > 0) {
      addBill({
        name: billName.trim(),
        amount: amt,
        categoryId: billCategory,
        dueDay: Math.min(31, Math.max(1, Number(billDueDay) || 5)),
        walletId: wallets[0]?.id ?? "",
      });
    }
    setStep(3);
  };

  const handleFinish = () => {
    const lim = parseInt(budgetLimit.replace(/\D/g, "") || "0", 10);
    if (lim > 0) {
      addBudget({
        categoryId: budgetCategory,
        limit: lim,
        month: getCurrentMonth(),
      });
    }
    toast.success("Thiết lập xong! Chào mừng bạn đến với Vàng.");
    onClose();
  };

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-24px)] max-w-md rounded-[var(--radius-xl)] bg-[var(--color-surface)] border border-[var(--color-border)] p-5 shadow-[var(--shadow-lg)] space-y-5 max-h-[90dvh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-700 uppercase tracking-wider text-[var(--color-accent-text)]">
                Thiết lập nhanh · Bước {step} / 3
              </p>
              <Dialog.Title className="text-base font-800 text-[var(--color-text-primary)]">
                {step === 1
                  ? "Nhập số dư ví hiện tại"
                  : step === 2
                  ? "Thêm hóa đơn cố định"
                  : "Đặt ngân sách đầu tiên"}
              </Dialog.Title>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng thiết lập nhanh"
              className="touch-target flex items-center justify-center rounded-[var(--radius-sm)] p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
            >
              <X size={18} />
            </button>
          </div>

          {/* Stepper indicator */}
          <div className="grid grid-cols-3 gap-2" aria-label="Tiến độ thiết lập">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={cn(
                  "h-1.5 rounded-full transition-colors",
                  s <= step ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"
                )}
              />
            ))}
          </div>

          {/* Step 1: Số dư ví */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                <Wallet size={15} className="text-[var(--color-accent-text)] flex-shrink-0" />
                <span>Nhập nhanh số tiền bạn đang có để hệ thống tính Safe-to-Spend chính xác.</span>
              </div>

              {wallets.slice(0, 3).map((w) => (
                <div key={w.id}>
                  <label
                    htmlFor={`ob-w-${w.id}`}
                    className="text-xs font-600 text-[var(--color-text-primary)] mb-1 block"
                  >
                    {w.name}
                  </label>
                  <div className="relative">
                    <input
                      id={`ob-w-${w.id}`}
                      type="text"
                      inputMode="numeric"
                      value={formatInput(walletBalances[w.id] ?? "")}
                      onChange={(e) =>
                        setWalletBalances((prev) => ({
                          ...prev,
                          [w.id]: e.target.value.replace(/\D/g, ""),
                        }))
                      }
                      placeholder="0"
                      className="w-full h-11 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 pr-8 text-base font-700 tabular-nums text-[var(--color-text-primary)]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-secondary)]">
                      ₫
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 2: Hóa đơn cố định */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                <CalendarClock size={15} className="text-[var(--color-accent-text)] flex-shrink-0" />
                <span>Các khoản cố định hàng tháng sẽ được giữ riêng trong Safe-to-Spend.</span>
              </div>

              {/* Quick student presets */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: "Tiền phòng trọ", amt: "2500000", cat: "rent" as CategoryId, day: 5 },
                  { name: "Điện nước", amt: "320000", cat: "utilities" as CategoryId, day: 10 },
                  { name: "Mạng Internet", amt: "110000", cat: "internet" as CategoryId, day: 15 },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setBillName(preset.name);
                      setBillAmount(preset.amt);
                      setBillCategory(preset.cat);
                      setBillDueDay(preset.day);
                    }}
                    className="px-2.5 py-1.5 rounded-full text-xs font-500 bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-accent)]"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>

              <div>
                <label htmlFor="ob-bill-name" className="text-xs font-600 text-[var(--color-text-primary)] mb-1 block">
                  Tên hóa đơn
                </label>
                <input
                  id="ob-bill-name"
                  type="text"
                  value={billName}
                  onChange={(e) => setBillName(e.target.value)}
                  placeholder="Tiền trọ, điện nước..."
                  className="w-full h-11 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm text-[var(--color-text-primary)]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label htmlFor="ob-bill-amt" className="text-xs font-600 text-[var(--color-text-primary)] mb-1 block">
                    Số tiền / tháng
                  </label>
                  <div className="relative">
                    <input
                      id="ob-bill-amt"
                      type="text"
                      inputMode="numeric"
                      value={formatInput(billAmount)}
                      onChange={(e) => setBillAmount(e.target.value.replace(/\D/g, ""))}
                      placeholder="0"
                      className="w-full h-11 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 pr-7 text-base font-700 tabular-nums text-[var(--color-text-primary)]"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-secondary)]">
                      ₫
                    </span>
                  </div>
                </div>
                <div>
                  <label htmlFor="ob-bill-day" className="text-xs font-600 text-[var(--color-text-primary)] mb-1 block">
                    Ngày đóng
                  </label>
                  <input
                    id="ob-bill-day"
                    type="number"
                    min={1}
                    max={31}
                    value={billDueDay}
                    onChange={(e) => setBillDueDay(Number(e.target.value))}
                    className="w-full h-11 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm tabular-nums text-[var(--color-text-primary)]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Ngân sách đầu tiên */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                <PieChart size={15} className="text-[var(--color-accent-text)] flex-shrink-0" />
                <span>Đặt hạn mức tháng cho khoản hay tiêu nhất — app sẽ nhắc khi chạm 80%.</span>
              </div>

              <div>
                <label htmlFor="ob-b-cat" className="text-xs font-600 text-[var(--color-text-primary)] mb-1 block">
                  Danh mục
                </label>
                <select
                  id="ob-b-cat"
                  value={budgetCategory}
                  onChange={(e) => setBudgetCategory(e.target.value as CategoryId)}
                  className="w-full h-11 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm text-[var(--color-text-primary)]"
                >
                  <option value="food">Ăn uống</option>
                  <option value="transport">Di chuyển</option>
                  <option value="shopping">Mua sắm</option>
                  <option value="entertainment">Giải trí</option>
                </select>
              </div>

              <div>
                <label htmlFor="ob-b-lim" className="text-xs font-600 text-[var(--color-text-primary)] mb-1 block">
                  Hạn mức tháng này
                </label>
                <div className="relative">
                  <input
                    id="ob-b-lim"
                    type="text"
                    inputMode="numeric"
                    value={formatInput(budgetLimit)}
                    onChange={(e) => setBudgetLimit(e.target.value.replace(/\D/g, ""))}
                    placeholder="1.500.000"
                    className="w-full h-11 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 pr-8 text-base font-700 tabular-nums text-[var(--color-text-primary)]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-secondary)]">
                    ₫
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Footer buttons (>= 44px touch target) */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--color-border)]">
            {step === 1 ? (
              <button
                type="button"
                onClick={onClose}
                className="h-11 px-3 rounded-[var(--radius-md)] text-xs font-600 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
              >
                Bỏ qua
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
                className="h-11 px-3.5 rounded-[var(--radius-md)] border border-[var(--color-border)] text-xs font-600 text-[var(--color-text-primary)] inline-flex items-center gap-1"
              >
                <ArrowLeft size={14} /> Quay lại
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={step === 1 ? handleSaveStep1 : handleSaveStep2}
                className="h-11 px-4 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-[var(--color-accent-fg)] text-xs font-700 inline-flex items-center gap-1.5 active:scale-95 transition-transform"
              >
                Tiếp tục <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="h-11 px-4 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-[var(--color-accent-fg)] text-xs font-700 inline-flex items-center gap-1.5 active:scale-95 transition-transform"
              >
                <Check size={15} /> Hoàn tất
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
