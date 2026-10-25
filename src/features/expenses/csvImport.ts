/**
 * Flexible CSV import for expenses. Supports the EvenKeel template plus common
 * bank-export shapes via header aliases, lenient date parsing (ISO, M/D/Y, D/M/Y,
 * D.M.Y), and either a single signed amount column or separate debit/credit
 * columns. Pure functions — the modal just renders the result.
 */
import type { Category } from "@/types";
import { parseAmount } from "@/lib/currency";
import { parseCsv } from "@/lib/csv";
import { isValidISODate } from "@/lib/date";
import { parseTags } from "./constants";

export interface ImportDraft {
  date: string;
  amount: number;
  currency: string;
  categoryId: string;
  description: string;
  payee?: string;
  tags: string[];
  notes?: string;
}

export interface ParseResult {
  drafts: ImportDraft[];
  skipped: number;
}

type DateOrder = "ymd" | "mdy" | "dmy" | "auto";

export interface CsvPreset {
  id: string;
  label: string;
  description: string;
  aliases: {
    date: string[];
    amount?: string[];
    debit?: string[];
    credit?: string[];
    description: string[];
    payee?: string[];
    category?: string[];
    tags?: string[];
    notes?: string[];
  };
  /** Interpretation of a single signed amount column. */
  amountSign?: "negative-expense" | "positive-expense" | "absolute";
  dateOrder?: DateOrder;
}

export const CSV_PRESETS: CsvPreset[] = [
  {
    id: "evenkeel",
    label: "EvenKeel template",
    description: "date, amount, category, description, payee, tags, notes",
    aliases: {
      date: ["date"],
      amount: ["amount"],
      category: ["category"],
      description: ["description"],
      payee: ["payee"],
      tags: ["tags"],
      notes: ["notes"],
    },
    amountSign: "positive-expense",
    dateOrder: "ymd",
  },
  {
    id: "generic",
    label: "Bank — single Amount column",
    description: "Negative amounts are spending; positive (income) rows are skipped.",
    aliases: {
      date: ["date", "transaction date", "posting date", "trans date", "value date", "completed date"],
      amount: ["amount", "value", "transaction amount"],
      description: ["description", "memo", "narrative", "details", "reference", "name", "merchant"],
      payee: ["payee", "merchant", "name", "counterparty"],
      category: ["category"],
    },
    amountSign: "negative-expense",
    dateOrder: "auto",
  },
  {
    id: "debit-credit",
    label: "Bank — Debit / Credit columns",
    description: "Uses the Debit / Withdrawal column as the expense amount.",
    aliases: {
      date: ["date", "transaction date", "posting date", "value date"],
      debit: ["debit", "withdrawal", "withdrawals", "money out", "paid out", "out", "amount debit"],
      credit: ["credit", "deposit", "money in", "paid in", "in", "amount credit"],
      description: ["description", "memo", "narrative", "details", "reference", "name"],
      payee: ["payee", "merchant", "name"],
      category: ["category"],
    },
    dateOrder: "auto",
  },
];

export const TEMPLATE_HEADERS = ["date", "amount", "category", "description", "payee", "tags", "notes"];

function indexFor(headerLower: string[], names?: string[]): number | undefined {
  if (!names) return undefined;
  for (const n of names) {
    const i = headerLower.indexOf(n);
    if (i >= 0) return i;
  }
  return undefined;
}

function detectOrder(parts: string[]): DateOrder {
  if (parts[0].length === 4) return "ymd";
  if (Number(parts[0]) > 12) return "dmy";
  if (Number(parts[1]) > 12) return "mdy";
  return "mdy";
}

/** Parse a loose date string into ISO `YYYY-MM-DD`, or null. */
export function toIsoDate(raw: string, order: DateOrder = "auto"): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s) && isValidISODate(s.slice(0, 10))) return s.slice(0, 10);

  const parts = s.split(/[/.\-]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length !== 3) return null;

  const ord = order === "auto" ? detectOrder(parts) : order;
  let y: string, m: string, d: string;
  if (ord === "ymd") [y, m, d] = parts;
  else if (ord === "dmy") [d, m, y] = parts;
  else [m, d, y] = parts;

  let yy = Number(y);
  const mm = Number(m);
  const dd = Number(d);
  if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return null;
  if (yy < 100) yy += 2000;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yy < 1900) return null;

  const iso = `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  return isValidISODate(iso) ? iso : null;
}

export function parseExpenseCsv(
  text: string,
  categories: Category[],
  currency: string,
  preset: CsvPreset,
): ParseResult {
  const rows = parseCsv(text);
  if (rows.length < 2) return { drafts: [], skipped: Math.max(0, rows.length) };

  const headerLower = rows[0].map((h) => h.trim().toLowerCase());
  const a = preset.aliases;
  const idx = {
    date: indexFor(headerLower, a.date),
    amount: indexFor(headerLower, a.amount),
    debit: indexFor(headerLower, a.debit),
    description: indexFor(headerLower, a.description),
    payee: indexFor(headerLower, a.payee),
    category: indexFor(headerLower, a.category),
    tags: indexFor(headerLower, a.tags),
    notes: indexFor(headerLower, a.notes),
  };

  if (idx.date === undefined || (idx.amount === undefined && idx.debit === undefined)) {
    return { drafts: [], skipped: rows.length - 1 };
  }

  const byName = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c.id]));

  const cell = (row: string[], i?: number) => (i === undefined ? "" : (row[i] ?? "").trim());
  const drafts: ImportDraft[] = [];
  let skipped = 0;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const iso = toIsoDate(cell(row, idx.date), preset.dateOrder);

    let amount: number | null = null;
    if (idx.debit !== undefined) {
      const dv = parseAmount(cell(row, idx.debit));
      if (dv != null && dv > 0) amount = dv;
    } else {
      const v = parseAmount(cell(row, idx.amount));
      if (v != null) {
        const sign = preset.amountSign ?? "absolute";
        if (sign === "negative-expense") amount = v < 0 ? Math.abs(v) : null;
        else if (sign === "positive-expense") amount = v > 0 ? v : null;
        else amount = Math.abs(v);
      }
    }

    if (!iso || amount == null || amount <= 0) {
      skipped++;
      continue;
    }

    // Empty when the category name didn't match; the import flow fills it via the
    // learned merchant index, then falls back to "Other".
    const categoryId = byName.get(cell(row, idx.category).toLowerCase()) ?? "";
    drafts.push({
      date: iso,
      amount: Math.round(amount * 100) / 100,
      currency,
      categoryId,
      description: cell(row, idx.description) || "Imported",
      payee: cell(row, idx.payee) || undefined,
      tags: parseTags(cell(row, idx.tags)),
      notes: cell(row, idx.notes) || undefined,
    });
  }

  return { drafts, skipped };
}

/** Try every preset and return the one that yields the most usable rows. */
export function autoParse(
  text: string,
  categories: Category[],
  currency: string,
): { preset: CsvPreset; result: ParseResult } {
  let best = { preset: CSV_PRESETS[0], result: parseExpenseCsv(text, categories, currency, CSV_PRESETS[0]) };
  for (const p of CSV_PRESETS.slice(1)) {
    const result = parseExpenseCsv(text, categories, currency, p);
    if (result.drafts.length > best.result.drafts.length) best = { preset: p, result };
  }
  return best;
}
