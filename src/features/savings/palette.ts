import type { SavingsGoal } from "@/types";
import type { BadgeVariant } from "@/components/ui";

/** Swatches offered by the goal color picker. */
export const GOAL_COLORS: readonly string[] = [
  "#6366f1", // indigo
  "#0ea5e9", // sky
  "#14b8a6", // teal
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#8b5cf6", // violet
] as const;

/** Fallback when a goal has no color set. */
export const DEFAULT_GOAL_COLOR = GOAL_COLORS[0];

export type GoalStatus = SavingsGoal["status"];

/** Badge variant + label per goal status. */
export const STATUS_META: Record<GoalStatus, { label: string; variant: BadgeVariant }> = {
  active: { label: "Active", variant: "primary" },
  paused: { label: "Paused", variant: "warning" },
  achieved: { label: "Achieved", variant: "success" },
};

/** A goal's funded fraction (0..1), guarding against zero/garbage targets. */
export function goalProgress(goal: Pick<SavingsGoal, "currentAmount" | "targetAmount">): number {
  const { currentAmount, targetAmount } = goal;
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) return 0;
  return Math.max(0, Math.min(1, currentAmount / targetAmount));
}
