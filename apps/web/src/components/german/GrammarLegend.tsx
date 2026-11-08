import { useSettings } from "@/providers/SettingsProvider";
import { cn } from "@/lib/utils";

export function GrammarLegend({ className }: { className?: string }) {
  const { t } = useSettings();
  const items = [
    { label: t("gender.masculine"), className: "bg-masc" },
    { label: t("gender.feminine"), className: "bg-fem" },
    { label: t("gender.neuter"), className: "bg-neut" },
    { label: t("topic.word_order"), className: "bg-verb" },
  ];

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] text-muted-foreground",
        className,
      )}
    >
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span
            className={cn("h-2 w-2 rounded-full", item.className)}
            aria-hidden="true"
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
