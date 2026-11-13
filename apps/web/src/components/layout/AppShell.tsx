import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Blocks,
  BookOpen,
  Flame,
  GraduationCap,
  Headphones,
  Home,
  Layers,
  Menu,
  MessageCircle,
  Mic,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  UserRound,
  X,
} from "lucide-react";
import type { TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useSettings } from "@/providers/SettingsProvider";
import {
  useProgress,
  useTodayActivity,
} from "@/state/ProgressProvider";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Brand, LogoMark } from "@/components/ui/Logo";
import { Alert } from "@/components/ui/Alert";
import { ProgressBar } from "@/components/ui/Progress";
import { LanguageToggle, ThemeToggle } from "@/components/layout/Toggles";

const SIDEBAR_STORAGE_KEY = "deutsch-bruecke:sidebar-collapsed:v1";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface NavItem {
  to: string;
  key: TranslationKey;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", key: "nav.home", icon: Home },
  { to: "/tutor", key: "nav.tutor", icon: MessageCircle },
  { to: "/curriculum", key: "nav.curriculum", icon: GraduationCap },
  { to: "/grammar", key: "nav.grammar", icon: BookOpen },
  { to: "/builder", key: "nav.builder", icon: Blocks },
  { to: "/vocabulary", key: "nav.vocabulary", icon: Layers },
  { to: "/listening", key: "nav.listening", icon: Headphones },
  { to: "/pronunciation", key: "nav.pronunciation", icon: Mic },
  { to: "/progress", key: "nav.progress", icon: BarChart3 },
];

/** The five routes that also stay one tap away in the mobile bottom bar. */
const MOBILE_PATHS = new Set([
  "/dashboard",
  "/tutor",
  "/curriculum",
  "/vocabulary",
  "/progress",
]);

const MOBILE_ITEMS: NavItem[] = NAV_ITEMS.filter((item) =>
  MOBILE_PATHS.has(item.to),
);

function SidebarNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const { t } = useSettings();
  const { pathname } = useLocation();
  const navRef = useRef<HTMLElement>(null);

  // Keep the active route visible when the nav has its own scroll area.
  useEffect(() => {
    const active = navRef.current?.querySelector<HTMLElement>(
      '[aria-current="page"]',
    );
    active?.scrollIntoView({ block: "nearest" });
  }, [pathname, collapsed]);

  return (
    <nav
      ref={navRef}
      aria-label={t("aria.navigation")}
      className={cn(
        "chat-scroll mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pb-2",
        collapsed ? "px-2" : "px-4",
      )}
    >
      {!collapsed ? <p className="eyebrow mb-2 px-3">{t("nav.menu")}</p> : null}
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          title={collapsed ? t(item.key) : undefined}
          className={({ isActive }) =>
            cn(
              "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-colors",
              collapsed && "justify-center px-0",
              isActive
                ? "bg-primary-soft text-primary"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            )
          }
        >
          <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          <span className={collapsed ? "sr-only" : "truncate"}>
            {t(item.key)}
          </span>
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarFooter({ collapsed = false }: { collapsed?: boolean }) {
  const { t } = useSettings();
  const { progress } = useProgress();
  const today = useTodayActivity();
  const minutes = today ? Math.floor(today.seconds / 60) : 0;
  const goal = progress?.profile.dailyGoalMinutes ?? 20;
  const initial =
    progress?.profile.displayName.trim().slice(0, 1) || (
      <UserRound className="h-4 w-4" aria-hidden="true" />
    );

  if (collapsed) {
    return (
      <div className="mt-auto flex shrink-0 flex-col items-center gap-2 border-t border-border/60 px-2 pb-4 pt-3">
        <span
          title={`${t("dash.streak")}: ${progress?.streak.current ?? 0} ${t("common.days")}`}
          className="inline-flex h-10 w-10 flex-col items-center justify-center rounded-xl bg-primary-soft text-primary"
        >
          <Flame className="h-4 w-4 text-accent" aria-hidden="true" />
          <span className="text-[0.6rem] font-extrabold leading-none">
            {progress?.streak.current ?? 0}
          </span>
        </span>
        <NavLink
          to="/profile"
          aria-label={t("aria.profile")}
          title={t("nav.profile")}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground shadow-sm transition-transform hover:scale-105"
        >
          {initial}
        </NavLink>
      </div>
    );
  }

  return (
    <div className="mt-auto shrink-0 space-y-3 border-t border-border/60 px-4 pb-4 pt-3">
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
        className="flex min-h-11 items-center gap-2.5 rounded-xl border border-border/60 bg-card px-3 py-2.5 transition-colors hover:bg-muted/50"
      >
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground">
          {initial}
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

function MobileDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useSettings();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    document.body.style.overflow = "hidden";

    const frame = requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panelRef.current)?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 animate-fade-in bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        id="mobile-sidebar"
        role="dialog"
        aria-modal="true"
        aria-label={t("aria.navigation")}
        tabIndex={-1}
        className="absolute inset-y-0 start-0 flex w-[min(20rem,calc(100vw-3rem))] animate-fade-in flex-col overflow-hidden border-e border-border/60 bg-card pt-[env(safe-area-inset-top)] shadow-lift outline-none"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-2 pt-4">
          <Link
            to="/dashboard"
            onClick={onClose}
            className="min-w-0 rounded-xl"
            aria-label={t("nav.home")}
          >
            <Brand compact />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("aria.closeMenu")}
            title={t("common.close")}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <SidebarNav onNavigate={onClose} />
        <div className="pb-[env(safe-area-inset-bottom)]">
          <SidebarFooter />
        </div>
      </div>
    </div>,
    document.body,
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Private browsing can block storage; the layout still works.
      }
      return next;
    });
  };

  const activeNav =
    NAV_ITEMS.find(
      (item) =>
        location.pathname === item.to ||
        location.pathname.startsWith(`${item.to}/`),
    ) ?? null;
  const pageLabel = activeNav ? t(activeNav.key) : t("brand.name");

  return (
    <div className="flex min-h-dvh lg:h-dvh lg:overflow-hidden">
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col overflow-hidden border-e border-border/60 bg-card/45 transition-[width] duration-200 lg:flex",
          collapsed ? "w-20" : "w-72",
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-center gap-2 pt-5",
            collapsed ? "flex-col px-2" : "justify-between px-4",
          )}
        >
          <Link
            to="/dashboard"
            className="min-w-0 rounded-xl p-1"
            aria-label={t("nav.home")}
          >
            {collapsed ? (
              <LogoMark className="h-9 w-9" />
            ) : (
              <Brand className="max-w-[12rem]" />
            )}
          </Link>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={
              collapsed ? t("aria.expandSidebar") : t("aria.collapseSidebar")
            }
            aria-expanded={!collapsed}
            title={
              collapsed ? t("aria.expandSidebar") : t("aria.collapseSidebar")
            }
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4 flip-rtl" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-4 w-4 flip-rtl" aria-hidden="true" />
            )}
          </button>
        </div>

        <SidebarNav collapsed={collapsed} />
        <SidebarFooter collapsed={collapsed} />
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col lg:h-dvh lg:min-h-0 lg:overflow-hidden">
        <header className="safe-top sticky top-0 z-30 flex min-h-16 shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-background/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label={t("aria.openMenu")}
              aria-expanded={drawerOpen}
              aria-controls="mobile-sidebar"
              className="-ms-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="min-w-0 lg:hidden">
              <Brand compact />
            </div>
            <div className="hidden min-w-0 lg:block">
              <p className="eyebrow truncate">{t("brand.promise")}</p>
              <p className="truncate text-sm font-bold">{pageLabel}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <LanguageToggle />
            <ThemeToggle />
            <Link
              to="/profile"
              aria-label={t("aria.profile")}
              className="ms-1 inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground shadow-sm transition-transform hover:scale-105"
            >
              {progress?.profile.displayName.trim().slice(0, 1) || (
                <UserRound className="h-4 w-4" aria-hidden="true" />
              )}
            </Link>
          </div>
        </header>

        {!online ? (
          <div className="shrink-0 border-b border-warning/20 bg-warning/5 px-4 py-2 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              <Alert tone="warning" className="border-0 bg-transparent px-0 py-0">
                {t("network.offline")}
              </Alert>
            </div>
          </div>
        ) : null}

        <main
          data-app-scroll=""
          className="flex-1 lg:min-h-0 lg:overflow-y-auto"
        >
          <div className="mx-auto w-full max-w-6xl px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-6">
            <Outlet />
          </div>
        </main>
      </div>

      <MobileNavigation />
      <MobileDrawer open={drawerOpen} onClose={closeDrawer} />
    </div>
  );
}
