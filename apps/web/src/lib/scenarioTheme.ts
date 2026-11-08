import type { Scenario } from "@/types/domain";

/**
 * Full literal class strings so Tailwind can see every colour variant.
 * Text stays contrast-safe in both light and dark themes.
 */
export const SCENARIO_THEME: Record<
  Scenario["color"],
  { badge: string; panel: string; icon: string }
> = {
  teal: {
    badge: "bg-primary-soft text-primary",
    panel: "from-primary-soft/70 to-primary-soft/20",
    icon: "bg-primary-soft text-primary",
  },
  orange: {
    badge: "bg-accent-soft text-accent-soft-foreground",
    panel: "from-accent-soft/75 to-accent-soft/20",
    icon: "bg-accent-soft text-accent-soft-foreground",
  },
  blue: {
    badge: "bg-masc/10 text-masc",
    panel: "from-masc/10 to-masc/5",
    icon: "bg-masc/10 text-masc",
  },
  rose: {
    badge: "bg-fem/10 text-fem",
    panel: "from-fem/10 to-fem/5",
    icon: "bg-fem/10 text-fem",
  },
  green: {
    badge: "bg-neut/10 text-neut",
    panel: "from-neut/10 to-neut/5",
    icon: "bg-neut/10 text-neut",
  },
};
