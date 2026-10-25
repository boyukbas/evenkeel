import { PageHeader } from "@/components/layout";
import { MonthSwitcher } from "@/components/ui";
import { usePeriod } from "@/store/period";
import { KpiRow } from "./KpiRow";
import { ActualVsNormalizedHero } from "./ActualVsNormalizedHero";
import { TrendChart } from "./TrendChart";
import { CategoryBreakdown } from "./CategoryBreakdown";
import { InsightsPreview } from "./InsightsPreview";
import { RecentActivity } from "./RecentActivity";
import { SavingsGoals } from "./SavingsGoals";

export function DashboardPage() {
  const { month } = usePeriod();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Your month at a glance — actual cash out, your smoothed baseline, and where the savings are."
        actions={<MonthSwitcher />}
      />

      <KpiRow month={month} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TrendChart month={month} />
        </div>
        <div className="lg:col-span-1">
          <ActualVsNormalizedHero month={month} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CategoryBreakdown month={month} />
        <InsightsPreview />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecentActivity />
        <SavingsGoals />
      </div>
    </div>
  );
}
