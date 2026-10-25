import { useMemo, useState } from "react";
import type { Category, Expense, ID } from "@/types";
import { Button, Card } from "@/components/ui";
import { useMoney } from "@/hooks/useMoney";
import { formatMonthLong } from "@/lib/date";
import { LIST_PAGE_SIZE, LIST_VIRTUALIZE_THRESHOLD } from "./constants";
import { ExpenseRow } from "./ExpenseRow";
import { groupByMonth } from "./useFilteredExpenses";

interface ExpenseListProps {
  /** Filtered + sorted expenses to render. */
  expenses: Expense[];
  categoryMap: Map<ID, Category>;
  selectedIds: Set<ID>;
  onToggleSelect: (id: ID) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

export function ExpenseList({
  expenses,
  categoryMap,
  selectedIds,
  onToggleSelect,
  onEdit,
  onDelete,
}: ExpenseListProps) {
  const money = useMoney();
  const [expanded, setExpanded] = useState(false);

  const total = expenses.length;
  const paginate = total > LIST_VIRTUALIZE_THRESHOLD && !expanded;
  const visible = useMemo(
    () => (paginate ? expenses.slice(0, LIST_PAGE_SIZE) : expenses),
    [expenses, paginate],
  );
  const groups = useMemo(() => groupByMonth(visible), [visible]);
  const hiddenCount = total - visible.length;

  return (
    <Card className="overflow-hidden">
      <div className="divide-y divide-border">
        {groups.map((group) => (
          <section key={group.month}>
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-muted/60 px-3 py-1.5 backdrop-blur supports-[backdrop-filter]:bg-muted/50">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {formatMonthLong(group.month)}
              </span>
              <span className="text-xs font-medium tabular-nums text-muted-foreground">
                {money.format(group.subtotal)}
              </span>
            </div>
            <div className="divide-y divide-border/60">
              {group.expenses.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  category={categoryMap.get(expense.categoryId)}
                  money={money}
                  selected={selectedIds.has(expense.id)}
                  onToggleSelect={onToggleSelect}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {hiddenCount > 0 && (
        <div className="border-t border-border p-3 text-center">
          <Button variant="outline" size="sm" onClick={() => setExpanded(true)}>
            Show {hiddenCount} more
          </Button>
        </div>
      )}
    </Card>
  );
}
