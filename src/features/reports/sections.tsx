/**
 * Presentational building blocks for the printable monthly report.
 * These are pure render helpers — all data is passed in by ReportPage so the
 * page owns every hook call and these stay easy to reason about for print.
 */
import type { ReactNode } from "react";
import type {
  Category,
  ID,
  Insight,
  MonthlyPoint,
  SavingOpportunity,
  SubscriptionInfo,
} from "@/types";
import { describeFrequency } from "@/lib/recurrence";

type Money = {
  format: (n: number) => string;
};

/** A titled report section with a print-friendly heading rule. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 break-inside-avoid first:mt-0">
      <h2 className="mb-3 border-b border-border pb-1.5 text-base font-semibold tracking-tight print:border-black/40">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Shared table shell: subtle borders on screen, hard borders in print. */
function Table({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>{head}</thead>
      <tbody>{children}</tbody>
    </table>
  );
}

const TH = "border-b border-border px-2 py-1.5 text-left font-medium text-muted-foreground print:border-black/40 print:text-black";
const TD = "border-b border-border px-2 py-1.5 align-top print:border-black/30";
const TD_NUM = `${TD} text-right tabular-nums`;
const TH_NUM = `${TH} text-right`;

function Swatch({ color }: { color: string }) {
  return (
    <span
      className="mr-2 inline-block h-2.5 w-2.5 shrink-0 rounded-sm align-middle print:border print:border-black/30"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}

/** A signed delta with red/green tone on screen, plain in print. */
function Delta({ value, money }: { value: number; money: Money }) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  const tone =
    value > 0 ? "text-danger" : value < 0 ? "text-success" : "text-muted-foreground";
  return (
    <span className={`tabular-nums ${tone} print:text-black`}>
      {sign}
      {money.format(Math.abs(value))}
    </span>
  );
}

/* --------------------------------- Summary -------------------------------- */

