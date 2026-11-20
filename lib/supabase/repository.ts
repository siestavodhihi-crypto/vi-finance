/**
 * lib/supabase/repository.ts
 * Lớp lưu trữ Supabase — tách biệt hoàn toàn khỏi logic tính toán trong lib/finance.ts.
 */
import { getSupabaseClient } from "./client";
import {
  Budget,
  CategoryId,
  Debt,
  GoalContribution,
  RecurringBill,
  SavingsGoal,
  SplitBill,
  SplitItem,
  Transaction,
  Wallet,
} from "@/types";

function db() {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase chưa được cấu hình");
  return client;
}

// ── Row mappers (snake_case ↔ camelCase) ─────────────────────

function mapWallet(r: Record<string, unknown>): Wallet {
  return {
    id: String(r.id),
    name: String(r.name),
    balance: Number(r.balance ?? 0),
    initialBalance: Number(r.initial_balance ?? 0),
    icon: String(r.icon ?? "Wallet"),
    color: String(r.color ?? "#C8A44A"),
    isLocked: Boolean(r.is_locked),
    note: r.note ? String(r.note) : undefined,
  };
}

function mapTransaction(r: Record<string, unknown>): Transaction {
  return {
    id: String(r.id),
    type: r.type as Transaction["type"],
    amount: Number(r.amount ?? 0),
    categoryId: (r.category_id as CategoryId) ?? "other",
    walletId: String(r.wallet_id),
    toWalletId: r.to_wallet_id ? String(r.to_wallet_id) : undefined,
    note: String(r.note ?? ""),
    date: String(r.date),
    createdAt: String(r.created_at),
    receiptUrl: r.receipt_url ? String(r.receipt_url) : undefined,
  };
}

function mapBudget(r: Record<string, unknown>): Budget {
  return {
    id: String(r.id),
    categoryId: r.category_id as CategoryId,
    limit: Number(r.limit_amount ?? 0),
    month: String(r.month),
  };
}

function mapBill(r: Record<string, unknown>): RecurringBill {
  return {
    id: String(r.id),
    name: String(r.name),
    amount: Number(r.amount ?? 0),
    categoryId: (r.category_id as CategoryId) ?? "utilities",
    dueDay: Number(r.due_day ?? 1),
    walletId: r.wallet_id ? String(r.wallet_id) : "",
    paidMonths: Array.isArray(r.paid_months) ? (r.paid_months as string[]) : [],
    note: r.note ? String(r.note) : undefined,
  };
}

function mapGoal(r: Record<string, unknown>): SavingsGoal {
  return {
    id: String(r.id),
    name: String(r.name),
    target: Number(r.target ?? 0),
    saved: Number(r.saved ?? 0),
    deadline: r.deadline ? String(r.deadline) : undefined,
    color: String(r.color ?? "#C8A44A"),
    icon: String(r.icon ?? "Target"),
    createdAt: String(r.created_at),
    contributions: Array.isArray(r.contributions)
      ? (r.contributions as GoalContribution[])
      : [],
  };
}

function mapDebt(r: Record<string, unknown>): Debt {
  return {
    id: String(r.id),
    person: String(r.person),
    amount: Number(r.amount ?? 0),
    direction: r.direction as Debt["direction"],
    note: String(r.note ?? ""),
    date: String(r.date),
    dueDate: r.due_date ? String(r.due_date) : undefined,
    settled: Boolean(r.settled),
    settledAt: r.settled_at ? String(r.settled_at) : undefined,
    splitId: r.split_id ? String(r.split_id) : undefined,
  };
}

function mapSplit(r: Record<string, unknown>): SplitBill {
  return {
    id: String(r.id),
    title: String(r.title),
    date: String(r.date),
    payer: String(r.payer),
    members: Array.isArray(r.members) ? (r.members as string[]) : [],
    mode: r.mode as SplitBill["mode"],
    total: Number(r.total ?? 0),
    items: Array.isArray(r.items) ? (r.items as SplitItem[]) : [],
    sharedFee: Number(r.shared_fee ?? 0),
    shares: (r.shares as Record<string, number>) ?? {},
    createdAt: String(r.created_at),
  };
}

// ── Fetch all user data ──────────────────────────────────────

