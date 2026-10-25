import { CalendarClock, CheckCircle2, PauseCircle, PlayCircle, Plus, Trash2, TrendingUp } from "lucide-react";
import type { Category, ID, SavingsGoal } from "@/types";
import { Badge, Button, CategoryIcon, Card, Dot, Progress } from "@/components/ui";
import { useMoney } from "@/hooks/useMoney";
import { formatDateMedium, formatMonthLong } from "@/lib/date";
import { formatPercent } from "@/lib/currency";
import { DEFAULT_GOAL_COLOR, goalProgress, STATUS_META } from "./palette";
import { projectGoal } from "./projection";

interface GoalCardProps {
  goal: SavingsGoal;
  categoryMap: Map<ID, Category>;
  onAddFunds: (goal: SavingsGoal) => void;
  onEdit: (goal: SavingsGoal) => void;
  onDelete: (goal: SavingsGoal) => void;
  /** Cycle active <-> paused (and reactivate an achieved goal). */
  onToggleStatus: (goal: SavingsGoal) => void;
  onMarkAchieved: (goal: SavingsGoal) => void;
}

export function GoalCard({
  goal,
  categoryMap,
  onAddFunds,
  onEdit,
  onDelete,
  onToggleStatus,
  onMarkAchieved,
}: GoalCardProps) {
  const money = useMoney();
  const color = goal.color ?? DEFAULT_GOAL_COLOR;
  const fraction = goalProgress(goal);
  const status = STATUS_META[goal.status];
  const projection = projectGoal(goal);

  const linked = goal.linkedCategoryIds
    .map((id) => categoryMap.get(id))
    .filter((c): c is Category => Boolean(c));

  const achieved = goal.status === "achieved";

  return (
    <Card className="flex flex-col gap-4 p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Dot color={color} className="h-3 w-3" />
          <h3 className="truncate text-base font-semibold tracking-tight">{goal.name}</h3>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <Progress value={fraction} color={color} />
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{money.format(goal.currentAmount)}</span> of{" "}
            {money.format(goal.targetAmount)}
          </span>
          <span className="font-semibold" style={{ color }}>
            {formatPercent(fraction, money.locale)}
          </span>
        </div>
      </div>

      {/* Contribution + projection */}
      <div className="space-y-1.5 text-sm">
        {goal.monthlyContribution != null && goal.monthlyContribution > 0 && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4 shrink-0" />
            <span>
              <span className="font-medium text-foreground">{money.format(goal.monthlyContribution)}</span> / month
            </span>
          </div>
        )}

        {projection && (
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <CalendarClock className="h-4 w-4 shrink-0" />
            {projection.alreadyFunded ? (
              <span>Fully funded</span>
            ) : (
              <span>
                On track to finish{" "}
                <span className="font-medium text-foreground">{formatMonthLong(projection.finishMonth)}</span>
              </span>
            )}
            {projection.onTrack != null && !projection.alreadyFunded && (
              <Badge variant={projection.onTrack ? "success" : "danger"}>
                {projection.onTrack ? "On track" : "Behind"}
              </Badge>
            )}
          </div>
        )}

        {goal.deadline && (
          <p className="pl-6 text-xs text-muted-foreground">Deadline {formatDateMedium(goal.deadline, money.locale)}</p>
        )}
      </div>

      {goal.note && <p className="text-sm text-muted-foreground">{goal.note}</p>}

      {/* Linked categories */}
      {linked.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {linked.map((cat) => (
            <span
              key={cat.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border py-1 pl-1 pr-2.5 text-xs text-muted-foreground"
            >
              <CategoryIcon category={cat} size="sm" />
              {cat.name}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {!achieved && (
          <Button variant="primary" size="sm" onClick={() => onAddFunds(goal)}>
            <Plus className="h-4 w-4" />
            Add funds
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => onEdit(goal)}>
          Edit
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onToggleStatus(goal)}>
          {achieved ? (
            <>
              <PlayCircle className="h-4 w-4" />
              Reactivate
            </>
          ) : goal.status === "paused" ? (
            <>
              <PlayCircle className="h-4 w-4" />
              Resume
            </>
          ) : (
            <>
              <PauseCircle className="h-4 w-4" />
              Pause
            </>
          )}
        </Button>
        {!achieved && <MarkAchievedButton goal={goal} onMark={onMarkAchieved} />}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete goal"
          title="Delete goal"
          className="ml-auto text-muted-foreground hover:text-danger"
          onClick={() => onDelete(goal)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

/** Small standalone "mark achieved" affordance some callers may want; exported for reuse. */
export function MarkAchievedButton({ goal, onMark }: { goal: SavingsGoal; onMark: (goal: SavingsGoal) => void }) {
  if (goal.status === "achieved") return null;
  return (
    <Button variant="ghost" size="sm" onClick={() => onMark(goal)}>
      <CheckCircle2 className="h-4 w-4" />
      Mark achieved
    </Button>
  );
}
