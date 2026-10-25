import { Repeat } from "lucide-react";
import type { Category, ID, SubscriptionInfo } from "@/types";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, CategoryIcon, EmptyState } from "@/components/ui";
import { useMoney } from "@/hooks/useMoney";
import { describeFrequency } from "@/lib/recurrence";

interface SubscriptionAuditProps {
  subscriptions: SubscriptionInfo[];
  byId: Map<ID, Category>;
}

export function SubscriptionAudit({ subscriptions, byId }: SubscriptionAuditProps) {
  const money = useMoney();
  const nonEssentialAnnual = subscriptions
    .filter((s) => !s.essential)
    .reduce((sum, s) => sum + s.annualCost, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription audit</CardTitle>
        <CardDescription>Every active recurring charge, costliest per year first.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {subscriptions.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="No recurring charges"
            description="Add recurring expenses to keep an eye on subscription creep."
          />
        ) : (
          <>
            {nonEssentialAnnual > 0 && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 px-3.5 py-2.5 text-sm">
                Non-essential subscriptions cost you{" "}
                <span className="font-semibold text-warning">{money.format(nonEssentialAnnual)}/yr</span>.
              </div>
            )}
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                    <th className="px-1 pb-2 font-medium">Subscription</th>
                    <th className="px-1 pb-2 font-medium">Frequency</th>
                    <th className="px-1 pb-2 text-right font-medium">Monthly</th>
                    <th className="px-1 pb-2 text-right font-medium">Annual</th>
                    <th className="px-1 pb-2 text-right font-medium">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {subscriptions.map(({ recurring, monthlyEquivalent, annualCost, essential }) => {
                    const category = byId.get(recurring.categoryId);
                    return (
                      <tr key={recurring.id}>
                        <td className="px-1 py-2.5">
                          <div className="flex items-center gap-2.5">
                            {category && <CategoryIcon category={category} size="sm" />}
                            <span className="font-medium">{recurring.name}</span>
                          </div>
                        </td>
                        <td className="px-1 py-2.5 text-muted-foreground">{describeFrequency(recurring)}</td>
                        <td className="px-1 py-2.5 text-right tabular-nums">{money.format(monthlyEquivalent)}</td>
                        <td className="px-1 py-2.5 text-right font-medium tabular-nums">{money.format(annualCost)}</td>
                        <td className="px-1 py-2.5 text-right">
                          <Badge variant={essential ? "default" : "warning"}>
                            {essential ? "Essential" : "Non-essential"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
