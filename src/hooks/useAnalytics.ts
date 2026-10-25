/**
 * Analytics hooks: live expenses/recurring piped through the pure engine.
 * Features should read from these rather than calling the engine directly, so
 * the actual/normalized math stays identical everywhere.
 */
import { useMemo } from "react";
import type { Insight, MonthKey, MonthlyPoint, SavingOpportunity, SubscriptionInfo } from "@/types";
import { useCategories, useExpenses, useRecurring, useSettings } from "@/hooks/useData";
import { buildMonthlySeries, summarize, type SeriesSummary } from "@/lib/analytics";
import { buildInsights, savingOpportunities, subscriptionsFrom, totalPotentialSaving } from "@/lib/insights";
import {
  buildForecast,
  summarizeForecast,
  upcomingLumpyCharges,
  type ForecastPoint,
  type ForecastSummary,
  type UpcomingCharge,
} from "@/lib/forecast";
import { lastNMonths } from "@/lib/date";

/** A stable, memoized list of the last `n` month keys. */
export function useLastNMonths(n: number): MonthKey[] {
  return useMemo(() => lastNMonths(n), [n]);
}

export function useMonthlySeries(months: MonthKey[]): MonthlyPoint[] {
  const expenses = useExpenses();
  const recurring = useRecurring();
  const key = months.join("|");
  return useMemo(
    () => buildMonthlySeries({ expenses, recurring, months }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expenses, recurring, key],
  );
}

export function usePointForMonth(month: MonthKey): MonthlyPoint {
  return useMonthlySeries(useMemo(() => [month], [month]))[0];
}

export function useSeriesSummary(months: MonthKey[]): SeriesSummary {
  const series = useMonthlySeries(months);
  return useMemo(() => summarize(series), [series]);
}

export function useSubscriptions(): SubscriptionInfo[] {
  const recurring = useRecurring();
  const categories = useCategories();
  return useMemo(() => subscriptionsFrom(recurring, categories), [recurring, categories]);
}

export function useSavingOpportunities(months: MonthKey[]): {
  opportunities: SavingOpportunity[];
  totals: { monthly: number; annual: number };
} {
  const expenses = useExpenses();
  const recurring = useRecurring();
  const categories = useCategories();
  const key = months.join("|");
  return useMemo(() => {
    const opportunities = savingOpportunities({ expenses, recurring, categories, months });
    return { opportunities, totals: totalPotentialSaving(opportunities) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, recurring, categories, key]);
}

export function useInsights(months: MonthKey[]): Insight[] {
  const expenses = useExpenses();
  const recurring = useRecurring();
  const categories = useCategories();
  const settings = useSettings();
  const key = months.join("|");
  return useMemo(
    () =>
      buildInsights({
        expenses,
        recurring,
        categories,
        months,
        monthlyBudget: settings.monthlyBudget,
        currency: currencySymbol(settings.baseCurrency, settings.locale),
        locale: settings.locale,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expenses, recurring, categories, key, settings.monthlyBudget, settings.baseCurrency, settings.locale],
  );
}

export function useForecast(
  horizon: number,
  trailingWindow = 3,
): { points: ForecastPoint[]; summary: ForecastSummary; lumps: UpcomingCharge[] } {
  const expenses = useExpenses();
  const recurring = useRecurring();
  return useMemo(() => {
    const points = buildForecast({ expenses, recurring, horizon, trailingWindow });
    return {
      points,
      summary: summarizeForecast(points),
      lumps: upcomingLumpyCharges({ expenses, recurring, horizon, trailingWindow }),
    };
  }, [expenses, recurring, horizon, trailingWindow]);
}

function currencySymbol(currency: string, locale: string): string {
  try {
    const parts = new Intl.NumberFormat(locale, { style: "currency", currency }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? "$";
  } catch {
    return "$";
  }
}
