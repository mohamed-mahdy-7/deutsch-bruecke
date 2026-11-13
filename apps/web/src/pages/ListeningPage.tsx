import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  Headphones,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Volume2,
  XCircle,
} from "lucide-react";
import { dictationClipsForLevel } from "@/data/listening";
import type { CefrLevel, DictationClip, DictationScore } from "@/types/domain";
import { useAppPreferences } from "@/state/useAppPreferences";
import { useProgress } from "@/state/ProgressProvider";
import { scoreDictation } from "@/lib/dictation";
import { buildFirstLetterHint } from "@/lib/wordAlignment";
import { LEVEL_LABEL_KEY } from "@/lib/uiLabels";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedTabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/Progress";
import { EmptyState } from "@/components/ui/Feedback";
import { Field, inputCn } from "@/components/ui/Field";
import { GermanText } from "@/components/german/GermanText";
import { useSpeechSynthesis } from "@/hooks/useSpeech";

const LEVELS: CefrLevel[] = ["A1", "A2", "B1"];

function isCefrLevel(value: string | null): value is CefrLevel {
  return value === "A1" || value === "A2" || value === "B1";
}

function clipTitle(clip: DictationClip, language: "ar" | "en"): string {
  return language === "ar" ? clip.titleAr : clip.titleEn;
}

function clipTranslation(clip: DictationClip, language: "ar" | "en"): string {
  return language === "ar" ? clip.translationAr : clip.translationEn;
}

function clipHint(clip: DictationClip, language: "ar" | "en"): string {
  return language === "ar" ? clip.hintAr : clip.hintEn;
}

function clipFocus(clip: DictationClip, language: "ar" | "en"): string {
  return language === "ar" ? clip.focusLabelAr : clip.focusLabelEn;
}

