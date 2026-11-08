import { useState } from "react";
import {
  ArrowRight,
  Blocks,
  CheckCircle2,
  GripVertical,
  Lightbulb,
  RotateCcw,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import type { SentenceExercise, SentenceToken } from "@/types/domain";
import { SENTENCE_EXERCISES } from "@/data/sentences";
import { useAppPreferences } from "@/state/useAppPreferences";
import { useProgress } from "@/state/ProgressProvider";
import { sentenceKindLabel } from "@/lib/uiLabels";
import { cn, percent, shuffle } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/Progress";
import { GermanText } from "@/components/german/GermanText";
import { SpeakerButton } from "@/components/german/SpeakerButton";

type Phase = "intro" | "session" | "summary";
type DragItem =
  | { source: "bank"; tokenId: string }
  | { source: "answer"; index: number }
  | null;

const SESSION_SIZE = 6;

function rulesFor(kind: SentenceExercise["kind"]) {
  return `builder.rule.${kind}` as const;
}

export function BuilderPage() {
  const { t, language } = useAppPreferences();
  const { progress, recordDrillAnswer } = useProgress();
  const [phase, setPhase] = useState<Phase>("intro");
  const [exercises, setExercises] = useState<SentenceExercise[]>([]);
  const [index, setIndex] = useState(0);
  const [bank, setBank] = useState<SentenceToken[]>([]);
  const [answer, setAnswer] = useState<SentenceToken[]>([]);
  const [checked, setChecked] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [drag, setDrag] = useState<DragItem>(null);

  const current = exercises[index];

  const loadExercise = (list: SentenceExercise[], nextIndex: number) => {
    const exercise = list[nextIndex];
    setBank(exercise ? shuffle(exercise.tokens) : []);
    setAnswer([]);
    setChecked(null);
    setDrag(null);
  };

  const start = () => {
    const level = progress?.profile.level ?? "A1";
    const primary = shuffle(
      SENTENCE_EXERCISES.filter((exercise) => exercise.level === level),
    );
    const others = shuffle(
      SENTENCE_EXERCISES.filter((exercise) => exercise.level !== level),
    );
    const picked = [...primary, ...others].slice(0, SESSION_SIZE);
    setExercises(picked);
    setIndex(0);
    setCorrectCount(0);
    setResults({});
    loadExercise(picked, 0);
    setPhase(picked.length > 0 ? "session" : "summary");
  };

  const addToken = (token: SentenceToken) => {
    if (checked !== null) return;
    setAnswer((items) => [...items, token]);
    setBank((items) => items.filter((item) => item.id !== token.id));
  };

  const removeToken = (token: SentenceToken) => {
    if (checked !== null) return;
    setAnswer((items) => items.filter((item) => item.id !== token.id));
    setBank((items) => [...items, token]);
  };

  const moveToken = (from: number, to: number) => {
    if (checked !== null || to < 0) return;
    setAnswer((items) => {
      const next = [...items];
      const [moved] = next.splice(from, 1);
      if (!moved) return items;
      next.splice(Math.min(to, next.length), 0, moved);
      return next;
    });
  };

  const dropOnAnswer = (targetIndex?: number) => {
    if (!drag || checked !== null) return;
    if (drag.source === "bank") {
      const token = bank.find((item) => item.id === drag.tokenId);
      if (token) {
        setAnswer((items) => {
          const next = [...items];
          next.splice(targetIndex ?? next.length, 0, token);
          return next;
        });
        setBank((items) => items.filter((item) => item.id !== token.id));
      }
    } else if (targetIndex !== undefined) {
      moveToken(drag.index, targetIndex);
    }
    setDrag(null);
  };

  const dropOnBank = () => {
    if (!drag || checked !== null) return;
    if (drag.source === "answer") {
      const token = answer[drag.index];
      if (token) {
        setAnswer((items) => items.filter((_item, position) => position !== drag.index));
        setBank((items) => [...items, token]);
      }
    }
    setDrag(null);
  };

  const check = () => {
    if (!current || checked !== null) return;
    const correct =
      answer.length === current.correctOrder.length &&
      answer.every((token, position) => token.id === current.correctOrder[position]);
    setChecked(correct);
    setResults((currentResults) => ({ ...currentResults, [current.id]: correct }));
    if (correct) setCorrectCount((count) => count + 1);
    recordDrillAnswer({
      questionId: current.id,
      topic: "word_order",
      pattern: `order:${current.kind}`,
      correct,
      labelAr: `ترتيب الجملة: ${sentenceKindLabel(current.kind, "ar")}`,
      labelEn: `Sentence order: ${sentenceKindLabel(current.kind, "en")}`,
      xpCorrect: 8,
      xpIncorrect: 2,
    });
  };

  const next = () => {
    if (index + 1 >= exercises.length) {
      setPhase("summary");
      return;
    }
    const nextIndex = index + 1;
    setIndex(nextIndex);
    loadExercise(exercises, nextIndex);
  };

  if (phase === "intro") {
    return (
      <div className="animate-fade-up">
        <PageHeader
          eyebrow={t("nav.builder")}
          title={t("builder.title")}
          subtitle={t("builder.subtitle")}
        />

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <section className="surface-card overflow-hidden">
            <div className="bg-gradient-to-br from-accent-soft/80 to-primary-soft/50 p-5 sm:p-6">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-card text-accent-soft-foreground shadow-sm">
                <Blocks className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="mt-3 text-xl font-extrabold sm:text-2xl">
                {t("builder.sessionTitle")}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {t("builder.sessionBody")}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone="accent">{t("builder.tap")}</Badge>
                <Badge tone="neutral">{t("builder.drag")}</Badge>
                <Badge tone="neutral">{t("profile.level")} · {progress?.profile.level}</Badge>
              </div>
            </div>
            <div className="p-5 sm:p-6">
              <div className="rounded-2xl bg-muted/40 p-3.5">
                <p className="flex items-center gap-1.5 text-sm font-bold">
                  <Lightbulb className="h-4 w-4 text-warning" aria-hidden="true" />
                  {t("builder.sentenceRule")}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t("builder.rule.verb-second")}
                </p>
              </div>
              <Button className="mt-5 w-full" size="lg" onClick={start}>
                {t("builder.start")}
                <ArrowRight className="h-4 w-4 flip-rtl" aria-hidden="true" />
              </Button>
            </div>
          </section>

          <section className="surface-card p-5">
            <p className="flex items-center gap-1.5 text-sm font-extrabold">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              {t("builder.structure")}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t("builder.structureHint")}
            </p>
            <ul className="mt-3 space-y-2">
              {(
                [
                  "verb-second",
                  "verb-final",
                  "separable",
                  "question",
                ] as const
              ).map((kind) => (
                <li
                  key={kind}
                  className="rounded-xl border border-border/60 bg-card p-3"
                >
                  <p className="text-xs font-extrabold">
                    {sentenceKindLabel(kind, language)}
                  </p>
                  <p className="mt-1 text-[0.7rem] leading-relaxed text-muted-foreground">
                    {t(rulesFor(kind))}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    );
  }

  if (phase === "summary") {
    const total = exercises.length;
    return (
      <div className="animate-fade-up">
        <PageHeader
          eyebrow={t("nav.builder")}
          title={t("builder.summaryTitle")}
          subtitle={t("builder.summaryBody", {
            correct: correctCount,
            total,
          })}
        />

        <div className="mx-auto mt-5 max-w-2xl">
          <section className="surface-card overflow-hidden">
            <div className="bg-gradient-to-br from-success/10 to-primary-soft/50 p-6 text-center">
              <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-card text-success shadow-sm">
                <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
              </span>
              <p className="mt-3 text-4xl font-extrabold text-primary">
                {percent(correctCount, Math.max(total, 1))}%
              </p>
              <p className="mt-1 text-sm font-bold text-muted-foreground">
                {t("progress.correctOf", { correct: correctCount, total })}
              </p>
            </div>
            <ul className="divide-y divide-border/60">
              {exercises.map((exercise) => {
                const isCorrect = results[exercise.id];
                return (
                  <li
                    key={exercise.id}
                    className="flex items-center gap-3 p-3.5"
                  >
                    {isCorrect ? (
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
                      <p className="text-xs font-bold">
                        {sentenceKindLabel(exercise.kind, language)}
                      </p>
                      <p className="german-inline truncate text-[0.7rem] text-muted-foreground">
                        {exercise.tokens.map((token) => token.text).join(" ")}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-col gap-2 p-5 sm:flex-row sm:justify-center">
              <Button onClick={start} icon={<RotateCcw className="h-4 w-4" />}>
                {t("builder.again")}
              </Button>
              <Button variant="outline" onClick={() => setPhase("intro")}>
                {t("builder.back")}
              </Button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const correctTokens = current.correctOrder
    .map((tokenId) => current.tokens.find((token) => token.id === tokenId))
    .filter((token): token is SentenceToken => Boolean(token));

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={t("nav.builder")}
        title={t("builder.title")}
        subtitle={t("builder.subtitle")}
        actions={<Badge tone="primary">{t("builder.exerciseOf", { current: index + 1, total: exercises.length })}</Badge>}
      />

      <div className="mx-auto mt-4 max-w-3xl">
        <ProgressBar
          value={index + (checked !== null ? 1 : 0)}
          max={exercises.length}
          className="mb-4 h-1.5"
          label={t("builder.sessionTitle")}
        />

        <section className="surface-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="accent">{sentenceKindLabel(current.kind, language)}</Badge>
            <Badge tone="neutral">{current.level}</Badge>
          </div>

          <p className="mt-3 text-sm font-bold">
            {language === "ar" ? current.promptAr : current.promptEn}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("builder.translation")}: {language === "ar" ? current.translationAr : current.translationEn}
          </p>

          <p className="mt-4 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
            {t("builder.bank")}
          </p>
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              dropOnBank();
            }}
            className="mt-2 flex min-h-14 flex-wrap items-center gap-2 rounded-2xl border border-dashed border-border bg-muted/25 p-2.5"
          >
            {bank.length === 0 ? (
              <p className="px-2 text-xs text-muted-foreground">
                {t("builder.emptyBank")}
              </p>
            ) : (
              bank.map((token) => (
                <button
                  key={token.id}
                  type="button"
                  draggable={checked === null}
                  onDragStart={() => setDrag({ source: "bank", tokenId: token.id })}
                  onDragEnd={() => setDrag(null)}
                  onClick={() => addToken(token)}
                  disabled={checked !== null}
                  className="german-inline inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-bold shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md disabled:cursor-default disabled:opacity-50"
                >
                  <GripVertical
                    className="h-3 w-3 text-muted-foreground/60"
                    aria-hidden="true"
                  />
                  {token.text}
                </button>
              ))
            )}
          </div>

          <p className="mt-4 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
            {t("builder.answer")}
          </p>
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              if (event.target === event.currentTarget) {
                event.preventDefault();
                dropOnAnswer();
              }
            }}
            className={cn(
              "mt-2 flex min-h-16 flex-wrap items-center gap-2 rounded-2xl border-2 p-2.5 transition-colors",
              checked === null
                ? "border-primary/25 bg-primary-soft/20"
                : checked
                  ? "border-success/40 bg-success/5"
                  : "border-danger/35 bg-danger/5",
            )}
          >
            {answer.length === 0 ? (
              <p className="px-2 text-xs text-muted-foreground">
                {t("builder.emptyAnswer")}
              </p>
            ) : (
              answer.map((token, position) => (
                <button
                  key={token.id}
                  type="button"
                  draggable={checked === null}
                  onDragStart={() => setDrag({ source: "answer", index: position })}
                  onDragEnd={() => setDrag(null)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    dropOnAnswer(position);
                  }}
                  onClick={() => removeToken(token)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowLeft") {
                      event.preventDefault();
                      moveToken(position, position - 1);
                    }
                    if (event.key === "ArrowRight") {
                      event.preventDefault();
                      moveToken(position, position + 1);
                    }
                  }}
                  disabled={checked !== null}
                  aria-label={t("builder.removeToken", { word: token.text })}
                  className="german-inline inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-primary/30 bg-card px-3 py-1.5 text-sm font-bold shadow-sm transition-colors hover:border-danger/40 hover:bg-danger/5 disabled:cursor-default"
                >
                  {token.text}
                  {checked === null ? (
                    <X
                      className="h-3 w-3 text-muted-foreground/70"
                      aria-hidden="true"
                    />
                  ) : null}
                </button>
              ))
            )}
          </div>
          <p className="mt-1.5 text-[0.65rem] text-muted-foreground">
            {t("builder.dragHint")}
          </p>

          {checked === null ? (
            <div className="mt-4 flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setBank(shuffle(current.tokens));
                  setAnswer([]);
                }}
                disabled={answer.length === 0}
              >
                {t("builder.clear")}
              </Button>
              <Button
                onClick={check}
                disabled={answer.length !== current.tokens.length}
              >
                {t("builder.check")}
                <ArrowRight className="h-4 w-4 flip-rtl" aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <div className="mt-4 animate-fade-up">
              <p
                className={cn(
                  "flex items-center gap-1.5 text-sm font-extrabold",
                  checked ? "text-success" : "text-danger",
                )}
              >
                {checked ? (
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <XCircle className="h-4 w-4" aria-hidden="true" />
                )}
                {checked ? t("builder.correct") : t("builder.incorrect")}
              </p>

              {!checked ? (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-border/60 bg-card p-3">
                  <p className="text-[0.68rem] font-bold text-muted-foreground">
                    {t("builder.correctOrder")}:
                  </p>
                  {correctTokens.map((token) => (
                    <span
                      key={token.id}
                      className="german-inline rounded-lg bg-muted px-2 py-0.5 text-sm font-bold"
                    >
                      {token.text}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-3 rounded-2xl border border-border/60 bg-muted/35 p-3.5">
                <p className="text-xs font-extrabold text-muted-foreground">
                  {t("builder.explanation")}
                </p>
                <p className="mt-1 text-sm leading-relaxed">
                  {language === "ar"
                    ? current.explanationAr
                    : current.explanationEn}
                </p>
                <p className="mt-2 border-t border-border/50 pt-2 text-xs text-muted-foreground">
                  {t("builder.sentenceRule")}: {t(rulesFor(current.kind))}
                </p>
              </div>

              <div className="mt-3 rounded-2xl border border-border/60 bg-card p-3">
                <p className="text-[0.68rem] font-bold text-muted-foreground">
                  {t("builder.structure")}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {current.structureLabels.map((label) => (
                    <Badge key={label.role} tone="neutral">
                      {language === "ar" ? label.labelAr : label.labelEn}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button onClick={next}>
                  {index + 1 >= exercises.length
                    ? t("builder.finish")
                    : t("builder.next")}
                  <ArrowRight className="h-4 w-4 flip-rtl" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}
        </section>

        {checked !== null ? (
          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <GermanText
              text={current.tokens.map((token) => token.text).join(" ")}
              interactive={false}
              className="inline text-xs"
            />
            <SpeakerButton
              text={current.tokens.map((token) => token.text).join(" ")}
              className="h-7 w-7"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
