import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import type { Category } from "@/types";
import {
  Button,
  CATEGORY_ICON_CHOICES,
  Field,
  Input,
  Modal,
  Switch,
  getLucideIcon,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { addCategory, updateCategory } from "@/db/repo";
import { parseAmount } from "@/lib/currency";
import { toast } from "@/store/toast";

interface CategoryModalProps {
  open: boolean;
  onClose: () => void;
  /** When set, edits this category; otherwise adds a new one. */
  category: Category | null;
  baseCurrency: string;
}

const DEFAULT_COLOR = "#6366f1";
const DEFAULT_ICON = "Tag";

export function CategoryModal({ open, onClose, category, baseCurrency }: CategoryModalProps) {
  const isEdit = category != null;

  const [name, setName] = useState("");
  const [essential, setEssential] = useState(false);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [icon, setIcon] = useState(DEFAULT_ICON);
  const [budget, setBudget] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  // Re-seed the form whenever the modal opens or the target category changes.
  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setEssential(category?.essential ?? false);
    setColor(category?.color ?? DEFAULT_COLOR);
    setIcon(category?.icon ?? DEFAULT_ICON);
    setBudget(category?.monthlyBudget != null ? String(category.monthlyBudget) : "");
    setError(undefined);
  }, [open, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }

    let monthlyBudget: number | null = null;
    if (budget.trim() !== "") {
      const parsed = parseAmount(budget);
      if (parsed == null || parsed < 0) {
        setError("Enter a valid budget amount");
        return;
      }
      monthlyBudget = parsed;
    }

    setSaving(true);
    try {
      if (isEdit && category) {
        await updateCategory(category.id, { name: trimmed, essential, color, icon, monthlyBudget });
        toast.success("Category updated", trimmed);
      } else {
        await addCategory({ name: trimmed, essential, color, icon, monthlyBudget });
        toast.success("Category added", trimmed);
      }
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Could not save category");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? "Edit category" : "New category"}
      description={
        isEdit ? "Update this category's appearance and budget." : "Create a category for your expenses."
      }
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="category-form" loading={saving}>
            {isEdit ? "Save changes" : "Add category"}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={handleSubmit} className="space-y-5">
        <Field label="Name" error={error} htmlFor="cat-name">
          <Input
            id="cat-name"
            autoFocus
            placeholder="e.g. Groceries"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(undefined);
            }}
          />
        </Field>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="text-sm font-medium text-foreground">Essential</span>
            <p className="max-w-md text-xs text-muted-foreground">
              Needs (rent, groceries, insurance). Non-essential categories feed the savings and
              "unnecessary spending" insights.
            </p>
          </div>
          <Switch checked={essential} onChange={setEssential} aria-label="Essential category" />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Color" htmlFor="cat-color">
            <div className="flex items-center gap-3">
              <input
                id="cat-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border border-input bg-background p-1"
                aria-label="Category color"
              />
              <span className="font-mono text-sm uppercase text-muted-foreground">{color}</span>
            </div>
          </Field>

          <Field
            label="Monthly budget"
            hint="Optional. Compared against normalized spend."
            htmlFor="cat-budget"
          >
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {baseCurrency}
              </span>
              <Input
                id="cat-budget"
                inputMode="decimal"
                placeholder="No limit"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="pl-12"
              />
            </div>
          </Field>
        </div>

        <Field label="Icon">
          <div className="grid grid-cols-7 gap-2 sm:grid-cols-10">
            {CATEGORY_ICON_CHOICES.map((choice) => {
              const Glyph = getLucideIcon(choice);
              const selected = choice === icon;
              return (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setIcon(choice)}
                  aria-label={choice}
                  aria-pressed={selected}
                  title={choice}
                  className={cn(
                    "relative flex aspect-square items-center justify-center rounded-lg border transition-colors",
                    selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Glyph className="h-4 w-4" />
                  {selected && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Field>
      </form>
    </Modal>
  );
}
