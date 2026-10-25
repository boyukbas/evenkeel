import { useEffect, type ReactNode } from "react";
import { useSettings } from "@/hooks/useData";
import { useThemeStore } from "@/store/theme";

/** Applies the user's theme preference (resolving "system") to <html>. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const setIsDark = useThemeStore((s) => s.setIsDark);
  const pref = settings.theme;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = pref === "dark" || (pref === "system" && mq.matches);
      document.documentElement.classList.toggle("dark", dark);
      setIsDark(dark);
    };
    apply();
    if (pref === "system") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [pref, setIsDark]);

  return <>{children}</>;
}
