import type { z } from "zod";

const NULLISH = new Set(["", "null", "none", "n/a", "-", "—", "na"]);

export function normalizeArticle(value: unknown): "der" | "die" | "das" | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().toLowerCase();
  if (NULLISH.has(trimmed)) return undefined;
  if (trimmed === "der" || trimmed === "die" || trimmed === "das") {
    return trimmed as "der" | "die" | "das";
  }
  return undefined;
}

export function normalizeOptionalString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (NULLISH.has(trimmed.toLowerCase())) return undefined;
  return trimmed || undefined;
}

export function normalizeString(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (NULLISH.has(trimmed.toLowerCase())) return fallback;
  return trimmed;
}

export function normalizeArray<T>(value: unknown, item: (v: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  const out: T[] = [];
  for (const entry of value) {
    const normalized = item(entry);
    if (normalized !== null) out.push(normalized);
  }
  return out;
}

export function normalizeTutorResponse(raw: unknown, learnerMessage: string): unknown {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const reply = normalizeString(source.reply_de);
  const translation = normalizeString(source.translation_ar);
  const vocabRaw = Array.isArray(source.vocabulary) ? source.vocabulary : [];
  const vocabulary = vocabRaw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const e = entry as Record<string, unknown>;
      const word = normalizeString(e.word);
      const translationAr = normalizeString(e.translation_ar);
      if (!word || !translationAr) return null;
      return {
        word,
        article: normalizeArticle(e.article),
        plural: normalizeOptionalString(e.plural),
        translation_ar: translationAr,
        example_de: normalizeString(e.example_de, word),
      };
    })
    .filter(Boolean);

  const correctionRaw =
    source.correction && typeof source.correction === "object"
      ? (source.correction as Record<string, unknown>)
      : {};
  let corrected = normalizeString(correctionRaw.corrected);
  const learnerTrimmed = learnerMessage.trim();
  let isCorrect = false;
  if (!corrected) {
    corrected = learnerTrimmed;
    isCorrect = true;
  } else if (corrected.toLowerCase() === learnerTrimmed.toLowerCase()) {
    isCorrect = true;
  }
  const mistakesRaw = Array.isArray(correctionRaw.mistakes)
    ? correctionRaw.mistakes
    : [];
  const mistakes = mistakesRaw
    .map((m) => {
      if (!m || typeof m !== "object") return null;
      const mm = m as Record<string, unknown>;
      const original = normalizeString(mm.original);
      const fix = normalizeString(mm.fix);
      const explanation = normalizeString(mm.explanation_ar);
      if (!original || !fix || !explanation) return null;
      const type = typeof mm.type === "string" ? mm.type : "other";
      return { type, original, fix, explanation_ar: explanation };
    })
    .filter(Boolean);

  const correction = {
    corrected,
    isCorrect,
    mistakes,
    praise_ar: normalizeString(
      correctionRaw.praise_ar,
      isCorrect
        ? "ممتاز! جملتك صحيحة. استمر!"
        : "حلو إنك حاولت. كل محاولة بتقرّبك أكتر.",
    ),
    follow_up_question_de: normalizeString(correctionRaw.follow_up_question_de),
  };

  return {
    reply_de: reply || "…",
    translation_ar: translation || "…",
    correction,
    vocabulary,
  };
}
