import { describe, expect, it } from "vitest";
import {
  PRONUNCIATION_PHRASES,
  PRONUNCIATION_SOUNDS,
  pronunciationPhrasesForLevel,
} from "@/data/pronunciation";
import {
  evaluatePronunciation,
  phraseSoundWords,
  wordHasSound,
} from "./pronunciation";

describe("pronunciation bank", () => {
  it("has six phrases per level and eight focus sounds across the bank", () => {
    for (const level of ["A1", "A2", "B1"] as const) {
      expect(pronunciationPhrasesForLevel(level)).toHaveLength(6);
    }
    const soundIds = new Set(
      PRONUNCIATION_PHRASES.flatMap((phrase) => phrase.focus),
    );
    expect(soundIds.size).toBeGreaterThanOrEqual(8);
    for (const id of soundIds) {
      expect(PRONUNCIATION_SOUNDS[id]).toBeDefined();
    }
  });

  it("only focuses on sounds that actually occur in the phrase", () => {
    for (const phrase of PRONUNCIATION_PHRASES) {
      for (const sound of phrase.focus) {
        expect(phraseSoundWords(phrase, sound).length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps ids unique", () => {
    const ids = new Set(PRONUNCIATION_PHRASES.map((phrase) => phrase.id));
    expect(ids.size).toBe(PRONUNCIATION_PHRASES.length);
  });
});

describe("wordHasSound", () => {
  it("handles the sounds Arabic speakers most often confuse", () => {
    expect(wordHasSound("Ich", "ch")).toBe(true);
    expect(wordHasSound("Schuh", "ch")).toBe(false);
    expect(wordHasSound("Schuh", "sch")).toBe(true);
    expect(wordHasSound("Zimmer", "z")).toBe(true);
    expect(wordHasSound("Weber", "w")).toBe(true);
    expect(wordHasSound("Vielen", "v")).toBe(true);
    expect(wordHasSound("sprechen", "sp_st")).toBe(true);
    expect(wordHasSound("Lehrer", "final_er")).toBe(true);
  });
});

describe("evaluatePronunciation", () => {
  const phrase = PRONUNCIATION_PHRASES.find(
    (item) => item.id === "a1-tired",
  )!;

  it("gives full marks for an exact transcript", () => {
    const result = evaluatePronunciation(
      phrase,
      "Ich fühle mich heute müde.",
    );
    expect(result.accuracy).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.sounds.every((sound) => sound.status === "clear")).toBe(true);
  });

  it("accepts umlaut folding when typing the transcript", () => {
    const result = evaluatePronunciation(
      phrase,
      "Ich fuehle mich heute muede.",
    );
    expect(result.wordAccuracy).toBe(100);
    expect(result.passed).toBe(true);
  });

  it("flags an empty attempt without crashing", () => {
    const result = evaluatePronunciation(phrase, "");
    expect(result.accuracy).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.sounds.every((sound) => sound.status === "retry")).toBe(true);
  });

  it("reduces the ü feedback when the ü word is wrong", () => {
    const result = evaluatePronunciation(
      phrase,
      "Ich fuhle mich heute mude.",
    );
    const ue = result.sounds.find((sound) => sound.id === "ue");
    expect(ue?.accuracy).toBe(0);
    expect(ue?.status).toBe("retry");
    expect(result.passed).toBe(false);
  });

  it("includes a short tip for every sound", () => {
    const result = evaluatePronunciation(phrase, "Ich fühle mich heute müde.");
    expect(result.sounds.length).toBeGreaterThan(0);
    for (const sound of result.sounds) {
      expect(sound.tipAr.length).toBeGreaterThan(10);
      expect(sound.tipEn.length).toBeGreaterThan(10);
      expect(sound.words.length).toBeGreaterThan(0);
    }
  });
});
