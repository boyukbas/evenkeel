import {
  Gauge,
  LayoutDashboard,
  Lightbulb,
  PiggyBank,
  ReceiptText,
  Repeat,
  Settings,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/expenses", label: "Expenses", icon: ReceiptText },
  { to: "/recurring", label: "Recurring", icon: Repeat },
  { to: "/budgets", label: "Budgets", icon: Gauge },
  { to: "/insights", label: "Insights", icon: Lightbulb },
  { to: "/forecast", label: "Forecast", icon: TrendingUp },
  { to: "/simulator", label: "What-if", icon: SlidersHorizontal },
  { to: "/savings", label: "Savings", icon: PiggyBank },
  { to: "/settings", label: "Settings", icon: Settings },
];
