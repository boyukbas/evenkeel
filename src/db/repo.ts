/**
 * The data API every feature uses. Thin, typed wrappers over Dexie that stamp
 * ids/timestamps and keep related rows consistent.
 */
import type {
  Attachment,
  Category,
  Expense,
  RecurringExpense,
  SavingsGoal,
  Settings,
} from "@/types";
import {
  buildDefaultCategories,
  buildDefaultSettings,
  db,
  newId,
  now,
  SETTINGS_ID,
} from "@/db/database";
import { generateDemoData } from "@/db/seed";

type NewRow<T> = Omit<T, "id" | "createdAt" | "updatedAt">;

/* ------------------------------- Bootstrap ------------------------------- */

let initPromise: Promise<void> | null = null;

/** Idempotent first-run setup. Seeds default categories + sample data once. */
export function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const existing = await db.settings.get(SETTINGS_ID);
      if (existing) return;

      const settings = buildDefaultSettings();
      const categories = buildDefaultCategories();
      const demo = generateDemoData(categories, settings.baseCurrency);

      await db.transaction("rw", [db.settings, db.categories, db.expenses, db.recurring, db.goals], async () => {
        await db.categories.bulkAdd(categories);
        await db.expenses.bulkAdd(demo.expenses);
        await db.recurring.bulkAdd(demo.recurring);
        await db.goals.bulkAdd(demo.goals);
        await db.settings.put({ ...settings, hasSeededDemo: true, onboardedAt: now() });
      });
    })();
  }
  return initPromise;
}

/* -------------------------------- Settings ------------------------------- */

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get(SETTINGS_ID);
  return s ?? buildDefaultSettings();
}

export async function updateSettings(patch: Partial<Omit<Settings, "id" | "createdAt">>): Promise<void> {
  const current = await getSettings();
  await db.settings.put({ ...current, ...patch, id: SETTINGS_ID, updatedAt: now() });
}

/* -------------------------------- Expenses ------------------------------- */

export async function addExpense(draft: NewRow<Expense>): Promise<string> {
  const ts = now();
  const row: Expense = { ...draft, id: newId(), createdAt: ts, updatedAt: ts };
  await db.expenses.add(row);
  return row.id;
}

export async function bulkAddExpenses(drafts: NewRow<Expense>[]): Promise<void> {
  const ts = now();
  const rows: Expense[] = drafts.map((d) => ({ ...d, id: newId(), createdAt: ts, updatedAt: ts }));
  await db.expenses.bulkAdd(rows);
}

export async function updateExpense(id: string, patch: Partial<Omit<Expense, "id" | "createdAt">>): Promise<void> {
  await db.expenses.update(id, { ...patch, updatedAt: now() });
}

export async function deleteExpense(id: string): Promise<void> {
  await db.transaction("rw", [db.expenses, db.attachments], async () => {
    await db.attachments.where("expenseId").equals(id).delete();
    await db.expenses.delete(id);
  });
}

export async function deleteExpenses(ids: string[]): Promise<void> {
  await db.transaction("rw", [db.expenses, db.attachments], async () => {
    await db.attachments.where("expenseId").anyOf(ids).delete();
    await db.expenses.bulkDelete(ids);
  });
}

/* ------------------------------ Attachments ------------------------------ */

export async function addAttachment(draft: NewRow<Attachment>): Promise<string> {
  const row: Attachment = { ...draft, id: newId(), createdAt: now() };
  await db.attachments.add(row);
  return row.id;
}

export async function deleteAttachment(id: string): Promise<void> {
  await db.attachments.delete(id);
}

/* ------------------------------- Recurring ------------------------------- */

export async function addRecurring(draft: NewRow<RecurringExpense>): Promise<string> {
  const ts = now();
  const row: RecurringExpense = { ...draft, id: newId(), createdAt: ts, updatedAt: ts };
  await db.recurring.add(row);
  return row.id;
}

export async function updateRecurring(id: string, patch: Partial<Omit<RecurringExpense, "id" | "createdAt">>): Promise<void> {
  await db.recurring.update(id, { ...patch, updatedAt: now() });
}

export async function deleteRecurring(id: string): Promise<void> {
  await db.recurring.delete(id);
}

/* ------------------------------- Categories ------------------------------ */

export async function addCategory(draft: NewRow<Category>): Promise<string> {
  const ts = now();
  const count = await db.categories.count();
  const row: Category = { sortOrder: count, ...draft, id: newId(), createdAt: ts, updatedAt: ts };
  await db.categories.add(row);
  return row.id;
}

export async function updateCategory(id: string, patch: Partial<Omit<Category, "id" | "createdAt">>): Promise<void> {
  await db.categories.update(id, { ...patch, updatedAt: now() });
}

