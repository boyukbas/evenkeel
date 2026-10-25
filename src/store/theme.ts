/**
 * Tracks the *resolved* theme (after evaluating "system") so charts can recolor.
 * The pref itself lives in Settings; ThemeProvider reconciles the two.
 */
import { create } from "zustand";

interface ThemeState {
  isDark: boolean;
  /** Bumped whenever the resolved theme flips, so chart palettes recompute. */
  tick: number;
  setIsDark: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: true,
  tick: 0,
  setIsDark: (isDark) => set((s) => (s.isDark === isDark ? s : { isDark, tick: s.tick + 1 })),
}));
