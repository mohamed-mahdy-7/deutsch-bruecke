import { describe, expect, it } from "vitest";
import { classifyGermanWord, segmentGermanText } from "./german";

function classesFor(text: string): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};
  for (const segment of segmentGermanText(text)) {
    if (segment.isWord) result[segment.value] = segment.className;
  }
  return result;
}

describe("segmentGermanText", () => {
  it("preserves the original text exactly when segments are joined", () => {
    const text = "Der Kaffee ist heiß, und die Wohnung ist frei.";
    expect(segmentGermanText(text).map((segment) => segment.value).join("")).toBe(text);
  });

  it("marks words and leaves punctuation and whitespace alone", () => {
    const segments = segmentGermanText("Das Brot ist frisch.");
    expect(segments.map((segment) => segment.isWord)).toEqual([
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
    ]);
    expect(segments.filter((segment) => segment.isWord).map((segment) => segment.value)).toEqual([
      "Das",
      "Brot",
      "ist",
      "frisch",
    ]);
  });

  it("colours definite articles by the gender of the following noun", () => {
    expect(classesFor("Der Kaffee ist heiß.")).toMatchObject({
      Der: "grammar-der",
      Kaffee: undefined,
      ist: "grammar-verb",
    });
    expect(classesFor("Die Wohnung ist frei.")).toMatchObject({
      Die: "grammar-die",
      Wohnung: undefined,
    });
    expect(classesFor("Das Brot ist frisch.")).toMatchObject({
      Das: "grammar-das",
      Brot: undefined,
    });
  });

  it("colours indefinite articles only when the noun gender is known", () => {
    expect(classesFor("Ich trinke einen Kaffee.")).toMatchObject({
      trinke: "grammar-verb",
      einen: "grammar-der",
      Kaffee: undefined,
    });

    expect(classesFor("Ich habe eine Frage.")).toMatchObject({
      eine: "grammar-die",
    });
  });

  it("keeps hyphenated and apostrophe names as single words", () => {
    const text = "Ich heiße Müller-Lüdenscheidt und das ist Sarah's Kaffee.";
    const words = segmentGermanText(text)
      .filter((segment) => segment.isWord)
      .map((segment) => segment.value);

    expect(words).toContain("Müller-Lüdenscheidt");
    expect(words).toContain("Sarah's");
    expect(segmentGermanText(text).map((segment) => segment.value).join("")).toBe(text);
  });
});

describe("classifyGermanWord", () => {
  it("falls back to the article shape when the noun is unknown", () => {
    expect(classifyGermanWord("der", "Xylophon")).toBe("grammar-der");
    expect(classifyGermanWord("die", "Xylophon")).toBe("grammar-die");
    expect(classifyGermanWord("das", "Xylophon")).toBe("grammar-das");
  });

  it("uses the next word's gender for declined definite articles", () => {
    expect(classifyGermanWord("den", "Kaffee")).toBe("grammar-der");
    expect(classifyGermanWord("dem", "Kaffee")).toBe("grammar-der");
  });

  it("returns undefined for indefinite articles without a known noun", () => {
    expect(classifyGermanWord("ein")).toBeUndefined();
    expect(classifyGermanWord("eine")).toBeUndefined();
  });

  it("recognises common finite and infinite verb forms", () => {
    expect(classifyGermanWord("ist")).toBe("grammar-verb");
    expect(classifyGermanWord("trinke")).toBe("grammar-verb");
    expect(classifyGermanWord("gehen")).toBe("grammar-verb");
    expect(classifyGermanWord("laufen")).toBe("grammar-verb");
  });

  it("does not mistake common -en words for verbs", () => {
    expect(classifyGermanWord("offen")).toBeUndefined();
    expect(classifyGermanWord("morgen")).toBeUndefined();
    expect(classifyGermanWord("Wohnung")).toBeUndefined();
  });
});
