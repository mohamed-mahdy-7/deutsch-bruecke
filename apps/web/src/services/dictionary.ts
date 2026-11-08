import { STARTER_VOCAB } from "@/data/vocabulary";
import type { WordDetails } from "@/types/domain";

/** Strips punctuation and a leading definite article from a tapped word. */
function normalizeWord(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^["'„“”]+|["'“”]+$/g, "")
    .replace(/^(der|die|das)\s+/i, "")
    .replace(/[.,!?;:]+$/g, "")
    .trim();
}

function candidates(word: string): string[] {
  const forms = new Set<string>([word]);
  // Light inflection handling is enough for the curated A1 nouns (Frauen,
  // Tische, Kindern …). Unknown forms still fall through to the AI dictionary.
  for (const suffix of ["en", "n", "e", "s", "es", "ern"]) {
    if (word.endsWith(suffix) && word.length > suffix.length + 2) {
      forms.add(word.slice(0, -suffix.length));
    }
  }
  if (word.endsWith("er") && word.length > 4) forms.add(word.slice(0, -1));
  return [...forms];
}

/** Offline lookup against the 100 curated A1 cards. */
export function lookupLocalWord(rawWord: string): WordDetails | null {
  const word = normalizeWord(rawWord);
  if (!word) return null;

  for (const form of candidates(word)) {
    const card = STARTER_VOCAB.find(
      (candidate) => candidate.word.toLowerCase() === form,
    );
    if (!card) continue;
    return {
      word: card.word,
      article: card.article,
      plural: card.plural,
      part_of_speech: card.article ? "Nomen" : "Wort",
      meaning_ar: card.translationAr,
      meaning_en: card.translationEn,
      example_de: card.exampleDe,
      example_ar: card.exampleAr,
    };
  }

  return null;
}
