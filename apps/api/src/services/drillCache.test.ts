import { afterEach, describe, expect, it, vi } from "vitest";
import type { DrillResponse, DrillWeakSpot } from "../schemas.js";
import {
  buildDrillCacheKey,
  DrillCache,
  normalizeDrillWeakSpots,
} from "./drillCache.js";

const drillResponse: DrillResponse = {
  fallbackCount: 0,
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
};

const weakSpots: DrillWeakSpot[] = [
  { pattern: "Dative-Article", count: 2 },
  { pattern: "weil verb final", count: 3 },
];

describe("drill cache keys", () => {
  it("normalises weak-spot order, case, spacing and labels", () => {
    const reordered: DrillWeakSpot[] = [
      { pattern: "weil-verb-final", count: 3, labelAr: "آخر الجملة" },
      { pattern: "dative article", count: 2, labelEn: "Dative" },
    ];
    expect(buildDrillCacheKey({ topic: "cases", level: "A2", weakSpots })).toBe(
      buildDrillCacheKey({
        topic: "cases",
        level: "A2",
        weakSpots: reordered,
      }),
    );
  });

  it("separates topics, levels and counts", () => {
    const base = buildDrillCacheKey({
      topic: "cases",
      level: "A2",
      weakSpots,
    });
    expect(
      buildDrillCacheKey({ topic: "articles", level: "A2", weakSpots }),
    ).not.toBe(base);
    expect(
      buildDrillCacheKey({ topic: "cases", level: "B1", weakSpots }),
    ).not.toBe(base);
    expect(
      buildDrillCacheKey({
        topic: "cases",
        level: "A2",
        weakSpots: [{ pattern: "dative-article", count: 99 }],
      }),
    ).not.toBe(base);
  });

  it("uses a stable empty marker", () => {
    expect(
      buildDrillCacheKey({ topic: "plurals", level: "A1", weakSpots: [] }),
    ).toBe("plurals|A1|none");
  });
});

describe("normalizeDrillWeakSpots", () => {
  it("merges duplicate patterns and caps counts", () => {
    const normalized = normalizeDrillWeakSpots([
      { pattern: "dative article", count: 700 },
      { pattern: "Dative-Article", count: 400 },
      { pattern: "  ", count: 1 },
    ]);

    expect(normalized).toEqual([
      { pattern: "dative-article", count: 999 },
    ]);
  });
});

describe("DrillCache", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reuses a stored value without calling the factory again", async () => {
    const cache = new DrillCache();
    let calls = 0;
    const factory = async () => {
      calls += 1;
      return drillResponse;
    };

    const first = await cache.getOrCreate("key", factory);
    const second = await cache.getOrCreate("key", factory);

    expect(calls).toBe(1);
    expect(first.cached).toBe(false);
    expect(second).toMatchObject({ cached: true, value: drillResponse });
  });

  it("deduplicates concurrent identical requests", async () => {
    const cache = new DrillCache();
    let calls = 0;
    let release!: () => void;
    const factory = async () => {
      calls += 1;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return drillResponse;
    };

    const first = cache.getOrCreate("key", factory);
    const second = cache.getOrCreate("key", factory);
    await vi.waitFor(() => expect(calls).toBe(1));

    release();
    const [a, b] = await Promise.all([first, second]);

    expect(calls).toBe(1);
    expect(a.value).toEqual(drillResponse);
    expect(b.cached).toBe(true);
  });

  it("bypasses a completed entry when refreshing", async () => {
    const cache = new DrillCache();
    let calls = 0;
    const factory = async () => {
      calls += 1;
      return drillResponse;
    };

    await cache.getOrCreate("key", factory);
    const refreshed = await cache.getOrCreate("key", factory, true);

    expect(calls).toBe(2);
    expect(refreshed.cached).toBe(false);
  });

  it("expires entries after the TTL", async () => {
    vi.useFakeTimers();
    const cache = new DrillCache(1_000);
    let calls = 0;
    const factory = async () => {
      calls += 1;
      return drillResponse;
    };

    await cache.getOrCreate("key", factory);
    vi.advanceTimersByTime(1_001);
    await cache.getOrCreate("key", factory);

    expect(calls).toBe(2);
  });

  it("clears stored and in-flight entries", () => {
    const cache = new DrillCache();
    cache.set("key", drillResponse);
    expect(cache.size).toBe(1);
    expect(cache.get("key")).toBe(drillResponse);
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get("key")).toBeNull();
  });
});