export async function fetchAllUserData() {
  const client = db();
  const [wallets, transactions, budgets, bills, goals, debts, splits] =
    await Promise.all([
      client.from("wallets").select("*").order("created_at", { ascending: true }),
      client.from("transactions").select("*").order("date", { ascending: false }),
      client.from("budgets").select("*").order("created_at", { ascending: true }),
      client.from("recurring_bills").select("*").order("due_day", { ascending: true }),
      client.from("saving_goals").select("*").order("created_at", { ascending: false }),
      client.from("debts").select("*").order("date", { ascending: false }),
      client.from("split_bills").select("*").order("date", { ascending: false }),
    ]);

  const firstError = [wallets, transactions, budgets, bills, goals, debts, splits].find(
    (r) => r.error
  )?.error;
  if (firstError) throw firstError;

  return {
    wallets: (wallets.data ?? []).map(mapWallet),
    transactions: (transactions.data ?? []).map(mapTransaction),
    budgets: (budgets.data ?? []).map(mapBudget),
    recurringBills: (bills.data ?? []).map(mapBill),
    goals: (goals.data ?? []).map(mapGoal),
    debts: (debts.data ?? []).map(mapDebt),
    splits: (splits.data ?? []).map(mapSplit),
  };
}

// ── Wallets ──────────────────────────────────────────────────

export async function insertWallet(userId: string, w: Wallet) {
  const { error } = await db().from("wallets").insert({
    id: w.id,
    user_id: userId,
    name: w.name,
    balance: w.balance,
    initial_balance: w.initialBalance ?? w.balance,
    icon: w.icon,
    color: w.color,
    is_locked: Boolean(w.isLocked),
    note: w.note ?? null,
  });
  if (error) throw error;
}

export async function patchWallet(id: string, data: Partial<Wallet>) {
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.balance !== undefined) payload.balance = data.balance;
  if (data.initialBalance !== undefined) payload.initial_balance = data.initialBalance;
  if (data.icon !== undefined) payload.icon = data.icon;
  if (data.color !== undefined) payload.color = data.color;
  if (data.isLocked !== undefined) payload.is_locked = data.isLocked;
  if (data.note !== undefined) payload.note = data.note;

  const { error } = await db().from("wallets").update(payload).eq("id", id);
  if (error) throw error;
}

export async function removeWallet(id: string) {
  const { error } = await db().from("wallets").delete().eq("id", id);
  if (error) throw error;
}

// ── Transactions ─────────────────────────────────────────────

export async function insertTransaction(userId: string, tx: Transaction) {
  const { error } = await db().from("transactions").insert({
    id: tx.id,
    user_id: userId,
    type: tx.type,
    amount: tx.amount,
    category_id: tx.categoryId,
    wallet_id: tx.walletId,
    to_wallet_id: tx.toWalletId ?? null,
    note: tx.note,
    receipt_url: tx.receiptUrl ?? null,
    date: tx.date,
    created_at: tx.createdAt,
  });
  if (error) throw error;
}

