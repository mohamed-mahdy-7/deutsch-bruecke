import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const inputCn =
  "w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/70 hover:border-primary/30 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60";

export const selectCn = `${inputCn} appearance-none bg-[length:1rem] bg-[position:right_0.85rem_center] bg-no-repeat pe-9`;

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label?: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const generatedId = useId();
  const hintId = `${generatedId}-hint`;
  const errorId = `${generatedId}-error`;

  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-bold text-foreground"
        >
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-semibold text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function LabelPill({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[0.68rem] font-bold text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
