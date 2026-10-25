import { useEffect, useMemo, useState } from "react";
import type { Expense, PaymentMethod } from "@/types";
import { parseAmount } from "@/lib/currency";
import { todayISO } from "@/lib/date";
import { parseTags } from "./constants";

export interface ExpenseFormState {
  amount: string;
  date: string;
  categoryId: string;
  description: string;
  payee: string;
  method: PaymentMethod | "";
  tags: string;
  notes: string;
  amortizeEnabled: boolean;
  amortizeMonths: string;
  excludeFromInsights: boolean;
}

export interface ExpenseFormErrors {
  amount?: string;
  categoryId?: string;
  date?: string;
  amortizeMonths?: string;
}

function emptyForm(defaultCategoryId: string): ExpenseFormState {
  return {
    amount: "",
    date: todayISO(),
    categoryId: defaultCategoryId,
    description: "",
    payee: "",
    method: "",
    tags: "",
    notes: "",
    amortizeEnabled: false,
    amortizeMonths: "12",
    excludeFromInsights: false,
  };
}

function formFromExpense(e: Expense): ExpenseFormState {
  return {
    amount: String(e.amount),
    date: e.date,
    categoryId: e.categoryId,
    description: e.description,
    payee: e.payee ?? "",
    method: e.method ?? "",
    tags: e.tags.join(", "),
    notes: e.notes ?? "",
    amortizeEnabled: e.amortizeMonths != null && e.amortizeMonths > 1,
    amortizeMonths: e.amortizeMonths != null && e.amortizeMonths > 1 ? String(e.amortizeMonths) : "12",
    excludeFromInsights: e.excludeFromInsights ?? false,
  };
}

/** The cleaned, persistable values derived from a valid form. */
export interface ExpensePayload {
  amount: number;
  date: string;
  categoryId: string;
  description: string;
  payee?: string;
  method?: PaymentMethod;
  tags: string[];
  notes?: string;
  amortizeMonths: number | null;
  excludeFromInsights: boolean;
}

interface UseExpenseFormArgs {
  /** The expense being edited, or null when adding. */
  expense: Expense | null;
  /** Fallback category for a fresh form. */
  defaultCategoryId: string;
  /** Re-seed the form whenever this changes (e.g. modal re-open). */
  resetKey: unknown;
}

/** Controlled form state + validation for the Add/Edit Expense modal. */
export function useExpenseForm({ expense, defaultCategoryId, resetKey }: UseExpenseFormArgs) {
  const [form, setForm] = useState<ExpenseFormState>(() =>
    expense ? formFromExpense(expense) : emptyForm(defaultCategoryId),
  );
  const [touched, setTouched] = useState(false);

  // Re-seed when the target expense or the open-cycle changes.
  useEffect(() => {
    setForm(expense ? formFromExpense(expense) : emptyForm(defaultCategoryId));
    setTouched(false);
    // resetKey intentionally part of the dependency list to force a reset on re-open.
  }, [expense, defaultCategoryId, resetKey]);

  const set = <K extends keyof ExpenseFormState>(key: K, value: ExpenseFormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const parsedAmount = useMemo(() => parseAmount(form.amount), [form.amount]);

  const errors = useMemo<ExpenseFormErrors>(() => {
    const e: ExpenseFormErrors = {};
    if (parsedAmount == null || parsedAmount <= 0) e.amount = "Enter an amount greater than zero.";
    if (!form.categoryId) e.categoryId = "Pick a category.";
    if (!form.date) e.date = "Pick a date.";
    if (form.amortizeEnabled) {
      const n = Number.parseInt(form.amortizeMonths, 10);
      if (!Number.isFinite(n) || n < 2) e.amortizeMonths = "Use 2 or more months.";
    }
    return e;
  }, [parsedAmount, form.categoryId, form.date, form.amortizeEnabled, form.amortizeMonths]);

  const isValid = Object.keys(errors).length === 0;

  /** Returns the cleaned payload when valid, otherwise null (and marks touched). */
  const buildPayload = (): ExpensePayload | null => {
    setTouched(true);
    if (!isValid || parsedAmount == null) return null;
    const amortMonths = form.amortizeEnabled ? Number.parseInt(form.amortizeMonths, 10) : null;
    const payee = form.payee.trim();
    const notes = form.notes.trim();
    return {
      amount: parsedAmount,
      date: form.date,
      categoryId: form.categoryId,
      description: form.description.trim(),
      payee: payee || undefined,
      method: form.method || undefined,
      tags: parseTags(form.tags),
      notes: notes || undefined,
      amortizeMonths: amortMonths,
      excludeFromInsights: form.excludeFromInsights,
    };
  };

  return { form, set, errors, touched, isValid, parsedAmount, buildPayload };
}
