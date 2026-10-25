/**
 * EvenKeel domain model — the single source of truth shared by the database,
 * the analytics engine, and every feature page.
 *
 * Money is stored as a plain number in the entity's `currency`. Dates that
 * represent a calendar day use `ISODate` ("YYYY-MM-DD"); timestamps use full
 * ISO strings. A "month key" is "YYYY-MM".
 */

export type ID = string;
export type ISODate = string; // "2026-05-01"
export type ISODateTime = string; // "2026-05-01T12:00:00.000Z"
export type MonthKey = string; // "2026-05"

/** How often a recurring expense is charged. */
export type Frequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "semiannual"
  | "annual"
  | "custom";

export type PaymentMethod =
  | "cash"
  | "card"
  | "debit"
  | "transfer"
  | "directdebit"
  | "other";

export interface Category {
  id: ID;
  name: string;
  /** Hex color used in charts and badges. */
  color: string;
  /** Optional lucide-react icon name (e.g. "ShoppingCart"). */
  icon?: string;
  parentId?: ID | null;
  /**
   * Essential = a need (rent, groceries, insurance). Non-essential categories
   * feed the "unnecessary spending" and savings-opportunity insights.
   */
  essential: boolean;
  /** Optional per-category monthly budget, compared against the normalized spend. */
  monthlyBudget?: number | null;
  archived?: boolean;
  sortOrder?: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Expense {
  id: ID;
  /** The day the money was spent. */
  date: ISODate;
  /** Positive magnitude of the spend, in `currency`. */
  amount: number;
  currency: string;
  categoryId: ID;
  description: string;
  payee?: string;
  method?: PaymentMethod;
  tags: string[];
  notes?: string;
  /**
   * Spread this one-off's *normalized* impact across N months starting from its
   * own month (e.g. a $3,000 sofa amortized over 36 months). The actual cash-out
   * still lands fully in the spend month. Null/undefined = counts fully, once.
   */
  amortizeMonths?: number | null;
  /** Link back to the RecurringExpense that logged this, if any. */
  recurringId?: ID | null;
  /** When true, the row is ignored by insights/normalization (kept for records). */
  excludeFromInsights?: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface RecurringExpense {
  id: ID;
  name: string;
  /** Amount charged *per occurrence* (e.g. 1200 once a year). */
  amount: number;
  currency: string;
  categoryId: ID;
  frequency: Frequency;
  /** Multiplier for the frequency (every `interval` periods). Usually 1. */
  interval: number;
  /** For `frequency: "custom"`, the period length in months. */
  customMonths?: number;
  /** First billing date / billing anchor. */
  anchorDate: ISODate;
  endDate?: ISODate | null;
  /**
   * The flagship feature: when true the normalized view spreads this expense
   * evenly across every month it is active, so a single big charge no longer
   * distorts that month. The actual view still shows the real charge dates.
   */
  amortize: boolean;
  active: boolean;
  payee?: string;
  method?: PaymentMethod;
  tags: string[];
  notes?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface SavingsGoal {
  id: ID;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: ISODate | null;
  /** Planned monthly contribution toward the target. */
  monthlyContribution?: number | null;
  /** Categories whose cuts are earmarked to fund this goal. */
  linkedCategoryIds: ID[];
  note?: string;
  color?: string;
  status: "active" | "paused" | "achieved";
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** A receipt or document attached to an expense, stored as a base64 data URL. */
export interface Attachment {
  id: ID;
  expenseId: ID;
  name: string;
  type: string;
  dataUrl: string;
  size: number;
  createdAt: ISODateTime;
}

export type ThemePref = "light" | "dark" | "system";

export interface Settings {
  /** Always "singleton". */
  id: ID;
  baseCurrency: string;
  locale: string;
  theme: ThemePref;
  /** Overall monthly budget target, compared against normalized total spend. */
  monthlyBudget?: number | null;
  hasSeededDemo?: boolean;
  onboardedAt?: ISODateTime | null;
  /** When the user last exported a backup; drives the backup reminder. */
  lastBackupAt?: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/* ----------------------------- Derived shapes ----------------------------- */
/* Computed by the analytics engine; never persisted. */

export interface CategoryAmount {
  categoryId: ID;
  amount: number;
}

/** Both views for a single calendar month. */
export interface MonthlyPoint {
  month: MonthKey;
  /** Real cash that left your account that month. */
  actual: number;
  /** Smoothed monthly figure (lumpy periodic charges spread out). */
  normalized: number;
  actualByCategory: CategoryAmount[];
  normalizedByCategory: CategoryAmount[];
}

/** A single concrete (or projected) charge from a recurring definition. */
export interface RecurrenceOccurrence {
  recurringId: ID;
  date: ISODate;
  amount: number;
}

export interface SubscriptionInfo {
  recurring: RecurringExpense;
  monthlyEquivalent: number;
  annualCost: number;
  essential: boolean;
}

export type InsightSeverity = "info" | "opportunity" | "warning";

export interface Insight {
  id: string;
  severity: InsightSeverity;
  title: string;
  detail: string;
  /** Estimated monthly money this insight could free up, if any. */
  monthlySaving?: number;
  categoryId?: ID;
  recurringId?: ID;
}

export interface SavingOpportunity {
  id: string;
  label: string;
  categoryId?: ID;
  recurringId?: ID;
  /** Current normalized monthly spend on this item. */
  currentMonthly: number;
  /** Suggested monthly spend after trimming. */
  suggestedMonthly: number;
  /** currentMonthly - suggestedMonthly. */
  monthlySaving: number;
  annualSaving: number;
  rationale: string;
}
