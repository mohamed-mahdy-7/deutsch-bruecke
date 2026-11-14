import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Target,
  WifiOff,
  XCircle,
} from "lucide-react";
import type {
  CefrLevel,
  DrillQuestion,
  DrillTopic,
  WeakSpot,
} from "@/types/domain";
import { staticDrillBank } from "@/data/drills";
import { useAppPreferences } from "@/state/useAppPreferences";
import { useProgress } from "@/state/ProgressProvider";
import { selectAdaptiveQuestions } from "@/lib/adaptive";
import {
  AiRequestError,
  requestDrillGeneration,
  type AiMode,
} from "@/services/ai";
import {
  toDrillQuestion,
  weakSpotsForTopic,
} from "@/services/drillMapping";
import { DRILL_TOPIC_LABEL_KEY } from "@/lib/uiLabels";
import { cn, percent } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/Progress";
import { EmptyState } from "@/components/ui/Feedback";
import { useAiAccess } from "@/state/AiAccessProvider";
import {
  AiAccessNotice,
  aiBlockKindForError,
  type AiBlockKind,
} from "@/components/ai/AiGate";

type Phase = "loading" | "error" | "session" | "result" | "empty";
type ErrorKind = "rate" | "offline" | "generic";
type QuestionSource = "ai" | "static";

const ARTICLE_TONE: Record<string, string> = {
  der: "grammar-der",
  den: "grammar-der",
  dem: "grammar-der",
  des: "grammar-der",
  die: "grammar-die",
  das: "grammar-das",
};

function optionToneClass(option: string): string | undefined {
  return ARTICLE_TONE[option.trim().toLowerCase()];
}

function classifyError(error: unknown): ErrorKind {
  if (error instanceof AiRequestError) {
    if (error.code === "rate_limited") return "rate";
    if (error.code === "network" || error.code === "timeout") return "offline";
  }
  return "generic";
}

function DrillSkeleton({
  topic,
  level,
}: {
  topic: DrillTopic;
  level: CefrLevel;
}) {
  const { t } = useAppPreferences();

  return (
    <div className="mx-auto max-w-3xl" role="status" aria-live="polite">
      <section className="surface-card p-5 sm:p-6">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-5 w-5 animate-pulse" aria-hidden="true" />
          <h2 className="text-lg font-extrabold">{t("grammar.generatingTitle")}</h2>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {t("grammar.generatingBody", {
            topic: t(DRILL_TOPIC_LABEL_KEY[topic]),
            level,
          })}
        </p>
        <p className="mt-3 text-xs font-bold text-muted-foreground">
          {t("grammar.generatingSkeleton")}
        </p>
        <div className="mt-4 space-y-2.5">
          <div className="h-20 animate-pulse rounded-2xl bg-muted/60" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-11 animate-pulse rounded-xl bg-muted/50"
                style={{ animationDelay: `${item * 80}ms` }}
              />
            ))}
          </div>
          <div className="h-14 animate-pulse rounded-2xl bg-muted/40" />
        </div>
      </section>
    </div>
  );
}

