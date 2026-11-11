import { describe, expect, it } from "vitest";
import type { DrillQuestionModel } from "../schemas.js";
import {
  DRILL_TOPIC_TO_GRAMMAR_TOPIC,
  promptKeysFor,
  sanitizeDrillQuestions,
} from "./drillValidation.js";

const validQuestion: DrillQuestionModel = {
  pattern: "Dative Article",
  prompt_before: "Ich helfe",
  prompt_after: "Frau.",
  hint_ar: "الفعل ده بياخد Dativ.",
  hint_en: "This verb takes the dative.",
  options: ["der", "die", "den", "dem"],
  correct_answer: "der",
  translation_ar: "أنا بساعد الست.",
  translation_en: "I help the woman.",
  explanation_ar: "«helfen» بياخد Dativ، والمؤنّث بيبقى «der».",
  explanation_en: "“helfen” takes the dative, so feminine becomes “der”.",
  weak_spot_ar: "Dativ للمؤنّث",
  weak_spot_en: "Feminine dative",
};

function sanitize(questions: DrillQuestionModel[], maxQuestions = 10) {
  return sanitizeDrillQuestions(questions, {
    topic: "cases",
    level: "A2",
    maxQuestions,
  });
}

describe("sanitizeDrillQuestions", () => {
  it("accepts a valid question and maps it to the public camelCase contract", () => {
    const result = sanitize([validQuestion]);

    expect(result.rejected).toBe(0);
    expect(result.questions).toHaveLength(1);
    const [question] = result.questions;
    expect(question).toMatchObject({
      topic: "cases",
      grammarTopic: DRILL_TOPIC_TO_GRAMMAR_TOPIC.cases,
      level: "A2",
      pattern: "dative-article",
      promptBefore: "Ich helfe",
      promptAfter: "Frau.",
      correctAnswer: "der",
      explanationEn: validQuestion.explanation_en,
    });
    expect(question?.id).toMatch(/^drill_/);
    expect(question?.options).toEqual(["der", "die", "den", "dem"]);
  });

  it("canonicalises the correct answer to the exact option text", () => {
    const result = sanitize([
      { ...validQuestion, correct_answer: " DER " },
    ]);

    expect(result.questions[0]?.correctAnswer).toBe("der");
  });

  it("fills missing English fields from Arabic", () => {
    const result = sanitize([
      {
        ...validQuestion,
        hint_en: "",
        translation_en: undefined,
        explanation_en: undefined,
        weak_spot_en: undefined,
      },
    ]);

    const [question] = result.questions;
    expect(question?.hintEn).toBe(validQuestion.hint_ar);
    expect(question?.translationEn).toBe(validQuestion.translation_ar);
    expect(question?.explanationEn).toBe(validQuestion.explanation_ar);
    expect(question?.weakSpotEn).toBe(validQuestion.weak_spot_ar);
  });

  it("rejects questions with duplicate options", () => {
    const result = sanitize([
      {
        ...validQuestion,
        options: ["der", "Der", "den", "dem"],
      },
    ]);

    expect(result.questions).toHaveLength(0);
    expect(result.rejected).toBe(1);
  });

  it("rejects a correct answer that matches no option", () => {
    const result = sanitize([
      { ...validQuestion, correct_answer: "die Frau" },
    ]);

    expect(result.questions).toHaveLength(0);
    expect(result.rejected).toBe(1);
  });

  it("rejects duplicate stems within one batch", () => {
    const result = sanitize([
      validQuestion,
      { ...validQuestion, pattern: "duplicate-stem" },
    ]);

    expect(result.questions).toHaveLength(1);
    expect(result.rejected).toBe(1);
  });

  it("rejects a stem already accepted in an earlier batch", () => {
    const first = sanitize([validQuestion]);
    const second = sanitizeDrillQuestions(
      [{ ...validQuestion, pattern: "replacement-copy" }],
      {
        topic: "cases",
        level: "A2",
        existingPromptKeys: promptKeysFor(first.questions),
      },
    );

    expect(second.questions).toHaveLength(0);
    expect(second.rejected).toBe(1);
  });

  it("rejects questions with no prompt text", () => {
    const result = sanitize([
      { ...validQuestion, prompt_before: "", prompt_after: "" },
    ]);

    expect(result.questions).toHaveLength(0);
    expect(result.rejected).toBe(1);
  });

  it("respects the requested maximum", () => {
    const result = sanitize(
      [
        validQuestion,
        { ...validQuestion, prompt_before: "Wir helfen", pattern: "dative-plural" },
      ],
      1,
    );

    expect(result.questions).toHaveLength(1);
  });
});
