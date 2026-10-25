/** Shared pure helpers for the Recurring & Normalized page. */
import type { Category, ID, RecurrenceOccurrence, RecurringExpense } from "@/types";
import {
  addMonthsToKey,
  currentMonthKey,
  endOfMonthISO,
  todayISO,
} from "@/lib/date";
import { occurrencesBetween } from "@/lib/recurrence";

/** Active items first, then by name — the list's default ordering. */
export function sortRecurring(items: RecurringExpense[]): RecurringExpense[] {
  return [...items].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/** Whether a recurring item's category is essential (default true if unknown). */
export function isEssential(rec: RecurringExpense, categories: Map<ID, Category>): boolean {
  return categories.get(rec.categoryId)?.essential ?? true;
}

/**
 * The next concrete charge date on/after today (looking ahead 12 months), or
 * null if the item has no upcoming charge (e.g. it has ended).
 */
export function nextChargeDate(rec: RecurringExpense): string | null {
  const horizon = endOfMonthISO(addMonthsToKey(currentMonthKey(), 12));
  const occ = occurrencesBetween(rec, todayISO(), horizon);
  return occ.length > 0 ? occ[0].date : null;
}

export interface UpcomingOccurrence extends RecurrenceOccurrence {
  name: string;
  categoryId: ID;
}

/**
 * All concrete charges across the given active recurring items over the next
 * `monthsAhead` months, flattened and sorted by date.
 */
export function gatherUpcoming(items: RecurringExpense[], monthsAhead: number): UpcomingOccurrence[] {
  const end = endOfMonthISO(addMonthsToKey(currentMonthKey(), monthsAhead));
  const start = todayISO();
  const out: UpcomingOccurrence[] = [];
  for (const rec of items) {
    if (!rec.active) continue;
    for (const occ of occurrencesBetween(rec, start, end)) {
      out.push({ ...occ, name: rec.name, categoryId: rec.categoryId });
    }
  }
  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return out;
}

/** Split a comma-separated tag string into a clean string[]. */
export function parseTags(input: string): string[] {
  return input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

const AMORTIZE_BY_DEFAULT = new Set(["annual", "semiannual", "quarterly", "custom"]);

/** Lumpy frequencies default to smoothing ON in the add form. */
export function defaultAmortizeFor(frequency: string): boolean {
  return AMORTIZE_BY_DEFAULT.has(frequency);
}
