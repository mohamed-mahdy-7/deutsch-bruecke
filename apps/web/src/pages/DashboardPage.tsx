import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Blocks,
  BookOpen,
  Clock3,
  Flame,
  GraduationCap,
  Headphones,
  Layers,
  MessageCircle,
  Mic,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { SCENARIOS, getScenario } from "@/data/scenarios";
import { useAppPreferences } from "@/state/useAppPreferences";
import { useCustomScenarios } from "@/state/CustomScenariosProvider";
import { useProgress, useTodayActivity } from "@/state/ProgressProvider";
import { customScenarioToScenario } from "@/services/customScenarioMapping";
import { dueCards } from "@/lib/srs";
import { sortWeakSpots } from "@/lib/adaptive";
import {
  curriculumLessonNumbers,
  nextCurriculumLesson,
  overallCurriculumProgress,
} from "@/lib/curriculum";
import { CURRICULUM_UNITS } from "@/data/curriculum";
import { LEVEL_LABEL_KEY, weakSpotHref } from "@/lib/uiLabels";
import { SCENARIO_THEME } from "@/lib/scenarioTheme";
import { percent } from "@/lib/utils";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar, ProgressRing } from "@/components/ui/Progress";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/Feedback";
import { buttonCn } from "@/components/ui/Button";
import { GrammarLegend } from "@/components/german/GrammarLegend";

