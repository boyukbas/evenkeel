import { ArrowRight, Lightbulb, Sparkles } from "lucide-react";
import type { ID, SavingOpportunity } from "@/types";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, CategoryIcon } from "@/components/ui";
import { useMoney } from "@/hooks/useMoney";
import { useCategoryMap } from "@/hooks/useData";
import { useLastNMonths, useSavingOpportunities } from "@/hooks/useAnalytics";
import type { GoalFormSeed } from "./useGoalForm";

/** How many top opportunities to surface. */
const MAX_SUGGESTIONS = 4;

/** Turn an opportunity into a pre-filled "new goal" seed. */
function seedFromOpportunity(opp: SavingOpportunity): GoalFormSeed {
  return {
    name: `Save on ${opp.label}`,
    monthlyContribution: opp.monthlySaving,
    linkedCategoryIds: opp.categoryId ? [opp.categoryId] : [],
  };
}

export function SuggestionsSection({ onApply }: { onApply: (seed: GoalFormSeed) => void }) {
  const money = useMoney();
  const categoryMap = useCategoryMap();
  const { opportunities } = useSavingOpportunities(useLastNMonths(6));

  const top = opportunities.filter((o) => o.monthlySaving > 0).slice(0, MAX_SUGGESTIONS);
  if (top.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-warning" />
          <CardTitle>Turn savings into goals</CardTitle>
        </div>
        <CardDescription>
          Detected opportunities from your non-essential spending. Apply one to seed a funded goal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {top.map((opp) => {
          const category: ID | undefined = opp.categoryId;
          const cat = category ? categoryMap.get(category) : undefined;
          return (
            <div
              key={opp.id}
              className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                {cat ? (
                  <CategoryIcon category={cat} />
                ) : (
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Sparkles className="h-4 w-4" />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{opp.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{opp.rationale}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <div className="text-right">
                  <p className="text-sm font-semibold text-success">{money.format(opp.monthlySaving)}/mo</p>
                  <p className="text-xs text-muted-foreground">{money.format(opp.annualSaving)}/yr</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => onApply(seedFromOpportunity(opp))}>
                  Apply to a goal
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
