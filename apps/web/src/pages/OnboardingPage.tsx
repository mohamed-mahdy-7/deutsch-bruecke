import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  GraduationCap,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";
import { useProgress } from "@/state/ProgressProvider";
import { useAppPreferences } from "@/state/useAppPreferences";
import type {
  CefrLevel,
  NativeDialect,
  UiLanguage,
} from "@/types/domain";
import type { TranslationKey } from "@/lib/i18n";
import { PLACEMENT_QUESTIONS, recommendLevelFromPlacement } from "@/data/placement";
import { cn } from "@/lib/utils";
import { Brand } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { inputCn } from "@/components/ui/Field";
import { ProgressBar } from "@/components/ui/Progress";
import { LanguageToggle, ThemeToggle } from "@/components/layout/Toggles";

const TOTAL_STEPS = 4;

const LEVELS: CefrLevel[] = ["A1", "A2", "B1"];

const DIALECTS: Array<{ id: NativeDialect; key: TranslationKey }> = [
  { id: "egyptian", key: "dialect.egyptian" },
  { id: "levantine", key: "dialect.levantine" },
  { id: "gulf", key: "dialect.gulf" },
  { id: "maghrebi", key: "dialect.maghrebi" },
  { id: "msa", key: "dialect.msa" },
  { id: "other", key: "dialect.other" },
];

const GOALS = [
  { minutes: 10, key: "onboarding.goalHint.light" as TranslationKey },
  { minutes: 20, key: "onboarding.goalHint.regular" as TranslationKey },
  { minutes: 30, key: "onboarding.goalHint.serious" as TranslationKey },
];

