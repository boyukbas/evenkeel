/**
 * Budgets — track each category's *normalized* monthly spend against a target,
 * so a lumpy periodic charge doesn't blow a month's budget. Measured against the
 * selected month; budgets live on the category (and an overall budget in Settings).
 */
import { useMemo, useState } from "react";
import { Gauge, Sparkles, Wallet } from "lucide-react";
import type { Category } from "@/types";
import { PageHeader } from "@/components/layout";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CategoryIcon,
  EmptyState,
  MonthSwitcher,
  SegmentedControl,
  Stat,
} from "@/components/ui";
import { useCategories, useSettings } from "@/hooks/useData";
import { useMoney } from "@/hooks/useMoney";
import { useLastNMonths, useMonthlySeries, usePointForMonth } from "@/hooks/useAnalytics";
import { usePeriod } from "@/store/period";
import { categoryTotals } from "@/lib/analytics";
import { updateCategory, updateSettings } from "@/db/repo";
import { toast } from "@/store/toast";
import { makeBudgetRow, sortBudgetRows, suggestBudget } from "./helpers";
import { BudgetRow } from "./BudgetRow";
import { OverallBudgetCard } from "./OverallBudgetCard";
import { SetBudgetModal } from "./SetBudgetModal";

type Basis = "normalized" | "actual";
type EditTarget = { kind: "overall" } | { kind: "category"; category: Category } | null;

const BASIS_OPTIONS = [
  { value: "normalized" as const, label: "Normalized" },
  { value: "actual" as const, label: "Actual" },
];

