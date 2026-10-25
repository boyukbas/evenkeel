/**
 * Private, on-device categorization + de-duplication helpers for bank imports.
 *
 * No AI, nothing leaves the browser: we learn a merchant→category map from the
 * expenses you've already categorized and reuse it for new rows, and we
 * fingerprint rows so re-importing an overlapping statement doesn't double-count.
 */
import type { Expense, ID } from "@/types";

const NOISE = new Set([
  "pos", "purchase", "payment", "card", "visa", "mastercard", "amex", "debit",
  "credit", "ach", "pmt", "ref", "txn", "trx", "dep", "withdrawal", "the",
  // common payment-processor prefixes (SQ *…, TST *…, PayPal …)
  "sq", "tst", "pp", "ppd", "ccd",
]);

/** Reduce a raw bank description to a stable merchant key (drops digits/noise). */
export function normalizeMerchant(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[*#@]/g, " ")
    .replace(/\b\d[\d.,/:-]*\b/g, " ") // numbers, dates, amounts, times
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !NOISE.has(w))
    .join(" ")
    .trim();
}

/** Learn the most common category per merchant key from existing expenses. */
export function buildMerchantIndex(expenses: Expense[]): Map<string, ID> {
  const tallies = new Map<string, Map<ID, number>>();
  for (const e of expenses) {
    if (!e.categoryId) continue;
    const key = normalizeMerchant(e.payee || e.description || "");
    if (!key) continue;
    let counts = tallies.get(key);
    if (!counts) {
      counts = new Map();
      tallies.set(key, counts);
    }
    counts.set(e.categoryId, (counts.get(e.categoryId) ?? 0) + 1);
  }
  const index = new Map<string, ID>();
  for (const [key, counts] of tallies) {
    let best: ID = "";
    let bestN = 0;
    for (const [cat, n] of counts) {
      if (n > bestN) {
        bestN = n;
        best = cat;
      }
    }
    if (best) index.set(key, best);
  }
  return index;
}

/** Suggest a category for free text using the learned index (exact, then contains). */
export function suggestCategoryId(text: string, index: Map<string, ID>): ID | null {
  const key = normalizeMerchant(text);
  if (!key) return null;
  const exact = index.get(key);
  if (exact) return exact;
  for (const [idxKey, cat] of index) {
    if (idxKey.length >= 4 && (key.includes(idxKey) || idxKey.includes(key))) return cat;
  }
  return null;
}

export interface Fingerprintable {
  date: string;
  amount: number;
  description?: string;
  payee?: string;
}

/** A content fingerprint used to detect the same transaction across imports. */
export function fingerprint(row: Fingerprintable): string {
  return `${row.date}|${row.amount.toFixed(2)}|${normalizeMerchant(row.payee || row.description || "")}`;
}

export function fingerprintSet(expenses: Expense[]): Set<string> {
  return new Set(expenses.map(fingerprint));
}

/** Split drafts into rows not seen before vs duplicates (vs existing + within batch). */
export function dedupeDrafts<T extends Fingerprintable>(
  drafts: T[],
  existing: Set<string>,
): { unique: T[]; duplicates: number } {
  const seen = new Set(existing);
  const unique: T[] = [];
  let duplicates = 0;
  for (const d of drafts) {
    const fp = fingerprint(d);
    if (seen.has(fp)) {
      duplicates++;
      continue;
    }
    seen.add(fp);
    unique.push(d);
  }
  return { unique, duplicates };
}
