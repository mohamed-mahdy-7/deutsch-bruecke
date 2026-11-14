import { describe, expect, it } from "vitest";
import { createDefaultProgress } from "./progressFactory";
import { mergeProgress } from "./mergeProgress";
import { addWeakSpotToState } from "./progressMutations";

describe("mergeProgress", () => {
  it("unions weak spots and keeps the highest count", () => {
    const remote = createDefaultProgress("user-1");
    const local = createDefaultProgress("user-1");

    const remoteSpot = addWeakSpotToState(remote, {
      topic: "articles",
      pattern: "der/die/das",
      labelAr: "أدوات",
      labelEn: "Articles",
    }, new Date("2026-01-01"));

    // bump count by adding again
    const remoteSpot2 = addWeakSpotToState(remoteSpot, {
      topic: "articles",
      pattern: "der/die/das",
      labelAr: "أدوات",
      labelEn: "Articles",
    }, new Date("2026-01-02"));

    const localSpot = addWeakSpotToState(local, {
      topic: "articles",
      pattern: "der/die/das",
      labelAr: "أدوات",
      labelEn: "Articles",
    }, new Date("2026-01-03"));

    const merged = mergeProgress(remoteSpot2, localSpot);
    const spot = merged.weakSpots.find((item) => item.pattern === "der/die/das");
    expect(spot).toBeDefined();
    expect(spot?.count).toBeGreaterThanOrEqual(2);
  });

  it("keeps the newer vocab card review", () => {
    const remote = createDefaultProgress("user-1");
    const local = createDefaultProgress("user-1");

    const remoteCard = { ...remote.vocabCards[0]!, lastReviewedAt: "2026-01-01T00:00:00.000Z" };
    const localCard = { ...local.vocabCards[0]!, lastReviewedAt: "2026-01-05T00:00:00.000Z" };

    remote.vocabCards = [remoteCard];
    local.vocabCards = [localCard];

    const merged = mergeProgress(remote, local);
    expect(merged.vocabCards[0]?.lastReviewedAt).toBe("2026-01-05T00:00:00.000Z");
  });
});