/**
 * Forward-looking projection. Known recurring charges are projected exactly
 * (we know rent recurs and insurance renews); discretionary one-off spending is
 * estimated from a trailing average. The result mirrors the actual-vs-normalized
 * split into the future, so lumpy renewal months are visible before they hit.
 *
 * Pure functions of their inputs.
 */
import type { Expense, MonthKey, RecurringExpense } from "@/types";
import {
  addMonthsToKey,
  currentMonthKey,
  endOfMonthISO,
  monthsBetweenKeys,
  startOfMonthISO,
  toMonthKey,
} from "@/lib/date";
import { monthlyAmortized, occurrencesBetween, occurrencesPerYear } from "@/lib/recurrence";

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface ForecastPoint {
  month: MonthKey;
  /** Real cash from recurring charges actually landing this month. */
  recurringActual: number;
  /** Smoothed recurring commitment for this month. */
  recurringNormalized: number;
  /** Estimated one-off spending (trailing average). */
  discretionary: number;
  projectedActual: number;
  projectedNormalized: number;
  /** True when a lumpy charge makes the real month spike above the baseline. */
  isSpike: boolean;
}

export interface ForecastInput {
  expenses: Expense[];
  recurring: RecurringExpense[];
  /** Number of future months to project (starting next month). */
  horizon: number;
  /** Months of history used to estimate discretionary spend. Default 3. */
  trailingWindow?: number;
  /** Reference "now" month; defaults to the current month. */
  startMonth?: MonthKey;
}

/** Average one-off spend per month over the trailing window before `reference`. */
export function discretionaryBaseline(expenses: Expense[], window: number, reference: MonthKey): number {
  const w = Math.max(1, window);
  const oldest = addMonthsToKey(reference, -w); // inclusive start
  const newest = addMonthsToKey(reference, -1); // last fully-elapsed month
  let sum = 0;
  for (const e of expenses) {
    if (e.excludeFromInsights) continue;
    const m = toMonthKey(e.date);
    if (monthsBetweenKeys(oldest, m) >= 0 && monthsBetweenKeys(m, newest) >= 0) {
      sum += e.amount;
    }
  }
  return round2(sum / w);
}

export function buildForecast(input: ForecastInput): ForecastPoint[] {
  const start = input.startMonth ?? currentMonthKey();
  const horizon = Math.max(1, input.horizon);
  const baseline = discretionaryBaseline(input.expenses, input.trailingWindow ?? 3, start);
  const active = input.recurring.filter((r) => r.active);

  const points: ForecastPoint[] = [];
  for (let i = 1; i <= horizon; i++) {
    const month = addMonthsToKey(start, i);
    let recurringActual = 0;
    let recurringNormalized = 0;
    for (const r of active) {
      recurringActual += occurrencesBetween(r, startOfMonthISO(month), endOfMonthISO(month)).reduce((s, o) => s + o.amount, 0);
      const anchorMonth = toMonthKey(r.anchorDate);
      const endMonth = r.endDate ? toMonthKey(r.endDate) : null;
      const started = monthsBetweenKeys(anchorMonth, month) >= 0;
      const beforeEnd = endMonth === null || monthsBetweenKeys(month, endMonth) >= 0;
      if (started && beforeEnd) recurringNormalized += monthlyAmortized(r);
    }
    const projectedActual = recurringActual + baseline;
    const projectedNormalized = recurringNormalized + baseline;
    points.push({
      month,
      recurringActual: round2(recurringActual),
      recurringNormalized: round2(recurringNormalized),
      discretionary: baseline,
      projectedActual: round2(projectedActual),
      projectedNormalized: round2(projectedNormalized),
      isSpike: projectedActual > projectedNormalized * 1.2 && projectedActual - projectedNormalized >= 50,
    });
  }
  return points;
}

export interface ForecastSummary {
  avgNormalized: number;
  totalActual: number;
  peakMonth: MonthKey | null;
  peakActual: number;
  spikeCount: number;
  /** Suggested monthly amount to set aside so lumpy months don't hurt. */
  bufferMonthly: number;
  horizon: number;
}

export function summarizeForecast(points: ForecastPoint[]): ForecastSummary {
  if (points.length === 0) {
    return { avgNormalized: 0, totalActual: 0, peakMonth: null, peakActual: 0, spikeCount: 0, bufferMonthly: 0, horizon: 0 };
  }
  let totalActual = 0;
  let totalNormalized = 0;
  let peakActual = -Infinity;
  let peakMonth: MonthKey | null = null;
  let lumpSum = 0;
  for (const p of points) {
    totalActual += p.projectedActual;
    totalNormalized += p.projectedNormalized;
    lumpSum += Math.max(0, p.projectedActual - p.projectedNormalized);
    if (p.projectedActual > peakActual) {
      peakActual = p.projectedActual;
      peakMonth = p.month;
    }
  }
  const n = points.length;
  return {
    avgNormalized: round2(totalNormalized / n),
    totalActual: round2(totalActual),
    peakMonth,
    peakActual: round2(peakActual),
    spikeCount: points.filter((p) => p.isSpike).length,
    bufferMonthly: round2(lumpSum / n),
    horizon: n,
  };
}

export interface UpcomingCharge {
  recurringId: string;
  name: string;
  categoryId: string;
  date: string;
  month: MonthKey;
  amount: number;
}

/**
 * The big, lumpy charges coming up — periodic (non-monthly) recurring charges
 * within the horizon, soonest first. These are the ones worth planning for.
 */
export function upcomingLumpyCharges(input: ForecastInput): UpcomingCharge[] {
  const start = input.startMonth ?? currentMonthKey();
  const horizon = Math.max(1, input.horizon);
  const from = startOfMonthISO(addMonthsToKey(start, 1));
  const to = endOfMonthISO(addMonthsToKey(start, horizon));
  const out: UpcomingCharge[] = [];
  for (const r of input.recurring) {
    if (!r.active) continue;
    if (occurrencesPerYear(r) >= 12) continue; // weekly/biweekly/monthly aren't "lumps"
    for (const occ of occurrencesBetween(r, from, to)) {
      out.push({
        recurringId: r.id,
        name: r.name,
        categoryId: r.categoryId,
        date: occ.date,
        month: toMonthKey(occ.date),
        amount: occ.amount,
      });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
