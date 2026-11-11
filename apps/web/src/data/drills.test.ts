import { describe, expect, it } from "vitest";
import type { DrillTopic } from "@/types/domain";
import {
  ARTICLE_CASE_QUESTIONS,
  DRILL_QUESTIONS,
  PREPOSITION_QUESTIONS,
  STATIC_DRILL_BANKS,
  staticDrillBank,
} from "./drills";

const AI_ONLY_TOPICS: DrillTopic[] = [
  "verb_position",
  "separable_verbs",
  "subordinate_clauses",
  "plurals",
];

describe("static drill banks", () => {
  it("keeps the original article, case and preposition pools available", () => {
    expect(
      DRILL_QUESTIONS.filter((question) => question.topic === "articles"),
    ).toHaveLength(12);
    expect(
      DRILL_QUESTIONS.filter((question) => question.topic === "cases"),
    ).toHaveLength(18);
    expect(PREPOSITION_QUESTIONS).toHaveLength(10);
    expect(ARTICLE_CASE_QUESTIONS).toHaveLength(30);
  });

  it("groups the offline pools by practice topic", () => {
    expect(staticDrillBank("articles")).toHaveLength(12);
    expect(staticDrillBank("cases")).toHaveLength(18);
    expect(staticDrillBank("prepositions")).toHaveLength(10);
    expect(STATIC_DRILL_BANKS.articles).toBe(staticDrillBank("articles"));
    expect(STATIC_DRILL_BANKS.cases).toBe(staticDrillBank("cases"));
    expect(STATIC_DRILL_BANKS.prepositions).toBe(staticDrillBank("prepositions"));
  });

  it("returns an empty pool for AI-only topics instead of crashing", () => {
    for (const topic of AI_ONLY_TOPICS) {
      expect(staticDrillBank(topic)).toEqual([]);
      expect(STATIC_DRILL_BANKS[topic]).toBeUndefined();
    }
  });

  it("keeps every offline question valid and uniquely identifiable", () => {
    const ids = new Set<string>();

    for (const question of DRILL_QUESTIONS) {
      expect(ids.has(question.id)).toBe(false);
      ids.add(question.id);

      expect(question.options).toHaveLength(4);
      expect(new Set(question.options).size).toBe(4);
      expect(question.options).toContain(question.correctAnswer);
      expect(
        question.options.filter((option) => option === question.correctAnswer),
      ).toHaveLength(1);
      expect(
        question.promptBefore.length + question.promptAfter.length,
      ).toBeGreaterThan(0);
      expect(question.hintAr.length).toBeGreaterThan(0);
      expect(question.explanationAr.length).toBeGreaterThan(0);
    }
  });
});
