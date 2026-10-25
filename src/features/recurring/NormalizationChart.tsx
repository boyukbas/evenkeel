/**
 * The centerpiece: shows how a lumpy periodic charge (spiky bars = real cash
 * that month) becomes an even monthly cost (flat dashed line = smoothed).
 */
import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import type { RecurringExpense } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Select } from "@/components/ui";
import { ChartTooltip, useThemeColors } from "@/components/charts/chart-kit";
import {
  addMonthsToKey,
  currentMonthKey,
  endOfMonthISO,
  formatMonthLong,
  formatMonthShort,
  monthRange,
  startOfMonthISO,
} from "@/lib/date";
import { useMoney } from "@/hooks/useMoney";
import { describeFrequency, monthlyAmortized, occurrencesBetween } from "@/lib/recurrence";

const ALL = "__all__";

interface ChartRow {
  month: string;
  Actual: number;
  Normalized: number;
}

interface NormalizationChartProps {
  active: RecurringExpense[];
  scopeId: string;
  onScopeChange: (id: string) => void;
}

/** The fixed 12-month window centered on today (6 back, 5 forward). */
function useWindowMonths(): string[] {
  return useMemo(
    () => monthRange(addMonthsToKey(currentMonthKey(), -6), addMonthsToKey(currentMonthKey(), 5)),
    [],
  );
}

export function NormalizationChart({ active, scopeId, onScopeChange }: NormalizationChartProps) {
  const colors = useThemeColors();
  const money = useMoney();
  const months = useWindowMonths();

  const selected = scopeId === ALL ? null : active.find((r) => r.id === scopeId) ?? null;
  const scope = scopeId === ALL ? active : selected ? [selected] : [];

  const data = useMemo<ChartRow[]>(() => {
    const normalized = scope.reduce((sum, r) => sum + monthlyAmortized(r), 0);
    return months.map((m) => {
      const start = startOfMonthISO(m);
      const end = endOfMonthISO(m);
      let actual = 0;
      for (const rec of scope) {
        for (const occ of occurrencesBetween(rec, start, end)) actual += occ.amount;
      }
      return { month: m, Actual: actual, Normalized: normalized };
    });
  }, [scope, months]);

  const monthlyForScope = useMemo(
    () => scope.reduce((sum, r) => sum + monthlyAmortized(r), 0),
    [scope],
  );

  const title = selected
    ? `How a ${describeFrequency(selected).toLowerCase()} charge becomes an even monthly cost`
    : "How lumpy charges become an even monthly cost";

  const caption = buildCaption(selected, monthlyForScope, money.formatWhole);

  const hasData = scope.length > 0 && data.some((d) => d.Actual > 0 || d.Normalized > 0);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <TrendingUp className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              Bars are the real cash each month. The dashed line is the smoothed, even monthly cost.
            </CardDescription>
          </div>
        </div>
        <div className="w-full sm:w-56">
          <Select
            aria-label="Choose recurring item to visualize"
            value={scopeId}
            onChange={(e) => onScopeChange(e.target.value)}
          >
            <option value={ALL}>All active ({active.length})</option>
            {active.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
                <XAxis
                  dataKey="month"
                  tickFormatter={(m) => formatMonthShort(String(m))}
                  tick={{ fontSize: 11, fill: colors.mutedForeground }}
                  axisLine={{ stroke: colors.border }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => money.formatCompact(Number(v))}
                  tick={{ fontSize: 11, fill: colors.mutedForeground }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                />
                <Tooltip
                  cursor={{ fill: colors.mutedForeground, opacity: 0.08 }}
                  content={<ChartTooltip labelFormatter={(m) => formatMonthLong(String(m))} />}
                />
                <Bar
                  dataKey="Actual"
                  name="Actual (real cash)"
                  fill={colors.chart[0]}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={44}
                />
                <Line
                  dataKey="Normalized"
                  name="Normalized (smoothed)"
                  type="monotone"
                  stroke={colors.primary}
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
            {caption && (
              <p className="mt-3 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.primary }} />
                {caption}
              </p>
            )}
          </>
        ) : (
          <div className="flex h-[320px] flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Nothing to smooth yet</p>
            <p>Add an active recurring charge to see it spread into an even monthly line.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** A plain-English takeaway with the real numbers for the chosen scope. */
function buildCaption(
  selected: RecurringExpense | null,
  monthly: number,
  fmt: (n: number) => string,
): string | null {
  if (monthly <= 0) return null;
  if (selected) {
    return `A ${fmt(selected.amount)} ${describeFrequency(selected).toLowerCase()} charge = ${fmt(monthly)}/mo smoothed.`;
  }
  return `All active charges = ${fmt(monthly)}/mo smoothed — an even line instead of spikes.`;
}
