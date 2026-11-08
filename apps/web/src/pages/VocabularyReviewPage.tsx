import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Layers,
  RotateCcw,
  Sparkles,
  Volume2,
} from "lucide-react";
import type { GrammarArticle, SrsQuality } from "@/types/domain";
import type { TranslationKey } from "@/lib/i18n";
import { useAppPreferences } from "@/state/useAppPreferences";
import { useProgress } from "@/state/ProgressProvider";
import { gradeVocabCard, reviewQueue } from "@/lib/srs";
import { CATEGORY_LABEL_KEY } from "@/lib/uiLabels";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { buttonCn } from "@/components/ui/Button";import { ProgressBar } from "@/components/ui/Progress";
import { EmptyState } from "@/components/ui/Feedback";
import { SpeakerButton } from "@/components/german/SpeakerButton";
import { GermanText } from "@/components/german/GermanText";

const REVIEW_LIMIT = 12;

const ARTICLE_TONE: Record<GrammarArticle, BadgeTone> = {
  der: "masc",
  die: "fem",
  das: "neut",
};

const ARTICLE_COLOR: Record<GrammarArticle, string> = {
  der: "text-masc",
  die: "text-fem",
  das: "text-neut",
};

const ARTICLE_GENDER_KEY = {
  der: "gender.masculine",
  die: "gender.feminine",
  das: "gender.neuter",
} as const satisfies Record<GrammarArticle, TranslationKey>;

const QUALITY_STYLES: Record<
  SrsQuality,
  { labelKey: TranslationKey; className: string }
> = {
  again: {
    labelKey: "vocab.quality.again",
    className: "border-danger/30 bg-danger/5 text-danger hover:bg-danger/10",
  },
  hard: {
    labelKey: "vocab.quality.hard",
    className:
      "border-warning/35 bg-warning/10 text-warning hover:bg-warning/15",
  },
  good: {
    labelKey: "vocab.quality.good",
    className:
      "border-primary/35 bg-primary-soft/50 text-primary hover:bg-primary-soft",
  },
  easy: {
    labelKey: "vocab.quality.easy",
    className:
      "border-success/35 bg-success/10 text-success hover:bg-success/15",
  },
};

const QUALITY_ORDER: SrsQuality[] = ["again", "hard", "good", "easy"];

