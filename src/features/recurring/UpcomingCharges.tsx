/**
 * Real cash timing: concrete charges across all active recurring for the next
 * ~6 months, grouped by month with each month's total. Complements the smoothed
 * view by showing when money actually leaves.
 */
import { useMemo } from "react";
import { CalendarClock } from "lucide-react";
import type { Category, ID, RecurringExpense } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Dot, EmptyState } from "@/components/ui";
import { useMoney } from "@/hooks/useMoney";
import { formatDateMedium, formatMonthLong, toMonthKey } from "@/lib/date";
import { gatherUpcoming } from "./helpers";
import type { UpcomingOccurrence } from "./helpers";

const MONTHS_AHEAD = 6;

interface MonthGroup {
  month: string;
  total: number;
  items: UpcomingOccurrence[];
}

interface UpcomingChargesProps {
  recurring: RecurringExpense[];
  categories: Map<ID, Category>;
}

export function UpcomingCharges({ recurring, categories }: UpcomingChargesProps) {
  const money = useMoney();

  const groups = useMemo<MonthGroup[]>(() => {
    const occurrences = gatherUpcoming(recurring, MONTHS_AHEAD);
    const byMonth = new Map<string, MonthGroup>();
    for (const occ of occurrences) {
      const key = toMonthKey(occ.date);
      let group = byMonth.get(key);
      if (!group) {
        group = { month: key, total: 0, items: [] };
        byMonth.set(key, group);
      }
      group.items.push(occ);
      group.total += occ.amount;
    }
    return [...byMonth.values()].sort((a, b) => (a.month < b.month ? -1 : 1));
  }, [recurring]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming charges</CardTitle>
        <CardDescription>The real cash hitting your account over the next {MONTHS_AHEAD} months.</CardDescription>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No charges scheduled"
            description="No active recurring charge falls within the next few months."
          />
        ) : (
          <div className="space-y-5">
            {groups.map((group) => (
              <div key={group.month}>
                <div className="mb-2 flex items-baseline justify-between border-b border-border pb-1.5">
                  <h4 className="text-sm font-semibold text-foreground">{formatMonthLong(group.month)}</h4>
                  <span className="text-sm font-medium tabular-nums text-muted-foreground">{money.format(group.total)}</span>
                </div>
                <ul className="space-y-1.5">
                  {group.items.map((item, i) => {
                    const cat = categories.get(item.categoryId);
                    return (
                      <li key={`${item.recurringId}-${item.date}-${i}`} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <Dot color={cat?.color ?? "#888888"} />
                          <span className="w-20 shrink-0 text-xs tabular-nums text-muted-foreground">{formatDateMedium(item.date)}</span>
                          <span className="truncate text-foreground">{item.name}</span>
                        </span>
                        <span className="shrink-0 tabular-nums text-foreground">{money.format(item.amount)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
