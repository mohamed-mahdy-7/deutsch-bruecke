import { describe, expect, it } from "vitest";
import {
  chatRequestSchema,
  customScenarioSchema,
  drillBatchModelSchema,
  drillRequestSchema,
  drillResponseSchema,
  scenarioModelResponseSchema,
  scenarioRequestSchema,
} from "./schemas.js";

const draft = {
  title_de: "Zimmer im Hotel buchen",
  title_ar: "حجز غرفة في فندق",
  emoji: "🏨",
  setting_ar: "مكتب استقبال في فندق صغير في برلين.",
  ai_role_de: "freundliche Rezeptionistin",
  learner_role_ar: "ضيف عايز يحجز غرفة",
  goal_ar: "احجز غرفة واسأل عن السعر.",
  level: "A2",
  formality: "Sie",
  grammar_focus: ["Höflichkeitsform Sie", "Akkusativ"],
  key_vocab: [
    { de: "Zimmer", article: "das", plural: "die Zimmer", ar: "غرفة" },
    { de: "Nacht", article: "die", plural: "die Nächte", ar: "ليلة" },
  ],
  useful_phrases: [
    { de: "Ich möchte ein Zimmer reservieren.", ar: "عايز أحجز غرفة." },
  ],
  opening_message_de: "Guten Tag! Möchten Sie ein Zimmer reservieren?",
  opening_message_ar: "نهارك سعيد! تحب تحجز غرفة؟",
};

describe("scenarioRequestSchema", () => {
  it("accepts Arabic, Egyptian dialect and German ideas", () => {
    for (const idea of [
      "عايز أتدرب على حجز غرفة في فندق",
      "Ich möchte ein Zimmer im Hotel buchen",
      "عايز أتدرب على Hotel buchen مع موظف الاستقبال",
    ]) {
      expect(scenarioRequestSchema.parse({ idea }).idea).toBe(idea);
    }
  });

  it("applies tone and regeneration defaults", () => {
    const parsed = scenarioRequestSchema.parse({ idea: "حجز فندق" });
    expect(parsed.tone).toBe("friendly");
    expect(parsed.forceRegenerate).toBe(false);
    expect(parsed.level).toBeUndefined();
    expect(parsed.formality).toBeUndefined();
  });

  it("accepts explicit level, formality and tone", () => {
    const parsed = scenarioRequestSchema.parse({
      idea: "Termin beim Arzt",
      level: "B1",
      formality: "du",
      tone: "strict",
      forceRegenerate: true,
    });
    expect(parsed).toMatchObject({
      level: "B1",
      formality: "du",
      tone: "strict",
      forceRegenerate: true,
    });
  });

  it("rejects empty, letterless, too short and too long ideas", () => {
    expect(() => scenarioRequestSchema.parse({ idea: "  " })).toThrow();
    expect(() => scenarioRequestSchema.parse({ idea: "!!!" })).toThrow();
    expect(() => scenarioRequestSchema.parse({ idea: "ab" })).toThrow();
    expect(() =>
      scenarioRequestSchema.parse({ idea: "a".repeat(501) }),
    ).toThrow();
  });

  it("rejects unknown levels and tones", () => {
    expect(() =>
      scenarioRequestSchema.parse({ idea: "حجز فندق", level: "C1" }),
    ).toThrow();
    expect(() =>
      scenarioRequestSchema.parse({ idea: "حجز فندق", tone: "rude" }),
    ).toThrow();
  });
});

describe("scenarioModelResponseSchema", () => {
  it("accepts a complete draft", () => {
    expect(scenarioModelResponseSchema.parse(draft)).toMatchObject({
      title_de: "Zimmer im Hotel buchen",
      level: "A2",
      formality: "Sie",
    });
  });

  it("accepts the refusal shape", () => {
    expect(
      scenarioModelResponseSchema.parse({
        refused_ar: "الفكرة دي مش مناسبة، جرّب موقف تاني.",
      }),
    ).toEqual({ refused_ar: "الفكرة دي مش مناسبة، جرّب موقف تاني." });
  });

  it("rejects a draft with fewer than two vocabulary items", () => {
    expect(() =>
      scenarioModelResponseSchema.parse({
        ...draft,
        key_vocab: [draft.key_vocab[0]],
      }),
    ).toThrow();
  });

  it("rejects invented articles", () => {
    expect(() =>
      scenarioModelResponseSchema.parse({
        ...draft,
        key_vocab: [
          { de: "Zimmer", article: "le", plural: "die Zimmer", ar: "غرفة" },
          { de: "Nacht", article: "die", plural: "die Nächte", ar: "ليلة" },
        ],
      }),
    ).toThrow();
  });
});

describe("customScenarioSchema", () => {
  it("requires exactly one learner tone", () => {
    expect(
      customScenarioSchema.parse({ ...draft, tone: "friendly" }).tone,
    ).toBe("friendly");
    expect(() => customScenarioSchema.parse(draft)).toThrow();
    expect(() =>
      customScenarioSchema.parse({ ...draft, tone: "sarcastic" }),
    ).toThrow();
  });
});

