import { useRef, useState } from "react";
import {
  AlertTriangle,
  Download,
  FileSpreadsheet,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { BackupFile } from "@/db/repo";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
} from "@/components/ui";
import { useCategoryMap, useExpenses } from "@/hooks/useData";
import {
  clearTransactions,
  exportData,
  importData,
  isBackupFile,
  reseedDemo,
  resetAll,
} from "@/db/repo";
import { downloadFile, toCsv } from "@/lib/csv";
import { toast } from "@/store/toast";
import { todayStamp } from "./constants";

type PendingConfirm = "import" | "reseed" | "clear" | "reset" | null;

const CSV_HEADER = [
  "Date",
  "Amount",
  "Currency",
  "Category",
  "Description",
  "Payee",
  "Method",
  "Tags",
  "Notes",
];

export function DataBackupCard() {
  const expenses = useExpenses();
  const categoryMap = useCategoryMap();

  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingConfirm>(null);
  // Parsed backup awaiting the import confirmation.
  const [stagedBackup, setStagedBackup] = useState<BackupFile | null>(null);
  const [busy, setBusy] = useState(false);

  /* -------------------------------- Export -------------------------------- */

  const handleExportJson = async () => {
    try {
      const data = await exportData();
      downloadFile(
        `evenkeel-backup-${todayStamp()}.json`,
        JSON.stringify(data, null, 2),
        "application/json",
      );
      toast.success("Backup exported");
    } catch (err) {
      console.error(err);
      toast.error("Could not export backup");
    }
  };

  const handleExportCsv = () => {
    if (expenses.length === 0) {
      toast.error("No expenses to export");
      return;
    }
    const rows: Array<Array<string | number>> = [CSV_HEADER];
    for (const e of expenses) {
      rows.push([
        e.date,
        e.amount,
        e.currency,
        categoryMap.get(e.categoryId)?.name ?? "Uncategorized",
        e.description ?? "",
        e.payee ?? "",
        e.method ?? "",
        (e.tags ?? []).join(", "),
        e.notes ?? "",
      ]);
    }
    downloadFile("evenkeel-expenses.csv", toCsv(rows), "text/csv");
    toast.success("Expenses exported", `${expenses.length} rows`);
  };

  /* -------------------------------- Import -------------------------------- */

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!isBackupFile(parsed)) {
        toast.error("Not a valid EvenKeel backup file");
        return;
      }
      setStagedBackup(parsed);
      setPending("import");
    } catch (err) {
      console.error(err);
      toast.error("Could not read that file", "Make sure it's a valid .json backup");
    }
  };

  const runImport = async () => {
    if (!stagedBackup) return;
    setBusy(true);
    try {
      await importData(stagedBackup);
      toast.success("Backup restored");
    } catch (err) {
      console.error(err);
      toast.error("Could not restore backup");
    } finally {
      setStagedBackup(null);
      setBusy(false);
    }
  };

  /* ----------------------------- Lifecycle ops ---------------------------- */

  const runReseed = async () => {
    setBusy(true);
    try {
      await reseedDemo();
      toast.success("Sample data loaded");
    } catch (err) {
      console.error(err);
      toast.error("Could not load sample data");
    } finally {
      setBusy(false);
    }
  };

  const runClear = async () => {
    setBusy(true);
    try {
      await clearTransactions();
      toast.success("Transactions cleared", "Categories and settings kept");
    } catch (err) {
      console.error(err);
      toast.error("Could not clear transactions");
    } finally {
      setBusy(false);
    }
  };

  const runReset = async () => {
    setBusy(true);
    try {
      await resetAll();
      toast.success("Everything deleted", "Starting fresh");
    } catch (err) {
      console.error(err);
      toast.error("Could not reset");
    } finally {
      setBusy(false);
    }
  };

  const closeConfirm = () => {
    if (busy) return;
    if (pending === "import") setStagedBackup(null);
    setPending(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data & backup</CardTitle>
        <CardDescription>
          Export a copy, restore from a backup, or reset your workspace. Everything stays on this
          device.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Backup / restore */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ActionTile
            icon={Download}
            title="Export backup (.json)"
            description="A full copy of everything — settings, categories, expenses, recurring, and goals."
            action={
              <Button variant="secondary" size="sm" onClick={handleExportJson}>
                <Download className="h-4 w-4" />
                Export
              </Button>
            }
          />
          <ActionTile
            icon={Upload}
            title="Import backup"
            description="Restore from a previously exported .json file. This replaces all current data."
            action={
              <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" />
                Choose file
              </Button>
            }
          />
          <ActionTile
            icon={FileSpreadsheet}
            title="Export expenses (.csv)"
            description="A spreadsheet of every expense — open in Excel, Numbers, or Sheets."
            action={
              <Button variant="secondary" size="sm" onClick={handleExportCsv}>
                <FileSpreadsheet className="h-4 w-4" />
                Export CSV
              </Button>
            }
          />
          <ActionTile
            icon={Sparkles}
            title="Load sample data"
            description="Replace transactions with a generated demo dataset to explore the app."
            action={
              <Button variant="secondary" size="sm" onClick={() => setPending("reseed")}>
                <Sparkles className="h-4 w-4" />
                Load sample
              </Button>
            }
          />
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFilePicked}
          className="hidden"
        />

        {/* Danger zone */}
        <div className="space-y-3 rounded-xl border border-danger/40 bg-danger/5 p-4">
          <div className="flex items-center gap-2 text-danger">
            <AlertTriangle className="h-4 w-4" />
            <h4 className="text-sm font-semibold">Danger zone</h4>
          </div>

          <DangerRow
            title="Clear transactions"
            description="Delete all expenses, recurring items, and goals. Keeps your categories and settings."
            action={
              <Button variant="outline" size="sm" onClick={() => setPending("clear")}>
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
            }
          />
          <DangerRow
            title="Start fresh (delete everything)"
            description="Wipe all data and rebuild an empty workspace with the default categories."
            action={
              <Button variant="danger" size="sm" onClick={() => setPending("reset")}>
                <Trash2 className="h-4 w-4" />
                Delete everything
              </Button>
            }
          />
        </div>
      </CardContent>

      {/* Confirmations */}
      <ConfirmDialog
        open={pending === "import"}
        onClose={closeConfirm}
        onConfirm={runImport}
        title="Restore this backup?"
        message="This replaces ALL of your current data — settings, categories, expenses, recurring, and goals — with the contents of the backup file. This can't be undone."
        confirmLabel="Replace & restore"
        danger
      />
      <ConfirmDialog
        open={pending === "reseed"}
        onClose={closeConfirm}
        onConfirm={runReseed}
        title="Load sample data?"
        message="This replaces your current transactions with a generated demo dataset. Categories and settings are kept."
        confirmLabel="Load sample data"
      />
      <ConfirmDialog
        open={pending === "clear"}
        onClose={closeConfirm}
        onConfirm={runClear}
        title="Clear all transactions?"
        message="Deletes every expense, recurring item, and goal. Your categories and settings stay. This can't be undone."
        confirmLabel="Clear transactions"
        danger
      />
      <ConfirmDialog
        open={pending === "reset"}
        onClose={closeConfirm}
        onConfirm={runReset}
        title="Delete everything and start fresh?"
        message="Wipes all data and rebuilds an empty workspace with the default categories. This can't be undone — export a backup first if you might want it back."
        confirmLabel="Delete everything"
        danger
      />
    </Card>
  );
}

interface TileProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action: React.ReactNode;
}

function ActionTile({ icon: Icon, title, description, action }: TileProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div className="space-y-0.5">
          <h4 className="text-sm font-medium text-foreground">{title}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-auto">{action}</div>
    </div>
  );
}

function DangerRow({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-0.5">
        <h5 className="text-sm font-medium text-foreground">{title}</h5>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}
