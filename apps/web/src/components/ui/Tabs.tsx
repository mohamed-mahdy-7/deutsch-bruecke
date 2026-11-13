import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
}

export function SegmentedTabs({
  items,
  value,
  onChange,
  ariaLabel,
  className,
  stretch = false,
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  className?: string;
  stretch?: boolean;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "no-scrollbar flex gap-1 overflow-x-auto rounded-2xl border border-border/60 bg-muted/55 p-1",
        className,
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              "inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition-all sm:min-h-9 sm:text-sm",
              stretch && "flex-1",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
            )}
          >
            {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
