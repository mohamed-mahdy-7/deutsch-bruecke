import { useEffect, useRef, useState } from "react";
import { BookPlus, Check, Languages, RefreshCw } from "lucide-react";
import type { GrammarArticle, WordDetails } from "@/types/domain";
import { useAppPreferences } from "@/state/useAppPreferences";
import { useAiAccess } from "@/state/AiAccessProvider";
import { useProgress } from "@/state/ProgressProvider";
import { lookupLocalWord } from "@/services/dictionary";
import { lookupWord } from "@/services/wordLookup";
import {
  aiBlockKindForError,
  AiAccessNotice,
  type AiBlockKind,
} from "@/components/ai/AiGate";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { GermanText } from "@/components/german/GermanText";
import { SpeakerButton } from "@/components/german/SpeakerButton";

const ARTICLE_TONE: Record<GrammarArticle, BadgeTone> = {
  der: "masc",
  die: "fem",
  das: "neut",
};

const ARTICLE_GENDER_KEY = {
  der: "gender.masculine",
  die: "gender.feminine",
  das: "gender.neuter",
} as const;

/**
 * Bottom-sheet style dictionary built from the learner's tapped word. Curated
 * A1 vocabulary resolves offline; everything else asks the AI dictionary.
 */
export function WordSheet({
  target,
  onClose,
}: {
  target: { word: string; context: string } | null;
  onClose: () => void;
}) {
  const { t } = useAppPreferences();
  const { progress, addVocabCard } = useProgress();
  const aiAccess = useAiAccess();
  const aiAccessRef = useRef(aiAccess);
  aiAccessRef.current = aiAccess;
  const [details, setDetails] = useState<WordDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [block, setBlock] = useState<AiBlockKind | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const level = progress?.profile.level ?? "A1";
  const word = target?.word ?? "";
  const context = target?.context ?? "";
  const open = Boolean(target);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    // Curated dictionary words never touch the AI, so they stay available to
    // guests and when the quota is exhausted.
    const needsAi = !lookupLocalWord(word);
    const access = aiAccessRef.current;
    if (needsAi && !access.canUse("word")) {
      setBlock(access.status === "ready" ? "quota_exhausted" : access.status);
      setLoading(false);
      setError(false);
      setDetails(null);
      return;
    }

    setBlock(null);
    setLoading(true);
    setError(false);
    setDetails(null);
    setJustAdded(false);

    void lookupWord(word, context, level)
      .then((result) => {
        if (!cancelled) setDetails(result.details);
      })
      .catch((caught) => {
        if (cancelled) return;
        const nextBlock = aiBlockKindForError(caught);
        if (nextBlock) {
          setBlock(nextBlock);
          if (nextBlock === "quota_exhausted") {
            void aiAccessRef.current.refresh();
          }
          return;
        }
        setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, word, context, level, reloadKey]);

  useEffect(() => {
    if (
      aiAccess.status === "ready" &&
      (block === "beta_required" || block === "signed_out")
    ) {
      setBlock(null);
      setReloadKey((key) => key + 1);
    }
  }, [aiAccess.status, block]);

  const alreadySaved = Boolean(
    details &&
      progress?.vocabCards.some(
        (card) =>
          card.word.trim().toLowerCase() === details.word.trim().toLowerCase() &&
          card.article === details.article,
      ),
  );
  const saved = alreadySaved || justAdded;

  const save = () => {
    if (!details) return;
    const added = addVocabCard({
      word: details.word,
      article: details.article,
      plural: details.plural,
      translationAr: details.meaning_ar,
      translationEn: details.meaning_en,
      exampleDe: details.example_de,
      exampleAr: details.example_ar,
      source: "chat",
    });
    if (added) setJustAdded(true);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("tutor.word.title")}
      closeLabel={t("common.close")}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t("common.close")}
          </Button>
          <Button
            onClick={save}
            disabled={!details || saved}
            icon={saved ? <Check className="h-4 w-4" /> : <BookPlus className="h-4 w-4" />}
          >
            {saved ? t("tutor.word.added") : t("tutor.word.add")}
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
          <Spinner />
          {t("tutor.word.loading")}
        </div>
      ) : block ? (
        <AiAccessNotice kind={block} feature="word" />
      ) : error ? (
        <div className="space-y-3 py-4">
          <Alert tone="danger">{t("tutor.word.error")}</Alert>
          <Button
            variant="outline"
            onClick={() => setReloadKey((key) => key + 1)}
            icon={<RefreshCw className="h-4 w-4" />}
            className="w-full"
          >
            {t("common.retry")}
          </Button>
        </div>
      ) : details ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted/40 p-4">
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                {details.article ? (
                  <span
                    className={`german-inline text-2xl font-extrabold ${
                      details.article === "der"
                        ? "grammar-der"
                        : details.article === "die"
                          ? "grammar-die"
                          : "grammar-das"
                    }`}
                  >
                    {details.article}
                  </span>
                ) : null}
                <span className="german-inline break-words text-2xl font-extrabold">
                  {details.word}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {details.article ? (
                  <Badge tone={ARTICLE_TONE[details.article]}>
                    {t(ARTICLE_GENDER_KEY[details.article])}
                  </Badge>
                ) : (
                  <Badge tone="neutral">{t("vocab.noArticleShort")}</Badge>
                )}
                <Badge tone="neutral">{details.part_of_speech}</Badge>
              </div>
            </div>
            <SpeakerButton
              text={`${details.article ?? ""} ${details.word}`.trim()}
              variant="outline"
              className="h-11 w-11"
            />
          </div>

          <div>
            <p className="eyebrow">{t("tutor.word.meaning")}</p>
            <p className="mt-1 text-lg font-bold">{details.meaning_ar}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Languages className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="german-inline">{details.meaning_en}</span>
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-card p-3">
              <p className="text-[0.68rem] font-bold text-muted-foreground">
                {t("tutor.word.article")}
              </p>
              <p className="mt-0.5 font-bold">
                {details.article ?? t("vocab.noArticleShort")}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-3">
              <p className="text-[0.68rem] font-bold text-muted-foreground">
                {t("tutor.word.plural")}
              </p>
              <p className="german-inline mt-0.5 font-bold">
                {details.plural ?? t("tutor.word.noPlural")}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary-soft/40 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="eyebrow">{t("tutor.word.example")}</p>
              <SpeakerButton text={details.example_de} className="h-8 w-8" />
            </div>
            <GermanText
              text={details.example_de}
              className="mt-1 text-sm font-semibold"
            />
            {details.example_ar ? (
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {details.example_ar}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
