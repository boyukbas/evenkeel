/**
 * Local helpers for the Insights feature: severity → accent token mapping and
 * the needs-vs-wants split over a window's normalized spend. Nothing here
 * touches shared files; it just composes the analytics already exposed.
 */
import type { Category, ID, InsightSeverity, MonthlyPoint } from "@/types";
import type { BadgeVariant } from "@/components/ui";
import { categoryTotals } from "@/lib/analytics";

/** Visual treatment for an insight card, keyed by severity. */
export interface SeverityAccent {
  /** Left accent bar + icon tint, e.g. "bg-warning". */
  bar: string;
  /** Icon foreground token, e.g. "text-warning". */
  text: string;
  /** Soft tile background for the icon, e.g. "bg-warning/10". */
  tile: string;
  badge: BadgeVariant;
  label: string;
}

export const SEVERITY_ACCENT: Record<InsightSeverity, SeverityAccent> = {
  warning: { bar: "bg-warning", text: "text-warning", tile: "bg-warning/10", badge: "warning", label: "Heads up" },
  opportunity: { bar: "bg-success", text: "text-success", tile: "bg-success/10", badge: "success", label: "Opportunity" },
  info: { bar: "bg-muted-foreground/40", text: "text-muted-foreground", tile: "bg-muted", badge: "default", label: "Info" },
};

export interface NeedsWants {
  needsTotal: number;
  wantsTotal: number;
  total: number;
  needsPct: number;
  wantsPct: number;
  needsMonthly: number;
  wantsMonthly: number;
}

/**
 * Essential (needs) vs non-essential (wants) share of the window's NORMALIZED
 * spend. Percentages are of the categorized total and always sum to 100 (or
 * both 0 when there's nothing to show).
 */
export function needsVsWants(
  series: MonthlyPoint[],
  byId: Map<ID, Category>,
  monthCount: number,
): NeedsWants {
  const totals = categoryTotals(series, "normalized");
  let needsTotal = 0;
  let wantsTotal = 0;
  for (const { categoryId, amount } of totals) {
    if (byId.get(categoryId)?.essential) needsTotal += amount;
    else wantsTotal += amount;
  }
  const total = needsTotal + wantsTotal;
  const months = Math.max(1, monthCount);
  return {
    needsTotal: round2(needsTotal),
    wantsTotal: round2(wantsTotal),
    total: round2(total),
    needsPct: total > 0 ? Math.round((needsTotal / total) * 100) : 0,
    wantsPct: total > 0 ? Math.round((wantsTotal / total) * 100) : 0,
    needsMonthly: round2(needsTotal / months),
    wantsMonthly: round2(wantsTotal / months),
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
