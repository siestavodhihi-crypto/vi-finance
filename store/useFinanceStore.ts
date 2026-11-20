/**
 * store/useFinanceStore.ts
 * Zustand store — lớp lưu trữ Supabase (tự động đồng bộ theo user_id với RLS)
 * Fallback sang chế độ Demo khi chưa cấu hình biến môi trường Supabase.
 * Logic tính toán giữ nguyên 100% trong lib/finance.ts.
 */
import { create } from "zustand";
import { toast } from "sonner";
import {
  Transaction,
  Wallet,
  Budget,
  RecurringBill,
  SavingsGoal,
  Debt,
  SplitBill,
  AppSettings,
} from "@/types";
import {
  SAMPLE_TRANSACTIONS,
  SAMPLE_WALLETS,
  SAMPLE_BUDGETS,
  SAMPLE_RECURRING_BILLS,
  SAMPLE_GOALS,
  SAMPLE_DEBTS,
  SAMPLE_SPLITS,
} from "@/lib/sample-data";
import { DEFAULT_DAILY_LIMIT } from "@/lib/constants";
import { splitDebts } from "@/lib/split";
import * as repo from "@/lib/supabase/repository";
import { format } from "date-fns";

export interface AuthUserInfo {
  id: string;
  email: string;
  name?: string;
}

interface FinanceState {
  // Auth & sync state
  user: AuthUserInfo | null;
  dataMode: "supabase" | "demo";
  syncLoading: boolean;

  // Domain data
  transactions: Transaction[];
  wallets: Wallet[];
  budgets: Budget[];
  recurringBills: RecurringBill[];
  goals: SavingsGoal[];
  debts: Debt[];
  splits: SplitBill[];
  settings: AppSettings;

  // Auth & sync actions
  setUser: (user: AuthUserInfo | null) => void;
  loadFromSupabase: (user: AuthUserInfo) => Promise<void>;
  enterDemoMode: () => void;
  clearUserData: () => void;

  // Actions — Transactions
  addTransaction: (tx: Omit<Transaction, "id" | "createdAt">, receiptFile?: File) => void;
  deleteTransaction: (id: string) => void;
  updateTransaction: (id: string, data: Partial<Transaction>) => void;

  // Actions — Transfers (KHÔNG tính vào thu/chi)
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

  // Actions — Recurring Bills
  addBill: (bill: Omit<RecurringBill, "id" | "paidMonths">) => void;
  updateBill: (id: string, data: Partial<RecurringBill>) => void;
  deleteBill: (id: string) => void;
  payBill: (billId: string, monthKey?: string) => void;
  unpayBill: (billId: string, monthKey?: string) => void;

  // Actions — Goals
  addGoal: (goal: Omit<SavingsGoal, "id" | "createdAt" | "contributions">) => void;
  updateGoal: (id: string, data: Partial<SavingsGoal>) => void;
  deleteGoal: (id: string) => void;
  contributeGoal: (goalId: string, amount: number, walletId?: string) => void;

  // Actions — Debts & Split
  addDebt: (debt: Omit<Debt, "id" | "settled" | "settledAt">) => void;
  toggleSettleDebt: (id: string) => void;
  deleteDebt: (id: string) => void;
  addSplitBill: (bill: Omit<SplitBill, "id" | "createdAt">) => void;
  deleteSplitBill: (id: string) => void;

  // Actions — Settings (lưu localStorage cho tùy chọn UI cá nhân)
  updateSettings: (settings: Partial<AppSettings>) => void;
  togglePrivacyMode: () => void;
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 hợp lệ cho Postgres
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function loadLocalSettings(): AppSettings {
  const defaults: AppSettings = {
    privacyMode: false,
    theme: "system",
    currency: "VND",
    dailyLimit: DEFAULT_DAILY_LIMIT,
    lockedSavings: 0,
  };
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem("vang-ui-settings");
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return defaults;
  }
}

