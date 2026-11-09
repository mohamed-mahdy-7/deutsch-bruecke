import { afterEach, describe, expect, it, vi } from "vitest";
import type { CustomScenario } from "../schemas.js";
import {
  buildScenarioCacheKey,
  normalizeScenarioIdea,
  ScenarioCache,
} from "./scenarioCache.js";

const scenario: CustomScenario = {
  title_de: "Zimmer im Hotel buchen",
  title_ar: "حجز غرفة في فندق",
  emoji: "🏨",
  setting_ar: "مكتب استقبال في فندق صغير.",
  ai_role_de: "freundliche Rezeptionistin",
  learner_role_ar: "ضيف عايز يحجز غرفة",
  goal_ar: "احجز غرفة واسأل عن السعر.",
  level: "A1",
  formality: "Sie",
  tone: "friendly",
  grammar_focus: ["Höflichkeitsform Sie"],
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

describe("scenario cache keys", () => {
  it("normalises case, punctuation, spacing and Arabic diacritics", () => {
    expect(normalizeScenarioIdea("  حَجْز   غرفة!! ")).toBe("حجز غرفة");
    expect(normalizeScenarioIdea("Hotel, Zimmer... bitte")).toBe(
      "hotel zimmer bitte",
    );
  });

  it("includes level, formality and tone in the key", () => {
    const base = {
      idea: "حجز غرفة في فندق",
      level: "A1",
      formality: "Sie",
      tone: "friendly",
    };
    expect(buildScenarioCacheKey(base)).not.toBe(
      buildScenarioCacheKey({ ...base, tone: "strict" }),
    );
    expect(buildScenarioCacheKey(base)).not.toBe(
      buildScenarioCacheKey({ ...base, level: "A2" }),
    );
    expect(buildScenarioCacheKey(base)).toBe(
      buildScenarioCacheKey({
        ...base,
        idea: "حَجْز غرفة، في فندق!",
      }),
    );
  });
});

describe("ScenarioCache", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reuses a stored value without calling the factory again", async () => {
    const cache = new ScenarioCache();
    let calls = 0;
    const factory = async () => {
      calls += 1;
      return scenario;
    };

    const first = await cache.getOrCreate("key", factory);
    const second = await cache.getOrCreate("key", factory);

    expect(calls).toBe(1);
    expect(first.cached).toBe(false);
    expect(second).toMatchObject({ cached: true, value: scenario });
  });

  it("deduplicates concurrent identical requests", async () => {
    const cache = new ScenarioCache();
    let calls = 0;
    let release!: () => void;
    const factory = async () => {
      calls += 1;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return scenario;
    };

    const first = cache.getOrCreate("key", factory);
    const second = cache.getOrCreate("key", factory);
    await vi.waitFor(() => expect(calls).toBe(1));

    release();
    const [a, b] = await Promise.all([first, second]);

    expect(calls).toBe(1);
    expect(a.value).toEqual(scenario);
    expect(b.value).toEqual(scenario);
    expect(b.cached).toBe(true);
  });

  it("bypasses a completed entry when refreshing but joins an in-flight call", async () => {
    const cache = new ScenarioCache();
    let calls = 0;
    const factory = async () => {
      calls += 1;
      return scenario;
    };

    await cache.getOrCreate("key", factory);
    const refreshed = await cache.getOrCreate("key", factory, true);

    expect(calls).toBe(2);
    expect(refreshed.cached).toBe(false);
  });

  it("expires entries after the TTL", async () => {
    vi.useFakeTimers();
    const cache = new ScenarioCache(1_000);
    let calls = 0;
    const factory = async () => {
      calls += 1;
      return scenario;
    };

    await cache.getOrCreate("key", factory);
    vi.advanceTimersByTime(1_001);
    await cache.getOrCreate("key", factory);

    expect(calls).toBe(2);
  });

  it("clears stored and in-flight entries", () => {
    const cache = new ScenarioCache();
    cache.set("key", scenario);
    expect(cache.size).toBe(1);
    expect(cache.get("key")).toBe(scenario);
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get("key")).toBeNull();
  });
});
