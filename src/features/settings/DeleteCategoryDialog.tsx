import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { Category } from "@/types";
import { Button, Field, Modal, Select } from "@/components/ui";
import { deleteCategory } from "@/db/repo";
import { toast } from "@/store/toast";

interface DeleteCategoryDialogProps {
  open: boolean;
  onClose: () => void;
  /** The category being deleted. */
  category: Category | null;
  /** All categories (used to build the reassignment list). */
  categories: Category[];
  /** How many expenses currently use this category. */
  usageCount: number;
}

export function DeleteCategoryDialog({
  open,
  onClose,
  category,
  categories,
  usageCount,
}: DeleteCategoryDialogProps) {
  const others = categories.filter((c) => c.id !== category?.id);
  const [reassignToId, setReassignToId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setReassignToId(others[0]?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category]);

  const canDelete = others.length > 0 && reassignToId !== "";

  const handleDelete = async () => {
    if (!category || !canDelete) return;
    setSaving(true);
    try {
      await deleteCategory(category.id, reassignToId);
      const target = others.find((c) => c.id === reassignToId);
      toast.success("Category deleted", target ? `Moved items to ${target.name}` : undefined);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Could not delete category");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={`Delete "${category?.name ?? ""}"?`}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            loading={saving}
            disabled={!canDelete}
          >
            Delete category
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="text-sm text-foreground">
            {usageCount > 0 ? (
              <>
                <span className="font-semibold">
                  {usageCount} {usageCount === 1 ? "expense" : "expenses"}
                </span>{" "}
                use this category. They (and any recurring items) will be moved to the category you
                pick below.
              </>
            ) : (
              <>No expenses use this category, but any recurring items will be reassigned.</>
            )}
          </p>
        </div>

        {others.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You can't delete the last category — create another one first.
          </p>
        ) : (
          <Field label="Reassign items to" htmlFor="cat-reassign">
            <Select
              id="cat-reassign"
              value={reassignToId}
              onChange={(e) => setReassignToId(e.target.value)}
            >
              {others.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
    </Modal>
  );
}
