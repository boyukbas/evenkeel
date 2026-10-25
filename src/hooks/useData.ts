/** Reactive reads from IndexedDB. Components re-render automatically on change. */
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import type { Attachment, Category, Expense, ID, RecurringExpense, SavingsGoal, Settings } from "@/types";
import { db } from "@/db/database";
import { buildDefaultSettings } from "@/db/database";

export function useSettings(): Settings {
  const settings = useLiveQuery(() => db.settings.get("singleton"), []);
  return settings ?? buildDefaultSettings();
}

/** True until the first settings read resolves — used to gate the initial paint. */
export function useSettingsLoaded(): boolean {
  const settings = useLiveQuery(() => db.settings.get("singleton"), []);
  return settings !== undefined;
}

export function useCategories(): Category[] {
  return useLiveQuery(() => db.categories.orderBy("sortOrder").toArray(), [], [] as Category[]);
}

export function useCategoryMap(): Map<ID, Category> {
  const categories = useCategories();
  return useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
}

export function useExpenses(): Expense[] {
  return useLiveQuery(() => db.expenses.toArray(), [], [] as Expense[]);
}

export function useRecurring(): RecurringExpense[] {
  return useLiveQuery(() => db.recurring.toArray(), [], [] as RecurringExpense[]);
}

export function useGoals(): SavingsGoal[] {
  return useLiveQuery(() => db.goals.toArray(), [], [] as SavingsGoal[]);
}

export function useAttachments(expenseId: string | null | undefined): Attachment[] {
  return useLiveQuery(
    () => (expenseId ? db.attachments.where("expenseId").equals(expenseId).toArray() : Promise.resolve<Attachment[]>([])),
    [expenseId],
    [] as Attachment[],
  );
}
