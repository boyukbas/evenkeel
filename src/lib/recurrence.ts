/**
 * Recurrence math: how often a recurring expense fires, what its smoothed
 * monthly cost is, and the concrete charge dates inside a window.
 */
import { addDays, addMonths, format, isAfter, isBefore, parseISO } from "date-fns";
import type { Frequency, ISODate, RecurrenceOccurrence, RecurringExpense } from "@/types";

type RateLike = Pick<RecurringExpense, "amount" | "frequency" | "interval" | "customMonths">;

const PER_YEAR: Record<Exclude<Frequency, "custom">, number> = {
  weekly: 52,
  biweekly: 26,
  monthly: 12,
  quarterly: 4,
  semiannual: 2,
  annual: 1,
};

/** How many times this charge occurs in a year (fractional allowed). */
export function occurrencesPerYear(rec: Pick<RateLike, "frequency" | "interval" | "customMonths">): number {
  const interval = Math.max(1, rec.interval || 1);
  if (rec.frequency === "custom") {
    const months = Math.max(1, rec.customMonths || 1) * interval;
    return 12 / months;
  }
  return PER_YEAR[rec.frequency] / interval;
}

/**
 * The flagship number: the even, smoothed monthly cost of a recurring charge.
 * A $1,200 annual policy → $100/mo; a $300 quarterly bill → $100/mo.
 */
export function monthlyAmortized(rec: RateLike): number {
  return (rec.amount || 0) * occurrencesPerYear(rec) / 12;
}

/** Total spent on this charge across a full year. */
export function annualCost(rec: RateLike): number {
  return (rec.amount || 0) * occurrencesPerYear(rec);
}

function advance(date: Date, rec: Pick<RecurringExpense, "frequency" | "customMonths">, interval: number): Date {
  switch (rec.frequency) {
    case "weekly":
      return addDays(date, 7 * interval);
    case "biweekly":
      return addDays(date, 14 * interval);
    case "monthly":
      return addMonths(date, interval);
    case "quarterly":
      return addMonths(date, 3 * interval);
    case "semiannual":
      return addMonths(date, 6 * interval);
    case "annual":
      return addMonths(date, 12 * interval);
    case "custom":
      return addMonths(date, Math.max(1, rec.customMonths || 1) * interval);
  }
}

/**
 * Concrete charge dates for `rec` within [startISO, endISO] inclusive, walking
 * forward from its anchor date and respecting its end date. Capped to avoid
 * runaway loops on malformed input.
 */
export function occurrencesBetween(rec: RecurringExpense, startISO: ISODate, endISO: ISODate): RecurrenceOccurrence[] {
  const out: RecurrenceOccurrence[] = [];
  const interval = Math.max(1, rec.interval || 1);
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  const hardEnd = rec.endDate ? parseISO(rec.endDate) : null;
  let cur = parseISO(rec.anchorDate);

  for (let guard = 0; guard < 20000 && !isAfter(cur, end); guard++) {
    if (hardEnd && isAfter(cur, hardEnd)) break;
    if (!isBefore(cur, start)) {
      out.push({ recurringId: rec.id, date: format(cur, "yyyy-MM-dd"), amount: rec.amount });
    }
    cur = advance(cur, rec, interval);
  }
  return out;
}

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  quarterly: "Quarterly",
  semiannual: "Every 6 months",
  annual: "Yearly",
  custom: "Custom",
};

/** Human label like "Yearly" or "Every 3 months". */
export function describeFrequency(rec: Pick<RecurringExpense, "frequency" | "interval" | "customMonths">): string {
  const interval = Math.max(1, rec.interval || 1);
  if (rec.frequency === "custom") {
    const m = Math.max(1, rec.customMonths || 1) * interval;
    return m === 1 ? "Monthly" : `Every ${m} months`;
  }
  if (interval === 1) return FREQUENCY_LABELS[rec.frequency];
  switch (rec.frequency) {
    case "weekly":
      return `Every ${interval} weeks`;
    case "biweekly":
      return `Every ${interval * 2} weeks`;
    case "monthly":
      return `Every ${interval} months`;
    case "quarterly":
      return `Every ${interval * 3} months`;
    case "semiannual":
      return `Every ${interval * 6} months`;
    case "annual":
      return `Every ${interval} years`;
    default:
      return FREQUENCY_LABELS[rec.frequency];
  }
}
