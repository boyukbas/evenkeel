import { Search, X } from "lucide-react";
import type { Category, MonthKey } from "@/types";
import { Button, Input, Select } from "@/components/ui";
import { formatMonthLong } from "@/lib/date";
import { PAYMENT_METHODS, SORT_OPTIONS } from "./constants";
import type { SortKey } from "./constants";

export interface ExpenseFilters {
  search: string;
  categoryId: string;
  month: string;
  method: string;
  sort: SortKey;
}

export const DEFAULT_FILTERS: ExpenseFilters = {
  search: "",
  categoryId: "",
  month: "",
  method: "",
  sort: "date-desc",
};

interface FilterToolbarProps {
  filters: ExpenseFilters;
  onChange: (filters: ExpenseFilters) => void;
  categories: Category[];
  /** Distinct months present in the data, newest first. */
  months: MonthKey[];
}

export function FilterToolbar({ filters, onChange, categories, months }: FilterToolbarProps) {
  const patch = (p: Partial<ExpenseFilters>) => onChange({ ...filters, ...p });
  const hasActiveFilter =
    filters.search !== "" ||
    filters.categoryId !== "" ||
    filters.month !== "" ||
    filters.method !== "";

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
      <div className="relative min-w-0 flex-1 lg:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search description, payee, tags…"
          aria-label="Search expenses"
          value={filters.search}
          onChange={(e) => patch({ search: e.target.value })}
          className="pl-9"
        />
      </div>

      <Select
        aria-label="Filter by category"
        value={filters.categoryId}
        onChange={(e) => patch({ categoryId: e.target.value })}
        className="lg:w-44"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>

      <Select
        aria-label="Filter by month"
        value={filters.month}
        onChange={(e) => patch({ month: e.target.value })}
        className="lg:w-44"
      >
        <option value="">All months</option>
        {months.map((m) => (
          <option key={m} value={m}>
            {formatMonthLong(m)}
          </option>
        ))}
      </Select>

      <Select
        aria-label="Filter by payment method"
        value={filters.method}
        onChange={(e) => patch({ method: e.target.value })}
        className="lg:w-44"
      >
        <option value="">All methods</option>
        {PAYMENT_METHODS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </Select>

      <Select
        aria-label="Sort"
        value={filters.sort}
        onChange={(e) => patch({ sort: e.target.value as SortKey })}
        className="lg:w-44"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>

      {hasActiveFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({ ...DEFAULT_FILTERS, sort: filters.sort })}
          className="shrink-0"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
