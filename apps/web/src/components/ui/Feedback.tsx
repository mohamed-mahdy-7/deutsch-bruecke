import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  body,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-muted/25 px-6 py-10 text-center",
        className,
      )}
    >
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-muted-foreground shadow-sm">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="font-bold">{title}</p>
      {body ? (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title,
  body,
  retryLabel,
  onRetry,
  className,
}: {
  title: string;
  body?: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-3xl border border-danger/20 bg-danger/5 px-6 py-10 text-center",
        className,
      )}
    >
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
        <AlertCircle className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="font-bold">{title}</p>
      {body ? (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
      ) : null}
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
