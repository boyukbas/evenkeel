import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckSquare, Plus, Receipt, Upload, X } from "lucide-react";
import type { Expense, ID } from "@/types";
import { PageHeader } from "@/components/layout";
import { Button, ConfirmDialog, EmptyState } from "@/components/ui";
import { useCategories, useCategoryMap, useExpenses } from "@/hooks/useData";
import { useMoney } from "@/hooks/useMoney";
import { deleteExpense, deleteExpenses } from "@/db/repo";
import { toast } from "@/store/toast";
import { ExpenseList } from "./ExpenseList";
import { ExpenseModal } from "./ExpenseModal";
import { ImportModal } from "./ImportModal";
import { QuickAddBar } from "./QuickAddBar";
import { DEFAULT_FILTERS, FilterToolbar } from "./FilterToolbar";
import type { ExpenseFilters } from "./FilterToolbar";
import { useDistinctMonths, useFilteredExpenses } from "./useFilteredExpenses";

export function ExpensesPage() {
  const expenses = useExpenses();
  const categories = useCategories();
  const categoryMap = useCategoryMap();
  const money = useMoney();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<ExpenseFilters>(DEFAULT_FILTERS);

  // Add/Edit modal. `openToken` bumps on every open so the form re-seeds.
  const [editing, setEditing] = useState<Expense | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [openToken, setOpenToken] = useState(0);
  const [importOpen, setImportOpen] = useState(false);

  // Selection (bulk delete).
  const [selectedIds, setSelectedIds] = useState<Set<ID>>(new Set());

  // Delete confirmation: either a single expense or the current selection.
  const [confirmSingle, setConfirmSingle] = useState<Expense | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);

  const months = useDistinctMonths(expenses);
  const filtered = useFilteredExpenses(expenses, filters);

  const filteredTotal = useMemo(
    () => filtered.reduce((sum, e) => sum + e.amount, 0),
    [filtered],
  );

  const openAdd = () => {
    setEditing(null);
    setOpenToken((t) => t + 1);
    setModalOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditing(expense);
    setOpenToken((t) => t + 1);
    setModalOpen(true);
  };

  // Auto-open the Add modal when arriving at /expenses?new=1, then clear the param.
  const newParamHandled = useRef(false);
  useEffect(() => {
    if (searchParams.get("new") && !newParamHandled.current) {
      newParamHandled.current = true;
      openAdd();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Prune selections that no longer exist in the filtered view.
  const filteredIds = useMemo(() => new Set(filtered.map((e) => e.id)), [filtered]);
  useEffect(() => {
    setSelectedIds((prev) => {
      let changed = false;
      const next = new Set<ID>();
      for (const id of prev) {
        if (filteredIds.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [filteredIds]);

  const toggleSelect = (id: ID) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allVisibleSelected = filtered.length > 0 && filtered.every((e) => selectedIds.has(e.id));
  const toggleSelectAll = () =>
    setSelectedIds(allVisibleSelected ? new Set() : new Set(filtered.map((e) => e.id)));

  const clearSelection = () => setSelectedIds(new Set());

  const handleConfirmSingle = async () => {
    if (!confirmSingle) return;
    try {
      await deleteExpense(confirmSingle.id);
      toast.success("Expense deleted");
    } catch (err) {
      console.error(err);
      toast.error("Could not delete expense");
    }
  };

  const handleConfirmBulk = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await deleteExpenses(ids);
      toast.success(`Deleted ${ids.length} ${ids.length === 1 ? "expense" : "expenses"}`);
      clearSelection();
    } catch (err) {
      console.error(err);
      toast.error("Could not delete selection");
    }
  };

  const hasAnyExpenses = expenses.length > 0;
  const selectedCount = selectedIds.size;

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Every transaction, flexibly entered — search, filter, and keep your spending on an even keel."
        actions={
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" />
              Import CSV
            </Button>
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Add expense
            </Button>
          </>
        }
      />

      {!hasAnyExpenses ? (
        <EmptyState
          icon={Receipt}
          title="No expenses yet"
          description="Add your first expense to start tracking. You can also import a CSV from your bank or another app."
          action={
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Add your first expense
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <QuickAddBar categories={categories} />

          <FilterToolbar
            filters={filters}
            onChange={setFilters}
            categories={categories}
            months={months}
          />

          {/* Summary + select-all */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{filtered.length}</span>{" "}
              {filtered.length === 1 ? "expense" : "expenses"}
              {" · "}
              <span className="font-medium text-foreground">{money.format(filteredTotal)}</span>
            </p>
            {filtered.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <CheckSquare className="h-4 w-4" />
                {allVisibleSelected ? "Clear selection" : "Select all"}
              </button>
            )}
          </div>

          {/* Bulk action bar */}
          {selectedCount > 0 && (
            <div className="ek-animate-in flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-accent/50 px-3 py-2">
              <span className="text-sm font-medium text-foreground">
                {selectedCount} selected
              </span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  <X className="h-4 w-4" />
                  Clear
                </Button>
                <Button variant="danger" size="sm" onClick={() => setConfirmBulk(true)}>
                  Delete selected
                </Button>
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              title="No matching expenses"
              description="Try clearing or adjusting the filters above."
              action={
                <Button variant="outline" onClick={() => setFilters(DEFAULT_FILTERS)}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <ExpenseList
              expenses={filtered}
              categoryMap={categoryMap}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onEdit={openEdit}
              onDelete={setConfirmSingle}
            />
          )}
        </div>
      )}

      <ExpenseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        expense={editing}
        categories={categories}
        openToken={openToken}
      />

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} categories={categories} />

      <ConfirmDialog
        open={confirmSingle != null}
        onClose={() => setConfirmSingle(null)}
        onConfirm={handleConfirmSingle}
        title="Delete this expense?"
        message={
          confirmSingle
            ? `"${confirmSingle.description || "Untitled expense"}" (${money.format(confirmSingle.amount)}) will be permanently removed.`
            : undefined
        }
        confirmLabel="Delete"
        danger
      />

      <ConfirmDialog
        open={confirmBulk}
        onClose={() => setConfirmBulk(false)}
        onConfirm={handleConfirmBulk}
        title={`Delete ${selectedCount} ${selectedCount === 1 ? "expense" : "expenses"}?`}
        message="The selected expenses will be permanently removed. This cannot be undone."
        confirmLabel="Delete selected"
        danger
      />
    </div>
  );
}
