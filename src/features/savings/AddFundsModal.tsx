import { useState } from "react";
import type { SavingsGoal } from "@/types";
import { Button, Field, Input, Modal, Progress } from "@/components/ui";
import { useMoney } from "@/hooks/useMoney";
import { parseAmount } from "@/lib/currency";
import { DEFAULT_GOAL_COLOR, goalProgress } from "./palette";

interface AddFundsModalProps {
  open: boolean;
  onClose: () => void;
  goal: SavingsGoal | null;
  /** Receives the validated positive amount to add. */
  onAdd: (amount: number) => void;
}

export function AddFundsModal({ open, onClose, goal, onAdd }: AddFundsModalProps) {
  if (!open || !goal) return null;
  return <AddFundsModalInner key={goal.id} open={open} onClose={onClose} goal={goal} onAdd={onAdd} />;
}

function AddFundsModalInner({ open, onClose, goal, onAdd }: AddFundsModalProps & { goal: SavingsGoal }) {
  const money = useMoney();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const parsed = parseAmount(value);
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const projectedTotal = goal.currentAmount + (parsed && parsed > 0 ? parsed : 0);
  const color = goal.color ?? DEFAULT_GOAL_COLOR;

  const submit = () => {
    const amount = parseAmount(value);
    if (amount == null || amount <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    onAdd(amount);
  };

  const quickAdd = (n: number) => {
    setValue(String(n));
    setError(null);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={`Add funds — ${goal.name}`}
      description={`${money.format(goal.currentAmount)} of ${money.format(goal.targetAmount)} saved`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit}>
            Add funds
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field
          label="Amount to add"
          htmlFor="add-funds-amount"
          error={error ?? undefined}
          hint={!error && remaining > 0 ? `${money.format(remaining)} left to reach the target.` : undefined}
        >
          <Input
            id="add-funds-amount"
            inputMode="decimal"
            value={value}
            autoFocus
            placeholder="100"
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
        </Field>

        {remaining > 0 && (
          <div className="flex flex-wrap gap-2">
            {[50, 100, 250].map((n) => (
              <Button key={n} variant="outline" size="sm" onClick={() => quickAdd(n)}>
                +{money.formatWhole(n)}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={() => quickAdd(remaining)}>
              Fill remaining
            </Button>
          </div>
        )}

        <div className="space-y-1.5">
          <Progress value={goalProgress({ currentAmount: projectedTotal, targetAmount: goal.targetAmount })} color={color} />
          <p className="text-xs text-muted-foreground">
            New balance: <span className="font-medium text-foreground">{money.format(projectedTotal)}</span>
            {projectedTotal >= goal.targetAmount && " — target reached!"}
          </p>
        </div>
      </div>
    </Modal>
  );
}
