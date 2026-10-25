/** Add / edit a recurring charge, with a live smoothed-monthly preview. */
import { useEffect, useMemo, useState } from "react";
import type { Category, Frequency, PaymentMethod, RecurringExpense } from "@/types";
import {
  Button,
  Field,
  Input,
  Modal,
  Select,
  Switch,
  Textarea,
} from "@/components/ui";
import { useMoney } from "@/hooks/useMoney";
import { parseAmount } from "@/lib/currency";
import { todayISO } from "@/lib/date";
import { describeFrequency, FREQUENCY_LABELS, monthlyAmortized } from "@/lib/recurrence";
import { addRecurring, updateRecurring } from "@/db/repo";
import { toast } from "@/store/toast";
import { defaultAmortizeFor, parseTags } from "./helpers";

const FREQUENCIES = Object.keys(FREQUENCY_LABELS) as Frequency[];

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "card", label: "Card" },
  { value: "debit", label: "Debit" },
  { value: "directdebit", label: "Direct debit" },
  { value: "transfer", label: "Transfer" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

interface FormState {
  name: string;
  amount: string;
  categoryId: string;
  frequency: Frequency;
  interval: string;
  customMonths: string;
  anchorDate: string;
  endDate: string;
  amortize: boolean;
  active: boolean;
  payee: string;
  method: PaymentMethod;
  tags: string;
  notes: string;
}

function blankForm(categoryId: string): FormState {
  return {
    name: "",
    amount: "",
    categoryId,
    frequency: "annual",
    interval: "1",
    customMonths: "1",
    anchorDate: todayISO(),
    endDate: "",
    amortize: true,
    active: true,
    payee: "",
    method: "card",
    tags: "",
    notes: "",
  };
}

function formFrom(rec: RecurringExpense): FormState {
  return {
    name: rec.name,
    amount: String(rec.amount),
    categoryId: rec.categoryId,
    frequency: rec.frequency,
    interval: String(rec.interval || 1),
    customMonths: String(rec.customMonths || 1),
    anchorDate: rec.anchorDate,
    endDate: rec.endDate ?? "",
    amortize: rec.amortize,
    active: rec.active,
    payee: rec.payee ?? "",
    method: rec.method ?? "card",
    tags: rec.tags.join(", "),
    notes: rec.notes ?? "",
  };
}

interface RecurringFormModalProps {
  open: boolean;
  onClose: () => void;
  /** The item being edited, or null when adding. */
  editing: RecurringExpense | null;
  categories: Category[];
  baseCurrency: string;
}

export function RecurringFormModal({ open, onClose, editing, categories, baseCurrency }: RecurringFormModalProps) {
  const money = useMoney();
  const [form, setForm] = useState<FormState>(() => blankForm(categories[0]?.id ?? ""));
  const [saving, setSaving] = useState(false);
  const [touchedAmortize, setTouchedAmortize] = useState(false);

  // Reset the form whenever the modal opens (for add or for a specific edit).
  useEffect(() => {
    if (!open) return;
    setForm(editing ? formFrom(editing) : blankForm(categories[0]?.id ?? ""));
    setTouchedAmortize(false);
    setSaving(false);
  }, [open, editing, categories]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Changing frequency flips the smart amortize default until the user overrides it.
  const onFrequencyChange = (frequency: Frequency) =>
    setForm((f) => ({
      ...f,
      frequency,
      amortize: touchedAmortize ? f.amortize : defaultAmortizeFor(frequency),
    }));

  const parsedAmount = parseAmount(form.amount);
  const interval = Math.max(1, parseInt(form.interval, 10) || 1);
  const customMonths = Math.max(1, parseInt(form.customMonths, 10) || 1);

  // Live smoothed-monthly figure from the in-progress values.
  const livePreview = useMemo(() => {
    if (parsedAmount == null || parsedAmount <= 0) return null;
    const draft = {
      amount: parsedAmount,
      frequency: form.frequency,
      interval,
      customMonths,
    };
    return {
      monthly: monthlyAmortized(draft),
      label: describeFrequency(draft),
    };
  }, [parsedAmount, form.frequency, interval, customMonths]);

  const canSave = form.name.trim().length > 0 && parsedAmount != null && parsedAmount > 0 && !!form.categoryId;

  async function handleSave() {
    if (!canSave || parsedAmount == null) return;
    setSaving(true);
    const draft = {
      name: form.name.trim(),
      amount: parsedAmount,
      currency: baseCurrency,
      categoryId: form.categoryId,
      frequency: form.frequency,
      interval,
      customMonths: form.frequency === "custom" ? customMonths : undefined,
      anchorDate: form.anchorDate || todayISO(),
      endDate: form.endDate ? form.endDate : null,
      amortize: form.amortize,
      active: form.active,
      payee: form.payee.trim() || undefined,
      method: form.method,
      tags: parseTags(form.tags),
      notes: form.notes.trim() || undefined,
    };
    try {
      if (editing) {
        await updateRecurring(editing.id, draft);
        toast.success("Recurring updated", draft.name);
      } else {
        await addRecurring(draft);
        toast.success("Recurring added", draft.name);
      }
      onClose();
    } catch {
      toast.error("Could not save", "Please try again.");
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? "Edit recurring charge" : "Add recurring charge"}
      description="Define it once — EvenKeel spreads it into an even monthly cost."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave} loading={saving}>
            {editing ? "Save changes" : "Add recurring"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="rec-name">
            <Input
              id="rec-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Car insurance"
              autoFocus
            />
          </Field>
          <Field label="Amount per charge" htmlFor="rec-amount" hint="What you pay each time it occurs.">
            <Input
              id="rec-amount"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              placeholder="1320"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" htmlFor="rec-category">
            <Select id="rec-category" value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.essential ? "" : " (want)"}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Frequency" htmlFor="rec-frequency">
            <Select
              id="rec-frequency"
              value={form.frequency}
              onChange={(e) => onFrequencyChange(e.target.value as Frequency)}
            >
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {FREQUENCY_LABELS[f]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`Every N ${form.frequency === "custom" ? "periods" : "intervals"}`} htmlFor="rec-interval" hint="Usually 1.">
            <Input
              id="rec-interval"
              type="number"
              min={1}
              value={form.interval}
              onChange={(e) => set("interval", e.target.value)}
            />
          </Field>
          {form.frequency === "custom" && (
            <Field label="Period length (months)" htmlFor="rec-custom" hint="A charge every this-many months.">
              <Input
                id="rec-custom"
                type="number"
                min={1}
                value={form.customMonths}
                onChange={(e) => set("customMonths", e.target.value)}
              />
            </Field>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First / next charge date" htmlFor="rec-anchor">
            <Input id="rec-anchor" type="date" value={form.anchorDate} onChange={(e) => set("anchorDate", e.target.value)} />
          </Field>
          <Field label="End date" htmlFor="rec-end" hint="Optional — leave blank if ongoing.">
            <Input id="rec-end" type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
          </Field>
        </div>

        {/* Live normalization preview */}
        <div className="rounded-lg border border-border bg-muted/40 p-4">
          {livePreview ? (
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Smoothed monthly cost</p>
                <p className="text-2xl font-semibold tracking-tight text-primary">{money.format(livePreview.monthly)}</p>
              </div>
              <p className="text-right text-xs text-muted-foreground">
                {money.format(parsedAmount ?? 0)} · {livePreview.label}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Enter an amount to see the smoothed monthly cost.</p>
          )}
        </div>

        {/* Toggles */}
        <div className="space-y-3 rounded-lg border border-border p-4">
          <label className="flex items-start justify-between gap-4">
            <span>
              <span className="text-sm font-medium text-foreground">Smooth into an even monthly cost</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                On: the charge is spread evenly across months in the normalized view. Off: the full charge shows in its own month.
              </span>
            </span>
            <Switch
              checked={form.amortize}
              onChange={(v) => {
                setTouchedAmortize(true);
                set("amortize", v);
              }}
              aria-label="Smooth into an even monthly cost"
            />
          </label>
          <label className="flex items-start justify-between gap-4 border-t border-border pt-3">
            <span>
              <span className="text-sm font-medium text-foreground">Active</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">Inactive items are kept but excluded from totals and projections.</span>
            </span>
            <Switch checked={form.active} onChange={(v) => set("active", v)} aria-label="Active" />
          </label>
        </div>

        <details className="rounded-lg border border-border p-4">
          <summary className="cursor-pointer text-sm font-medium text-foreground">More details (optional)</summary>
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Payee" htmlFor="rec-payee">
                <Input id="rec-payee" value={form.payee} onChange={(e) => set("payee", e.target.value)} placeholder="e.g. Acme Insurance" />
              </Field>
              <Field label="Payment method" htmlFor="rec-method">
                <Select id="rec-method" value={form.method} onChange={(e) => set("method", e.target.value as PaymentMethod)}>
                  {METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Tags" htmlFor="rec-tags" hint="Comma-separated.">
              <Input id="rec-tags" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="insurance, car" />
            </Field>
            <Field label="Notes" htmlFor="rec-notes">
              <Textarea id="rec-notes" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </div>
        </details>
      </div>
    </Modal>
  );
}
