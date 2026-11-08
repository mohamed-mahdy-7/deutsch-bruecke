import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Blocks,
  BookOpen,
  Flame,
  Home,
  Layers,
  MessageCircle,
  Settings2,
  UserRound,
} from "lucide-react";
import type { TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useSettings } from "@/providers/SettingsProvider";
import {
  useProgress,
  useTodayActivity,
} from "@/state/ProgressProvider";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Brand } from "@/components/ui/Logo";
import { Alert } from "@/components/ui/Alert";
import { ProgressBar } from "@/components/ui/Progress";
import { LanguageToggle, ThemeToggle } from "@/components/layout/Toggles";

interface NavItem {
  to: string;
  key: TranslationKey;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", key: "nav.home", icon: Home },
  { to: "/tutor", key: "nav.tutor", icon: MessageCircle },
  { to: "/grammar", key: "nav.grammar", icon: BookOpen },
  { to: "/builder", key: "nav.builder", icon: Blocks },
  { to: "/vocabulary", key: "nav.vocabulary", icon: Layers },
  { to: "/progress", key: "nav.progress", icon: BarChart3 },
];

const MOBILE_ITEMS: NavItem[] = [
  NAV_ITEMS[0]!,
  NAV_ITEMS[1]!,
  NAV_ITEMS[2]!,
  NAV_ITEMS[4]!,
  NAV_ITEMS[5]!,
];

function SidebarNav() {
  const { t } = useSettings();
  return (
    <nav aria-label={t("aria.navigation")} className="mt-6 flex-1 space-y-1">
      <p className="eyebrow mb-2 px-3">{t("nav.menu")}</p>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-colors",
              isActive
                ? "bg-primary-soft text-primary"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            )
          }
        >
          <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
          {t(item.key)}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarFooter() {
  const { t } = useSettings();
  const { progress } = useProgress();
  const today = useTodayActivity();
  const minutes = today ? Math.floor(today.seconds / 60) : 0;
  const goal = progress?.profile.dailyGoalMinutes ?? 20;

  return (
    <div className="mt-auto space-y-3 pt-4">
      <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-primary-soft/80 to-accent-soft/70 p-3.5">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-accent" aria-hidden="true" />
          <span className="text-xs font-bold text-muted-foreground">
            {t("dash.streak")}
          </span>
        </div>
        <p className="mt-1 text-2xl font-extrabold leading-none">
          {progress?.streak.current ?? 0}{" "}
          <span className="text-xs font-bold text-muted-foreground">
            {t("common.days")}
          </span>
        </p>
        <ProgressBar
          value={minutes}
          max={goal}
          tone="accent"
          className="mt-2.5 h-1.5"
          label={t("dash.todayGoal")}
        />
        <p className="mt-1.5 text-[0.68rem] text-muted-foreground">
          {t("dash.goalProgress", { done: minutes, goal })}
        </p>
      </div>

      <NavLink
        to="/profile"
        className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card px-3 py-2.5 transition-colors hover:bg-muted/50"
      >
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground">
          {progress?.profile.displayName.trim().slice(0, 1) || "؟"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-bold">
            {progress?.profile.displayName || t("profile.guest")}
          </span>
          <span className="block truncate text-[0.65rem] text-muted-foreground">
            {t("nav.profile")}
          </span>
        </span>
        <Settings2
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </NavLink>
    </div>
  );
}

function MobileNavigation() {
  const { t } = useSettings();
  return (
    <nav
      aria-label={t("aria.navigation")}
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-card/95 backdrop-blur-md lg:hidden"
    >
      <div className="grid grid-cols-5">
        {MOBILE_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex min-h-[3.6rem] flex-col items-center justify-center gap-1 px-1 pt-2 text-[0.62rem] font-bold transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    "inline-flex h-7 w-10 items-center justify-center rounded-full transition-colors",
                    isActive && "bg-primary-soft",
                  )}
                >
                  <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <span className="max-w-full truncate">{t(item.key)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export function AppShell() {
  const { t } = useSettings();
  const { progress } = useProgress();
  const online = useOnlineStatus();
  const location = useLocation();

  const activeNav =
    NAV_ITEMS.find(
      (item) =>
        location.pathname === item.to ||
        location.pathname.startsWith(`${item.to}/`),
    ) ?? null;
  const pageLabel = activeNav ? t(activeNav.key) : t("brand.name");

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col border-e border-border/60 bg-card/45 px-4 py-5 lg:flex">
        <Link
          to="/dashboard"
          className="rounded-xl px-2 py-1"
          aria-label={t("nav.home")}
        >
          <Brand />
        </Link>
        <SidebarNav />
        <SidebarFooter />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border/60 bg-background/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="min-w-0 lg:hidden">
            <Brand compact />
          </div>
          <div className="hidden min-w-0 lg:block">
            <p className="eyebrow truncate">{t("brand.promise")}</p>
            <p className="truncate text-sm font-bold">{pageLabel}</p>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <LanguageToggle />
            <ThemeToggle />
            <Link
              to="/profile"
              aria-label={t("aria.profile")}
              className="ms-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground shadow-sm transition-transform hover:scale-105"
            >
              {progress?.profile.displayName.trim().slice(0, 1) || (
                <UserRound className="h-4 w-4" aria-hidden="true" />
              )}
            </Link>
          </div>
        </header>

        {!online ? (
          <div className="border-b border-warning/20 bg-warning/5 px-4 py-2 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              <Alert tone="warning" className="border-0 bg-transparent px-0 py-0">
                {t("network.offline")}
              </Alert>
            </div>
          </div>
        ) : null}

        <main className="flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-6">
            <Outlet />
          </div>
        </main>
      </div>

      <MobileNavigation />
    </div>
  );
}