describe("chatRequestSchema custom scenarios", () => {
  it("accepts a validated custom scenario with a custom id", () => {
    const parsed = chatRequestSchema.parse({
      scenarioId: "custom_hotel",
      level: "A2",
      learnerMessage: "Ich möchte ein Zimmer.",
      customScenario: { ...draft, tone: "friendly" },
    });
    expect(parsed.customScenario?.title_de).toBe("Zimmer im Hotel buchen");
  });

  it("rejects custom scenario fields that exceed the shared limits", () => {
    expect(() =>
      chatRequestSchema.parse({
        scenarioId: "custom_hotel",
        level: "A2",
        learnerMessage: "Hallo",
        customScenario: {
          ...draft,
          tone: "friendly",
          key_vocab: [
            { de: "Zimmer", article: "das", plural: "die Zimmer", ar: "غرفة" },
            { de: "Nacht", article: "die", plural: "die Nächte", ar: "ليلة" },
            { de: "Preis", article: "der", plural: "die Preise", ar: "سعر" },
            { de: "Bett", article: "das", plural: "die Betten", ar: "سرير" },
            { de: "Bad", article: "das", plural: "die Bäder", ar: "حمام" },
            { de: "Gast", article: "der", plural: "die Gäste", ar: "ضيف" },
            { de: "Tag", article: "der", plural: "die Tage", ar: "يوم" },
            { de: "Nacht", article: "die", plural: "die Nächte", ar: "ليلة" },
            { de: "Preis", article: "der", plural: "die Preise", ar: "سعر" },
          ],
        },
      }),
    ).toThrow();
  });
});

const drillQuestion = {
  pattern: "dative-article-feminine",
  prompt_before: "Ich helfe",
  prompt_after: "Frau.",
  hint_ar: "الفعل ده بياخد Dativ.",
  options: ["der", "die", "den", "dem"],
  correct_answer: "der",
  translation_ar: "أنا بساعد الست.",
  explanation_ar: "«helfen» + Dativ، والمؤنّث بيبقى «der».",
  weak_spot_ar: "Dativ للمؤنّث",
};

describe("drillRequestSchema", () => {
  it("accepts every practice topic and applies safe defaults", () => {
    const parsed = drillRequestSchema.parse({
      topic: "subordinate_clauses",
      level: "B1",
    });

    expect(parsed).toMatchObject({
      topic: "subordinate_clauses",
      level: "B1",
      weakSpots: [],
      forceRegenerate: false,
    });
  });

  it("accepts weak spots with optional labels", () => {
    const parsed = drillRequestSchema.parse({
      topic: "cases",
      level: "A2",
      weakSpots: [
        { pattern: "dative-article", count: 3, labelAr: "Dativ" },
      ],
    });

    expect(parsed.weakSpots[0]).toMatchObject({
      pattern: "dative-article",
      count: 3,
      labelAr: "Dativ",
    });
  });

  it("rejects unknown topics and invalid levels", () => {
    expect(() =>
      drillRequestSchema.parse({ topic: "vocabulary", level: "A2" }),
    ).toThrow();
    expect(() =>
      drillRequestSchema.parse({ topic: "cases", level: "C1" }),
    ).toThrow();
  });

  it("caps the weak-spot payload at twenty entries", () => {
    expect(() =>
      drillRequestSchema.parse({
        topic: "cases",
        level: "A2",
        weakSpots: Array.from({ length: 21 }, (_, index) => ({
          pattern: `pattern-${index}`,
          count: 1,
        })),
      }),
    ).toThrow();
  });
});

describe("drillBatchModelSchema", () => {
  it("accepts four distinct options and missing English fields", () => {
    const parsed = drillBatchModelSchema.parse({
      questions: [drillQuestion],
    });

    expect(parsed.questions[0]).toMatchObject({
      pattern: "dative-article-feminine",
      options: ["der", "die", "den", "dem"],
      correct_answer: "der",
    });
    expect(parsed.questions[0]?.hint_en).toBeUndefined();
  });

  it("rejects batches with the wrong option count", () => {
    expect(() =>
      drillBatchModelSchema.parse({
        questions: [{ ...drillQuestion, options: ["der", "die", "den"] }],
      }),
    ).toThrow();
    expect(() =>
      drillBatchModelSchema.parse({
        questions: [
          { ...drillQuestion, options: ["der", "die", "den", "dem", "des"] },
        ],
      }),
    ).toThrow();
  });

  it("rejects empty batches", () => {
    expect(() =>
      drillBatchModelSchema.parse({ questions: [] }),
    ).toThrow();
  });
});

describe("drillResponseSchema", () => {
  it("accepts the public camelCase shape", () => {
    const parsed = drillResponseSchema.parse({
      fallbackCount: 2,
      questions: [
        {
          id: "drill_1",
          topic: "cases",
          grammarTopic: "cases",
          pattern: "dative-article",
          level: "A2",
          promptBefore: "Ich helfe",
          promptAfter: "Frau.",
          hintAr: "تلميح",
          hintEn: "Hint",
          options: ["der", "die", "den", "dem"],
          correctAnswer: "der",
          translationAr: "أنا بساعد الست.",
          translationEn: "I help the woman.",
          explanationAr: "شرح",
          explanationEn: "Explanation",
          weakSpotAr: "Dativ",
          weakSpotEn: "Dative",
        },
      ],
    });

    expect(parsed.questions[0]?.grammarTopic).toBe("cases");
  });

  it("rejects an invalid practice topic", () => {
    expect(() =>
      drillResponseSchema.parse({ questions: [], fallbackCount: 0 }),
    ).toThrow();
  });
});
