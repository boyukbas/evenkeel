/** Theme-aware chart helpers shared by every chart in the app. */
import { useMemo } from "react";
import type { ReactNode } from "react";
import { useThemeStore } from "@/store/theme";
import { useMoney } from "@/hooks/useMoney";

const CHART_VARS = [
  "--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5",
  "--chart-6", "--chart-7", "--chart-8", "--chart-9", "--chart-10",
];

function resolveVar(name: string): string {
  if (typeof document === "undefined") return "#888888";
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || "#888888";
}

export interface ThemeColors {
  chart: string[];
  primary: string;
  mutedForeground: string;
  border: string;
  foreground: string;
  card: string;
  success: string;
  danger: string;
  warning: string;
}

/** Resolves CSS-variable colors to concrete hex values; recomputes on theme flip. */
export function useThemeColors(): ThemeColors {
  const tick = useThemeStore((s) => s.tick);
  return useMemo(() => {
    void tick; // dependency: re-resolve when the theme flips
    return {
      chart: CHART_VARS.map(resolveVar),
      primary: resolveVar("--primary"),
      mutedForeground: resolveVar("--muted-foreground"),
      border: resolveVar("--border"),
      foreground: resolveVar("--foreground"),
      card: resolveVar("--card"),
      success: resolveVar("--success"),
      danger: resolveVar("--danger"),
      warning: resolveVar("--warning"),
    };
  }, [tick]);
}

export function chartColorAt(colors: string[], index: number): string {
  return colors[index % colors.length];
}

interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: ReactNode;
  /** Override label formatting (e.g. month key → "May 2026"). */
  labelFormatter?: (label: unknown) => ReactNode;
  /** Format values as currency (default true). */
  currency?: boolean;
}

/** Drop-in Recharts tooltip styled to the theme and formatting currency. */
export function ChartTooltip({ active, payload, label, labelFormatter, currency = true }: ChartTooltipProps) {
  const money = useMoney();
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      {label != null && (
        <p className="mb-1 font-medium text-foreground">{labelFormatter ? labelFormatter(label) : String(label)}</p>
      )}
      <div className="space-y-0.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-medium text-foreground">
              {currency && typeof entry.value === "number" ? money.format(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
