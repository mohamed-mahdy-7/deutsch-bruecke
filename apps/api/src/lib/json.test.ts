import { describe, expect, it } from "vitest";
import { extractJsonObject, parseJsonObject } from "./json.js";

describe("extractJsonObject", () => {
  it("extracts JSON from fenced model output", () => {
    const raw = 'Here you go:\n```json\n{"reply_de":"Hallo","nested":{"a":"b"}}\n```\nDanke.';
    expect(parseJsonObject(raw)).toEqual({
      reply_de: "Hallo",
      nested: { a: "b" },
    });
  });

  it("ignores braces and escaped quotes inside strings", () => {
    const raw = '{"text":"Er sagte: \\"Hallo {Welt}\\"","ok":true}';
    expect(parseJsonObject(raw)).toEqual({
      text: 'Er sagte: "Hallo {Welt}"',
      ok: true,
    });
  });

  it("returns null for incomplete objects", () => {
    expect(extractJsonObject('{"broken": true')).toBeNull();
  });

  it("returns null when no object exists", () => {
    expect(extractJsonObject("Kein JSON hier.")).toBeNull();
  });
});
