import { useMemo, useState } from "react";
import { Plus, Wand2 } from "lucide-react";
import { Button, Card, CardDescription, CardHeader, CardTitle, CardContent, CategoryIcon } from "@/components/ui";
import { useCategoryMap, useExpenses, useRecurring, useSettings } from "@/hooks/useData";
import { useMoney } from "@/hooks/useMoney";
import { detectRecurring, type RecurringSuggestion } from "@/lib/recurringDetection";
import { FREQUENCY_LABELS } from "@/lib/recurrence";
import { addRecurring } from "@/db/repo";
import { toast } from "@/store/toast";

function amortizeDefault(freq: RecurringSuggestion["frequency"]): boolean {
  return !["weekly", "biweekly", "monthly"].includes(freq);
}

export function SuggestedRecurring() {
  const expenses = useExpenses();
  const recurring = useRecurring();
  const byId = useCategoryMap();
  const settings = useSettings();
  const money = useMoney();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const suggestions = useMemo(
    () => detectRecurring(expenses, recurring).filter((s) => !dismissed.has(s.key)),
    [expenses, recurring, dismissed],
  );

  if (suggestions.length === 0) return null;

  const add = async (s: RecurringSuggestion) => {
    try {
      await addRecurring({
        name: s.name,
        amount: s.amount,
        currency: settings.baseCurrency,
        categoryId: s.categoryId,
        frequency: s.frequency,
        interval: 1,
        anchorDate: s.lastDate,
        endDate: null,
        amortize: amortizeDefault(s.frequency),
        active: true,
        payee: s.name,
        tags: [],
      });
      toast.success(`Added "${s.name}" as recurring`, "Fine-tune it in the list below.");
    } catch {
      toast.error("Couldn't add recurring", "Please try again.");
    }
  };

  return (
    <Card className="border-primary/30 bg-primary/[0.03]">
      <CardHeader className="flex-row items-center gap-2">
        <Wand2 className="h-5 w-5 text-primary" />
        <div>
          <CardTitle>Suggested recurring</CardTitle>
          <CardDescription>We spotted these repeating in your expenses. Add them so they're smoothed.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="divide-y divide-border">
        {suggestions.slice(0, 5).map((s) => {
          const cat = byId.get(s.categoryId);
          return (
            <div key={s.key} className="flex items-center gap-3 py-3">
              {cat && <CategoryIcon category={cat} />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {money.format(s.amount)} · {FREQUENCY_LABELS[s.frequency]} · seen {s.occurrences}×
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button size="sm" onClick={() => add(s)}>
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
                <button
                  onClick={() => setDismissed((prev) => new Set(prev).add(s.key))}
                  className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  Dismiss
                </button>
              </div>
            </div>
          );
        })}
        {suggestions.length > 5 && (
          <p className="pt-3 text-xs text-muted-foreground">+{suggestions.length - 5} more patterns detected.</p>
        )}
      </CardContent>
    </Card>
  );
}
