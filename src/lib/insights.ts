/**
 * Insight generation: subscription audit, "unnecessary spending" detection,
 * savings opportunities, and headline insight cards. Pure functions over the
 * same inputs the analytics engine uses.
 */
import type {
  Category,
  Expense,
  ID,
  Insight,
  MonthKey,
  MonthlyPoint,
  RecurringExpense,
  SavingOpportunity,
  SubscriptionInfo,
} from "@/types";
import { annualCost, monthlyAmortized } from "@/lib/recurrence";
import { buildMonthlySeries, categoryTotals, pctChange, summarize } from "@/lib/analytics";

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function indexCategories(categories: Category[]): Map<ID, Category> {
  return new Map(categories.map((c) => [c.id, c]));
}

function isEssential(catId: ID, byId: Map<ID, Category>): boolean {
  return byId.get(catId)?.essential ?? false;
}

/** Active recurring charges, annualized, sorted by yearly cost. */
export function subscriptionsFrom(recurring: RecurringExpense[], categories: Category[]): SubscriptionInfo[] {
  const byId = indexCategories(categories);
  return recurring
    .filter((r) => r.active)
    .map((r) => ({
      recurring: r,
      monthlyEquivalent: round2(monthlyAmortized(r)),
      annualCost: round2(annualCost(r)),
      essential: isEssential(r.categoryId, byId),
    }))
    .sort((a, b) => b.annualCost - a.annualCost);
}

export interface OpportunityInput {
  expenses: Expense[];
  recurring: RecurringExpense[];
  categories: Category[];
  /** The trailing months to base discretionary averages on. */
  months: MonthKey[];
  /** Fraction to suggest trimming discretionary categories by. Default 0.25. */
  discretionaryTrim?: number;
}

/**
 * Surface concrete ways to free up money:
 *  - every non-essential subscription (suggest cancelling → full saving)
 *  - non-essential spending categories running hot (suggest a trim)
 */
export function savingOpportunities(input: OpportunityInput): SavingOpportunity[] {
  const { expenses, recurring, categories, months } = input;
  const trim = input.discretionaryTrim ?? 0.25;
  const byId = indexCategories(categories);
  const opportunities: SavingOpportunity[] = [];

  // 1) Non-essential subscriptions → suggest cancelling.
  for (const r of recurring) {
    if (!r.active) continue;
    if (isEssential(r.categoryId, byId)) continue;
    const monthly = round2(monthlyAmortized(r));
    if (monthly <= 0) continue;
    opportunities.push({
      id: `sub:${r.id}`,
      label: r.name,
      recurringId: r.id,
      categoryId: r.categoryId,
      currentMonthly: monthly,
      suggestedMonthly: 0,
      monthlySaving: monthly,
      annualSaving: round2(monthly * 12),
      rationale: "Recurring non-essential charge — cancelling frees this up every month.",
    });
  }

  // 2) Non-essential one-off categories running hot → suggest trimming.
  const series = buildMonthlySeries({ expenses, recurring: [], months });
  const monthCount = Math.max(1, months.length);
  const totals = categoryTotals(series, "normalized");
  for (const { categoryId, amount } of totals) {
    if (isEssential(categoryId, byId)) continue;
    const monthlyAvg = round2(amount / monthCount);
    if (monthlyAvg < 5) continue; // ignore rounding dust
    const saving = round2(monthlyAvg * trim);
    if (saving < 1) continue;
    const cat = byId.get(categoryId);
    opportunities.push({
      id: `cat:${categoryId}`,
      label: cat?.name ?? "Uncategorized",
      categoryId,
      currentMonthly: monthlyAvg,
      suggestedMonthly: round2(monthlyAvg - saving),
      monthlySaving: saving,
      annualSaving: round2(saving * 12),
      rationale: `Discretionary spending — trimming ${Math.round(trim * 100)}% is usually painless.`,
    });
  }

  return opportunities.sort((a, b) => b.monthlySaving - a.monthlySaving);
}

export function totalPotentialSaving(opportunities: SavingOpportunity[]): { monthly: number; annual: number } {
  const monthly = round2(opportunities.reduce((s, o) => s + o.monthlySaving, 0));
  return { monthly, annual: round2(monthly * 12) };
}

export interface InsightInput {
  expenses: Expense[];
  recurring: RecurringExpense[];
  categories: Category[];
  /** Trailing window, oldest → newest; the last entry is "this month". */
  months: MonthKey[];
  monthlyBudget?: number | null;
  currency?: string;
  locale?: string;
}

/**
 * Headline insight cards for the dashboard. Ordered by importance: budget
 * breaches and spikes first, then opportunities, then reassurance.
 */