export function BudgetsPage() {
  const categories = useCategories();
  const settings = useSettings();
  const money = useMoney();
  const { month } = usePeriod();
  const [basis, setBasis] = useState<Basis>("normalized");
  const [editTarget, setEditTarget] = useState<EditTarget>(null);

  const point = usePointForMonth(month);
  const trailingMonths = useLastNMonths(6);
  const trailingSeries = useMonthlySeries(trailingMonths);

  const spentByCat = useMemo(() => {
    const list = basis === "normalized" ? point.normalizedByCategory : point.actualByCategory;
    return new Map(list.map((c) => [c.categoryId, c.amount]));
  }, [point, basis]);

  const avgByCat = useMemo(() => {
    const totals = categoryTotals(trailingSeries, basis);
    const n = Math.max(1, trailingMonths.length);
    return new Map(totals.map((c) => [c.categoryId, c.amount / n]));
  }, [trailingSeries, basis, trailingMonths.length]);

  const totalSpent = basis === "normalized" ? point.normalized : point.actual;
  const trailingAvgTotal = useMemo(() => {
    if (trailingSeries.length === 0) return 0;
    const sum = trailingSeries.reduce((s, p) => s + (basis === "normalized" ? p.normalized : p.actual), 0);
    return sum / trailingSeries.length;
  }, [trailingSeries, basis]);

  const active = categories.filter((c) => !c.archived);
  const budgeted = active.filter((c) => (c.monthlyBudget ?? 0) > 0);
  const unbudgeted = active.filter((c) => !((c.monthlyBudget ?? 0) > 0));

  const rows = useMemo(
    () => sortBudgetRows(budgeted.map((c) => makeBudgetRow(c, spentByCat.get(c.id) ?? 0, c.monthlyBudget ?? 0))),
    [budgeted, spentByCat],
  );

  const totalBudgeted = budgeted.reduce((s, c) => s + (c.monthlyBudget ?? 0), 0);
  const spentOnBudgeted = budgeted.reduce((s, c) => s + (spentByCat.get(c.id) ?? 0), 0);
  const overCount = rows.filter((r) => r.status === "over").length;
  const basisLabel = basis === "normalized" ? "normalized" : "actual";

  const nothingConfigured = budgeted.length === 0 && !(settings.monthlyBudget && settings.monthlyBudget > 0);

  const saveBudget = async (amount: number | null) => {
    if (!editTarget) return;
    try {
      if (editTarget.kind === "overall") {
        await updateSettings({ monthlyBudget: amount });
        toast.success(amount ? "Overall budget set" : "Overall budget removed");
      } else {
        await updateCategory(editTarget.category.id, { monthlyBudget: amount });
        toast.success(amount ? `Budget set for ${editTarget.category.name}` : `Budget removed for ${editTarget.category.name}`);
      }
    } catch {
      toast.error("Couldn't save budget", "Please try again.");
    }
  };

  const autoSetAll = async () => {
    const targets = unbudgeted
      .map((c) => ({ c, amount: suggestBudget(avgByCat.get(c.id) ?? 0) }))
      .filter((t) => t.amount > 0);
    if (targets.length === 0) {
      toast.info("Nothing to suggest", "No recent spending to base budgets on.");
      return;
    }
    try {
      await Promise.all(targets.map((t) => updateCategory(t.c.id, { monthlyBudget: t.amount })));
      toast.success(`Set ${targets.length} budgets`, "Based on your 6-month average — tweak any of them.");
    } catch {
      toast.error("Couldn't set budgets", "Please try again.");
    }
  };

  const modalProps =
    editTarget?.kind === "category"
      ? {
          title: `Budget · ${editTarget.category.name}`,
          description: "Monthly target for this category.",
          current: editTarget.category.monthlyBudget,
          suggestion: suggestBudget(avgByCat.get(editTarget.category.id) ?? 0),
        }
      : {
          title: "Overall monthly budget",
          description: "Your total monthly spending target.",
          current: settings.monthlyBudget,
          suggestion: suggestBudget(trailingAvgTotal),
        };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budgets"
        description="Set monthly targets and track them against your smoothed spend — periodic charges won't blow a single month."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl value={basis} onChange={(v) => setBasis(v as Basis)} options={BASIS_OPTIONS} size="sm" />
            <MonthSwitcher />
          </div>
        }
      />

      <OverallBudgetCard
        spent={totalSpent}
        budget={settings.monthlyBudget}
        basisLabel={basisLabel}
        onSet={() => setEditTarget({ kind: "overall" })}
      />

      {budgeted.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat label="Budgeted (monthly)" value={money.format(totalBudgeted)} sub={`across ${budgeted.length} categories`} />
          <Stat label={`Spent on budgeted`} value={money.format(spentOnBudgeted)} sub={`of ${money.format(totalBudgeted)} · ${basisLabel}`} />
          <Stat label="Over budget" value={String(overCount)} sub={overCount === 1 ? "category" : "categories"} />
        </div>
      )}

      {nothingConfigured ? (
        <EmptyState
          icon={Gauge}
          title="No budgets yet"
          description="Set an overall monthly target above, or give individual categories a budget. EvenKeel can also suggest budgets from your recent average."
          action={
            <Button onClick={autoSetAll}>
              <Sparkles className="h-4 w-4" />
              Auto-set from my average
            </Button>
          }
        />
      ) : (
        budgeted.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Category budgets</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {rows.map((row) => (
                <BudgetRow key={row.category.id} row={row} onEdit={() => setEditTarget({ kind: "category", category: row.category })} />
              ))}
            </CardContent>
          </Card>
        )
      )}

      {unbudgeted.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Not budgeted yet</CardTitle>
              <p className="text-sm text-muted-foreground">Their recent {basisLabel} monthly average is shown as a starting point.</p>
            </div>
            <Button variant="outline" size="sm" onClick={autoSetAll}>
              <Sparkles className="h-4 w-4" />
              Auto-set all
            </Button>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {unbudgeted.map((c) => {
              const avg = avgByCat.get(c.id) ?? 0;
              return (
                <div key={c.id} className="flex items-center gap-3 py-3">
                  <CategoryIcon category={c} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {avg > 0 ? `~${money.format(avg)}/mo recently` : "No recent spending"}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setEditTarget({ kind: "category", category: c })}>
                    <Wallet className="h-4 w-4" />
                    Set budget
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <SetBudgetModal open={editTarget !== null} onClose={() => setEditTarget(null)} onSave={saveBudget} {...modalProps} />
    </div>
  );
}
