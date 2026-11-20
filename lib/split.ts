/**
 * lib/split.ts — Chia tiền nhóm & tổng hợp sổ nợ (thuần, dễ test)
 * Mọi số tiền là số nguyên VND; phần lẻ được phân bổ để tổng luôn khớp.
 */
import { Debt, DebtDirection, SplitItem } from "@/types";

export const ME = "Tôi";

/** Làm tròn xuống từng phần rồi chia phần dư cho người có phần lẻ lớn nhất */
function distribute(exact: Record<string, number>, members: string[], total: number) {
  const rows = members.map((m) => {
    const v = exact[m] ?? 0;
    return { m, floor: Math.floor(v), frac: v - Math.floor(v) };
  });
  const result: Record<string, number> = {};
  rows.forEach((r) => (result[r.m] = r.floor));

  let rest = Math.round(total) - rows.reduce((s, r) => s + r.floor, 0);
  const byFrac = [...rows].sort((a, b) => b.frac - a.frac);
  for (let i = 0; rest > 0 && byFrac.length > 0; i = (i + 1) % byFrac.length) {
    result[byFrac[i].m] += 1;
    rest--;
  }
  return result;
}

export function splitEqual(total: number, members: string[]): Record<string, number> {
  if (members.length === 0 || total <= 0) return {};
  const each = total / members.length;
  const exact = Object.fromEntries(members.map((m) => [m, each]));
  return distribute(exact, members, total);
}

/**
 * Chia theo món: mỗi món chia đều cho những người dùng món đó
 * (để trống `sharedBy` = cả nhóm). Phí chung (ship, VAT...) chia đều.
 */
export function splitItemized(
  items: SplitItem[],
  members: string[],
  sharedFee = 0
): Record<string, number> {
  if (members.length === 0) return {};
  const exact: Record<string, number> = Object.fromEntries(members.map((m) => [m, 0]));
  let total = 0;

  for (const item of items) {
    if (item.amount <= 0) continue;
    const sharers = item.sharedBy.filter((p) => members.includes(p));
    const group = sharers.length > 0 ? sharers : members;
    group.forEach((p) => (exact[p] += item.amount / group.length));
    total += item.amount;
  }
  if (sharedFee > 0) {
    members.forEach((p) => (exact[p] += sharedFee / members.length));
    total += sharedFee;
  }
  if (total <= 0) return {};
  return distribute(exact, members, total);
}

export interface SplitDebt {
  person: string;
  direction: DebtDirection;
  amount: number;
}

/** Tôi trả → mọi người nợ tôi. Người khác trả → tôi nợ người đó phần của tôi. */
export function splitDebts(shares: Record<string, number>, payer: string): SplitDebt[] {
  const out: SplitDebt[] = [];
  for (const [person, amount] of Object.entries(shares)) {
    if (person === payer || amount <= 0) continue;
    if (payer === ME) out.push({ person, direction: "they_owe", amount });
    else if (person === ME) out.push({ person: payer, direction: "i_owe", amount });
  }
  return out;
}

export interface PersonBalance {
  person: string;
  net: number; // > 0: họ nợ tôi, < 0: tôi nợ họ
  count: number;
}

export function summarizeDebts(debts: Debt[]) {
  const open = debts.filter((d) => !d.settled);
  const theyOwe = open
    .filter((d) => d.direction === "they_owe")
    .reduce((s, d) => s + d.amount, 0);
  const iOwe = open.filter((d) => d.direction === "i_owe").reduce((s, d) => s + d.amount, 0);

  const map = new Map<string, PersonBalance>();
  for (const d of open) {
    const row = map.get(d.person) ?? { person: d.person, net: 0, count: 0 };
    row.net += d.direction === "they_owe" ? d.amount : -d.amount;
    row.count += 1;
    map.set(d.person, row);
  }

  return {
    theyOwe,
    iOwe,
    net: theyOwe - iOwe,
    people: [...map.values()].sort((a, b) => Math.abs(b.net) - Math.abs(a.net)),
  };
}
