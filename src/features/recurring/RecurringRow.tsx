/** One recurring charge in the list, with inline toggles and edit/delete. */
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { Category, RecurringExpense } from "@/types";
import { Badge, Button, CategoryIcon, ConfirmDialog, Switch } from "@/components/ui";
import { useMoney } from "@/hooks/useMoney";
import { formatDateMedium } from "@/lib/date";
import { annualCost, describeFrequency, monthlyAmortized } from "@/lib/recurrence";
import { deleteRecurring, updateRecurring } from "@/db/repo";
import { toast } from "@/store/toast";
import { nextChargeDate } from "./helpers";

interface RecurringRowProps {
  rec: RecurringExpense;
  category?: Category;
  onEdit: (rec: RecurringExpense) => void;
}

export function RecurringRow({ rec, category, onEdit }: RecurringRowProps) {
  const money = useMoney();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const monthly = monthlyAmortized(rec);
  const annual = annualCost(rec);
  const next = nextChargeDate(rec);
  const essential = category?.essential ?? true;

  async function toggleAmortize(value: boolean) {
    await updateRecurring(rec.id, { amortize: value });
    toast.success(value ? "Smoothing on" : "Smoothing off", value ? `${rec.name} is now spread evenly.` : `${rec.name} will show as a full charge in its month.`);
  }

  async function toggleActive(value: boolean) {
    await updateRecurring(rec.id, { active: value });
    toast.success(value ? "Activated" : "Paused", rec.name);
  }

  async function confirmDelete() {
    await deleteRecurring(rec.id);
    toast.success("Recurring deleted", rec.name);
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 transition-colors hover:bg-accent/40 sm:flex-row sm:items-center">
      {/* Identity */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <CategoryIcon
          category={category ?? { icon: "Tag", color: "#888888", name: "Uncategorized" }}
          size="md"
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium text-foreground">{rec.name}</span>
            {rec.amortize && <Badge variant="primary">smoothed</Badge>}
            {!essential && <Badge variant="outline">want</Badge>}
            {!rec.active && <Badge variant="default">paused</Badge>}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {describeFrequency(rec)} · {money.format(rec.amount)}/charge
            {next ? ` · next ${formatDateMedium(next)}` : " · no upcoming charge"}
          </p>
        </div>
      </div>

      {/* Money: monthly equivalent emphasized, annual secondary */}
      <div className="flex items-center gap-6 sm:gap-8">
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Monthly</p>
          <p className="font-semibold tabular-nums text-foreground">{money.format(monthly)}</p>
        </div>
        <div className="hidden text-right sm:block">
          <p className="text-xs text-muted-foreground">Per year</p>
          <p className="tabular-nums text-muted-foreground">{money.format(annual)}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <label className="flex items-center gap-2 text-xs text-muted-foreground" title="Spread this charge into an even monthly cost">
          <span className="hidden sm:inline">Smooth</span>
          <Switch checked={rec.amortize} onChange={toggleAmortize} aria-label={`Smooth ${rec.name}`} />
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground" title="Include this item in totals and projections">
          <span className="hidden sm:inline">Active</span>
          <Switch checked={rec.active} onChange={toggleActive} aria-label={`Activate ${rec.name}`} />
        </label>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => onEdit(rec)} aria-label={`Edit ${rec.name}`}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setConfirmOpen(true)} aria-label={`Delete ${rec.name}`}>
            <Trash2 className="h-4 w-4 text-danger" />
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete recurring charge?"
        message={`"${rec.name}" will be removed. This won't delete any expenses already logged.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
