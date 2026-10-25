import { useMemo } from "react";
import { ArrowRight, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, EmptyState, Progress } from "@/components/ui";
import { useMoney } from "@/hooks/useMoney";
import { useGoals } from "@/hooks/useData";

/** Top 2 active savings goals with progress toward target. */
export function SavingsGoals() {
  const money = useMoney();
  const goals = useGoals();

  const active = useMemo(
    () =>
      goals
        .filter((g) => g.status === "active")
        .sort((a, b) => {
          const pa = a.targetAmount > 0 ? a.currentAmount / a.targetAmount : 0;
          const pb = b.targetAmount > 0 ? b.currentAmount / b.targetAmount : 0;
          return pb - pa;
        })
        .slice(0, 2),
    [goals],
  );

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle>Savings goals</CardTitle>
        <Link
          to="/savings"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Savings
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="flex-1">
        {active.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No active goals"
            description="Set a savings goal to track your progress here."
          />
        ) : (
          <ul className="space-y-4">
            {active.map((g) => {
              const ratio = g.targetAmount > 0 ? g.currentAmount / g.targetAmount : 0;
              return (
                <li key={g.id} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-medium">{g.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {money.format(g.currentAmount)} / {money.format(g.targetAmount)}
                    </span>
                  </div>
                  <Progress value={ratio} color={g.color} />
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
