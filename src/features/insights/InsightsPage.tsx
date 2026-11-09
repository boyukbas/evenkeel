import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout";
import { SegmentedControl } from "@/components/ui";
import {
  useInsights,
  useLastNMonths,
  useMonthlySeries,
  useSavingOpportunities,
  useSubscriptions,
} from "@/hooks/useAnalytics";
import { useCategoryMap } from "@/hooks/useData";
import { InsightCards } from "./InsightCards";
import { SavingsBanner } from "./SavingsBanner";
import { SavingOpportunities } from "./SavingOpportunities";
import { SubscriptionAudit } from "./SubscriptionAudit";
import { TrendsChart } from "./TrendsChart";
import { NeedsVsWants } from "./NeedsVsWants";
import { CategoryBreakdown } from "./CategoryBreakdown";
import { TagBreakdown } from "./TagBreakdown";
import { needsVsWants } from "./lib";

type Window = "3" | "6" | "12";

const WINDOW_OPTIONS = [
  { value: "3" as const, label: "3 mo" },
  { value: "6" as const, label: "6 mo" },
  { value: "12" as const, label: "12 mo" },
];

export function InsightsPage() {
  const [window, setWindow] = useState<Window>("6");
  const months = useLastNMonths(Number(window));

  const byId = useCategoryMap();
  const insights = useInsights(months);
  const { opportunities, totals } = useSavingOpportunities(months);
  const subscriptions = useSubscriptions();
  const series = useMonthlySeries(months);

  const needsWants = useMemo(() => needsVsWants(series, byId, months.length), [series, byId, months.length]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insights"
        description="Understand your spending and find money to free up."
        actions={
          <SegmentedControl
            value={window}
            onChange={(v) => setWindow(v as Window)}
            options={WINDOW_OPTIONS}
          />
        }
      />

      <InsightCards insights={insights} />

      <SavingsBanner monthly={totals.monthly} annual={totals.annual} count={opportunities.length} />

      {/* Side by side only on very wide screens: the subscription table needs ~34rem. */}
      <div className="grid gap-6 2xl:grid-cols-2">
        <SavingOpportunities opportunities={opportunities} byId={byId} />
        <SubscriptionAudit subscriptions={subscriptions} byId={byId} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TrendsChart series={series} />
        </div>
        <NeedsVsWants data={needsWants} />
      </div>

      <CategoryBreakdown series={series} byId={byId} monthCount={months.length} />

      <TagBreakdown />
    </div>
  );
}
