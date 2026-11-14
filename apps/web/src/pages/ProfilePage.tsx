import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Check,
  Cloud,
  CloudOff,
  Download,
  Languages,
  Laptop,
  LogOut,
  Moon,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  Trash2,
  UserRound,
  Wand2,
} from "lucide-react";
import type {
  CefrLevel,
  NativeDialect,
  ThemeMode,
} from "@/types/domain";
import type { TranslationKey } from "@/lib/i18n";
import { useAppPreferences } from "@/state/useAppPreferences";
import { useAuth } from "@/state/AuthProvider";
import { useProgress } from "@/state/ProgressProvider";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { fetchAiHealth, type AiMode } from "@/services/ai";
import {
  DIALECT_LABEL_KEY,
  LEVEL_DESC_KEY,
  LEVEL_LABEL_KEY,
} from "@/lib/uiLabels";
import { cn } from "@/lib/utils";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button, buttonCn } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Field, inputCn, selectCn } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { AiQuotaSummary } from "@/components/ai/AiGate";

type DialogKind = "reset" | "signout" | "retake" | null;

const LEVELS: CefrLevel[] = ["A1", "A2", "B1"];
const GOALS = [10, 20, 30];
const DIALECTS: NativeDialect[] = [
  "egyptian",
  "levantine",
  "gulf",
  "maghrebi",
  "msa",
  "other",
];

const SYNC_META = {
  local: {
    labelKey: "profile.syncLocal",
    tone: "neutral",
    icon: CloudOff,
  },
  syncing: {
    labelKey: "profile.syncSyncing",
    tone: "primary",
    icon: RefreshCw,
  },
  synced: {
    labelKey: "profile.syncSynced",
    tone: "success",
    icon: Cloud,
  },
  error: {
    labelKey: "profile.syncError",
    tone: "danger",
    icon: CloudOff,
  },
} as const satisfies Record<
  "local" | "syncing" | "synced" | "error",
  { labelKey: TranslationKey; tone: BadgeTone; icon: LucideIcon }
>;

const THEME_OPTIONS: Array<{
  id: ThemeMode;
  labelKey: TranslationKey;
  icon: LucideIcon;
}> = [
  { id: "light", labelKey: "theme.light", icon: Sun },
  { id: "dark", labelKey: "theme.dark", icon: Moon },
  { id: "system", labelKey: "theme.system", icon: Laptop },
];

