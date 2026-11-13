import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Headphones,
  Mic,
  MicOff,
  RotateCcw,
  Sparkles,
  Volume2,
} from "lucide-react";
import {
  PRONUNCIATION_SOUNDS,
  pronunciationPhrasesForLevel,
} from "@/data/pronunciation";
import type {
  CefrLevel,
  PronunciationPhrase,
  PronunciationScore,
  PronunciationSoundStatus,
} from "@/types/domain";
import { useAppPreferences } from "@/state/useAppPreferences";
import { useProgress } from "@/state/ProgressProvider";
import { evaluatePronunciation } from "@/lib/pronunciation";
import { LEVEL_LABEL_KEY } from "@/lib/uiLabels";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedTabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ProgressBar, ProgressRing } from "@/components/ui/Progress";
import { EmptyState } from "@/components/ui/Feedback";
import { Field, inputCn } from "@/components/ui/Field";
import { GermanText } from "@/components/german/GermanText";
import {
  useSpeechRecognition,
  useSpeechSynthesis,
} from "@/hooks/useSpeech";

const LEVELS: CefrLevel[] = ["A1", "A2", "B1"];

const SOUND_TONE: Record<PronunciationSoundStatus, "success" | "warning" | "danger"> = {
  clear: "success",
  almost: "warning",
  retry: "danger",
};

function isCefrLevel(value: string | null): value is CefrLevel {
  return value === "A1" || value === "A2" || value === "B1";
}

function phraseTranslation(
  phrase: PronunciationPhrase,
  language: "ar" | "en",
): string {
  return language === "ar" ? phrase.translationAr : phrase.translationEn;
}

function phraseTip(
  phrase: PronunciationPhrase,
  language: "ar" | "en",
): string {
  return language === "ar" ? phrase.tipAr : phrase.tipEn;
}

function soundLabel(
  sound: {
    labelAr: string;
    labelEn: string;
  },
  language: "ar" | "en",
): string {
  return language === "ar" ? sound.labelAr : sound.labelEn;
}

