import { Pencil } from "lucide-react";
import { Button, CategoryIcon, Progress } from "@/components/ui";
import { useMoney } from "@/hooks/useMoney";
import { formatPercent } from "@/lib/currency";
import { STATUS_BAR, STATUS_TEXT, type BudgetRowData } from "./helpers";

export function BudgetRow({ row, onEdit }: { row: BudgetRowData; onEdit: () => void }) {
  const money = useMoney();
  const { category, spent, budget, pct, remaining, status } = row;

  return (
    <div className="group flex items-center gap-3 py-3">
      <CategoryIcon category={category} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-medium">{category.name}</p>
          <p className="shrink-0 text-sm tabular-nums">
            <span className="font-medium">{money.format(spent)}</span>
            <span className="text-muted-foreground"> / {money.format(budget)}</span>
          </p>
        </div>
        <Progress value={pct} className="mt-1.5" indicatorClassName={STATUS_BAR[status]} />
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className={STATUS_TEXT[status]}>
            {remaining >= 0 ? `${money.format(remaining)} left` : `${money.format(Math.abs(remaining))} over`}
          </span>
          <span className="text-muted-foreground">{formatPercent(pct)}</span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onEdit}
        aria-label={`Edit ${category.name} budget`}
        className="opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
      >
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  );
}
