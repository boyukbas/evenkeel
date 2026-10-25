import { memo } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { Category, Expense } from "@/types";
import { Badge, Button, CategoryIcon } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDateMedium } from "@/lib/date";
import { methodLabel } from "./constants";

interface ExpenseRowProps {
  expense: Expense;
  category?: Category;
  money: { format: (n: number) => string };
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

function ExpenseRowImpl({
  expense,
  category,
  money,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
}: ExpenseRowProps) {
  const method = methodLabel(expense.method);
  const tagText = expense.tags.length > 0 ? expense.tags.join(" · ") : "";
  const subline = [expense.payee, tagText].filter(Boolean).join(" · ");

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent/50",
        selected && "bg-accent/40",
      )}
    >
      <input
        type="checkbox"
        aria-label={`Select ${expense.description || "expense"}`}
        checked={selected}
        onChange={() => onToggleSelect(expense.id)}
        className="h-4 w-4 shrink-0 cursor-pointer accent-primary"
      />

      {category ? (
        <CategoryIcon category={category} size="sm" />
      ) : (
        <span className="h-7 w-7 shrink-0 rounded-lg bg-muted" aria-hidden />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-foreground">
            {expense.description || <span className="text-muted-foreground">No description</span>}
          </p>
          {expense.amortizeMonths != null && expense.amortizeMonths > 1 && (
            <Badge variant="primary" className="shrink-0">
              spread ×{expense.amortizeMonths}
            </Badge>
          )}
          {expense.excludeFromInsights && (
            <Badge variant="outline" className="shrink-0">
              excluded
            </Badge>
          )}
        </div>
        {subline && <p className="truncate text-xs text-muted-foreground">{subline}</p>}
      </div>

      <div className="hidden shrink-0 text-sm text-muted-foreground sm:block">
        {formatDateMedium(expense.date)}
      </div>

      {method && (
        <Badge variant="outline" className="hidden shrink-0 md:inline-flex">
          {method}
        </Badge>
      )}

      <div className="w-24 shrink-0 text-right font-medium tabular-nums sm:w-28">
        {money.format(expense.amount)}
      </div>

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Edit expense"
          title="Edit"
          onClick={() => onEdit(expense)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete expense"
          title="Delete"
          onClick={() => onDelete(expense)}
          className="text-muted-foreground hover:text-danger"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export const ExpenseRow = memo(ExpenseRowImpl);
