import { useEffect, useState } from "react";
import { Button, Field, Input, Modal } from "@/components/ui";
import { useMoney } from "@/hooks/useMoney";
import { parseAmount } from "@/lib/currency";

interface SetBudgetModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  current: number | null | undefined;
  /** A suggested figure (e.g. trailing average) the user can apply with one click. */
  suggestion?: number;
  onSave: (amount: number | null) => void;
}

export function SetBudgetModal({ open, onClose, title, description, current, suggestion, onSave }: SetBudgetModalProps) {
  const money = useMoney();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(current && current > 0 ? String(current) : "");
      setError(null);
    }
  }, [open, current]);

  const save = () => {
    const amount = parseAmount(value);
    if (amount == null || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    onSave(Math.round(amount * 100) / 100);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          {current && current > 0 ? (
            <Button
              variant="ghost"
              className="mr-auto text-danger hover:bg-danger/10"
              onClick={() => {
                onSave(null);
                onClose();
              }}
            >
              Remove budget
            </Button>
          ) : null}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Monthly budget" error={error ?? undefined}>
          <Input
            autoFocus
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="0.00"
          />
        </Field>
        {suggestion != null && suggestion > 0 && (
          <button
            type="button"
            onClick={() => setValue(String(suggestion))}
            className="text-xs text-primary underline-offset-2 hover:underline"
          >
            Use suggested {money.format(suggestion)} (based on your recent average)
          </button>
        )}
      </div>
    </Modal>
  );
}
