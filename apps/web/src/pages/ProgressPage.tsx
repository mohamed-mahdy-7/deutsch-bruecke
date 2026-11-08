import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  Lightbulb,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import type { GrammarTopic } from "@/types/domain";
import { useAppPreferences } from "@/state/useAppPreferences";
import { useProgress } from "@/state/ProgressProvider";
import { sortWeakSpots, topicAccuracy } from "@/lib/adaptive";
import {
  TOPIC_LABEL_KEY,
  weakSpotHref,
} from "@/lib/uiLabels";
import {
  dateKey,
  daysAgoLabel,
  formatShortDate,
  lastNDays,
} from "@/lib/dates";
import { cn, percent } from "@/lib/utils";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { StatCard } from "@/components/ui/StatCard";
import { ProgressBar } from "@/components/ui/Progress";
import { EmptyState } from "@/components/ui/Feedback";
import { buttonCn } from "@/components/ui/Button";

const TOPIC_ORDER: GrammarTopic[] = [
  "articles",
  "cases",
  "prepositions",
  "word_order",
  "vocabulary",
];

const HEAT_CLASSES = [
  "bg-muted/70",
  "bg-primary/15",
  "bg-primary/30",
  "bg-primary/50",
  "bg-primary/75",
  "bg-primary",
] as const;

function weekdayLabel(key: string, language: "ar" | "en"): string {
  const [year = 1970, month = 1, day = 1] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(
    language === "ar" ? "ar-EG" : "en-GB",
    { weekday: "short" },
  );
}

function heatLevel(seconds: number, goalSeconds: number): number {
  if (seconds <= 0) return 0;
  const ratio = seconds / Math.max(goalSeconds, 60);
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.55) return 2;
  if (ratio <= 1) return 3;
  if (ratio <= 1.8) return 4;
  return 5;
}

