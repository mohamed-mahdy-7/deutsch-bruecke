import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "primary",
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: "primary" | "accent" | "success" | "warning" | "masc" | "fem" | "neut";
  className?: string;
}) {
  const toneClasses = {
    primary: "bg-primary-soft text-primary",
    accent: "bg-accent-soft text-accent-soft-foreground",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning",
    masc: "bg-masc/10 text-masc",
    fem: "bg-fem/10 text-fem",
    neut: "bg-neut/10 text-neut",
  }[tone];

  return (
    <div
      className={cn(
        "surface-card flex min-w-0 items-center gap-3 p-3.5 sm:p-4",
        className,
      )}
    >
      <span
        className={cn(
          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          toneClasses,
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[0.7rem] font-semibold text-muted-foreground">
          {label}
        </p>
        <p className="tnum truncate text-xl font-extrabold leading-tight">
          {value}
        </p>
        {hint ? (
          <p className="truncate text-[0.68rem] text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}
