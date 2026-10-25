import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthlyPoint } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from "@/components/ui";
import { ChartTooltip, useThemeColors } from "@/components/charts/chart-kit";
import { useMoney } from "@/hooks/useMoney";
import { formatMonthLong, formatMonthShort } from "@/lib/date";

export function TrendsChart({ series }: { series: MonthlyPoint[] }) {
  const colors = useThemeColors();
  const money = useMoney();

  const hasData = series.some((p) => p.actual > 0 || p.normalized > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending trend</CardTitle>
        <CardDescription>Actual cash out vs your smoothed, normalized spend.</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <EmptyState title="No spending yet" description="Once you log expenses, your trend will appear here." />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
              <CartesianGrid stroke={colors.border} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="month"
                tickFormatter={(m) => formatMonthShort(String(m))}
                stroke={colors.mutedForeground}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: colors.border }}
              />
              <YAxis
                stroke={colors.mutedForeground}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={(v) => money.formatCompact(Number(v))}
              />
              <Tooltip
                content={<ChartTooltip labelFormatter={(m) => formatMonthLong(String(m))} />}
                cursor={{ stroke: colors.border }}
              />
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual"
                stroke={colors.mutedForeground}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="normalized"
                name="Normalized"
                stroke={colors.primary}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
