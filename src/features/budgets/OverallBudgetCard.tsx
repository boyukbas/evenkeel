import { Pencil, Target } from "lucide-react";
import { Button, Card, CardContent, Progress } from "@/components/ui";
import { useMoney } from "@/hooks/useMoney";
import { formatPercent } from "@/lib/currency";
import { budgetStatusOf, STATUS_BAR, STATUS_TEXT } from "./helpers";

interface OverallBudgetCardProps {
  spent: number;
  budget: number | null | undefined;
  basisLabel: string;
  onSet: () => void;
}

export function OverallBudgetCard({ spent, budget, basisLabel, onSet }: OverallBudgetCardProps) {
  const money = useMoney();

  if (!budget || budget <= 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/12 text-primary">
              <Target className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium">Set an overall monthly budget</p>
              <p className="text-sm text-muted-foreground">
                Track your total {basisLabel} spend against one target. You've spent{" "}
                <span className="font-medium text-foreground">{money.format(spent)}</span> this month.
              </p>
            </div>
          </div>
          <Button onClick={onSet}>Set budget</Button>
        </CardContent>
      </Card>
    );
  }

  const status = budgetStatusOf(spent, budget);
  const remaining = budget - spent;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Overall budget · this month</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">
              {money.format(spent)}{" "}
              <span className="text-lg font-normal text-muted-foreground">/ {money.format(budget)}</span>
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onSet} aria-label="Edit overall budget">
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
        <Progress value={budget > 0 ? spent / budget : 0} className="mt-4 h-3" indicatorClassName={STATUS_BAR[status]} />
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className={STATUS_TEXT[status]}>
            {remaining >= 0
              ? `${money.format(remaining)} left`
              : `${money.format(Math.abs(remaining))} over`}
          </span>
          <span className="text-muted-foreground">{formatPercent(budget > 0 ? spent / budget : 0)} used · {basisLabel}</span>
        </div>
      </CardContent>
    </Card>
  );
}
