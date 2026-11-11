import { describe, expect, it } from "vitest";
import type { DrillAiQuestion } from "@/services/ai";
import type { DrillTopic, GrammarTopic } from "@/types/domain";
import {
  DRILL_TOPIC_GRAMMAR_TOPIC,
  toDrillQuestion,
  toDrillQuestions,
  weakSpotsForTopic,
} from "./drillMapping";

const aiQuestion: DrillAiQuestion = {
  id: "drill_123",
  topic: "subordinate_clauses",
  grammarTopic: "word_order",
  pattern: "weil-verb-final",
  level: "A2",
  promptBefore: "Ich bleibe zu Hause,",
  promptAfter: ".",
  hintAr: "الفعل بيروح الآخر.",
  hintEn: "The verb moves to the end.",
  options: [
    "weil ich krank bin",
    "weil ich bin krank",
    "weil bin ich krank",
    "ich weil krank bin",
  ],
  correctAnswer: "weil ich krank bin",
  translationAr: "أنا قاعد في البيت لأني عيان.",
  translationEn: "I am staying at home because I am ill.",
  explanationAr: "بعد «weil» الفعل في الآخر.",
  explanationEn: "After “weil”, the verb goes last.",
  weakSpotAr: "الفعل في آخر الجملة الفرعية",
  weakSpotEn: "Verb-final subordinate clause",
};

describe("toDrillQuestion", () => {
  it("keeps the practice topic for display and the grammar topic for storage", () => {
    const mapped = toDrillQuestion(aiQuestion);

    expect(mapped).toMatchObject({
      id: "drill_123",
      topic: "word_order",
      drillTopic: "subordinate_clauses",
      pattern: "weil-verb-final",
      level: "A2",
      correctAnswer: "weil ich krank bin",
      weakSpotEn: "Verb-final subordinate clause",
    });
    expect(mapped.options).toHaveLength(4);
    expect(mapped.promptBefore).toBe("Ich bleibe zu Hause,");
    expect(mapped.explanationEn).toBe("After “weil”, the verb goes last.");
  });

  it("maps a batch without dropping or reordering questions", () => {
    const second: DrillAiQuestion = {
      ...aiQuestion,
      id: "drill_456",
      topic: "plurals",
      grammarTopic: "articles",
      pattern: "plural-er",
      promptBefore: "Zwei",
      promptAfter: " spielen im Garten.",
      correctAnswer: "Kinder",
      options: ["Kinder", "Kinds", "Kindern", "Kinde"],
    };

    const mapped = toDrillQuestions([aiQuestion, second]);

    expect(mapped.map((question) => question.id)).toEqual([
      "drill_123",
      "drill_456",
    ]);
    expect(mapped[1]?.drillTopic).toBe("plurals");
    expect(mapped[1]?.topic).toBe("articles");
  });
});

describe("DRILL_TOPIC_GRAMMAR_TOPIC", () => {
  it("covers all seven practice topics inside the five persisted buckets", () => {
    const topics: DrillTopic[] = [
      "articles",
      "cases",
      "prepositions",
      "verb_position",
      "separable_verbs",
      "subordinate_clauses",
      "plurals",
    ];
    const allowed = new Set([
      "articles",
      "cases",
      "word_order",
      "vocabulary",
      "prepositions",
    ]);

    for (const topic of topics) {
      expect(allowed.has(DRILL_TOPIC_GRAMMAR_TOPIC[topic])).toBe(true);
    }

    expect(new Set(Object.values(DRILL_TOPIC_GRAMMAR_TOPIC))).toEqual(
      new Set(["articles", "cases", "prepositions", "word_order"]),
    );
  });

  it("keeps the word-order categories in the existing word_order bucket", () => {
    expect(DRILL_TOPIC_GRAMMAR_TOPIC.verb_position).toBe("word_order");
    expect(DRILL_TOPIC_GRAMMAR_TOPIC.separable_verbs).toBe("word_order");
    expect(DRILL_TOPIC_GRAMMAR_TOPIC.subordinate_clauses).toBe("word_order");
    expect(DRILL_TOPIC_GRAMMAR_TOPIC.plurals).toBe("articles");
  });
});

describe("weakSpotsForTopic", () => {
  const spots: Array<{ id: string; topic: GrammarTopic }> = [
    { id: "a", topic: "articles" },
    { id: "c", topic: "cases" },
    { id: "p", topic: "prepositions" },
    { id: "w", topic: "word_order" },
    { id: "v", topic: "vocabulary" },
  ];

  it("keeps only patterns from the session's persisted bucket", () => {
    expect(weakSpotsForTopic("articles", spots).map((spot) => spot.id)).toEqual([
      "a",
    ]);
    expect(weakSpotsForTopic("cases", spots).map((spot) => spot.id)).toEqual([
      "c",
    ]);
    expect(
      weakSpotsForTopic("prepositions", spots).map((spot) => spot.id),
    ).toEqual(["p"]);
  });

  it("groups all word-order drills into the word_order bucket", () => {
    for (const topic of [
      "verb_position",
      "separable_verbs",
      "subordinate_clauses",
    ] as const) {
      expect(weakSpotsForTopic(topic, spots).map((spot) => spot.id)).toEqual([
        "w",
      ]);
    }
  });

  it("uses articles for plural drills and ignores unrelated buckets", () => {
    expect(weakSpotsForTopic("plurals", spots).map((spot) => spot.id)).toEqual([
      "a",
    ]);
    expect(weakSpotsForTopic("articles", spots).map((spot) => spot.id)).not.toContain(
      "v",
    );
  });
});
