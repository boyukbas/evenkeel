# EvenKeel — build contract for feature pages

EvenKeel is a **private, local-first expense tracker**. Its signature idea is
**normalization**: lumpy periodic charges (a yearly insurance premium, a
bi-yearly bill, a one-off you mentally spread over time) are smoothed into an
even monthly figure so a single big payment doesn't distort the month. Every
page shows two views where relevant: **Actual** (real cash that month) and
**Normalized** (smoothed).

Stack: React 18 + TypeScript + Vite + Tailwind v4 + Dexie (IndexedDB) +
Recharts + Zustand. Data is reactive via `dexie-react-hooks` — reads update
automatically after writes.

## Hard rules for every feature agent

1. **Only create/edit files inside your assigned `src/features/<name>/` folder.**
   Your page entry file already exists (e.g. `DashboardPage.tsx`) — replace it
   wholesale and add as many sibling components/hooks in that folder as you like.
2. **Never edit shared files** (`src/types`, `src/db`, `src/lib`,
   `src/components/ui`, `src/components/layout`, `src/components/charts`,
   `src/hooks`, `src/store`, `src/App.tsx`, configs, `package.json`). Read them
   to learn the API; don't change them. Don't import from another feature folder.
3. **Dependencies are already installed.** Never run `npm install`.
4. Use the existing **UI kit and hooks** below — don't reinvent buttons, cards,
   modals, currency formatting, or the analytics math. Match the existing visual
   style (semantic Tailwind tokens like `bg-card`, `text-muted-foreground`,
   `border-border`, `text-primary`).
5. Use `@/...` import paths (alias for `src/`).
6. Money is a positive `number` in the user's base currency. Format **only** via
   `useMoney()` — never hardcode `$`.
7. Handle empty data gracefully (hooks return `[]` before data loads and when
   genuinely empty) with the `EmptyState` component.
8. Make it responsive (mobile → desktop) and good-looking. Dark and light themes
   both must look right — use semantic tokens, not raw colors (except category
   colors, which are hex on the category).
9. When done, run `npm run typecheck` from the project root and fix every error
   **that references a file in your own feature folder**. Ignore errors in other
   `src/features/*` folders (other agents are mid-flight). Also run
   `npm run build` is NOT your job — the integrator does the final build.

## Domain types — `@/types`

```ts
Category { id, name, color /*hex*/, icon? /*lucide name*/, parentId?, essential: boolean,
           monthlyBudget?: number|null, archived?, sortOrder?, createdAt, updatedAt }
Expense  { id, date /*'YYYY-MM-DD'*/, amount: number, currency, categoryId, description,
           payee?, method?: PaymentMethod, tags: string[], notes?,
           amortizeMonths?: number|null /*spread normalized impact over N months*/,
           recurringId?: string|null, excludeFromInsights?: boolean, createdAt, updatedAt }
RecurringExpense { id, name, amount /*per occurrence*/, currency, categoryId,
           frequency: Frequency, interval: number, customMonths?, anchorDate /*'YYYY-MM-DD'*/,
           endDate?: string|null, amortize: boolean /*smooth in normalized view*/, active: boolean,
           payee?, method?, tags: string[], notes?, createdAt, updatedAt }
SavingsGoal { id, name, targetAmount, currentAmount, deadline?: string|null,
           monthlyContribution?: number|null, linkedCategoryIds: string[], note?, color?,
           status: 'active'|'paused'|'achieved', createdAt, updatedAt }
Settings { id:'singleton', baseCurrency, locale, theme:'light'|'dark'|'system',
           monthlyBudget?: number|null, hasSeededDemo?, onboardedAt?, createdAt, updatedAt }

Frequency = 'weekly'|'biweekly'|'monthly'|'quarterly'|'semiannual'|'annual'|'custom'
PaymentMethod = 'cash'|'card'|'debit'|'transfer'|'directdebit'|'other'
MonthKey = 'YYYY-MM'

// Derived (computed, never stored):
MonthlyPoint { month, actual, normalized, actualByCategory: {categoryId,amount}[], normalizedByCategory: {...}[] }
SubscriptionInfo { recurring, monthlyEquivalent, annualCost, essential }
Insight { id, severity:'info'|'opportunity'|'warning', title, detail, monthlySaving?, categoryId?, recurringId? }
SavingOpportunity { id, label, categoryId?, recurringId?, currentMonthly, suggestedMonthly, monthlySaving, annualSaving, rationale }
```

## Data writes — `@/db/repo`  (all async; a `draft` is the type minus `id|createdAt|updatedAt`)

```ts
addExpense(draft): Promise<string>;  bulkAddExpenses(drafts): Promise<void>;
updateExpense(id, patch): Promise<void>;  deleteExpense(id); deleteExpenses(ids);
addRecurring(draft); updateRecurring(id, patch); deleteRecurring(id);
addCategory(draft); updateCategory(id, patch); deleteCategory(id, reassignToId);
addGoal(draft); updateGoal(id, patch); deleteGoal(id);
getSettings(): Promise<Settings>; updateSettings(patch): Promise<void>;
resetAll(); clearTransactions(); reseedDemo();
exportData(): Promise<BackupFile>; importData(BackupFile); isBackupFile(x): boolean;
```
Also `@/db/database`: `newId()`, `now()`, `DEFAULT_CATEGORIES`, `buildDefaultCategories()`.

## Reactive reads — `@/hooks/useData`

```ts
useSettings(): Settings           // always returns a value (defaults before load)
useCategories(): Category[]       // sorted by sortOrder
useCategoryMap(): Map<id, Category>
useExpenses(): Expense[]
useRecurring(): RecurringExpense[]
useGoals(): SavingsGoal[]
```

