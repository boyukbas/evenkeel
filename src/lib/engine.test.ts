import { describe, expect, it } from "vitest";
import type { Category, Expense, RecurringExpense } from "@/types";
import {
  annualCost,
  describeFrequency,
  monthlyAmortized,
  occurrencesBetween,
  occurrencesPerYear,
} from "@/lib/recurrence";
import {
  buildMonthlySeries,
  categoryTotals,
  lumpiness,
  pctChange,
  summarize,
} from "@/lib/analytics";
import { monthRange } from "@/lib/date";
import { buildInsights, savingOpportunities, subscriptionsFrom, totalPotentialSaving } from "@/lib/insights";
import { buildForecast, discretionaryBaseline, summarizeForecast, upcomingLumpyCharges } from "@/lib/forecast";
import { detectRecurring, inferFrequency } from "@/lib/recurringDetection";

const NOW = "2026-01-01T00:00:00.000Z";

function rec(over: Partial<RecurringExpense>): RecurringExpense {
  return {
    id: over.id ?? "r1",
    name: over.name ?? "Charge",
    amount: over.amount ?? 100,
    currency: "USD",
    categoryId: over.categoryId ?? "cat",
    frequency: over.frequency ?? "monthly",
    interval: over.interval ?? 1,
    customMonths: over.customMonths,
    anchorDate: over.anchorDate ?? "2026-01-15",
    endDate: over.endDate ?? null,
    amortize: over.amortize ?? false,
    active: over.active ?? true,
    payee: over.payee,
    method: over.method,
    tags: over.tags ?? [],
    notes: over.notes,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function exp(over: Partial<Expense>): Expense {
  return {
    id: over.id ?? "e1",
    date: over.date ?? "2026-01-10",
    amount: over.amount ?? 50,
    currency: "USD",
    categoryId: over.categoryId ?? "cat",
    description: over.description ?? "thing",
    tags: over.tags ?? [],
    amortizeMonths: over.amortizeMonths ?? null,
    recurringId: over.recurringId ?? null,
    excludeFromInsights: over.excludeFromInsights,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function cat(id: string, essential: boolean): Category {
  return {
    id,
    name: id,
    color: "#000",
    essential,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

describe("occurrencesPerYear", () => {
  it("maps standard frequencies", () => {
    expect(occurrencesPerYear({ frequency: "annual", interval: 1 })).toBe(1);
    expect(occurrencesPerYear({ frequency: "monthly", interval: 1 })).toBe(12);
    expect(occurrencesPerYear({ frequency: "quarterly", interval: 1 })).toBe(4);
    expect(occurrencesPerYear({ frequency: "semiannual", interval: 1 })).toBe(2);
    expect(occurrencesPerYear({ frequency: "weekly", interval: 1 })).toBe(52);
    expect(occurrencesPerYear({ frequency: "biweekly", interval: 1 })).toBe(26);
  });

  it("respects interval and custom periods", () => {
    expect(occurrencesPerYear({ frequency: "monthly", interval: 2 })).toBe(6);
    expect(occurrencesPerYear({ frequency: "custom", interval: 1, customMonths: 6 })).toBe(2);
    expect(occurrencesPerYear({ frequency: "custom", interval: 1, customMonths: 3 })).toBe(4);
  });
});

describe("monthlyAmortized / annualCost", () => {
  it("spreads a yearly charge into an even monthly cost", () => {
    expect(monthlyAmortized(rec({ amount: 1200, frequency: "annual" }))).toBe(100);
    expect(annualCost(rec({ amount: 1200, frequency: "annual" }))).toBe(1200);
  });

  it("treats a quarterly $300 charge as $100/mo", () => {
    expect(monthlyAmortized(rec({ amount: 300, frequency: "quarterly" }))).toBe(100);
    expect(annualCost(rec({ amount: 300, frequency: "quarterly" }))).toBe(1200);
  });

  it("leaves a monthly charge unchanged", () => {
    expect(monthlyAmortized(rec({ amount: 50, frequency: "monthly" }))).toBe(50);
  });
});

describe("occurrencesBetween", () => {
  it("returns the single annual hit inside a one-year window", () => {
    const occ = occurrencesBetween(
      rec({ amount: 1200, frequency: "annual", anchorDate: "2026-03-15" }),
      "2026-01-01",
      "2026-12-31",
    );
    expect(occ).toHaveLength(1);
    expect(occ[0].date).toBe("2026-03-15");
  });

  it("walks monthly occurrences and respects the end date", () => {
    const occ = occurrencesBetween(
      rec({ frequency: "monthly", anchorDate: "2026-01-10", endDate: "2026-02-28" }),
      "2026-01-01",
      "2026-12-31",
    );
    expect(occ.map((o) => o.date)).toEqual(["2026-01-10", "2026-02-10"]);
  });
});

describe("buildMonthlySeries — the normalization engine", () => {
  const months = monthRange("2026-01", "2026-12");

  it("smooths a yearly amortized charge to a flat normalized line", () => {
    const series = buildMonthlySeries({
      expenses: [],
      recurring: [rec({ amount: 1200, frequency: "annual", anchorDate: "2026-01-15", amortize: true })],
      months,
    });
    // Normalized is flat at 100 every month...
    expect(series.every((p) => p.normalized === 100)).toBe(true);
    // ...while actual lands entirely in January.
    expect(series[0].actual).toBe(1200);
    expect(series.slice(1).every((p) => p.actual === 0)).toBe(true);

    const sum = summarize(series);
    expect(sum.totalActual).toBe(1200);
    expect(sum.totalNormalized).toBe(1200);
    expect(sum.peakActualMonth).toBe("2026-01");
  });

  it("does not smooth when amortize is off", () => {
    const series = buildMonthlySeries({
      expenses: [],
      recurring: [rec({ amount: 1200, frequency: "annual", anchorDate: "2026-01-15", amortize: false })],
      months,
    });
    expect(series[0].actual).toBe(1200);
    expect(series[0].normalized).toBe(1200);
    expect(series[1].normalized).toBe(0);
  });

  it("amortizes a one-off expense across N months", () => {
    const series = buildMonthlySeries({
      expenses: [exp({ amount: 300, date: "2026-02-10", amortizeMonths: 3 })],
      recurring: [],
      months,
    });
    const feb = series.find((p) => p.month === "2026-02")!;
    const mar = series.find((p) => p.month === "2026-03")!;
    const apr = series.find((p) => p.month === "2026-04")!;
    const may = series.find((p) => p.month === "2026-05")!;
    expect(feb.actual).toBe(300);
    expect(feb.normalized).toBe(100);
    expect(mar.normalized).toBe(100);
    expect(apr.normalized).toBe(100);
    expect(may.normalized).toBe(0);
  });

  it("ignores rows flagged out of insights", () => {
    const series = buildMonthlySeries({
      expenses: [exp({ amount: 999, date: "2026-01-05", excludeFromInsights: true })],
      recurring: [],
      months,
    });
    expect(series[0].actual).toBe(0);
  });

  it("aggregates category totals and lumpiness", () => {
    const series = buildMonthlySeries({
      expenses: [exp({ amount: 200, date: "2026-01-05", categoryId: "food" })],
      recurring: [rec({ amount: 1200, frequency: "annual", anchorDate: "2026-01-15", amortize: true, categoryId: "ins" })],
      months,
    });
    const jan = series[0];
    expect(lumpiness(jan)).toBe(1100); // 1400 actual - 300 normalized
    const totals = categoryTotals(series, "normalized");
    const ins = totals.find((t) => t.categoryId === "ins")!;
    expect(ins.amount).toBe(1200);
  });
});

describe("pctChange", () => {
  it("handles zero base", () => {
    expect(pctChange(0, 0)).toBe(0);
    expect(pctChange(0, 10)).toBe(1);
    expect(pctChange(100, 120)).toBeCloseTo(0.2);
  });
});

describe("insights", () => {
  const categories = [cat("food", false), cat("rent", true), cat("stream", false)];

  it("flags non-essential subscriptions and skips essential ones", () => {
    const opps = savingOpportunities({
      expenses: [],
      recurring: [
        rec({ id: "s1", name: "Streaming", amount: 15, frequency: "monthly", categoryId: "stream" }),
        rec({ id: "s2", name: "Rent", amount: 1000, frequency: "monthly", categoryId: "rent" }),
      ],
      categories,
      months: monthRange("2026-01", "2026-03"),
    });
    const ids = opps.map((o) => o.id);
    expect(ids).toContain("sub:s1");
    expect(ids).not.toContain("sub:s2");
    const streaming = opps.find((o) => o.id === "sub:s1")!;
    expect(streaming.monthlySaving).toBe(15);
    expect(streaming.annualSaving).toBe(180);
  });

  it("totals potential savings", () => {
    const opps = savingOpportunities({
      expenses: [exp({ amount: 400, date: "2026-02-03", categoryId: "food" })],
      recurring: [rec({ id: "s1", name: "Streaming", amount: 20, frequency: "monthly", categoryId: "stream" })],
      categories,
      months: monthRange("2026-01", "2026-03"),
    });
    const totals = totalPotentialSaving(opps);
    expect(totals.monthly).toBeGreaterThan(0);
    expect(totals.annual).toBeCloseTo(totals.monthly * 12, 1);
  });

  it("sorts subscriptions by annual cost and marks essentialness", () => {
    const subs = subscriptionsFrom(
      [
        rec({ id: "s1", name: "Cheap", amount: 5, frequency: "monthly", categoryId: "stream" }),
        rec({ id: "s2", name: "Pricey", amount: 1200, frequency: "annual", categoryId: "rent" }),
      ],
      categories,
    );
    expect(subs[0].recurring.id).toBe("s2");
    expect(subs[0].essential).toBe(true);
    expect(subs[1].essential).toBe(false);
  });
});

describe("buildInsights — budgets", () => {
  it("flags a category over its monthly budget", () => {
    const food: Category = { ...cat("food", false), monthlyBudget: 100 };
    const insights = buildInsights({
      expenses: [exp({ amount: 250, date: "2026-02-05", categoryId: "food" })],
      recurring: [],
      categories: [food],
      months: monthRange("2026-01", "2026-02"),
    });
    const breach = insights.find((i) => i.id === "cat-budget:food");
    expect(breach).toBeTruthy();
    expect(breach?.monthlySaving).toBe(150);
  });

  it("does not flag a category within budget", () => {
    const food: Category = { ...cat("food", false), monthlyBudget: 500 };
    const insights = buildInsights({
      expenses: [exp({ amount: 250, date: "2026-02-05", categoryId: "food" })],
      recurring: [],
      categories: [food],
      months: monthRange("2026-01", "2026-02"),
    });
    expect(insights.some((i) => i.id === "cat-budget:food")).toBe(false);
  });
});

describe("forecast", () => {
  it("computes a discretionary baseline from trailing one-off spend", () => {
    const expenses = [
      exp({ id: "a", amount: 100, date: "2026-03-10" }),
      exp({ id: "b", amount: 200, date: "2026-05-12" }),
      exp({ id: "c", amount: 999, date: "2026-06-01" }), // current month — excluded
    ];
    expect(discretionaryBaseline(expenses, 3, "2026-06")).toBe(100); // (100 + 200) / 3
  });

  it("projects a flat line for a monthly charge", () => {
    const points = buildForecast({
      expenses: [],
      recurring: [rec({ amount: 1000, frequency: "monthly", anchorDate: "2026-01-01", amortize: false })],
      horizon: 3,
      startMonth: "2026-06",
    });
    expect(points.map((p) => p.month)).toEqual(["2026-07", "2026-08", "2026-09"]);
    expect(points.every((p) => p.projectedActual === 1000 && p.projectedNormalized === 1000 && !p.isSpike)).toBe(true);
  });

  it("flags the month a yearly charge renews as a spike", () => {
    const recAnnual = rec({ amount: 1200, frequency: "annual", anchorDate: "2025-10-15", amortize: true });
    const points = buildForecast({ expenses: [], recurring: [recAnnual], horizon: 6, startMonth: "2026-06" });
    const oct = points.find((p) => p.month === "2026-10")!;
    const sep = points.find((p) => p.month === "2026-09")!;
    expect(oct.recurringActual).toBe(1200);
    expect(oct.isSpike).toBe(true);
    expect(sep.projectedNormalized).toBe(100); // smoothed even before the charge lands
    expect(sep.isSpike).toBe(false);

    const summary = summarizeForecast(points);
    expect(summary.peakMonth).toBe("2026-10");
    expect(summary.spikeCount).toBe(1);

    const lumps = upcomingLumpyCharges({ expenses: [], recurring: [recAnnual], horizon: 6, startMonth: "2026-06" });
    expect(lumps).toHaveLength(1);
    expect(lumps[0].month).toBe("2026-10");
    expect(lumps[0].amount).toBe(1200);
  });
});

describe("recurring detection", () => {
  it("infers cadence from a median gap", () => {
    expect(inferFrequency(30)).toBe("monthly");
    expect(inferFrequency(7)).toBe("weekly");
    expect(inferFrequency(365)).toBe("annual");
    expect(inferFrequency(45)).toBeNull();
  });

  it("suggests a monthly recurring from repeated steady charges", () => {
    const expenses = [
      exp({ id: "1", description: "Gym", amount: 30, date: "2026-01-05", categoryId: "fit" }),
      exp({ id: "2", description: "Gym", amount: 30, date: "2026-02-05", categoryId: "fit" }),
      exp({ id: "3", description: "Gym", amount: 30, date: "2026-03-05", categoryId: "fit" }),
      exp({ id: "4", description: "Gym", amount: 30, date: "2026-04-05", categoryId: "fit" }),
    ];
    const suggestions = detectRecurring(expenses, []);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].frequency).toBe("monthly");
    expect(suggestions[0].amount).toBe(30);
    expect(suggestions[0].occurrences).toBe(4);
    expect(suggestions[0].name).toBe("Gym");
  });

  it("ignores charges that already have a matching active recurring", () => {
    const expenses = [
      exp({ id: "1", description: "Gym", amount: 30, date: "2026-01-05" }),
      exp({ id: "2", description: "Gym", amount: 30, date: "2026-02-05" }),
      exp({ id: "3", description: "Gym", amount: 30, date: "2026-03-05" }),
    ];
    expect(detectRecurring(expenses, [rec({ name: "Gym", active: true })])).toHaveLength(0);
  });

  it("does not suggest from one-off varied spending", () => {
    const expenses = [
      exp({ id: "1", description: "Shop A", amount: 10, date: "2026-01-05" }),
      exp({ id: "2", description: "Shop B", amount: 90, date: "2026-01-12" }),
      exp({ id: "3", description: "Shop C", amount: 50, date: "2026-02-20" }),
    ];
    expect(detectRecurring(expenses, [])).toHaveLength(0);
  });
});

describe("describeFrequency", () => {
  it("describes intervals", () => {
    expect(describeFrequency({ frequency: "annual", interval: 1 })).toBe("Yearly");
    expect(describeFrequency({ frequency: "monthly", interval: 3 })).toBe("Every 3 months");
    expect(describeFrequency({ frequency: "custom", interval: 1, customMonths: 4 })).toBe("Every 4 months");
  });
});
