/** The full list of recurring charges (active first), each row interactive. */
import type { Category, ID, RecurringExpense } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { sortRecurring } from "./helpers";
import { RecurringRow } from "./RecurringRow";

interface RecurringListProps {
  recurring: RecurringExpense[];
  categories: Map<ID, Category>;
  onEdit: (rec: RecurringExpense) => void;
}

export function RecurringList({ recurring, categories, onEdit }: RecurringListProps) {
  const sorted = sortRecurring(recurring);

  return (
    <Card>
      <CardHeader>
        <CardTitle>All recurring charges</CardTitle>
        <CardDescription>
          {recurring.length} {recurring.length === 1 ? "charge" : "charges"} — monthly equivalent is the smoothed cost.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="divide-y divide-border border-t border-border">
          {sorted.map((rec) => (
            <RecurringRow key={rec.id} rec={rec} category={categories.get(rec.categoryId)} onEdit={onEdit} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
