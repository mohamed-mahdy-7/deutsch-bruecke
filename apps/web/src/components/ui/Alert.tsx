import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertTone = "info" | "success" | "warning" | "danger";

const toneStyles: Record<
  AlertTone,
  { wrapper: string; icon: typeof Info }
> = {
  info: {
    wrapper: "border-primary/25 bg-primary-soft/60 text-foreground",
    icon: Info,
  },
  success: {
    wrapper: "border-success/25 bg-success/10 text-foreground",
    icon: CheckCircle2,
  },
  warning: {
    wrapper: "border-warning/30 bg-warning/10 text-foreground",
    icon: TriangleAlert,
  },
  danger: {
    wrapper: "border-danger/25 bg-danger/10 text-foreground",
    icon: AlertCircle,
  },
};

export function Alert({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const style = toneStyles[tone];
  const Icon = style.icon;
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
        style.wrapper,
        className,
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          tone === "info" && "text-primary",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
          tone === "danger" && "text-danger",
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-bold">{title}</p> : null}
        {children ? (
          <div className={cn("text-sm", title && "mt-1 text-muted-foreground")}>
            {children}
          </div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
