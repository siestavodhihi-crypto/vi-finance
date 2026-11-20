"use client";
import { useState } from "react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useHydrated } from "@/lib/useHydrated";
import { PageSkeleton } from "@/components/ui/skeleton";
import { formatMoney, getCurrentMonth } from "@/lib/finance";
import { RecurringBill } from "@/types";
import { CATEGORIES } from "@/lib/constants";
import { CategoryIcon } from "@/components/transactions/category-icon";
import { BillModal } from "@/components/bills/bill-modal";
import {
  CalendarClock,
  Plus,
  CheckCircle2,
  Clock,
  Pencil,
  Trash2,
  Undo2,
  AlertCircle,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

export default function RecurringBillsPage() {
  const hydrated = useHydrated();
  const { recurringBills, wallets, payBill, unpayBill, deleteBill, settings } =
    useFinanceStore();
  const { privacyMode } = settings;

  const [modalOpen, setModalOpen] = useState(false);
  const [billToEdit, setBillToEdit] = useState<RecurringBill | null>(null);
  const [billToDelete, setBillToDelete] = useState<RecurringBill | null>(null);

  const currentMonth = getCurrentMonth();

  const totalBillsAmount = recurringBills.reduce((s, b) => s + b.amount, 0);

  const paidBills = recurringBills.filter((b) =>
    b.paidMonths.includes(currentMonth)
  );
  const unpaidBills = recurringBills.filter(
    (b) => !b.paidMonths.includes(currentMonth)
  );

  const paidAmount = paidBills.reduce((s, b) => s + b.amount, 0);
  const unpaidAmount = unpaidBills.reduce((s, b) => s + b.amount, 0);

  if (!hydrated) {
    return <PageSkeleton />;
  }

  const handleEdit = (b: RecurringBill) => {
    setBillToEdit(b);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setBillToEdit(null);
    setModalOpen(true);
  };

  return (
    <div className="pb-24 md:pb-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-800 text-[var(--color-text-primary)]">
            Hóa đơn định kỳ
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Theo dõi tiền phòng trọ, điện nước, mạng Internet tháng {currentMonth.slice(5)}
          </p>
        </div>

        <button
          onClick={handleCreate}
          className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3.5 py-2 text-xs font-600 text-white shadow-sm active:scale-95 transition-transform"
        >
          <Plus size={16} strokeWidth={2} />
          <span>Thêm hóa đơn</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total */}
        <div className="card p-4">
          <p className="text-xs text-[var(--color-text-secondary)] font-500 mb-1">
            Tổng hóa đơn định kỳ ({recurringBills.length})
          </p>
          <p className="text-2xl font-800 text-[var(--color-text-primary)] tabular-nums">
            {privacyMode ? "••••• ₫" : formatMoney(totalBillsAmount)}
          </p>
        </div>

        {/* Paid */}
        <div className="card p-4 border-l-4 border-l-[var(--color-income)]">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle2 size={14} className="text-[var(--color-income)]" />
            <p className="text-xs text-[var(--color-income)] font-600">
              Đã thanh toán ({paidBills.length})
            </p>
          </div>
          <p className="text-xl font-700 text-[var(--color-income)] tabular-nums">
            {privacyMode ? "••••• ₫" : formatMoney(paidAmount)}
          </p>
        </div>

        {/* Unpaid */}
        <div className="card p-4 border-l-4 border-l-[var(--color-expense)]">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock size={14} className="text-[var(--color-expense)]" />
            <p className="text-xs text-[var(--color-expense)] font-600">
              Chưa thanh toán ({unpaidBills.length})
            </p>
          </div>
          <p className="text-xl font-700 text-[var(--color-expense)] tabular-nums">
            {privacyMode ? "••••• ₫" : formatMoney(unpaidAmount)}
          </p>
          <p className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">
            Được giữ lại an toàn trong Safe-to-Spend
          </p>
        </div>
      </div>

      {/* Bills List */}
      {recurringBills.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center p-8 card">
          <CalendarClock size={48} strokeWidth={1.25} className="text-[var(--color-border)] mb-3" />
          <h2 className="text-base font-600 text-[var(--color-text-primary)] mb-1">
            Chưa có hóa đơn định kỳ
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] mb-4">
            Thêm tiền trọ, điện nước, mạng Internet để hệ thống tự động giữ quỹ
          </p>
          <button
            onClick={handleCreate}
            className="px-3.5 py-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white text-xs font-600 shadow-sm"
          >
            + Thêm hóa đơn đầu tiên
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {recurringBills.map((bill) => {
            const isPaid = bill.paidMonths.includes(currentMonth);
            const cat = CATEGORIES[bill.categoryId];
            const defaultWallet = wallets.find((w) => w.id === bill.walletId);

            return (
              <div
                key={bill.id}
                className={cn(
                  "card p-4 space-y-3 card-hover transition-all",
                  isPaid
                    ? "border-l-4 border-l-[var(--color-income)]"
                    : "border-l-4 border-l-[var(--color-expense)]"
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Info */}
                  <div className="flex items-center gap-3">
                    <div
                      className="h-11 w-11 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${cat?.color ?? "#8A8780"}20` }}
                    >
                      <CategoryIcon
                        categoryId={bill.categoryId}
                        size={22}
                        strokeWidth={1.75}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-700 text-[var(--color-text-primary)]">
                          {bill.name}
                        </h3>
                        {isPaid ? (
                          <span className="flex items-center gap-1 text-[10px] font-700 text-[var(--color-income)] bg-[var(--color-income)]/15 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={11} /> Đã trả tháng này
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-700 text-[var(--color-expense)] bg-[var(--color-expense)]/15 px-2 py-0.5 rounded-full">
                            <Clock size={11} /> Hạn ngày {bill.dueDay}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[var(--color-text-secondary)]">
                        Hàng tháng ngày {bill.dueDay} · Trừ từ:{" "}
                        <span className="font-500 text-[var(--color-text-primary)]">
                          {defaultWallet?.name || "Ví chính"}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Amount & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-[var(--color-border)]/50">
                    <span className="text-base font-800 text-[var(--color-text-primary)] tabular-nums">
                      {privacyMode ? "••••• ₫" : formatMoney(bill.amount)}
                    </span>

                    <div className="flex items-center gap-2">
                      {/* One-click Pay button */}
                      {isPaid ? (
                        <button
                          onClick={() => unpayBill(bill.id, currentMonth)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] text-xs font-500 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                          title="Hoàn tác trạng thái chưa trả"
                        >
                          <Undo2 size={12} />
                          <span>Hủy</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => payBill(bill.id, currentMonth)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-income)] text-white text-xs font-700 shadow-sm active:scale-95 transition-transform"
                        >
                          <CheckCircle2 size={14} />
                          <span>Đã trả</span>
                        </button>
                      )}

                      {/* Edit / Delete */}
                      <button
                        onClick={() => handleEdit(bill)}
                        className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
                        title="Sửa hóa đơn"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setBillToDelete(bill)}
                        className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-expense)] hover:bg-[var(--color-expense)]/10"
                        title="Xóa hóa đơn"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {bill.note && (
                  <p className="text-[11px] text-[var(--color-text-secondary)] italic border-t border-[var(--color-border)]/40 pt-2">
                    {bill.note}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <BillModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        billToEdit={billToEdit}
      />

      {/* Confirm Delete Dialog */}
      <Dialog.Root open={Boolean(billToDelete)} onOpenChange={(o) => !o && setBillToDelete(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed z-50 bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm rounded-t-[var(--radius-xl)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-lg)] md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-[var(--radius-xl)]">
            <Dialog.Title className="text-base font-600 text-[var(--color-text-primary)] mb-2">
              Xóa hóa đơn {billToDelete?.name}?
            </Dialog.Title>
            <Dialog.Description className="text-xs text-[var(--color-text-secondary)] mb-5">
              Hóa đơn số tiền {billToDelete && formatMoney(billToDelete.amount)} sẽ bị xóa khỏi danh sách theo dõi định kỳ.
            </Dialog.Description>
            <div className="flex gap-3">
              <Dialog.Close asChild>
                <button className="flex-1 h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] text-xs font-500 text-[var(--color-text-primary)] hover:bg-[var(--color-border)]">
                  Hủy
                </button>
              </Dialog.Close>
              <button
                onClick={() => {
                  if (billToDelete) deleteBill(billToDelete.id);
                  setBillToDelete(null);
                }}
                className="flex-1 h-10 rounded-[var(--radius-md)] bg-[var(--color-expense)]/10 text-xs font-600 text-[var(--color-expense)] hover:bg-[var(--color-expense)]/20"
              >
                Xóa
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
