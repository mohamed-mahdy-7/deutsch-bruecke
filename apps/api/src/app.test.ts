import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import type { ApiScenario } from "./data/scenarios.js";
import type {
  CustomScenario,
  ScenarioDraft,
  ScenarioModelResponse,
  TutorResponse,
  WordResponse,
} from "./schemas.js";
import type { AiGateway } from "./services/ai.js";
import { scenarioCache } from "./services/scenarioCache.js";

interface ApiSuccess<T> {
  ok: true;
  data: T;
  meta?: { mode?: string; cached?: boolean };
}

interface ApiFailure {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ path: string; message: string }>;
  };
}

const draft: ScenarioDraft = {
  title_de: "Zimmer im Hotel buchen",
  title_ar: "حجز غرفة في فندق",
  emoji: "🏨",
  setting_ar: "مكتب استقبال في فندق صغير في برلين.",
  ai_role_de: "freundliche Rezeptionistin in einem kleinen Hotel",
  learner_role_ar: "ضيف عايز يحجز غرفة",
  goal_ar: "احجز غرفة واسأل عن السعر.",
  level: "A2",
  formality: "Sie",
  grammar_focus: ["Höflichkeitsform Sie", "Akkusativ"],
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

const tutorResponse: TutorResponse = {
  reply_de: "Guten Tag! Möchten Sie ein Zimmer reservieren?",
  translation_ar: "نهارك سعيد! تحب تحجز غرفة؟",
  correction: {
    corrected: "Guten Tag!",
    mistakes: [],
    praise_ar: "بداية جميلة، كمّل كده.",
    follow_up_question_de: "Möchten Sie ein Zimmer reservieren?",
  },
  vocabulary: [],
};

const wordResponse: WordResponse = {
  word: "Zimmer",
  article: "das",
  plural: "die Zimmer",
  part_of_speech: "Nomen",
  meaning_ar: "غرفة",
  meaning_en: "room",
  example_de: "Das Zimmer ist groß.",
  example_ar: "الغرفة كبيرة.",
};

let generateCalls: Array<{ idea: string; level?: string; formality?: string }> =
  [];
let lastScenario: ApiScenario | undefined;
let refuse = false;

const gateway: AiGateway = {
  mode: "demo",
  async tutor(input) {
    lastScenario = input.scenario;
    return tutorResponse;
  },
  async assist() {
    return { translation_ar: "ترجمة تجريبية." };
  },
  async word() {
    return wordResponse;
  },
  async generateScenario(input) {
    generateCalls.push(input);
    if (refuse) {
      return { refused_ar: "الفكرة دي مش مناسبة، جرّب موقف تاني." };
    }
    // Deliberately ignore the requested level/formality so tests prove the
    // endpoint overrides whatever the model returned.
    return { ...draft } satisfies ScenarioModelResponse;
  },
};

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = createApp({ gateway });
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

beforeEach(() => {
  scenarioCache.clear();
  generateCalls = [];
  lastScenario = undefined;
  refuse = false;
});

async function postJson<T>(
  path: string,
  payload: unknown,
): Promise<{ status: number; body: ApiSuccess<T> | ApiFailure }> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return {
    status: response.status,
    body: (await response.json()) as ApiSuccess<T> | ApiFailure,
  };
}

function expectSuccess<T>(result: {
  status: number;
  body: ApiSuccess<T> | ApiFailure;
}): ApiSuccess<T> {
  if (!result.body.ok) {
    throw new Error(
      `Expected success, got ${result.status} ${result.body.error.code}: ${result.body.error.message}`,
    );
  }
  return result.body;
}

function expectFailure(result: {
  status: number;
  body: ApiSuccess<unknown> | ApiFailure;
}): ApiFailure {
  if (result.body.ok) throw new Error("Expected an error response.");
  return result.body;
}

