/** Currency + number formatting helpers. */

const fmtCache = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string, locale: string, opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${currency}|${JSON.stringify(opts)}`;
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, { style: "currency", currency, ...opts });
    fmtCache.set(key, f);
  }
  return f;
}

export function formatCurrency(
  amount: number,
  currency = "USD",
  locale = "en-US",
  opts: { maximumFractionDigits?: number; minimumFractionDigits?: number } = {},
): string {
  const value = Number.isFinite(amount) ? amount : 0;
  try {
    return getFormatter(currency, locale, {
      maximumFractionDigits: opts.maximumFractionDigits ?? 2,
      minimumFractionDigits: opts.minimumFractionDigits ?? 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

/** Whole-number currency (no cents) — handy for chart axes and big KPIs. */
export function formatCurrencyWhole(amount: number, currency = "USD", locale = "en-US"): string {
  return formatCurrency(amount, currency, locale, { maximumFractionDigits: 0, minimumFractionDigits: 0 });
}

/** Compact currency: $1.2k, $3.4M — good for axis ticks. */
export function formatCompactCurrency(amount: number, currency = "USD", locale = "en-US"): string {
  const value = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return `${currency} ${Math.round(value)}`;
  }
}

export function formatPercent(fraction: number, locale = "en-US", digits = 0): string {
  const value = Number.isFinite(fraction) ? fraction : 0;
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

/** Parse loose user input like "1,234.50", "$1 234,5", "(50)" into a number. */
export function parseAmount(input: string): number | null {
  if (input == null) return null;
  let s = String(input).trim();
  if (!s) return null;
  const negative = /^\(.*\)$/.test(s) || s.startsWith("-");
  s = s.replace(/[()]/g, "").replace(/[^0-9.,-]/g, "");
  if (!s) return null;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  // Whichever separator appears last is treated as the decimal point.
  if (lastComma > lastDot) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  s = s.replace(/-/g, "");
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n)) return null;
  const result = Math.abs(n);
  return negative ? -result : result;
}

/** A small curated currency list for the settings picker. */
export const COMMON_CURRENCIES: ReadonlyArray<{ code: string; label: string }> = [
  { code: "USD", label: "US Dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British Pound" },
  { code: "TRY", label: "Turkish Lira" },
  { code: "CAD", label: "Canadian Dollar" },
  { code: "AUD", label: "Australian Dollar" },
  { code: "CHF", label: "Swiss Franc" },
  { code: "JPY", label: "Japanese Yen" },
  { code: "INR", label: "Indian Rupee" },
  { code: "SEK", label: "Swedish Krona" },
  { code: "NOK", label: "Norwegian Krone" },
  { code: "DKK", label: "Danish Krone" },
  { code: "PLN", label: "Polish Zloty" },
  { code: "AED", label: "UAE Dirham" },
  { code: "SGD", label: "Singapore Dollar" },
];
