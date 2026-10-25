# EvenKeel — roadmap

## Vision

A private, friction-free place to record every expense and understand the *true*
shape of your spending — by smoothing lumpy periodic charges into an honest
monthly figure — then turning the money you uncover into savings goals.

Guiding principles: **local-first & private**, **normalization is the headline
feature**, **fast flexible entry**, **insight over data-entry busywork**.

---

## Phase 0 — Foundation ✅ (done)

- [x] Project scaffold: Vite + React 18 + TypeScript + Tailwind v4.
- [x] Domain model / shared type contract (`src/types`).
- [x] Local-first persistence with Dexie (IndexedDB) + typed repository API.
- [x] **Normalization engine** (pure, unit-tested): recurrence math, amortization,
      actual-vs-normalized monthly series, category breakdowns.
- [x] Insight engine: subscription audit, unnecessary-spend & saving detection,
      anomalies, needs-vs-wants.
- [x] Design system (Button, Card, Modal, Stat, Field, Switch, …), app shell,
      theming (light/dark/system), toasts, theme-aware charts.
- [x] Realistic seeded sample data; first-run experience.
- [x] Test suite for the engine (`npm test`) — 17 tests, green.

## Phase 1 — Core product ✅ (done)

- [x] **Dashboard** — actual vs normalized KPIs, 12-month trend, category donut,
      insights preview, recent activity, goals.
- [x] **Expenses** — quick-add + full modal, flexible fields, per-expense
      amortization, search/filter/sort, month grouping, bulk delete, CSV import.
- [x] **Recurring & Normalized** — manage periodic charges, smoothed-monthly KPIs,
      the actual-vs-smoothed visual, upcoming-charges timeline.
- [x] **Insights** — opportunities ($/mo & $/yr), subscription audit, anomaly
      alerts, needs-vs-wants, trends over 3/6/12 months, category drill-down.
- [x] **Savings Plans** — goals with progress & projected finish, fund-from-
      opportunity flow.
- [x] **Settings** — currency/locale/theme/budget, category manager, JSON
      backup/restore, CSV export, sample/clear/reset data.
- [x] Route-level code-splitting; tree-shaken icons; clean production build.

---

## Phase 2 — Make daily use effortless

- [x] **Per-category budgets surfaced** — a dedicated **Budgets** page comparing
      each category's *normalized* monthly spend against its target, with progress
      rings, over/under status, suggestions, and inline budget editing; plus a
      budget-breach insight on the dashboard. ✅
- [x] **Bank CSV import presets** — header aliases for common bank/credit-card
      exports, lenient date parsing (ISO, M/D/Y, D/M/Y, D.M.Y), and signed-amount /
      debit-credit handling, with an auto-detect option. ✅
- [x] **Smart bank import** — a private learning categorizer (merchant→category
      learned from your history), duplicate detection on re-import, a
      review-before-commit table, and an optional copy-paste AI prompt for first-pass
      categorization. ✅
- [ ] **In-app AI categorization** (opt-in; bring-your-own-key or a local model) to
      auto-label unknown merchants without leaving the app.
- [x] **Keyboard-first quick entry** — a command palette (⌘K) for navigation and
      quick actions, plus an "N" shortcut to add an expense. ✅
- [x] **PWA / installable + offline** — web manifest, an offline service worker
      (app shell + runtime asset cache), and an in-app Install button. ✅
- [ ] **Recurring auto-logging** — optionally materialize a recurring charge into a
      real expense row on its date (with de-dup), so the ledger matches the bank.

## Phase 3 — Smarter insight

- [x] **Forecasting** — a **Forecast** page projecting the next 6–12 months: known
      recurring charges projected exactly, everyday spend estimated from the recent
      average, with spike months flagged, a list of big charges ahead, and a
      suggested monthly buffer to absorb them. ✅
- [x] **"What-if" savings simulator** — a sandbox to cancel subscriptions and trim
      categories with live monthly/annual savings and goal-timeline impact; optional
      one-click "apply" to pause the chosen charges. ✅
- [x] **Tag analytics** — a "Spending by tag" breakdown (last 12 months) on the
      Insights page. ✅
- [x] **Smart recurring detection** — the Recurring page surfaces likely recurring
      charges from repeated, steady look-alike transactions, with one-click "Add". ✅
- [ ] **Multi-currency** — store an FX rate table; convert foreign expenses into the
      base currency for reporting.
- [ ] **Tag budgets** — set and track budgets per tag (builds on tag analytics).

## Phase 4 — Trust & reach

- [x] **Printable monthly report** — a standalone, print-optimized `/report` page
      (Print / Save as PDF), reachable from the command palette. ✅
- [x] **Receipt attachments** — attach receipt images/PDFs to an expense, stored
      locally in IndexedDB and included in backups. ✅
- [x] **Backup reminders** — a gentle nudge to export when it's been 30+ days (or
      never), on real (non-sample) data. ✅
- [ ] **Auto-export to a chosen folder** (File System Access API).
- [ ] **Local encryption / passcode lock** for the on-device data.
- [ ] **Optional end-to-end-encrypted sync** (opt-in) across devices.
- [ ] **Accessibility & i18n pass**; PDF export styling polish.

---

## Out of scope (intentionally not building)

- **Income / net-worth / cashflow tracking.** EvenKeel is a *spending* tracker —
  recording and normalizing what you spend, and turning waste into savings. Income,
  paychecks, and "left to spend against income" are deliberately not part of the
  product, now or later.

## Known simplifications (by design, for now)

- Recurring charges are **virtual** for analytics (computed, not stored as ledger
  rows) to keep actual/normalized math unambiguous and double-count-free. Defining
  a charge as recurring *and* also entering it as a transaction would double-count
  — Phase 2 "auto-logging" addresses this properly.
- All amounts are treated in the single base currency (no FX conversion yet).
