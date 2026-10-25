import { Suspense, useEffect, useMemo, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { Sparkles, X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useExpenses, useSettings } from "@/hooks/useData";
import { usePeriod } from "@/store/period";
import { currentMonthKey, toMonthKey } from "@/lib/date";
import { Spinner } from "@/components/ui";
import { CommandPalette } from "@/components/command/CommandPalette";
import { BackupReminder } from "@/components/feedback/BackupReminder";
import { cn } from "@/lib/cn";

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const settings = useSettings();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // On first load, open on the most recent month that has data (unless the
  // current month already has activity, or the user has navigated). Avoids
  // landing on an empty current month after importing historical statements.
  const expenses = useExpenses();
  const initOnce = usePeriod((s) => s.initOnce);
  const { latestMonth, currentHasData } = useMemo(() => {
    const cur = currentMonthKey();
    let max = "";
    let curData = false;
    for (const e of expenses) {
      if (e.date > max) max = e.date;
      if (!curData && toMonthKey(e.date) === cur) curData = true;
    }
    return { latestMonth: max ? toMonthKey(max) : null, currentHasData: curData };
  }, [expenses]);
  useEffect(() => {
    if (latestMonth && !currentHasData) initOnce(latestMonth);
  }, [latestMonth, currentHasData, initOnce]);
  const showDemoBanner = settings.hasSeededDemo && !bannerDismissed;

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border lg:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-border shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-2 top-2 rounded-md p-2 text-muted-foreground hover:bg-accent"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <Topbar onMenuClick={() => setMobileOpen(true)} />

        {showDemoBanner && (
          <div className="flex items-center justify-between gap-3 border-b border-primary/20 bg-primary/10 px-4 py-2 text-sm lg:px-6">
            <div className="flex items-center gap-2 text-foreground">
              <Sparkles className="h-4 w-4 shrink-0 text-primary" />
              <span>
                You're exploring <strong>sample data</strong>.{" "}
                <Link to="/settings" className="font-medium text-primary underline-offset-2 hover:underline">
                  Start fresh in Settings
                </Link>{" "}
                when you're ready.
              </span>
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <BackupReminder />

        <main className={cn("mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8")}>
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-24">
                <Spinner className="h-6 w-6" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>

      <CommandPalette />
    </div>
  );
}
