import { useMemo } from "react";
import { ArrowRight, Receipt } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CategoryIcon, EmptyState } from "@/components/ui";
import { useMoney } from "@/hooks/useMoney";
import { useCategoryMap, useExpenses } from "@/hooks/useData";
import { formatDateMedium } from "@/lib/date";

/** Latest 6 expenses, newest first. */
export function RecentActivity() {
  const money = useMoney();
  const catMap = useCategoryMap();
  const expenses = useExpenses();

  const recent = useMemo(
    () =>
      [...expenses]
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
        .slice(0, 6),
    [expenses],
  );

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle>Recent activity</CardTitle>
        <Link
          to="/expenses"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          All expenses
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="flex-1">
        {recent.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No expenses yet"
            description="Once you log spending, your latest transactions show up here."
          />
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((e) => {
              const cat = catMap.get(e.categoryId);
              return (
                <li key={e.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <CategoryIcon
                    category={{ icon: cat?.icon, color: cat?.color ?? "#888888", name: cat?.name ?? "Uncategorized" }}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.description || cat?.name || "Expense"}</p>
                    <p className="text-xs text-muted-foreground">{formatDateMedium(e.date, money.locale)}</p>
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular-nums">{money.format(e.amount)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
