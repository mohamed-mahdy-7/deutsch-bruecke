import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Compass,
  HelpCircle,
  Lightbulb,
  MapPin,
  Navigation,
  RotateCcw,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";
import type { DrillQuestion } from "@/types/domain";
import { ARTICLE_CASE_QUESTIONS, PREPOSITION_QUESTIONS } from "@/data/drills";
import { useAppPreferences } from "@/state/useAppPreferences";
import { useProgress } from "@/state/ProgressProvider";
import { selectAdaptiveQuestions, sortWeakSpots } from "@/lib/adaptive";
import { cn, percent } from "@/lib/utils";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { SegmentedTabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/Progress";
import { EmptyState } from "@/components/ui/Feedback";
import { GermanText } from "@/components/german/GermanText";
import { SpeakerButton } from "@/components/german/SpeakerButton";
import { GrammarLegend } from "@/components/german/GrammarLegend";

type GrammarTab = "articles" | "prepositions" | "guide";

const TAB_ITEMS = [
  { id: "articles", label: "grammar.tab.articles", icon: BookOpen },
  { id: "prepositions", label: "grammar.tab.prepositions", icon: MapPin },
  { id: "guide", label: "grammar.tab.guide", icon: Compass },
] as const;

const ARTICLE_TABLE = [
  {
    caseKey: "case.nominative",
    forms: ["der", "die", "das", "die"],
  },
  {
    caseKey: "case.accusative",
    forms: ["den", "die", "das", "die"],
  },
  {
    caseKey: "case.dative",
    forms: ["dem", "der", "dem", "den"],
  },
  {
    caseKey: "case.genitive",
    forms: ["des", "der", "des", "der"],
  },
] as const;

function GrammarTrainer({
  bank,
  startLabel,
  introLabel,
}: {
  bank: DrillQuestion[];
  startLabel: string;
  introLabel: string;
}) {
  const { t, language } = useAppPreferences();
  const { progress, recordDrillAnswer } = useProgress();
  const [phase, setPhase] = useState<"intro" | "session" | "result">("intro");
  const [questions, setQuestions] = useState<DrillQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const weakSpots = sortWeakSpots(progress?.weakSpots ?? []).slice(0, 4);
  const current = questions[index];
  const total = questions.length;

  const start = () => {
    const picked = selectAdaptiveQuestions(
      bank,
      progress?.weakSpots ?? [],
      Math.min(10, bank.length),
    );
    setQuestions(picked);
    setIndex(0);
    setSelected(null);
    setCorrectCount(0);
    setShowHint(false);
    setPhase(picked.length > 0 ? "session" : "result");
  };

  const answer = (option: string) => {
    if (!current || selected) return;
    const isCorrect = option === current.correctAnswer;
    setSelected(option);
    if (isCorrect) setCorrectCount((count) => count + 1);
    recordDrillAnswer({
      questionId: current.id,
      topic: current.topic,
      pattern: current.pattern,
      correct: isCorrect,
      labelAr: current.weakSpotAr,
      labelEn: current.weakSpotEn,
      xpCorrect: 6,
      xpIncorrect: 2,
    });
  };

  const next = () => {
    if (index + 1 >= total) {
      setPhase("result");
      return;
    }
    setIndex((value) => value + 1);
    setSelected(null);
    setShowHint(false);
  };

  if (phase === "intro") {
    return (
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="surface-card overflow-hidden p-5 sm:p-6">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="mt-3 text-xl font-extrabold">{introLabel}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {t("grammar.startIntro")}
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <Badge tone="primary">{t("grammar.sessionMeta")}</Badge>
            <Badge tone="neutral">{t("grammar.adaptive")}</Badge>
            <Badge tone="neutral">{t("grammar.weakHint")}</Badge>
          </div>
          <div className="mt-4 rounded-2xl bg-muted/40 p-3.5">
            <p className="flex items-center gap-1.5 text-sm font-bold">
              <Lightbulb className="h-4 w-4 text-warning" aria-hidden="true" />
              {t("grammar.articleMemory")}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t("grammar.prepositionTip")}
            </p>
          </div>
          <Button className="mt-5 w-full" size="lg" onClick={start}>
            {startLabel}
            <ArrowRight className="h-4 w-4 flip-rtl" aria-hidden="true" />
          </Button>
        </section>

        <section className="surface-card p-5">
          <p className="flex items-center gap-1.5 text-sm font-extrabold">
            <Target className="h-4 w-4 text-warning" aria-hidden="true" />
            {t("grammar.weakTitle")}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {t("grammar.weakBody")}
          </p>
          {weakSpots.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-border bg-muted/25 p-3 text-xs leading-relaxed text-muted-foreground">
              {t("grammar.noWeak")}
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {weakSpots.map((spot) => (
                <li
                  key={spot.id}
                  className="flex items-center gap-2 rounded-xl border border-border/60 bg-card p-2.5"
                >
                  <span className="min-w-0 flex-1 truncate text-xs font-bold">
                    {language === "ar" ? spot.labelAr : spot.labelEn}
                  </span>
                  <Badge tone="warning">{spot.count}</Badge>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 border-t border-border/60 pt-3">
            <GrammarLegend />
          </div>
        </section>
      </div>
    );
  }

  if (phase === "result") {
    const score = percent(correctCount, total);
    return (
      <div className="mx-auto max-w-2xl">
        <section className="surface-card overflow-hidden text-center">
          <div className="bg-gradient-to-br from-primary-soft/80 to-accent-soft/60 p-6 sm:p-8">
            <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-card text-success shadow-sm">
              <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
            </span>
            <h2 className="mt-3 text-2xl font-extrabold">
              {t("grammar.sessionComplete")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("grammar.resultText", {
                correct: correctCount,
                total: total || 0,
              })}
            </p>
            <div className="mx-auto mt-4 max-w-xs">
              <div className="flex items-end justify-center gap-1">
                <span className="tnum text-5xl font-extrabold text-primary">
                  {score}%
                </span>
              </div>
              <ProgressBar
                value={correctCount}
                max={Math.max(total, 1)}
                tone="success"
                className="mt-2 h-2"
                label={t("grammar.sessionProgress")}
              />
              <p className="mt-1.5 text-xs font-bold text-muted-foreground">
                {t("progress.correctOf", { correct: correctCount, total })}
              </p>
            </div>
          </div>
          <div className="p-5 sm:p-6">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("grammar.completeBody")}
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={start} icon={<RotateCcw className="h-4 w-4" />}>
                {t("grammar.again")}
              </Button>
              <Button
                variant="outline"
                onClick={() => setPhase("intro")}
                icon={<BookOpen className="h-4 w-4" />}
              >
                {t("grammar.back")}
              </Button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!current) {
    return (
      <EmptyState
        icon={HelpCircle}
        title={t("grammar.empty")}
        action={
          <Button variant="outline" onClick={() => setPhase("intro")}>
            {t("grammar.back")}
          </Button>
        }
      />
    );
  }

  const isCorrect = selected === current.correctAnswer;
  const answered = selected !== null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold text-muted-foreground">
          {t("grammar.questionOf", { current: index + 1, total })}
        </p>
        <Badge tone="success">
          {t("grammar.score", { score: correctCount })}
        </Badge>
      </div>
      <ProgressBar
        value={index + (answered ? 1 : 0)}
        max={total}
        className="mb-4 h-1.5"
        label={t("grammar.sessionProgress")}
      />

      <section className="surface-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="primary">{t(`topic.${current.topic}`)}</Badge>
          {current.caseLabelAr ? (
            <Badge tone="neutral">
              {language === "ar" ? current.caseLabelAr : current.caseLabelEn}
            </Badge>
          ) : null}
          <Badge tone="neutral">{current.level}</Badge>
        </div>

        <h2 className="mt-4 text-sm font-bold text-muted-foreground">
          {t("grammar.choose")}
        </h2>
        <div
          dir="ltr"
          className="german-text mt-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-2 text-xl font-semibold leading-relaxed sm:text-2xl"
        >
          {current.promptBefore ? <span>{current.promptBefore}</span> : null}
          <span
            className={cn(
              "inline-flex min-w-[5.5rem] items-center justify-center rounded-xl border-2 border-dashed px-3 py-0.5",
              answered && isCorrect
                ? "border-success/60 bg-success/10 text-success"
                : answered
                  ? "border-danger/60 bg-danger/10 text-danger"
                  : "border-primary/40 bg-primary-soft/40 text-primary",
            )}
          >
            {selected ?? "?"}
          </span>
          <span>{current.promptAfter}</span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {current.options.map((option) => {
            const selectedIsCorrect = option === current.correctAnswer;
            const isSelected = option === selected;
            return (
              <button
                key={option}
                type="button"
                onClick={() => answer(option)}
                disabled={answered}
                aria-pressed={isSelected}
                className={cn(
                  "german-inline min-h-11 rounded-xl border px-3 text-sm font-bold transition-all",
                  !answered &&
                    "border-border bg-card hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm",
                  answered &&
                    selectedIsCorrect &&
                    "border-success/50 bg-success/10 text-success",
                  answered &&
                    isSelected &&
                    !selectedIsCorrect &&
                    "border-danger/50 bg-danger/10 text-danger",
                  answered &&
                    !selectedIsCorrect &&
                    !isSelected &&
                    "border-border bg-card opacity-50",
                )}
              >
                {option}
              </button>
            );
          })}
        </div>

        {!answered ? (
          <div className="mt-4">
            {showHint ? (
              <p className="rounded-xl border border-warning/25 bg-warning/10 p-3 text-xs leading-relaxed">
                {language === "ar" ? current.hintAr : current.hintEn}
              </p>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHint(true)}
                icon={<Lightbulb className="h-4 w-4" />}
              >
                {t("grammar.hint")}
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-4 animate-fade-up">
            <p
              className={cn(
                "flex items-center gap-1.5 text-sm font-extrabold",
                isCorrect ? "text-success" : "text-danger",
              )}
            >
              {isCorrect ? (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <XCircle className="h-4 w-4" aria-hidden="true" />
              )}
              {isCorrect ? t("grammar.correct") : t("grammar.incorrect")}
            </p>
            {!isCorrect ? (
              <p className="mt-1 text-xs font-bold text-muted-foreground">
                {t("grammar.correctAnswer", {
                  answer: current.correctAnswer,
                })}
              </p>
            ) : null}
            <div className="mt-3 rounded-2xl border border-border/60 bg-muted/35 p-3.5">
              <p className="text-xs font-extrabold text-muted-foreground">
                {t("grammar.why")}
              </p>
              <p className="mt-1 text-sm leading-relaxed">
                {language === "ar"
                  ? current.explanationAr
                  : current.explanationEn}
              </p>
              <p className="mt-2 border-t border-border/50 pt-2 text-xs text-muted-foreground">
                {language === "ar"
                  ? current.translationAr
                  : current.translationEn}
              </p>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={next}>
                {index + 1 >= total ? t("grammar.finish") : t("grammar.next")}
                <ArrowRight className="h-4 w-4 flip-rtl" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function GrammarGuide() {
  const { t, language } = useAppPreferences();

  return (
    <div className="space-y-4">
      <section className="surface-card overflow-hidden">
        <div className="bg-gradient-to-br from-primary-soft/70 to-accent-soft/50 p-5 sm:p-6">
          <p className="eyebrow">{t("grammar.guideTitle")}</p>
          <h2 className="mt-1.5 text-xl font-extrabold sm:text-2xl">
            {t("grammar.articleMemory")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t("grammar.guideIntro")}
          </p>
          <div className="mt-3">
            <GrammarLegend />
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface-card p-5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <MapPin className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-extrabold">{t("grammar.woTitle")}</h3>
              <p className="text-xs text-muted-foreground">
                {t("grammar.woQuestion")}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed">{t("grammar.woRule")}</p>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 p-3">
            <div className="min-w-0 flex-1">
              <GermanText
                text={t("grammar.woExampleDe")}
                interactive={false}
                className="text-sm font-semibold"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t("grammar.woExampleAr")}
              </p>
            </div>
            <SpeakerButton text={t("grammar.woExampleDe")} />
          </div>
        </section>

        <section className="surface-card p-5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-foreground">
              <Navigation className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-extrabold">{t("grammar.wohinTitle")}</h3>
              <p className="text-xs text-muted-foreground">
                {t("grammar.wohinQuestion")}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed">{t("grammar.wohinRule")}</p>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 p-3">
            <div className="min-w-0 flex-1">
              <GermanText
                text={t("grammar.wohinExampleDe")}
                interactive={false}
                className="text-sm font-semibold"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t("grammar.wohinExampleAr")}
              </p>
            </div>
            <SpeakerButton text={t("grammar.wohinExampleDe")} />
          </div>
        </section>
      </div>

      <section className="surface-card p-5">
        <SectionHeader
          title={t("grammar.prepositionsVisual")}
          subtitle={t("grammar.prepositionTip")}
        />
        <div className="overflow-x-auto">
          <table dir="ltr" className="w-full min-w-[32rem] border-separate border-spacing-0 text-start">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="border-b border-border/60 p-2 text-start font-bold">
                  {t("grammar.tab.articles")}
                </th>
                <th className="border-b border-border/60 p-2 font-bold text-masc">
                  {t("gender.masculine")}
                </th>
                <th className="border-b border-border/60 p-2 font-bold text-fem">
                  {t("gender.feminine")}
                </th>
                <th className="border-b border-border/60 p-2 font-bold text-neut">
                  {t("gender.neuter")}
                </th>
                <th className="border-b border-border/60 p-2 font-bold">Plural</th>
              </tr>
            </thead>
            <tbody>
              {ARTICLE_TABLE.map((row) => (
                <tr key={row.caseKey}>
                  <th className="border-b border-border/40 p-2 text-start text-xs font-bold">
                    {t(row.caseKey)}
                  </th>
                  {row.forms.map((form, column) => (
                    <td
                      key={`${row.caseKey}-${column}`}
                      className={cn(
                        "german-inline border-b border-border/40 p-2 text-sm font-bold",
                        column === 0 && "grammar-der",
                        column === 1 && "grammar-die",
                        column === 2 && "grammar-das",
                      )}
                    >
                      {form}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface-card flex items-start gap-3 p-5">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="font-extrabold">{t("grammar.articleMemory")}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {language === "ar"
              ? "احفظ الاسم بأداته من أول مرة: der Tisch، die Tür، das Fenster. لما تعرف الحالة، غيّر النهاية بس."
              : "Learn each noun with its article from the start: der Tisch, die Tür, das Fenster. Once you know the case, change only the ending."}
          </p>
        </div>
      </section>
    </div>
  );
}

export function GrammarPage() {
  const { t } = useAppPreferences();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const tab: GrammarTab =
    rawTab === "prepositions" || rawTab === "guide" ? rawTab : "articles";

  const setTab = (next: string) => {
    setSearchParams(
      next === "articles" ? {} : { tab: next },
      { replace: true },
    );
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={t("nav.grammar")}
        title={t("grammar.title")}
        subtitle={t("grammar.subtitle")}
      />

      <SegmentedTabs
        items={TAB_ITEMS.map((item) => ({
          id: item.id,
          label: t(item.label),
          icon: item.icon,
        }))}
        value={tab}
        onChange={setTab}
        ariaLabel={t("grammar.selectPractice")}
        className="mt-4"
      />

      <div className="mt-5">
        {tab === "guide" ? <GrammarGuide /> : null}
        {tab === "articles" ? (
          <GrammarTrainer
            key="articles"
            bank={ARTICLE_CASE_QUESTIONS}
            startLabel={t("grammar.practiceArticles")}
            introLabel={t("grammar.mixedPractice")}
          />
        ) : null}
        {tab === "prepositions" ? (
          <GrammarTrainer
            key="prepositions"
            bank={PREPOSITION_QUESTIONS}
            startLabel={t("grammar.practicePreps")}
            introLabel={t("grammar.prepositionPractice")}
          />
        ) : null}
      </div>
    </div>
  );
}
