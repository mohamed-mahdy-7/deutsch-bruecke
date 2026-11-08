import { CheckCircle2, Info } from "lucide-react";
import type { Correction } from "@/types/domain";
import { useAppPreferences } from "@/state/useAppPreferences";
import { MISTAKE_TYPE_KEY } from "@/lib/uiLabels";
import { Badge } from "@/components/ui/Badge";
import { GermanText } from "@/components/german/GermanText";
import { SpeakerButton } from "@/components/german/SpeakerButton";

/**
 * The gentle-correction card attached to a learner's message. It leads with
 * praise, then shows at most three focused mistakes with an Arabic
 * explanation — never a red wall of errors.
 */
export function CorrectionCard({
  correction,
  onWordClick,
}: {
  correction: Correction;
  onWordClick?: (word: string, context: string) => void;
}) {
  const { t } = useAppPreferences();

  return (
    <div className="mt-2 rounded-2xl border border-success/25 bg-success/5 p-3.5 text-start sm:p-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <p className="text-xs font-extrabold uppercase tracking-wide text-success">
          {t("tutor.correctionTitle")}
        </p>
      </div>

      {correction.praise_ar ? (
        <p className="mt-2.5 text-sm font-semibold leading-relaxed">
          {correction.praise_ar}
        </p>
      ) : null}

      <div className="mt-3 rounded-xl border border-border/60 bg-card p-3">
        <p className="text-[0.68rem] font-bold text-muted-foreground">
          {t("tutor.corrected")}
        </p>
        <div className="mt-1 flex items-start gap-2">
          <GermanText
            text={correction.corrected}
            onWordClick={onWordClick}
            className="min-w-0 flex-1 text-[0.95rem] font-semibold"
          />
          <SpeakerButton
            text={correction.corrected}
            className="h-8 w-8"
            label={t("common.listen")}
          />
        </div>
      </div>

      {correction.mistakes.length > 0 ? (
        <ul className="mt-3 space-y-2.5">
          {correction.mistakes.map((mistake, index) => (
            <li
              key={`${mistake.type}-${mistake.original}-${index}`}
              className="rounded-xl border border-border/60 bg-card p-3"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone="primary" className="normal-case">
                  {t(MISTAKE_TYPE_KEY[mistake.type])}
                </Badge>
                <span className="german-inline inline-flex flex-wrap items-center gap-1.5 text-sm">
                  <span className="text-danger line-through decoration-danger/50">
                    {mistake.original}
                  </span>
                  <span className="text-muted-foreground" aria-hidden="true">
                    ←
                  </span>
                  <span className="font-bold text-success">{mistake.fix}</span>
                </span>
              </div>
              <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                <Info
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                {mistake.explanation_ar}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-success">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          {t("tutor.noMistakes")}
        </p>
      )}
    </div>
  );
}
