import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { Category } from "@/types";
import { Button, Card, CardContent, Input, Select } from "@/components/ui";
import { useSettings } from "@/hooks/useData";
import { addExpense } from "@/db/repo";
import { parseAmount } from "@/lib/currency";
import { todayISO } from "@/lib/date";
import { toast } from "@/store/toast";

interface QuickAddBarProps {
  categories: Category[];
}

/** Compact one-line entry that bypasses the full modal. */
export function QuickAddBar({ categories }: QuickAddBarProps) {
  const settings = useSettings();
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);

  // Keep a sensible category selected once categories load or change.
  useEffect(() => {
    if (categories.length > 0 && !categories.some((c) => c.id === categoryId)) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  const reset = () => {
    setAmount("");
    setDescription("");
    setDate(todayISO());
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseAmount(amount);
    if (parsed == null || parsed <= 0) {
      toast.error("Enter an amount greater than zero");
      return;
    }
    if (!categoryId) {
      toast.error("Pick a category");
      return;
    }
    setSaving(true);
    try {
      await addExpense({
        amount: parsed,
        date: date || todayISO(),
        currency: settings.baseCurrency,
        categoryId,
        description: description.trim(),
        tags: [],
      });
      toast.success("Expense added");
      reset();
    } catch (err) {
      console.error(err);
      toast.error("Could not add expense");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-3 pt-3">
        <form onSubmit={handleAdd} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:w-32">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {settings.baseCurrency}
            </span>
            <Input
              inputMode="decimal"
              placeholder="0.00"
              aria-label="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-12"
            />
          </div>
          <Select
            aria-label="Category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="sm:w-44"
          >
            {categories.length === 0 && <option value="">No categories</option>}
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input
            placeholder="Description"
            aria-label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="sm:flex-1"
          />
          <Input
            type="date"
            aria-label="Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="sm:w-44"
          />
          <Button type="submit" loading={saving} className="shrink-0">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
