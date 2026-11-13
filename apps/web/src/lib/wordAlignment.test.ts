import { describe, expect, it } from "vitest";
import {
  alignGermanWords,
  buildFirstLetterHint,
  normalizeGermanWord,
} from "./wordAlignment";

describe("normalizeGermanWord", () => {
  it("folds case, punctuation, and typed umlauts", () => {
    expect(normalizeGermanWord("Grüße,")).toBe("gruesse");
    expect(normalizeGermanWord("GRÜSSE")).toBe("gruesse");
    expect(normalizeGermanWord("schön!")).toBe("schoen");
    expect(normalizeGermanWord("Straße")).toBe("strasse");
  });

  it("accepts ae/oe/ue spellings as equivalent", () => {
    expect(normalizeGermanWord("schön")).toBe(normalizeGermanWord("schoen"));
    expect(normalizeGermanWord("für")).toBe(normalizeGermanWord("fuer"));
  });
});

describe("alignGermanWords", () => {
  it("scores an exact sentence at 100%", () => {
    const result = alignGermanWords(
      "Ich möchte einen Kaffee, bitte.",
      "ich moechte einen kaffee bitte",
    );
    expect(result.accuracy).toBe(100);
    expect(result.correctWords).toBe(5);
    expect(result.totalWords).toBe(5);
    expect(result.diff.every((word) => word.status === "correct")).toBe(true);
  });

  it("marks a misspelled word as wrong", () => {
    const result = alignGermanWords(
      "Der Zug fährt um acht Uhr.",
      "Der Zug fahrt um acht Uhr.",
    );
    expect(result.accuracy).toBe(83);
    expect(result.diff.find((word) => word.status === "wrong")).toMatchObject({
      expected: "fährt",
      actual: "fahrt",
    });
  });

  it("marks missing and extra words", () => {
    const result = alignGermanWords(
      "Ich habe einen Termin.",
      "Ich habe heute einen Termin beim Arzt.",
    );
    expect(result.diff.filter((word) => word.status === "missing")).toEqual([]);
    expect(result.diff.filter((word) => word.status === "extra")).toHaveLength(3);
    expect(result.accuracy).toBe(100);
  });

  it("reports a shortened sentence as missing words", () => {
    const result = alignGermanWords(
      "Wir fahren am Wochenende an den See.",
      "Wir fahren am Wochenende.",
    );
    expect(result.accuracy).toBe(57);
    expect(
      result.diff.filter((word) => word.status === "missing").map((word) => word.expected),
    ).toEqual(["an", "den", "See."]);
  });

  it("returns zero for an empty expected sentence", () => {
    const result = alignGermanWords("", "irgendetwas");
    expect(result).toMatchObject({
      accuracy: 0,
      correctWords: 0,
      totalWords: 0,
    });
  });
});

describe("buildFirstLetterHint", () => {
  it("reveals only the first letter of each word", () => {
    expect(buildFirstLetterHint("Der Zug fährt um acht Uhr.")).toBe(
      "D·· Z·· f···· u· a··· U··",
    );
  });

  it("handles punctuation-only tokens safely", () => {
    expect(buildFirstLetterHint("Hallo — Welt!")).toBe("H···· W···");
  });
});
