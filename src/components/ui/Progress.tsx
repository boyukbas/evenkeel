import { cn } from "@/lib/cn";

interface ProgressProps {
  /** 0..1 */
  value: number;
  className?: string;
  indicatorClassName?: string;
  color?: string;
}

export function Progress({ value, className, indicatorClassName, color }: ProgressProps) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)) * 100;
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full bg-primary transition-all", indicatorClassName)}
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}
