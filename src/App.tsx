import { lazy, Suspense, useEffect, useState } from "react";
import { createBrowserRouter, Link, RouterProvider } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { Toaster } from "@/components/feedback/Toaster";
import { Logo } from "@/components/layout/Brand";
import { Button, Spinner } from "@/components/ui";
import { ensureInitialized } from "@/db/repo";

// Route-level code splitting keeps the initial bundle (and Recharts) off the
// critical path — each page loads on first visit.
const DashboardPage = lazy(() => import("@/features/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const ExpensesPage = lazy(() => import("@/features/expenses/ExpensesPage").then((m) => ({ default: m.ExpensesPage })));
const RecurringPage = lazy(() => import("@/features/recurring/RecurringPage").then((m) => ({ default: m.RecurringPage })));
const BudgetsPage = lazy(() => import("@/features/budgets/BudgetsPage").then((m) => ({ default: m.BudgetsPage })));
const InsightsPage = lazy(() => import("@/features/insights/InsightsPage").then((m) => ({ default: m.InsightsPage })));
const ForecastPage = lazy(() => import("@/features/forecast/ForecastPage").then((m) => ({ default: m.ForecastPage })));
const SimulatorPage = lazy(() => import("@/features/simulator/SimulatorPage").then((m) => ({ default: m.SimulatorPage })));
const SavingsPage = lazy(() => import("@/features/savings/SavingsPage").then((m) => ({ default: m.SavingsPage })));
const SettingsPage = lazy(() => import("@/features/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const ReportPage = lazy(() => import("@/features/reports/ReportPage").then((m) => ({ default: m.ReportPage })));

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="text-5xl font-semibold">404</p>
      <p className="text-muted-foreground">That page drifted off course.</p>
      <Link to="/">
        <Button>Back to dashboard</Button>
      </Link>
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "expenses", element: <ExpensesPage /> },
      { path: "recurring", element: <RecurringPage /> },
      { path: "budgets", element: <BudgetsPage /> },
      { path: "insights", element: <InsightsPage /> },
      { path: "forecast", element: <ForecastPage /> },
      { path: "simulator", element: <SimulatorPage /> },
      { path: "savings", element: <SavingsPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "*", element: <NotFound /> },
    ],
  },
  {
    // Standalone, print-optimized route — rendered outside the app shell.
    path: "/report",
    element: (
      <Suspense fallback={<Splash />}>
        <ReportPage />
      </Suspense>
    ),
  },
]);

function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <Logo className="h-12 w-12" />
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="h-4 w-4" />
        Loading your data…
      </div>
    </div>
  );
}

function Bootstrap({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    ensureInitialized()
      .catch((e) => console.error("Initialization failed", e))
      .finally(() => setReady(true));
  }, []);
  if (!ready) return <Splash />;
  return <>{children}</>;
}

export function AppRoot() {
  return (
    <ThemeProvider>
      <Bootstrap>
        <RouterProvider router={router} />
      </Bootstrap>
      <Toaster />
    </ThemeProvider>
  );
}
