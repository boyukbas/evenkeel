/**
 * Spot likely recurring charges hiding in one-off expenses: group transactions
 * by payee/description, and where the same label repeats on a regular cadence
 * with a steady amount, propose a recurring definition. Pure functions.
 */
import { differenceInCalendarDays, parseISO } from "date-fns";
import type { Expense, Frequency, ID, RecurringExpense } from "@/types";

export interface RecurringSuggestion {
  key: string;
  name: string;
  categoryId: ID;
  amount: number;
  frequency: Frequency;
  occurrences: number;
  lastDate: string;
  expenseIds: ID[];
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mostCommon<T>(items: T[]): T {
  const counts = new Map<T, number>();
  let best = items[0];
  let bestN = 0;
  for (const it of items) {
    const n = (counts.get(it) ?? 0) + 1;
    counts.set(it, n);
    if (n > bestN) {
      bestN = n;
      best = it;
    }
  }
  return best;
}

const CADENCES: ReadonlyArray<[number, Frequency]> = [
  [7, "weekly"],
  [14, "biweekly"],
  [30, "monthly"],
  [91, "quarterly"],
  [182, "semiannual"],
  [365, "annual"],
];

/** Nearest known cadence to a median gap (in days), or null if none is close. */
export function inferFrequency(medianGapDays: number): Frequency | null {
  let best: Frequency | null = null;
  let bestErr = Infinity;
  for (const [days, freq] of CADENCES) {
    const err = Math.abs(medianGapDays - days) / days;
    if (err < bestErr) {
      bestErr = err;
      best = freq;
    }
  }
  return bestErr <= 0.35 ? best : null;
}

export interface DetectOptions {
  /** Minimum repeats to suggest. Default 3. */
  minOccurrences?: number;
  /** Max amount coefficient-of-variation to treat as "steady". Default 0.25. */
  maxAmountCv?: number;
}

export function detectRecurring(
  expenses: Expense[],
  existing: RecurringExpense[],
  options: DetectOptions = {},
): RecurringSuggestion[] {
  const minOccurrences = options.minOccurrences ?? 3;
  const maxCv = options.maxAmountCv ?? 0.25;
  const existingNames = new Set(existing.filter((r) => r.active).map((r) => normalize(r.name)));

  const groups = new Map<string, Expense[]>();
  for (const e of expenses) {
    if (e.excludeFromInsights || e.recurringId) continue;
    const label = normalize(e.payee || e.description || "");
    if (!label) continue;
    let g = groups.get(label);
    if (!g) {
      g = [];
      groups.set(label, g);
    }
    g.push(e);
  }

  const suggestions: RecurringSuggestion[] = [];
  for (const [label, list] of groups) {
    if (list.length < minOccurrences || existingNames.has(label)) continue;

    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    const dates = sorted.map((e) => parseISO(e.date));
    const gaps: number[] = [];
    for (let i = 1; i < dates.length; i++) gaps.push(differenceInCalendarDays(dates[i], dates[i - 1]));
    const medGap = median(gaps);
    if (medGap < 4) continue; // too bunched to be a scheduled charge

    const frequency = inferFrequency(medGap);
    if (!frequency) continue;

    const amounts = sorted.map((e) => e.amount);
    const mean = amounts.reduce((s, x) => s + x, 0) / amounts.length;
    const sd = Math.sqrt(amounts.reduce((s, x) => s + (x - mean) ** 2, 0) / amounts.length);
    if (mean > 0 && sd / mean > maxCv) continue; // amounts too variable

    suggestions.push({
      key: label,
      name: (sorted[0].payee || sorted[0].description || label).trim(),
      categoryId: mostCommon(sorted.map((e) => e.categoryId)),
      amount: round2(median(amounts)),
      frequency,
      occurrences: sorted.length,
      lastDate: sorted[sorted.length - 1].date,
      expenseIds: sorted.map((e) => e.id),
    });
  }

  return suggestions.sort((a, b) => b.occurrences - a.occurrences || b.amount - a.amount);
}