export function SummarySection({
  current,
  previous,
  money,
}: {
  current: MonthlyPoint;
  previous: MonthlyPoint | undefined;
  money: Money;
}) {
  const lump = round2(current.actual - current.normalized);
  const normDelta = previous ? round2(current.normalized - previous.normalized) : null;

  return (
    <Section title="Summary">
      <p className="mb-4 text-sm text-muted-foreground print:text-black/70">
        <strong className="font-medium text-foreground print:text-black">Normalized</strong>{" "}
        spending spreads lumpy periodic charges — a yearly premium, a quarterly bill — evenly across
        the months they cover, so one large payment doesn&apos;t distort a single month. Actual is
        the real cash that left your account.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric label="Actual this month" value={money.format(current.actual)} />
        <Metric label="Normalized this month" value={money.format(current.normalized)} accent />
        <Metric
          label="Lumpiness (actual − normalized)"
          value={
            <span className={lump >= 0 ? "" : "text-success print:text-black"}>
              {lump >= 0 ? money.format(lump) : `−${money.format(Math.abs(lump))}`}
            </span>
          }
        />
      </div>
      <p className="mt-4 text-sm">
        {normDelta === null ? (
          <span className="text-muted-foreground print:text-black/70">
            No prior month to compare against.
          </span>
        ) : (
          <>
            <span className="text-muted-foreground print:text-black/70">
              Versus the previous month, normalized spending{" "}
            </span>
            {normDelta === 0 ? (
              <span>was unchanged</span>
            ) : (
              <>
                {normDelta > 0 ? "rose by " : "fell by "}
                <Delta value={normDelta} money={money} />
              </>
            )}
            <span className="text-muted-foreground print:text-black/70">.</span>
          </>
        )}
      </p>
    </Section>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 print:border-black/30 print:bg-white">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground print:text-black/60">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-semibold tabular-nums ${
          accent ? "text-primary print:text-black" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/* ---------------------------- Spending by category ------------------------ */

export function CategorySection({
  point,
  byId,
  money,
}: {
  point: MonthlyPoint;
  byId: Map<ID, Category>;
  money: Money;
}) {
  const actualByCat = new Map(point.actualByCategory.map((c) => [c.categoryId, c.amount]));
  const rows = [...point.normalizedByCategory].sort((a, b) => b.amount - a.amount);
  const normTotal = rows.reduce((s, r) => s + r.amount, 0);

  if (rows.length === 0) {
    return (
      <Section title="Spending by category">
        <p className="text-sm text-muted-foreground print:text-black/70">
          No categorized spending for this month.
        </p>
      </Section>
    );
  }

  return (
    <Section title="Spending by category">
      <Table
        head={
          <tr>
            <th className={TH}>Category</th>
            <th className={TH_NUM}>Normalized</th>
            <th className={TH_NUM}>Actual</th>
            <th className={TH_NUM}>% of normalized</th>
          </tr>
        }
      >
        {rows.map((r) => {
          const cat = byId.get(r.categoryId);
          const actual = actualByCat.get(r.categoryId) ?? 0;
          const pct = normTotal > 0 ? (r.amount / normTotal) * 100 : 0;
          return (
            <tr key={r.categoryId} className="break-inside-avoid">
              <td className={TD}>
                <Swatch color={cat?.color ?? "#9ca3af"} />
                <span className="align-middle">{cat?.name ?? "Uncategorized"}</span>
              </td>
              <td className={TD_NUM}>{money.format(r.amount)}</td>
              <td className={TD_NUM}>{money.format(actual)}</td>
              <td className={TD_NUM}>{pct.toFixed(1)}%</td>
            </tr>
          );
        })}
        <tr className="font-medium">
          <td className={TD}>Total</td>
          <td className={TD_NUM}>{money.format(round2(normTotal))}</td>
          <td className={TD_NUM}>{money.format(point.actual)}</td>
          <td className={TD_NUM}>100%</td>
        </tr>
      </Table>
    </Section>
  );
}

/* ------------------------- Recurring & subscriptions ---------------------- */

export function SubscriptionsSection({
  subscriptions,
  money,
}: {
  subscriptions: SubscriptionInfo[];
  money: Money;
}) {
  if (subscriptions.length === 0) {
    return (
      <Section title="Recurring & subscriptions">
        <p className="text-sm text-muted-foreground print:text-black/70">
          No recurring charges on file.
        </p>
      </Section>
    );
  }

  const annualTotal = subscriptions.reduce((s, x) => s + x.annualCost, 0);

  return (
    <Section title="Recurring & subscriptions">
      <Table
        head={
          <tr>
            <th className={TH}>Name</th>
            <th className={TH}>Frequency</th>
            <th className={TH_NUM}>Monthly equiv.</th>
            <th className={TH_NUM}>Annual cost</th>
            <th className={TH}>Type</th>
          </tr>
        }
      >
        {subscriptions.map((s) => (
          <tr key={s.recurring.id} className="break-inside-avoid">
            <td className={TD}>{s.recurring.name}</td>
            <td className={`${TD} text-muted-foreground print:text-black/70`}>
              {describeFrequency(s.recurring)}
            </td>
            <td className={TD_NUM}>{money.format(s.monthlyEquivalent)}</td>
            <td className={TD_NUM}>{money.format(s.annualCost)}</td>
            <td className={TD}>{s.essential ? "Essential" : "Non-essential"}</td>
          </tr>
        ))}
        <tr className="font-medium">
          <td className={TD} colSpan={3}>
            Total annual
          </td>
          <td className={TD_NUM}>{money.format(round2(annualTotal))}</td>
          <td className={TD} />
        </tr>
      </Table>
    </Section>
  );
}

/* --------------------------------- Budgets -------------------------------- */

export function BudgetsSection({
  point,
  categories,
  money,
}: {
  point: MonthlyPoint;
  categories: Category[];
  money: Money;
}) {
  const normByCat = new Map(point.normalizedByCategory.map((c) => [c.categoryId, c.amount]));
  const budgeted = categories
    .filter((c) => (c.monthlyBudget ?? 0) > 0)
    .map((c) => {
      const spent = round2(normByCat.get(c.id) ?? 0);
      const budget = c.monthlyBudget as number;
      return { cat: c, budget, spent, delta: round2(spent - budget) };
    })
    .sort((a, b) => b.delta - a.delta);

  // The page only renders this section when at least one budget exists.
  return (
    <Section title="Budgets">
      <Table
        head={
          <tr>
            <th className={TH}>Category</th>
            <th className={TH_NUM}>Budget</th>
            <th className={TH_NUM}>Normalized spent</th>
            <th className={TH_NUM}>Over / under</th>
          </tr>
        }
      >
        {budgeted.map(({ cat, budget, spent, delta }) => (
          <tr key={cat.id} className="break-inside-avoid">
            <td className={TD}>
              <Swatch color={cat.color} />
              <span className="align-middle">{cat.name}</span>
            </td>
            <td className={TD_NUM}>{money.format(budget)}</td>
            <td className={TD_NUM}>{money.format(spent)}</td>
            <td className={TD_NUM}>
              {delta === 0 ? (
                <span className="text-muted-foreground print:text-black">on budget</span>
              ) : (
                <>
                  <Delta value={delta} money={money} />
                  <span className="ml-1 text-muted-foreground print:text-black/70">
                    {delta > 0 ? "over" : "under"}
                  </span>
                </>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </Section>
  );
}

/* --------------------------- Insights & opportunities --------------------- */

export function InsightsSection({
  insights,
  opportunities,
  money,
}: {
  insights: Insight[];
  opportunities: SavingOpportunity[];
  money: Money;
}) {
  const topOpps = opportunities.slice(0, 4);
  if (insights.length === 0 && topOpps.length === 0) {
    return (
      <Section title="Insights & opportunities">
        <p className="text-sm text-muted-foreground print:text-black/70">
          Nothing notable across the last six months — you&apos;re on an even keel.
        </p>
      </Section>
    );
  }

  return (
    <Section title="Insights & opportunities">
      {insights.length > 0 && (
        <ul className="space-y-2.5">
          {insights.map((i) => (
            <li
              key={i.id}
              className="break-inside-avoid rounded-lg border border-border bg-card p-3 print:border-black/30 print:bg-white"
            >
              <p className="text-sm font-medium">{i.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground print:text-black/70">{i.detail}</p>
            </li>
          ))}
        </ul>
      )}

      {topOpps.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground print:text-black/70">
            Top savings opportunities
          </h3>
          <Table
            head={
              <tr>
                <th className={TH}>Opportunity</th>
                <th className={TH_NUM}>Monthly saving</th>
                <th className={TH_NUM}>Annual saving</th>
              </tr>
            }
          >
            {topOpps.map((o) => (
              <tr key={o.id} className="break-inside-avoid">
                <td className={TD}>
                  <span className="font-medium">{o.label}</span>
                  <span className="block text-xs text-muted-foreground print:text-black/60">
                    {o.rationale}
                  </span>
                </td>
                <td className={TD_NUM}>{money.format(o.monthlySaving)}</td>
                <td className={TD_NUM}>{money.format(o.annualSaving)}</td>
              </tr>
            ))}
          </Table>
        </div>
      )}
    </Section>
  );
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
