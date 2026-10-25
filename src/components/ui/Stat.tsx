import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card } from "./Card";

interface StatProps {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  /** Signed fraction, e.g. 0.12 = +12%. */
  trend?: number | null;
  /** When true, an increase is bad (spending) so up = danger. Default true. */
  invertTrend?: boolean;
  className?: string;
}

export function Stat({ label, value, sub, icon, trend, invertTrend = true, className }: StatProps) {
  const hasTrend = trend != null && Number.isFinite(trend) && Math.abs(trend) >= 0.005;
  const up = (trend ?? 0) > 0;
  const good = hasTrend ? (invertTrend ? !up : up) : false;
  const TrendIcon = !hasTrend ? Minus : up ? ArrowUpRight : ArrowDownRight;

  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <div className="mt-1 flex items-center gap-2">
        {hasTrend && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium",
              good ? "text-success" : "text-danger",
            )}
          >
            <TrendIcon className="h-3.5 w-3.5" />
            {Math.round(Math.abs(trend!) * 100)}%
          </span>
        )}
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
    </Card>
  );
}
