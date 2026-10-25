import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { PieChart as PieIcon } from "lucide-react";
import type { CategoryAmount, MonthKey } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CategoryIcon,
  EmptyState,
  SegmentedControl,
} from "@/components/ui";
import { useMoney } from "@/hooks/useMoney";
import { usePointForMonth } from "@/hooks/useAnalytics";
import { useCategoryMap } from "@/hooks/useData";
import { useThemeColors } from "@/components/charts/chart-kit";
import { formatMonthLong } from "@/lib/date";

type View = "normalized" | "actual";

const VIEW_OPTIONS = [
  { value: "normalized" as const, label: "Normalized" },
  { value: "actual" as const, label: "Actual" },
];

interface Slice {
  categoryId: string;
  name: string;
  color: string;
  amount: number;
}

/** Donut of the month's spend by category, plus a sorted legend with %. */
export function CategoryBreakdown({ month }: { month: MonthKey }) {
  const money = useMoney();
  const catMap = useCategoryMap();
  const colors = useThemeColors();
  const point = usePointForMonth(month);
  const [view, setView] = useState<View>("normalized");

  const source: CategoryAmount[] = view === "actual" ? point.actualByCategory : point.normalizedByCategory;

  const slices = useMemo<Slice[]>(() => {
    let fallback = 0;
    return source
      .filter((c) => c.amount > 0)
      .map((c) => {
        const cat = catMap.get(c.categoryId);
        const color = cat?.color ?? colors.chart[fallback++ % colors.chart.length];
        return {
          categoryId: c.categoryId,
          name: cat?.name ?? "Uncategorized",
          color,
          amount: c.amount,
        };
      });
  }, [source, catMap, colors.chart]);

  const total = useMemo(() => slices.reduce((s, x) => s + x.amount, 0), [slices]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle>Category breakdown</CardTitle>
        <SegmentedControl size="sm" value={view} onChange={setView} options={VIEW_OPTIONS} />
      </CardHeader>
      <CardContent>
        {slices.length === 0 ? (
          <EmptyState
            icon={PieIcon}
            title="No spend this month"
            description={`Nothing recorded for ${formatMonthLong(month)} yet.`}
          />
        ) : (
          <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-[auto_1fr]">
            <div className="relative mx-auto h-44 w-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={54}
                    outerRadius={84}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {slices.map((s) => (
                      <Cell key={s.categoryId} fill={s.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="text-lg font-semibold tracking-tight">{money.formatCompact(total)}</span>
              </div>
            </div>

            <ul className="space-y-2.5">
              {slices.map((s) => {
                const pct = total > 0 ? (s.amount / total) * 100 : 0;
                return (
                  <li key={s.categoryId} className="flex items-center gap-3">
                    <CategoryIcon
                      category={{ icon: catMap.get(s.categoryId)?.icon, color: s.color, name: s.name }}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{pct.toFixed(0)}% of month</p>
                    </div>
                    <span className="shrink-0 text-sm font-medium tabular-nums">{money.format(s.amount)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
