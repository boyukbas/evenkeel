import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthKey } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from "@/components/ui";
import { ChartTooltip, useThemeColors } from "@/components/charts/chart-kit";
import { useMoney } from "@/hooks/useMoney";
import { useMonthlySeries } from "@/hooks/useAnalytics";
import { addMonthsToKey, formatMonthLong, formatMonthShort, monthRange } from "@/lib/date";
import { LineChart } from "lucide-react";

/** Trailing 12 months (ending at `month`): actual as bars, normalized as a line. */
export function TrendChart({ month }: { month: MonthKey }) {
  const colors = useThemeColors();
  const money = useMoney();

  const months = useMemo(() => monthRange(addMonthsToKey(month, -11), month), [month]);
  const series = useMonthlySeries(months);

  const hasData = series.some((p) => p.actual > 0 || p.normalized > 0);
  // "Actual" reads best as a muted/secondary chart color; normalized stays primary.
  const actualColor = colors.chart[1] ?? colors.mutedForeground;

  return (
    <Card>
      <CardHeader>
        <CardTitle>12-month trend</CardTitle>
        <CardDescription>Actual cash out vs your normalized baseline, month by month.</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
              <CartesianGrid vertical={false} stroke={colors.border} strokeDasharray="3 3" />
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
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <Bar dataKey="actual" name="Actual" fill={actualColor} radius={[4, 4, 0, 0]} maxBarSize={36} />
              <Line
                type="monotone"
                dataKey="normalized"
                name="Normalized"
                stroke={colors.primary}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            icon={LineChart}
            title="No spending in this window"
            description="Add expenses to see your 12-month trend take shape."
          />
        )}
      </CardContent>
    </Card>
  );
}