describe("POST /api/scenarios/generate", () => {
  it("returns a validated scenario and appends the chosen tone", async () => {
    const result = await postJson<CustomScenario>(
      "/api/scenarios/generate",
      {
        idea: "عايز أتدرب على حجز غرفة في فندق",
        level: "A2",
        formality: "Sie",
        tone: "strict",
      },
    );
    const body = expectSuccess(result);

    expect(result.status).toBe(200);
    expect(body.data).toMatchObject({
      title_de: draft.title_de,
      level: "A2",
      formality: "Sie",
      tone: "strict",
    });
    expect(body.meta).toMatchObject({ mode: "demo", cached: false });
    expect(generateCalls).toHaveLength(1);
    expect(generateCalls[0]).toMatchObject({
      idea: "عايز أتدرب على حجز غرفة في فندق",
      level: "A2",
      formality: "Sie",
    });
  });

  it("overrides the model's level and formality with the learner's choices", async () => {
    const result = await postJson<CustomScenario>(
      "/api/scenarios/generate",
      {
        idea: "Small talk mit der Nachbarin",
        level: "B1",
        formality: "du",
      },
    );
    const body = expectSuccess(result);

    expect(body.data).toMatchObject({ level: "B1", formality: "du" });
    expect(generateCalls[0]).toMatchObject({ level: "B1", formality: "du" });
  });

  it("serves repeated normalized ideas from cache", async () => {
    const first = await postJson<CustomScenario>(
      "/api/scenarios/generate",
      { idea: "Hotel Zimmer buchen" },
    );
    const second = await postJson<CustomScenario>(
      "/api/scenarios/generate",
      { idea: "  hotel,   zimmer   buchen!! " },
    );

    expectSuccess(first);
    const body = expectSuccess(second);
    expect(generateCalls).toHaveLength(1);
    expect(body.meta?.cached).toBe(true);
  });

  it("regenerates on request and refreshes the cache", async () => {
    await postJson("/api/scenarios/generate", { idea: "Termin beim Arzt" });
    const regenerated = await postJson<CustomScenario>(
      "/api/scenarios/generate",
      { idea: "Termin beim Arzt", forceRegenerate: true },
    );
    const body = expectSuccess(regenerated);

    expect(generateCalls).toHaveLength(2);
    expect(body.meta?.cached).toBe(false);
  });

  it("maps a model refusal to HTTP 422 with its Arabic message", async () => {
    refuse = true;
    const result = await postJson(
      "/api/scenarios/generate",
      { idea: "خطة مش مناسبة للتمرين" },
    );
    const failure = expectFailure(result);

    expect(result.status).toBe(422);
    expect(failure.error).toMatchObject({
      code: "scenario_refused",
      message: "الفكرة دي مش مناسبة، جرّب موقف تاني.",
    });

    refuse = false;
    await postJson("/api/scenarios/generate", { idea: "خطة مش مناسبة للتمرين" });
    expect(generateCalls).toHaveLength(2);
  });

  it("rejects invalid ideas before calling the provider", async () => {
    const result = await postJson("/api/scenarios/generate", { idea: "!!" });
    const failure = expectFailure(result);

    expect(result.status).toBe(400);
    expect(failure.error.code).toBe("invalid_request");
    expect(generateCalls).toHaveLength(0);
  });
});

describe("POST /api/chat with custom scenarios", () => {
  const customScenario: CustomScenario = {
    ...draft,
    tone: "friendly",
  };

  it("uses the validated custom scenario in the tutor prompt input", async () => {
    const result = await postJson<TutorResponse>("/api/chat", {
      scenarioId: "custom_hotel_1",
      level: "A2",
      learnerMessage: "Guten Tag! Ich möchte ein Zimmer.",
      customScenario,
    });
    const body = expectSuccess(result);

    expect(body.data).toEqual(tutorResponse);
    expect(lastScenario).toMatchObject({
      role: customScenario.ai_role_de,
      setting: customScenario.setting_ar,
      goal: customScenario.goal_ar,
      learnerRole: customScenario.learner_role_ar,
      formality: "Sie",
      tone: "friendly",
      grammarFocus: customScenario.grammar_focus,
      keyVocab: customScenario.key_vocab,
    });
  });

  it("keeps built-in scenarios working", async () => {
    const result = await postJson<TutorResponse>("/api/chat", {
      scenarioId: "cafe",
      level: "A1",
      learnerMessage: "Guten Morgen!",
    });
    expectSuccess(result);
    expect(lastScenario?.id).toBe("cafe");
  });

  it("rejects a custom id without its scenario payload", async () => {
    const result = await postJson("/api/chat", {
      scenarioId: "custom_missing",
      level: "A2",
      learnerMessage: "Hallo",
    });
    const failure = expectFailure(result);

    expect(result.status).toBe(400);
    expect(failure.error.code).toBe("unknown_scenario");
  });

  it("rejects a malformed custom payload at the request boundary", async () => {
    const result = await postJson("/api/chat", {
      scenarioId: "custom_hotel_1",
      level: "A2",
      learnerMessage: "Hallo",
      customScenario: { ...customScenario, formality: "ihr" },
    });
    const failure = expectFailure(result);

    expect(result.status).toBe(400);
    expect(failure.error.code).toBe("invalid_request");
    expect(lastScenario).toBeUndefined();
  });
});