export function OnboardingPage() {
  const { t, language, setLanguage } = useAppPreferences();
  const { progress, completeOnboarding } = useProgress();
  const navigate = useNavigate();

  const profile = progress?.profile;
  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile?.displayName ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [level, setLevel] = useState<CefrLevel>(profile?.level ?? "A1");
  const [dialect, setDialect] = useState<NativeDialect>(
    profile?.nativeDialect ?? "egyptian",
  );
  const [goal, setGoal] = useState(profile?.dailyGoalMinutes ?? 20);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [recommended, setRecommended] = useState<CefrLevel>(
    profile?.level ?? "A1",
  );
  const [finishing, setFinishing] = useState(false);

  const score = useMemo(
    () =>
      PLACEMENT_QUESTIONS.reduce(
        (total, question) =>
          total + (answers[question.id] === question.correctAnswer ? 1 : 0),
        0,
      ),
    [answers],
  );

  const activeQuestion = PLACEMENT_QUESTIONS[questionIndex];
  const selectedAnswer = activeQuestion
    ? answers[activeQuestion.id] ?? null
    : null;

  const goNextFromIntro = () => {
    if (!name.trim()) {
      setNameError(t("onboarding.nameRequired"));
      return;
    }
    setNameError(null);
    setStep(1);
  };

  const finishQuiz = () => {
    setRecommended(recommendLevelFromPlacement(score));
    setStep(3);
  };

  const skipQuiz = () => {
    setRecommended(level);
    setStep(3);
  };

  const answerQuestion = (option: string) => {
    if (!activeQuestion || selectedAnswer) return;
    setAnswers((current) => ({ ...current, [activeQuestion.id]: option }));
  };

  const nextQuestion = () => {
    if (!activeQuestion || !selectedAnswer) return;
    if (questionIndex + 1 >= PLACEMENT_QUESTIONS.length) {
      finishQuiz();
    } else {
      setQuestionIndex((current) => current + 1);
    }
  };

  const goBack = () => {
    if (step === 2 && questionIndex > 0) {
      setQuestionIndex((current) => current - 1);
      return;
    }
    if (step > 0) setStep((current) => current - 1);
  };

  const finish = () => {
    setFinishing(true);
    completeOnboarding({
      displayName: name.trim(),
      level,
      dailyGoalMinutes: goal,
      uiLanguage: language as UiLanguage,
      nativeDialect: dialect,
    });
    navigate("/dashboard", { replace: true });
  };

  const stepLabel = t("onboarding.step", {
    current: Math.min(step + 1, TOTAL_STEPS),
    total: TOTAL_STEPS,
  });

  return (
    <div className="min-h-dvh">
      <header className="safe-top flex min-h-16 items-center justify-between gap-3 border-b border-border/50 bg-background/80 px-4 backdrop-blur-md sm:px-6">
        <Brand compact />
        <div className="flex items-center gap-0.5">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="eyebrow">{t("brand.promise")}</p>
            <p className="mt-0.5 text-sm font-bold">{stepLabel}</p>
          </div>
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {Array.from({ length: TOTAL_STEPS }, (_value, index) => (
              <span
                key={index}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  index <= step ? "w-7 bg-primary" : "w-3 bg-border",
                )}
              />
            ))}
          </div>
        </div>
        <ProgressBar
          value={step + 1}
          max={TOTAL_STEPS}
          label={stepLabel}
          className="mb-6 h-1.5"
        />

        <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <aside className="hidden lg:block">
            <div className="sticky top-8 space-y-4">
              <div className="surface-card overflow-hidden p-5">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="mt-3 text-lg font-extrabold">
                  {t("onboarding.introTitle")}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {t("onboarding.introBody")}
                </p>
                <ul className="mt-4 space-y-2.5 text-xs text-muted-foreground">
                  {[
                    t("welcome.step1Body"),
                    t("welcome.step2Body"),
                    t("welcome.step3Body"),
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-success"
                        aria-hidden="true"
                      />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="px-1 text-[0.7rem] leading-relaxed text-muted-foreground">
                {t("onboarding.placementSaved")}
              </p>
            </div>
          </aside>

          <section className="surface-card p-5 sm:p-7">
            {step === 0 ? (
              <div key="step-intro" className="animate-fade-up">
                <p className="eyebrow">{t("onboarding.step", { current: 1, total: TOTAL_STEPS })}</p>
                <h1 className="mt-1.5 text-2xl font-extrabold sm:text-3xl">
                  {t("onboarding.introTitle")}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t("onboarding.introBody")}
                </p>

                <div className="mt-6 space-y-5">
                  <div>
                    <label
                      htmlFor="onboarding-name"
                      className="mb-1.5 block text-sm font-bold"
                    >
                      {t("onboarding.nameLabel")}
                    </label>
                    <input
                      id="onboarding-name"
                      value={name}
                      onChange={(event) => {
                        setName(event.target.value);
                        if (nameError) setNameError(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") goNextFromIntro();
                      }}
                      placeholder={t("onboarding.namePlaceholder")}
                      className={inputCn}
                      maxLength={60}
                      autoComplete="given-name"
                      aria-invalid={Boolean(nameError)}
                    />
                    {nameError ? (
                      <p role="alert" className="mt-1.5 text-xs font-semibold text-danger">
                        {nameError}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {t("onboarding.nameHelper")}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-bold">
                      {t("onboarding.languageLabel")}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { id: "ar", label: t("onboarding.languageAr") },
                          { id: "en", label: t("onboarding.languageEn") },
                        ] as const
                      ).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setLanguage(item.id)}
                          aria-pressed={language === item.id}
                          className={cn(
                            "min-h-11 rounded-xl border px-3 text-sm font-bold transition-all",
                            language === item.id
                              ? "border-primary/50 bg-primary-soft text-primary"
                              : "border-border bg-card hover:border-primary/30 hover:bg-muted/50",
                          )}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {t("onboarding.languageHint")}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div key="step-level" className="animate-fade-up">
                <p className="eyebrow">{t("onboarding.step", { current: 2, total: TOTAL_STEPS })}</p>
                <h1 className="mt-1.5 text-2xl font-extrabold sm:text-3xl">
                  {t("onboarding.levelTitle")}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t("onboarding.levelBody")}
                </p>

                <div className="mt-4 space-y-2">
                  {LEVELS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setLevel(item)}
                      aria-pressed={level === item}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-2xl border p-3.5 text-start transition-all",
                        level === item
                          ? "border-primary/50 bg-primary-soft/60"
                          : "border-border bg-card hover:border-primary/30 hover:bg-muted/30",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold",
                          level === item
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {item}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold">{t(`level.${item}`)}</span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                          {t(`levelDesc.${item}`)}
                        </span>
                      </span>
                      {level === item ? (
                        <Check className="ms-auto mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      ) : null}
                    </button>
                  ))}
                </div>

                <div className="mt-5">
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-bold">
                    <GraduationCap className="h-4 w-4 text-primary" aria-hidden="true" />
                    {t("onboarding.dialectLabel")}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {DIALECTS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setDialect(item.id)}
                        aria-pressed={dialect === item.id}
                        className={cn(
                          "min-h-10 rounded-xl border px-2 text-xs font-bold transition-all",
                          dialect === item.id
                            ? "border-primary/50 bg-primary-soft text-primary"
                            : "border-border bg-card hover:border-primary/30 hover:bg-muted/40",
                        )}
                      >
                        {t(item.key)}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {t("onboarding.dialectHelper")}
                  </p>
                </div>

                <div className="mt-5">
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-bold">
                    <Target className="h-4 w-4 text-accent" aria-hidden="true" />
                    {t("onboarding.goalTitle")}
                  </p>
                  <p className="mb-2 text-xs text-muted-foreground">
                    {t("onboarding.goalBody")}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {GOALS.map((item) => (
                      <button
                        key={item.minutes}
                        type="button"
                        onClick={() => setGoal(item.minutes)}
                        aria-pressed={goal === item.minutes}
                        className={cn(
                          "rounded-2xl border p-2.5 text-center transition-all",
                          goal === item.minutes
                            ? "border-accent/60 bg-accent-soft"
                            : "border-border bg-card hover:bg-muted/40",
                        )}
                      >
                        <span className="tnum block text-lg font-extrabold">
                          {item.minutes}
                        </span>
                        <span className="block text-[0.65rem] font-semibold text-muted-foreground">
                          {t("common.min")} · {t(item.key)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {step === 2 && activeQuestion ? (
              <div key={`step-quiz-${questionIndex}`} className="animate-fade-up">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="eyebrow">{t("onboarding.placementTitle")}</p>
                    <p className="mt-1 text-sm font-bold">
                      {t("onboarding.questionOf", {
                        current: questionIndex + 1,
                        total: PLACEMENT_QUESTIONS.length,
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={skipQuiz}
                    className="rounded-lg px-2 py-1 text-xs font-bold text-muted-foreground underline-offset-4 hover:bg-muted/60 hover:text-foreground hover:underline"
                  >
                    {t("common.skip")}
                  </button>
                </div>

                <div className="mt-3 flex gap-1.5" aria-hidden="true">
                  {PLACEMENT_QUESTIONS.map((question, index) => {
                    const answer = answers[question.id];
                    const state =
                      answer === undefined
                        ? "pending"
                        : answer === question.correctAnswer
                          ? "correct"
                          : "wrong";
                    return (
                      <span
                        key={question.id}
                        className={cn(
                          "h-1.5 flex-1 rounded-full",
                          state === "correct"
                            ? "bg-success"
                            : state === "wrong"
                              ? "bg-danger"
                              : index === questionIndex
                                ? "bg-primary/60"
                                : "bg-border",
                        )}
                      />
                    );
                  })}
                </div>

                <div className="mt-5 rounded-2xl border border-border/60 bg-muted/30 p-4">
                  <p className="text-xs font-bold text-muted-foreground">
                    {t(`onboarding.questionOf`, {
                      current: questionIndex + 1,
                      total: PLACEMENT_QUESTIONS.length,
                    })}
                  </p>
                  <p className="mt-1.5 text-sm font-bold">
                    {language === "ar"
                      ? activeQuestion.questionAr
                      : activeQuestion.questionEn}
                  </p>
                  <div
                    dir="ltr"
                    className="german-text mt-3 flex flex-wrap items-baseline justify-start gap-x-1.5 text-lg font-semibold"
                  >
                    <span>{activeQuestion.sentenceBefore}</span>
                    <span className="inline-flex min-w-[4.5rem] items-center justify-center rounded-lg border-b-2 border-dashed border-primary/50 bg-card px-2 py-0.5 text-primary">
                      ?
                    </span>
                    <span>{activeQuestion.sentenceAfter}</span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {activeQuestion.options.map((option) => {
                      const answered = Boolean(selectedAnswer);
                      const isCorrect = option === activeQuestion.correctAnswer;
                      const isSelected = option === selectedAnswer;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => answerQuestion(option)}
                          disabled={answered}
                          aria-pressed={isSelected}
                          className={cn(
                            "min-h-11 rounded-xl border px-3 text-sm font-bold transition-all german-inline",
                            !answered &&
                              "border-border bg-card hover:border-primary/40 hover:bg-primary-soft/40",
                            answered &&
                              isCorrect &&
                              "border-success/50 bg-success/10 text-success",
                            answered &&
                              isSelected &&
                              !isCorrect &&
                              "border-danger/50 bg-danger/10 text-danger",
                            answered &&
                              !isCorrect &&
                              !isSelected &&
                              "border-border bg-card opacity-55",
                          )}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedAnswer ? (
                  <div className="mt-3 animate-fade-up">
                    <p
                      className={cn(
                        "flex items-center gap-1.5 text-sm font-bold",
                        selectedAnswer === activeQuestion.correctAnswer
                          ? "text-success"
                          : "text-muted-foreground",
                      )}
                    >
                      {selectedAnswer === activeQuestion.correctAnswer ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          {t("onboarding.placementCorrect")}
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4" aria-hidden="true" />
                          {t("onboarding.placementWrong")}
                        </>
                      )}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {t("onboarding.correctAnswer", {
                        answer: activeQuestion.correctAnswer,
                      })}{" "}
                      {activeQuestion.explanationAr}
                    </p>
                  </div>
                ) : null}

                <div className="mt-5 flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    onClick={goBack}
                    icon={<ArrowLeft className="h-4 w-4 flip-rtl" aria-hidden="true" />}
                  >
                    {t("common.back")}
                  </Button>
                  <Button onClick={nextQuestion} disabled={!selectedAnswer}>
                    {questionIndex + 1 >= PLACEMENT_QUESTIONS.length
                      ? t("onboarding.ready")
                      : t("common.next")}
                    <ArrowRight className="h-4 w-4 flip-rtl" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div key="step-result" className="animate-fade-up">
                <p className="eyebrow">{t("onboarding.resultTitle")}</p>
                <h1 className="mt-1.5 text-2xl font-extrabold sm:text-3xl">
                  {t("onboarding.ready")}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t("onboarding.resultBody", { level: recommended })}
                </p>

                <div className="mt-5 rounded-3xl bg-gradient-to-br from-primary-soft/80 to-accent-soft/60 p-5 text-center">
                  <p className="text-xs font-bold text-muted-foreground">
                    {t("onboarding.recommended")}
                  </p>
                  <p className="mt-1 text-5xl font-extrabold text-primary">
                    {recommended}
                  </p>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <Badge tone="primary">
                      {t("onboarding.placementScore", {
                        score,
                        total: PLACEMENT_QUESTIONS.length,
                      })}
                    </Badge>
                    <Badge tone="neutral">{t("onboarding.pickedForYou")}</Badge>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="mb-2 text-sm font-bold">
                    {t("onboarding.chooseStartLevel")}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {LEVELS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setLevel(item)}
                        aria-pressed={level === item}
                        className={cn(
                          "min-h-11 rounded-xl border text-sm font-extrabold transition-all",
                          level === item
                            ? "border-primary/50 bg-primary text-primary-foreground"
                            : "border-border bg-card hover:border-primary/30",
                        )}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-border/60 bg-muted/30 p-3.5">
                  <p className="text-sm font-bold">{t("onboarding.joinTitle")}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {t("onboarding.summary", { minutes: goal, level })}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("onboarding.joinBody")}
                  </p>
                </div>

                <Button
                  className="mt-5 w-full"
                  size="lg"
                  onClick={finish}
                  loading={finishing}
                >
                  {t("onboarding.finish")}
                  <ArrowRight className="h-4 w-4 flip-rtl" aria-hidden="true" />
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setStep(2);
                    setQuestionIndex(0);
                  }}
                  className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-2 text-xs font-bold text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                >
                  <ChevronLeft className="h-3.5 w-3.5 flip-rtl" aria-hidden="true" />
                  {t("onboarding.placementTitle")}
                </button>
              </div>
            ) : null}

            {step === 0 || step === 1 ? (
              <div className="mt-6 flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  onClick={goBack}
                  disabled={step === 0}
                  icon={<ArrowLeft className="h-4 w-4 flip-rtl" aria-hidden="true" />}
                  className={step === 0 ? "invisible" : undefined}
                >
                  {t("common.back")}
                </Button>
                <Button
                  onClick={step === 0 ? goNextFromIntro : () => setStep(2)}
                  size="lg"
                >
                  {t("common.next")}
                  <ArrowRight className="h-4 w-4 flip-rtl" aria-hidden="true" />
                </Button>
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}
