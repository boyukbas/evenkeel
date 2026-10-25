import { useState } from "react";
import type { ID, SavingsGoal } from "@/types";
import { parseAmount } from "@/lib/currency";
import { DEFAULT_GOAL_COLOR, type GoalStatus } from "./palette";

/** Editable string-backed form state (number fields stay as raw text while typing). */
export interface GoalFormState {
  name: string;
  targetAmount: string;
  currentAmount: string;
  monthlyContribution: string;
  deadline: string;
  linkedCategoryIds: ID[];
  note: string;
  color: string;
  status: GoalStatus;
}

/** Seed values for opening the modal in "new goal" mode, optionally pre-filled. */
export interface GoalFormSeed {
  name?: string;
  monthlyContribution?: number;
  linkedCategoryIds?: ID[];
  color?: string;
}

function emptyForm(seed?: GoalFormSeed): GoalFormState {
  return {
    name: seed?.name ?? "",
    targetAmount: "",
    currentAmount: "",
    monthlyContribution: seed?.monthlyContribution != null ? String(seed.monthlyContribution) : "",
    deadline: "",
    linkedCategoryIds: seed?.linkedCategoryIds ?? [],
    note: "",
    color: seed?.color ?? DEFAULT_GOAL_COLOR,
    status: "active",
  };
}

function formFromGoal(goal: SavingsGoal): GoalFormState {
  return {
    name: goal.name,
    targetAmount: String(goal.targetAmount),
    currentAmount: String(goal.currentAmount),
    monthlyContribution: goal.monthlyContribution != null ? String(goal.monthlyContribution) : "",
    deadline: goal.deadline ?? "",
    linkedCategoryIds: goal.linkedCategoryIds ?? [],
    note: goal.note ?? "",
    color: goal.color ?? DEFAULT_GOAL_COLOR,
    status: goal.status,
  };
}

/** Draft = SavingsGoal minus the repo-managed fields. */
export type GoalDraft = Omit<SavingsGoal, "id" | "createdAt" | "updatedAt">;

export interface UseGoalForm {
  state: GoalFormState;
  error: string | null;
  set: <K extends keyof GoalFormState>(key: K, value: GoalFormState[K]) => void;
  toggleCategory: (id: ID) => void;
  /** Validate + build the draft. Sets `error` and returns null on failure. */
  build: () => GoalDraft | null;
}

/**
 * Form controller for the add/edit goal modal. Re-seed via the `key`/remount
 * pattern from the parent (a fresh hook instance per open), or pass `goal`/`seed`.
 */
export function useGoalForm(goal?: SavingsGoal | null, seed?: GoalFormSeed): UseGoalForm {
  const [state, setState] = useState<GoalFormState>(() =>
    goal ? formFromGoal(goal) : emptyForm(seed),
  );
  const [error, setError] = useState<string | null>(null);

  const set: UseGoalForm["set"] = (key, value) => {
    setState((s) => ({ ...s, [key]: value }));
    if (error) setError(null);
  };

  const toggleCategory: UseGoalForm["toggleCategory"] = (id) => {
    setState((s) => ({
      ...s,
      linkedCategoryIds: s.linkedCategoryIds.includes(id)
        ? s.linkedCategoryIds.filter((x) => x !== id)
        : [...s.linkedCategoryIds, id],
    }));
  };

  const build: UseGoalForm["build"] = () => {
    const name = state.name.trim();
    if (!name) {
      setError("Give your goal a name.");
      return null;
    }
    const target = parseAmount(state.targetAmount);
    if (target == null || target <= 0) {
      setError("Target amount must be greater than 0.");
      return null;
    }
    const current = state.currentAmount.trim() ? parseAmount(state.currentAmount) : 0;
    if (current == null || current < 0) {
      setError("Saved amount must be a valid number.");
      return null;
    }
    const monthlyRaw = state.monthlyContribution.trim();
    const monthly = monthlyRaw ? parseAmount(monthlyRaw) : null;
    if (monthlyRaw && (monthly == null || monthly < 0)) {
      setError("Monthly contribution must be a valid number.");
      return null;
    }

    setError(null);
    return {
      name,
      targetAmount: target,
      currentAmount: current,
      monthlyContribution: monthly && monthly > 0 ? monthly : null,
      deadline: state.deadline ? state.deadline : null,
      linkedCategoryIds: state.linkedCategoryIds,
      note: state.note.trim() || undefined,
      color: state.color,
      status: state.status,
    };
  };

  return { state, error, set, toggleCategory, build };
}
