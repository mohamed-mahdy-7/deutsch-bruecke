import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  normalizeDemoCorrection,
  requestStructuredJson,
} from "./ai.js";

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

const structuredSchema = z.object({ value: z.string() });
const baseMessages = [{ role: "user" as const, content: "Hallo" }];

describe("requestStructuredJson", () => {
  it("accepts fenced JSON without a repair round-trip", async () => {
    let calls = 0;
    const result = await requestStructuredJson(
      async () => {
        calls += 1;
        return '```json\n{"value":"ok"}\n```';
      },
      baseMessages,
      structuredSchema,
      "Repair it.",
    );

    expect(result).toEqual({ value: "ok" });
    expect(calls).toBe(1);
  });

  it("retries once after malformed JSON with a repair turn", async () => {
    let calls = 0;
    const requests: Array<Array<{ role: string; content: string }>> = [];
    const result = await requestStructuredJson(
      async (messages) => {
        calls += 1;
        requests.push(messages.map((message) => ({ ...message })));
        return calls === 1 ? "not json at all" : '{"value":"repaired"}';
      },
      baseMessages,
      structuredSchema,
      "Repair it.",
    );

    expect(result).toEqual({ value: "repaired" });
    expect(calls).toBe(2);
    expect(requests[1]).toEqual([
      { role: "user", content: "Hallo" },
      { role: "assistant", content: "not json at all" },
      { role: "user", content: "Repair it." },
    ]);
  });

  it("retries once after an empty response", async () => {
    let calls = 0;
    const result = await requestStructuredJson(
      async () => {
        calls += 1;
        return calls === 1 ? "" : '{"value":"second"}';
      },
      baseMessages,
      structuredSchema,
      "Repair it.",
    );

    expect(result).toEqual({ value: "second" });
    expect(calls).toBe(2);
  });

  it("throws ai_format_error after two malformed responses", async () => {
    await expect(
      requestStructuredJson(
        async () => "still not json",
        baseMessages,
        structuredSchema,
        "Repair it.",
      ),
    ).rejects.toMatchObject({ status: 502, code: "ai_format_error" });
  });
});

describe("GeminiGateway", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("sends the shared prompt with a header key and parses Gemini JSON", async () => {
    vi.resetModules();
    vi.stubEnv("AI_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "gemini-test-key");
    vi.stubEnv("GEMINI_MODEL", "gemini-2.5-flash");
    vi.stubEnv("AI_DEMO_MODE", "false");

    const tutorPayload = {
      reply_de: "Guten Tag! Möchten Sie einen Kaffee?",
      translation_ar: "نهارك سعيد! تحب قهوة؟",
      correction: {
        corrected: "Hallo",
        mistakes: [],
        praise_ar: "تمام، بداية جميلة.",
        follow_up_question_de: "Möchten Sie einen Kaffee?",
      },
      vocabulary: [],
    };

    const fetchMock = vi.fn(
      async (
        _input: string,
        _init?: { headers?: Record<string, string>; body?: string },
      ) =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify(tutorPayload) }],
                },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { getAiGateway } = await import("./ai.js");
    const { apiScenarios } = await import("../data/scenarios.js");
    const scenario = apiScenarios.cafe;
    if (!scenario) throw new Error("Missing cafe scenario fixture.");

    const result = await getAiGateway().tutor({
      level: "A1",
      dialect: "egyptian",
      safeMode: false,
      learnerMessage: "Hallo",
      history: [],
      scenario,
    });

    expect(result).toEqual(tutorPayload);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    );
    expect(init?.headers).toMatchObject({ "x-goog-api-key": "gemini-test-key" });

    const body = JSON.parse(String(init?.body)) as {
      systemInstruction: { parts: Array<{ text: string }> };
      contents: Array<{ role: string; parts: Array<{ text: string }> }>;
      generationConfig: { responseMimeType: string };
    };
    expect(body.systemInstruction.parts[0]?.text).toContain("Lina");
    expect(body.contents.at(-1)).toMatchObject({ role: "user" });
    expect(body.contents.at(-1)?.parts[0]?.text).toContain("Hallo");
    expect(body.generationConfig.responseMimeType).toBe("application/json");
  });
});
