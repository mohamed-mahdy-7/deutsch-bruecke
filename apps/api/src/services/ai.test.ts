import { describe, expect, it } from "vitest";
import { normalizeDemoCorrection } from "./ai.js";

/**
 * Regression tests for the demo gateway's handwritten correction rules.
 * These run without an Anthropic key and guard the no-key development flow.
 */
describe("normalizeDemoCorrection", () => {
  it("fixes 'ein Kaffee' mid-sentence without changing the letter case", () => {
    const result = normalizeDemoCorrection("Ich möchte ein Kaffee, bitte.");

    expect(result.corrected).toBe("Ich möchte einen Kaffee, bitte.");
    expect(result.mistakes).toHaveLength(1);
    expect(result.mistakes[0]).toMatchObject({
      type: "article",
      original: "ein Kaffee",
      fix: "einen Kaffee",
    });
  });

  it("fixes a definite article at the start of a sentence and capitalises it", () => {
    const result = normalizeDemoCorrection("Das Tisch ist groß.");

    expect(result.corrected).toBe("Der Tisch ist groß.");
    expect(result.mistakes[0]).toMatchObject({
      original: "Das Tisch",
      fix: "Der Tisch",
    });
  });

  it("fixes a feminine noun article mid-sentence without capitalising", () => {
    const result = normalizeDemoCorrection("Ich sehe der Frau.");

    expect(result.corrected).toBe("Ich sehe die Frau.");
    expect(result.mistakes[0]?.fix).toBe("die Frau");
  });

  it("fixes verb-second order after a time expression", () => {
    const result = normalizeDemoCorrection("Heute ich gehe ins Café.");

    expect(result.corrected).toBe("Heute gehe ich ins Café.");
    expect(result.mistakes[0]).toMatchObject({
      type: "verb_position",
      original: "Heute ich gehe",
      fix: "Heute gehe ich",
    });
  });

  it("leaves already correct text untouched", () => {
    const result = normalizeDemoCorrection("Ich trinke gern Kaffee.");

    expect(result.corrected).toBe("Ich trinke gern Kaffee.");
    expect(result.mistakes).toEqual([]);
  });

  it("capitalises the very first letter of the corrected sentence", () => {
    const result = normalizeDemoCorrection("ich komme aus Berlin.");
    expect(result.corrected).toBe("Ich komme aus Berlin.");
    expect(result.mistakes).toEqual([]);
  });

  it("returns at most three mistakes", () => {
    const result = normalizeDemoCorrection(
      "Das Tisch ist der Frau und die Buch und ein Kaffee.",
    );
    expect(result.mistakes.length).toBeLessThanOrEqual(3);
  });
});
