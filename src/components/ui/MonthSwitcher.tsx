import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { usePeriod } from "@/store/period";
import { currentMonthKey } from "@/lib/date";
import { formatMonthLong } from "@/lib/date";
import { cn } from "@/lib/cn";

export function MonthSwitcher({ className }: { className?: string }) {
  const { month, next, prev, reset } = usePeriod();
  const isCurrent = month === currentMonthKey();

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <button
        onClick={prev}
        aria-label="Previous month"
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={reset}
        className="flex min-w-[9.5rem] items-center justify-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-accent"
        title={isCurrent ? "Current month" : "Jump to current month"}
      >
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        {formatMonthLong(month)}
      </button>
      <button
        onClick={next}
        aria-label="Next month"
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
