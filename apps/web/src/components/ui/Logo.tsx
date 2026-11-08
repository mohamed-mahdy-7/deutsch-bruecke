import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("h-10 w-10", className)}
      role="img"
      aria-label="Deutsch Brücke"
    >
      <rect width="48" height="48" rx="14" fill="hsl(var(--primary))" />
      <circle cx="24" cy="13.5" r="3.2" fill="hsl(var(--accent))" />
      <path
        d="M9.5 32.5h29"
        stroke="hsl(var(--primary-foreground))"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.95"
      />
      <path
        d="M13 32.5c0-7 4.5-12 11-12s11 5 11 12"
        fill="none"
        stroke="hsl(var(--primary-foreground))"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M17 32.5v4M31 32.5v4M13 36.5h8M27 36.5h8"
        stroke="hsl(var(--primary-foreground))"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}

export function Brand({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <LogoMark className={compact ? "h-9 w-9" : "h-10 w-10"} />
      <span className="min-w-0">
        <span className="german-inline block truncate text-base font-extrabold leading-tight tracking-tight sm:text-lg">
          Deutsch Brücke
        </span>
        {!compact ? (
          <span className="block truncate text-[0.68rem] font-semibold text-muted-foreground">
            الألمانية بطريقة عقل العربي
          </span>
        ) : null}
      </span>
    </span>
  );
}
