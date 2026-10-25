/**
 * Local-first persistence. Everything lives in the browser's IndexedDB via
 * Dexie — no server, no account, nothing leaves the machine unless the user
 * exports it.
 */
import Dexie, { type Table } from "dexie";
import type {
  Attachment,
  Category,
  Expense,
  RecurringExpense,
  SavingsGoal,
  Settings,
} from "@/types";

export const SETTINGS_ID = "singleton";

export class EvenKeelDB extends Dexie {
  expenses!: Table<Expense, string>;
  recurring!: Table<RecurringExpense, string>;
  categories!: Table<Category, string>;
  goals!: Table<SavingsGoal, string>;
  settings!: Table<Settings, string>;
  attachments!: Table<Attachment, string>;

  constructor() {
    super("evenkeel");
    this.version(1).stores({
      expenses: "id, date, categoryId, recurringId, *tags",
      recurring: "id, categoryId, active, frequency",
      categories: "id, parentId, essential, archived, sortOrder",
      goals: "id, status",
      settings: "id",
    });
    // v2 adds receipt attachments (prior tables are inherited).
    this.version(2).stores({
      attachments: "id, expenseId",
    });
  }
}

export const db = new EvenKeelDB();

/** Stable unique id. */
export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Current timestamp as ISO string. */
export function now(): string {
  return new Date().toISOString();
}

export interface DefaultCategorySpec {
  name: string;
  color: string;
  icon: string;
  essential: boolean;
}

/** The starter category set, ordered for the sidebar/pickers. */
export const DEFAULT_CATEGORIES: DefaultCategorySpec[] = [
  { name: "Housing", color: "#6366f1", icon: "Home", essential: true },
  { name: "Utilities", color: "#0ea5e9", icon: "Plug", essential: true },
  { name: "Groceries", color: "#22c55e", icon: "ShoppingCart", essential: true },
  { name: "Transport", color: "#f59e0b", icon: "Car", essential: true },
  { name: "Insurance", color: "#14b8a6", icon: "ShieldCheck", essential: true },
  { name: "Health", color: "#ef4444", icon: "HeartPulse", essential: true },
  { name: "Education", color: "#3b82f6", icon: "GraduationCap", essential: true },
  { name: "Family & Kids", color: "#84cc16", icon: "Baby", essential: true },
  { name: "Dining Out", color: "#fb923c", icon: "Utensils", essential: false },
  { name: "Entertainment", color: "#a855f7", icon: "Clapperboard", essential: false },
  { name: "Subscriptions", color: "#ec4899", icon: "Repeat", essential: false },
  { name: "Shopping", color: "#d946ef", icon: "ShoppingBag", essential: false },
  { name: "Travel", color: "#06b6d4", icon: "Plane", essential: false },
  { name: "Gifts & Donations", color: "#8b5cf6", icon: "Gift", essential: false },
  { name: "Fees & Charges", color: "#64748b", icon: "Receipt", essential: false },
  { name: "Other", color: "#94a3b8", icon: "Tag", essential: false },
];

export function buildDefaultCategories(): Category[] {
  const ts = now();
  return DEFAULT_CATEGORIES.map((spec, i) => ({
    id: newId(),
    name: spec.name,
    color: spec.color,
    icon: spec.icon,
    parentId: null,
    essential: spec.essential,
    monthlyBudget: null,
    archived: false,
    sortOrder: i,
    createdAt: ts,
    updatedAt: ts,
  }));
}

export function buildDefaultSettings(): Settings {
  const ts = now();
  return {
    id: SETTINGS_ID,
    baseCurrency: "USD",
    locale: "en-US",
    theme: "system",
    monthlyBudget: null,
    hasSeededDemo: false,
    onboardedAt: null,
    lastBackupAt: null,
    createdAt: ts,
    updatedAt: ts,
  };
}
