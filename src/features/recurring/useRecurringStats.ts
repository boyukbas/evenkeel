/** Derived KPI figures for the Recurring page, memoized off the live data. */
import { useMemo } from "react";
import type { Category, ID, RecurringExpense } from "@/types";
import { annualCost, monthlyAmortized } from "@/lib/recurrence";
import { isEssential } from "./helpers";

export interface RecurringStats {
  /** Count of active recurring items. */
  activeCount: number;
  /** Sum of monthlyAmortized over active items. */
  monthlyCommitment: number;
  /** Portion of the monthly commitment from essential categories. */
  essentialMonthly: number;
  /** Portion of the monthly commitment from non-essential categories. */
  nonEssentialMonthly: number;
  /** Sum of annualCost over active items. */
  annualTotal: number;
}

export function useRecurringStats(
  recurring: RecurringExpense[],
  categories: Map<ID, Category>,
): RecurringStats {
  return useMemo(() => {
    let monthlyCommitment = 0;
    let essentialMonthly = 0;
    let nonEssentialMonthly = 0;
    let annualTotal = 0;
    let activeCount = 0;

    for (const rec of recurring) {
      if (!rec.active) continue;
      activeCount += 1;
      const monthly = monthlyAmortized(rec);
      monthlyCommitment += monthly;
      annualTotal += annualCost(rec);
      if (isEssential(rec, categories)) essentialMonthly += monthly;
      else nonEssentialMonthly += monthly;
    }

    return { activeCount, monthlyCommitment, essentialMonthly, nonEssentialMonthly, annualTotal };
  }, [recurring, categories]);
}
