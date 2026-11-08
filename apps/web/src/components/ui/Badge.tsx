import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone =
  | "neutral"
  | "primary"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "masc"
  | "fem"
  | "neut"
  | "verb";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-primary-soft text-primary",
  accent: "bg-accent-soft text-accent-soft-foreground",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/10 text-danger",
  masc: "bg-masc/10 text-masc",
  fem: "bg-fem/10 text-fem",
  neut: "bg-neut/10 text-neut",
  verb: "bg-verb/10 text-verb",
};

export function Badge({
  children,
  tone = "neutral",
  className,
  title,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.7rem] font-bold leading-none",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