## Money — `@/hooks/useMoney`

```ts
const money = useMoney();   // { currency, locale, format, formatWhole, formatCompact }
money.format(1234.5)        // "$1,234.50"
money.formatWhole(1234.5)   // "$1,235"
money.formatCompact(12345)  // "$12.3K"
```

## Analytics hooks — `@/hooks/useAnalytics` (preferred way to get computed data)

```ts
useLastNMonths(n): MonthKey[]                 // memoized trailing months ending this month
useMonthlySeries(months): MonthlyPoint[]
usePointForMonth(month): MonthlyPoint
useSeriesSummary(months): { totalActual, totalNormalized, avgActual, avgNormalized, peakActual, peakActualMonth, monthCount }
useSubscriptions(): SubscriptionInfo[]        // sorted by annual cost desc
useSavingOpportunities(months): { opportunities: SavingOpportunity[], totals: {monthly, annual} }
useInsights(months): Insight[]
```

## Pure engine (if you need it directly)

- `@/lib/recurrence`: `monthlyAmortized(rec)`, `annualCost(rec)`, `occurrencesPerYear(rec)`,
  `occurrencesBetween(rec, startISO, endISO): {recurringId,date,amount}[]`, `describeFrequency(rec)`, `FREQUENCY_LABELS`.
- `@/lib/analytics`: `buildMonthlySeries({expenses,recurring,months})`, `lumpiness(point)`,
  `categoryTotals(series, 'actual'|'normalized')`, `summarize(series)`, `pctChange(from,to)`.
- `@/lib/insights`: `monthOverMonth(series)`, `subscriptionsFrom`, `savingOpportunities`, `buildInsights`.
- `@/lib/date`: `todayISO()`, `currentMonthKey()`, `toMonthKey(d)`, `formatMonthLong(m)`,
  `formatMonthShort(m)`, `formatDateMedium(iso)`, `addMonthsToKey(m,Δ)`, `monthRange(a,b)`,
  `lastNMonths(n)`, `monthKeyToDate(m)`, `startOfMonthISO(m)`, `endOfMonthISO(m)`, `isValidISODate(s)`.
- `@/lib/currency`: `parseAmount(str): number|null` (parses loose input), `COMMON_CURRENCIES`, `formatPercent`.
- `@/lib/csv`: `parseCsv(text): string[][]`, `toCsv(rows)`, `downloadFile(name, content, mime?)`.

## UI kit — `@/components/ui` (barrel export)

`Button` (props: `variant: 'primary'|'secondary'|'outline'|'ghost'|'danger'|'success'`, `size:'sm'|'md'|'lg'|'icon'|'icon-sm'`, `loading`),
`Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter`,
`Input, Textarea, Select` (Select wraps a native `<select>` — pass `<option>`s as children),
`Label`, `Field` (props: `label, hint, error, htmlFor`; wraps a control),
`Badge` (`variant:'default'|'primary'|'success'|'warning'|'danger'|'outline'`), `Dot` (`color`),
`Switch` (`checked, onChange(boolean)`), `Progress` (`value` 0..1, `color?`),
`Spinner, Skeleton`,
`Modal` (`open, onClose, title?, description?, footer?, size?:'sm'|'md'|'lg'|'xl'`, children = body),
`ConfirmDialog` (`open, onClose, onConfirm, title, message?, confirmLabel?, danger?`),
`SegmentedControl` (`value, onChange, options: {value,label}[]`, `size?`),
`EmptyState` (`icon?: LucideIcon, title, description?, action?`),
`Stat` (`label, value, sub?, icon?, trend?: number|null /*signed fraction*/, invertTrend?: boolean /*default true: up=bad/red*/`),
`CategoryIcon` (`category: {icon,color,name}, size?:'sm'|'md'|'lg'`), `DynamicIcon` (`name`),
`getLucideIcon(name)`, `CATEGORY_ICON_CHOICES: string[]`, `MonthSwitcher`.

## Layout — `@/components/layout`

`PageHeader` (`title, description?, actions?`) — start each page with this. The app
shell (sidebar, top bar, sample-data banner) is already mounted; you only render
the page body. The top bar's "Add expense" button navigates to `/expenses?new=1`.

## Charts — `@/components/charts/chart-kit` + `recharts`

```ts
const colors = useThemeColors();  // { chart: string[], primary, mutedForeground, border, foreground, card, success, danger, warning }
chartColorAt(colors.chart, i)     // cycle palette
<Tooltip content={<ChartTooltip labelFormatter={(m)=>formatMonthLong(String(m))} />} />
```
Wrap charts in `<ResponsiveContainer width="100%" height={H}>`. Use category `color`
for category-keyed series; use `colors.primary` for "normalized" and a chart palette
color (or `colors.mutedForeground`) for "actual". Style axes/grid with
`colors.border` / `colors.mutedForeground`, small font.

## Toasts & shared period

```ts
import { toast } from '@/store/toast';      toast.success('Saved'); toast.error('...'); 
import { usePeriod } from '@/store/period';  const { month, setMonth, next, prev, reset } = usePeriod();  // shared selected month
```

## Conventions

- New expense draft must include: `date, amount, currency: settings.baseCurrency,
  categoryId, description, tags: []` (plus optional fields). Default `date` to `todayISO()`.
- Use `parseAmount(inputString)` for amount text fields.
- Date `<Input type="date">` yields `'YYYY-MM-DD'` already (a valid ISODate).
- Tags: let users type comma-separated; split/trim into `string[]`.
- Confirm destructive actions with `ConfirmDialog`.
- Toast after every create/update/delete.
