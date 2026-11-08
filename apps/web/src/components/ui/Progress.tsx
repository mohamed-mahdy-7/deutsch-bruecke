import type { ReactNode } from "react";
import { cn, clamp } from "@/lib/utils";

export function ProgressBar({
  value,
  max = 100,
  label,
  className,
  barClassName,
  tone = "primary",
}: {
  value: number;
  max?: number;
  label?: string;
  className?: string;
  barClassName?: string;
  tone?: "primary" | "accent" | "success" | "warning";
}) {
  const pct = max <= 0 ? 0 : clamp((value / max) * 100, 0, 100);
  const toneClass =
    tone === "accent"
      ? "bg-accent"
      : tone === "success"
        ? "bg-success"
        : tone === "warning"
          ? "bg-warning"
          : "bg-primary";

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      aria-label={label}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          toneClass,
          barClassName,
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function ProgressRing({
  value,
  size = 96,
  strokeWidth = 8,
  children,
  label,
  className,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  children?: ReactNode;
  label?: string;
  className?: string;
}) {
  const radius = (100 - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = clamp(value, 0, 100);
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label}
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}
