# EvenKeel

**See your *real* monthly spending.** EvenKeel is a private, local-first expense
tracker that smooths lumpy periodic payments into a true monthly picture — so a
single big charge (a yearly life-insurance premium, a bi-yearly bill, a one-off
splurge) no longer distorts the month — and then points you at concrete savings.

> All your data stays in your browser (IndexedDB). Nothing is uploaded. No
> account, no server, no tracking.

---

## The big idea: normalization

Most trackers just add up what left your account this month. That makes the month
your insurance renews look terrible and every other month look great — neither is
the truth.

EvenKeel shows **two numbers side by side**:

- **Actual** — the real cash that left your account this month (lumpy).
- **Normalized** — the same spending with periodic charges *spread evenly* across
  the months they cover (smooth).

A $1,320 yearly family life-insurance premium becomes **$110/month** in the
normalized view. A $300 quarterly bill becomes **$100/month**. A $1,800 holiday
you mentally amortize over a year becomes **$150/month**. Your normalized line is
your true budget baseline; the gap between actual and normalized tells you exactly
how lumpy a given month was — and why.

## What you can do

- **Dashboard** — this month's actual vs. normalized at a glance, budget progress,
  a 12-month trend, category breakdown, top insights, recent activity, and goals.
- **Expenses** — flexible entry (quick-add bar *or* a full modal), powerful
  search/filter/sort, month grouping with subtotals, bulk actions, CSV import, and
  per-expense amortization ("spread this one-off over N months").
- **Recurring & Normalized** — define repeating/periodic charges once and *watch*
  a spiky yearly charge become a flat monthly line; see your smoothed monthly
  commitment, next charges, and an upcoming-charges timeline.
- **Budgets** — set monthly targets per category (and overall) tracked against your
  *normalized* spend, with progress rings, over/under status, and budget
  suggestions from your recent average.
- **Insights** — unnecessary-spending detection, a subscription audit (annualized),
  saving opportunities with $/month and $/year, needs-vs-wants split, anomaly
  alerts, spending trends over 3/6/12 months, and a spend-by-tag breakdown.
- **Forecast** — projects the next 6–12 months: known recurring charges projected
  exactly, everyday spend estimated from your recent average, lumpy renewal months
  flagged, and a suggested monthly buffer to absorb them.
- **What-if Simulator** — a sandbox to cancel subscriptions and trim categories and
  watch monthly/annual savings and your goal timelines update live, with an optional
  one-click apply.
- **Savings Plans** — set goals, track progress and projected finish dates, and
  seed a goal directly from a detected saving opportunity.
- **Settings** — currency, locale, theme (light/dark/system), monthly budget,
  full category management, and data tools (JSON backup/restore, CSV export,
  sample data, start fresh).
- **Throughout** — a ⌘K command palette (plus "N" to quick-add an expense), **smart
  bank/CSV import** (auto-categorizes from your history, detects duplicates,
  review-before-commit, with an optional AI prompt — see
  [docs/AI_IMPORT.md](docs/AI_IMPORT.md)), receipt attachments on any expense, a
  printable monthly report, install-as-an-app with offline support, and backup reminders.

## Getting started

Requires **Node 18+** (built and tested on Node 24).

```bash
cd evenkeel
npm install
npm run dev
```

Then open the printed URL (default http://localhost:5173). On first run EvenKeel
loads a realistic **sample dataset** so the insights have something to chew on —
clear it any time from **Settings → Start fresh**.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server (hot reload) |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Type-check only |
| `npm test` | Run the analytics engine test suite |

## Your data & backups

Everything lives in your browser's IndexedDB. Because it's tied to that browser
profile, **export a backup periodically**: Settings → *Export backup (.json)*. You
can restore it on any machine via *Import backup*, and export your expenses as CSV
for use elsewhere.

## Tech

React 18 · TypeScript · Vite · Tailwind CSS v4 · Dexie (IndexedDB) ·
`dexie-react-hooks` · Recharts · Zustand · date-fns · Vitest.

## Project structure

```
src/
  types/            Domain model (the shared contract)
  db/               Dexie schema, repository API, seed data
  lib/              Pure engine: recurrence, analytics (normalization), insights,
                    currency, date, csv  (+ engine.test.ts)
  hooks/            Reactive data + analytics hooks, money formatting
  store/            Zustand stores (selected period, toasts, theme)
  components/
    ui/             Design system (Button, Card, Modal, Stat, …)
    layout/         App shell (sidebar, top bar, page header)
    charts/         Theme-aware chart helpers
    theme/          Theme provider
  features/         One folder per page (dashboard, expenses, recurring,
                    insights, savings, settings)
```

The normalization math lives in `src/lib/` as pure, unit-tested functions
(`npm test`), so every page computes identical numbers.

---

Built to keep your budget on an even keel. ⛵
