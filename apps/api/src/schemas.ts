import { z } from "zod";

export const levels = ["A1", "A2", "B1"] as const;
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
  corrected: z.string().trim().min(1).max(800),
  mistakes: z.array(mistakeSchema).max(3),
  praise_ar: z.string().trim().min(1).max(500),
  follow_up_question_de: z.string().trim().min(1).max(300),
});

export const vocabularySuggestionSchema = z.object({
  word: z.string().trim().min(1).max(80),
  article: z.enum(["der", "die", "das"]).nullable(),
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

export const chatRequestSchema = z.object({
  scenarioId: z.string().trim().min(1).max(40),
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
  article: z.enum(["der", "die", "das"]).nullable(),
  plural: z.string().trim().max(100).nullable(),
  part_of_speech: z.string().trim().min(1).max(60),
  meaning_ar: z.string().trim().min(1).max(400),
  meaning_en: z.string().trim().min(1).max(400),
  example_de: z.string().trim().min(1).max(500),
  example_ar: z.string().trim().min(1).max(500),
});

export type TutorResponse = z.infer<typeof tutorResponseSchema>;
export type Mistake = z.infer<typeof mistakeSchema>;
export type AssistAction = z.infer<typeof assistRequestSchema>["action"];
export type ExplainResponse = z.infer<typeof explainResponseSchema>;
export type SimplifyResponse = z.infer<typeof simplifyResponseSchema>;
export type TranslateResponse = z.infer<typeof translateResponseSchema>;
export type WordResponse = z.infer<typeof wordResponseSchema>;
