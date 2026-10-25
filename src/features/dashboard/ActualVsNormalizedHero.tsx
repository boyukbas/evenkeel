import type { MonthKey } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { useMoney } from "@/hooks/useMoney";
import { usePointForMonth } from "@/hooks/useAnalytics";
import { lumpiness } from "@/lib/analytics";
import { formatMonthLong } from "@/lib/date";

/** Side-by-side actual vs normalized for the focused month, with a plain-English read. */
export function ActualVsNormalizedHero({ month }: { month: MonthKey }) {
  const money = useMoney();
  const point = usePointForMonth(month);

  const actual = point.actual;
  const normalized = point.normalized;
  const lump = lumpiness(point);
  const lumpy = actual > normalized;
  const quiet = actual < normalized;

  // Bar widths relative to the larger of the two so the visual stays proportional.
  const max = Math.max(actual, normalized, 1);
  const actualPct = (actual / max) * 100;
  const normalizedPct = (normalized / max) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actual vs normalized</CardTitle>
        <CardDescription>{formatMonthLong(month)} — cash out vs your smoothed baseline.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Figure label="Actual (cash out)" value={money.format(actual)} tone="muted" />
          <Figure label="Normalized (baseline)" value={money.format(normalized)} tone="primary" />
        </div>

        <div className="space-y-3">
          <Bar label="Actual" pct={actualPct} className="bg-muted-foreground/60" />
          <Bar label="Normalized" pct={normalizedPct} className="bg-primary" />
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          {lumpy && (
            <>
              This month carried <span className="font-semibold text-foreground">{money.format(Math.abs(lump))}</span> of
              lumpy periodic/one-off charges — your true monthly baseline is{" "}
              <span className="font-semibold text-foreground">{money.format(normalized)}</span>.
            </>
          )}
          {quiet && (
            <>
              A quiet month — you're "pre-paying" for periodic charges that hit other months. Your true baseline is{" "}
              <span className="font-semibold text-foreground">{money.format(normalized)}</span>.
            </>
          )}
          {!lumpy && !quiet && (
            <>
              Cash out matched your baseline exactly this month — no lumpy charges to smooth.
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone: "muted" | "primary" }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={
          tone === "primary"
            ? "mt-1 text-2xl font-semibold tracking-tight text-primary"
            : "mt-1 text-2xl font-semibold tracking-tight"
        }
      >
        {value}
      </p>
    </div>
  );
}

function Bar({ label, pct, className }: { label: string; pct: number; className: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${className}`}
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>
    </div>
  );
}