export async function uploadReceiptImage(
  userId: string,
  txId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${txId}.${ext}`;
  const { error } = await db().storage.from("receipts").upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: true,
  });
  if (error) throw error;
  return path;
}

export async function patchTransaction(id: string, tx: Transaction) {
  const { error } = await db()
    .from("transactions")
    .update({
      type: tx.type,
      amount: tx.amount,
      category_id: tx.categoryId,
      wallet_id: tx.walletId,
      to_wallet_id: tx.toWalletId ?? null,
      note: tx.note,
      date: tx.date,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function removeTransaction(id: string) {
  const { error } = await db().from("transactions").delete().eq("id", id);
  if (error) throw error;
}

// ── Budgets ──────────────────────────────────────────────────

export async function insertBudget(userId: string, b: Budget) {
  const { error } = await db().from("budgets").insert({
    id: b.id,
    user_id: userId,
    category_id: b.categoryId,
    limit_amount: b.limit,
    month: b.month,
  });
  if (error) throw error;
}

export async function patchBudget(id: string, limit: number) {
  const { error } = await db().from("budgets").update({ limit_amount: limit }).eq("id", id);
  if (error) throw error;
}

export async function removeBudget(id: string) {
  const { error } = await db().from("budgets").delete().eq("id", id);
  if (error) throw error;
}

// ── Recurring Bills ──────────────────────────────────────────

export async function insertBill(userId: string, b: RecurringBill) {
  const { error } = await db().from("recurring_bills").insert({
    id: b.id,
    user_id: userId,
    name: b.name,
    amount: b.amount,
    category_id: b.categoryId,
    due_day: b.dueDay,
    wallet_id: b.walletId || null,
    paid_months: b.paidMonths,
    note: b.note ?? null,
  });
  if (error) throw error;
}

export async function patchBill(id: string, data: Partial<RecurringBill>) {
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.amount !== undefined) payload.amount = data.amount;
  if (data.categoryId !== undefined) payload.category_id = data.categoryId;
  if (data.dueDay !== undefined) payload.due_day = data.dueDay;
  if (data.walletId !== undefined) payload.wallet_id = data.walletId || null;
  if (data.paidMonths !== undefined) payload.paid_months = data.paidMonths;
  if (data.note !== undefined) payload.note = data.note ?? null;

  const { error } = await db().from("recurring_bills").update(payload).eq("id", id);
  if (error) throw error;
}

export async function removeBill(id: string) {
  const { error } = await db().from("recurring_bills").delete().eq("id", id);
  if (error) throw error;
}

// ── Saving Goals ─────────────────────────────────────────────

export async function insertGoal(userId: string, g: SavingsGoal) {
  const { error } = await db().from("saving_goals").insert({
    id: g.id,
    user_id: userId,
    name: g.name,
    target: g.target,
    saved: g.saved,
    deadline: g.deadline ?? null,
    color: g.color,
    icon: g.icon,
    contributions: g.contributions,
    created_at: g.createdAt,
  });
  if (error) throw error;
}

export async function patchGoal(id: string, data: Partial<SavingsGoal>) {
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.target !== undefined) payload.target = data.target;
  if (data.saved !== undefined) payload.saved = data.saved;
  if (data.deadline !== undefined) payload.deadline = data.deadline ?? null;
  if (data.color !== undefined) payload.color = data.color;
  if (data.icon !== undefined) payload.icon = data.icon;
  if (data.contributions !== undefined) payload.contributions = data.contributions;

  const { error } = await db().from("saving_goals").update(payload).eq("id", id);
  if (error) throw error;
}

export async function removeGoal(id: string) {
  const { error } = await db().from("saving_goals").delete().eq("id", id);
  if (error) throw error;
}

// ── Debts & Split Bills ──────────────────────────────────────

export async function insertDebt(userId: string, d: Debt) {
  const { error } = await db().from("debts").insert({
    id: d.id,
    user_id: userId,
    person: d.person,
    amount: d.amount,
    direction: d.direction,
    note: d.note,
    date: d.date,
    due_date: d.dueDate ?? null,
    settled: d.settled,
    settled_at: d.settledAt ?? null,
    split_id: d.splitId ?? null,
  });
  if (error) throw error;
}

export async function patchDebt(id: string, data: Partial<Debt>) {
  const payload: Record<string, unknown> = {};
  if (data.settled !== undefined) payload.settled = data.settled;
  if (data.settledAt !== undefined) payload.settled_at = data.settledAt ?? null;
  const { error } = await db().from("debts").update(payload).eq("id", id);
  if (error) throw error;
}

export async function removeDebt(id: string) {
  const { error } = await db().from("debts").delete().eq("id", id);
  if (error) throw error;
}

export async function insertSplitBill(userId: string, s: SplitBill, debts: Debt[]) {
  const { error } = await db().from("split_bills").insert({
    id: s.id,
    user_id: userId,
    title: s.title,
    date: s.date,
    payer: s.payer,
    members: s.members,
    mode: s.mode,
    total: s.total,
    items: s.items,
    shared_fee: s.sharedFee,
    shares: s.shares,
    created_at: s.createdAt,
  });
  if (error) throw error;

  if (debts.length > 0) {
    const { error: dErr } = await db().from("debts").insert(
      debts.map((d) => ({
        id: d.id,
        user_id: userId,
        person: d.person,
        amount: d.amount,
        direction: d.direction,
        note: d.note,
        date: d.date,
        settled: false,
        split_id: s.id,
      }))
    );
    if (dErr) throw dErr;
  }
}

export async function removeSplitBill(id: string) {
  const { error } = await db().from("split_bills").delete().eq("id", id);
  if (error) throw error;
}

// ── Bulk Import (Khôi phục từ JSON) & Xóa toàn bộ dữ liệu/tài khoản ──

export async function replaceAllUserData(
  userId: string,
  payload: {
    wallets: Wallet[];
    transactions: Transaction[];
    budgets: Budget[];
    recurringBills: RecurringBill[];
    goals: SavingsGoal[];
    debts: Debt[];
    splits: SplitBill[];
  }
) {
  const client = db();
  // Xóa theo thứ tự phụ thuộc khóa ngoại
  await client.from("debts").delete().eq("user_id", userId);
  await client.from("split_bills").delete().eq("user_id", userId);
  await client.from("transactions").delete().eq("user_id", userId);
  await client.from("recurring_bills").delete().eq("user_id", userId);
  await client.from("budgets").delete().eq("user_id", userId);
  await client.from("saving_goals").delete().eq("user_id", userId);
  await client.from("wallets").delete().eq("user_id", userId);

  if (payload.wallets.length > 0) {
    const { error } = await client.from("wallets").insert(
      payload.wallets.map((w) => ({
        id: w.id,
        user_id: userId,
        name: w.name,
        balance: w.balance,
        initial_balance: w.initialBalance ?? w.balance,
        icon: w.icon,
        color: w.color,
        is_locked: Boolean(w.isLocked),
        note: w.note ?? null,
      }))
    );
    if (error) throw error;
  }

  if (payload.transactions.length > 0) {
    const { error } = await client.from("transactions").insert(
      payload.transactions.map((tx) => ({
        id: tx.id,
        user_id: userId,
        type: tx.type,
        amount: tx.amount,
        category_id: tx.categoryId,
        wallet_id: tx.walletId,
        to_wallet_id: tx.toWalletId ?? null,
        note: tx.note,
        receipt_url: tx.receiptUrl ?? null,
        date: tx.date,
        created_at: tx.createdAt,
      }))
    );
    if (error) throw error;
  }

  if (payload.budgets.length > 0) {
    const { error } = await client.from("budgets").insert(
      payload.budgets.map((b) => ({
        id: b.id,
        user_id: userId,
        category_id: b.categoryId,
        limit_amount: b.limit,
        month: b.month,
      }))
    );
    if (error) throw error;
  }

  if (payload.recurringBills.length > 0) {
    const { error } = await client.from("recurring_bills").insert(
      payload.recurringBills.map((b) => ({
        id: b.id,
        user_id: userId,
        name: b.name,
        amount: b.amount,
        category_id: b.categoryId,
        due_day: b.dueDay,
        wallet_id: b.walletId || null,
        paid_months: b.paidMonths,
        note: b.note ?? null,
      }))
    );
    if (error) throw error;
  }

  if (payload.goals.length > 0) {
    const { error } = await client.from("saving_goals").insert(
      payload.goals.map((g) => ({
        id: g.id,
        user_id: userId,
        name: g.name,
        target: g.target,
        saved: g.saved,
        deadline: g.deadline ?? null,
        color: g.color,
        icon: g.icon,
        contributions: g.contributions,
        created_at: g.createdAt,
      }))
    );
    if (error) throw error;
  }

  if (payload.splits.length > 0) {
    const { error } = await client.from("split_bills").insert(
      payload.splits.map((s) => ({
        id: s.id,
        user_id: userId,
        title: s.title,
        date: s.date,
        payer: s.payer,
        members: s.members,
        mode: s.mode,
        total: s.total,
        items: s.items,
        shared_fee: s.sharedFee,
        shares: s.shares,
        created_at: s.createdAt,
      }))
    );
    if (error) throw error;
  }

  if (payload.debts.length > 0) {
    const { error } = await client.from("debts").insert(
      payload.debts.map((d) => ({
        id: d.id,
        user_id: userId,
        person: d.person,
        amount: d.amount,
        direction: d.direction,
        note: d.note,
        date: d.date,
        due_date: d.dueDate ?? null,
        settled: d.settled,
        settled_at: d.settledAt ?? null,
        split_id: d.splitId ?? null,
      }))
    );
    if (error) throw error;
  }
}

export async function deleteAccountAndAllData(userId: string) {
  const client = db();
  // Ưu tiên gọi RPC delete_my_account() (xóa cả auth.users + CASCADE toàn bộ dữ liệu)
  const { error: rpcError } = await client.rpc("delete_my_account");
  if (rpcError) {
    // Fallback nếu chưa chạy phần RPC mới nhất trong schema.sql: xóa sạch toàn bộ dữ liệu trong 7 bảng
    await client.from("debts").delete().eq("user_id", userId);
    await client.from("split_bills").delete().eq("user_id", userId);
    await client.from("transactions").delete().eq("user_id", userId);
    await client.from("recurring_bills").delete().eq("user_id", userId);
    await client.from("budgets").delete().eq("user_id", userId);
    await client.from("saving_goals").delete().eq("user_id", userId);
    await client.from("wallets").delete().eq("user_id", userId);
  }
  await client.auth.signOut();
}