/** Delete a category, moving any expenses/recurring on it to `reassignToId`. */
export async function deleteCategory(id: string, reassignToId: string): Promise<void> {
  await db.transaction("rw", db.categories, db.expenses, db.recurring, async () => {
    await db.expenses.where("categoryId").equals(id).modify({ categoryId: reassignToId, updatedAt: now() });
    await db.recurring.where("categoryId").equals(id).modify({ categoryId: reassignToId, updatedAt: now() });
    await db.categories.delete(id);
  });
}

/* --------------------------------- Goals --------------------------------- */

export async function addGoal(draft: NewRow<SavingsGoal>): Promise<string> {
  const ts = now();
  const row: SavingsGoal = { ...draft, id: newId(), createdAt: ts, updatedAt: ts };
  await db.goals.add(row);
  return row.id;
}

export async function updateGoal(id: string, patch: Partial<Omit<SavingsGoal, "id" | "createdAt">>): Promise<void> {
  await db.goals.update(id, { ...patch, updatedAt: now() });
}

export async function deleteGoal(id: string): Promise<void> {
  await db.goals.delete(id);
}

/* ----------------------------- Data lifecycle ---------------------------- */

/** Wipe everything and rebuild a clean, empty workspace (default categories). */
export async function resetAll(): Promise<void> {
  await db.transaction("rw", [db.settings, db.categories, db.expenses, db.recurring, db.goals, db.attachments], async () => {
    await Promise.all([
      db.expenses.clear(),
      db.recurring.clear(),
      db.goals.clear(),
      db.categories.clear(),
      db.attachments.clear(),
    ]);
    await db.categories.bulkAdd(buildDefaultCategories());
    await updateSettings({ hasSeededDemo: false });
  });
}

/** Clear transactional data but keep categories and settings. */
export async function clearTransactions(): Promise<void> {
  await db.transaction("rw", [db.expenses, db.recurring, db.goals, db.attachments], async () => {
    await Promise.all([db.expenses.clear(), db.recurring.clear(), db.goals.clear(), db.attachments.clear()]);
  });
  await updateSettings({ hasSeededDemo: false });
}

/** Replace all sample/real data with a fresh demo dataset. */
export async function reseedDemo(): Promise<void> {
  await db.transaction("rw", [db.categories, db.expenses, db.recurring, db.goals, db.settings, db.attachments], async () => {
    let categories = await db.categories.toArray();
    if (categories.length === 0) {
      categories = buildDefaultCategories();
      await db.categories.bulkAdd(categories);
    }
    const settings = await getSettings();
    const demo = generateDemoData(categories, settings.baseCurrency);
    await Promise.all([db.expenses.clear(), db.recurring.clear(), db.goals.clear(), db.attachments.clear()]);
    await db.expenses.bulkAdd(demo.expenses);
    await db.recurring.bulkAdd(demo.recurring);
    await db.goals.bulkAdd(demo.goals);
    await updateSettings({ hasSeededDemo: true });
  });
}

/* ------------------------------ Backup / restore ------------------------- */

export interface BackupFile {
  app: "evenkeel";
  version: 1;
  exportedAt: string;
  settings: Settings;
  categories: Category[];
  expenses: Expense[];
  recurring: RecurringExpense[];
  goals: SavingsGoal[];
  attachments?: Attachment[];
}

export async function exportData(): Promise<BackupFile> {
  const [settings, categories, expenses, recurring, goals, attachments] = await Promise.all([
    getSettings(),
    db.categories.toArray(),
    db.expenses.toArray(),
    db.recurring.toArray(),
    db.goals.toArray(),
    db.attachments.toArray(),
  ]);
  const file: BackupFile = { app: "evenkeel", version: 1, exportedAt: now(), settings, categories, expenses, recurring, goals, attachments };
  await updateSettings({ lastBackupAt: now() });
  return file;
}

export function isBackupFile(data: unknown): data is BackupFile {
  if (!data || typeof data !== "object") return false;
  const d = data as Partial<BackupFile>;
  return d.app === "evenkeel" && Array.isArray(d.categories) && Array.isArray(d.expenses);
}

/** Restore a backup, replacing all current data. */
export async function importData(data: BackupFile): Promise<void> {
  await db.transaction("rw", [db.settings, db.categories, db.expenses, db.recurring, db.goals, db.attachments], async () => {
    await Promise.all([
      db.expenses.clear(),
      db.recurring.clear(),
      db.goals.clear(),
      db.categories.clear(),
      db.attachments.clear(),
    ]);
    await db.categories.bulkAdd(data.categories);
    await db.expenses.bulkAdd(data.expenses ?? []);
    await db.recurring.bulkAdd(data.recurring ?? []);
    await db.goals.bulkAdd(data.goals ?? []);
    await db.attachments.bulkAdd(data.attachments ?? []);
    if (data.settings) await db.settings.put({ ...data.settings, id: SETTINGS_ID, updatedAt: now() });
  });
}
