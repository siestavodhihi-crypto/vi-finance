/**
 * store/useFinanceStore.ts
 * Zustand store with localStorage persistence
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  Transaction,
  Wallet,
  Budget,
  RecurringBill,
  AppSettings,
} from "@/types";
import {
  SAMPLE_TRANSACTIONS,
  SAMPLE_WALLETS,
  SAMPLE_BUDGETS,
  SAMPLE_RECURRING_BILLS,
} from "@/lib/sample-data";
import { DEFAULT_DAILY_LIMIT } from "@/lib/constants";
import { format } from "date-fns";

interface FinanceState {
  transactions: Transaction[];
  wallets: Wallet[];
  budgets: Budget[];
  recurringBills: RecurringBill[];
  settings: AppSettings;

  // Actions — Transactions
  addTransaction: (tx: Omit<Transaction, "id" | "createdAt">) => void;
  deleteTransaction: (id: string) => void;
  updateTransaction: (id: string, data: Partial<Transaction>) => void;

  // Actions — Transfers (chuyển tiền giữa các ví, KHÔNG tính vào thu/chi)
  transferMoney: (params: {
    fromWalletId: string;
    toWalletId: string;
    amount: number;
    note?: string;
    date?: string;
  }) => void;

  // Actions — Wallets
  addWallet: (wallet: Omit<Wallet, "id">) => void;
  updateWallet: (id: string, data: Partial<Wallet>) => void;
  deleteWallet: (id: string) => void;

  // Actions — Budgets
  addBudget: (budget: Omit<Budget, "id">) => void;
  updateBudget: (id: string, limit: number) => void;
  deleteBudget: (id: string) => void;

  // Actions — Recurring Bills (Hóa đơn định kỳ)
  addBill: (bill: Omit<RecurringBill, "id" | "paidMonths">) => void;
  updateBill: (id: string, data: Partial<RecurringBill>) => void;
  deleteBill: (id: string) => void;
  payBill: (billId: string, monthKey?: string) => void;
  unpayBill: (billId: string, monthKey?: string) => void;

  // Actions — Settings
  updateSettings: (settings: Partial<AppSettings>) => void;
  togglePrivacyMode: () => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      transactions: SAMPLE_TRANSACTIONS,
      wallets: SAMPLE_WALLETS,
      budgets: SAMPLE_BUDGETS,
      recurringBills: SAMPLE_RECURRING_BILLS,
      settings: {
        privacyMode: false,
        theme: "system",
        currency: "VND",
        dailyLimit: DEFAULT_DAILY_LIMIT,
        lockedSavings: 0,
      },

      // ── Transactions ──────────────────────────────────────────
      addTransaction: (tx) =>
        set((state) => {
          const id = generateId();
          const newTx: Transaction = {
            ...tx,
            id,
            createdAt: new Date().toISOString(),
          };

          // Cập nhật số dư ví
          const wallets = state.wallets.map((w) => {
            if (tx.type === "transfer") {
              if (w.id === tx.walletId) return { ...w, balance: w.balance - tx.amount };
              if (w.id === tx.toWalletId) return { ...w, balance: w.balance + tx.amount };
              return w;
            }
            if (w.id === tx.walletId) {
              const delta = tx.type === "income" ? tx.amount : -tx.amount;
              return { ...w, balance: w.balance + delta };
            }
            return w;
          });

          return {
            transactions: [newTx, ...state.transactions],
            wallets,
          };
        }),

      deleteTransaction: (id) =>
        set((state) => {
          const tx = state.transactions.find((t) => t.id === id);
          if (!tx) return state;

          // Hoàn lại số dư ví
          const wallets = state.wallets.map((w) => {
            if (tx.type === "transfer") {
              if (w.id === tx.walletId) return { ...w, balance: w.balance + tx.amount };
              if (w.id === tx.toWalletId) return { ...w, balance: w.balance - tx.amount };
              return w;
            }
            if (w.id === tx.walletId) {
              const delta = tx.type === "income" ? -tx.amount : tx.amount;
              return { ...w, balance: w.balance + delta };
            }
            return w;
          });

          return {
            transactions: state.transactions.filter((t) => t.id !== id),
            wallets,
          };
        }),

      updateTransaction: (id, data) =>
        set((state) => {
          const oldTx = state.transactions.find((t) => t.id === id);
          if (!oldTx) return state;

          // Tạo snapshot ví sau khi hoàn lại giao dịch cũ
          let adjustedWallets = state.wallets.map((w) => {
            if (oldTx.type === "transfer") {
              if (w.id === oldTx.walletId) return { ...w, balance: w.balance + oldTx.amount };
              if (w.id === oldTx.toWalletId) return { ...w, balance: w.balance - oldTx.amount };
            } else if (w.id === oldTx.walletId) {
              const delta = oldTx.type === "income" ? -oldTx.amount : oldTx.amount;
              return { ...w, balance: w.balance + delta };
            }
            return w;
          });

          const updatedTx: Transaction = { ...oldTx, ...data };

          // Áp dụng thay đổi từ giao dịch mới
          adjustedWallets = adjustedWallets.map((w) => {
            if (updatedTx.type === "transfer") {
              if (w.id === updatedTx.walletId) return { ...w, balance: w.balance - updatedTx.amount };
              if (w.id === updatedTx.toWalletId) return { ...w, balance: w.balance + updatedTx.amount };
            } else if (w.id === updatedTx.walletId) {
              const delta = updatedTx.type === "income" ? updatedTx.amount : -updatedTx.amount;
              return { ...w, balance: w.balance + delta };
            }
            return w;
          });

          return {
            transactions: state.transactions.map((t) =>
              t.id === id ? updatedTx : t
            ),
            wallets: adjustedWallets,
          };
        }),

      // ── Transfer (Chuyển tiền giữa các ví) ────────────────────
      transferMoney: ({ fromWalletId, toWalletId, amount, note, date }) => {
        if (!fromWalletId || !toWalletId || fromWalletId === toWalletId || amount <= 0) return;
        const fromWallet = get().wallets.find((w) => w.id === fromWalletId);
        const toWallet = get().wallets.find((w) => w.id === toWalletId);
        const noteText = note || `Chuyển tiền: ${fromWallet?.name ?? "Ví"} → ${toWallet?.name ?? "Ví"}`;

        get().addTransaction({
          type: "transfer",
          amount,
          categoryId: "savings",
          walletId: fromWalletId,
          toWalletId,
          note: noteText,
          date: date || new Date().toISOString(),
        });
      },

      // ── Wallets ───────────────────────────────────────────────
      addWallet: (wallet) =>
        set((state) => {
          const id = generateId();
          const initBal = wallet.initialBalance ?? wallet.balance ?? 0;
          return {
            wallets: [
              ...state.wallets,
              {
                ...wallet,
                id,
                balance: initBal,
                initialBalance: initBal,
              },
            ],
          };
        }),

      updateWallet: (id, data) =>
        set((state) => ({
          wallets: state.wallets.map((w) =>
            w.id === id ? { ...w, ...data } : w
          ),
        })),

      deleteWallet: (id) =>
        set((state) => ({
          wallets: state.wallets.filter((w) => w.id !== id),
        })),

      // ── Budgets ───────────────────────────────────────────────
      addBudget: (budget) =>
        set((state) => ({
          budgets: [...state.budgets, { ...budget, id: generateId() }],
        })),

      updateBudget: (id, limit) =>
        set((state) => ({
          budgets: state.budgets.map((b) =>
            b.id === id ? { ...b, limit } : b
          ),
        })),

      deleteBudget: (id) =>
        set((state) => ({
          budgets: state.budgets.filter((b) => b.id !== id),
        })),

      // ── Recurring Bills (Hóa đơn định kỳ) ─────────────────────
      addBill: (bill) =>
        set((state) => ({
          recurringBills: [
            ...state.recurringBills,
            { ...bill, id: generateId(), paidMonths: [] },
          ],
        })),

      updateBill: (id, data) =>
        set((state) => ({
          recurringBills: state.recurringBills.map((b) =>
            b.id === id ? { ...b, ...data } : b
          ),
        })),

      deleteBill: (id) =>
        set((state) => ({
          recurringBills: state.recurringBills.filter((b) => b.id !== id),
        })),

      payBill: (billId, monthKey) => {
        const state = get();
        const bill = state.recurringBills.find((b) => b.id === billId);
        if (!bill) return;

        const currentMonth = monthKey || format(new Date(), "yyyy-MM");
        if (bill.paidMonths.includes(currentMonth)) return; // Đã trả rồi

        // 1. Tự động tạo 1 giao dịch chi tiêu loại expense
        const txDate = new Date().toISOString();
        get().addTransaction({
          type: "expense",
          amount: bill.amount,
          categoryId: bill.categoryId,
          walletId: bill.walletId,
          note: `Hóa đơn: ${bill.name} (${currentMonth})`,
          date: txDate,
        });

        // 2. Cập nhật paidMonths của bill
        set((st) => ({
          recurringBills: st.recurringBills.map((b) =>
            b.id === billId
              ? { ...b, paidMonths: [...b.paidMonths, currentMonth] }
              : b
          ),
        }));
      },

      unpayBill: (billId, monthKey) => {
        const currentMonth = monthKey || format(new Date(), "yyyy-MM");
        set((st) => ({
          recurringBills: st.recurringBills.map((b) =>
            b.id === billId
              ? { ...b, paidMonths: b.paidMonths.filter((m) => m !== currentMonth) }
              : b
          ),
        }));
      },

      // ── Settings ──────────────────────────────────────────────
      updateSettings: (settings) =>
        set((state) => ({
          settings: { ...state.settings, ...settings },
        })),

      togglePrivacyMode: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            privacyMode: !state.settings.privacyMode,
          },
        })),
    }),
    {
      name: "vang-finance-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
