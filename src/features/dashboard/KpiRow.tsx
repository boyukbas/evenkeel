import { Activity, PiggyBank, Sparkles, Wallet } from "lucide-react";
import type { MonthKey } from "@/types";
import { Progress, Stat } from "@/components/ui";
import { useMoney } from "@/hooks/useMoney";
import {
  useLastNMonths,
  usePointForMonth,
  useSavingOpportunities,
  useSeriesSummary,
} from "@/hooks/useAnalytics";
import { useSettings } from "@/hooks/useData";
import { Card } from "@/components/ui";
import { addMonthsToKey } from "@/lib/date";
import { pctChange } from "@/lib/analytics";

/** The four headline numbers for the focused month. */
export function KpiRow({ month }: { month: MonthKey }) {
  const money = useMoney();
  const settings = useSettings();

  const point = usePointForMonth(month);
  const prev = usePointForMonth(addMonthsToKey(month, -1));

  const trailing12 = useSeriesSummary(useLastNMonths(12));
  const savings = useSavingOpportunities(useLastNMonths(6)).totals;

  const actualTrend = prev ? pctChange(prev.actual, point.actual) : null;
  const normalizedTrend = prev ? pctChange(prev.normalized, point.normalized) : null;

  const budget = settings.monthlyBudget;
  const hasBudget = budget != null && budget > 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Stat
        label="Actual spend"
        value={money.format(point.actual)}
        sub="vs last month"
        icon={<Wallet className="h-4 w-4" />}
        trend={actualTrend}
      />

      <Stat
        label="Normalized spend"
        value={money.format(point.normalized)}
        sub="your true baseline"
        icon={<Activity className="h-4 w-4" />}
        trend={normalizedTrend}
      />

      {hasBudget ? (
        <BudgetCard budget={budget} normalized={point.normalized} />
      ) : (
        <Stat
          label="Avg normalized"
          value={money.format(trailing12.avgNormalized)}
          sub="trailing 12 months"
          icon={<Activity className="h-4 w-4" />}
        />
      )}

      <Stat
        label="Potential savings/mo"
        value={money.format(savings.monthly)}
        sub={`per year: ${money.format(savings.annual)}`}
        icon={savings.monthly > 0 ? <PiggyBank className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        invertTrend={false}
      />
    </div>
  );
}

/** Budget remaining (budget − normalized) with a progress bar of consumption. */
function BudgetCard({ budget, normalized }: { budget: number; normalized: number }) {
  const money = useMoney();
  const remaining = budget - normalized;
  const consumed = budget > 0 ? normalized / budget : 0;
  const over = remaining < 0;
  const barColor = over
    ? "var(--danger)"
    : consumed > 0.9
      ? "var(--warning)"
      : "var(--primary)";

  return (
    <Card className="flex flex-col justify-between p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">Budget</p>
        <PiggyBank className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="mt-2 text-2xl font-semibold tracking-tight">
          {money.format(Math.abs(remaining))}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {over ? "over" : "left"} of {money.format(budget)}
        </p>
      </div>
      <div className="mt-3">
        <Progress value={consumed} color={barColor} />
      </div>
    </Card>
  );
}
