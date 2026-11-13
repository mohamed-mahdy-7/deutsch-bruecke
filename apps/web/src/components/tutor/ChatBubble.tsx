import { useState, type ReactNode } from "react";
import {
  BookPlus,
  Check,
  GraduationCap,
  Languages,
  Snail,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import type { AiAction, ChatMessage } from "@/types/domain";
import { useAppPreferences } from "@/state/useAppPreferences";
import { useProgress } from "@/state/ProgressProvider";
import { useSpeechSynthesis } from "@/hooks/useSpeech";
import { formatTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { GermanText } from "@/components/german/GermanText";
import { SpeakerButton } from "@/components/german/SpeakerButton";
import { CorrectionCard } from "@/components/tutor/CorrectionCard";

function ActionButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="touch-target inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[0.68rem] font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

/**
 * One conversation turn. Assistant messages carry pronunciation and AI helper
 * actions; learner messages carry the gentle-correction card.
 */
export function ChatBubble({
  message,
  onWordClick,
  onPanel,
}: {
  message: ChatMessage;
  onWordClick: (word: string, context: string) => void;
  onPanel: (action: AiAction, text: string) => void;
}) {
  const { t, language } = useAppPreferences();
  const { progress, addVocabCard } = useProgress();
  const { speak } = useSpeechSynthesis();
  const [addedWords, setAddedWords] = useState<Set<string>>(new Set());

  const isAssistant = message.role === "assistant";

  const saveSuggestion = (
    suggestion: NonNullable<ChatMessage["vocabulary"]>[number],
  ) => {
    const key = `${suggestion.article ?? ""}:${suggestion.word.toLowerCase()}`;
    const added = addVocabCard({
      word: suggestion.word,
      article: suggestion.article,
      plural: suggestion.plural,
      translationAr: suggestion.translation_ar,
      exampleDe: suggestion.example_de,
      source: "chat",
    });
    if (added || progress?.vocabCards.some((card) => card.word === suggestion.word)) {
      setAddedWords((current) => new Set(current).add(key));
    }
  };

  if (isAssistant) {
    return (
      <div className="flex items-start gap-2.5">
        <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 max-w-[92%] sm:max-w-[82%]">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className="text-[0.7rem] font-extrabold text-muted-foreground">
              {t("tutor.tutorName")}
            </span>
            {message.isStarter ? (
              <Badge tone="neutral" className="py-0.5 text-[0.6rem]">
                {t("tutor.opening")}
              </Badge>
            ) : null}
            {message.mode === "demo" ? (
              <Badge tone="accent" className="py-0.5 text-[0.6rem]">
                {t("tutor.demoShort")}
              </Badge>
            ) : null}
          </div>

          <div className="rounded-2xl rounded-ss-md border border-border/70 bg-card p-3.5 shadow-sm sm:p-4">
            <GermanText
              text={message.content}
              onWordClick={onWordClick}
              className="text-[0.95rem] font-medium leading-relaxed"
            />

            {message.translationAr ? (
              <div className="mt-2.5 border-t border-border/50 pt-2.5">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {message.translationAr}
                </p>
              </div>
            ) : null}

            <div className="mt-2.5 flex flex-wrap items-center gap-0.5 border-t border-border/40 pt-1.5">
              <SpeakerButton
                text={message.content}
                className="h-8 w-8"
                label={t("tutor.action.repeat")}
              />
              <ActionButton
                label={t("tutor.action.slow")}
                onClick={() => speak(message.content, { rate: 0.62 })}
              >
                <Snail className="h-3.5 w-3.5" aria-hidden="true" />
                {t("tutor.action.slow")}
              </ActionButton>
              <ActionButton
                label={t("tutor.action.translate")}
                onClick={() => onPanel("translate", message.content)}
              >
                <Languages className="h-3.5 w-3.5" aria-hidden="true" />
                {t("tutor.action.translate")}
              </ActionButton>
              <ActionButton
                label={t("tutor.action.simplify")}
                onClick={() => onPanel("simplify", message.content)}
              >
                <WandSparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {t("tutor.action.simplify")}
              </ActionButton>
              <ActionButton
                label={t("tutor.action.explain")}
                onClick={() => onPanel("explain", message.content)}
              >
                <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                {t("tutor.action.explain")}
              </ActionButton>
            </div>
          </div>

          {message.vocabulary && message.vocabulary.length > 0 ? (
            <div className="mt-2 rounded-2xl border border-accent/25 bg-accent-soft/35 p-2.5">
              <p className="px-1 text-[0.65rem] font-extrabold uppercase tracking-wide text-accent-soft-foreground/80">
                {t("tutor.suggestions")}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {message.vocabulary.map((suggestion) => {
                  const key = `${suggestion.article ?? ""}:${suggestion.word.toLowerCase()}`;
                  const saved = addedWords.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => saveSuggestion(suggestion)}
                      disabled={saved}
                      className={cn(
                        "touch-target inline-flex max-w-full items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs transition-colors",
                        saved
                          ? "border-success/30 bg-success/10 text-success"
                          : "border-border bg-card hover:border-accent/40 hover:bg-accent-soft/50",
                      )}
                    >
                      <span className="german-inline font-bold">
                        {suggestion.article ? `${suggestion.article} ` : ""}
                        {suggestion.word}
                      </span>
                      <span className="truncate text-muted-foreground">
                        {suggestion.translation_ar}
                      </span>
                      {saved ? (
                        <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
                      ) : (
                        <BookPlus className="h-3 w-3 shrink-0" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end">
      <div className="max-w-[92%] sm:max-w-[82%]">
        <div className="mb-1 flex items-center justify-end gap-1.5">
          <span className="text-[0.7rem] font-extrabold text-muted-foreground">
            {t("tutor.you")}
          </span>
          <span className="text-[0.6rem] text-muted-foreground/70">
            {formatTime(message.createdAt, language)}
          </span>
        </div>
        <div className="on-primary rounded-2xl rounded-se-md bg-primary px-3.5 py-2.5 text-primary-foreground shadow-sm">
          <GermanText
            text={message.content}
            onWordClick={onWordClick}
            className="text-[0.95rem] font-medium leading-relaxed"
          />
        </div>

        {message.correction ? (
          <CorrectionCard
            correction={message.correction}
            onWordClick={onWordClick}
          />
        ) : null}
      </div>
    </div>
  );
}
