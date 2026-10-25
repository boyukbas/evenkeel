/**
 * The normalization engine. Turns raw expenses + recurring definitions into
 * two parallel views of every month:
 *
 *   actual     — the real cash that left your account that month (lumpy)
 *   normalized — the same spending with periodic charges spread evenly, so a
 *                single big payment no longer distorts the month
 *
 * Everything here is a pure function of its inputs.
 */
import type {
  CategoryAmount,
  Expense,
  ID,
  MonthKey,
  MonthlyPoint,
  RecurringExpense,
} from "@/types";
import { endOfMonthISO, monthsBetweenKeys, startOfMonthISO, toMonthKey } from "@/lib/date";
import { monthlyAmortized, occurrencesBetween } from "@/lib/recurrence";

export interface SeriesInput {
  expenses: Expense[];
  recurring: RecurringExpense[];
  months: MonthKey[];
  /** Include rows/definitions the user flagged out of insights. Default false. */
  includeExcluded?: boolean;
}

type CatMap = Map<ID, number>;

function add(map: CatMap, categoryId: ID, amount: number): void {
  map.set(categoryId, (map.get(categoryId) ?? 0) + amount);
}

function toCategoryAmounts(map: CatMap): CategoryAmount[] {
  return [...map.entries()]
    .map(([categoryId, amount]) => ({ categoryId, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/** The active month index for a recurring charge given an end date, else null. */
function recurringEndMonth(rec: RecurringExpense): MonthKey | null {
  return rec.endDate ? toMonthKey(rec.endDate) : null;
}

/**
 * Build the actual + normalized series for the requested months. This is the
 * single function the dashboard, insights, and trend charts all read from.
 */
export function buildMonthlySeries(input: SeriesInput): MonthlyPoint[] {
  const expenses = input.includeExcluded
    ? input.expenses
    : input.expenses.filter((e) => !e.excludeFromInsights);
  const recurring = input.recurring.filter((r) => r.active);
  const months = input.months;

  // Pre-index one-off expenses by their spend month.
  const byMonth = new Map<MonthKey, Expense[]>();
  for (const e of expenses) {
    const key = toMonthKey(e.date);
    const list = byMonth.get(key);
    if (list) list.push(e);
    else byMonth.set(key, [e]);
  }

  return months.map((month) => {
    const actualCat: CatMap = new Map();
    const normCat: CatMap = new Map();
    let actual = 0;
    let normalized = 0;

    // 1) One-off expenses landing this month — full actual hit.
    for (const e of byMonth.get(month) ?? []) {
      actual += e.amount;
      add(actualCat, e.categoryId, e.amount);
      // Normalized: spread over N months if amortized, else full.
      if (!e.amortizeMonths || e.amortizeMonths <= 1) {
        normalized += e.amount;
        add(normCat, e.categoryId, e.amount);
      }
    }

    // 1b) Amortized one-offs whose window covers this month (started earlier).
    for (const e of expenses) {
      const n = e.amortizeMonths ?? 0;
      if (n <= 1) continue;
      const offset = monthsBetweenKeys(toMonthKey(e.date), month);
      if (offset >= 0 && offset < n) {
        const share = e.amount / n;
        normalized += share;
        add(normCat, e.categoryId, share);
      }
    }

    // 2) Recurring charges.
    const monthStart = startOfMonthISO(month);
    const monthEnd = endOfMonthISO(month);
    for (const r of recurring) {
      const occ = occurrencesBetween(r, monthStart, monthEnd);
      const actualThisMonth = occ.reduce((s, o) => s + o.amount, 0);
      if (actualThisMonth) {
        actual += actualThisMonth;
        add(actualCat, r.categoryId, actualThisMonth);
      }

      const anchorMonth = toMonthKey(r.anchorDate);
      const endMonth = recurringEndMonth(r);
      const startedByNow = monthsBetweenKeys(anchorMonth, month) >= 0;
      const beforeEnd = endMonth === null || monthsBetweenKeys(month, endMonth) >= 0;

      if (r.amortize) {
        // Smoothed: even monthly share across the active life.
        if (startedByNow && beforeEnd) {
          const share = monthlyAmortized(r);
          normalized += share;
          add(normCat, r.categoryId, share);
        }
      } else if (actualThisMonth) {
        // Not smoothed: normalized mirrors the actual charge.
        normalized += actualThisMonth;
        add(normCat, r.categoryId, actualThisMonth);
      }
    }

    return {
      month,
      actual: round2(actual),
      normalized: round2(normalized),
      actualByCategory: toCategoryAmounts(actualCat),
      normalizedByCategory: toCategoryAmounts(normCat),
    };
  });
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** How much a month deviates from its smoothed baseline (actual − normalized). */
export function lumpiness(point: MonthlyPoint): number {
  return round2(point.actual - point.normalized);
}

/** Aggregate category totals across several months for a given view. */
export function categoryTotals(
  series: MonthlyPoint[],
  view: "actual" | "normalized",
): CategoryAmount[] {
  const map: CatMap = new Map();
  for (const p of series) {
    const list = view === "actual" ? p.actualByCategory : p.normalizedByCategory;
    for (const c of list) add(map, c.categoryId, c.amount);
  }
  return toCategoryAmounts(map).map((c) => ({ ...c, amount: round2(c.amount) }));
}

export interface SeriesSummary {
  totalActual: number;
  totalNormalized: number;
  avgActual: number;
  avgNormalized: number;
  /** Largest single-month actual in the window. */
  peakActual: number;
  peakActualMonth: MonthKey | null;
  monthCount: number;
}

export function summarize(series: MonthlyPoint[]): SeriesSummary {
  if (series.length === 0) {
    return {
      totalActual: 0,
      totalNormalized: 0,
      avgActual: 0,
      avgNormalized: 0,
      peakActual: 0,
      peakActualMonth: null,
      monthCount: 0,
    };
  }
  let totalActual = 0;
  let totalNormalized = 0;
  let peakActual = -Infinity;
  let peakActualMonth: MonthKey | null = null;
  for (const p of series) {
    totalActual += p.actual;
    totalNormalized += p.normalized;
    if (p.actual > peakActual) {
      peakActual = p.actual;
      peakActualMonth = p.month;
    }
  }
  const n = series.length;
  return {
    totalActual: round2(totalActual),
    totalNormalized: round2(totalNormalized),
    avgActual: round2(totalActual / n),
    avgNormalized: round2(totalNormalized / n),
    peakActual: round2(peakActual),
    peakActualMonth,
    monthCount: n,
  };
}

/** Convenience: the single MonthlyPoint for one month. */
export function pointForMonth(input: Omit<SeriesInput, "months">, month: MonthKey): MonthlyPoint {
  return buildMonthlySeries({ ...input, months: [month] })[0];
}

/** Percentage change between two numbers as a signed fraction (e.g. 0.2 = +20%). */
export function pctChange(from: number, to: number): number {
  if (from === 0) return to === 0 ? 0 : 1;
  return (to - from) / Math.abs(from);
}
