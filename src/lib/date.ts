/** Date helpers built on date-fns, centered on the "YYYY-MM" month key. */
import {
  addMonths,
  differenceInCalendarMonths,
  endOfMonth,
  format,
  isValid,
  parse,
  parseISO,
  startOfMonth,
} from "date-fns";
import type { ISODate, MonthKey } from "@/types";

/** Local "today" as an ISO date string (YYYY-MM-DD). */
export function todayISO(): ISODate {
  return format(new Date(), "yyyy-MM-dd");
}

/** Current month key, e.g. "2026-05". */
export function currentMonthKey(): MonthKey {
  return format(new Date(), "yyyy-MM");
}

/** Convert an ISO date (or Date) to its month key. */
export function toMonthKey(date: ISODate | Date): MonthKey {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "yyyy-MM");
}

export function monthKeyToDate(month: MonthKey): Date {
  return parse(month + "-01", "yyyy-MM-dd", new Date());
}

/** "May 2026" */
export function formatMonthLong(month: MonthKey): string {
  return format(monthKeyToDate(month), "MMMM yyyy");
}

/** "May '26" — compact for axes. */
export function formatMonthShort(month: MonthKey): string {
  return format(monthKeyToDate(month), "MMM ''yy");
}

export function formatDateMedium(date: ISODate, locale?: string): string {
  const d = parseISO(date);
  if (!isValid(d)) return date;
  return d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

export function addMonthsToKey(month: MonthKey, delta: number): MonthKey {
  return format(addMonths(monthKeyToDate(month), delta), "yyyy-MM");
}

export function monthsBetweenKeys(from: MonthKey, to: MonthKey): number {
  return differenceInCalendarMonths(monthKeyToDate(to), monthKeyToDate(from));
}

/** Inclusive list of month keys from `from` to `to`. */
export function monthRange(from: MonthKey, to: MonthKey): MonthKey[] {
  const count = monthsBetweenKeys(from, to);
  if (count < 0) return [];
  const out: MonthKey[] = [];
  for (let i = 0; i <= count; i++) out.push(addMonthsToKey(from, i));
  return out;
}

/** The last `count` month keys ending at `end` (default: current month). */
export function lastNMonths(count: number, end: MonthKey = currentMonthKey()): MonthKey[] {
  const start = addMonthsToKey(end, -(count - 1));
  return monthRange(start, end);
}

export function startOfMonthISO(month: MonthKey): ISODate {
  return format(startOfMonth(monthKeyToDate(month)), "yyyy-MM-dd");
}

export function endOfMonthISO(month: MonthKey): ISODate {
  return format(endOfMonth(monthKeyToDate(month)), "yyyy-MM-dd");
}

export function isValidISODate(value: string): boolean {
  return isValid(parseISO(value));
}