export function PronunciationPage() {
  const { t, language } = useAppPreferences();
  const { progress, recordDrillAnswer } = useProgress();
  const [searchParams, setSearchParams] = useSearchParams();
  const tts = useSpeechSynthesis();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const profileLevel = progress?.profile.level ?? "A1";
  const requestedLevel = searchParams.get("level");
  const activeLevel: CefrLevel = isCefrLevel(requestedLevel)
    ? requestedLevel
    : profileLevel;

  const phrases = useMemo(
    () => pronunciationPhrasesForLevel(activeLevel),
    [activeLevel],
  );

  const [index, setIndex] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [score, setScore] = useState<PronunciationScore | null>(null);
  const [attempt, setAttempt] = useState(1);
  const [manualOpen, setManualOpen] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const phrase = phrases[index];

  const recognition = useSpeechRecognition({
    language: "de-DE",
    onTranscript: (text) => {
      if (text) {
        setTranscript(text);
        setSpeechError(null);
      }
    },
    onError: () => setSpeechError(t("pronunciation.speechError")),
  });

  const usesManualEntry = manualOpen || !recognition.supported;

  // A new level starts at the first phrase, with a clean recorder state.
  useEffect(() => {
    setIndex(0);
    setTranscript("");
    setScore(null);
    setAttempt(1);
    setManualOpen(false);
    setSpeechError(null);
    setFinished(false);
    recognition.stop();
    tts.cancel();
    // The stop/cancel callbacks are stable; only the level should reset the run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLevel]);

  useEffect(() => {
    return () => {
      recognition.stop();
      tts.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!phrase) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("pronunciation.title")}
          subtitle={t("pronunciation.subtitle")}
        />
        <EmptyState
          icon={Mic}
          title={t("pronunciation.empty")}
          body={t("listening.emptyBody")}
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
    if (!phrase) return;
    tts.speak(phrase.textDe, { rate });
  }

  function toggleRecording() {
    setSpeechError(null);
    if (recognition.listening) {
      recognition.stop();
      return;
    }
    setTranscript("");
    setScore(null);
    if (!recognition.supported) {
      setManualOpen(true);
      return;
    }
    recognition.start();
  }

  function check() {
    if (!phrase || transcript.trim().length === 0) return;
    const result = evaluatePronunciation(phrase, transcript);
    setScore(result);
    recordDrillAnswer({
      questionId: `pronunciation-${phrase.id}-${attempt}`,
      topic: "vocabulary",
      pattern: `pronunciation:${phrase.id}`,
      correct: result.passed,
      labelAr: phrase.textDe,
      labelEn: phrase.textDe,
      xpCorrect: 10,
      xpIncorrect: 2,
      trackWeakSpot: false,
    });
  }

  function retry() {
    setScore(null);
    setTranscript("");
    setAttempt((value) => value + 1);
    setSpeechError(null);
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function next() {
    recognition.stop();
    tts.cancel();
    if (index + 1 >= phrases.length) {
      setFinished(true);
      return;
    }
    setIndex(index + 1);
    setTranscript("");
    setScore(null);
    setAttempt(1);
    setSpeechError(null);
    setManualOpen(false);
  }

  function restart() {
    setIndex(0);
    setTranscript("");
    setScore(null);
    setAttempt(1);
    setSpeechError(null);
    setManualOpen(false);
    setFinished(false);
  }

  if (finished) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={t("pronunciation.eyebrow")}
          title={t("pronunciation.finished")}
          subtitle={t("pronunciation.finishedBody")}
        />
        <EmptyState
          icon={Sparkles}
          title={t("pronunciation.finished")}
          body={t("pronunciation.finishedBody")}
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button onClick={restart} icon={<RotateCcw className="h-4 w-4" />}>
                {t("pronunciation.restart")}
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

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t("pronunciation.eyebrow")}
        title={t("pronunciation.title")}
        subtitle={t("pronunciation.subtitle")}
        actions={
          <Badge tone="primary" className="text-xs">
            <Mic className="h-3.5 w-3.5" aria-hidden="true" />
            {t("pronunciation.phrase", {
              current: index + 1,
              total: phrases.length,
            })}
          </Badge>
        }
      />

      <div className="space-y-3">
        <SegmentedTabs
          ariaLabel={t("pronunciation.eyebrow")}
          value={activeLevel}
          onChange={selectLevel}
          stretch
          items={LEVELS.map((level) => ({
            id: level,
            label: `${level} · ${t(LEVEL_LABEL_KEY[level])}`,
          }))}
        />
        <ProgressBar
          value={Math.round(((index + (score ? 1 : 0)) / phrases.length) * 100)}
          label={t("pronunciation.score")}
          className="h-1.5"
        />
      </div>

      <section className="surface-card overflow-hidden">
        <div className="border-b border-border/60 bg-gradient-to-br from-accent-soft/70 to-primary-soft/30 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow">{t("pronunciation.instructions")}</p>
              <GermanText
                text={phrase.textDe}
                interactive={false}
                className="mt-2 text-lg font-extrabold leading-relaxed sm:text-xl"
              />
              <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
                {phraseTranslation(phrase, language)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="accent"
                size="sm"
                onClick={() => play(0.88)}
                disabled={!tts.supported}
              >
                <Volume2 className="h-4 w-4" aria-hidden="true" />
                {tts.speaking ? t("common.stop") : t("listening.playNormal")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => play(0.58)}
                disabled={!tts.supported}
              >
                <Volume2 className="h-4 w-4" aria-hidden="true" />
                {t("listening.playSlow")}
              </Button>
              {tts.speaking ? (
                <Button variant="ghost" size="sm" onClick={tts.cancel}>
                  {t("common.stop")}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {phrase.focus.map((soundId) => (
              <Badge key={soundId} tone="neutral" className="font-mono">
                {PRONUNCIATION_SOUNDS[soundId].symbol}
              </Badge>
            ))}
            <Badge tone="neutral" className="ms-auto">
              {t("listening.attempts", { count: attempt })}
            </Badge>
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="rounded-2xl border border-primary/20 bg-primary-soft/40 p-3.5">
            <p className="flex items-center gap-1.5 text-xs font-extrabold">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              {t("pronunciation.tip")}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-foreground/80">
              {phraseTip(phrase, language)}
            </p>
          </div>

          {!recognition.supported ? (
            <Alert tone="info" title={t("pronunciation.micUnsupported")} />
          ) : null}

          {speechError ? (
            <Alert tone="warning" title={speechError} />
          ) : null}

          {!score ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={toggleRecording}
                  variant={recognition.listening ? "danger" : "primary"}
                  icon={
                    recognition.listening ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )
                  }
                >
                  {recognition.listening
                    ? t("pronunciation.stopRecording")
                    : t("pronunciation.startRecording")}
                </Button>
                {recognition.listening ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-danger">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-danger" aria-hidden="true" />
                    {t("pronunciation.recording")}
                  </span>
                ) : null}
                {recognition.supported ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setManualOpen((open) => !open)}
                    aria-expanded={manualOpen}
                  >
                    {t("pronunciation.manual")}
                  </Button>
                ) : null}
              </div>

              {usesManualEntry ? (
                <div className="space-y-2">
                  <Field
                    label={t("pronunciation.manualLabel")}
                    hint={t("pronunciation.manualNote")}
                  >
                    <textarea
                      ref={textareaRef}
                      value={transcript}
                      onChange={(event) => setTranscript(event.target.value)}
                      dir="ltr"
                      lang="de"
                      rows={3}
                      placeholder={t("pronunciation.manualPlaceholder")}
                      className={cn(inputCn, "resize-y text-base leading-relaxed")}
                      spellCheck={false}
                      autoCapitalize="off"
                    />
                  </Field>
                  <Button
                    onClick={check}
                    disabled={transcript.trim().length === 0}
                    icon={<CheckCircle2 className="h-4 w-4" />}
                  >
                    {t("pronunciation.check")}
                  </Button>
                </div>
              ) : transcript ? (
                <div className="rounded-2xl border border-border/70 bg-muted/30 p-3.5">
                  <p className="text-xs font-extrabold">
                    {t("pronunciation.transcript")}
                  </p>
                  <p dir="ltr" lang="de" className="mt-1 text-sm font-bold">
                    {transcript}
                  </p>
                  <Button
                    onClick={check}
                    className="mt-2"
                    variant="outline"
                    icon={<CheckCircle2 className="h-4 w-4" />}
                  >
                    {t("pronunciation.check")}
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/70 bg-muted/25 p-4">
                <div className="flex items-center gap-3">
                  <ProgressRing
                    value={score.accuracy}
                    size={84}
                    strokeWidth={9}
                    label={t("pronunciation.accuracy")}
                  >
                    <span className="text-lg font-extrabold leading-none">
                      {score.accuracy}%
                    </span>
                    <span className="mt-1 text-[0.55rem] font-bold text-muted-foreground">
                      {t("pronunciation.accuracy")}
                    </span>
                  </ProgressRing>
                  <div>
                    <p className="text-sm font-extrabold">
                      {score.passed
                        ? t("pronunciation.passed")
                        : t("pronunciation.failed")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("pronunciation.wordsHit", {
                        correct: score.correctWords,
                        total: score.totalWords,
                      })}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t("pronunciation.wordAccuracy")}: {score.wordAccuracy}%
                    </p>
                  </div>
                </div>
                <div className="min-w-[9rem]">
                  <p className="text-[0.65rem] font-bold uppercase tracking-wide text-muted-foreground">
                    {t("pronunciation.wordAccuracy")}
                  </p>
                  <ProgressBar
                    value={score.wordAccuracy}
                    className="mt-1 h-1.5"
                    tone={score.wordAccuracy >= 80 ? "success" : "warning"}
                  />
                </div>
              </div>

              {speechError ? (
                <Alert tone="warning" title={speechError} />
              ) : null}

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
                  {score.words.map((word, wordIndex) => {
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
              </div>

              <div>
                <p className="mb-2 text-xs font-extrabold">
                  {t("pronunciation.sounds")}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {score.sounds.map((sound) => (
                    <div
                      key={sound.id}
                      className="rounded-2xl border border-border/70 bg-card p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-extrabold">
                            {soundLabel(sound, language)}
                          </p>
                          <p className="text-[0.65rem] font-bold text-muted-foreground">
                            {sound.symbol}
                          </p>
                        </div>
                        <Badge tone={SOUND_TONE[sound.status]}>
                          {t(
                            sound.status === "clear"
                              ? "pronunciation.clear"
                              : sound.status === "almost"
                                ? "pronunciation.almost"
                                : "pronunciation.retrySound",
                          )}
                        </Badge>
                      </div>
                      <ProgressBar
                        value={sound.accuracy}
                        className="mt-2 h-1.5"
                        tone={
                          sound.status === "clear"
                            ? "success"
                            : sound.status === "almost"
                              ? "warning"
                              : "primary"
                        }
                      />
                      <p className="mt-1.5 text-[0.65rem] text-muted-foreground">
                        {t("pronunciation.soundScore", {
                          score: sound.accuracy,
                        })}
                      </p>
                      <p className="mt-1.5 text-[0.7rem] leading-relaxed text-foreground/75">
                        {language === "ar" ? sound.tipAr : sound.tipEn}
                      </p>
                      <p
                        dir="ltr"
                        lang="de"
                        className="mt-1.5 text-[0.68rem] font-bold text-muted-foreground"
                      >
                        {sound.words.join(" · ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {usesManualEntry ? (
                <p className="text-[0.7rem] text-muted-foreground">
                  {t("pronunciation.manualNote")}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={retry}
                  icon={<RotateCcw className="h-4 w-4" />}
                >
                  {t("pronunciation.retry")}
                </Button>
                <Button
                  onClick={next}
                  icon={<ArrowRight className="h-4 w-4 rtl:rotate-180" />}
                >
                  {t("pronunciation.next")}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => play(0.88)}
                  disabled={!tts.supported}
                  icon={<Headphones className="h-4 w-4" />}
                >
                  {t("common.listen")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      <p className="text-center text-[0.7rem] text-muted-foreground">
        {t("pronunciation.phrase", {
          current: index + 1,
          total: phrases.length,
        })}
      </p>
    </div>
  );
}
