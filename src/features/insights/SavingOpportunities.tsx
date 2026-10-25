import { PartyPopper } from "lucide-react";
import type { Category, ID, SavingOpportunity } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CategoryIcon, EmptyState } from "@/components/ui";
import { useMoney } from "@/hooks/useMoney";

interface SavingOpportunitiesProps {
  opportunities: SavingOpportunity[];
  byId: Map<ID, Category>;
}

function OpportunityRow({ opp, byId }: { opp: SavingOpportunity; byId: Map<ID, Category> }) {
  const money = useMoney();
  const category = opp.categoryId ? byId.get(opp.categoryId) : undefined;
  // Suggested as a fraction of current, for the comparison bar (0..1).
  const suggestedFrac =
    opp.currentMonthly > 0 ? Math.max(0, Math.min(1, opp.suggestedMonthly / opp.currentMonthly)) : 0;

  return (
    <li className="flex flex-col gap-2 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {category ? (
            <CategoryIcon category={category} size="sm" />
          ) : (
            <span className="h-7 w-7 shrink-0 rounded-lg bg-muted" aria-hidden />
          )}
          <div className="min-w-0">
            <p className="truncate font-medium leading-tight">{opp.label}</p>
            <p className="text-xs text-muted-foreground">
              {money.format(opp.currentMonthly)}/mo
              {opp.suggestedMonthly > 0 ? ` → ${money.format(opp.suggestedMonthly)}/mo` : " → cancel"}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-semibold text-success">{money.format(opp.monthlySaving)}/mo</p>
          <p className="text-xs text-muted-foreground">{money.format(opp.annualSaving)}/yr</p>
        </div>
      </div>

      {/* Current (full track) vs suggested (success fill) comparison bar. */}
      <div
        className="relative h-2 w-full overflow-hidden rounded-full bg-danger/20"
        role="img"
        aria-label={`Suggested ${money.format(opp.suggestedMonthly)} of current ${money.format(opp.currentMonthly)} per month`}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-success transition-all"
          style={{ width: `${suggestedFrac * 100}%` }}
        />
      </div>

      <p className="text-xs text-muted-foreground">{opp.rationale}</p>
    </li>
  );
}

export function SavingOpportunities({ opportunities, byId }: SavingOpportunitiesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Unnecessary spending</CardTitle>
        <CardDescription>Non-essential charges and hot discretionary categories, biggest savings first.</CardDescription>
      </CardHeader>
      <CardContent>
        {opportunities.length === 0 ? (
          <EmptyState
            icon={PartyPopper}
            title="No obvious waste — nice!"
            description="None of your non-essential spending stands out as trimmable right now."
          />
        ) : (
          <ul className="divide-y divide-border">
            {opportunities.map((opp) => (
              <OpportunityRow key={opp.id} opp={opp} byId={byId} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
