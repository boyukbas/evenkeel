import type { SavingsGoal } from "@/types";
import { addMonthsToKey, currentMonthKey, monthsBetweenKeys, toMonthKey } from "@/lib/date";

export interface GoalProjection {
  /** Whole months of contribution still needed to reach the target. */
  monthsRemaining: number;
  /** Month key the goal is projected to finish in. */
  finishMonth: string;
  /** Goal is already fully funded. */
  alreadyFunded: boolean;
  /** Has a usable (>0) monthly contribution to project from. */
  hasContribution: boolean;
  /** Only set when a deadline exists: is the projected finish on/before it? */
  onTrack: boolean | null;
  /** Deadline expressed as a month key, when a deadline is set. */
  deadlineMonth: string | null;
}

/**
 * Project completion for a goal from its monthly contribution. Returns null when
 * we can't project (no contribution and not yet funded).
 */
export function projectGoal(goal: SavingsGoal): GoalProjection | null {
  const remaining = goal.targetAmount - goal.currentAmount;
  const alreadyFunded = remaining <= 0;
  const contribution = goal.monthlyContribution ?? 0;
  const hasContribution = Number.isFinite(contribution) && contribution > 0;

  if (!alreadyFunded && !hasContribution) return null;

  const monthsRemaining = alreadyFunded ? 0 : Math.ceil(remaining / contribution);
  const start = currentMonthKey();
  const finishMonth = addMonthsToKey(start, monthsRemaining);

  const deadlineMonth = goal.deadline ? toMonthKey(goal.deadline) : null;
  const onTrack = deadlineMonth ? monthsBetweenKeys(finishMonth, deadlineMonth) >= 0 : null;

  return { monthsRemaining, finishMonth, alreadyFunded, hasContribution, onTrack, deadlineMonth };
}
