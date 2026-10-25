import { NavLink } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { NAV_ITEMS } from "./nav";
import { Brand } from "./Brand";
import { cn } from "@/lib/cn";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-4 py-5">
        <Brand />
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/12 text-primary"
                  : "text-sidebar-foreground hover:bg-accent hover:text-foreground",
              )
            }
          >
            <item.icon className="h-[18px] w-[18px]" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="m-3 rounded-lg border border-border bg-card/50 p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
          <ShieldCheck className="h-4 w-4 text-success" />
          Private by design
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          Your data stays in this browser. Nothing is uploaded.
        </p>
      </div>
    </div>
  );
}
