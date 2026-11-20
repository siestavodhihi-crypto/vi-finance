/**
 * lib/export-import.ts
 * Xuất CSV (UTF-8 BOM cho Excel tiếng Việt), sao lưu & khôi phục toàn bộ dữ liệu JSON (Zod validated).
 */
import { z } from "zod";
import {
  Budget,
  Debt,
  RecurringBill,
  SavingsGoal,
  SplitBill,
  Transaction,
  Wallet,
} from "@/types";
import { CATEGORIES } from "./constants";

export interface BackupPayload {
  wallets: Wallet[];
  transactions: Transaction[];
  budgets: Budget[];
  recurringBills: RecurringBill[];
  goals: SavingsGoal[];
  debts: Debt[];
  splits: SplitBill[];
}

export interface BackupFile {
  version: 1;
  app: "vang-finance";
  exportedAt: string;
  data: BackupPayload;
}

// ── CSV Export (UTF-8 BOM) ───────────────────────────────────

const UTF8_BOM = "\uFEFF";

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  // Chống CSV Formula Injection khi mở bằng Excel (=, +, -, @ ở đầu ô văn bản)
  const safe = /^[=+\-@\t\r]/.test(str) && typeof value === "string" ? `'${str}` : str;
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

const TYPE_LABEL: Record<Transaction["type"], string> = {
  income: "Thu nhập",
  expense: "Chi tiêu",
  transfer: "Chuyển ví",
};

/**
 * Xuất danh sách giao dịch sang chuỗi CSV có UTF-8 BOM để mở tiếng Việt chuẩn trên Excel.
 */
export function exportTransactionsToCsv(
  transactions: Transaction[],
  wallets: Wallet[]
): string {
  const walletMap = new Map(wallets.map((w) => [w.id, w.name]));
  const header = [
    "Ngày",
    "Loại",
    "Danh mục",
    "Số tiền (VNĐ)",
    "Ví",
    "Ví nhận",
    "Ghi chú",
  ].map(escapeCsvCell);

  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const rows = sorted.map((tx) => {
    const catName =
      tx.type === "transfer"
        ? "Chuyển tiền nội bộ"
        : CATEGORIES[tx.categoryId]?.name ?? tx.categoryId;
    const signedAmount = tx.type === "expense" ? -tx.amount : tx.amount;

    return [
      tx.date.slice(0, 10),
      TYPE_LABEL[tx.type] ?? tx.type,
      catName,
      signedAmount,
      walletMap.get(tx.walletId) ?? tx.walletId,
      tx.toWalletId ? walletMap.get(tx.toWalletId) ?? tx.toWalletId : "",
      tx.note ?? "",
    ]
      .map(escapeCsvCell)
      .join(",");
  });

  return UTF8_BOM + [header.join(","), ...rows].join("\r\n");
}

// ── JSON Backup & Restore ────────────────────────────────────

export function createBackupJson(data: BackupPayload): string {
  const file: BackupFile = {
    version: 1,
    app: "vang-finance",
    exportedAt: new Date().toISOString(),
    data,
  };
  return JSON.stringify(file, null, 2);
}

const BackupSchema = z.object({
  version: z.literal(1),
  app: z.literal("vang-finance"),
  exportedAt: z.string(),
  data: z.object({
    wallets: z.array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        balance: z.number().finite(),
        initialBalance: z.number().finite().optional(),
        icon: z.string().default("Wallet"),
        color: z.string().default("#C8A44A"),
        isLocked: z.boolean().optional(),
        note: z.string().optional(),
      })
    ),
    transactions: z.array(
      z.object({
        id: z.string().min(1),
        type: z.enum(["income", "expense", "transfer"]),
        amount: z.number().finite().positive(),
        categoryId: z.string().min(1),
        walletId: z.string().min(1),
        toWalletId: z.string().optional(),
        note: z.string().default(""),
        date: z.string().min(1),
        createdAt: z.string().min(1),
        receiptUrl: z.string().optional(),
      })
    ),
    budgets: z
      .array(
        z.object({
          id: z.string().min(1),
          categoryId: z.string().min(1),
          limit: z.number().finite().positive(),
          month: z.string().min(7),
        })
      )
      .default([]),
    recurringBills: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
          amount: z.number().finite().positive(),
          categoryId: z.string().min(1),
          dueDay: z.number().int().min(1).max(31),
          walletId: z.string().default(""),
          paidMonths: z.array(z.string()).default([]),
          note: z.string().optional(),
        })
      )
      .default([]),
    goals: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
          target: z.number().finite().positive(),
          saved: z.number().finite().nonnegative(),
          deadline: z.string().optional(),
          color: z.string().default("#C8A44A"),
          icon: z.string().default("Target"),
          createdAt: z.string().min(1),
          contributions: z
            .array(
              z.object({
                id: z.string().min(1),
                amount: z.number().finite().positive(),
                date: z.string().min(1),
                walletId: z.string().optional(),
                txId: z.string().optional(),
              })
            )
            .default([]),
        })
      )
      .default([]),
    debts: z
      .array(
        z.object({
          id: z.string().min(1),
          person: z.string().min(1),
          amount: z.number().finite().positive(),
          direction: z.enum(["they_owe", "i_owe"]),
          note: z.string().default(""),
          date: z.string().min(1),
          dueDate: z.string().optional(),
          settled: z.boolean().default(false),
          settledAt: z.string().optional(),
          splitId: z.string().optional(),
        })
      )
      .default([]),
    splits: z
      .array(
        z.object({
          id: z.string().min(1),
          title: z.string().min(1),
          date: z.string().min(1),
          payer: z.string().min(1),
          members: z.array(z.string()).default([]),
          mode: z.enum(["equal", "itemized"]),
          total: z.number().finite().nonnegative(),
          items: z
            .array(
              z.object({
                id: z.string().min(1),
                name: z.string(),
                amount: z.number().finite().nonnegative(),
                sharedBy: z.array(z.string()).default([]),
              })
            )
            .default([]),
          sharedFee: z.number().finite().nonnegative().default(0),
          shares: z.record(z.string(), z.number().finite()).default({}),
          createdAt: z.string().min(1),
        })
      )
      .default([]),
  }),
});

export type ParseBackupResult =
  | { ok: true; data: BackupPayload }
  | { ok: false; error: string };

export function parseBackupJson(raw: string): ParseBackupResult {
  if (!raw || !raw.trim()) {
    return { ok: false, error: "Tệp sao lưu trống." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Tệp không phải định dạng JSON hợp lệ." };
  }

  const result = BackupSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      error: "Cấu trúc tệp sao lưu không khớp định dạng của ứng dụng Vàng.",
    };
  }

  return { ok: true, data: result.data.data as BackupPayload };
}

/** Tải chuỗi văn bản xuống dưới dạng file trên trình duyệt */
export function downloadTextFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
