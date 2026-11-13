import type { DictationClip, DictationScore } from "@/types/domain";
import { alignGermanWords } from "@/lib/wordAlignment";

export const DICTATION_PASS_PERCENT = 80;

/**
 * Score a dictation attempt. A learner passes at 80% of the expected words;
 * punctuation and capitalisation never count against them, but word order and
 * spelling do.
 */
export function scoreDictation(
  clip: Pick<DictationClip, "textDe">,
  transcript: string,
): DictationScore {
  const alignment = alignGermanWords(clip.textDe, transcript);
  return {
    accuracy: alignment.accuracy,
    correctWords: alignment.correctWords,
    totalWords: alignment.totalWords,
    passed:
      alignment.totalWords > 0 &&
      alignment.accuracy >= DICTATION_PASS_PERCENT,
    diff: alignment.diff,
  };
}
