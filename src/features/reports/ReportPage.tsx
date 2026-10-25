/**
 * EvenKeel monthly report — a standalone, print-optimized page rendered outside
 * the app shell (see App.tsx `/report`). It owns its full layout, looks native
 * in both themes on screen, and prints cleanly to white paper via window.print().
 *
 * The on-screen controls (month picker, print, back) are wrapped in `print:hidden`
 * so the printed sheet is just the document body.
 */
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { Brand } from "@/components/layout/Brand";
import { Button } from "@/components/ui";
import { usePeriod } from "@/store/period";
import { useMoney } from "@/hooks/useMoney";
import { useCategories, useCategoryMap } from "@/hooks/useData";
import {
  useInsights,
  useLastNMonths,
  usePointForMonth,
  useSavingOpportunities,
  useSubscriptions,
} from "@/hooks/useAnalytics";
import { addMonthsToKey, formatMonthLong } from "@/lib/date";
import {
  BudgetsSection,
  CategorySection,
  InsightsSection,
  Section,
  SubscriptionsSection,
  SummarySection,
} from "./sections";

export function ReportPage() {
  const { month, setMonth } = usePeriod();
  const money = useMoney();

  const categories = useCategories();
  const byId = useCategoryMap();

  const current = usePointForMonth(month);
  const previous = usePointForMonth(addMonthsToKey(month, -1));

  const trailing = useLastNMonths(6);
  const subscriptions = useSubscriptions();
  const insights = useInsights(trailing);
  const { opportunities } = useSavingOpportunities(trailing);

  const hasBudgets = categories.some((c) => (c.monthlyBudget ?? 0) > 0);
  const hasSpend = current && (current.actual > 0 || current.normalized > 0);
  const generatedOn = new Date().toLocaleDateString();

  return (
    // Force a light, paper-like appearance for print; native semantic tokens on screen.
    <div className="min-h-screen bg-background text-foreground print:bg-white print:text-black">
      {/* On-screen toolbar — hidden when printing. */}
      <div className="print:hidden sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to EvenKeel
          </Link>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setMonth(addMonthsToKey(month, -1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[7.5rem] text-center text-sm font-medium tabular-nums">
              {formatMonthLong(month)}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setMonth(addMonthsToKey(month, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="primary" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" />
            Print / Save as PDF
          </Button>
        </div>
      </div>

      {/* Printable document body. Padding doubles as @page margin on paper. */}
      <article className="mx-auto max-w-3xl px-6 py-8 print:px-0 print:py-0">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5 print:border-black/40">
          <div>
            <Brand />
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">Monthly Report</h1>
            <p className="mt-1 text-lg text-muted-foreground print:text-black/70">
              {formatMonthLong(month)}
            </p>
          </div>
          <p className="text-xs text-muted-foreground print:text-black/60">Generated {generatedOn}</p>
        </header>

        {!hasSpend ? (
          <Section title="Summary">
            <p className="text-sm text-muted-foreground print:text-black/70">
              No spending recorded for {formatMonthLong(month)}.
            </p>
          </Section>
        ) : (
          <>
            <SummarySection current={current} previous={previous} money={money} />
            <CategorySection point={current} byId={byId} money={money} />
            <SubscriptionsSection subscriptions={subscriptions} money={money} />
            {hasBudgets && (
              <BudgetsSection point={current} categories={categories} money={money} />
            )}
            <InsightsSection insights={insights} opportunities={opportunities} money={money} />
          </>
        )}

        <footer className="mt-10 border-t border-border pt-4 text-center text-xs text-muted-foreground print:border-black/40 print:text-black/60">
          Generated by EvenKeel — your data stays on your device.
        </footer>
      </article>
    </div>
  );
}
