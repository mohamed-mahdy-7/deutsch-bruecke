import { z } from "zod";

export const levels = ["A1", "A2", "B1"] as const;
export const formalities = ["du", "Sie"] as const;
export const grammarTopics = [
  "articles",
  "cases",
  "word_order",
  "vocabulary",
  "prepositions",
] as const;
/**
 * Practice categories shown in the grammar hub. Several AI categories share an
 * existing grammar bucket so no Supabase check constraint has to change.
 */
export const drillTopics = [
  "articles",
  "cases",
  "prepositions",
  "verb_position",
  "separable_verbs",
  "subordinate_clauses",
  "plurals",
] as const;
export const scenarioTones = ["friendly", "strict"] as const;
export const dialects = [
  "egyptian",
  "levantine",
  "gulf",
  "maghrebi",
  "msa",
  "other",
] as const;

export const mistakeTypes = [
  "article",
  "case",
  "verb_position",
  "verb_conjugation",
  "preposition",
  "vocabulary",
  "spelling",
  "punctuation",
  "word_order",
  "register",
  "other",
] as const;

export const mistakeSchema = z.object({
  type: z.enum(mistakeTypes),
  original: z.string().trim().min(1).max(300),
  fix: z.string().trim().min(1).max(300),
  explanation_ar: z.string().trim().min(1).max(500),
});

export const correctionSchema = z.object({
  corrected: z.string().trim().max(800).default(""),
  isCorrect: z.boolean().default(false),
  mistakes: z.array(mistakeSchema).max(3).default([]),
  praise_ar: z.string().trim().max(500).default(""),
  follow_up_question_de: z.string().trim().max(300).default(""),
});

export const vocabularySuggestionSchema = z.object({
  word: z.string().trim().min(1).max(80),
  article: z.enum(["der", "die", "das"]).nullable().optional(),
  plural: z.string().trim().max(100).nullable(),
  translation_ar: z.string().trim().min(1).max(200),
  example_de: z.string().trim().min(1).max(300),
});

export const tutorResponseSchema = z.object({
  reply_de: z.string().trim().min(1).max(1_200),
  translation_ar: z.string().trim().min(1).max(1_200),
  correction: correctionSchema,
  vocabulary: z.array(vocabularySuggestionSchema).max(3),
});

const keyVocabSchema = z.object({
  de: z.string().trim().min(1).max(60),
  article: z.enum(["der", "die", "das"]).nullable().optional(),
  plural: z.string().trim().max(80).nullable(),
  ar: z.string().trim().min(1).max(120),
});

const usefulPhraseSchema = z.object({
  de: z.string().trim().min(1).max(160),
  ar: z.string().trim().min(1).max(160),
});

/**
 * A scenario saved by the learner. `tone` is chosen in the UI and appended at
 * the API boundary; the model never invents it.
 */
export const customScenarioSchema = z.object({
  title_de: z.string().trim().min(1).max(80),
  title_ar: z.string().trim().min(1).max(80),
  emoji: z.string().trim().min(1).max(16),
  setting_ar: z.string().trim().min(1).max(400),
  ai_role_de: z.string().trim().min(1).max(160),
  learner_role_ar: z.string().trim().min(1).max(240),
  goal_ar: z.string().trim().min(1).max(400),
  level: z.enum(levels),
  formality: z.enum(formalities),
  tone: z.enum(scenarioTones),
  grammar_focus: z
    .array(z.string().trim().min(1).max(80))
    .min(1)
    .max(4),
  key_vocab: z.array(keyVocabSchema).min(2).max(8),
  useful_phrases: z.array(usefulPhraseSchema).min(1).max(6),
  opening_message_de: z.string().trim().min(1).max(400),
  opening_message_ar: z.string().trim().min(1).max(400),
});

/** Exact model contract: the learner's tone choice is not generated. */
export const scenarioDraftSchema = customScenarioSchema.omit({ tone: true });

export const scenarioRefusalSchema = z.object({
  refused_ar: z.string().trim().min(1).max(300),
});

export const scenarioModelResponseSchema = z.union([
  scenarioDraftSchema,
  scenarioRefusalSchema,
]);

export const scenarioRequestSchema = z.object({
  idea: z
    .string()
    .trim()
    .min(3, "idea_too_short")
    .max(500, "idea_too_long")
    .refine(
      (value) => /[A-Za-z\u0600-\u06FF]/.test(value),
      "idea_needs_letters",
    ),
  level: z.enum(levels).optional(),
  formality: z.enum(formalities).optional(),
  tone: z.enum(scenarioTones).default("friendly"),
  forceRegenerate: z.boolean().default(false),
});

export const chatRequestSchema = z.object({
  scenarioId: z.string().trim().min(1).max(80),
  level: z.enum(levels),
  dialect: z.enum(dialects).default("egyptian"),
  safeMode: z.boolean().default(false),
  learnerMessage: z.string().trim().min(1, "empty_message").max(500),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(1_200),
      }),
    )
    .max(12)
    .default([]),
  /**
   * Custom scenarios live on the learner's device (guest local storage or
   * Supabase). The client sends the validated definition with the turn; the
   * server never trusts it as instructions, only as scenario metadata.
   */
  customScenario: customScenarioSchema.optional(),
});

export const assistRequestSchema = z.object({
  action: z.enum(["explain", "simplify", "translate"]),
  text: z.string().trim().min(1).max(1_200),
  level: z.enum(levels),
  dialect: z.enum(dialects).default("egyptian"),
});

export const explainResponseSchema = z.object({
  explanation_ar: z.string().trim().min(1).max(1_500),
  examples: z
    .array(
      z.object({
        de: z.string().trim().min(1).max(300),
        ar: z.string().trim().min(1).max(300),
      }),
    )
    .max(3)
    .default([]),
});

