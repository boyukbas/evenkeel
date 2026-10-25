import { Check } from "lucide-react";
import type { SavingsGoal } from "@/types";
import {
  Badge,
  Button,
  CategoryIcon,
  Field,
  Input,
  Modal,
  Select,
  Textarea,
} from "@/components/ui";
import { useCategories } from "@/hooks/useData";
import { cn } from "@/lib/cn";
import { GOAL_COLORS } from "./palette";
import { type GoalDraft, type GoalFormSeed, useGoalForm } from "./useGoalForm";

interface GoalFormModalProps {
  open: boolean;
  onClose: () => void;
  /** When set, the modal edits this goal; otherwise it creates a new one. */
  goal?: SavingsGoal | null;
  /** Pre-fill values for a new goal (e.g. seeded from a saving opportunity). */
  seed?: GoalFormSeed;
  onSubmit: (draft: GoalDraft) => void;
}

export function GoalFormModal(props: GoalFormModalProps) {
  if (!props.open) return null;
  // Remount per open so the form state always re-seeds from goal/seed.
  return <GoalFormModalInner key={props.goal?.id ?? "new"} {...props} />;
}

function GoalFormModalInner({ open, onClose, goal, seed, onSubmit }: GoalFormModalProps) {
  const categories = useCategories();
  const form = useGoalForm(goal, seed);
  const editing = Boolean(goal);

  const submit = () => {
    const draft = form.build();
    if (!draft) return;
    onSubmit(draft);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? "Edit goal" : "New savings goal"}
      description={editing ? "Update your savings plan." : "Set a target and track your progress toward it."}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit}>
            {editing ? "Save changes" : "Create goal"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Name" htmlFor="goal-name" error={form.error && !form.state.name.trim() ? form.error : undefined}>
          <Input
            id="goal-name"
            value={form.state.name}
            onChange={(e) => form.set("name", e.target.value)}
            placeholder="e.g. Emergency fund"
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Target amount" htmlFor="goal-target">
            <Input
              id="goal-target"
              inputMode="decimal"
              value={form.state.targetAmount}
              onChange={(e) => form.set("targetAmount", e.target.value)}
              placeholder="10,000"
            />
          </Field>
          <Field label="Already saved" htmlFor="goal-current" hint="Defaults to 0.">
            <Input
              id="goal-current"
              inputMode="decimal"
              value={form.state.currentAmount}
              onChange={(e) => form.set("currentAmount", e.target.value)}
              placeholder="0"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Monthly contribution" htmlFor="goal-monthly" hint="Optional — used to project completion.">
            <Input
              id="goal-monthly"
              inputMode="decimal"
              value={form.state.monthlyContribution}
              onChange={(e) => form.set("monthlyContribution", e.target.value)}
              placeholder="250"
            />
          </Field>
          <Field label="Deadline" htmlFor="goal-deadline" hint="Optional target date.">
            <Input
              id="goal-deadline"
              type="date"
              value={form.state.deadline}
              onChange={(e) => form.set("deadline", e.target.value)}
            />
          </Field>
        </div>

        {/* Generic validation error not tied to a specific field. */}
        {form.error && form.state.name.trim() && (
          <p className="text-xs text-danger">{form.error}</p>
        )}

        <Field label="Color">
          <div className="flex flex-wrap gap-2">
            {GOAL_COLORS.map((c) => {
              const selected = form.state.color.toLowerCase() === c.toLowerCase();
              return (
                <button
                  key={c}
                  type="button"
                  aria-label={`Use color ${c}`}
                  aria-pressed={selected}
                  onClick={() => form.set("color", c)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-card transition",
                    selected ? "ring-ring" : "ring-transparent hover:ring-border",
                  )}
                  style={{ backgroundColor: c }}
                >
                  {selected && <Check className="h-4 w-4 text-white" />}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Status" htmlFor="goal-status">
          <Select
            id="goal-status"
            value={form.state.status}
            onChange={(e) => form.set("status", e.target.value as typeof form.state.status)}
          >
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="achieved">Achieved</option>
          </Select>
        </Field>

        <Field
          label="Linked categories"
          hint="Earmark categories whose cuts fund this goal."
        >
          {categories.length === 0 ? (
            <p className="text-xs text-muted-foreground">No categories yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const selected = form.state.linkedCategoryIds.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => form.toggleCategory(cat.id)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition-colors",
                      selected
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:bg-accent",
                    )}
                  >
                    <CategoryIcon category={cat} size="sm" />
                    <span>{cat.name}</span>
                    {selected && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                );
              })}
            </div>
          )}
          {form.state.linkedCategoryIds.length > 0 && (
            <Badge variant="outline" className="mt-1 w-fit">
              {form.state.linkedCategoryIds.length} linked
            </Badge>
          )}
        </Field>

        <Field label="Note" htmlFor="goal-note">
          <Textarea
            id="goal-note"
            value={form.state.note}
            onChange={(e) => form.set("note", e.target.value)}
            placeholder="What is this goal for?"
          />
        </Field>
      </div>
    </Modal>
  );
}
