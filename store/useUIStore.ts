import { create } from "zustand";

interface UIState {
  quickAddOpen: boolean;
  setQuickAddOpen: (open: boolean) => void;
  toggleQuickAdd: () => void;

  onboardingOpen: boolean;
  setOnboardingOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  quickAddOpen: false,
  setQuickAddOpen: (open) => set({ quickAddOpen: open }),
  toggleQuickAdd: () => set((s) => ({ quickAddOpen: !s.quickAddOpen })),

  onboardingOpen: false,
  setOnboardingOpen: (open) => set({ onboardingOpen: open }),
}));
