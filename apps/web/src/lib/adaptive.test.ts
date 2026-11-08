import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildWeakSpotKey,
  selectAdaptiveQuestions,
  sortWeakSpots,
  topicAccuracy,
} from "./adaptive";
import type { DrillQuestion, GrammarTopic, WeakSpot } from "@/types/domain";

function makeQuestion(
  id: string,
  topic: GrammarTopic,
  pattern: string,
): DrillQuestion {
  return {
    id,
    topic: topic as DrillQuestion["topic"],
    pattern,
    level: "A1",
    promptBefore: "Ich trinke",
    promptAfter: "Kaffee.",
    hintAr: "اختر أداة التعريف",
    hintEn: "Choose the article",
    options: ["der", "die", "das"],
    correctAnswer: "der",
    translationAr: "أشرب القهوة.",
    translationEn: "I drink coffee.",
    explanationAr: "Kaffee مذكر.",
    explanationEn: "Kaffee is masculine.",
    weakSpotAr: "أدوات التعريف",
    weakSpotEn: "Definite articles",
  };
}

function makeWeakSpot(
  topic: GrammarTopic,
  pattern: string,
  count: number,
  lastSeen = "2026-11-01T10:00:00.000Z",
): WeakSpot {
  return {
    id: `weak-${pattern}`,
    topic,
    pattern,
    labelAr: "نقطة ضعف",
    labelEn: "Weak spot",
    count,
    lastSeen,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("selectAdaptiveQuestions", () => {
  it("returns an empty list for an empty bank or non-positive count", () => {
    expect(selectAdaptiveQuestions([], [], 5)).toEqual([]);
    expect(
      selectAdaptiveQuestions([makeQuestion("q1", "articles", "p1")], [], 0),
    ).toEqual([]);
  });

  it("returns every question once when the count exceeds the bank", () => {
    const bank = [
      makeQuestion("q1", "articles", "p1"),
      makeQuestion("q2", "cases", "p2"),
      makeQuestion("q3", "prepositions", "p3"),
    ];

    const selected = selectAdaptiveQuestions(bank, [], 10);
    expect(selected).toHaveLength(3);
    expect(new Set(selected.map((question) => question.id)).size).toBe(3);
  });

  it("favours questions whose pattern is a known weak spot", () => {
    // Math.random near 1 makes Fisher-Yates a no-op and places the random
    // target at the end, where the heavily weighted weak-pattern question sits.
    vi.spyOn(Math, "random").mockReturnValue(0.999999);

    const weak = makeQuestion("weak", "articles", "der-die");
    const other1 = makeQuestion("other-1", "articles", "ein-eine");
    const other2 = makeQuestion("other-2", "cases", "nominative");

    const selected = selectAdaptiveQuestions(
      [other1, other2, weak],
      [makeWeakSpot("articles", "der-die", 10)],
      1,
    );

    expect(selected[0]?.id).toBe("weak");
  });

  it("never returns duplicate questions", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.42);
    const bank = Array.from({ length: 6 }, (_value, index) =>
      makeQuestion(`q${index}`, "articles", index % 2 === 0 ? "der-die" : "ein-eine"),
    );

    const selected = selectAdaptiveQuestions(
      bank,
      [makeWeakSpot("articles", "der-die", 4)],
      4,
    );
    expect(selected).toHaveLength(4);
    expect(new Set(selected.map((question) => question.id)).size).toBe(4);
  });
});

describe("weak-spot helpers", () => {
  it("builds a stable composite key", () => {
    expect(buildWeakSpotKey("articles", "der-die")).toBe("articles::der-die");
  });

  it("sorts by count first and recency second", () => {
    const spots = [
      makeWeakSpot("articles", "low", 1, "2026-11-05T10:00:00.000Z"),
      makeWeakSpot("cases", "high-old", 5, "2026-11-01T10:00:00.000Z"),
      makeWeakSpot("cases", "high-new", 5, "2026-11-06T10:00:00.000Z"),
    ];

    expect(sortWeakSpots(spots).map((spot) => spot.pattern)).toEqual([
      "high-new",
      "high-old",
      "low",
    ]);
  });

  it("computes per-topic accuracy and omits untouched topics", () => {
    const accuracy = topicAccuracy([
      { topic: "articles", correct: true },
      { topic: "articles", correct: false },
      { topic: "articles", correct: true },
      { topic: "cases", correct: false },
    ]);

    expect(accuracy.articles).toEqual({ attempts: 3, correct: 2, percent: 67 });
    expect(accuracy.cases).toEqual({ attempts: 1, correct: 0, percent: 0 });
    expect(accuracy.prepositions).toBeUndefined();
    expect(topicAccuracy([])).toEqual({});
  });
});
