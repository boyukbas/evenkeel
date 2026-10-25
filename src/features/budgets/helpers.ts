import type { Category } from "@/types";

export type BudgetStatus = "under" | "near" | "over";

/** Classify spend against a budget: over (>100%), near (>=85%), or under. */
export function budgetStatusOf(spent: number, budget: number): BudgetStatus {
  if (budget <= 0) return "under";
  const pct = spent / budget;
  if (pct > 1) return "over";
  if (pct >= 0.85) return "near";
  return "under";
}

export interface BudgetRowData {
  category: Category;
  spent: number;
  budget: number;
  /** spent / budget — can exceed 1 when over. */
  pct: number;
  /** budget − spent — negative when over. */
  remaining: number;
  status: BudgetStatus;
}

export function makeBudgetRow(category: Category, spent: number, budget: number): BudgetRowData {
  return {
    category,
    spent,
    budget,
    pct: budget > 0 ? spent / budget : 0,
    remaining: budget - spent,
    status: budgetStatusOf(spent, budget),
  };
}

/** Round a monthly average up to a tidy budget figure. */
export function suggestBudget(monthlyAvg: number): number {
  if (!Number.isFinite(monthlyAvg) || monthlyAvg <= 0) return 0;
  const step = monthlyAvg < 100 ? 5 : monthlyAvg < 500 ? 10 : 25;
  return Math.ceil(monthlyAvg / step) * step;
}

/** Over-budget first, then by how hot it's running. */
export function sortBudgetRows(rows: BudgetRowData[]): BudgetRowData[] {
  const rank = { over: 0, near: 1, under: 2 } as const;
  return [...rows].sort((a, b) => rank[a.status] - rank[b.status] || b.pct - a.pct);
}

export const STATUS_BAR: Record<BudgetStatus, string> = {
  under: "bg-success",
  near: "bg-warning",
  over: "bg-danger",
};

export const STATUS_TEXT: Record<BudgetStatus, string> = {
  under: "text-success",
  near: "text-warning",
  over: "text-danger",
};
