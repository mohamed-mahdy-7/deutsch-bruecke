import { describe, expect, it } from "vitest";
import { DICTATION_CLIPS, dictationClipsForLevel } from "@/data/listening";
import { scoreDictation } from "./dictation";

const clip = DICTATION_CLIPS[0]!;

describe("scoreDictation", () => {
  it("passes a perfect transcript regardless of case and punctuation", () => {
    const result = scoreDictation(clip, "ich moechte einen kaffee und ein wasser bitte");
    expect(result.passed).toBe(true);
    expect(result.accuracy).toBe(100);
    expect(result.correctWords).toBe(result.totalWords);
  });

  it("fails an empty attempt", () => {
    const result = scoreDictation(clip, "   ");
    expect(result.passed).toBe(false);
    expect(result.accuracy).toBe(0);
    expect(result.diff.every((word) => word.status === "missing")).toBe(true);
  });

  it("uses the 80% pass threshold", () => {
    const words = clip.textDe.split(/\s+/);
    const almost = words
      .slice(0, Math.max(1, words.length - 2))
      .join(" ");
    const result = scoreDictation(clip, almost);
    expect(result.accuracy).toBeLessThan(80);
    expect(result.passed).toBe(false);
  });

  it("does not penalise extra words after a complete sentence", () => {
    const result = scoreDictation(clip, `${clip.textDe} danke`);
    expect(result.accuracy).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.diff.some((word) => word.status === "extra")).toBe(true);
  });
});

describe("dictation bank", () => {
  it("offers eight clips per level with unique ids", () => {
    const ids = new Set<string>();
    for (const level of ["A1", "A2", "B1"] as const) {
      const clips = dictationClipsForLevel(level);
      expect(clips).toHaveLength(8);
      for (const item of clips) {
        expect(item.level).toBe(level);
        expect(ids.has(item.id)).toBe(false);
        ids.add(item.id);
        expect(item.textDe.trim().length).toBeGreaterThan(10);
        expect(item.translationAr.trim().length).toBeGreaterThan(5);
      }
    }
    expect(ids.size).toBe(24);
  });
});