export function DrillSession({
  topic,
  level,
  weakSpots,
  onExit,
}: {
  topic: DrillTopic;
  level: CefrLevel;
  weakSpots: WeakSpot[];
  onExit: () => void;
}) {
  const { t, language } = useAppPreferences();
  const aiAccess = useAiAccess();
  const { recordDrillAnswer } = useProgress();
  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<DrillQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [source, setSource] = useState<QuestionSource>("ai");
  const [aiMode, setAiMode] = useState<AiMode | "unknown">("unknown");
  const [fallbackCount, setFallbackCount] = useState(0);
  const [errorKind, setErrorKind] = useState<ErrorKind>("generic");
  const [accessBlock, setAccessBlock] = useState<AiBlockKind | null>(null);
  const [requestId, setRequestId] = useState(0);

  const forceNextRef = useRef(false);
  const weakSpotsRef = useRef(weakSpots);
  weakSpotsRef.current = weakSpots;

  const hasStaticBank = staticDrillBank(topic).length > 0;
  const current = questions[index];
  const total = questions.length;

  useEffect(() => {
    let active = true;

    const run = async () => {
      setPhase("loading");
      setQuestions([]);
      setIndex(0);
      setSelected(null);
      setCorrectCount(0);
      setShowHint(false);
      setFallbackCount(0);
      setAccessBlock(null);

      try {
        const relevantWeakSpots = weakSpotsForTopic(
          topic,
          weakSpotsRef.current,
        ).slice(0, 8);
        const response = await requestDrillGeneration({
          topic,
          level,
          weakSpots: relevantWeakSpots.map((spot) => ({
            pattern: spot.pattern,
            count: spot.count,
            labelAr: spot.labelAr,
            labelEn: spot.labelEn,
          })),
          forceRegenerate: forceNextRef.current,
        });
        forceNextRef.current = false;
        if (!active) return;

        const mapped = response.data.questions.map(toDrillQuestion);
        setQuestions(mapped);
        setFallbackCount(response.data.fallbackCount);
        setAiMode(response.mode);
        setSource("ai");
        setPhase(mapped.length > 0 ? "session" : "empty");
      } catch (error) {
        forceNextRef.current = false;
        if (!active) return;
        const block = aiBlockKindForError(error);
        setAccessBlock(block);
        setErrorKind(classifyError(error));
        setPhase("error");
        if (block === "quota_exhausted") void aiAccess.refresh();
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [topic, level, requestId]);

  // Redeeming an invite (or signing in from another tab) should resume the
  // session the learner was trying to start, not leave them on the error card.
  useEffect(() => {
    if (
      aiAccess.status === "ready" &&
      (accessBlock === "beta_required" || accessBlock === "signed_out")
    ) {
      setAccessBlock(null);
      setRequestId((value) => value + 1);
    }
  }, [aiAccess.status, accessBlock]);

  const startStatic = () => {
    const bank = staticDrillBank(topic).map((question) => ({
      ...question,
      drillTopic: topic,
    }));
    const picked = selectAdaptiveQuestions(
      bank,
      weakSpotsRef.current,
      Math.min(10, bank.length),
    );
    forceNextRef.current = false;
    setQuestions(picked);
    setSource("static");
    setAiMode("unknown");
    setFallbackCount(0);
    setIndex(0);
    setSelected(null);
    setCorrectCount(0);
    setShowHint(false);
    setPhase(picked.length > 0 ? "session" : "empty");
  };

  const retry = () => {
    forceNextRef.current = false;
    setRequestId((value) => value + 1);
  };

  const newSession = () => {
    if (source === "static") {
      startStatic();
      return;
    }
    forceNextRef.current = true;
    setRequestId((value) => value + 1);
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

  if (phase === "loading") {
    return <DrillSkeleton topic={topic} level={level} />;
  }

  if (phase === "error") {
    if (accessBlock) {
      return (
        <div className="mx-auto max-w-2xl space-y-3">
          <AiAccessNotice kind={accessBlock} feature="drill" />
          <div className="flex flex-wrap justify-center gap-2">
            {hasStaticBank ? (
              <Button variant="outline" onClick={startStatic}>
                {t("grammar.useStatic")}
              </Button>
            ) : null}
            <Button variant="ghost" onClick={onExit}>
              {t("grammar.backToTopics")}
            </Button>
          </div>
          {hasStaticBank ? (
            <p className="text-center text-xs text-muted-foreground">
              {t("grammar.staticNote")}
            </p>
          ) : null}
        </div>
      );
    }

    const title = t("grammar.generationErrorTitle");
    const body =
      errorKind === "offline"
        ? t("grammar.generationOffline")
        : errorKind === "rate"
          ? t("grammar.generationRateLimit")
          : t("grammar.generationErrorBody");
    const Icon = errorKind === "offline" ? WifiOff : AlertCircle;

    return (
      <div className="mx-auto max-w-2xl">
        <section className="surface-card border-danger/20 px-6 py-8 text-center">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-extrabold">{title}</h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
            {body}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button onClick={retry} icon={<RotateCcw className="h-4 w-4" />}>
              {t("grammar.generationRetry")}
            </Button>
            {hasStaticBank ? (
              <Button variant="outline" onClick={startStatic}>
                {t("grammar.useStatic")}
              </Button>
            ) : null}
            <Button variant="ghost" onClick={onExit}>
              {t("grammar.backToTopics")}
            </Button>
          </div>
          {hasStaticBank ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {t("grammar.staticNote")}
            </p>
          ) : null}
        </section>
      </div>
    );
  }

  if (phase === "empty") {
    return (
      <EmptyState
        icon={HelpCircle}
        title={t("grammar.emptyTitle")}
        body={t("grammar.emptyBody")}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={retry} icon={<RotateCcw className="h-4 w-4" />}>
              {t("grammar.generationRetry")}
            </Button>
            <Button variant="outline" onClick={onExit}>
              {t("grammar.backToTopics")}
            </Button>
          </div>
        }
      />
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
              {t("grammar.resultText", { correct: correctCount, total })}
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
              <Button onClick={newSession} icon={<Sparkles className="h-4 w-4" />}>
                {source === "static"
                  ? t("grammar.newSession")
                  : t("grammar.generationAgain")}
              </Button>
              <Button
                variant="outline"
                onClick={onExit}
                icon={<ArrowRight className="h-4 w-4 flip-rtl" />}
              >
                {t("grammar.backToTopics")}
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
        title={t("grammar.emptyTitle")}
        body={t("grammar.emptyBody")}
        action={
          <Button variant="outline" onClick={onExit}>
            {t("grammar.backToTopics")}
          </Button>
        }
      />
    );
  }

  const isCorrect = selected === current.correctAnswer;
  const answered = selected !== null;
  const displayTopic = current.drillTopic ?? topic;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={onExit}>
            {t("grammar.backToTopics")}
          </Button>
          <Badge tone={source === "ai" ? "accent" : "neutral"}>
            {source === "ai" ? t("grammar.aiBadge") : t("grammar.staticBadge")}
          </Badge>
          {source === "ai" && aiMode === "demo" ? (
            <Badge tone="warning">{t("grammar.demoBadge")}</Badge>
          ) : null}
        </div>
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

      {fallbackCount > 0 ? (
        <p className="mb-3 rounded-xl border border-warning/25 bg-warning/10 px-3 py-2 text-xs leading-relaxed">
          {t("grammar.fallbackNote", { count: fallbackCount })}
        </p>
      ) : null}

      <section className="surface-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="primary">{t(DRILL_TOPIC_LABEL_KEY[displayTopic])}</Badge>
          <Badge tone="neutral">{current.level}</Badge>
          {current.weakSpotAr ? (
            <Badge tone="neutral">
              {language === "ar" ? current.weakSpotAr : current.weakSpotEn}
            </Badge>
          ) : null}
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
          {current.promptAfter ? <span>{current.promptAfter}</span> : null}
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
                <span className={optionToneClass(option)}>{option}</span>
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

      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Target className="h-3.5 w-3.5" aria-hidden="true" />
        {source === "ai"
          ? t("grammar.aiSourceNote")
          : t("grammar.staticSourceNote")}
      </p>
    </div>
  );
}
