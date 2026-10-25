import { useState } from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { DatabaseBackup, X } from "lucide-react";
import { useSettings } from "@/hooks/useData";
import { exportData } from "@/db/repo";
import { downloadFile } from "@/lib/csv";
import { toast } from "@/store/toast";

/** A gentle nudge to back up if it's been 30+ days (or never) — only on real data. */
export function BackupReminder() {
  const settings = useSettings();
  const [dismissed, setDismissed] = useState(false);

  // Don't nag while the user is just exploring sample data.
  if (settings.hasSeededDemo || dismissed) return null;

  const last = settings.lastBackupAt ? parseISO(settings.lastBackupAt) : null;
  const stale = !last || differenceInCalendarDays(new Date(), last) >= 30;
  if (!stale) return null;

  const doExport = async () => {
    try {
      const data = await exportData();
      const stamp = new Date().toISOString().slice(0, 10);
      downloadFile(`evenkeel-backup-${stamp}.json`, JSON.stringify(data, null, 2), "application/json");
      toast.success("Backup exported", "Keep it somewhere safe.");
      setDismissed(true);
    } catch {
      toast.error("Couldn't export backup", "Please try again.");
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 border-b border-warning/20 bg-warning/10 px-4 py-2 text-sm lg:px-6">
      <div className="flex items-center gap-2 text-foreground">
        <DatabaseBackup className="h-4 w-4 shrink-0 text-warning" />
        <span>
          {last ? "It's been a while since your last backup." : "You haven't backed up yet."}{" "}
          Your data lives only in this browser.
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={doExport} className="rounded-md px-2 py-1 text-sm font-medium text-warning hover:bg-warning/10">
          Export backup
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
