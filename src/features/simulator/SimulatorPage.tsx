/**
 * What-if simulator — a non-destructive sandbox. Cancel subscriptions and trim
 * discretionary categories, and watch your monthly/annual spend and your goal
 * timelines update live. Nothing is saved unless you explicitly apply it.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, PiggyBank, RotateCcw, SlidersHorizontal, Sparkles } from "lucide-react";
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
  ConfirmDialog,
  EmptyState,
  Progress,
  SegmentedControl,
  Stat,
  Switch,
} from "@/components/ui";
import { useCategoryMap, useExpenses, useGoals } from "@/hooks/useData";
import { useMoney } from "@/hooks/useMoney";
import { useLastNMonths, useSeriesSummary, useSubscriptions } from "@/hooks/useAnalytics";
import { buildMonthlySeries, categoryTotals } from "@/lib/analytics";
import { updateRecurring } from "@/db/repo";
import { toast } from "@/store/toast";
import { accelerateGoal, roundMoney } from "./helpers";

const TRIM_OPTIONS = [
  { value: "0", label: "Keep" },
  { value: "0.1", label: "−10%" },
  { value: "0.25", label: "−25%" },
  { value: "0.5", label: "−50%" },
];

export function SimulatorPage() {
  const months = useLastNMonths(6);
  const expenses = useExpenses();
  const byId = useCategoryMap();
  const goals = useGoals();
  const money = useMoney();
  const navigate = useNavigate();

  const subs = useSubscriptions();
  const summary = useSeriesSummary(months);
  const currentMonthly = summary.avgNormalized;

  const [canceled, setCanceled] = useState<Set<string>>(new Set());
  const [trims, setTrims] = useState<Record<string, number>>({});
  const [applyOpen, setApplyOpen] = useState(false);

  // One-off discretionary category averages (exclude recurring to avoid double-counting subs).
  const trimTargets = useMemo(() => {
    const oneOff = buildMonthlySeries({ expenses, recurring: [], months });
    const totals = categoryTotals(oneOff, "normalized");
    const n = Math.max(1, months.length);
    return totals
      .map((t) => ({ category: byId.get(t.categoryId), monthly: t.amount / n }))
      .filter((t): t is { category: NonNullable<typeof t.category>; monthly: number } => !!t.category && !t.category.essential && t.monthly >= 1)
      .sort((a, b) => b.monthly - a.monthly);
  }, [expenses, months, byId]);

  const orderedSubs = useMemo(
    () => [...subs].sort((a, b) => Number(a.essential) - Number(b.essential) || b.annualCost - a.annualCost),
    [subs],
  );

  const subsSaving = orderedSubs.filter((s) => canceled.has(s.recurring.id)).reduce((sum, s) => sum + s.monthlyEquivalent, 0);
  const trimSaving = trimTargets.reduce((sum, t) => sum + t.monthly * (trims[t.category.id] ?? 0), 0);
  const savedMonthly = roundMoney(subsSaving + trimSaving);
  const newMonthly = Math.max(0, roundMoney(currentMonthly - savedMonthly));
  const annualSaving = roundMoney(savedMonthly * 12);

  const topGoal = useMemo(() => {
    const active = goals.filter((g) => g.status === "active");
    return active.find((g) => (g.monthlyContribution ?? 0) > 0) ?? active[0] ?? null;
  }, [goals]);
  const accel = topGoal ? accelerateGoal(topGoal, savedMonthly) : null;

  const toggleCancel = (id: string) =>
    setCanceled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const reset = () => {
    setCanceled(new Set());
    setTrims({});
  };

  const applyCancellations = async () => {
    const ids = [...canceled];
    try {
      await Promise.all(ids.map((id) => updateRecurring(id, { active: false })));
      toast.success(`Paused ${ids.length} ${ids.length === 1 ? "charge" : "charges"}`, "You can reactivate them on the Recurring page.");
      setCanceled(new Set());
    } catch {
      toast.error("Couldn't apply changes", "Please try again.");
    }
  };

  const hasLevers = orderedSubs.length > 0 || trimTargets.length > 0;
  const hasChanges = savedMonthly > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="What-if Simulator"
        description="Model cancelling subscriptions and trimming spending — see the impact instantly. Nothing changes until you apply it."
        actions={
          hasChanges ? (
            <Button variant="ghost" onClick={reset}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          ) : undefined
        }
      />

      {!hasLevers ? (
        <EmptyState
          icon={SlidersHorizontal}
          title="Nothing to simulate yet"
          description="Add some recurring subscriptions and a few months of discretionary spending, then come back to model cuts and see what you'd save."
        />
      ) : (
        <>
          {/* Live summary */}
          <Card>
            <CardContent className="grid gap-5 p-5 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <div>
                <p className="text-sm text-muted-foreground">Current monthly (normalized)</p>
                <p className="text-2xl font-semibold tracking-tight">{money.format(currentMonthly)}</p>
                <Progress value={1} className="mt-2" indicatorClassName="bg-muted-foreground/40" />
              </div>
              <ArrowRight className="mx-auto hidden h-5 w-5 text-muted-foreground md:block" />
              <div>
                <p className="text-sm text-muted-foreground">After your changes</p>
                <p className="text-2xl font-semibold tracking-tight text-primary">{money.format(newMonthly)}</p>
                <Progress value={currentMonthly > 0 ? newMonthly / currentMonthly : 0} className="mt-2" />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Monthly saving" value={money.format(savedMonthly)} />
            <Stat label="Annual saving" value={money.format(annualSaving)} />
            <Stat
              label="Goal impact"
              value={accel && accel.monthsSaved > 0 ? `${accel.monthsSaved} mo sooner` : "—"}
              sub={accel && accel.monthsSaved > 0 ? topGoal?.name : "redirect savings to a goal"}
              invertTrend={false}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Subscriptions */}
            <Card>
              <CardHeader>
                <CardTitle>Cancel subscriptions</CardTitle>
                <CardDescription>Toggle a recurring charge to model dropping it.</CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                {orderedSubs.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No recurring charges.</p>
                ) : (
                  orderedSubs.map((s) => {
                    const cat = byId.get(s.recurring.categoryId);
                    const isCanceled = canceled.has(s.recurring.id);
                    return (
                      <div key={s.recurring.id} className="flex items-center gap-3 py-3">
                        {cat && <CategoryIcon category={cat} />}
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm font-medium ${isCanceled ? "text-muted-foreground line-through" : ""}`}>
                            {s.recurring.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {money.format(s.monthlyEquivalent)}/mo
                            {!s.essential && <Badge variant="outline" className="ml-2">want</Badge>}
                          </p>
                        </div>
                        {isCanceled && <span className="text-xs font-medium text-success">−{money.format(s.monthlyEquivalent)}</span>}
                        <Switch checked={isCanceled} onChange={() => toggleCancel(s.recurring.id)} aria-label={`Cancel ${s.recurring.name}`} />
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Trim categories */}
            <Card>
              <CardHeader>
                <CardTitle>Trim discretionary spending</CardTitle>
                <CardDescription>Cut a non-essential category by a percentage of its recent average.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {trimTargets.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No discretionary categories to trim.</p>
                ) : (
                  trimTargets.map((t) => {
                    const pct = trims[t.category.id] ?? 0;
                    const saving = t.monthly * pct;
                    return (
                      <div key={t.category.id} className="flex flex-wrap items-center gap-3">
                        <CategoryIcon category={t.category} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{t.category.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {money.format(t.monthly)}/mo
                            {saving > 0 && <span className="ml-2 font-medium text-success">save {money.format(saving)}</span>}
                          </p>
                        </div>
                        <SegmentedControl
                          size="sm"
                          value={String(pct)}
                          onChange={(v) => setTrims((prev) => ({ ...prev, [t.category.id]: Number(v) }))}
                          options={TRIM_OPTIONS}
                        />
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* Outcome / actions */}
          <Card>
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p className="text-sm text-foreground">
                  {hasChanges ? (
                    <>
                      You'd free up <span className="font-semibold">{money.format(savedMonthly)}/mo</span> ({money.format(annualSaving)}/yr).
                      {accel && accel.monthsSaved > 0 && (
                        <> Redirected to <span className="font-medium">{topGoal?.name}</span>, that's {accel.monthsSaved} month{accel.monthsSaved === 1 ? "" : "s"} sooner.</>
                      )}
                    </>
                  ) : (
                    <>Toggle a subscription or trim a category to see what you could save.</>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button variant="outline" disabled={canceled.size === 0} onClick={() => setApplyOpen(true)}>
                  Apply cancellations
                </Button>
                <Button disabled={!hasChanges} onClick={() => navigate("/savings")}>
                  <PiggyBank className="h-4 w-4" />
                  Plan in Savings
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <ConfirmDialog
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        onConfirm={applyCancellations}
        title={`Pause ${canceled.size} recurring ${canceled.size === 1 ? "charge" : "charges"}?`}
        message="They'll be marked inactive (and drop out of your spending). You can reactivate them any time on the Recurring page."
        confirmLabel="Apply"
      />
    </div>
  );
}
