import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { segmentGermanText } from "@/lib/german";

export interface GermanTextProps {
  text: string;
  onWordClick?: (word: string, context: string) => void;
  className?: string;
  /** When true, each word is a real button (default when a click handler exists). */
  interactive?: boolean;
}

/**
 * Renders German text with LTR isolation and grammar colouring. Word buttons
 * are used for the tap-to-look-up interaction in the tutor.
 */
export function GermanText({
  text,
  onWordClick,
  className,
  interactive = true,
}: GermanTextProps) {
  const segments = useMemo(() => segmentGermanText(text), [text]);
  const clickable = Boolean(onWordClick) && interactive;

  return (
    <span
      dir="ltr"
      lang="de"
      className={cn("german-text block text-start", className)}
    >
      {segments.map((segment, index) => {
        if (!segment.isWord) {
          return <span key={`s-${index}`}>{segment.value}</span>;
        }

        if (!clickable) {
          return (
            <span key={`w-${index}`} className={segment.className}>
              {segment.value}
            </span>
          );
        }

        return (
          <button
            key={`w-${index}`}
            type="button"
            onClick={() => onWordClick?.(segment.value, text)}
            className={cn(
              "inline cursor-pointer rounded-[3px] px-[1px] transition-colors hover:bg-primary/10 focus-visible:bg-primary/15",
              segment.className,
            )}
            title={segment.value}
          >
            {segment.value}
          </button>
        );
      })}
    </span>
  );
}