function saveLocalSettings(s: AppSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("vang-ui-settings", JSON.stringify(s));
  } catch {
    // ignore storage quota errors
  }
}

function syncOp(promise: Promise<unknown>, errorLabel: string) {
  promise.catch((err) => {
    console.error(errorLabel, err);
    toast.error(`${errorLabel}: ${err?.message ?? "Lỗi kết nối Supabase"}`);
  });
}

export const useFinanceStore = create<FinanceState>()((set, get) => ({
  user: null,
  dataMode: "demo",
  syncLoading: false,

  transactions: SAMPLE_TRANSACTIONS,
  wallets: SAMPLE_WALLETS,
  budgets: SAMPLE_BUDGETS,
  recurringBills: SAMPLE_RECURRING_BILLS,
  goals: SAMPLE_GOALS,
  debts: SAMPLE_DEBTS,
  splits: SAMPLE_SPLITS,
  settings: loadLocalSettings(),

  // ── Auth & Supabase Sync ──────────────────────────────────
  setUser: (user) => set({ user }),

  loadFromSupabase: async (user) => {
    set({ user, dataMode: "supabase", syncLoading: true });
    try {
      const data = await repo.fetchAllUserData();
      set({
        wallets: data.wallets,
        transactions: data.transactions,
        budgets: data.budgets,
        recurringBills: data.recurringBills,
        goals: data.goals,
        debts: data.debts,
        splits: data.splits,
        syncLoading: false,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không tải được dữ liệu";
      toast.error(`Lỗi tải dữ liệu Supabase: ${msg}`);
      set({ syncLoading: false });
    }
  },

  enterDemoMode: () =>
    set({
      user: null,
      dataMode: "demo",
      syncLoading: false,
      transactions: SAMPLE_TRANSACTIONS,
      wallets: SAMPLE_WALLETS,
      budgets: SAMPLE_BUDGETS,
      recurringBills: SAMPLE_RECURRING_BILLS,
      goals: SAMPLE_GOALS,
      debts: SAMPLE_DEBTS,
      splits: SAMPLE_SPLITS,
    }),

  clearUserData: () =>
    set({
      user: null,
      syncLoading: false,
      transactions: [],
      wallets: [],
      budgets: [],
      recurringBills: [],
      goals: [],
      debts: [],
      splits: [],
    }),

  // ── Transactions ──────────────────────────────────────────
  addTransaction: (tx, receiptFile) => {
    const id = generateId();
    const newTx: Transaction = {
      ...tx,
      id,
      createdAt: new Date().toISOString(),
    };

    const updatedWallets: Wallet[] = [];
    set((state) => {
      const wallets = state.wallets.map((w) => {
        if (tx.type === "transfer") {
          if (w.id === tx.walletId) {
            const next = { ...w, balance: w.balance - tx.amount };
            updatedWallets.push(next);
            return next;
          }
          if (w.id === tx.toWalletId) {
            const next = { ...w, balance: w.balance + tx.amount };
            updatedWallets.push(next);
            return next;
          }
          return w;
        }
        if (w.id === tx.walletId) {
          const delta = tx.type === "income" ? tx.amount : -tx.amount;
          const next = { ...w, balance: w.balance + delta };
          updatedWallets.push(next);
          return next;
        }
        return w;
      });

      return {
        transactions: [newTx, ...state.transactions],
        wallets,
      };
    });

    toast.success(
      tx.type === "transfer"
        ? "Đã chuyển tiền giữa các ví"
        : tx.type === "income"
        ? "Đã thêm khoản thu"
        : "Đã thêm khoản chi"
    );

    const { user, dataMode } = get();
    if (dataMode === "supabase" && user) {
      syncOp(
        (async () => {
          let receiptUrl = newTx.receiptUrl;
          if (receiptFile) {
            receiptUrl = await repo.uploadReceiptImage(user.id, id, receiptFile);
            set((state) => ({
              transactions: state.transactions.map((t) =>
                t.id === id ? { ...t, receiptUrl } : t
              ),
            }));
          }
          await Promise.all([
            repo.insertTransaction(user.id, { ...newTx, receiptUrl }),
            ...updatedWallets.map((w) => repo.patchWallet(w.id, { balance: w.balance })),
          ]);
        })(),
        "Không lưu được giao dịch"
      );
    }
  },

  deleteTransaction: (id) => {
    const oldTx = get().transactions.find((t) => t.id === id);
    if (!oldTx) return;

    const updatedWallets: Wallet[] = [];
    set((state) => {
      const wallets = state.wallets.map((w) => {
        if (oldTx.type === "transfer") {
          if (w.id === oldTx.walletId) {
            const next = { ...w, balance: w.balance + oldTx.amount };
            updatedWallets.push(next);
            return next;
          }
          if (w.id === oldTx.toWalletId) {
            const next = { ...w, balance: w.balance - oldTx.amount };
            updatedWallets.push(next);
            return next;
          }
          return w;
        }
        if (w.id === oldTx.walletId) {
          const delta = oldTx.type === "income" ? -oldTx.amount : oldTx.amount;
          const next = { ...w, balance: w.balance + delta };
          updatedWallets.push(next);
          return next;
        }
        return w;
      });

      return {
        transactions: state.transactions.filter((t) => t.id !== id),
        wallets,
      };
    });

    toast.success("Đã xóa giao dịch");

    const { user, dataMode } = get();
    if (dataMode === "supabase" && user) {
      syncOp(
        Promise.all([
          repo.removeTransaction(id),
          ...updatedWallets.map((w) => repo.patchWallet(w.id, { balance: w.balance })),
        ]),
        "Không xóa được giao dịch"
      );
    }
  },

  updateTransaction: (id, data) => {
    const oldTx = get().transactions.find((t) => t.id === id);
    if (!oldTx) return;
    const updatedTx: Transaction = { ...oldTx, ...data };
    const touchedIds = new Set<string>([oldTx.walletId, updatedTx.walletId]);
    if (oldTx.toWalletId) touchedIds.add(oldTx.toWalletId);
    if (updatedTx.toWalletId) touchedIds.add(updatedTx.toWalletId);

    set((state) => {
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
        transactions: state.transactions.map((t) => (t.id === id ? updatedTx : t)),
        wallets: adjustedWallets,
      };
    });

    toast.success("Đã cập nhật giao dịch");

    const { user, dataMode, wallets } = get();
    if (dataMode === "supabase" && user) {
      const changedWallets = wallets.filter((w) => touchedIds.has(w.id));
      syncOp(
        Promise.all([
          repo.patchTransaction(id, updatedTx),
          ...changedWallets.map((w) => repo.patchWallet(w.id, { balance: w.balance })),
        ]),
        "Không cập nhật được giao dịch"
      );
    }
  },

  // ── Transfer ──────────────────────────────────────────────
  transferMoney: ({ fromWalletId, toWalletId, amount, note, date }) => {
    if (!fromWalletId || !toWalletId || fromWalletId === toWalletId || amount <= 0) return;
    const fromWallet = get().wallets.find((w) => w.id === fromWalletId);
    const toWallet = get().wallets.find((w) => w.id === toWalletId);
    const noteText =
      note || `Chuyển tiền: ${fromWallet?.name ?? "Ví"} → ${toWallet?.name ?? "Ví"}`;

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
  addWallet: (wallet) => {
    const id = generateId();
    const initBal = wallet.initialBalance ?? wallet.balance ?? 0;
    const newWallet: Wallet = {
      ...wallet,
      id,
      balance: initBal,
      initialBalance: initBal,
    };

    set((state) => ({ wallets: [...state.wallets, newWallet] }));
    toast.success(`Đã tạo ví "${newWallet.name}"`);

    const { user, dataMode } = get();
    if (dataMode === "supabase" && user) {
      syncOp(repo.insertWallet(user.id, newWallet), "Không tạo được ví");
    }
  },

  updateWallet: (id, data) => {
    set((state) => ({
      wallets: state.wallets.map((w) => (w.id === id ? { ...w, ...data } : w)),
    }));
    toast.success("Đã cập nhật ví");

    const { user, dataMode } = get();
    if (dataMode === "supabase" && user) {
      syncOp(repo.patchWallet(id, data), "Không cập nhật được ví");
    }
  },

  deleteWallet: (id) => {
    set((state) => ({
      wallets: state.wallets.filter((w) => w.id !== id),
    }));
    toast.success("Đã xóa ví");

    const { user, dataMode } = get();
    if (dataMode === "supabase" && user) {
      syncOp(repo.removeWallet(id), "Không xóa được ví");
    }
  },

  // ── Budgets ───────────────────────────────────────────────
  addBudget: (budget) => {
    const newBudget: Budget = { ...budget, id: generateId() };
    set((state) => ({ budgets: [...state.budgets, newBudget] }));
    toast.success("Đã đặt ngân sách");

    const { user, dataMode } = get();
    if (dataMode === "supabase" && user) {
      syncOp(repo.insertBudget(user.id, newBudget), "Không lưu được ngân sách");
    }
  },

  updateBudget: (id, limit) => {
    set((state) => ({
      budgets: state.budgets.map((b) => (b.id === id ? { ...b, limit } : b)),
    }));
    toast.success("Đã cập nhật hạn mức ngân sách");

    const { user, dataMode } = get();
    if (dataMode === "supabase" && user) {
      syncOp(repo.patchBudget(id, limit), "Không cập nhật được ngân sách");
    }
  },

  deleteBudget: (id) => {
    set((state) => ({
      budgets: state.budgets.filter((b) => b.id !== id),
    }));
    toast.success("Đã xóa ngân sách");

    const { user, dataMode } = get();
    if (dataMode === "supabase" && user) {
      syncOp(repo.removeBudget(id), "Không xóa được ngân sách");
    }
  },

  // ── Recurring Bills ───────────────────────────────────────
  addBill: (bill) => {
    const newBill: RecurringBill = { ...bill, id: generateId(), paidMonths: [] };
    set((state) => ({ recurringBills: [...state.recurringBills, newBill] }));
    toast.success(`Đã thêm hóa đơn "${newBill.name}"`);

    const { user, dataMode } = get();
    if (dataMode === "supabase" && user) {
      syncOp(repo.insertBill(user.id, newBill), "Không lưu được hóa đơn");
    }
  },

  updateBill: (id, data) => {
    set((state) => ({
      recurringBills: state.recurringBills.map((b) => (b.id === id ? { ...b, ...data } : b)),
    }));
    toast.success("Đã cập nhật hóa đơn");

    const { user, dataMode } = get();
    if (dataMode === "supabase" && user) {
      syncOp(repo.patchBill(id, data), "Không cập nhật được hóa đơn");
    }
  },

  deleteBill: (id) => {
    set((state) => ({
      recurringBills: state.recurringBills.filter((b) => b.id !== id),
    }));
    toast.success("Đã xóa hóa đơn");

    const { user, dataMode } = get();
    if (dataMode === "supabase" && user) {
      syncOp(repo.removeBill(id), "Không xóa được hóa đơn");
    }
  },

  payBill: (billId, monthKey) => {
    const state = get();
    const bill = state.recurringBills.find((b) => b.id === billId);
    if (!bill) return;

    const currentMonth = monthKey || format(new Date(), "yyyy-MM");
    if (bill.paidMonths.includes(currentMonth)) return;

    const walletId = bill.walletId || state.wallets[0]?.id;
    if (walletId) {
      get().addTransaction({
        type: "expense",
        amount: bill.amount,
        categoryId: bill.categoryId,
        walletId,
        note: `Hóa đơn: ${bill.name} (${currentMonth})`,
        date: new Date().toISOString(),
      });
    }

    const nextPaidMonths = [...bill.paidMonths, currentMonth];
    set((st) => ({
      recurringBills: st.recurringBills.map((b) =>
        b.id === billId ? { ...b, paidMonths: nextPaidMonths } : b
      ),
    }));

    const { user, dataMode } = get();
    if (dataMode === "supabase" && user) {
      syncOp(repo.patchBill(billId, { paidMonths: nextPaidMonths }), "Không cập nhật được hóa đơn");
    }
  },

  unpayBill: (billId, monthKey) => {
    const currentMonth = monthKey || format(new Date(), "yyyy-MM");
    const bill = get().recurringBills.find((b) => b.id === billId);
    if (!bill) return;

    const nextPaidMonths = bill.paidMonths.filter((m) => m !== currentMonth);
    set((st) => ({
      recurringBills: st.recurringBills.map((b) =>
        b.id === billId ? { ...b, paidMonths: nextPaidMonths } : b
      ),
    }));
    toast.info("Đã hoàn tác trạng thái hóa đơn");

    const { user, dataMode } = get();
    if (dataMode === "supabase" && user) {
      syncOp(repo.patchBill(billId, { paidMonths: nextPaidMonths }), "Không cập nhật được hóa đơn");
    }
  },

  // ── Goals ─────────────────────────────────────────────────
  addGoal: (goal) => {
    const now = new Date().toISOString();
    const newGoal: SavingsGoal = {
      ...goal,
      id: generateId(),
      createdAt: now,
      contributions: goal.saved > 0 ? [{ id: generateId(), amount: goal.saved, date: now }] : [],
    };
    set((state) => ({ goals: [newGoal, ...state.goals] }));
    toast.success(`Đã tạo mục tiêu "${newGoal.name}"`);

    const { user, dataMode } = get();
    if (dataMode === "supabase" && user) {
      syncOp(repo.insertGoal(user.id, newGoal), "Không lưu được mục tiêu");
    }
  },

  updateGoal: (id, data) => {
    set((state) => ({
      goals: state.goals.map((g) => (g.id === id ? { ...g, ...data } : g)),
    }));
    toast.success("Đã cập nhật mục tiêu");

    const { user, dataMode } = get();
    if (dataMode === "supabase" && user) {
      syncOp(repo.patchGoal(id, data), "Không cập nhật được mục tiêu");
    }
  },

  deleteGoal: (id) => {
    set((state) => ({ goals: state.goals.filter((g) => g.id !== id) }));
    toast.success("Đã xóa mục tiêu");

    const { user, dataMode } = get();
    if (dataMode === "supabase" && user) {
      syncOp(repo.removeGoal(id), "Không xóa được mục tiêu");
    }
  },

  contributeGoal: (goalId, amount, walletId) => {
    if (amount <= 0) return;
    const now = new Date().toISOString();
    const goal = get().goals.find((g) => g.id === goalId);
    if (!goal) return;

    let txId: string | undefined;
    if (walletId) {
      const lockedWallet = get().wallets.find((w) => w.isLocked && w.id !== walletId);
      if (lockedWallet) {
        get().transferMoney({
          fromWalletId: walletId,
          toWalletId: lockedWallet.id,
          amount,
          note: `Nạp mục tiêu: ${goal.name}`,
          date: now,
        });
      } else {
        get().addTransaction({
          type: "expense",
          amount,
          categoryId: "savings",
          walletId,
          note: `Nạp mục tiêu: ${goal.name}`,
          date: now,
        });
      }
      txId = get().transactions[0]?.id;
    }

    const nextSaved = goal.saved + amount;
    const nextContributions = [
      ...goal.contributions,
      { id: generateId(), amount, date: now, walletId, txId },
    ];

    set((state) => ({
      goals: state.goals.map((g) =>
        g.id === goalId ? { ...g, saved: nextSaved, contributions: nextContributions } : g
      ),
    }));
    toast.success(`Đã nạp thêm vào "${goal.name}"`);

    const { user, dataMode } = get();
    if (dataMode === "supabase" && user) {
      syncOp(
        repo.patchGoal(goalId, { saved: nextSaved, contributions: nextContributions }),
        "Không cập nhật được mục tiêu"
      );
    }
  },

  // ── Debts & Split ─────────────────────────────────────────
  addDebt: (debt) => {
    const newDebt: Debt = { ...debt, id: generateId(), settled: false };
    set((state) => ({ debts: [newDebt, ...state.debts] }));
    toast.success("Đã ghi vào sổ nợ");

    const { user, dataMode } = get();
    if (dataMode === "supabase" && user) {
      syncOp(repo.insertDebt(user.id, newDebt), "Không lưu được khoản nợ");
    }
  },

  toggleSettleDebt: (id) => {
    const debt = get().debts.find((d) => d.id === id);
    if (!debt) return;
    const nextSettled = !debt.settled;
    const settledAt = nextSettled ? new Date().toISOString() : undefined;

    set((state) => ({
      debts: state.debts.map((d) =>
        d.id === id ? { ...d, settled: nextSettled, settledAt } : d
      ),
    }));
    toast.success(nextSettled ? "Đã đánh dấu trả nợ" : "Đã hoàn tác trạng thái nợ");

    const { user, dataMode } = get();
    if (dataMode === "supabase" && user) {
      syncOp(repo.patchDebt(id, { settled: nextSettled, settledAt }), "Không cập nhật được sổ nợ");
    }
  },

  deleteDebt: (id) => {
    set((state) => ({ debts: state.debts.filter((d) => d.id !== id) }));
    toast.success("Đã xóa khoản nợ");

    const { user, dataMode } = get();
    if (dataMode === "supabase" && user) {
      syncOp(repo.removeDebt(id), "Không xóa được khoản nợ");
    }
  },

  addSplitBill: (bill) => {
    const splitId = generateId();
    const now = new Date().toISOString();
    const newSplit: SplitBill = { ...bill, id: splitId, createdAt: now };
    const generatedDebts: Debt[] = splitDebts(bill.shares, bill.payer).map((sd) => ({
      id: generateId(),
      person: sd.person,
      amount: sd.amount,
      direction: sd.direction,
      note: `Chia tiền: ${bill.title}`,
      date: bill.date,
      settled: false,
      splitId,
    }));

    set((state) => ({
      splits: [newSplit, ...state.splits],
      debts: [...generatedDebts, ...state.debts],
    }));
    toast.success(`Đã lưu chia tiền "${bill.title}"`);

    const { user, dataMode } = get();
    if (dataMode === "supabase" && user) {
      syncOp(repo.insertSplitBill(user.id, newSplit, generatedDebts), "Không lưu được chia tiền");
    }
  },

  deleteSplitBill: (id) => {
    set((state) => ({
      splits: state.splits.filter((s) => s.id !== id),
      debts: state.debts.filter((d) => d.splitId !== id),
    }));
    toast.success("Đã xóa hóa đơn chia nhóm");

    const { user, dataMode } = get();
    if (dataMode === "supabase" && user) {
      syncOp(repo.removeSplitBill(id), "Không xóa được hóa đơn chia nhóm");
    }
  },

  // ── Settings ──────────────────────────────────────────────
  updateSettings: (settings) =>
    set((state) => {
      const next = { ...state.settings, ...settings };
      saveLocalSettings(next);
      return { settings: next };
    }),

  togglePrivacyMode: () =>
    set((state) => {
      const next = { ...state.settings, privacyMode: !state.settings.privacyMode };
      saveLocalSettings(next);
      return { settings: next };
    }),
}));
