import { useState } from "react";
import { PiggyBank, Plus } from "lucide-react";
import type { SavingsGoal } from "@/types";
import { PageHeader } from "@/components/layout";
import { Button, ConfirmDialog, EmptyState } from "@/components/ui";
import { useGoals, useCategoryMap } from "@/hooks/useData";
import { useMoney } from "@/hooks/useMoney";
import { addGoal, deleteGoal, updateGoal } from "@/db/repo";
import { toast } from "@/store/toast";
import { SavingsOverview } from "./SavingsOverview";
import { GoalCard } from "./GoalCard";
import { GoalFormModal } from "./GoalFormModal";
import { AddFundsModal } from "./AddFundsModal";
import { SuggestionsSection } from "./SuggestionsSection";
import type { GoalDraft, GoalFormSeed } from "./useGoalForm";

/** Status sort weight: active first, then paused, achieved last. */
const STATUS_ORDER: Record<SavingsGoal["status"], number> = { active: 0, paused: 1, achieved: 2 };

export function SavingsPage() {
  const goals = useGoals();
  const categoryMap = useCategoryMap();
  const money = useMoney();

  // Form modal: either editing an existing goal or creating from an optional seed.
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [seed, setSeed] = useState<GoalFormSeed | undefined>(undefined);

  const [funding, setFunding] = useState<SavingsGoal | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SavingsGoal | null>(null);

  const sorted = [...goals].sort((a, b) => {
    const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    return s !== 0 ? s : a.name.localeCompare(b.name);
  });

  const openNew = (s?: GoalFormSeed) => {
    setEditing(null);
    setSeed(s);
    setFormOpen(true);
  };

  const openEdit = (goal: SavingsGoal) => {
    setEditing(goal);
    setSeed(undefined);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setSeed(undefined);
  };

  const submitForm = async (draft: GoalDraft) => {
    try {
      if (editing) {
        await updateGoal(editing.id, draft);
        toast.success("Goal updated", draft.name);
      } else {
        await addGoal(draft);
        toast.success("Goal created", draft.name);
      }
      closeForm();
    } catch {
      toast.error("Couldn't save goal", "Please try again.");
    }
  };

  const addFunds = async (amount: number) => {
    if (!funding) return;
    const goal = funding;
    const nextAmount = goal.currentAmount + amount;
    const reachedTarget = nextAmount >= goal.targetAmount && goal.status !== "achieved";
    try {
      await updateGoal(goal.id, {
        currentAmount: nextAmount,
        ...(reachedTarget ? { status: "achieved" as const } : {}),
      });
      if (reachedTarget) {
        toast.success(`${goal.name} achieved!`, `Reached ${money.format(goal.targetAmount)}.`);
      } else {
        toast.success("Funds added", `${money.format(amount)} toward ${goal.name}.`);
      }
      setFunding(null);
    } catch {
      toast.error("Couldn't add funds", "Please try again.");
    }
  };

  const toggleStatus = async (goal: SavingsGoal) => {
    const next: SavingsGoal["status"] = goal.status === "active" ? "paused" : "active";
    try {
      await updateGoal(goal.id, { status: next });
      toast.success(next === "paused" ? "Goal paused" : "Goal resumed", goal.name);
    } catch {
      toast.error("Couldn't update goal", "Please try again.");
    }
  };

  const markAchieved = async (goal: SavingsGoal) => {
    try {
      await updateGoal(goal.id, { status: "achieved" });
      toast.success("Marked achieved", goal.name);
    } catch {
      toast.error("Couldn't update goal", "Please try again.");
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const goal = pendingDelete;
    try {
      await deleteGoal(goal.id);
      toast.success("Goal deleted", goal.name);
    } catch {
      toast.error("Couldn't delete goal", "Please try again.");
    } finally {
      setPendingDelete(null);
    }
  };

  const hasGoals = goals.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Savings Plans"
        description="Set goals and fund them from the savings you uncover."
        actions={
          <Button variant="primary" onClick={() => openNew()}>
            <Plus className="h-4 w-4" />
            New goal
          </Button>
        }
      />

      <SavingsOverview goals={goals} />

      {hasGoals ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              categoryMap={categoryMap}
              onAddFunds={setFunding}
              onEdit={openEdit}
              onDelete={setPendingDelete}
              onToggleStatus={toggleStatus}
              onMarkAchieved={markAchieved}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={PiggyBank}
          title="Create your first savings goal"
          description="Pick a target — a trip, an emergency fund, a new laptop — and watch your progress. The suggestions below can seed one from money you're already overspending."
          action={
            <Button variant="primary" onClick={() => openNew()}>
              <Plus className="h-4 w-4" />
              New goal
            </Button>
          }
        />
      )}

      <SuggestionsSection onApply={openNew} />

      <GoalFormModal
        open={formOpen}
        onClose={closeForm}
        goal={editing}
        seed={seed}
        onSubmit={submitForm}
      />

      <AddFundsModal open={Boolean(funding)} onClose={() => setFunding(null)} goal={funding} onAdd={addFunds} />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Delete this goal?"
        message={
          pendingDelete
            ? `"${pendingDelete.name}" and its progress will be permanently removed.`
            : undefined
        }
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
