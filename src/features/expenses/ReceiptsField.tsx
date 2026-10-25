import { useRef, useState } from "react";
import { FileText, Paperclip, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui";
import { useAttachments } from "@/hooks/useData";
import { addAttachment, deleteAttachment } from "@/db/repo";
import { toast } from "@/store/toast";

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB per file

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function prettySize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Attach receipt images/PDFs to an expense (edit mode only — needs an id). */
export function ReceiptsField({ expenseId }: { expenseId: string | null }) {
  const attachments = useAttachments(expenseId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  if (!expenseId) {
    return (
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">Receipts</p>
        <p className="rounded-lg border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
          Save the expense first, then reopen it to attach receipts.
        </p>
      </div>
    );
  }

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setBusy(true);
    try {
      for (const file of files) {
        if (file.size > MAX_BYTES) {
          toast.error(`"${file.name}" is too large`, "Max 4 MB per file.");
          continue;
        }
        const dataUrl = await readAsDataUrl(file);
        await addAttachment({ expenseId, name: file.name, type: file.type || "application/octet-stream", dataUrl, size: file.size });
      }
      toast.success("Receipt attached");
    } catch {
      toast.error("Couldn't attach file");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteAttachment(id);
      toast.success("Receipt removed");
    } catch {
      toast.error("Couldn't remove receipt");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          Receipts {attachments.length > 0 && <span className="text-muted-foreground">({attachments.length})</span>}
        </p>
        <input ref={inputRef} type="file" accept="image/*,application/pdf" multiple onChange={onFiles} className="hidden" />
        <Button type="button" variant="outline" size="sm" loading={busy} onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4" />
          Add file
        </Button>
      </div>

      {attachments.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {attachments.map((a) => (
            <div key={a.id} className="group relative overflow-hidden rounded-lg border border-border bg-muted/40">
              {a.type.startsWith("image/") ? (
                <a href={a.dataUrl} target="_blank" rel="noreferrer">
                  <img src={a.dataUrl} alt={a.name} className="h-24 w-full object-cover" />
                </a>
              ) : (
                <a
                  href={a.dataUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-24 w-full flex-col items-center justify-center gap-1 text-muted-foreground"
                >
                  <FileText className="h-7 w-7" />
                  <span className="px-2 text-center text-[10px]">{a.name}</span>
                </a>
              )}
              <div className="flex items-center justify-between gap-1 px-2 py-1">
                <span className="truncate text-[10px] text-muted-foreground">{prettySize(a.size)}</span>
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  className="rounded p-1 text-muted-foreground hover:bg-danger/10 hover:text-danger"
                  aria-label={`Remove ${a.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
