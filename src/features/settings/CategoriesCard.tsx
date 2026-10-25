import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import type { Category } from "@/types";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CategoryIcon,
  EmptyState,
  Input,
  Switch,
} from "@/components/ui";
import { useCategories, useExpenses, useSettings } from "@/hooks/useData";
import { useMoney } from "@/hooks/useMoney";
import { updateCategory } from "@/db/repo";
import { parseAmount } from "@/lib/currency";
import { toast } from "@/store/toast";
import { CategoryModal } from "./CategoryModal";
import { DeleteCategoryDialog } from "./DeleteCategoryDialog";

export function CategoriesCard() {
  const settings = useSettings();
  const categories = useCategories();
  const expenses = useExpenses();

  const [editing, setEditing] = useState<Category | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);

  // expenses-per-category, computed once per expenses change.
  const usageByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of expenses) counts.set(e.categoryId, (counts.get(e.categoryId) ?? 0) + 1);
    return counts;
  }, [expenses]);

  const openAdd = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (category: Category) => {
    setEditing(category);
    setEditorOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle>Categories</CardTitle>
          <CardDescription>Rename, recolor, set budgets, and mark needs vs wants.</CardDescription>
        </div>
        <Button size="sm" variant="secondary" onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <EmptyState
            icon={Tags}
            title="No categories yet"
            description="Add a category to start organizing your expenses."
            action={
              <Button size="sm" onClick={openAdd}>
                <Plus className="h-4 w-4" />
                Add category
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {categories.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                usageCount={usageByCategory.get(category.id) ?? 0}
                onEdit={() => openEdit(category)}
                onDelete={() => setDeleting(category)}
              />
            ))}
          </ul>
        )}
      </CardContent>

      <CategoryModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        category={editing}
        baseCurrency={settings.baseCurrency}
      />
      <DeleteCategoryDialog
        open={deleting != null}
        onClose={() => setDeleting(null)}
        category={deleting}
        categories={categories}
        usageCount={deleting ? usageByCategory.get(deleting.id) ?? 0 : 0}
      />
    </Card>
  );
}

interface CategoryRowProps {
  category: Category;
  usageCount: number;
  onEdit: () => void;
  onDelete: () => void;
}

function CategoryRow({ category, usageCount, onEdit, onDelete }: CategoryRowProps) {
  const money = useMoney();

  // Local mirror of the inline budget so editing feels live; commit on blur.
  const [budget, setBudget] = useState("");
  useEffect(() => {
    setBudget(category.monthlyBudget != null ? String(category.monthlyBudget) : "");
  }, [category.monthlyBudget]);

  const toggleEssential = async (essential: boolean) => {
    await updateCategory(category.id, { essential });
    toast.success(essential ? "Marked essential" : "Marked non-essential", category.name);
  };

  const changeColor = async (color: string) => {
    await updateCategory(category.id, { color });
    toast.success("Color updated", category.name);
  };

  const commitBudget = async () => {
    const trimmed = budget.trim();
    const current = category.monthlyBudget ?? null;

    if (trimmed === "") {
      if (current === null) return; // no change
      await updateCategory(category.id, { monthlyBudget: null });
      toast.success("Budget cleared", category.name);
      return;
    }

    const parsed = parseAmount(trimmed);
    if (parsed == null || parsed < 0) {
      toast.error("Enter a valid budget amount");
      setBudget(current != null ? String(current) : "");
      return;
    }
    if (parsed === current) return; // no change
    await updateCategory(category.id, { monthlyBudget: parsed });
    setBudget(String(parsed));
    toast.success("Budget saved", `${category.name} · ${money.format(parsed)}`);
  };

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 py-3 sm:flex-nowrap">
      {/* Identity */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <CategoryIcon category={category} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-foreground">{category.name}</span>
            <Badge variant={category.essential ? "primary" : "outline"}>
              {category.essential ? "Essential" : "Non-essential"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {usageCount} {usageCount === 1 ? "expense" : "expenses"}
          </p>
        </div>
      </div>

      {/* Inline controls */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">Essential</span>
          <Switch
            checked={category.essential}
            onChange={toggleEssential}
            aria-label={`Mark ${category.name} essential`}
          />
        </label>

        <div className="relative w-28">
          <Input
            inputMode="decimal"
            placeholder="Budget"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            onBlur={commitBudget}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="h-9 text-sm"
            aria-label={`Monthly budget for ${category.name}`}
          />
        </div>

        <input
          type="color"
          value={category.color}
          onChange={(e) => changeColor(e.target.value)}
          className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-input bg-background p-1"
          aria-label={`Color for ${category.name}`}
          title="Category color"
        />

        <div className="flex items-center gap-1">
          <Button size="icon-sm" variant="ghost" onClick={onEdit} aria-label={`Edit ${category.name}`}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onDelete}
            aria-label={`Delete ${category.name}`}
            className="text-muted-foreground hover:text-danger"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </li>
  );
}
