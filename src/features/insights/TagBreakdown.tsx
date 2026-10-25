import { useMemo } from "react";
import { Tags } from "lucide-react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, Progress } from "@/components/ui";
import { useExpenses } from "@/hooks/useData";
import { useMoney } from "@/hooks/useMoney";
import { lastNMonths, toMonthKey } from "@/lib/date";

/** How many tag rows to show, ranked by total spend. */
const MAX_ROWS = 12;

interface TagStat {
  tag: string;
  total: number;
  count: number;
}

/**
 * Aggregate spending by tag over the trailing 12 months. An expense contributes
 * its full amount to each of its tags; expenses flagged excludeFromInsights are
 * ignored. Returns the top rows by total desc plus the largest total (for bar scale).
 */
function aggregateByTag(expenses: ReturnType<typeof useExpenses>): { rows: TagStat[]; topTotal: number; hasAnyTag: boolean } {
  const window = new Set(lastNMonths(12));
  const byTag = new Map<string, TagStat>();
  let hasAnyTag = false;

  for (const expense of expenses) {
    if (expense.excludeFromInsights) continue;
    if (!window.has(toMonthKey(expense.date))) continue;
    for (const raw of expense.tags) {
      const tag = raw.trim();
      if (!tag) continue;
      hasAnyTag = true;
      const existing = byTag.get(tag);
      if (existing) {
        existing.total += expense.amount;
        existing.count += 1;
      } else {
        byTag.set(tag, { tag, total: expense.amount, count: 1 });
      }
    }
  }

  const rows = [...byTag.values()].sort((a, b) => b.total - a.total).slice(0, MAX_ROWS);
  const topTotal = rows.length > 0 ? rows[0].total : 0;
  return { rows, topTotal, hasAnyTag };
}

export function TagBreakdown() {
  const money = useMoney();
  const expenses = useExpenses();

  const { rows, topTotal, hasAnyTag } = useMemo(() => aggregateByTag(expenses), [expenses]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by tag</CardTitle>
        <CardDescription>Where your tagged spending went over the last 12 months, biggest tags first.</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasAnyTag ? (
          <EmptyState
            icon={Tags}
            title="No tags yet"
            description="Add tags to expenses (e.g. #holiday, #work) to see spending grouped here."
          />
        ) : (
          <ul className="divide-y divide-border">
            {rows.map(({ tag, total, count }) => {
              const frac = topTotal > 0 ? total / topTotal : 0;
              return (
                <li key={tag} className="flex flex-col gap-1.5 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="primary" className="max-w-[60%] truncate">
                      #{tag}
                    </Badge>
                    <span className="shrink-0 text-sm font-medium tabular-nums">{money.format(total)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={frac} className="h-1.5" />
                    <span className="w-16 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                      {count} {count === 1 ? "expense" : "expenses"}
                    </span>
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
