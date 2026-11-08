import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/providers/SettingsProvider";
import { useSpeechSynthesis } from "@/hooks/useSpeech";

export function SpeakerButton({
  text,
  rate = 0.92,
  className,
  label,
  variant = "ghost",
}: {
  text: string;
  rate?: number;
  className?: string;
  label?: string;
  variant?: "ghost" | "outline";
}) {
  const { t } = useSettings();
  const { supported, speaking, speak, cancel } = useSpeechSynthesis();
  const ariaLabel = label ?? t("aria.listen");

  return (
    <button
      type="button"
      onClick={() => {
        if (speaking) {
          cancel();
        } else {
          speak(text, { rate });
        }
      }}
      disabled={!supported}
      aria-label={speaking ? t("common.stop") : ariaLabel}
      title={supported ? ariaLabel : t("vocab.audioUnsupported")}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40",
        variant === "outline" && "border border-border bg-card",
        speaking && "bg-primary-soft text-primary",
        className,
      )}
    >
      {speaking ? (
        <VolumeX className="h-4 w-4 animate-pulse" aria-hidden="true" />
      ) : (
        <Volume2 className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}
