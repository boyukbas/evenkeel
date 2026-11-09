import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, Stat } from "@/components/ui";
import { useThemeColors } from "@/components/charts/chart-kit";
import { useMoney } from "@/hooks/useMoney";
import type { NeedsWants } from "./lib";

export function NeedsVsWants({ data }: { data: NeedsWants }) {
  const colors = useThemeColors();
  const money = useMoney();

  const pieData = [
    { name: "Needs", value: data.needsTotal, color: colors.primary },
    { name: "Wants", value: data.wantsTotal, color: colors.warning },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Needs vs wants</CardTitle>
        <CardDescription>Essential vs non-essential share of your normalized spend.</CardDescription>
      </CardHeader>
      <CardContent>
        {data.total <= 0 ? (
          <EmptyState title="Nothing to split yet" description="Log some spending to see your needs/wants balance." />
        ) : (
          <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col">
            <div className="relative h-36 w-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={46}
                    outerRadius={68}
                    paddingAngle={2}
                    stroke="none"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold tracking-tight">{data.needsPct}%</span>
                <span className="text-xs text-muted-foreground">needs</span>
              </div>
            </div>
            <div className="grid w-full flex-1 grid-cols-2 gap-3">
              <Stat
                label="Needs"
                value={`${data.needsPct}%`}
                sub={`${money.format(data.needsMonthly)}/mo`}
              />
              <Stat
                label="Wants"
                value={`${data.wantsPct}%`}
                sub={`${money.format(data.wantsMonthly)}/mo`}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