export function ProfilePage() {
  const {
    t,
    language,
    theme,
    setLanguage,
    setTheme,
  } = useAppPreferences();
  const { mode, user, configured, signOut } = useAuth();
  const {
    progress,
    syncStatus,
    updateProfile,
    resetProgress,
    retrySync,
  } = useProgress();
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const navigate = useNavigate();

  const profile = progress?.profile;
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [level, setLevel] = useState<CefrLevel>(profile?.level ?? "A1");
  const [goal, setGoal] = useState(profile?.dailyGoalMinutes ?? 20);
  const [dialect, setDialect] = useState<NativeDialect>(
    profile?.nativeDialect ?? "egyptian",
  );
  const [saved, setSaved] = useState(false);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [busy, setBusy] = useState(false);
  const [signOutSyncFailed, setSignOutSyncFailed] = useState(false);
  const [aiMode, setAiMode] = useState<AiMode | null>(null);
  const [aiReachable, setAiReachable] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchAiHealth().then((result) => {
      if (!alive) return;
      setAiReachable(result.reachable);
      setAiMode(result.mode);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 3_000);
    return () => clearTimeout(timer);
  }, [saved]);

  if (!profile) return null;

  const sync = SYNC_META[syncStatus];
  const SyncIcon = sync.icon;
  const authenticated = mode === "authenticated" && Boolean(user);
  const initial =
    displayName.trim().slice(0, 1) ||
    profile.displayName.trim().slice(0, 1) ||
    "";

  const savePreferences = () => {
    updateProfile({
      displayName: displayName.trim(),
      level,
      dailyGoalMinutes: goal,
      nativeDialect: dialect,
    });
    setSaved(true);
  };

  const confirmDialog = async () => {
    if (!dialog) return;
    setBusy(true);
    try {
      if (dialog === "reset") {
        await resetProgress();
        setDialog(null);
        navigate("/", { replace: true });
      } else if (dialog === "signout") {
        if (!signOutSyncFailed) {
          const ok = await retrySync();
          if (!ok) {
            setSignOutSyncFailed(true);
            setBusy(false);
            return;
          }
        }
        await signOut();
        setSignOutSyncFailed(false);
        setDialog(null);
        navigate("/", { replace: true });
      } else if (dialog === "retake") {
        updateProfile({ onboardingCompleted: false });
        setDialog(null);
        navigate("/onboarding", { replace: true });
      }
    } finally {
      setBusy(false);
    }
  };

  const refreshAi = () => {
    setAiMode(null);
    setAiReachable(null);
    void fetchAiHealth().then((result) => {
      setAiReachable(result.reachable);
      setAiMode(result.mode);
    });
  };

  const aiLabel =
    aiReachable === null
      ? t("common.loading")
      : aiMode === "live"
        ? t("tutor.modeLive")
        : aiMode === "demo"
          ? t("profile.aiDemo")
          : t("ai.unavailable");

  const dialogTitle =
    dialog === "reset"
      ? t("profile.reset")
      : dialog === "signout"
        ? signOutSyncFailed
                     ? t("profile.signOutAnyway")
                     : t("profile.signOut")
        : t("profile.retakeOnboarding");

  const dialogBody =
    dialog === "reset"
      ? t("profile.resetBody")
      : dialog === "signout"
        ? t("profile.signOutBody")
        : t("profile.retakeOnboardingBody");

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={t("nav.profile")}
        title={t("profile.title")}
        subtitle={t("profile.subtitle")}
      />

      <section className="surface-card mt-4 overflow-hidden">
        <div className="flex flex-col gap-4 bg-gradient-to-br from-primary-soft/75 via-card to-accent-soft/50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-xl font-extrabold text-primary-foreground shadow-sm">
              {initial || <UserRound className="h-6 w-6" aria-hidden="true" />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xl font-extrabold">
                {profile.displayName.trim() || t("profile.guest")}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {authenticated ? (user?.email ?? "") : t("profile.guestNote")}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Badge tone="primary">
                  {t(LEVEL_LABEL_KEY[profile.level])}
                </Badge>
                <Badge tone="neutral">
                  {t("profile.goalMinutes", {
                    count: profile.dailyGoalMinutes,
                  })}
                </Badge>
                <Badge tone="neutral">
                  {t(DIALECT_LABEL_KEY[profile.nativeDialect])}
                </Badge>
              </div>
            </div>
          </div>

          <Badge tone={sync.tone} className="w-fit px-3 py-1.5">
            <SyncIcon
              className={cn(
                "h-3.5 w-3.5",
                syncStatus === "syncing" && "animate-spin",
              )}
              aria-hidden="true"
            />
            {t(sync.labelKey)}
          </Badge>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="surface-card p-5 sm:p-6">
          <SectionHeader
            title={t("profile.preferences")}
            subtitle={t("profile.preferencesSaved")}
            action={
              saved ? (
                <Badge tone="success">
                  <Check className="h-3 w-3" aria-hidden="true" />
                  {t("profile.saved")}
                </Badge>
              ) : undefined
            }
          />

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              savePreferences();
            }}
          >
            <Field label={t("profile.displayName")} htmlFor="profile-name">
              <input
                id="profile-name"
                value={displayName}
                dir="auto"
                onChange={(event) => setDisplayName(event.target.value)}
                className={inputCn}
                autoComplete="nickname"
              />
            </Field>

            <div>
              <p className="mb-1.5 text-sm font-bold">{t("profile.level")}</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {LEVELS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setLevel(option)}
                    aria-pressed={level === option}
                    className={cn(
                      "rounded-2xl border p-3 text-start transition-all",
                      level === option
                        ? "border-primary/50 bg-primary-soft/60 shadow-sm"
                        : "border-border/70 bg-card hover:border-primary/30 hover:bg-muted/30",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-extrabold">{option}</span>
                      {level === option ? (
                        <Check
                          className="h-3.5 w-3.5 text-primary"
                          aria-hidden="true"
                        />
                      ) : null}
                    </span>
                    <span className="mt-1 block text-[0.68rem] font-bold">
                      {t(LEVEL_LABEL_KEY[option])}
                    </span>
                    <span className="mt-0.5 block text-[0.62rem] leading-relaxed text-muted-foreground">
                      {t(LEVEL_DESC_KEY[option])}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-sm font-bold">{t("profile.dailyGoal")}</p>
              <div className="grid grid-cols-3 gap-2">
                {GOALS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setGoal(option)}
                    aria-pressed={goal === option}
                    className={cn(
                      "inline-flex min-h-11 items-center justify-center rounded-xl border text-sm font-extrabold transition-all",
                      goal === option
                        ? "border-primary/50 bg-primary-soft/60 text-primary shadow-sm"
                        : "border-border/70 bg-card hover:border-primary/30 hover:bg-muted/30",
                    )}
                  >
                    {t("common.minutes", { count: option })}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {t("profile.currentGoal", { count: goal })}
              </p>
            </div>

            <Field label={t("profile.dialect")} htmlFor="profile-dialect">
              <select
                id="profile-dialect"
                value={dialect}
                onChange={(event) =>
                  setDialect(event.target.value as NativeDialect)
                }
                className={selectCn}
              >
                {DIALECTS.map((option) => (
                  <option key={option} value={option}>
                    {t(DIALECT_LABEL_KEY[option])}
                  </option>
                ))}
              </select>
            </Field>

            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-sm font-bold">
                <Languages className="h-4 w-4 text-primary" aria-hidden="true" />
                {t("profile.language")}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: "ar" as const, label: t("onboarding.languageAr") },
                    { id: "en" as const, label: t("onboarding.languageEn") },
                  ]
                ).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setLanguage(option.id)}
                    aria-pressed={language === option.id}
                    className={cn(
                      "touch-target inline-flex min-h-10 items-center justify-center rounded-xl border text-sm font-extrabold transition-all",
                      language === option.id
                        ? "border-primary/50 bg-primary-soft/60 text-primary shadow-sm"
                        : "border-border/70 bg-card hover:border-primary/30 hover:bg-muted/30",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-sm font-bold">{t("profile.theme")}</p>
              <div className="grid grid-cols-3 gap-2">
                {THEME_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setTheme(option.id)}
                      aria-pressed={theme === option.id}
                      className={cn(
                        "touch-target inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-bold transition-all",
                        theme === option.id
                          ? "border-primary/50 bg-primary-soft/60 text-primary shadow-sm"
                          : "border-border/70 bg-card hover:border-primary/30 hover:bg-muted/30",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {t(option.labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
              <p className="text-[0.68rem] text-muted-foreground">
                {t("profile.dataKept")}
              </p>
              <Button type="submit" icon={<Check className="h-4 w-4" />}>
                {t("profile.save")}
              </Button>
            </div>
          </form>
        </section>

        <div className="space-y-4">
          <section className="surface-card p-5">
            <SectionHeader title={t("profile.account")} />
            {authenticated ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-2xl bg-muted/35 p-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold">
                      {t("profile.signedInAs", {
                        email: user?.email ?? "",
                      })}
                    </p>
                    <p className="mt-1 text-[0.68rem] leading-relaxed text-muted-foreground">
                      {t("profile.deleteAccount")}
                    </p>
                  </div>
                </div>

                {syncStatus === "error" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => void retrySync()}
                    icon={<RefreshCw className="h-3.5 w-3.5" />}
                  >
                    {t("common.retry")}
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl bg-muted/35 p-3">
                  <p className="text-sm font-bold">{t("profile.guest")}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {t("profile.guestBody")}
                  </p>
                </div>
                {configured ? (
                  <Link
                    to="/auth?mode=signup"
                    className={buttonCn("primary", "sm", "w-full")}
                  >
                    {t("profile.guestCta")}
                  </Link>
                ) : (
                  <Alert tone="info">{t("profile.guestNote")}</Alert>
                )}
              </div>
            )}

            {mode !== "anonymous" ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full text-danger hover:border-danger/30 hover:bg-danger/5"
                icon={<LogOut className="h-3.5 w-3.5" />}
                onClick={() => {
                  setSignOutSyncFailed(false);
                  setDialog("signout");
                }}
              >
                {t("profile.signOut")}
              </Button>
            ) : null}
          </section>

          <section className="surface-card p-5">
            <SectionHeader title={t("profile.aiTitle")} />
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-sm font-bold">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                {aiMode === "live"
                  ? t("tutor.modeLive")
                  : aiMode === "demo"
                    ? t("profile.aiDemo")
                    : t("ai.unavailable")}
              </span>
              {aiReachable === null ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <Badge
                  tone={
                    aiReachable && aiMode === "live"
                      ? "success"
                      : aiMode === "demo"
                        ? "warning"
                        : "danger"
                  }
                >
                  {aiLabel}
                </Badge>
              )}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {t("profile.aiBody")}
            </p>
            <AiQuotaSummary className="mt-4" />
            {aiMode === "demo" ? (
              <Alert tone="warning" className="mt-3">
                {t("profile.aiDemoBody")}
              </Alert>
            ) : null}
            {aiReachable === false ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={refreshAi}
                icon={<RefreshCw className="h-3.5 w-3.5" />}
              >
                {t("ai.retry")}
              </Button>
            ) : null}
          </section>

          <section className="surface-card p-5">
            <SectionHeader
              title={t("profile.install")}
              subtitle={t("profile.installBody")}
            />
            {installed ? (
              <Badge tone="success">
                <Check className="h-3 w-3" aria-hidden="true" />
                {t("profile.installed")}
              </Badge>
            ) : canInstall ? (
              <Button
                className="w-full"
                onClick={() => void promptInstall()}
                icon={<Download className="h-4 w-4" />}
              >
                {t("pwa.install")}
              </Button>
            ) : (
              <div className="flex items-start gap-2 rounded-2xl bg-muted/35 p-3">
                <Smartphone
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="text-[0.68rem] leading-relaxed text-muted-foreground">
                  {t("profile.installUnavailable")}
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="surface-card p-5">
          <SectionHeader title={t("profile.data")} />
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setDialog("retake")}
              className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 text-start transition-colors hover:bg-muted/35"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold">
                  {t("profile.retakeOnboarding")}
                </span>
                <span className="mt-0.5 block text-[0.65rem] text-muted-foreground">
                  {t("profile.retakeOnboardingBody")}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDialog("reset")}
              className="flex w-full items-center gap-3 rounded-2xl border border-danger/20 bg-danger/5 p-3 text-start transition-colors hover:bg-danger/10"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-danger/10 text-danger">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-danger">
                  {t("profile.reset")}
                </span>
                <span className="mt-0.5 block text-[0.65rem] text-muted-foreground">
                  {t("profile.resetBody")}
                </span>
              </span>
            </button>
          </div>
        </section>

        <section className="surface-card flex flex-col justify-between gap-3 p-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                <Wand2 className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-extrabold">
                  {t("profile.phase2Title")}
                </p>
                <Badge tone="accent" className="mt-0.5">
                  {t("profile.phase2Badge")}
                </Badge>
              </div>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
              {t("profile.phase2Body")}
            </p>
          </div>
          <p className="border-t border-border/60 pt-2.5 text-[0.62rem] text-muted-foreground">
            {t("profile.version")} · {__APP_VERSION__}
          </p>
        </section>
      </div>

      <Modal
        open={dialog !== null}
        onClose={() => {
          if (!busy) setDialog(null);
        }}
        title={dialogTitle}
        description={dialogBody}
        closeLabel={t("common.close")}
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => setDialog(null)}
              disabled={busy}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant={dialog === "reset" ? "danger" : "primary"}
              onClick={() => void confirmDialog()}
              loading={busy}
            >
              {dialog === "reset"
                ? t("profile.resetAction")
                : dialog === "signout"
                  ? signOutSyncFailed
                     ? t("profile.signOutAnyway")
                     : t("profile.signOut")
                  : t("profile.retake")}
            </Button>
          </div>
        }
      >
        {dialog === "reset" ? (
          <Alert tone="danger" title={t("profile.resetConfirm")}>
            {t("profile.dataKept")}
          </Alert>
        ) : dialog === "signout" ? (
          <Alert tone={signOutSyncFailed ? "warning" : "info"}>
             {signOutSyncFailed ? t("sync.signOutWarning") : t("profile.signOutBody")}
           </Alert>
        ) : (
          <Alert tone="info">{t("profile.retakeOnboardingBody")}</Alert>
        )}
      </Modal>
    </div>
  );
}