export function DashboardPage() {
  const { t, language } = useAppPreferences();
  const { progress } = useProgress();
  const { getScenario: getCustomScenario } = useCustomScenarios();
  const today = useTodayActivity();

  if (!progress) return null;

  const profile = progress.profile;
  const due = dueCards(progress.vocabCards);
  const reviewCount = Math.min(due.length, 12);
  const correct = progress.drillResults.filter((result) => result.correct).length;
  const accuracy = percent(correct, progress.drillResults.length);
  const todayMinutes = today ? Math.floor(today.seconds / 60) : 0;
  const goalProgress = percent(todayMinutes, profile.dailyGoalMinutes);
  const xpLevel = Math.floor(progress.xp / 120) + 1;
  const weakSpots = sortWeakSpots(progress.weakSpots).slice(0, 3);

  const latestConversation = [...progress.conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )[0];
  const resumeScenario = latestConversation
    ? getScenario(latestConversation.scenarioId) ??
      (() => {
        const custom = getCustomScenario(latestConversation.scenarioId);
        return custom ? customScenarioToScenario(custom) : undefined;
      })()
    : undefined;
  const nextScenario =
    resumeScenario ??
    SCENARIOS.find((scenario) => scenario.level === profile.level) ??
    SCENARIOS[0]!;

  const displayName = profile.displayName.trim() || t("profile.guest");
  const nextTheme = SCENARIO_THEME[nextScenario.color];

  const completions = progress.curriculumCompletions;
  const curriculumProgress = overallCurriculumProgress(completions);
  const curriculumNumbers = curriculumLessonNumbers(completions);
  const nextLesson = nextCurriculumLesson(completions);
  const nextLessonUnit = nextLesson
    ? CURRICULUM_UNITS.find((unit) => unit.id === nextLesson.unitId)
    : null;
  const nextLessonTitle = nextLesson
    ? language === "ar"
      ? nextLesson.titleAr
      : nextLesson.titleEn
    : null;
  const nextLessonUnitTitle = nextLessonUnit
    ? language === "ar"
      ? nextLessonUnit.titleAr
      : nextLessonUnit.titleEn
    : null;
  const levelQuery = `?level=${profile.level}`;

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={t("brand.promise")}
        title={t("dash.greeting", { name: displayName })}
        subtitle={t("dash.subtitle")}
        actions={
          <Link to="/progress" className={buttonCn("outline", "md")}>
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
            {t("dash.viewProgress")}
          </Link>
        }
      />

      <div className="mt-5 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Flame}
          label={t("dash.streak")}
          value={`${progress.streak.current}`}
          hint={t("dash.longestStreak", { count: progress.streak.longest })}
          tone="accent"
        />
        <StatCard
          icon={Zap}
          label={t("dash.xp")}
          value={`${progress.xp}`}
          hint={t("dash.xpLevel", { level: xpLevel })}
          tone="primary"
        />
        <StatCard
          icon={Layers}
          label={t("vocab.due")}
          value={`${due.length}`}
          hint={t("vocab.total", { count: progress.vocabCards.length })}
          tone="warning"
        />
        <StatCard
          icon={Target}
          label={t("dash.accuracy")}
          value={progress.drillResults.length > 0 ? `${accuracy}%` : "—"}
          hint={
            progress.drillResults.length > 0
              ? t("progress.correctOf", {
                  correct,
                  total: progress.drillResults.length,
                })
              : t("progress.noAttempts")
          }
          tone="success"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <section
          className={`surface-card overflow-hidden bg-gradient-to-br ${nextTheme.panel} p-5 sm:p-6`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="eyebrow">{t("dash.continueTitle")}</p>
              <h2 className="mt-1 text-xl font-extrabold sm:text-2xl">
                {language === "ar"
                  ? nextScenario.titleAr
                  : nextScenario.titleEn}
              </h2>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                {language === "ar"
                  ? nextScenario.settingAr
                  : nextScenario.settingEn}
              </p>
            </div>
            <span
              className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${nextTheme.icon}`}
            >
              <MessageCircle className="h-6 w-6" aria-hidden="true" />
            </span>
          </div>

          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
            {t("dash.continueBody", {
              minutes: nextScenario.durationMinutes,
              scenario:
                language === "ar"
                  ? nextScenario.titleAr
                  : nextScenario.titleEn,
            })}
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge tone="neutral">
              {t("tutor.level", {
                level: t(LEVEL_LABEL_KEY[nextScenario.level]),
              })}
            </Badge>
            <Badge tone="neutral">
              <Clock3 className="h-3 w-3" aria-hidden="true" />
              {t("tutor.minutes", { count: nextScenario.durationMinutes })}
            </Badge>
            <Badge tone="neutral">
              {language === "ar"
                ? nextScenario.aiRoleAr
                : nextScenario.aiRoleEn}
            </Badge>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link
              to={`/tutor/${nextScenario.id}`}
              className={buttonCn("primary", "md")}
            >
              {latestConversation ? (
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Play className="h-4 w-4 flip-rtl" aria-hidden="true" />
              )}
              {latestConversation
                ? t("tutor.resume")
                : t("dash.openScenario")}
              <ArrowRight className="h-4 w-4 flip-rtl" aria-hidden="true" />
            </Link>
            <Link to="/tutor" className={buttonCn("ghost", "md")}>
              {t("dash.scenariosTitle")}
            </Link>
          </div>
        </section>

        <div className="space-y-4">
          <section className="surface-card p-4 sm:p-5">
            <div className="flex items-center gap-4">
              <ProgressRing
                value={goalProgress}
                size={86}
                strokeWidth={8}
                label={t("dash.todayGoal")}
              >
                <span className="tnum text-xl font-extrabold">
                  {todayMinutes}
                </span>
                <span className="text-[0.6rem] font-bold text-muted-foreground">
                  / {profile.dailyGoalMinutes} {t("common.min")}
                </span>
              </ProgressRing>
              <div className="min-w-0">
                <p className="eyebrow">{t("dash.todayGoal")}</p>
                <p className="mt-1 text-sm font-bold">
                  {todayMinutes >= profile.dailyGoalMinutes
                    ? t("dash.goalReached")
                    : t("dash.goalProgress", {
                        done: todayMinutes,
                        goal: profile.dailyGoalMinutes,
                      })}
                </p>
                <p className="mt-1 text-[0.68rem] text-muted-foreground">
                  {t("dash.todayXp", { count: today?.xp ?? 0 })} ·{" "}
                  {t("dash.minutesToday", { count: todayMinutes })}
                </p>
              </div>
            </div>
          </section>

          <section className="surface-card p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-extrabold">
                  <Layers className="h-4 w-4 text-primary" aria-hidden="true" />
                  {t("dash.reviewTitle")}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {due.length > 0
                    ? t("dash.reviewBody", { count: due.length })
                    : t("dash.reviewEmpty")}
                </p>
              </div>
              {due.length > 0 ? (
                <Badge tone="warning">{due.length}</Badge>
              ) : null}
            </div>
            <Link
              to={due.length > 0 ? "/vocabulary/review" : "/vocabulary"}
              className={buttonCn(
                due.length > 0 ? "accent" : "outline",
                "sm",
                "mt-3 w-full",
              )}
            >
              {due.length > 0
                ? t("dash.reviewCta", { count: reviewCount })
                : t("vocab.browse")}
              <ArrowRight className="h-3.5 w-3.5 flip-rtl" aria-hidden="true" />
            </Link>
          </section>
        </div>
      </div>

      <section className="mt-6">
        <SectionHeader
          title={t("dashboard.curriculumTitle")}
          subtitle={t("dashboard.curriculumBody")}
          action={
            <Link
              to="/curriculum"
              className="text-xs font-bold text-primary hover:underline"
            >
              {t("common.viewAll")}
            </Link>
          }
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Link
            to={
              nextLesson?.activities[0]?.href ??
              "/curriculum"
            }
            className="surface-card group flex flex-col justify-between gap-4 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift sm:col-span-2 xl:col-span-1"
          >
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <GraduationCap className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1 text-sm font-extrabold">
                  {t("dashboard.curriculumTitle")}
                  <ArrowRight
                    className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 flip-rtl"
                    aria-hidden="true"
                  />
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {nextLesson
                    ? `${nextLessonUnitTitle} · ${nextLessonTitle}`
                    : t("curriculum.allDoneBody")}
                </p>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between gap-2 text-[0.7rem] font-bold text-muted-foreground">
                <span>
                  {t("curriculum.lessonsDone", {
                    done: curriculumNumbers.completed,
                    total: curriculumNumbers.total,
                  })}
                </span>
                <span>{curriculumProgress.percent}%</span>
              </div>
              <ProgressBar
                value={curriculumProgress.percent}
                className="mt-1.5 h-1.5"
                label={t("curriculum.overall")}
              />
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary">
                {nextLesson
                  ? t("dashboard.continueLesson")
                  : t("curriculum.allDone")}
                <ArrowRight
                  className="h-3.5 w-3.5 flip-rtl"
                  aria-hidden="true"
                />
              </span>
            </div>
          </Link>

          <Link
            to={`/listening${levelQuery}`}
            className="surface-card group flex items-start gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift"
          >
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-masc/10 text-masc">
              <Headphones className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1 text-sm font-bold">
                {t("dashboard.listeningTitle")}
                <ArrowRight
                  className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 flip-rtl"
                  aria-hidden="true"
                />
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                {t("dashboard.listeningBody")}
              </span>
              <span className="mt-2 inline-block text-xs font-bold text-primary">
                {t("dashboard.openListening")}
              </span>
            </span>
          </Link>

          <Link
            to={`/pronunciation${levelQuery}`}
            className="surface-card group flex items-start gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift"
          >
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-foreground">
              <Mic className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1 text-sm font-bold">
                {t("dashboard.pronunciationTitle")}
                <ArrowRight
                  className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 flip-rtl"
                  aria-hidden="true"
                />
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                {t("dashboard.pronunciationBody")}
              </span>
              <span className="mt-2 inline-block text-xs font-bold text-primary">
                {t("dashboard.openPronunciation")}
              </span>
            </span>
          </Link>
        </div>
      </section>

      <section className="mt-6">
        <SectionHeader
          title={t("dash.quickTitle")}
          subtitle={t("dash.quickBody")}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              to: "/grammar?topic=articles",
              icon: BookOpen,
              title: t("dash.articles"),
              body: t("dash.articlesBody"),
              tone: "bg-primary-soft text-primary",
            },
            {
              to: "/builder",
              icon: Blocks,
              title: t("dash.builder"),
              body: t("dash.builderBody"),
              tone: "bg-accent-soft text-accent-soft-foreground",
            },
            {
              to: "/grammar?topic=prepositions",
              icon: Target,
              title: t("dash.prepositions"),
              body: t("dash.prepositionsBody"),
              tone: "bg-masc/10 text-masc",
            },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="surface-card group flex items-start gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift"
            >
              <span
                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.tone}`}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1 text-sm font-bold">
                  {item.title}
                  <ArrowRight
                    className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 flip-rtl"
                    aria-hidden="true"
                  />
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  {item.body}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <section>
          <SectionHeader
            title={t("dash.weakTitle")}
            subtitle={t("dash.weakBody")}
            action={
              <Link
                to="/progress"
                className="touch-target text-xs font-bold text-primary hover:underline"
              >
                {t("common.viewAll")}
              </Link>
            }
          />
          {weakSpots.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title={t("dash.weakEmpty")}
              body={t("grammar.noWeak")}
              className="py-7"
            />
          ) : (
            <ul className="space-y-2">
              {weakSpots.map((spot) => (
                <li key={spot.id}>
                  <Link
                    to={weakSpotHref(spot.topic)}
                    className="surface-card flex items-center gap-3 p-3.5 transition-colors hover:bg-muted/30"
                  >
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
                      <Target className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">
                        {language === "ar" ? spot.labelAr : spot.labelEn}
                      </span>
                      <span className="mt-0.5 block text-[0.68rem] text-muted-foreground">
                        {t("grammar.weakHint")}
                      </span>
                    </span>
                    <Badge tone="warning">{spot.count}</Badge>
                    <ArrowRight
                      className="h-4 w-4 shrink-0 text-muted-foreground flip-rtl"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface-card flex flex-col justify-between gap-4 p-5">
          <div>
            <p className="eyebrow">{t("dash.todaysPlan")}</p>
            <p className="mt-2 text-lg font-extrabold leading-snug">
              {t("dash.motivation")}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {todayMinutes >= profile.dailyGoalMinutes
                ? t("dash.keepGoing")
                : t("progress.encouragement")}
            </p>
          </div>
          <div className="rounded-2xl bg-muted/40 p-3">
            <GrammarLegend />
          </div>
          <Link to="/grammar" className={buttonCn("outline", "sm", "w-full")}>
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            {t("grammar.title")}
          </Link>
        </section>
      </div>

      <section className="mt-6">
        <SectionHeader
          title={t("dash.scenariosTitle")}
          subtitle={t("dash.scenariosSubtitle")}
          action={
            <Link
              to="/tutor"
              className="text-xs font-bold text-primary hover:underline"
            >
              {t("common.viewAll")}
            </Link>
          }
        />
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {SCENARIOS.map((scenario) => {
            const theme = SCENARIO_THEME[scenario.color];
            const hasConversation = progress.conversations.some(
              (conversation) => conversation.scenarioId === scenario.id,
            );
            return (
              <Link
                key={scenario.id}
                to={`/tutor/${scenario.id}`}
                className="surface-card group flex min-w-0 items-center gap-3 p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-lift"
              >
                <span
                  className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${theme.icon}`}
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="min-w-0 truncate text-sm font-bold">
                      {language === "ar"
                        ? scenario.titleAr
                        : scenario.titleEn}
                    </span>
                    {hasConversation ? (
                      <Badge tone="success" className="shrink-0 py-0.5 text-[0.55rem]">
                        {t("tutor.resume")}
                      </Badge>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block truncate text-[0.68rem] text-muted-foreground">
                    {language === "ar"
                      ? scenario.descriptionAr
                      : scenario.descriptionEn}
                  </span>
                </span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-muted-foreground flip-rtl"
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </div>
      </section>

      <div className="mt-6">
        <ProgressBar
          value={goalProgress}
          label={t("dash.todayGoal")}
          tone="accent"
          className="h-1.5"
        />
        <p className="mt-1.5 text-center text-[0.68rem] text-muted-foreground">
          {t("dash.genderLegend")} · {t("dash.keepGoing")}
        </p>
      </div>
    </div>
  );
}
