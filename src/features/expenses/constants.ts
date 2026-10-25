import type { PaymentMethod } from "@/types";

/** Friendly labels for each payment method, in display order. */
export const PAYMENT_METHODS: ReadonlyArray<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "debit", label: "Debit card" },
  { value: "transfer", label: "Bank transfer" },
  { value: "directdebit", label: "Direct debit" },
  { value: "other", label: "Other" },
];

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  debit: "Debit card",
  transfer: "Bank transfer",
  directdebit: "Direct debit",
  other: "Other",
};

export function methodLabel(method?: PaymentMethod | null): string {
  return method ? METHOD_LABELS[method] : "";
}

export type SortKey = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

export const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: "date-desc", label: "Date ↓ (newest)" },
  { value: "date-asc", label: "Date ↑ (oldest)" },
  { value: "amount-desc", label: "Amount ↓ (highest)" },
  { value: "amount-asc", label: "Amount ↑ (lowest)" },
];

/** Parse a comma-separated tag string into a clean, de-duplicated string[]. */
export function parseTags(input: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(",")) {
    const tag = raw.trim();
    if (tag && !seen.has(tag.toLowerCase())) {
      seen.add(tag.toLowerCase());
      out.push(tag);
    }
  }
  return out;
}

/** How many rows to show before the "Show more" cutoff kicks in. */
export const LIST_PAGE_SIZE = 60;
/** Above this many filtered rows we paginate to keep the page snappy. */
export const LIST_VIRTUALIZE_THRESHOLD = 100;
