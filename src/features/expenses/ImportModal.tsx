import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Copy, Download, FileUp, Sparkles } from "lucide-react";
import type { Category } from "@/types";
import { Badge, Button, Field, Modal, Select, Textarea } from "@/components/ui";
import { useExpenses, useSettings } from "@/hooks/useData";
import { bulkAddExpenses } from "@/db/repo";
import { downloadFile, toCsv } from "@/lib/csv";
import { formatDateMedium, todayISO } from "@/lib/date";
import { formatCurrency } from "@/lib/currency";
import { buildMerchantIndex, dedupeDrafts, fingerprintSet, suggestCategoryId } from "@/lib/categorization";
import { toast } from "@/store/toast";
import { autoParse, CSV_PRESETS, parseExpenseCsv, TEMPLATE_HEADERS, type ImportDraft } from "./csvImport";
import { buildAiPrompt } from "./aiPrompt";

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
}

type ResolvedDraft = ImportDraft & { guessed: boolean };

const MAX_REVIEW_ROWS = 100;

export function ImportModal({ open, onClose, categories }: ImportModalProps) {
  const settings = useSettings();
  const existing = useExpenses();
  const [text, setText] = useState("");
  const [presetId, setPresetId] = useState("auto");
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [aiOpen, setAiOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const otherId = useMemo(
    () => categories.find((c) => c.name.trim().toLowerCase() === "other")?.id ?? categories[0]?.id ?? "",
    [categories],
  );

  const parsed = useMemo(() => {
    if (!text.trim()) return { drafts: [] as ImportDraft[], skipped: 0, detectedLabel: null as string | null };
    if (presetId === "auto") {
      const { preset, result } = autoParse(text, categories, settings.baseCurrency);
      return { ...result, detectedLabel: result.drafts.length > 0 ? preset.label : null };
    }
    const preset = CSV_PRESETS.find((p) => p.id === presetId) ?? CSV_PRESETS[0];
    return { ...parseExpenseCsv(text, categories, settings.baseCurrency, preset), detectedLabel: null };
  }, [text, presetId, categories, settings.baseCurrency]);

  const merchantIndex = useMemo(() => buildMerchantIndex(existing), [existing]);

  const { unique, duplicates } = useMemo(() => {
    const resolved: ResolvedDraft[] = parsed.drafts.map((d) => ({
      ...d,
      guessed: !d.categoryId,
      categoryId: d.categoryId || suggestCategoryId(d.payee || d.description, merchantIndex) || otherId,
    }));
    return dedupeDrafts(resolved, fingerprintSet(existing));
  }, [parsed.drafts, merchantIndex, otherId, existing]);

  // Re-seed manual overrides whenever the source/format changes.
  useEffect(() => {
    setOverrides({});
  }, [text, presetId]);

  const readyCount = unique.length;
  const activePreset = presetId === "auto" ? null : CSV_PRESETS.find((p) => p.id === presetId);
  const showPreview = text.trim().length > 0;

  const reset = () => {
    setText("");
    setPresetId("auto");
    setOverrides({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setText(await file.text());
    } catch (err) {
      console.error(err);
      toast.error("Could not read that file");
    }
  };

  const handleDownloadTemplate = () => {
    const csv = toCsv([
      TEMPLATE_HEADERS,
      [todayISO(), "42.50", categories[0]?.name ?? "Groceries", "Weekly shop", "Local Market", "weekly, food", ""],
    ]);
    downloadFile("evenkeel-expenses-template.csv", csv, "text/csv");
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(buildAiPrompt(categories.map((c) => c.name)));
      toast.success("Prompt copied", "Paste it into your AI with your bank export.");
    } catch {
      toast.error("Couldn't copy", "Select the text and copy manually.");
    }
  };

  const handleImport = async () => {
    if (readyCount === 0) {
      toast.error("Nothing to import");
      return;
    }
    setImporting(true);
    try {
      await bulkAddExpenses(
        unique.map((d, i) => ({
          date: d.date,
          amount: d.amount,
          currency: settings.baseCurrency,
          categoryId: overrides[i] ?? d.categoryId,
          description: d.description,
          payee: d.payee,
          tags: d.tags,
          notes: d.notes,
        })),
      );
      toast.success(
        `Imported ${readyCount} ${readyCount === 1 ? "expense" : "expenses"}`,
        duplicates > 0 ? `${duplicates} duplicate${duplicates === 1 ? "" : "s"} skipped` : undefined,
      );
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error("Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="xl"
      title="Import expenses from CSV"
      description="Upload a bank export or paste rows. Categories are auto-filled from your history — review before importing."
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={importing}>
            Cancel
          </Button>
          <Button onClick={handleImport} loading={importing} disabled={readyCount === 0}>
            Import {readyCount > 0 ? readyCount : ""}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* AI helper */}
        <div className="rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setAiOpen((v) => !v)}
            className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium"
          >
            {aiOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <Sparkles className="h-4 w-4 text-primary" />
            Categorize with AI first?
          </button>
          {aiOpen && (
            <div className="space-y-2 border-t border-border p-4">
              <p className="text-xs text-muted-foreground">
                Copy this prompt into your AI, paste your bank export after it, then bring the CSV it returns back here.
                (Heads up: that sends your transactions to whichever AI you use — EvenKeel itself keeps everything on
                this device.)
              </p>
              <pre className="max-h-32 overflow-auto rounded-md bg-muted/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
                {buildAiPrompt(categories.map((c) => c.name))}
              </pre>
              <Button variant="outline" size="sm" onClick={copyPrompt}>
                <Copy className="h-4 w-4" />
                Copy prompt
              </Button>
            </div>
          )}
        </div>

        <Field label="Format" hint={activePreset?.description}>
          <Select value={presetId} onChange={(e) => setPresetId(e.target.value)}>
            <option value="auto">Auto-detect</option>
            {CSV_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <FileUp className="h-4 w-4" />
            Choose CSV file
          </Button>
          <span className="text-sm text-muted-foreground">or paste below</span>
          <Button variant="ghost" size="sm" onClick={handleDownloadTemplate} className="ml-auto">
            <Download className="h-4 w-4" />
            Download template
          </Button>
        </div>

        <Field label="CSV content" htmlFor="import-text">
          <Textarea
            id="import-text"
            placeholder={"Date,Description,Amount\n2026-05-01,Local Market,-42.50"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[120px] font-mono text-xs"
          />
        </Field>

        {showPreview && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-medium text-foreground">{readyCount} to import</span>
              {duplicates > 0 && <span className="text-muted-foreground">· {duplicates} duplicate{duplicates === 1 ? "" : "s"} skipped</span>}
              {parsed.skipped > 0 && <span className="text-muted-foreground">· {parsed.skipped} non-expense/invalid skipped</span>}
              {parsed.detectedLabel && <span className="text-muted-foreground">· detected: {parsed.detectedLabel}</span>}
            </div>

            {readyCount === 0 ? (
              <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
                No new rows to import. Ensure there's a header row with a date and an amount (or debit) column, or pick a
                specific format above. Already-imported rows are skipped automatically.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/80 text-xs text-muted-foreground backdrop-blur">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Date</th>
                        <th className="px-3 py-2 text-left font-medium">Description</th>
                        <th className="px-3 py-2 text-right font-medium">Amount</th>
                        <th className="px-3 py-2 text-left font-medium">Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {unique.slice(0, MAX_REVIEW_ROWS).map((d, i) => (
                        <tr key={i} className="align-middle">
                          <td className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">{formatDateMedium(d.date)}</td>
                          <td className="px-3 py-1.5">
                            <span className="line-clamp-1">{d.description || d.payee || "—"}</span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">
                            {formatCurrency(d.amount, settings.baseCurrency, settings.locale)}
                          </td>
                          <td className="px-3 py-1.5">
                            <div className="flex items-center gap-1.5">
                              <select
                                value={overrides[i] ?? d.categoryId}
                                onChange={(e) => setOverrides((o) => ({ ...o, [i]: e.target.value }))}
                                className="h-8 w-full max-w-[180px] rounded-md border border-input bg-background px-2 text-xs focus:border-ring focus:outline-none"
                              >
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                              {d.guessed && overrides[i] === undefined && (
                                <Badge variant="outline" title="Auto-filled from your history">auto</Badge>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {readyCount > MAX_REVIEW_ROWS && (
                  <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                    Showing the first {MAX_REVIEW_ROWS}. All {readyCount} will import; tweak any category afterwards on the
                    Expenses page.
                  </p>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Rows marked <Badge variant="outline">auto</Badge> were categorized from your history. Anything unknown
              defaults to “Other”.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
