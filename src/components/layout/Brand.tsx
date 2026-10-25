import { cn } from "@/lib/cn";

/** The EvenKeel logomark: a jagged line smoothed into a flat keel. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-7 w-7", className)} aria-hidden>
      <rect width="64" height="64" rx="14" fill="var(--color-primary)" />
      <path
        d="M8 40 L18 22 L26 46 L34 18 L42 44 L56 30"
        fill="none"
        stroke="var(--color-primary-foreground)"
        strokeOpacity="0.35"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 38 L56 38" fill="none" stroke="var(--color-primary-foreground)" strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="56" cy="38" r="3.4" fill="var(--color-primary-foreground)" />
    </svg>
  );
}

export function Brand({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Logo />
      <div className="leading-tight">
        <p className="text-sm font-semibold tracking-tight">EvenKeel</p>
        <p className="text-[11px] text-muted-foreground">Your real monthly spending</p>
      </div>
    </div>
  );
}
