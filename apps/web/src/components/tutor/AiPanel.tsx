import { useEffect, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import type { AiAction } from "@/types/domain";
import { useAppPreferences } from "@/state/useAppPreferences";
import { useProgress } from "@/state/ProgressProvider";
import {
  requestExplanation,
  requestSimplification,
  requestTranslation,
} from "@/services/ai";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { GermanText } from "@/components/german/GermanText";
import { SpeakerButton } from "@/components/german/SpeakerButton";

type PanelResult =
  | { kind: "explain"; explanation: string; examples: { de: string; ar: string }[] }
  | { kind: "simplify"; simplified: string; translation: string }
  | { kind: "translate"; translation: string };

const ACTION_TITLE_KEY = {
  explain: "tutor.aiPanel.explanation",
  simplify: "tutor.aiPanel.simplified",
  translate: "tutor.aiPanel.translation",
} as const;

/** Lazy AI helper panel: explain, simplify or translate one German message. */
export function AiPanel({
  target,
  onClose,
}: {
  target: { action: AiAction; text: string } | null;
  onClose: () => void;
}) {
  const { t } = useAppPreferences();
  const { progress } = useProgress();
  const [result, setResult] = useState<PanelResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const open = Boolean(target);
  const action = target?.action ?? "translate";
  const text = target?.text ?? "";
  const level = progress?.profile.level ?? "A1";
  const dialect = progress?.profile.nativeDialect ?? "egyptian";

  useEffect(() => {
    if (!open || !text) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    setResult(null);

    const run = async () => {
      if (action === "explain") {
        const { data } = await requestExplanation({ text, level, dialect });
        return {
          kind: "explain",
          explanation: data.explanation_ar,
          examples: data.examples ?? [],
        } satisfies PanelResult;
      }
      if (action === "simplify") {
        const { data } = await requestSimplification({ text, level, dialect });
        return {
          kind: "simplify",
          simplified: data.simplified_de,
          translation: data.translation_ar,
        } satisfies PanelResult;
      }
      const { data } = await requestTranslation({ text, level, dialect });
      return {
        kind: "translate",
        translation: data.translation_ar,
      } satisfies PanelResult;
    };

    void run()
      .then((next) => {
        if (!cancelled) setResult(next);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, action, text, level, dialect, reloadKey]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t(ACTION_TITLE_KEY[action])}
      closeLabel={t("common.close")}
      size="md"
      footer={
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            {t("common.close")}
          </Button>
        </div>
      }
    >
      <div className="mb-3 rounded-xl border border-border/60 bg-muted/40 p-3">
        <GermanText
          text={text}
          interactive={false}
          className="text-sm text-muted-foreground"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-8 text-sm text-muted-foreground">
          <Spinner />
          {t("tutor.aiPanel.loading")}
        </div>
      ) : error ? (
        <div className="space-y-3">
          <Alert tone="danger">{t("tutor.aiPanel.error")}</Alert>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setReloadKey((key) => key + 1)}
            icon={<RefreshCw className="h-4 w-4" />}
          >
            {t("common.retry")}
          </Button>
        </div>
      ) : result ? (
        <div className="animate-fade-up space-y-3">
          {result.kind === "explain" ? (
            <>
              <div className="rounded-2xl border border-primary/20 bg-primary-soft/40 p-4">
                <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-primary">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("tutor.action.explain")}
                </p>
                <p className="mt-2 text-sm leading-relaxed">{result.explanation}</p>
              </div>
              {result.examples.length > 0 ? (
                <ul className="space-y-2">
                  {result.examples.map((example, index) => (
                    <li
                      key={`${example.de}-${index}`}
                      className="rounded-xl border border-border/60 bg-card p-3"
                    >
                      <div className="flex items-start gap-2">
                        <GermanText
                          text={example.de}
                          interactive={false}
                          className="min-w-0 flex-1 text-sm font-semibold"
                        />
                        <SpeakerButton text={example.de} className="h-8 w-8" />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{example.ar}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : null}

          {result.kind === "simplify" ? (
            <>
              <div className="rounded-2xl border border-border/60 bg-card p-4">
                <div className="flex items-start gap-2">
                  <GermanText
                    text={result.simplified}
                    interactive={false}
                    className="min-w-0 flex-1 text-base font-semibold"
                  />
                  <SpeakerButton text={result.simplified} className="h-9 w-9" />
                </div>
              </div>
              <div>
                <p className="eyebrow">{t("tutor.aiPanel.translation")}</p>
                <p className="mt-1 text-sm leading-relaxed">{result.translation}</p>
              </div>
            </>
          ) : null}

          {result.kind === "translate" ? (
            <div className="rounded-2xl border border-border/60 bg-card p-4">
              <p className="text-base leading-relaxed">{result.translation}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