export function buildInsights(input: InsightInput): Insight[] {
  const { expenses, recurring, categories, months } = input;
  const insights: Insight[] = [];
  if (months.length === 0) return insights;

  const byId = indexCategories(categories);
  const series = buildMonthlySeries({ expenses, recurring, months });
  const summary = summarize(series);
  const current = series[series.length - 1];
  const prior = series.slice(0, -1);
  const priorAvgNorm = prior.length
    ? prior.reduce((s, p) => s + p.normalized, 0) / prior.length
    : current.normalized;

  // Budget breach (normalized, overall).
  if (input.monthlyBudget && input.monthlyBudget > 0 && current.normalized > input.monthlyBudget) {
    insights.push({
      id: "budget-over",
      severity: "warning",
      title: "Over your normalized budget",
      detail: `This month's smoothed spend is above your ${fmtPlain(input.monthlyBudget)} budget.`,
      monthlySaving: round2(current.normalized - input.monthlyBudget),
    });
  }

  // Per-category budget breaches (normalized), worst overage first.
  const breaches: { cat: Category; amount: number; budget: number; over: number }[] = [];
  for (const c of current.normalizedByCategory) {
    const cat = byId.get(c.categoryId);
    const budget = cat?.monthlyBudget ?? 0;
    if (cat && budget > 0 && c.amount > budget) {
      breaches.push({ cat, amount: c.amount, budget, over: c.amount - budget });
    }
  }
  breaches.sort((a, b) => b.over - a.over);
  for (const b of breaches.slice(0, 2)) {
    insights.push({
      id: `cat-budget:${b.cat.id}`,
      severity: "warning",
      title: `${b.cat.name} is over budget`,
      detail: `${fmtPlain(b.amount)} spent against a ${fmtPlain(b.budget)} budget this month.`,
      monthlySaving: round2(b.over),
      categoryId: b.cat.id,
    });
  }

  // Spike vs trailing normalized average.
  if (prior.length >= 2 && current.normalized > priorAvgNorm * 1.2) {
    insights.push({
      id: "spend-spike",
      severity: "warning",
      title: "Spending is trending up",
      detail: `Your smoothed spend is ${pctLabel(pctChange(priorAvgNorm, current.normalized))} above your recent average.`,
    });
  }

  // Lumpy month explanation (actual >> normalized this month).
  if (current.actual > current.normalized * 1.25 && current.actual - current.normalized > 50) {
    insights.push({
      id: "lumpy-month",
      severity: "info",
      title: "A big one-off hit this month",
      detail: `You paid ${fmtPlain(current.actual - current.normalized)} more than your typical month — but normalized, your budget is on track.`,
    });
  }

  // Category anomaly: a category much higher than its trailing average.
  const anomaly = topCategoryAnomaly(series, byId);
  if (anomaly) insights.push(anomaly);

  // Top savings opportunity.
  const opportunities = savingOpportunities({ expenses, recurring, categories, months });
  if (opportunities.length) {
    const top = opportunities[0];
    insights.push({
      id: "top-opportunity",
      severity: "opportunity",
      title: `Save ${fmtPlain(top.monthlySaving)}/mo on ${top.label}`,
      detail: top.rationale,
      monthlySaving: top.monthlySaving,
      categoryId: top.categoryId,
      recurringId: top.recurringId,
    });
    const totals = totalPotentialSaving(opportunities);
    if (opportunities.length > 1 && totals.monthly > top.monthlySaving) {
      insights.push({
        id: "total-opportunity",
        severity: "opportunity",
        title: `Up to ${fmtPlain(totals.annual)}/yr in potential savings`,
        detail: `Across ${opportunities.length} non-essential areas you could free up about ${fmtPlain(totals.monthly)} a month.`,
        monthlySaving: totals.monthly,
      });
    }
  }

  // Reassurance when things are calm.
  if (insights.length === 0 && summary.monthCount > 0) {
    insights.push({
      id: "steady",
      severity: "info",
      title: "You're on an even keel",
      detail: `Your normalized spending is steady at about ${fmtPlain(summary.avgNormalized)} a month.`,
    });
  }

  return insights;

  function fmtPlain(n: number): string {
    // Lightweight formatting; pages re-render with full currency formatting.
    return `${input.currency ?? "$"}${Math.round(n).toLocaleString(input.locale ?? "en-US")}`;
  }
}

function pctLabel(fraction: number): string {
  const pct = Math.round(Math.abs(fraction) * 100);
  return `${pct}%`;
}

/** The category whose latest-month spend most exceeds its trailing average. */
export function topCategoryAnomaly(series: MonthlyPoint[], byId: Map<ID, Category>): Insight | null {
  if (series.length < 3) return null;
  const current = series[series.length - 1];
  const prior = series.slice(0, -1);

  let best: { categoryId: ID; delta: number; current: number; avg: number } | null = null;
  for (const cat of current.normalizedByCategory) {
    const history = prior.map(
      (p) => p.normalizedByCategory.find((c) => c.categoryId === cat.categoryId)?.amount ?? 0,
    );
    const avg = history.reduce((s, x) => s + x, 0) / history.length;
    if (avg < 20) continue;
    const delta = cat.amount - avg;
    if (cat.amount > avg * 1.5 && (!best || delta > best.delta)) {
      best = { categoryId: cat.categoryId, delta, current: cat.amount, avg };
    }
  }
  if (!best) return null;
  const name = byId.get(best.categoryId)?.name ?? "A category";
  return {
    id: `anomaly:${best.categoryId}`,
    severity: "warning",
    title: `${name} spending jumped`,
    detail: `${name} is well above its recent average this month — worth a look.`,
    categoryId: best.categoryId,
  };
}

export interface MoMResult {
  actualDelta: number;
  normalizedDelta: number;
  actualPct: number;
  normalizedPct: number;
}

/** Latest month vs the one before it. */
export function monthOverMonth(series: MonthlyPoint[]): MoMResult | null {
  if (series.length < 2) return null;
  const a = series[series.length - 2];
  const b = series[series.length - 1];
  return {
    actualDelta: round2(b.actual - a.actual),
    normalizedDelta: round2(b.normalized - a.normalized),
    actualPct: pctChange(a.actual, b.actual),
    normalizedPct: pctChange(a.normalized, b.normalized),
  };
}