export const simplifyResponseSchema = z.object({
  simplified_de: z.string().trim().min(1).max(800),
  translation_ar: z.string().trim().min(1).max(1_000),
});

export const translateResponseSchema = z.object({
  translation_ar: z.string().trim().min(1).max(1_200),
});

export const wordRequestSchema = z.object({
  word: z.string().trim().min(1).max(80),
  context: z.string().trim().max(500).default(""),
  level: z.enum(levels),
});

export const wordResponseSchema = z.object({
  word: z.string().trim().min(1).max(100),
  article: z.enum(["der", "die", "das"]).nullable().optional(),
  plural: z.string().trim().max(100).nullable(),
  part_of_speech: z.string().trim().min(1).max(60),
  meaning_ar: z.string().trim().min(1).max(400),
  meaning_en: z.string().trim().min(1).max(400),
  example_de: z.string().trim().min(1).max(500),
  example_ar: z.string().trim().min(1).max(500),
});

/* ------------------------------------------------------------------ */
/* AI drill contracts                                                  */
/* ------------------------------------------------------------------ */

export const drillWeakSpotSchema = z.object({
  pattern: z.string().trim().min(1).max(80),
  count: z.number().int().min(1).max(999).default(1),
  labelAr: z.string().trim().max(160).optional(),
  labelEn: z.string().trim().max(160).optional(),
});

export const drillRequestSchema = z.object({
  topic: z.enum(drillTopics),
  level: z.enum(levels),
  /**
   * Only patterns and counts drive generation. Labels are optional context so
   * older clients keep working if the shape evolves.
   */
  weakSpots: z.array(drillWeakSpotSchema).max(20).default([]),
  forceRegenerate: z.boolean().default(false),
});

/**
 * Raw model contract. English fields are optional so a weaker model that only
 * follows the Arabic instruction still yields usable questions; the endpoint
 * fills those fields defensively.
 */
export const drillQuestionModelSchema = z.object({
  pattern: z.string().trim().min(2).max(80),
  prompt_before: z.string().trim().max(240).default(""),
  prompt_after: z.string().trim().max(240).default(""),
  hint_ar: z.string().trim().min(1).max(300),
  hint_en: z.string().trim().max(300).optional(),
  options: z.array(z.string().trim().min(1).max(120)).length(4),
  correct_answer: z.string().trim().min(1).max(120),
  translation_ar: z.string().trim().min(1).max(400),
  translation_en: z.string().trim().max(400).optional(),
  explanation_ar: z.string().trim().min(1).max(700),
  explanation_en: z.string().trim().max(700).optional(),
  weak_spot_ar: z.string().trim().min(1).max(160),
  weak_spot_en: z.string().trim().max(160).optional(),
});

export const drillBatchModelSchema = z.object({
  questions: z.array(drillQuestionModelSchema).min(1).max(10),
});

/** Public camelCase question consumed by the web app. */
export const drillQuestionResponseSchema = z.object({
  id: z.string().trim().min(1).max(120),
  topic: z.enum(drillTopics),
  grammarTopic: z.enum(grammarTopics),
  pattern: z.string().trim().min(2).max(80),
  level: z.enum(levels),
  promptBefore: z.string().trim().max(240),
  promptAfter: z.string().trim().max(240),
  hintAr: z.string().trim().min(1).max(300),
  hintEn: z.string().trim().min(1).max(300),
  options: z.array(z.string().trim().min(1).max(120)).length(4),
  correctAnswer: z.string().trim().min(1).max(120),
  translationAr: z.string().trim().min(1).max(400),
  translationEn: z.string().trim().min(1).max(400),
  explanationAr: z.string().trim().min(1).max(700),
  explanationEn: z.string().trim().min(1).max(700),
  weakSpotAr: z.string().trim().min(1).max(160),
  weakSpotEn: z.string().trim().min(1).max(160),
});

export const drillResponseSchema = z.object({
  questions: z.array(drillQuestionResponseSchema).min(1).max(10),
  fallbackCount: z.number().int().min(0).max(10),
});

export type TutorResponse = z.infer<typeof tutorResponseSchema>;
export type Mistake = z.infer<typeof mistakeSchema>;
export type AssistAction = z.infer<typeof assistRequestSchema>["action"];
export type CustomScenario = z.infer<typeof customScenarioSchema>;
export type ScenarioDraft = z.infer<typeof scenarioDraftSchema>;
export type ScenarioRefusal = z.infer<typeof scenarioRefusalSchema>;
export type ScenarioModelResponse = z.infer<typeof scenarioModelResponseSchema>;
export type ScenarioRequest = z.infer<typeof scenarioRequestSchema>;
export type Formality = (typeof formalities)[number];
export type ScenarioTone = (typeof scenarioTones)[number];
export type ExplainResponse = z.infer<typeof explainResponseSchema>;
export type SimplifyResponse = z.infer<typeof simplifyResponseSchema>;
export type TranslateResponse = z.infer<typeof translateResponseSchema>;
export type WordResponse = z.infer<typeof wordResponseSchema>;
export type GrammarTopic = (typeof grammarTopics)[number];
export type DrillTopic = (typeof drillTopics)[number];
export type DrillWeakSpot = z.infer<typeof drillWeakSpotSchema>;
export type DrillRequest = z.infer<typeof drillRequestSchema>;
export type DrillQuestionModel = z.infer<typeof drillQuestionModelSchema>;
export type DrillBatchModel = z.infer<typeof drillBatchModelSchema>;
export type DrillQuestionResponse = z.infer<
  typeof drillQuestionResponseSchema
>;
export type DrillResponse = z.infer<typeof drillResponseSchema>;
