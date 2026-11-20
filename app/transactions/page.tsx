"use client";
import { useMemo, useState } from "react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useHydrated } from "@/lib/useHydrated";
import { PageSkeleton } from "@/components/ui/skeleton";
import {
  formatDateRelative,
  formatMoney,
  groupTransactionsByDate,
} from "@/lib/finance";
import { TransactionRow } from "@/components/transactions/transaction-row";
import { CATEGORIES, CATEGORY_LIST } from "@/lib/constants";
import {
  Search,
  Filter,
  Plus,
  ArrowLeftRight,
  TrendingDown,
  X,
  Calendar,
} from "lucide-react";
import { TransactionType, CategoryId } from "@/types";
import { AddTransactionModal } from "@/components/transactions/add-transaction-modal";
import { TransferModal } from "@/components/wallets/transfer-modal";
import { cn } from "@/lib/utils";

export default function TransactionsPage() {
  const hydrated = useHydrated();
  const { transactions, wallets } = useFinanceStore();

  const [addTxOpen, setAddTxOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  // Filters state
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | CategoryId>("all");
  const [walletFilter, setWalletFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Search text
      if (search.trim()) {
        const q = search.toLowerCase();
        const cat = CATEGORIES[tx.categoryId]?.name.toLowerCase() || "";
        const note = (tx.note || "").toLowerCase();
        const amt = String(tx.amount);
        const matchSearch = note.includes(q) || cat.includes(q) || amt.includes(q);
        if (!matchSearch) return false;
      }

      // 2. Type filter
      if (typeFilter !== "all" && tx.type !== typeFilter) {
        return false;
      }

      // 3. Category filter
      if (categoryFilter !== "all" && tx.categoryId !== categoryFilter) {
        return false;
      }

      // 4. Wallet filter
      if (walletFilter !== "all") {
        const matchesWallet = tx.walletId === walletFilter || tx.toWalletId === walletFilter;
        if (!matchesWallet) return false;
      }

      // 5. Date range
      const txDate = tx.date.slice(0, 10);
      if (startDate && txDate < startDate) return false;
      if (endDate && txDate > endDate) return false;

      return true;
    });
  }, [transactions, search, typeFilter, categoryFilter, walletFilter, startDate, endDate]);

  const grouped = useMemo(
    () => groupTransactionsByDate(filteredTransactions),
    [filteredTransactions]
  );

  const hasActiveFilters =
    search || typeFilter !== "all" || categoryFilter !== "all" || walletFilter !== "all" || startDate || endDate;

  const resetFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setCategoryFilter("all");
    setWalletFilter("all");
    setStartDate("");
    setEndDate("");
  };

  if (!hydrated) {
    return <PageSkeleton />;
  }

  return (
    <div className="pb-24 md:pb-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-800 text-[var(--color-text-primary)]">
            Lịch sử giao dịch
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Tổng cộng {filteredTransactions.length} giao dịch
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTransferOpen(true)}
            className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-600 text-[var(--color-text-primary)] hover:border-[var(--color-accent)]"
          >
            <ArrowLeftRight size={14} />
            <span className="hidden sm:inline">Chuyển ví</span>
          </button>
          <button
            onClick={() => setAddTxOpen(true)}
            className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3.5 py-2 text-xs font-600 text-white shadow-sm active:scale-95 transition-transform"
          >
            <Plus size={16} strokeWidth={2} />
            <span>Thêm mới</span>
          </button>
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="card p-3 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo ghi chú, danh mục, số tiền..."
              className="w-full h-10 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] pl-9 pr-8 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-1.5 px-3 h-10 rounded-[var(--radius-sm)] border text-xs font-600 transition-colors",
              showFilters || hasActiveFilters
                ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-secondary)]"
            )}
          >
            <Filter size={14} />
            <span>Bộ lọc</span>
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
            )}
          </button>
        </div>

        {/* Type pill tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: "all", label: "Tất cả" },
            { id: "expense", label: "Chi tiêu" },
            { id: "income", label: "Thu nhập" },
            { id: "transfer", label: "Chuyển tiền ví" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id as any)}
              className={cn(
                "px-3 py-1.5 rounded-full whitespace-nowrap font-500 transition-colors",
                typeFilter === tab.id
                  ? "bg-[var(--color-accent)] text-white font-600"
                  : "bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Expanded Filters Drawer */}
        {showFilters && (
          <div className="border-t border-[var(--color-border)]/60 pt-3 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Category */}
              <div>
                <label className="text-[11px] font-500 text-[var(--color-text-secondary)] mb-1 block">
                  Danh mục
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as any)}
                  className="w-full h-9 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-xs text-[var(--color-text-primary)]"
                >
                  <option value="all">Tất cả danh mục</option>
                  {CATEGORY_LIST.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Wallet */}
              <div>
                <label className="text-[11px] font-500 text-[var(--color-text-secondary)] mb-1 block">
                  Ví tiền
                </label>
                <select
                  value={walletFilter}
                  onChange={(e) => setWalletFilter(e.target.value)}
                  className="w-full h-9 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-xs text-[var(--color-text-primary)]"
                >
                  <option value="all">Tất cả ví</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="text-[11px] font-500 text-[var(--color-text-secondary)] mb-1 block">
                  Từ ngày
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-9 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-xs text-[var(--color-text-primary)]"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="text-[11px] font-500 text-[var(--color-text-secondary)] mb-1 block">
                  Đến ngày
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-9 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-xs text-[var(--color-text-primary)]"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={resetFilters}
                  className="text-xs text-[var(--color-expense)] hover:underline font-500"
                >
                  Đặt lại bộ lọc
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transaction List grouped by date */}
      {filteredTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center p-8 card">
          <TrendingDown size={44} strokeWidth={1.25} className="text-[var(--color-border)] mb-3" />
          <h2 className="text-base font-600 text-[var(--color-text-primary)] mb-1">
            Không tìm thấy giao dịch nào
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] mb-3">
            {hasActiveFilters
              ? "Thử thay đổi từ khóa hoặc điều kiện bộ lọc của bạn"
              : "Bạn chưa có giao dịch nào"}
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs font-600 text-[var(--color-accent)] hover:underline"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([dateStr, txs]) => {
            const dayIncome = txs
              .filter((t) => t.type === "income")
              .reduce((s, t) => s + t.amount, 0);
            const dayExpense = txs
              .filter((t) => t.type === "expense")
              .reduce((s, t) => s + t.amount, 0);

            return (
              <div key={dateStr} className="card overflow-hidden">
                {/* Date header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--color-bg)]/60 border-b border-[var(--color-border)]/50 text-xs">
                  <div className="flex items-center gap-2">
                    <Calendar size={13} className="text-[var(--color-text-secondary)]" />
                    <span className="font-700 text-[var(--color-text-primary)] uppercase tracking-wider">
                      {formatDateRelative(dateStr)}
                    </span>
                    <span className="text-[var(--color-text-secondary)]">({dateStr})</span>
                  </div>

                  <div className="flex items-center gap-3 font-600 tabular-nums text-[11px]">
                    {dayIncome > 0 && (
                      <span className="text-[var(--color-income)]">+{formatMoney(dayIncome)}</span>
                    )}
                    {dayExpense > 0 && (
                      <span className="text-[var(--color-expense)]">-{formatMoney(dayExpense)}</span>
                    )}
                  </div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-[var(--color-border)]/50 px-1">
                  {txs.map((tx) => (
                    <TransactionRow key={tx.id} transaction={tx} showDate={false} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <AddTransactionModal open={addTxOpen} onClose={() => setAddTxOpen(false)} />
      <TransferModal open={transferOpen} onClose={() => setTransferOpen(false)} />
    </div>
  );
}
