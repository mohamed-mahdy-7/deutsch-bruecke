import type { DrillAiQuestion } from "@/services/ai";
import type {
  DrillQuestion,
  DrillTopic,
  GrammarTopic,
} from "@/types/domain";

/**
 * AI practice categories share the five persisted grammar buckets, so weak
 * spots and drill results keep satisfying the existing Supabase constraints.
 */
export const DRILL_TOPIC_GRAMMAR_TOPIC: Record<DrillTopic, GrammarTopic> = {
  articles: "articles",
  cases: "cases",
  prepositions: "prepositions",
  verb_position: "word_order",
  separable_verbs: "word_order",
  subordinate_clauses: "word_order",
  plurals: "articles",
};

/**
 * The API returns one flat camelCase question. The hub needs both identities:
 * `drillTopic` for display and `topic` for persistence/analytics.
 */
export function toDrillQuestion(input: DrillAiQuestion): DrillQuestion {
  return {
    id: input.id,
    topic: input.grammarTopic,
    drillTopic: input.topic,
    pattern: input.pattern,
    level: input.level,
    promptBefore: input.promptBefore,
    promptAfter: input.promptAfter,
    hintAr: input.hintAr,
    hintEn: input.hintEn,
    options: input.options,
    correctAnswer: input.correctAnswer,
    translationAr: input.translationAr,
    translationEn: input.translationEn,
    explanationAr: input.explanationAr,
    explanationEn: input.explanationEn,
    weakSpotAr: input.weakSpotAr,
    weakSpotEn: input.weakSpotEn,
  };
}

export function toDrillQuestions(
  inputs: readonly DrillAiQuestion[],
): DrillQuestion[] {
  return inputs.map(toDrillQuestion);
}

/**
 * Weak spots are stored under the five persisted grammar buckets. A drill
 * session should only ask the provider to prioritise patterns that can appear
 * in its own topic.
 */
export function weakSpotsForTopic<T extends { topic: GrammarTopic }>(
  topic: DrillTopic,
  weakSpots: readonly T[],
): T[] {
  const bucket = DRILL_TOPIC_GRAMMAR_TOPIC[topic];
  return weakSpots.filter((spot) => spot.topic === bucket);
}
