"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Target } from "lucide-react";
import { useState } from "react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { SavingsGoal } from "@/types";
import { cn } from "@/lib/utils";

interface GoalModalProps {
  open: boolean;
  onClose: () => void;
  goalToEdit?: SavingsGoal | null;
}

const COLORS = ["#C8A44A", "#2D7D5F", "#4A90D9", "#7C6FCD", "#E05C4B", "#8B6F4A"];

export function GoalModal(props: GoalModalProps) {
  if (!props.open) return null;
  return <GoalModalInner key={props.goalToEdit?.id ?? "new"} {...props} />;
}

function GoalModalInner({ open, onClose, goalToEdit }: GoalModalProps) {
  const { addGoal, updateGoal } = useFinanceStore();

  const [name, setName] = useState(goalToEdit?.name ?? "");
  const [target, setTarget] = useState(goalToEdit ? String(goalToEdit.target) : "");
  const [saved, setSaved] = useState(goalToEdit ? String(goalToEdit.saved) : "");
  const [deadline, setDeadline] = useState(goalToEdit?.deadline ?? "");
  const [color, setColor] = useState(goalToEdit?.color ?? COLORS[0]);

  const formatInput = (val: string) => {
    const num = val.replace(/\D/g, "");
    return num ? new Intl.NumberFormat("vi-VN").format(Number(num)) : "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetNum = parseInt(target.replace(/\D/g, ""), 10);
    const savedNum = parseInt(saved.replace(/\D/g, "") || "0", 10);
    if (!name.trim() || !targetNum || targetNum <= 0) return;

    if (goalToEdit) {
      updateGoal(goalToEdit.id, {
        name: name.trim(),
        target: targetNum,
        deadline: deadline || undefined,
        color,
      });
    } else {
      addGoal({
        name: name.trim(),
        target: targetNum,
        saved: savedNum,
        deadline: deadline || undefined,
        color,
        icon: "Target",
      });
    }
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
            "bottom-0 w-full rounded-t-[var(--radius-xl)] md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:w-full md:max-w-md md:rounded-[var(--radius-xl)]",
            "p-5 space-y-4 max-h-[90dvh] overflow-y-auto"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/15 flex items-center justify-center text-[var(--color-accent)]">
                <Target size={18} strokeWidth={2} />
              </div>
              <Dialog.Title className="text-base font-600 text-[var(--color-text-primary)]">
                {goalToEdit ? "Sửa mục tiêu" : "Tạo mục tiêu tiết kiệm"}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="rounded-[var(--radius-sm)] p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                Tên mục tiêu
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Đổi laptop, đi Đà Lạt, quỹ dự phòng..."
                required
                className="w-full h-11 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>

            <div>
              <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                Số tiền mục tiêu
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatInput(target)}
                  onChange={(e) => setTarget(e.target.value.replace(/\D/g, ""))}
                  placeholder="0"
                  required
                  className="w-full h-11 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 pr-8 text-xl font-700 text-[var(--color-text-primary)] tabular-nums focus:outline-none focus:border-[var(--color-accent)]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-secondary)]">
                  ₫
                </span>
              </div>
            </div>

            {!goalToEdit && (
              <div>
                <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                  Đã có sẵn (tùy chọn)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatInput(saved)}
                    onChange={(e) => setSaved(e.target.value.replace(/\D/g, ""))}
                    placeholder="0"
                    className="w-full h-10 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 pr-8 text-sm font-700 text-[var(--color-text-primary)] tabular-nums focus:outline-none focus:border-[var(--color-accent)]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-secondary)]">
                    ₫
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1 block">
                Hạn mong muốn (tùy chọn)
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full h-10 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>

            <div>
              <label className="text-xs font-500 text-[var(--color-text-secondary)] mb-1.5 block">
                Màu thẻ
              </label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "w-7 h-7 rounded-full border-2 transition-transform",
                      color === c ? "scale-110 border-[var(--color-text-primary)]" : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!name.trim() || !target}
              className="w-full h-11 rounded-[var(--radius-md)] bg-[var(--color-accent)] font-600 text-white active:scale-[0.97] transition-all disabled:opacity-50"
            >
              {goalToEdit ? "Lưu thay đổi" : "Tạo mục tiêu"}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