export function ProgressPage() {
  const { t, language } = useAppPreferences();
  const { progress } = useProgress();

  if (!progress) return null;

  const activityByDate = new Map(
    progress.activity.map((day) => [day.date, day]),
  );
  const weeklyKeys = lastNDays(7);
  const weekly = weeklyKeys.map((key) => {
    const day = activityByDate.get(key);
    const minutes = day ? Math.floor(day.seconds / 60) : 0;
    return { key, minutes, xp: day?.xp ?? 0 };
  });
  const weeklyMinutes = weekly.reduce((sum, day) => sum + day.minutes, 0);
  const weeklyMax = Math.max(
    progress.profile.dailyGoalMinutes,
    ...weekly.map((day) => day.minutes),
    1,
  );
  const todayKey = dateKey();

  const heatDays = lastNDays(30).map((key) => {
    const day = activityByDate.get(key);
    return {
      key,
      minutes: day ? Math.floor(day.seconds / 60) : 0,
      xp: day?.xp ?? 0,
      level: heatLevel(
        day?.seconds ?? 0,
        progress.profile.dailyGoalMinutes * 60,
      ),
    };
  });

  const totalSeconds = progress.activity.reduce(
    (sum, day) => sum + day.seconds,
    0,
  );
  const totalMinutes = Math.floor(totalSeconds / 60);
  const activeDays = progress.activity.filter(
    (day) => day.seconds > 0 || day.xp > 0,
  ).length;
  const correctAnswers = progress.drillResults.filter(
    (result) => result.correct,
  ).length;
  const totalAnswers = progress.drillResults.length;
  const accuracy = percent(correctAnswers, totalAnswers);
  const xpLevel = Math.floor(progress.xp / 120) + 1;

  const accuracyByTopic = topicAccuracy(progress.drillResults);
  const topicRows = TOPIC_ORDER.flatMap((topic) => {
    const row = accuracyByTopic[topic];
    return row && row.attempts > 0 ? [{ topic, ...row }] : [];
  });
  const sortedTopics = [...topicRows].sort((a, b) => b.percent - a.percent);
  const strongest = sortedTopics[0];
  const weakest = sortedTopics[sortedTopics.length - 1];

  const weakSpots = sortWeakSpots(progress.weakSpots).slice(0, 6);
  const recentResults = [...progress.drillResults]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 8);

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={t("nav.progress")}
        title={t("progress.title")}
        subtitle={t("progress.subtitle")}
        actions={
          <Badge tone="primary">
            <Flame className="h-3 w-3" aria-hidden="true" />
            {t("progress.streakDays", { count: progress.streak.current })}
          </Badge>
        }
      />

      <div className="mt-5 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Flame}
          label={t("progress.streak")}
          value={`${progress.streak.current}`}
          hint={t("progress.longestStreak") + `: ${progress.streak.longest}`}
          tone="accent"
        />
        <StatCard
          icon={Zap}
          label={t("progress.xp")}
          value={`${progress.xp}`}
          hint={t("dash.xpLevel", { level: xpLevel })}
          tone="primary"
        />
        <StatCard
          icon={Clock3}
          label={t("progress.time")}
          value={t("progress.timeValue", { count: totalMinutes })}
          hint={t("progress.daysActive", { count: activeDays })}
          tone="success"
        />
        <StatCard
          icon={Target}
          label={t("progress.accuracy")}
          value={totalAnswers > 0 ? `${accuracy}%` : "—"}
          hint={
            totalAnswers > 0
              ? t("progress.correctOf", {
                  correct: correctAnswers,
                  total: totalAnswers,
                })
              : t("progress.noAttempts")
          }
          tone="warning"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <section className="surface-card p-5 sm:p-6">
          <SectionHeader
            title={t("progress.weeklyTitle")}
            subtitle={t("progress.weeklyBody")}
            action={
              <Badge tone="neutral">
                <Clock3 className="h-3 w-3" aria-hidden="true" />
                {t("progress.timeValue", { count: weeklyMinutes })}
              </Badge>
            }
          />

          <div className="flex h-40 items-end gap-1.5 sm:gap-2">
            {weekly.map((day) => {
              const isToday = day.key === todayKey;
              const height =
                day.minutes > 0
                  ? Math.max(8, Math.round((day.minutes / weeklyMax) * 100))
                  : 3;
              return (
                <div
                  key={day.key}
                  className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
                  title={`${daysAgoLabel(day.key, language)} · ${day.minutes} ${t(
                    "progress.minutesUnit",
                  )} · ${day.xp} ${t("progress.xpUnit")}`}
                >
                  <div className="flex w-full flex-1 items-end">
                    <div
                      style={{ height: `${height}%` }}
                      className={cn(
                        "w-full rounded-t-lg transition-all",
                        day.minutes > 0
                          ? isToday
                            ? "bg-gradient-to-t from-accent to-accent/60"
                            : "bg-gradient-to-t from-primary to-primary/55"
                          : "bg-muted",
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "max-w-full truncate text-[0.62rem] font-semibold text-muted-foreground",
                      isToday && "font-extrabold text-primary",
                    )}
                  >
                    {weekdayLabel(day.key, language)}
                  </span>
                  <span
                    className={cn(
                      "tnum text-[0.58rem] text-muted-foreground/80",
                      isToday && "font-bold text-foreground",
                    )}
                  >
                    {day.minutes}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="surface-card p-5 sm:p-6">
          <SectionHeader
            title={t("progress.accuracyTitle")}
            subtitle={t("progress.accuracyBody")}
          />

          {topicRows.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title={t("progress.topicsEmpty")}
              className="py-6"
            />
          ) : (
            <ul className="space-y-3.5">
              {topicRows.map((row) => (
                <li key={row.topic}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold">
                      {t(TOPIC_LABEL_KEY[row.topic])}
                    </span>
                    <span className="tnum text-xs font-extrabold">
                      {row.percent}%
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2.5">
                    <ProgressBar
                      value={row.percent}
                      max={100}
                      tone={row.percent >= 70 ? "success" : "warning"}
                      className="h-1.5"
                      label={t(TOPIC_LABEL_KEY[row.topic])}
                    />
                    <span className="shrink-0 text-[0.62rem] text-muted-foreground">
                      {t("progress.attempts", { count: row.attempts })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="surface-card mt-4 p-5 sm:p-6">
        <SectionHeader
          title={t("progress.activity")}
          subtitle={t("progress.legend")}
          action={
            <div className="flex items-center gap-1.5 text-[0.62rem] text-muted-foreground">
              <span>{t("progress.less")}</span>
              {HEAT_CLASSES.map((className, level) => (
                <span
                  key={level}
                  className={cn("h-3.5 w-3.5 rounded-sm", className)}
                />
              ))}
              <span>{t("progress.more")}</span>
            </div>
          }
        />

        <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
          {heatDays.map((day) => (
            <div
              key={day.key}
              role="img"
              title={`${daysAgoLabel(day.key, language)} · ${day.minutes} ${t(
                "progress.minutesUnit",
              )} · ${day.xp} ${t("progress.xpUnit")}`}
              className={cn(
                "h-7 rounded-md transition-transform hover:scale-110 sm:h-8",
                HEAT_CLASSES[day.level],
                day.key === todayKey && "ring-2 ring-accent ring-offset-2 ring-offset-card",
              )}
              aria-label={`${daysAgoLabel(day.key, language)}: ${t(
                "common.minutes",
                { count: day.minutes },
              )}`}
            />
          ))}
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-[0.68rem] text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          {t("progress.last30")}
        </p>
      </section>

      <div className="mt-4">
        <Alert
          tone="info"
          title={
            <span className="flex items-center gap-1.5">
              <Lightbulb className="h-4 w-4 text-primary" aria-hidden="true" />
              {t("progress.insightTitle")}
            </span>
          }
        >
          {topicRows.length === 0 ? (
            <p>{t("progress.insightNew")}</p>
          ) : (
            <div className="space-y-1.5">
              {strongest ? (
                <p className="flex items-start gap-1.5">
                  <TrendingUp
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success"
                    aria-hidden="true"
                  />
                  {t("progress.insightStrong", {
                    topic: t(TOPIC_LABEL_KEY[strongest.topic]),
                  })}
                </p>
              ) : null}
              {weakest && weakest.topic !== strongest?.topic ? (
                <p className="flex items-start gap-1.5">
                  <Target
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning"
                    aria-hidden="true"
                  />
                  {t("progress.insightWeak", {
                    topic: t(TOPIC_LABEL_KEY[weakest.topic]),
                  })}
                </p>
              ) : null}
            </div>
          )}
        </Alert>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <section>
          <SectionHeader
            title={t("progress.weakTitle")}
            subtitle={t("progress.weakBody")}
          />
          {weakSpots.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title={t("progress.weakEmpty")}
              className="py-7"
            />
          ) : (
            <ul className="space-y-2">
              {weakSpots.map((spot) => (
                <li key={spot.id}>
                  <Link
                    to={weakSpotHref(spot.topic)}
                    className="surface-card flex items-center gap-3 p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-lift"
                  >
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
                      <Target className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">
                        {language === "ar" ? spot.labelAr : spot.labelEn}
                      </span>
                      <span className="mt-0.5 block text-[0.65rem] text-muted-foreground">
                        {t(TOPIC_LABEL_KEY[spot.topic])} ·{" "}
                        {t("progress.attempts", { count: spot.count })}
                      </span>
                    </span>
                    <span className="shrink-0 text-[0.68rem] font-bold text-primary">
                      {t("progress.practiceCta")}
                    </span>
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

        <section>
          <SectionHeader
            title={t("progress.recent")}
            action={
              <Link
                to="/grammar"
                className={buttonCn("ghost", "sm", "h-8 px-2 text-xs")}
              >
                {t("grammar.title")}
                <ArrowRight className="h-3.5 w-3.5 flip-rtl" aria-hidden="true" />
              </Link>
            }
          />
          {recentResults.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title={t("progress.noDrills")}
              className="py-7"
            />
          ) : (
            <ul className="surface-card divide-y divide-border/60 overflow-hidden">
              {recentResults.map((result) => (
                <li
                  key={result.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  {result.correct ? (
                    <CheckCircle2
                      className="h-4 w-4 shrink-0 text-success"
                      aria-hidden="true"
                    />
                  ) : (
                    <XCircle
                      className="h-4 w-4 shrink-0 text-danger"
                      aria-hidden="true"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold">
                      {t(TOPIC_LABEL_KEY[result.topic])}
                    </p>
                    <p className="mt-0.5 truncate text-[0.62rem] text-muted-foreground">
                      {result.pattern.startsWith("vocab:")
                        ? t("vocab.title")
                        : result.pattern}
                    </p>
                  </div>
                  <div className="shrink-0 text-end">
                    <Badge tone={result.correct ? "success" : "danger"}>
                      {result.correct
                        ? t("common.correct")
                        : t("common.incorrect")}
                    </Badge>
                    <p className="mt-1 text-[0.6rem] text-muted-foreground">
                      {formatShortDate(result.createdAt, language)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-6">
        <ProgressBar
          value={progress.streak.current}
          max={Math.max(progress.streak.longest, 7)}
          tone="accent"
          className="h-1.5"
          label={t("progress.streak")}
        />
        <p className="mt-1.5 text-center text-[0.68rem] text-muted-foreground">
          {t("progress.theBestStreak")}: {progress.streak.longest} ·{" "}
          {t("progress.encouragement")}
        </p>
      </div>
    </div>
  );
}
