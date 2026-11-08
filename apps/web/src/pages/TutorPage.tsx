import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type { AiMode } from "@/services/ai";
import { fetchAiHealth } from "@/services/ai";
import { SCENARIOS } from "@/data/scenarios";
import { useAppPreferences } from "@/state/useAppPreferences";
import { useProgress } from "@/state/ProgressProvider";
import { LEVEL_LABEL_KEY } from "@/lib/uiLabels";
import { SCENARIO_THEME } from "@/lib/scenarioTheme";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { buttonCn } from "@/components/ui/Button";
import { GermanText } from "@/components/german/GermanText";

export function TutorPage() {
  const { t, language } = useAppPreferences();
  const { progress } = useProgress();
  const [aiMode, setAiMode] = useState<AiMode | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchAiHealth().then((result) => {
      if (alive) setAiMode(result.mode);
    });
    return () => {
      alive = false;
    };
  }, []);

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

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SCENARIOS.map((scenario) => {
          const theme = SCENARIO_THEME[scenario.color];
          const existing = progress?.conversations.some(
            (conversation) => conversation.scenarioId === scenario.id,
          );
          const title = language === "ar" ? scenario.titleAr : scenario.titleEn;
          const description =
            language === "ar" ? scenario.descriptionAr : scenario.descriptionEn;
          const goals = language === "ar" ? scenario.goalsAr : scenario.goalsEn;

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
                      {t("tutor.minutes", { count: scenario.durationMinutes })}
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
    </div>
  );
}
