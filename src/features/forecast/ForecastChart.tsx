import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ForecastPoint } from "@/lib/forecast";
import { ChartTooltip, useThemeColors } from "@/components/charts/chart-kit";
import { useMoney } from "@/hooks/useMoney";
import { formatMonthLong, formatMonthShort } from "@/lib/date";

export function ForecastChart({ points }: { points: ForecastPoint[] }) {
  const colors = useThemeColors();
  const money = useMoney();
  const data = points.map((p) => ({
    month: p.month,
    "Projected actual": p.projectedActual,
    "Normalized baseline": p.projectedNormalized,
    isSpike: p.isSpike,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={(m) => formatMonthShort(String(m))}
          tick={{ fill: colors.mutedForeground, fontSize: 12 }}
          stroke={colors.border}
        />
        <YAxis
          tickFormatter={(v) => money.formatCompact(Number(v))}
          tick={{ fill: colors.mutedForeground, fontSize: 12 }}
          stroke={colors.border}
          width={64}
        />
        <Tooltip
          content={<ChartTooltip labelFormatter={(m) => formatMonthLong(String(m))} />}
          cursor={{ fill: colors.mutedForeground, fillOpacity: 0.08 }}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Bar dataKey="Projected actual" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.isSpike ? colors.warning : colors.chart[1]} fillOpacity={d.isSpike ? 0.95 : 0.55} />
          ))}
        </Bar>
        <Line type="monotone" dataKey="Normalized baseline" stroke={colors.primary} strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
