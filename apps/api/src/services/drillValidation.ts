import { randomUUID } from "node:crypto";
import type {
  DrillQuestionModel,
  DrillQuestionResponse,
  DrillTopic,
  GrammarTopic,
} from "../schemas.js";
import {
  drillPromptKey,
  normalizeDrillOption,
  slugifyDrillPattern,
} from "../lib/drill.js";

type Level = "A1" | "A2" | "B1";

/**
 * AI practice categories are mapped onto the existing five grammar buckets so
 * Supabase's `weak_spots` and `drill_results` check constraints stay untouched.
 */
export const DRILL_TOPIC_TO_GRAMMAR_TOPIC: Record<DrillTopic, GrammarTopic> = {
  articles: "articles",
  cases: "cases",
  prepositions: "prepositions",
  verb_position: "word_order",
  separable_verbs: "word_order",
  subordinate_clauses: "word_order",
  plurals: "articles",
};

export interface SanitizeOptions {
  topic: DrillTopic;
  level: Level;
  /** Prompt keys already accepted, used to dedupe replacement batches. */
  existingPromptKeys?: ReadonlySet<string>;
  maxQuestions?: number;
}

export interface SanitizedDrillBatch {
  questions: DrillQuestionResponse[];
  rejected: number;
}

function textOrFallback(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

/**
 * Validate model questions beyond Zod's shape checks: four distinct options,
 * exactly one correct option, and a unique non-empty stem. Any item that fails
 * is discarded rather than shown to the learner.
 */
export function sanitizeDrillQuestions(
  rawQuestions: readonly DrillQuestionModel[],
  options: SanitizeOptions,
): SanitizedDrillBatch {
  const existing = options.existingPromptKeys ?? new Set<string>();
  const seenPrompts = new Set(existing);
  const accepted: DrillQuestionResponse[] = [];
  let rejected = 0;
  const maxQuestions = options.maxQuestions ?? 10;

  for (const raw of rawQuestions) {
    if (accepted.length >= maxQuestions) break;

    const promptBefore = raw.prompt_before.trim();
    const promptAfter = raw.prompt_after.trim();
    const promptKey = drillPromptKey(promptBefore, promptAfter);
    if (!promptKey || seenPrompts.has(promptKey)) {
      rejected += 1;
      continue;
    }

    const optionList = raw.options.map((option) => option.trim());
    const optionKeys = new Set<string>();
    let duplicateOption = false;
    for (const option of optionList) {
      const key = normalizeDrillOption(option);
      if (!key || optionKeys.has(key)) {
        duplicateOption = true;
        break;
      }
      optionKeys.add(key);
    }
    if (duplicateOption) {
      rejected += 1;
      continue;
    }

    const answerKey = normalizeDrillOption(raw.correct_answer);
    const matchingOptions = optionList.filter(
      (option) => normalizeDrillOption(option) === answerKey,
    );
    if (matchingOptions.length !== 1) {
      rejected += 1;
      continue;
    }
    const correctAnswer = matchingOptions[0];
    if (!correctAnswer) {
      rejected += 1;
      continue;
    }

    seenPrompts.add(promptKey);
    accepted.push({
      id: `drill_${randomUUID()}`,
      topic: options.topic,
      grammarTopic: DRILL_TOPIC_TO_GRAMMAR_TOPIC[options.topic],
      pattern: slugifyDrillPattern(raw.pattern),
      level: options.level,
      promptBefore,
      promptAfter,
      hintAr: raw.hint_ar,
      hintEn: textOrFallback(raw.hint_en, raw.hint_ar),
      options: optionList,
      correctAnswer,
      translationAr: raw.translation_ar,
      translationEn: textOrFallback(raw.translation_en, raw.translation_ar),
      explanationAr: raw.explanation_ar,
      explanationEn: textOrFallback(raw.explanation_en, raw.explanation_ar),
      weakSpotAr: raw.weak_spot_ar,
      weakSpotEn: textOrFallback(raw.weak_spot_en, raw.weak_spot_ar),
    });
  }

  return { questions: accepted, rejected };
}

export function promptKeysFor(
  questions: readonly DrillQuestionResponse[],
): Set<string> {
  return new Set(
    questions.map((question) =>
      drillPromptKey(question.promptBefore, question.promptAfter),
    ),
  );
}
