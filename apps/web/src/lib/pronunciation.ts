import { PRONUNCIATION_SOUNDS } from "@/data/pronunciation";
import { alignGermanWords } from "@/lib/wordAlignment";
import type {
  PronunciationPhrase,
  PronunciationScore,
  PronunciationSoundFeedback,
  PronunciationSoundId,
  PronunciationSoundStatus,
} from "@/types/domain";

export const PRONUNCIATION_PASS_PERCENT = 70;

export function wordHasSound(
  word: string,
  sound: PronunciationSoundId,
): boolean {
  const lower = word.toLowerCase();
  switch (sound) {
    case "ch":
      return lower.includes("ch") && !lower.includes("sch");
    case "sch":
      return lower.includes("sch");
    case "ue":
      return lower.includes("ü");
    case "oe":
      return lower.includes("ö");
    case "ae":
      return lower.includes("ä");
    case "r":
      return lower.includes("r");
    case "w":
      return lower.includes("w");
    case "v":
      return lower.includes("v");
    case "z":
      return lower.includes("z");
    case "ei":
      return lower.includes("ei");
    case "ie":
      return lower.includes("ie");
    case "eu":
      return lower.includes("eu") || lower.includes("äu");
    case "sp_st":
      return lower.startsWith("sp") || lower.startsWith("st");
    case "final_er":
      return /(er|ern)$/.test(lower);
    default:
      return false;
  }
}

function soundStatus(accuracy: number): PronunciationSoundStatus {
  if (accuracy >= 80) return "clear";
  if (accuracy >= 50) return "almost";
  return "retry";
}

export function phraseSoundWords(
  phrase: PronunciationPhrase,
  sound: PronunciationSoundId,
): string[] {
  return phrase.textDe
    .split(/\s+/)
    .map((word) => word.replace(/[.,!?;:"„“”'’()]/g, ""))
    .filter((word) => word.length > 0 && wordHasSound(word, sound));
}

/**
 * Compare the transcript with the target phrase at word level, then roll the
 * result up per target sound. A sound with one correct occurrence is "clear";
 * with several occurrences, the ratio decides between clear, almost, and retry.
 */
export function evaluatePronunciation(
  phrase: PronunciationPhrase,
  transcript: string,
): PronunciationScore {
  const alignment = alignGermanWords(phrase.textDe, transcript);
  const expectedWords = alignment.diff.filter((word) => word.expected !== null);

  const sounds: PronunciationSoundFeedback[] = phrase.focus
    .map((id) => {
      const rule = PRONUNCIATION_SOUNDS[id];
      const occurrences = expectedWords.filter((word) =>
        wordHasSound(word.expected ?? "", id),
      );
      const correct = occurrences.filter(
        (word) => word.status === "correct",
      ).length;
      const accuracy =
        occurrences.length === 0
          ? 0
          : Math.round((correct / occurrences.length) * 100);
      return {
        id,
        symbol: rule.symbol,
        labelAr: rule.labelAr,
        labelEn: rule.labelEn,
        tipAr: rule.tipAr,
        tipEn: rule.tipEn,
        accuracy,
        status: soundStatus(accuracy),
        words: [...new Set(occurrences.map((word) => word.expected ?? ""))],
      };
    })
    .filter((sound) => sound.words.length > 0);

  const soundAverage =
    sounds.length === 0
      ? alignment.accuracy
      : Math.round(
          sounds.reduce((sum, sound) => sum + sound.accuracy, 0) / sounds.length,
        );
  const accuracy = Math.round(alignment.accuracy * 0.6 + soundAverage * 0.4);

  return {
    accuracy,
    wordAccuracy: alignment.accuracy,
    correctWords: alignment.correctWords,
    totalWords: alignment.totalWords,
    passed:
      alignment.totalWords > 0 &&
      accuracy >= PRONUNCIATION_PASS_PERCENT,
    words: alignment.diff,
    sounds,
  };
}
