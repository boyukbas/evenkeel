import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Category, Expense, PaymentMethod } from "@/types";
import {
  Button,
  CategoryIcon,
  Field,
  Input,
  Modal,
  Select,
  Switch,
  Textarea,
} from "@/components/ui";
import { useSettings } from "@/hooks/useData";
import { addExpense, updateExpense } from "@/db/repo";
import { toast } from "@/store/toast";
import { PAYMENT_METHODS } from "./constants";
import { useExpenseForm } from "./useExpenseForm";
import { ReceiptsField } from "./ReceiptsField";

interface ExpenseModalProps {
  open: boolean;
  onClose: () => void;
  /** When set, the modal edits this expense; otherwise it adds a new one. */
  expense: Expense | null;
  categories: Category[];
  /** Changes each time the modal is opened, to re-seed the form. */
  openToken: number;
}

export function ExpenseModal({ open, onClose, expense, categories, openToken }: ExpenseModalProps) {
  const settings = useSettings();
  const defaultCategoryId = categories[0]?.id ?? "";
  const { form, set, errors, touched, buildPayload } = useExpenseForm({
    expense,
    defaultCategoryId,
    resetKey: openToken,
  });
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEdit = expense != null;
  const selectedCategory = categories.find((c) => c.id === form.categoryId);
  const showError = (msg?: string) => (touched ? msg : undefined);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildPayload();
    if (!payload) return;

    setSaving(true);
    try {
      if (isEdit && expense) {
        await updateExpense(expense.id, {
          amount: payload.amount,
          date: payload.date,
          categoryId: payload.categoryId,
          description: payload.description,
          payee: payload.payee,
          method: payload.method,
          tags: payload.tags,
          notes: payload.notes,
          amortizeMonths: payload.amortizeMonths,
          excludeFromInsights: payload.excludeFromInsights,
        });
        toast.success("Expense updated");
      } else {
        await addExpense({
          amount: payload.amount,
          date: payload.date,
          currency: settings.baseCurrency,
          categoryId: payload.categoryId,
          description: payload.description,
          payee: payload.payee,
          method: payload.method,
          tags: payload.tags,
          notes: payload.notes,
          amortizeMonths: payload.amortizeMonths,
          excludeFromInsights: payload.excludeFromInsights,
        });
        toast.success("Expense added");
      }
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Could not save expense");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? "Edit expense" : "Add expense"}
      description={isEdit ? "Update the details of this transaction." : "Log a new transaction."}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="expense-form" loading={saving}>
            {isEdit ? "Save changes" : "Add expense"}
          </Button>
        </>
      }
    >
      <form id="expense-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Amount" error={showError(errors.amount)} htmlFor="exp-amount">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {settings.baseCurrency}
              </span>
              <Input
                id="exp-amount"
                inputMode="decimal"
                autoFocus
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                className="pl-12"
              />
            </div>
          </Field>

          <Field label="Date" error={showError(errors.date)} htmlFor="exp-date">
            <Input
              id="exp-date"
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </Field>
        </div>

        <Field label="Category" error={showError(errors.categoryId)} htmlFor="exp-category">
          <div className="flex items-center gap-2">
            {selectedCategory && <CategoryIcon category={selectedCategory} size="sm" />}
            <Select
              id="exp-category"
              value={form.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
            >
              {categories.length === 0 && <option value="">No categories</option>}
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        </Field>

        <Field label="Description" htmlFor="exp-description">
          <Input
            id="exp-description"
            placeholder="What was it for?"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Payee" hint="Optional" htmlFor="exp-payee">
            <Input
              id="exp-payee"
              placeholder="Who was paid?"
              value={form.payee}
              onChange={(e) => set("payee", e.target.value)}
            />
          </Field>

          <Field label="Payment method" htmlFor="exp-method">
            <Select
              id="exp-method"
              value={form.method}
              onChange={(e) => set("method", e.target.value as PaymentMethod | "")}
            >
              <option value="">Not specified</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Tags" hint="Comma-separated, e.g. work, reimbursable" htmlFor="exp-tags">
          <Input
            id="exp-tags"
            placeholder="groceries, weekly"
            value={form.tags}
            onChange={(e) => set("tags", e.target.value)}
          />
        </Field>

        <Field label="Notes" htmlFor="exp-notes">
          <Textarea
            id="exp-notes"
            placeholder="Anything else worth remembering…"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Field>

        <ReceiptsField expenseId={expense?.id ?? null} />

        {/* Advanced collapsible section */}
        <div className="rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-foreground"
            aria-expanded={advancedOpen}
          >
            {advancedOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            Advanced
          </button>

          {advancedOpen && (
            <div className="space-y-4 border-t border-border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <label htmlFor="exp-amortize" className="text-sm font-medium text-foreground">
                    Spread over several months (amortize)
                  </label>
                  <p className="max-w-md text-xs text-muted-foreground">
                    The actual cash still lands this month, but the{" "}
                    <span className="font-medium text-foreground">normalized</span> impact is spread
                    evenly across the months you choose — so one big purchase doesn't distort a
                    single month.
                  </p>
                </div>
                <Switch
                  id="exp-amortize"
                  checked={form.amortizeEnabled}
                  onChange={(v) => set("amortizeEnabled", v)}
                  aria-label="Spread over several months"
                />
              </div>

              {form.amortizeEnabled && (
                <Field
                  label="Months to spread over"
                  error={showError(errors.amortizeMonths)}
                  htmlFor="exp-amortize-months"
                  className="max-w-[200px]"
                >
                  <Input
                    id="exp-amortize-months"
                    type="number"
                    min={2}
                    step={1}
                    value={form.amortizeMonths}
                    onChange={(e) => set("amortizeMonths", e.target.value)}
                  />
                </Field>
              )}

              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <label htmlFor="exp-exclude" className="text-sm font-medium text-foreground">
                    Exclude from insights
                  </label>
                  <p className="max-w-md text-xs text-muted-foreground">
                    Keep this expense on record but leave it out of normalization and insight
                    calculations.
                  </p>
                </div>
                <Switch
                  id="exp-exclude"
                  checked={form.excludeFromInsights}
                  onChange={(v) => set("excludeFromInsights", v)}
                  aria-label="Exclude from insights"
                />
              </div>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
