import { ArrowRight, Lightbulb, Sparkles, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import type { Insight, InsightSeverity } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, EmptyState } from "@/components/ui";
import { useMoney } from "@/hooks/useMoney";
import { useInsights, useLastNMonths } from "@/hooks/useAnalytics";
import { cn } from "@/lib/cn";

const SEVERITY: Record<
  InsightSeverity,
  { icon: LucideIcon; border: string; iconText: string; iconBg: string }
> = {
  warning: { icon: TrendingUp, border: "border-l-danger", iconText: "text-danger", iconBg: "bg-danger/10" },
  opportunity: { icon: Sparkles, border: "border-l-success", iconText: "text-success", iconBg: "bg-success/10" },
  info: { icon: Lightbulb, border: "border-l-primary", iconText: "text-primary", iconBg: "bg-primary/10" },
};

/** Top 3 insights as compact cards, keyed by severity, with a link to the full page. */
export function InsightsPreview() {
  const insights = useInsights(useLastNMonths(6));
  const top = insights.slice(0, 3);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle>Insights</CardTitle>
        <Link
          to="/insights"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View all insights
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent>
        {top.length === 0 ? (
          <EmptyState
            icon={Lightbulb}
            title="No insights yet"
            description="Add a few months of expenses and we'll surface savings and trends."
          />
        ) : (
          <ul className="space-y-3">
            {top.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const money = useMoney();
  const tone = SEVERITY[insight.severity];
  const Icon = tone.icon;

  return (
    <li className={cn("flex gap-3 rounded-lg border border-l-4 border-border bg-background/40 p-3", tone.border)}>
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", tone.iconBg, tone.iconText)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{insight.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{insight.detail}</p>
      </div>
      {insight.monthlySaving != null && insight.monthlySaving > 0 && (
        <span className="shrink-0 self-start text-sm font-semibold text-success tabular-nums">
          {money.format(insight.monthlySaving)}/mo
        </span>
      )}
    </li>
  );
}
