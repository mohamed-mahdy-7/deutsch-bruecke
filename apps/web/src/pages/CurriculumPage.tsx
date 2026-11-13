import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Blocks,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Headphones,
  Layers,
  Lock,
  MessageCircle,
  Mic,
  Play,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { CURRICULUM_LEVELS, CURRICULUM_UNITS } from "@/data/curriculum";
import type {
  CefrLevel,
  CurriculumActivity,
  CurriculumActivityKind,
  CurriculumLesson,
  CurriculumUnit,
} from "@/types/domain";
import { useAppPreferences } from "@/state/useAppPreferences";
import { useProgress } from "@/state/ProgressProvider";
import {
  completedLessonIds,
  curriculumLessonStatus,
  curriculumLevelProgress,
  curriculumLessonNumbers,
  curriculumUnitProgress,
  isUnitUnlocked,
  nextCurriculumLesson,
  overallCurriculumProgress,
} from "@/lib/curriculum";
import { LEVEL_LABEL_KEY } from "@/lib/uiLabels";
import { SCENARIO_THEME } from "@/lib/scenarioTheme";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedTabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ProgressBar, ProgressRing } from "@/components/ui/Progress";
import { Modal } from "@/components/ui/Modal";

const ACTIVITY_ICON: Record<CurriculumActivityKind, LucideIcon> = {
  scenario: MessageCircle,
  grammar: Layers,
  vocabulary: BookOpen,
  builder: Blocks,
  listening: Headphones,
  pronunciation: Mic,
};

function isCefrLevel(value: string | null): value is CefrLevel {
  return value === "A1" || value === "A2" || value === "B1";
}

function activityLabel(
  activity: CurriculumActivity,
  language: "ar" | "en",
): string {
  return language === "ar" ? activity.labelAr : activity.labelEn;
}

function lessonTitle(lesson: CurriculumLesson, language: "ar" | "en"): string {
  return language === "ar" ? lesson.titleAr : lesson.titleEn;
}

function lessonSummary(lesson: CurriculumLesson, language: "ar" | "en"): string {
  return language === "ar" ? lesson.summaryAr : lesson.summaryEn;
}

function lessonGoal(lesson: CurriculumLesson, language: "ar" | "en"): string {
  return language === "ar" ? lesson.goalAr : lesson.goalEn;
}

function unitTitle(unit: CurriculumUnit, language: "ar" | "en"): string {
  return language === "ar" ? unit.titleAr : unit.titleEn;
}

function unitDescription(unit: CurriculumUnit, language: "ar" | "en"): string {
  return language === "ar" ? unit.descriptionAr : unit.descriptionEn;
}

