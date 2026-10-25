import { Coins, PiggyBank, Sparkles, Target } from "lucide-react";
import type { SavingsGoal } from "@/types";
import { Stat } from "@/components/ui";
import { useMoney } from "@/hooks/useMoney";
import { useLastNMonths, useSavingOpportunities } from "@/hooks/useAnalytics";
import { formatPercent } from "@/lib/currency";

/** The four headline numbers across all goals + the Insights savings tie-in. */
export function SavingsOverview({ goals }: { goals: SavingsGoal[] }) {
  const money = useMoney();
  const potentialMonthly = useSavingOpportunities(useLastNMonths(6)).totals.monthly;

  const totalSaved = goals.reduce((sum, g) => sum + (Number.isFinite(g.currentAmount) ? g.currentAmount : 0), 0);
  const totalTarget = goals.reduce((sum, g) => sum + (Number.isFinite(g.targetAmount) ? g.targetAmount : 0), 0);
  const overall = totalTarget > 0 ? Math.min(1, totalSaved / totalTarget) : 0;
  const activeCount = goals.filter((g) => g.status === "active").length;
  const achievedCount = goals.filter((g) => g.status === "achieved").length;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Stat
        label="Total saved"
        value={money.format(totalSaved)}
        sub={`across ${goals.length} ${goals.length === 1 ? "goal" : "goals"}`}
        icon={<PiggyBank className="h-4 w-4" />}
      />
      <Stat
        label="Total target"
        value={money.format(totalTarget)}
        sub={achievedCount > 0 ? `${achievedCount} achieved` : `${activeCount} active`}
        icon={<Target className="h-4 w-4" />}
      />
      <Stat
        label="Overall progress"
        value={formatPercent(overall, money.locale)}
        sub={`${money.format(Math.max(0, totalTarget - totalSaved))} to go`}
        icon={<Coins className="h-4 w-4" />}
      />
      <Stat
        label="Potential monthly savings"
        value={money.format(potentialMonthly)}
        sub="from non-essential spending"
        icon={potentialMonthly > 0 ? <Sparkles className="h-4 w-4" /> : <PiggyBank className="h-4 w-4" />}
        invertTrend={false}
      />
    </div>
  );
}