export function ListeningPage() {
  const { t, language } = useAppPreferences();
  const { progress, recordDrillAnswer } = useProgress();
  const [searchParams, setSearchParams] = useSearchParams();
  const { supported, speaking, speak, cancel } = useSpeechSynthesis();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const profileLevel = progress?.profile.level ?? "A1";
  const requestedLevel = searchParams.get("level");
  const activeLevel: CefrLevel = isCefrLevel(requestedLevel)
    ? requestedLevel
    : profileLevel;

  const clips = useMemo(() => dictationClipsForLevel(activeLevel), [activeLevel]);

  const [index, setIndex] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [score, setScore] = useState<DictationScore | null>(null);
  const [attempt, setAttempt] = useState(1);
  const [hintOpen, setHintOpen] = useState(false);
  const [translationOpen, setTranslationOpen] = useState(false);
  const [finished, setFinished] = useState(false);
  const [recorded, setRecorded] = useState(false);

  const clip = clips[index];

  // Level changes start a fresh run; the level itself is preserved in the URL.
  useEffect(() => {
    setIndex(0);
    setTranscript("");
    setScore(null);
    setAttempt(1);
    setHintOpen(false);
    setTranslationOpen(false);
    setFinished(false);
    setRecorded(false);
    cancel();
  }, [activeLevel, cancel]);

  useEffect(() => {
    return () => cancel();
  }, [cancel]);

  if (!clip) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("listening.title")} subtitle={t("listening.subtitle")} />
        <EmptyState
          icon={Headphones}
          title={t("listening.empty")}
          body={t("listening.emptyBody")}
          action={
            <Link
              to="/listening?level=A1"
              className="text-sm font-bold text-primary hover:underline"
            >
              A1
            </Link>
          }
        />
      </div>
    );
  }

  function selectLevel(level: string) {
    if (!isCefrLevel(level)) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("level", level);
    setSearchParams(nextParams, { replace: true });
  }

  function play(rate: number) {
    if (!clip) return;
    speak(clip.textDe, { rate });
  }

  function check() {
    if (!clip || transcript.trim().length === 0) return;
    const result = scoreDictation(clip, transcript);
    setScore(result);
    setRecorded(true);
    recordDrillAnswer({
      questionId: `listening-${clip.id}-${attempt}`,
      topic: clip.topic,
      pattern: `listening:${clip.id}`,
      correct: result.passed,
      labelAr: clip.titleAr,
      labelEn: clip.titleEn,
      xpCorrect: 10,
      xpIncorrect: 2,
      trackWeakSpot: false,
    });
  }

  function retry() {
    setScore(null);
    setRecorded(false);
    setAttempt((value) => value + 1);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  function next() {
    cancel();
    if (index + 1 >= clips.length) {
      setFinished(true);
      return;
    }
    setIndex(index + 1);
    setTranscript("");
    setScore(null);
    setAttempt(1);
    setHintOpen(false);
    setTranslationOpen(false);
    setRecorded(false);
  }

  function restart() {
    setIndex(0);
    setTranscript("");
    setScore(null);
    setAttempt(1);
    setFinished(false);
    setHintOpen(false);
    setTranslationOpen(false);
    setRecorded(false);
  }

  if (finished) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={t("listening.eyebrow")}
          title={t("listening.finished")}
          subtitle={t("listening.finishedBody")}
        />
        <EmptyState
          icon={Sparkles}
          title={t("listening.finished")}
          body={t("listening.finishedBody")}
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button onClick={restart} icon={<RotateCcw className="h-4 w-4" />}>
                {t("listening.restart")}
              </Button>
              <Link
                to="/curriculum"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold transition-colors hover:bg-muted/40"
              >
                {t("nav.curriculum")}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  const totalClips = clips.length;
  const progressPct = Math.round(((index + (score ? 1 : 0)) / totalClips) * 100);
  const pastThreshold = score?.passed ?? false;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t("listening.eyebrow")}
        title={t("listening.title")}
        subtitle={t("listening.subtitle")}
        actions={
          <Badge tone="primary" className="text-xs">
            <Headphones className="h-3.5 w-3.5" aria-hidden="true" />
            {t("listening.clip", {
              current: index + 1,
              total: totalClips,
            })}
          </Badge>
        }
      />

      <div className="space-y-3">
        <SegmentedTabs
          ariaLabel={t("listening.eyebrow")}
          value={activeLevel}
          onChange={selectLevel}
          stretch
          items={LEVELS.map((level) => ({
            id: level,
            label: `${level} · ${t(LEVEL_LABEL_KEY[level])}`,
          }))}
        />
        <ProgressBar
          value={progressPct}
          label={t("listening.score")}
          className="h-1.5"
        />
      </div>

      <section className="surface-card overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 bg-gradient-to-br from-primary-soft/70 to-accent-soft/30 p-4 sm:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <Headphones className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="eyebrow">{clipFocus(clip, language)}</p>
              <h2 className="mt-1 text-base font-extrabold sm:text-lg">
                {clipTitle(clip, language)}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                {t("listening.instructions")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="accent"
              size="sm"
              onClick={() => play(0.88)}
              disabled={!supported}
              aria-pressed={speaking}
            >
              <Volume2 className="h-4 w-4" aria-hidden="true" />
              {speaking ? t("common.stop") : t("listening.playNormal")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => play(0.58)}
              disabled={!supported}
            >
              <Volume2 className="h-4 w-4" aria-hidden="true" />
              {t("listening.playSlow")}
            </Button>
            {speaking ? (
              <Button variant="ghost" size="sm" onClick={cancel}>
                {t("common.stop")}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          {!supported ? (
            <p className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs font-bold text-foreground">
              {t("vocab.audioUnsupported")}
            </p>
          ) : null}

          {!score ? (
            <>
              <Field
                label={
                  <span className="flex items-center gap-1.5">
                    <Headphones className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    {t("listening.placeholder")}
                  </span>
                }
                hint={t("listening.instructions")}
              >
                <textarea
                  ref={inputRef}
                  value={transcript}
                  onChange={(event) => setTranscript(event.target.value)}
                  dir="ltr"
                  lang="de"
                  rows={3}
                  placeholder={t("listening.placeholder")}
                  className={cn(inputCn, "resize-y text-base leading-relaxed")}
                  spellCheck={false}
                  autoCapitalize="off"
                />
              </Field>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={check}
                  disabled={transcript.trim().length === 0}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                >
                  {t("listening.check")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setHintOpen((open) => !open)}
                  icon={<Lightbulb className="h-4 w-4" />}
                  aria-expanded={hintOpen}
                >
                  {t("listening.hint")}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setTranslationOpen((open) => !open)}
                  icon={<Eye className="h-4 w-4" />}
                  aria-expanded={translationOpen}
                >
                  {t("listening.revealTranslation")}
                </Button>
                <Badge tone="neutral" className="ms-auto">
                  {t("listening.attempts", { count: attempt })}
                </Badge>
              </div>

              {hintOpen ? (
                <div className="rounded-2xl border border-warning/25 bg-warning/10 p-3.5">
                  <p className="text-xs font-extrabold">{t("listening.hintTitle")}</p>
                  <p className="mt-1 text-xs leading-relaxed text-foreground/80">
                    {clipHint(clip, language)}
                  </p>
                  <p className="mt-2 text-[0.7rem] font-bold text-muted-foreground">
                    {t("listening.firstLetter")}
                  </p>
                  <p
                    dir="ltr"
                    lang="de"
                    className="mt-1 select-none text-sm font-bold tracking-[0.12em] text-foreground"
                  >
                    {buildFirstLetterHint(clip.textDe)}
                  </p>
                </div>
              ) : null}

              {translationOpen ? (
                <div className="rounded-2xl border border-border/70 bg-muted/30 p-3.5">
                  <p className="text-xs font-extrabold">{t("listening.revealTranslation")}</p>
                  <p className="mt-1 text-xs leading-relaxed text-foreground/80">
                    {clipTranslation(clip, language)}
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/25 p-4">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "inline-flex h-12 w-12 items-center justify-center rounded-2xl",
                      pastThreshold
                        ? "bg-success/10 text-success"
                        : "bg-danger/10 text-danger",
                    )}
                  >
                    {pastThreshold ? (
                      <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                    ) : (
                      <XCircle className="h-6 w-6" aria-hidden="true" />
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-extrabold">
                      {pastThreshold ? t("listening.passed") : t("listening.failed")}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t("listening.correctWords", {
                        correct: score.correctWords,
                        total: score.totalWords,
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-end">
                  <p className="text-3xl font-extrabold leading-none">
                    {score.accuracy}%
                  </p>
                  <p className="mt-1 text-[0.65rem] font-bold text-muted-foreground">
                    {t("listening.accuracy")}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-card p-4">
                <p className="text-xs font-extrabold">{t("listening.expected")}</p>
                <GermanText
                  text={clip.textDe}
                  interactive={false}
                  className="mt-1.5 text-base font-bold"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {clipTranslation(clip, language)}
                </p>
              </div>

              <div className="rounded-2xl border border-border/70 bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-extrabold">{t("listening.yourAnswer")}</p>
                  <div className="flex flex-wrap items-center gap-2 text-[0.65rem] font-bold text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
                      {t("listening.legendCorrect")}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-danger" aria-hidden="true" />
                      {t("listening.legendWrong")}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-warning" aria-hidden="true" />
                      {t("listening.legendMissing")}
                    </span>
                  </div>
                </div>
                <div
                  dir="ltr"
                  lang="de"
                  className="mt-2 flex flex-wrap gap-1.5 text-sm"
                >
                  {score.diff.map((word, wordIndex) => {
                    const label =
                      word.status === "extra"
                        ? `+ ${word.actual ?? ""}`
                        : (word.expected ?? word.actual ?? "");
                    return (
                      <span
                        key={`${wordIndex}-${label}`}
                        title={
                          word.status === "wrong"
                            ? `${t("listening.wrong")}: ${word.actual ?? ""}`
                            : undefined
                        }
                        className={cn(
                          "rounded-lg border px-1.5 py-0.5 font-bold",
                          word.status === "correct" &&
                            "border-success/20 bg-success/10 text-success",
                          word.status === "wrong" &&
                            "border-danger/20 bg-danger/10 text-danger line-through decoration-danger/40",
                          word.status === "missing" &&
                            "border-warning/30 bg-warning/10 text-warning",
                          word.status === "extra" &&
                            "border-danger/20 bg-danger/5 text-danger/80",
                        )}
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
                <p className="mt-2 text-[0.7rem] text-muted-foreground">
                  {recorded ? t("listening.recorded") : null}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={retry}
                  icon={<RotateCcw className="h-4 w-4" />}
                >
                  {t("listening.retry")}
                </Button>
                <Button
                  onClick={next}
                  icon={<ArrowRight className="h-4 w-4 rtl:rotate-180" />}
                >
                  {t("listening.next")}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => play(0.88)}
                  disabled={!supported}
                  icon={<Volume2 className="h-4 w-4" />}
                >
                  {t("common.listen")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      <p className="text-center text-[0.7rem] text-muted-foreground">
        {t("listening.clip", { current: index + 1, total: totalClips })} ·{" "}
        {clipFocus(clip, language)}
      </p>
    </div>
  );
}
