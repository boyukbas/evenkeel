/**
 * Forecast — projects the next 6–12 months of spending. Known recurring charges
 * are projected exactly; everyday spending is estimated from your recent average.
 * Lumpy renewal months show up as spikes long before they hit.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, PiggyBank, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CategoryIcon,
  EmptyState,
  SegmentedControl,
  Stat,
} from "@/components/ui";
import { useCategoryMap } from "@/hooks/useData";
import { useMoney } from "@/hooks/useMoney";
import { useForecast } from "@/hooks/useAnalytics";
import { formatDateMedium, formatMonthLong } from "@/lib/date";
import { ForecastChart } from "./ForecastChart";

type Horizon = "6" | "12";

const HORIZON_OPTIONS = [
  { value: "6" as const, label: "6 mo" },
  { value: "12" as const, label: "12 mo" },
];

export function ForecastPage() {
  const [horizon, setHorizon] = useState<Horizon>("12");
  const { points, summary, lumps } = useForecast(Number(horizon));
  const money = useMoney();
  const byId = useCategoryMap();
  const navigate = useNavigate();

  const baseline = points[0]?.discretionary ?? 0;
  const hasData = points.some((p) => p.projectedActual > 0) || lumps.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Forecast"
        description="What your spending looks like ahead — including the periodic charges you already know about."
        actions={<SegmentedControl value={horizon} onChange={(v) => setHorizon(v as Horizon)} options={HORIZON_OPTIONS} />}
      />

      {!hasData ? (
        <EmptyState
          icon={TrendingUp}
          title="Nothing to forecast yet"
          description="Add a few expenses and your recurring charges (rent, subscriptions, insurance) and EvenKeel will project the months ahead — and warn you about lumpy renewals."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Avg normalized / mo" value={money.format(summary.avgNormalized)} sub={`next ${summary.horizon} months`} />
            <Stat
              label="Biggest month"
              value={money.format(summary.peakActual)}
              sub={summary.peakMonth ? formatMonthLong(summary.peakMonth) : undefined}
            />
            <Stat label="Projected spend" value={money.format(summary.totalActual)} sub={`over ${summary.horizon} months`} />
            <Stat label="Suggested buffer" value={money.format(summary.bufferMonthly)} sub="set aside / month" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Projected spending</CardTitle>
              <CardDescription>
                Bars are projected real spend (amber = a lumpy charge lands); the line is your smoothed monthly baseline.
                Everyday spending is estimated at ~{money.format(baseline)}/mo from your recent average.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ForecastChart points={points} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Big charges ahead</CardTitle>
                <CardDescription>Periodic charges (not monthly) coming up in the next {summary.horizon} months.</CardDescription>
              </CardHeader>
              <CardContent>
                {lumps.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No lumpy charges ahead — your months should stay steady.
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {lumps.map((l, i) => {
                      const cat = byId.get(l.categoryId);
                      return (
                        <div key={`${l.recurringId}-${i}`} className="flex items-center gap-3 py-3">
                          {cat && <CategoryIcon category={cat} />}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{l.name}</p>
                            <p className="text-xs text-muted-foreground">{formatDateMedium(l.date)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="warning">{formatMonthLong(l.month)}</Badge>
                            <span className="text-sm font-medium tabular-nums">{money.format(l.amount)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Stay on an even keel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg bg-primary/10 p-4">
                  <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <p className="text-sm text-foreground">
                    Set aside <span className="font-semibold">{money.format(summary.bufferMonthly)}</span> a month and the
                    lumpy renewals above won't dent any single month.
                    {summary.spikeCount > 0 && (
                      <>
                        {" "}
                        {summary.spikeCount} spike{summary.spikeCount === 1 ? "" : "s"} ahead.
                      </>
                    )}
                  </p>
                </div>
                <Button variant="outline" className="w-full" onClick={() => navigate("/savings")}>
                  <PiggyBank className="h-4 w-4" />
                  Plan a buffer in Savings
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
