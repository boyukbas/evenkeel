import { useMemo } from "react";
import type { Expense, MonthKey } from "@/types";
import { toMonthKey } from "@/lib/date";
import type { ExpenseFilters } from "./FilterToolbar";
import type { SortKey } from "./constants";

export interface MonthGroup {
  month: MonthKey;
  subtotal: number;
  expenses: Expense[];
}

function matchesSearch(expense: Expense, needle: string): boolean {
  const haystack = [expense.description, expense.payee ?? "", ...expense.tags]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

function sortComparator(sort: SortKey): (a: Expense, b: Expense) => number {
  switch (sort) {
    case "date-asc":
      return (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt.localeCompare(b.createdAt));
    case "amount-desc":
      return (a, b) => b.amount - a.amount;
    case "amount-asc":
      return (a, b) => a.amount - b.amount;
    case "date-desc":
    default:
      return (a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : b.createdAt.localeCompare(a.createdAt));
  }
}

/** Distinct month keys present in the data, newest first. */
export function useDistinctMonths(expenses: Expense[]): MonthKey[] {
  return useMemo(() => {
    const set = new Set<MonthKey>();
    for (const e of expenses) set.add(toMonthKey(e.date));
    return Array.from(set).sort((a, b) => (a > b ? -1 : 1));
  }, [expenses]);
}

/** Apply text/category/month/method filters and the chosen sort. */
export function useFilteredExpenses(expenses: Expense[], filters: ExpenseFilters): Expense[] {
  return useMemo(() => {
    const needle = filters.search.trim().toLowerCase();
    const filtered = expenses.filter((e) => {
      if (filters.categoryId && e.categoryId !== filters.categoryId) return false;
      if (filters.method && e.method !== filters.method) return false;
      if (filters.month && toMonthKey(e.date) !== filters.month) return false;
      if (needle && !matchesSearch(e, needle)) return false;
      return true;
    });
    filtered.sort(sortComparator(filters.sort));
    return filtered;
  }, [expenses, filters]);
}

/**
 * Group an already-sorted list by month, preserving the incoming row order
 * within each group. Group order follows first appearance, so it tracks the
 * active sort (date sorts → chronological groups; amount sorts → by largest row).
 */
export function groupByMonth(expenses: Expense[]): MonthGroup[] {
  const groups = new Map<MonthKey, MonthGroup>();
  for (const e of expenses) {
    const month = toMonthKey(e.date);
    let group = groups.get(month);
    if (!group) {
      group = { month, subtotal: 0, expenses: [] };
      groups.set(month, group);
    }
    group.expenses.push(e);
    group.subtotal += e.amount;
  }
  return Array.from(groups.values());
}