export function CurriculumPage() {
  const { t, language } = useAppPreferences();
  const { progress, completeCurriculumLesson } = useProgress();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pendingLesson, setPendingLesson] = useState<CurriculumLesson | null>(
    null,
  );
  const [justCompleted, setJustCompleted] = useState<string | null>(null);

  const completions = progress?.curriculumCompletions ?? [];
  const completedIds = useMemo(
    () => completedLessonIds(completions),
    [completions],
  );
  const overall = overallCurriculumProgress(completions);
  const lessonNumbers = curriculumLessonNumbers(completions);
  const nextLesson = nextCurriculumLesson(completions);

  const profileLevel = progress?.profile.level ?? "A1";
  const requestedLevel = searchParams.get("level");
  const activeLevel: CefrLevel = isCefrLevel(requestedLevel)
    ? requestedLevel
    : profileLevel;

  const levelIndex = CURRICULUM_LEVELS.indexOf(activeLevel);
  const units = CURRICULUM_UNITS.filter((unit) => unit.level === activeLevel);
  const levelProgress = curriculumLevelProgress(activeLevel, completions);

  function selectLevel(level: string) {
    if (!isCefrLevel(level)) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("level", level);
    setSearchParams(nextParams, { replace: true });
    setJustCompleted(null);
  }

  const nextUnit = nextLesson
    ? (CURRICULUM_UNITS.find((unit) => unit.id === nextLesson.unitId) ?? null)
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("curriculum.eyebrow")}
        title={t("curriculum.title")}
        subtitle={t("curriculum.subtitle")}
        actions={
          nextLesson ? (
            <Link
              to={nextLesson.activities[0]?.href ?? "/dashboard"}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              {t("curriculum.continue")}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
          ) : (
            <Link
              to="/tutor"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {t("curriculum.freePractice")}
            </Link>
          )
        }
      />

      <section className="surface-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <ProgressRing
            value={overall.percent}
            size={92}
            strokeWidth={9}
            label={t("curriculum.overallProgress", {
              percent: overall.percent,
            })}
          >
            <span className="text-xl font-extrabold leading-none">
              {overall.percent}%
            </span>
            <span className="mt-1 text-[0.6rem] font-bold text-muted-foreground">
              {t("curriculum.overall")}
            </span>
          </ProgressRing>
          <div>
            <p className="text-sm font-extrabold">
              {t("curriculum.lessonsDone", {
                done: lessonNumbers.completed,
                total: lessonNumbers.total,
              })}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t("curriculum.overallProgress", { percent: overall.percent })}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CURRICULUM_LEVELS.map((level) => {
                const pct = curriculumLevelProgress(level, completions);
                return (
                  <Badge
                    key={level}
                    tone={pct.percent === 100 ? "success" : "neutral"}
                  >
                    {t(LEVEL_LABEL_KEY[level])} · {pct.percent}%
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>

        {nextLesson && nextUnit ? (
          <div className="min-w-0 rounded-2xl border border-primary/20 bg-primary-soft/50 p-4 sm:max-w-md">
            <p className="eyebrow">{t("curriculum.nextUp")}</p>
            <p className="mt-1.5 text-sm font-extrabold">
              {lessonTitle(nextLesson, language)}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {unitTitle(nextUnit, language)} · {lessonGoal(nextLesson, language)}
            </p>
            <Link
              to={nextLesson.activities[0]?.href ?? "/dashboard"}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
            >
              {t("curriculum.start")}
              <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-success/25 bg-success/10 p-4">
            <Trophy className="h-8 w-8 shrink-0 text-success" aria-hidden="true" />
            <div>
              <p className="text-sm font-extrabold">{t("curriculum.allDone")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("curriculum.allDoneBody")}
              </p>
            </div>
          </div>
        )}
      </section>

      <div className="space-y-3">
        <SegmentedTabs
          ariaLabel={t("curriculum.eyebrow")}
          value={activeLevel}
          onChange={selectLevel}
          stretch
          items={CURRICULUM_LEVELS.map((level) => ({
            id: level,
            label: `${level} · ${t(LEVEL_LABEL_KEY[level])}`,
          }))}
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold text-muted-foreground">
            {t("curriculum.unitProgress", {
              done: levelProgress.completed,
              total: levelProgress.total,
            })}
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={t("common.back")}
              disabled={levelIndex <= 0}
              onClick={() => {
                const previous = CURRICULUM_LEVELS[levelIndex - 1];
                if (previous) selectLevel(previous);
              }}
            >
              <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={t("common.next")}
              disabled={levelIndex >= CURRICULUM_LEVELS.length - 1}
              onClick={() => {
                const next = CURRICULUM_LEVELS[levelIndex + 1];
                if (next) selectLevel(next);
              }}
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      {justCompleted ? (
        <Alert tone="success" title={t("curriculum.justCompleted")} />
      ) : null}

      <div className="space-y-5">
        {units.map((unit) => {
          const unlocked = isUnitUnlocked(unit, completions);
          const progressForUnit = curriculumUnitProgress(unit, completions);
          const theme = SCENARIO_THEME[unit.theme];

          return (
            <section
              key={unit.id}
              className={cn(
                "surface-card overflow-hidden",
                !unlocked && "border-dashed",
              )}
            >
              <div
                className={cn(
                  "flex flex-wrap items-start justify-between gap-3 border-b border-border/60 bg-gradient-to-br p-4 sm:p-5",
                  theme.panel,
                )}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={cn(
                      "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold",
                      theme.icon,
                    )}
                  >
                    {unit.order}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-extrabold sm:text-lg">
                        {unitTitle(unit, language)}
                      </h2>
                      <Badge tone={unlocked ? "primary" : "neutral"}>
                        {unlocked ? (
                          t("curriculum.stepNow")
                        ) : (
                          <>
                            <Lock className="h-3 w-3" aria-hidden="true" />
                            {t("curriculum.locked")}
                          </>
                        )}
                      </Badge>
                    </div>
                    <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
                      {unitDescription(unit, language)}
                    </p>
                  </div>
                </div>
                <div className="flex w-full items-center gap-3 sm:w-auto sm:flex-col sm:items-end">
                  <p className="text-xs font-bold text-muted-foreground">
                    {t("curriculum.unitProgress", {
                      done: progressForUnit.completed,
                      total: progressForUnit.total,
                    })}
                  </p>
                  <ProgressBar
                    value={progressForUnit.percent}
                    className="h-1.5 w-28"
                    tone={progressForUnit.percent === 100 ? "success" : "primary"}
                    label={t("curriculum.unit", { number: unit.order })}
                  />
                </div>
              </div>

              <ol className="divide-y divide-border/60">
                {unit.lessons.map((lesson) => {
                  const status = curriculumLessonStatus(lesson, completions);
                  const done = status === "done" || completedIds.has(lesson.id);
                  const locked = status === "locked";
                  const isNext = nextLesson?.id === lesson.id;

                  return (
                    <li
                      key={lesson.id}
                      className={cn(
                        "p-4 sm:p-5",
                        isNext && "bg-primary-soft/30",
                        locked && "opacity-70",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={cn(
                            "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold",
                            done
                              ? "bg-success/10 text-success"
                              : locked
                                ? "bg-muted text-muted-foreground"
                                : "bg-primary-soft text-primary",
                          )}
                        >
                          {done ? (
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          ) : locked ? (
                            <Lock className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            lesson.order
                          )}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-extrabold sm:text-base">
                              {lessonTitle(lesson, language)}
                            </h3>
                            <Badge
                              tone={
                                done
                                  ? "success"
                                  : isNext
                                    ? "accent"
                                    : locked
                                      ? "neutral"
                                      : "primary"
                              }
                            >
                              {done
                                ? t("curriculum.stepDone")
                                : locked
                                  ? t("curriculum.stepLocked")
                                  : isNext
                                    ? t("curriculum.nextUp")
                                    : t("curriculum.stepNow")}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                            {lessonSummary(lesson, language)}
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-3 text-[0.7rem] font-bold text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                              {t("curriculum.minutes", {
                                count: lesson.minutes,
                              })}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                              {t("curriculum.xp", { count: lesson.xp })}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Target className="h-3.5 w-3.5" aria-hidden="true" />
                              {t("curriculum.lessonLabel", {
                                number: lesson.order,
                              })}
                            </span>
                          </div>

                          {!locked ? (
                            <>
                              <p className="mt-2 text-xs leading-relaxed text-foreground/80">
                                <span className="font-bold">
                                  {t("curriculum.goal")}:
                                </span>{" "}
                                {lessonGoal(lesson, language)}
                              </p>

                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {lesson.activities.map((activity) => {
                                  const Icon = ACTIVITY_ICON[activity.kind];
                                  return (
                                    <Link
                                      key={`${lesson.id}-${activity.href}`}
                                      to={activity.href}
                                      className="touch-target inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-[0.7rem] font-bold text-foreground transition-colors hover:border-primary/40 hover:bg-muted/40"
                                    >
                                      <Icon
                                        className="h-3.5 w-3.5 text-muted-foreground"
                                        aria-hidden="true"
                                      />
                                      {activityLabel(activity, language)}
                                    </Link>
                                  );
                                })}
                              </div>

                              {!done ? (
                                <Button
                                  variant={isNext ? "primary" : "outline"}
                                  size="sm"
                                  className="mt-3"
                                  onClick={() => setPendingLesson(lesson)}
                                >
                                  <CheckCircle2
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  />
                                  {t("curriculum.markComplete")}
                                </Button>
                              ) : (
                                <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-success">
                                  <CheckCircle2
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  />
                                  {t("curriculum.completed")}
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                              {unlocked
                                ? t("curriculum.lockedLesson")
                                : t("curriculum.lockedUnit")}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>

      <Modal
        open={pendingLesson !== null}
        onClose={() => setPendingLesson(null)}
        title={t("curriculum.completeTitle")}
        description={t("curriculum.completeBody")}
        closeLabel={t("common.close")}
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => setPendingLesson(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (!pendingLesson) return;
                completeCurriculumLesson({
                  lessonId: pendingLesson.id,
                  xp: pendingLesson.xp,
                });
                setJustCompleted(pendingLesson.id);
                setPendingLesson(null);
              }}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {t("curriculum.confirmComplete")}
            </Button>
          </div>
        }
      >
        {pendingLesson ? (
          <div className="rounded-2xl border border-border/70 bg-muted/30 p-3">
            <p className="text-sm font-extrabold">
              {lessonTitle(pendingLesson, language)}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {lessonGoal(pendingLesson, language)}
            </p>
            <div className="mt-2">
              <p className="text-[0.7rem] font-bold text-muted-foreground">
                {t("curriculum.activities")}
              </p>
              <p className="mt-1 text-xs text-foreground/80">
                {pendingLesson.activities
                  .map((activity) => activityLabel(activity, language))
                  .join(" · ")}
              </p>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
