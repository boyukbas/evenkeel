import { useMemo, useState } from "react";
import type { Category, ID, MonthlyPoint } from "@/types";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CategoryIcon,
  EmptyState,
  Progress,
  SegmentedControl,
} from "@/components/ui";
import { useMoney } from "@/hooks/useMoney";
import { categoryTotals } from "@/lib/analytics";

type View = "normalized" | "actual";

const VIEW_OPTIONS = [
  { value: "normalized" as const, label: "Normalized" },
  { value: "actual" as const, label: "Actual" },
];

interface CategoryBreakdownProps {
  series: MonthlyPoint[];
  byId: Map<ID, Category>;
  monthCount: number;
}

export function CategoryBreakdown({ series, byId, monthCount }: CategoryBreakdownProps) {
  const money = useMoney();
  const [view, setView] = useState<View>("normalized");

  const { rows, total } = useMemo(() => {
    const totals = categoryTotals(series, view);
    const sum = totals.reduce((s, t) => s + t.amount, 0);
    return { rows: totals, total: sum };
  }, [series, view]);

  const months = Math.max(1, monthCount);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle>Category breakdown</CardTitle>
        <SegmentedControl size="sm" value={view} onChange={(v) => setView(v as View)} options={VIEW_OPTIONS} />
      </CardHeader>
      <CardContent>
        {rows.length === 0 || total <= 0 ? (
          <EmptyState title="No spending in this window" description="Try a longer window or log some expenses." />
        ) : (
          <ul className="divide-y divide-border">
            {rows.map(({ categoryId, amount }) => {
              const category = byId.get(categoryId);
              const pct = total > 0 ? amount / total : 0;
              const name = category?.name ?? "Uncategorized";
              return (
                <li key={categoryId} className="flex items-center gap-3 py-2.5">
                  {category ? (
                    <CategoryIcon category={category} size="sm" />
                  ) : (
                    <span className="h-7 w-7 shrink-0 rounded-lg bg-muted" aria-hidden />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium">{name}</span>
                        {category && !category.essential && <Badge variant="outline">Want</Badge>}
                      </span>
                      <span className="shrink-0 text-sm font-medium tabular-nums">{money.format(amount)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Progress
                        value={pct}
                        className="h-1.5"
                        color={category?.color}
                      />
                      <span className="w-9 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                        {Math.round(pct * 100)}%
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{money.format(amount / months)}/mo avg</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
