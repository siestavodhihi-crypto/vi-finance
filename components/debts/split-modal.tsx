"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Users, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { ME, splitDebts, splitEqual, splitItemized } from "@/lib/split";
import { formatMoney } from "@/lib/finance";
import { SplitItem, SplitMode } from "@/types";
import { cn } from "@/lib/utils";

interface SplitModalProps {
  open: boolean;
  onClose: () => void;
}

export function SplitModal(props: SplitModalProps) {
  if (!props.open) return null;
  return <SplitModalInner {...props} />;
}

function SplitModalInner({ open, onClose }: SplitModalProps) {
  const { addSplitBill } = useFinanceStore();

  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<SplitMode>("equal");
  const [members, setMembers] = useState<string[]>([ME, "Minh", "Lan"]);
  const [newMember, setNewMember] = useState("");
  const [payer, setPayer] = useState(ME);
  const [equalTotal, setEqualTotal] = useState("");
  const [sharedFee, setSharedFee] = useState("");
  const [items, setItems] = useState<SplitItem[]>([
    { id: "i1", name: "Món chung", amount: 0, sharedBy: [] },
  ]);

  const formatInput = (val: string) => {
    const num = val.replace(/\D/g, "");
    return num ? new Intl.NumberFormat("vi-VN").format(Number(num)) : "";
  };

  const addMember = () => {
    const name = newMember.trim();
    if (!name || members.includes(name)) return;
    setMembers([...members, name]);
    setNewMember("");
  };

  const removeMember = (name: string) => {
    if (name === ME || members.length <= 2) return;
    const next = members.filter((m) => m !== name);
    setMembers(next);
    if (payer === name) setPayer(ME);
  };

  const toggleItemMember = (itemId: string, member: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const exists = it.sharedBy.includes(member);
        return {
          ...it,
          sharedBy: exists
            ? it.sharedBy.filter((m) => m !== member)
            : [...it.sharedBy, member],
        };
      })
    );
  };

  const shares = useMemo(() => {
    if (mode === "equal") {
      const total = parseInt(equalTotal.replace(/\D/g, "") || "0", 10);
      return splitEqual(total, members);
    }
    const fee = parseInt(sharedFee.replace(/\D/g, "") || "0", 10);
    return splitItemized(items, members, fee);
  }, [mode, equalTotal, members, items, sharedFee]);

  const totalAmount = useMemo(
    () => Object.values(shares).reduce((s, v) => s + v, 0),
    [shares]
  );

  const previewDebts = useMemo(() => splitDebts(shares, payer), [shares, payer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || totalAmount <= 0) return;

    addSplitBill({
      title: title.trim(),
      date: new Date().toISOString(),
      payer,
      members,
      mode,
      total: totalAmount,
      items: mode === "itemized" ? items : [],
      sharedFee: mode === "itemized" ? parseInt(sharedFee.replace(/\D/g, "") || "0", 10) : 0,
      shares,
    });
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed z-50 bg-[var(--color-surface)] shadow-[var(--shadow-lg)]",
            "left-1/2 -translate-x-1/2",
            "bottom-0 w-full rounded-t-[var(--radius-xl)] md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg md:rounded-[var(--radius-xl)]",
            "p-5 space-y-4 max-h-[90dvh] overflow-y-auto"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/15 flex items-center justify-center text-[var(--color-accent)]">
                <Users size={18} strokeWidth={2} />
              </div>
              <Dialog.Title className="text-base font-600 text-[var(--color-text-primary)]">
                Chia tiền nhóm
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="rounded-[var(--radius-sm)] p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tên hóa đơn */}
            <div>
              <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                Buổi đi chơi / Hóa đơn
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ăn lẩu tối thứ 7, đi cà phê nhóm..."
                required
                className="w-full h-10 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>

            {/* Thành viên */}
            <div className="space-y-2">
              <label className="text-xs font-500 text-[var(--color-text-secondary)] block">
                Thành viên ({members.length} người)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {members.map((m) => (
                  <span
                    key={m}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-600 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                  >
                    {m}
                    {m !== ME && members.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeMember(m)}
                        className="text-[var(--color-text-secondary)] hover:text-[var(--color-expense)]"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMember}
                  onChange={(e) => setNewMember(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addMember();
                    }
                  }}
                  placeholder="Thêm tên bạn..."
                  className="flex-1 h-9 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                />
                <button
                  type="button"
                  onClick={addMember}
                  className="px-3 h-9 rounded-[var(--radius-sm)] border border-[var(--color-border)] text-xs font-600 text-[var(--color-text-primary)] hover:border-[var(--color-accent)]"
                >
                  + Thêm
                </button>
              </div>
            </div>

            {/* Người trả + Chế độ chia */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                  Ai trả tiền?
                </label>
                <select
                  value={payer}
                  onChange={(e) => setPayer(e.target.value)}
                  className="w-full h-10 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 text-xs font-600 text-[var(--color-text-primary)]"
                >
                  {members.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                  Cách chia
                </label>
                <div className="flex rounded-[var(--radius-sm)] bg-[var(--color-bg)] p-0.5 border border-[var(--color-border)] h-10">
                  {(["equal", "itemized"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={cn(
                        "flex-1 rounded-[var(--radius-sm)] text-xs font-600 transition-all",
                        mode === m
                          ? "bg-[var(--color-accent)] text-white"
                          : "text-[var(--color-text-secondary)]"
                      )}
                    >
                      {m === "equal" ? "Chia đều" : "Theo món"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Input theo chế độ */}
            {mode === "equal" ? (
              <div>
                <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                  Tổng tiền hóa đơn
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatInput(equalTotal)}
                    onChange={(e) => setEqualTotal(e.target.value.replace(/\D/g, ""))}
                    placeholder="0"
                    className="w-full h-11 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 pr-8 text-xl font-700 text-[var(--color-text-primary)] tabular-nums focus:outline-none focus:border-[var(--color-accent)]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-secondary)]">
                    ₫
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-500 text-[var(--color-text-secondary)]">
                    Danh sách món (để trống người = chia cả nhóm)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setItems([
                        ...items,
                        { id: `i${Date.now()}`, name: "", amount: 0, sharedBy: [] },
                      ])
                    }
                    className="inline-flex items-center gap-1 text-xs font-600 text-[var(--color-accent)] hover:underline"
                  >
                    <Plus size={13} /> Thêm món
                  </button>
                </div>

                {items.map((it) => (
                  <div
                    key={it.id}
                    className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5 space-y-2"
                  >
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={it.name}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((x) => (x.id === it.id ? { ...x, name: e.target.value } : x))
                          )
                        }
                        placeholder="Tên món..."
                        className="flex-1 h-8 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs text-[var(--color-text-primary)]"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={it.amount ? formatInput(String(it.amount)) : ""}
                        onChange={(e) => {
                          const v = parseInt(e.target.value.replace(/\D/g, "") || "0", 10);
                          setItems((prev) =>
                            prev.map((x) => (x.id === it.id ? { ...x, amount: v } : x))
                          );
                        }}
                        placeholder="Giá tiền"
                        className="w-28 h-8 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs font-700 tabular-nums text-[var(--color-text-primary)]"
                      />
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setItems((prev) => prev.filter((x) => x.id !== it.id))}
                          className="p-1.5 text-[var(--color-expense)] hover:bg-[var(--color-expense)]/10 rounded"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {members.map((m) => {
                        const active = it.sharedBy.includes(m);
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => toggleItemMember(it.id, m)}
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[11px] font-500 transition-colors",
                              active
                                ? "bg-[var(--color-accent)] text-white"
                                : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)]"
                            )}
                          >
                            {m}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div>
                  <label className="text-[11px] font-500 text-[var(--color-text-secondary)] mb-1 block">
                    Phí chung (ship, VAT... chia đều)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatInput(sharedFee)}
                    onChange={(e) => setSharedFee(e.target.value.replace(/\D/g, ""))}
                    placeholder="0"
                    className="w-full h-9 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-xs font-700 tabular-nums text-[var(--color-text-primary)]"
                  />
                </div>
              </div>
            )}

            {/* Preview kết quả chia */}
            {totalAmount > 0 && (
              <div className="rounded-[var(--radius-md)] bg-[var(--color-bg)] border border-[var(--color-border)] p-3 space-y-2 text-xs">
                <div className="flex justify-between font-700 text-[var(--color-text-primary)]">
                  <span>Tổng cộng</span>
                  <span className="tabular-nums">{formatMoney(totalAmount)}</span>
                </div>
                <div className="border-t border-[var(--color-border)] pt-2 space-y-1">
                  {members.map((m) => (
                    <div key={m} className="flex justify-between text-[var(--color-text-secondary)]">
                      <span>
                        {m} {m === payer ? "(đã trả)" : ""}
                      </span>
                      <span className="font-600 tabular-nums text-[var(--color-text-primary)]">
                        {formatMoney(shares[m] ?? 0)}
                      </span>
                    </div>
                  ))}
                </div>
                {previewDebts.length > 0 && (
                  <div className="border-t border-[var(--color-border)] pt-2 space-y-1">
                    <p className="text-[11px] font-600 text-[var(--color-accent)]">
                      Sẽ tự động ghi vào sổ nợ:
                    </p>
                    {previewDebts.map((d, i) => (
                      <p key={i} className="text-[11px] text-[var(--color-text-primary)]">
                        •{" "}
                        {d.direction === "they_owe"
                          ? `${d.person} nợ bạn ${formatMoney(d.amount)}`
                          : `Bạn nợ ${d.person} ${formatMoney(d.amount)}`}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={!title.trim() || totalAmount <= 0}
              className="w-full h-11 rounded-[var(--radius-md)] bg-[var(--color-accent)] font-600 text-white active:scale-[0.97] transition-all disabled:opacity-50"
            >
              Lưu & ghi vào sổ nợ
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
