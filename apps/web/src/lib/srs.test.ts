import { describe, expect, it } from "vitest";
import { addDays, addMinutes, endOfDay } from "./dates";
import { dueCards, gradeVocabCard, isCardDue, reviewQueue } from "./srs";
import type { VocabCard } from "@/types/domain";

const NOW = new Date("2026-11-07T10:00:00.000Z");

function makeCard(overrides: Partial<VocabCard> = {}): VocabCard {
  return {
    id: "v-test",
    word: "Kaffee",
    article: "der",
    plural: "die Kaffees",
    translationAr: "قهوة",
    translationEn: "coffee",
    exampleDe: "Der Kaffee ist heiß.",
    exampleAr: "القهوة ساخنة.",
    level: "A1",
    category: "food",
    ease: 2.5,
    intervalDays: 0,
    repetitions: 0,
    dueDate: NOW.toISOString(),
    createdAt: NOW.toISOString(),
    lastReviewedAt: null,
    source: "seed",
    ...overrides,
  };
}

describe("gradeVocabCard", () => {
  it("resets the repetition chain and retries in ten minutes on 'again'", () => {
    const result = gradeVocabCard(
      makeCard({ repetitions: 4, intervalDays: 20, ease: 2.5 }),
      "again",
      NOW,
    );

    expect(result.repetitions).toBe(0);
    expect(result.intervalDays).toBe(0);
    expect(result.ease).toBeCloseTo(1.96, 2);
    expect(result.dueDate).toBe(addMinutes(NOW, 10).toISOString());
    expect(result.lastReviewedAt).toBe(NOW.toISOString());
  });

  it("never lowers ease below 1.3", () => {
    const result = gradeVocabCard(makeCard({ ease: 1.3 }), "again", NOW);
    expect(result.ease).toBe(1.3);
  });

  it("schedules the first successful review for tomorrow by default", () => {
    const good = gradeVocabCard(makeCard(), "good", NOW);
    expect(good.repetitions).toBe(1);
    expect(good.intervalDays).toBe(1);
    expect(good.dueDate).toBe(addDays(NOW, 1).toISOString());
    // "good" is ease-neutral in this scheduler; only easy/hard move ease.
    expect(good.ease).toBe(2.5);

    const hard = gradeVocabCard(makeCard(), "hard", NOW);
    expect(hard.intervalDays).toBe(1);

    const easy = gradeVocabCard(makeCard(), "easy", NOW);
    expect(easy.intervalDays).toBe(3);
  });

  it("spaces the second successful review by quality", () => {
    const base = makeCard({ repetitions: 1, intervalDays: 1, ease: 2.52 });

    expect(gradeVocabCard(base, "hard", NOW).intervalDays).toBe(3);
    expect(gradeVocabCard(base, "good", NOW).intervalDays).toBe(6);
    expect(gradeVocabCard(base, "easy", NOW).intervalDays).toBe(10);
  });

  it("multiplies the previous interval by ease on later reviews", () => {
    const base = makeCard({ repetitions: 2, intervalDays: 6, ease: 2.5 });

    // hard lowers ease to 2.36 first: 6 * max(1.2, 2.36 * 0.8) = 11.33 -> 11.
    expect(gradeVocabCard(base, "hard", NOW).intervalDays).toBe(11);
    expect(gradeVocabCard(base, "good", NOW).intervalDays).toBe(15);
    expect(gradeVocabCard(base, "easy", NOW).intervalDays).toBe(20);
  });

  it("caps runaway intervals at one year", () => {
    const result = gradeVocabCard(
      makeCard({ repetitions: 8, intervalDays: 300, ease: 2.5 }),
      "easy",
      NOW,
    );
    expect(result.intervalDays).toBe(365);
  });

  it("keeps unrelated card fields intact", () => {
    const base = makeCard({ source: "chat", category: "work" });
    const result = gradeVocabCard(base, "good", NOW);
    expect(result.id).toBe(base.id);
    expect(result.word).toBe(base.word);
    expect(result.source).toBe("chat");
    expect(result.category).toBe("work");
    expect(result.createdAt).toBe(base.createdAt);
  });
});

describe("due card helpers", () => {
  it("treats cards due earlier today as due", () => {
    expect(isCardDue(makeCard({ dueDate: NOW.toISOString() }), NOW)).toBe(true);
    expect(
      isCardDue(makeCard({ dueDate: addDays(NOW, -1).toISOString() }), NOW),
    ).toBe(true);
  });

  it("does not treat tomorrow's cards as due", () => {
    const tomorrow = addDays(NOW, 1).toISOString();
    expect(isCardDue(makeCard({ dueDate: tomorrow }), NOW)).toBe(false);
  });

  it("compares against the end of the local day", () => {
    const lateToday = new Date(endOfDay(NOW));
    lateToday.setHours(23, 59, 0, 0);
    expect(isCardDue(makeCard({ dueDate: lateToday.toISOString() }), NOW)).toBe(true);
  });

  it("sorts due cards oldest first and ignores future cards", () => {
    const yesterday = makeCard({ id: "yesterday", dueDate: addDays(NOW, -1).toISOString() });
    const today = makeCard({ id: "today", dueDate: NOW.toISOString() });
    const future = makeCard({ id: "future", dueDate: addDays(NOW, 2).toISOString() });

    expect(dueCards([today, future, yesterday], NOW).map((card) => card.id)).toEqual([
      "yesterday",
      "today",
    ]);
  });

  it("limits the review queue to the requested size", () => {
    const cards = Array.from({ length: 20 }, (_value, index) =>
      makeCard({
        id: `card-${index}`,
        dueDate: addDays(NOW, -index - 1).toISOString(),
      }),
    );

    expect(reviewQueue(cards, 12, NOW)).toHaveLength(12);
    expect(reviewQueue(cards, 0, NOW)).toHaveLength(0);
  });
});
