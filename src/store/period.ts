/** The month the dashboard & insights are focused on. Shared across pages. */
import { create } from "zustand";
import type { MonthKey } from "@/types";
import { addMonthsToKey, currentMonthKey } from "@/lib/date";

interface PeriodState {
  month: MonthKey;
  /** True once the user has navigated or the month was auto-initialized from data. */
  initialized: boolean;
  setMonth: (month: MonthKey) => void;
  next: () => void;
  prev: () => void;
  reset: () => void;
  /** One-shot: snap to the latest month that has data, unless already set/touched. */
  initOnce: (month: MonthKey) => void;
}

export const usePeriod = create<PeriodState>((set) => ({
  month: currentMonthKey(),
  initialized: false,
  setMonth: (month) => set({ month, initialized: true }),
  next: () => set((s) => ({ month: addMonthsToKey(s.month, 1), initialized: true })),
  prev: () => set((s) => ({ month: addMonthsToKey(s.month, -1), initialized: true })),
  reset: () => set({ month: currentMonthKey(), initialized: true }),
  initOnce: (month) => set((s) => (s.initialized ? s : { month, initialized: true })),
}));
