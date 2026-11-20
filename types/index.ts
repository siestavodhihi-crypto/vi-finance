// ============================================================
// TYPES — Vàng Finance App
// ============================================================

export type TransactionType = "income" | "expense" | "transfer";

export type CategoryId =
  | "food"
  | "transport"
  | "shopping"
  | "entertainment"
  | "health"
  | "education"
  | "salary"
  | "family"
  | "freelance"
  | "savings"
  | "rent"
  | "utilities"
  | "internet"
  | "other";

export interface Category {
  id: CategoryId;
  name: string;
  icon: string;
  type: TransactionType | "both";
  color: string;
}

export interface Wallet {
  id: string;
  name: string;
  balance: number;
  initialBalance?: number;
  icon: string;
  color: string;
  isLocked?: boolean; // Ví tiết kiệm đã khóa (tính vào lockedSavings trong Safe-to-Spend)
  note?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: CategoryId;
  walletId: string; // Ví nguồn (tiền ra nếu expense hoặc transfer; ví nhận nếu income)
  toWalletId?: string; // Ví đích (chỉ dùng khi type === "transfer")
  note: string;
  date: string; // ISO string
  createdAt: string; // ISO string
  receiptUrl?: string; // Đường dẫn ảnh hóa đơn trong Supabase Storage (chỉ có khi user bật đính kèm)
}

export interface Budget {
  id: string;
  categoryId: CategoryId;
  limit: number;
  month: string; // "YYYY-MM"
}

export interface RecurringBill {
  id: string;
  name: string;
  amount: number;
  categoryId: CategoryId;
  dueDay: number; // 1-31
  walletId: string; // Ví mặc định thanh toán
  paidMonths: string[]; // Danh sách các tháng "YYYY-MM" đã thanh toán
  note?: string;
}

// ---- Mục tiêu tiết kiệm ----

export interface GoalContribution {
  id: string;
  amount: number;
  date: string; // ISO
  walletId?: string;
  txId?: string; // giao dịch chuyển tiền tương ứng
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline?: string; // "YYYY-MM-DD"
  color: string;
  icon: string;
  createdAt: string;
  contributions: GoalContribution[];
}

// ---- Sổ nợ & chia tiền ----

export type DebtDirection = "they_owe" | "i_owe";

export interface Debt {
  id: string;
  person: string;
  amount: number;
  direction: DebtDirection;
  note: string;
  date: string; // ISO
  dueDate?: string;
  settled: boolean;
  settledAt?: string;
  splitId?: string;
}

export type SplitMode = "equal" | "itemized";

export interface SplitItem {
  id: string;
  name: string;
  amount: number;
  sharedBy: string[]; // rỗng = cả nhóm
}

export interface SplitBill {
  id: string;
  title: string;
  date: string;
  payer: string;
  members: string[];
  mode: SplitMode;
  total: number;
  items: SplitItem[];
  sharedFee: number;
  shares: Record<string, number>;
  createdAt: string;
}

export interface AppSettings {
  privacyMode: boolean;
  theme: "light" | "dark" | "system";
  currency: string;
  dailyLimit: number;
  lockedSavings: number; // Tiền tiết kiệm khóa bổ sung ngoài ví
}

// ---- Safe-to-Spend calculation input & result ----

export interface SafeToSpendInput {
  availableBalance: number; // Số dư ví khả dụng
  unpaidBills: number;      // Hóa đơn định kỳ chưa trả trong tháng
  lockedSavings: number;    // Tiền tiết kiệm đã khóa
  daysRemaining: number;    // Số ngày còn lại trong tháng
}

export interface SafeToSpendOptions {
  allowNegative?: boolean;  // Cho phép trả về số âm hay làm tròn về 0
}

export interface SafeToSpendDetail extends SafeToSpendInput {
  pool: number;             // availableBalance - unpaidBills - lockedSavings
  dailyAmount: number;      // Safe-to-Spend mỗi ngày
  isNegative: boolean;
}

// ---- Computed / view models ----

export interface CategoryStat {
  categoryId: CategoryId;
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface DailyTotal {
  date: string;      // "dd/MM"
  fullDate: string;  // ISO
  income: number;
  expense: number;
}
