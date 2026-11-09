import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Copy,
  MessageCircle,
  Pencil,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { AiMode } from "@/services/ai";
import { fetchAiHealth } from "@/services/ai";
import type { CustomScenario } from "@/types/domain";
import { SCENARIOS } from "@/data/scenarios";
import { useCustomScenarios } from "@/state/CustomScenariosProvider";
import { customScenarioToScenario } from "@/services/customScenarioMapping";
import { useAppPreferences } from "@/state/useAppPreferences";
import { useProgress } from "@/state/ProgressProvider";
import { LEVEL_LABEL_KEY } from "@/lib/uiLabels";
import { SCENARIO_THEME } from "@/lib/scenarioTheme";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonCn } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { Modal } from "@/components/ui/Modal";
import { GermanText } from "@/components/german/GermanText";

export function TutorPage() {
  const { t, language } = useAppPreferences();
  const { progress } = useProgress();
  const navigate = useNavigate();
  const {
    scenarios: customScenarios,
    loading: customLoading,
    syncStatus,
    deleteScenario,
    duplicateScenario,
  } = useCustomScenarios();
  const [aiMode, setAiMode] = useState<AiMode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomScenario | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let alive = true;
    void fetchAiHealth().then((result) => {
      if (alive) setAiMode(result.mode);
    });
    return () => {
      alive = false;
    };
  }, []);

  const hasConversation = (scenarioId: string) =>
    Boolean(
      progress?.conversations.some(
        (conversation) => conversation.scenarioId === scenarioId,
      ),
    );

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteScenario(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const syncBadge =
    syncStatus === "synced" ? (
      <Badge tone="success">{t("tutor.syncSynced")}</Badge>
    ) : syncStatus === "syncing" ? (
      <Badge tone="primary">{t("tutor.syncSyncing")}</Badge>
    ) : syncStatus === "error" ? (
      <Badge tone="warning">{t("tutor.syncError")}</Badge>
    ) : (
      <Badge tone="neutral">{t("tutor.syncLocal")}</Badge>
    );

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={t("nav.tutor")}
        title={t("tutor.chooseTitle")}
        subtitle={t("tutor.chooseSubtitle")}
        actions={
          aiMode === "live" ? (
            <Badge tone="success">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              {t("tutor.modeLive")}
            </Badge>
          ) : aiMode === "demo" ? (
            <Badge tone="accent">{t("tutor.demoShort")}</Badge>
          ) : null
        }
      />

      {aiMode === "demo" ? (
        <Alert tone="warning" className="mt-4">
          {t("tutor.demoBanner")}
        </Alert>
      ) : null}
      {aiMode === "unavailable" ? (
        <Alert tone="danger" className="mt-4">
          {t("ai.unavailable")}
        </Alert>
      ) : null}

      <Link
        to="/tutor/create"
        className="surface-card group mt-5 flex flex-col gap-4 overflow-hidden border-primary/25 bg-gradient-to-br from-primary-soft/70 via-card to-accent-soft/50 p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <div className="flex items-start gap-3.5">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="eyebrow">{t("tutor.createBadge")}</p>
            <h2 className="mt-1 text-lg font-extrabold sm:text-xl">
              {t("tutor.createCta")}
            </h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {t("tutor.createCtaBody")}
            </p>
          </div>
        </div>
        <span
          className={buttonCn("primary", "md", "shrink-0 self-start sm:self-auto")}
        >
          {t("tutor.createCta")}
          <ArrowRight className="h-4 w-4 flip-rtl" aria-hidden="true" />
        </span>
      </Link>

      <section className="mt-6">
        <SectionHeader
          title={t("tutor.myScenarios")}
          subtitle={t("tutor.myScenariosSubtitle")}
          action={
            <div className="flex flex-wrap items-center gap-1.5">
              {customScenarios.length > 0 ? (
                <Badge tone="primary">
                  {t("tutor.customCount", { count: customScenarios.length })}
                </Badge>
              ) : null}
              {syncBadge}
            </div>
          }
        />

        {customLoading ? (
          <div
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            role="status"
            aria-label={t("common.loading")}
          >
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                className="surface-card animate-pulse p-0"
                aria-hidden="true"
              >
                <div className="h-28 rounded-t-2xl bg-muted/70" />
                <div className="space-y-2 p-4">
                  <div className="h-3 w-2/3 rounded bg-muted/70" />
                  <div className="h-3 w-full rounded bg-muted/50" />
                  <div className="h-9 rounded-xl bg-muted/40" />
                </div>
              </div>
            ))}
          </div>
        ) : customScenarios.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title={t("tutor.customEmptyTitle")}
            body={t("tutor.customEmptyBody")}
            className="py-7"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {customScenarios.map((custom) => {
              const mapped = customScenarioToScenario(custom);
              const theme = SCENARIO_THEME[mapped.color];
              const title =
                language === "ar" ? custom.titleAr : custom.titleDe;
              const existing = hasConversation(custom.id);

              return (
                <article
                  key={custom.id}
                  className="surface-card flex flex-col overflow-hidden p-0 transition-all hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <div
                    className={`bg-gradient-to-br ${theme.panel} border-b border-border/50 p-4`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-lg ${theme.icon}`}
                        aria-hidden="true"
                      >
                        {custom.emoji}
                      </span>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Badge tone="primary">
                          <Sparkles className="h-3 w-3" aria-hidden="true" />
                          {t("tutor.aiMade")}
                        </Badge>
                        <Badge tone="neutral">
                          {t("tutor.level", {
                            level: t(LEVEL_LABEL_KEY[custom.level]),
                          })}
                        </Badge>
                      </div>
                    </div>
                    <h2 className="mt-3">
                      <Link
                        to={`/tutor/${custom.id}`}
                        className="text-lg font-extrabold hover:underline"
                      >
                        {title}
                      </Link>
                    </h2>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {custom.goalAr}
                    </p>
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <p className="eyebrow">{t("tutor.scenarioLabel")}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs font-semibold">
                      {custom.settingAr}
                    </p>

                    <div className="mt-2.5 rounded-xl border border-border/60 bg-muted/35 p-2.5">
                      <p className="text-[0.62rem] font-bold text-muted-foreground">
                        {t("tutor.tutorName")} · {custom.aiRoleDe}
                      </p>
                      <GermanText
                        text={custom.openingDe}
                        interactive={false}
                        className="mt-1 line-clamp-2 text-xs text-muted-foreground"
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge
                        tone={custom.formality === "Sie" ? "primary" : "neutral"}
                      >
                        {custom.formality}
                      </Badge>
                      <Badge tone="neutral">
                        {custom.tone === "strict"
                          ? t("tutor.toneStrict")
                          : t("tutor.toneFriendly")}
                      </Badge>
                    </div>

                    <Link
                      to={`/tutor/${custom.id}`}
                      className={buttonCn(
                        existing ? "outline" : "primary",
                        "md",
                        "mt-4 w-full",
                      )}
                    >
                      {existing ? (
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Play
                          className="h-4 w-4 flip-rtl"
                          aria-hidden="true"
                        />
                      )}
                      {existing ? t("tutor.resume") : t("tutor.start")}
                      <ArrowRight
                        className="h-4 w-4 flip-rtl"
                        aria-hidden="true"
                      />
                    </Link>

                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/tutor/create/${custom.id}`)}
                        icon={<Pencil className="h-3.5 w-3.5" />}
                        className="px-2 text-[0.68rem]"
                      >
                        {t("tutor.edit")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void duplicateScenario(custom.id)}
                        icon={<Copy className="h-3.5 w-3.5" />}
                        className="px-2 text-[0.68rem]"
                      >
                        {t("tutor.duplicate")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(custom)}
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                        className="px-2 text-[0.68rem] text-danger hover:bg-danger/10 hover:text-danger"
                      >
                        {t("tutor.delete")}
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-6">
        <SectionHeader
          title={t("tutor.readyScenarios")}
          subtitle={t("dash.scenariosSubtitle")}
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {SCENARIOS.map((scenario) => {
            const theme = SCENARIO_THEME[scenario.color];
            const existing = hasConversation(scenario.id);
            const title =
              language === "ar" ? scenario.titleAr : scenario.titleEn;
            const description =
              language === "ar"
                ? scenario.descriptionAr
                : scenario.descriptionEn;
            const goals =
              language === "ar" ? scenario.goalsAr : scenario.goalsEn;

            return (
              <Link
                key={scenario.id}
                to={`/tutor/${scenario.id}`}
                className="surface-card group flex flex-col overflow-hidden p-0 transition-all hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div
                  className={`bg-gradient-to-br ${theme.panel} border-b border-border/50 p-4`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${theme.icon}`}
                    >
                      <MessageCircle className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Badge tone="neutral">
                        {t("tutor.level", {
                          level: t(LEVEL_LABEL_KEY[scenario.level]),
                        })}
                      </Badge>
                      <Badge tone="neutral">
                        <Clock3 className="h-3 w-3" aria-hidden="true" />
                        {t("tutor.minutes", {
                          count: scenario.durationMinutes,
                        })}
                      </Badge>
                    </div>
                  </div>
                  <h2 className="mt-3 text-lg font-extrabold">{title}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <p className="eyebrow">{t("tutor.scenarioLabel")}</p>
                  <p className="mt-0.5 text-xs font-semibold">
                    {language === "ar" ? scenario.settingAr : scenario.settingEn}
                  </p>

                  <div className="mt-2.5 rounded-xl border border-border/60 bg-muted/35 p-2.5">
                    <p className="text-[0.62rem] font-bold text-muted-foreground">
                      {t("tutor.tutorName")} ·{" "}
                      {language === "ar" ? scenario.aiRoleAr : scenario.aiRoleEn}
                    </p>
                    <GermanText
                      text={scenario.openingDe}
                      interactive={false}
                      className="mt-1 line-clamp-2 text-xs text-muted-foreground"
                    />
                  </div>

                  <ul className="mt-3 space-y-1.5">
                    {goals.slice(0, 3).map((goal) => (
                      <li
                        key={goal}
                        className="flex items-start gap-1.5 text-xs text-muted-foreground"
                      >
                        <CheckCircle2
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success"
                          aria-hidden="true"
                        />
                        {goal}
                      </li>
                    ))}
                  </ul>

                  <span
                    className={buttonCn(
                      existing ? "outline" : "primary",
                      "md",
                      "mt-4 w-full",
                    )}
                  >
                    {existing ? (
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Play className="h-4 w-4 flip-rtl" aria-hidden="true" />
                    )}
                    {existing ? t("tutor.resume") : t("tutor.start")}
                    <ArrowRight className="h-4 w-4 flip-rtl" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="surface-subtle p-4">
          <p className="flex items-center gap-1.5 text-sm font-bold">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            {t("tutor.tapWordHint")}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {t("tutor.gentleNote")}
          </p>
        </div>
        <div className="surface-subtle p-4">
          <p className="text-sm font-bold">{t("tutor.safeMode")}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {t("tutor.safeModeHint")}
          </p>
        </div>
      </div>

      <Modal
        open={deleteTarget !== null}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        title={t("tutor.deleteTitle")}
        description={t("tutor.deleteBody")}
        closeLabel={t("common.close")}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={() => void confirmDelete()}
              loading={deleting}
              icon={<Trash2 className="h-4 w-4" />}
            >
              {t("tutor.delete")}
            </Button>
          </div>
        }
      >
        <div className="rounded-2xl bg-muted/40 p-3 text-sm font-semibold">
          {deleteTarget
            ? language === "ar"
              ? deleteTarget.titleAr
              : deleteTarget.titleDe
            : ""}
        </div>
      </Modal>
    </div>
  );
}
