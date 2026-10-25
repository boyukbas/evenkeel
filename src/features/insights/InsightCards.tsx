import { AlertTriangle, Info, PartyPopper, Sparkles } from "lucide-react";
import type { Insight, InsightSeverity } from "@/types";
import { Badge, Card, EmptyState } from "@/components/ui";
import { useMoney } from "@/hooks/useMoney";
import { cn } from "@/lib/cn";
import { SEVERITY_ACCENT } from "./lib";

const SEVERITY_ICON: Record<InsightSeverity, typeof Info> = {
  warning: AlertTriangle,
  opportunity: Sparkles,
  info: Info,
};

function InsightCard({ insight }: { insight: Insight }) {
  const money = useMoney();
  const accent = SEVERITY_ACCENT[insight.severity];
  const Icon = SEVERITY_ICON[insight.severity];
  return (
    <Card className="relative flex gap-3 overflow-hidden p-4 pl-5">
      <span className={cn("absolute inset-y-0 left-0 w-1", accent.bar)} aria-hidden />
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", accent.tile, accent.text)}>
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium leading-tight">{insight.title}</p>
          <Badge variant={accent.badge} className="shrink-0">{accent.label}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{insight.detail}</p>
        {insight.monthlySaving != null && insight.monthlySaving > 0 && (
          <p className={cn("pt-0.5 text-sm font-semibold", accent.text)}>
            {money.format(insight.monthlySaving)}
            <span className="font-normal text-muted-foreground">
              {insight.severity === "warning" ? " over" : " / mo"}
            </span>
          </p>
        )}
      </div>
    </Card>
  );
}

export function InsightCards({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return (
      <EmptyState
        icon={PartyPopper}
        title="Nothing needs your attention"
        description="No budget breaches, spikes, or obvious waste in this window — your spending is on an even keel."
      />
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {insights.map((insight) => (
        <InsightCard key={insight.id} insight={insight} />
      ))}
    </div>
  );
}