export function VocabularyReviewPage() {
  const { t } = useAppPreferences();
  const { progress, reviewVocabCard } = useProgress();

  // The queue is a snapshot for this session. If the learner reveals a card,
  // the scheduler still updates its real next due date behind the scenes.
  const [queue] = useState<string[]>(() =>
    reviewQueue(progress?.vocabCards ?? [], REVIEW_LIMIT).map((card) => card.id),
  );
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [finished, setFinished] = useState(false);

  const total = queue.length;
  const currentId = queue[index];
  const card = progress?.vocabCards.find((item) => item.id === currentId);
  const complete = finished || (total > 0 && !card);

  const grade = (quality: SrsQuality) => {
    if (!card) return;
    reviewVocabCard(card.id, quality);
    setReviewed((count) => count + 1);
    setRevealed(false);
    if (index + 1 >= queue.length) {
      setFinished(true);
    } else {
      setIndex((value) => value + 1);
    }
  };

  if (total === 0) {
    return (
      <div className="animate-fade-up">
        <PageHeader
          eyebrow={t("nav.vocabulary")}
          title={t("vocab.reviewDueTitle")}
          subtitle={t("vocab.easyNote")}
        />
        <div className="mx-auto mt-5 max-w-2xl">
          <EmptyState
            icon={Sparkles}
            title={t("vocab.allCaughtUp")}
            body={t("vocab.caughtBody")}
            action={
              <Link to="/vocabulary" className={buttonCn("primary", "md")}>
                <Layers className="h-4 w-4" aria-hidden="true" />
                {t("vocab.backToVocab")}
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  if (complete) {
    return (
      <div className="animate-fade-up">
        <PageHeader
          eyebrow={t("nav.vocabulary")}
          title={t("vocab.reviewComplete")}
          subtitle={t("vocab.reviewCompleteBody", { count: reviewed })}
        />
        <div className="mx-auto mt-5 max-w-2xl">
          <section className="surface-card overflow-hidden text-center">
            <div className="bg-gradient-to-br from-success/10 via-card to-primary-soft/60 p-6 sm:p-8">
              <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-card text-success shadow-sm">
                <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
              </span>
              <p className="mt-3 text-4xl font-extrabold text-primary">
                {reviewed}
              </p>
              <p className="mt-1 text-sm font-bold text-muted-foreground">
                {t("vocab.reviewCompleteBody", { count: reviewed })}
              </p>
            </div>
            <div className="flex flex-col gap-2 p-5 sm:flex-row sm:justify-center">
              <Link
                to="/vocabulary"
                className={buttonCn("primary", "md")}
              >
                <Layers className="h-4 w-4" aria-hidden="true" />
                {t("vocab.backToVocab")}
              </Link>
              <Link
                to="/dashboard"
                className={buttonCn("outline", "md")}
              >
                {t("nav.home")}
                <ArrowRight className="h-4 w-4 flip-rtl" aria-hidden="true" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (!card) return null;

  const fullWord = card.article ? `${card.article} ${card.word}` : card.word;

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={t("nav.vocabulary")}
        title={t("vocab.reviewDueTitle")}
        subtitle={t("vocab.flipHint")}
        actions={
          <Badge tone="primary">
            {t("vocab.cardOf", { current: index + 1, total })}
          </Badge>
        }
      />

      <div className="mx-auto mt-4 max-w-2xl">
        <ProgressBar
          value={index + (revealed ? 0.5 : 0)}
          max={total}
          className="mb-4 h-1.5"
          label={t("vocab.reviewDueTitle")}
        />

        <section
          className={cn(
            "surface-card overflow-hidden transition-colors",
            revealed ? "border-primary/30" : "border-border/70",
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/30 px-4 py-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="neutral">{card.level}</Badge>
              {card.article ? (
                <Badge tone={ARTICLE_TONE[card.article]}>
                  {t(ARTICLE_GENDER_KEY[card.article])}
                </Badge>
              ) : null}
              {card.source === "chat" ? (
                <Badge tone="primary">{t("vocab.fromTutor")}</Badge>
              ) : null}
            </div>
            <SpeakerButton
              text={fullWord}
              label={t("aria.listen")}
              variant="outline"
            />
          </div>

          <div className="p-6 text-center sm:p-8">
            <button
              type="button"
              onClick={() => setRevealed(true)}
              disabled={revealed}
              className="group mx-auto block w-full rounded-2xl px-3 py-6 transition-colors focus-visible:bg-muted/30 disabled:cursor-default"
            >
              <span
                dir="ltr"
                lang="de"
                className="german-inline block text-4xl font-extrabold leading-tight sm:text-5xl"
              >
                {card.article ? (
                  <span className={ARTICLE_COLOR[card.article]}>
                    {card.article}{" "}
                  </span>
                ) : null}
                {card.word}
              </span>
              {!revealed ? (
                <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary">
                  <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("vocab.reveal")}
                </span>
              ) : null}
            </button>

            {!revealed ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("vocab.flipHint")}
              </p>
            ) : (
              <div className="mt-2 animate-fade-up text-start">
                <div className="rounded-2xl border border-border/60 bg-muted/25 p-4">
                  <p className="eyebrow">{t("vocab.meaning")}</p>
                  <p className="mt-1 text-lg font-extrabold">
                    {card.translationAr}
                  </p>
                  <p
                    dir="ltr"
                    className="mt-0.5 text-sm text-muted-foreground"
                  >
                    {card.translationEn}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
                    <span className="text-xs font-bold text-muted-foreground">
                      {t("vocab.plural")}
                    </span>
                    <span
                      dir="ltr"
                      lang="de"
                      className="german-inline text-sm font-bold"
                    >
                      {card.plural ?? t("vocab.noPlural")}
                    </span>
                  </div>

                  {card.exampleDe ? (
                    <div className="mt-3 border-t border-border/60 pt-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="eyebrow">{t("vocab.example")}</p>
                          <GermanText
                            text={card.exampleDe}
                            interactive={false}
                            className="mt-1 text-sm font-semibold"
                          />
                          {card.exampleAr ? (
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                              {card.exampleAr}
                            </p>
                          ) : null}
                        </div>
                        <SpeakerButton
                          text={card.exampleDe}
                          className="h-8 w-8"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4">
                  <p className="mb-2 text-center text-xs font-bold text-muted-foreground">
                    {t("vocab.ratePrompt")}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {QUALITY_ORDER.map((quality) => {
                      const styles = QUALITY_STYLES[quality];
                      const preview = gradeVocabCard(card, quality);
                      return (
                        <button
                          key={quality}
                          type="button"
                          onClick={() => grade(quality)}
                          className={cn(
                            "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2.5 text-sm font-extrabold transition-all hover:-translate-y-0.5 hover:shadow-sm",
                            styles.className,
                          )}
                        >
                          <span>{t(styles.labelKey)}</span>
                          <span className="text-[0.62rem] font-semibold opacity-80">
                            {quality === "again"
                              ? t("vocab.quality.again")
                              : t("vocab.dueInDays", {
                                  count: preview.intervalDays,
                                })}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <Link to="/vocabulary" className={buttonCn("ghost", "sm")}>
            {t("vocab.backToVocab")}
          </Link>
          {revealed ? (
            <p className="flex items-center gap-1 text-[0.68rem] text-muted-foreground">
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              {t("vocab.easyNote")}
            </p>
          ) : (
            <p className="text-[0.68rem] text-muted-foreground">
              {t(CATEGORY_LABEL_KEY[card.category])}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
