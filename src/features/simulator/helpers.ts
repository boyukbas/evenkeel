import type { SavingsGoal } from "@/types";

/** Months to reach `remaining` at `monthly` per month. null = never (rate ≤ 0). */
export function monthsToComplete(remaining: number, monthly: number): number | null {
  if (remaining <= 0) return 0;
  if (monthly <= 0) return null;
  return Math.ceil(remaining / monthly);
}

export interface GoalAccel {
  goal: SavingsGoal;
  remaining: number;
  monthsBefore: number | null;
  monthsAfter: number | null;
  monthsSaved: number;
}

/** How much sooner a goal completes if `extraMonthly` is redirected to it. */
export function accelerateGoal(goal: SavingsGoal, extraMonthly: number): GoalAccel {
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const base = goal.monthlyContribution ?? 0;
  const monthsBefore = monthsToComplete(remaining, base);
  const monthsAfter = monthsToComplete(remaining, base + Math.max(0, extraMonthly));
  const monthsSaved =
    monthsBefore != null && monthsAfter != null ? Math.max(0, monthsBefore - monthsAfter) : 0;
  return { goal, remaining, monthsBefore, monthsAfter, monthsSaved };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export { round2 as roundMoney };
