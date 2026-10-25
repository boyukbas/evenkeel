/**
 * Recurring & Normalized — the page where EvenKeel's flagship idea shines:
 * define a lumpy periodic charge once and watch it smooth into an even monthly
 * line that no longer distorts any single month.
 */
import { useMemo, useState } from "react";
import { Plus, Repeat } from "lucide-react";
import type { RecurringExpense } from "@/types";
import { PageHeader } from "@/components/layout";
import { Button, EmptyState, Stat } from "@/components/ui";
import { useCategories, useCategoryMap, useRecurring, useSettings } from "@/hooks/useData";
import { useMoney } from "@/hooks/useMoney";
import { formatPercent } from "@/lib/currency";
import { useRecurringStats } from "./useRecurringStats";
import { NormalizationChart } from "./NormalizationChart";
import { RecurringList } from "./RecurringList";
import { RecurringFormModal } from "./RecurringFormModal";
import { UpcomingCharges } from "./UpcomingCharges";
import { SuggestedRecurring } from "./SuggestedRecurring";

const ALL_SCOPE = "__all__";

export function RecurringPage() {
  const recurring = useRecurring();
  const categories = useCategories();
  const categoryMap = useCategoryMap();
  const settings = useSettings();
  const money = useMoney();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringExpense | null>(null);
  const [scopeId, setScopeId] = useState<string>(ALL_SCOPE);

  const stats = useRecurringStats(recurring, categoryMap);
  const active = useMemo(() => recurring.filter((r) => r.active), [recurring]);

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(rec: RecurringExpense) {
    setEditing(rec);
    setModalOpen(true);
  }

  // Keep the chart scope valid if the selected item is deleted/paused.
  const effectiveScope = scopeId !== ALL_SCOPE && !active.some((r) => r.id === scopeId) ? ALL_SCOPE : scopeId;

  const essentialShare =
    stats.monthlyCommitment > 0 ? stats.essentialMonthly / stats.monthlyCommitment : 0;

  const isEmpty = recurring.length === 0;

  return (
    <div>
      <PageHeader
        title="Recurring & Normalized"
        description="Define repeating or periodic charges once. EvenKeel spreads big yearly/periodic payments into an even monthly cost so they don't distort any single month."
        actions={
          !isEmpty && (
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Add recurring
            </Button>
          )
        }
      />

      {isEmpty ? (
        <EmptyState
          icon={Repeat}
          title="No recurring charges yet"
          description="Add subscriptions, insurance, or any periodic bill. EvenKeel turns a big yearly payment into a steady monthly cost — so one charge never distorts a single month."
          action={
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Add your first recurring charge
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* KPI row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Stat
              label="Smoothed monthly commitment"
              value={money.format(stats.monthlyCommitment)}
              sub={`across ${stats.activeCount} active`}
            />
            <Stat
              label="Essential / Non-essential"
              value={`${money.format(stats.essentialMonthly)} / ${money.format(stats.nonEssentialMonthly)}`}
              sub={`${formatPercent(essentialShare, settings.locale)} essential per month`}
            />
            <Stat label="Annual total" value={money.format(stats.annualTotal)} sub="real cash across a year" />
          </div>

          {/* Suggestions detected from one-off expenses */}
          <SuggestedRecurring />

          {/* The normalization visual — the centerpiece */}
          <NormalizationChart active={active} scopeId={effectiveScope} onScopeChange={setScopeId} />

          {/* List + upcoming */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <RecurringList recurring={recurring} categories={categoryMap} onEdit={openEdit} />
            </div>
            <div className="lg:col-span-2">
              <UpcomingCharges recurring={recurring} categories={categoryMap} />
            </div>
          </div>
        </div>
      )}

      <RecurringFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        categories={categories}
        baseCurrency={settings.baseCurrency}
      />
    </div>
  );
}
