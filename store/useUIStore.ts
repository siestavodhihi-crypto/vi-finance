import { create } from "zustand";

interface UIState {
  quickAddOpen: boolean;
  setQuickAddOpen: (open: boolean) => void;
  toggleQuickAdd: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  quickAddOpen: false,
  setQuickAddOpen: (open) => set({ quickAddOpen: open }),
  toggleQuickAdd: () => set((s) => ({ quickAddOpen: !s.quickAddOpen })),
}));
