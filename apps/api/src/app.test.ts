import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { pickBankDrillQuestions } from "./data/drills.js";
import type { ApiScenario } from "./data/scenarios.js";
import type {
  CustomScenario,
  DrillBatchModel,
  DrillQuestionModel,
  DrillResponse,
  ScenarioDraft,
  ScenarioModelResponse,
  TutorResponse,
  WordResponse,
} from "./schemas.js";
import type { AiGateway } from "./services/ai.js";
import { drillCache } from "./services/drillCache.js";
import { scenarioCache } from "./services/scenarioCache.js";
import { config } from "./config.js";
import { metrics } from "./lib/metrics.js";

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
    requestId?: string;
    retryAfterSeconds?: number;
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
let drillCalls: Array<{
  topic: string;
  level: string;
  count: number;
  excludePrompts?: string[];
}> = [];
let drillOverride: DrillQuestionModel[] | null = null;
let drillFails = false;

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
  async generateDrills(input) {
    drillCalls.push({
      topic: input.topic,
      level: input.level,
      count: input.count,
      excludePrompts: input.excludePrompts,
    });
    if (drillFails) throw new Error("provider down");
    if (drillOverride) {
      return {
        questions: drillOverride.slice(0, input.count),
      } satisfies DrillBatchModel;
    }
    return {
      questions: pickBankDrillQuestions(input),
    } satisfies DrillBatchModel;
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
  drillCache.clear();
  metrics.reset();
  generateCalls = [];
  lastScenario = undefined;
  refuse = false;
  drillCalls = [];
  drillOverride = null;
  drillFails = false;
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

async function getJson<T>(
  path: string,
  headers: Record<string, string> = {},
): Promise<{
  status: number;
  headers: Headers;
  body: ApiSuccess<T> | ApiFailure;
}> {
  const response = await fetch(`${baseUrl}${path}`, { headers });
  return {
    status: response.status,
    headers: response.headers,
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

describe("POST /api/drills/generate", () => {
  const topics = [
    "articles",
    "cases",
    "prepositions",
    "verb_position",
    "separable_verbs",
    "subordinate_clauses",
    "plurals",
  ] as const;

  const grammarTopic = {
    articles: "articles",
    cases: "cases",
    prepositions: "prepositions",
    verb_position: "word_order",
    separable_verbs: "word_order",
    subordinate_clauses: "word_order",
    plurals: "articles",
  } as const;

  it("returns ten validated, unique questions for every topic", async () => {
    for (const topic of topics) {
      const result = await postJson<DrillResponse>(
        "/api/drills/generate",
        { topic, level: "A2" },
      );
      const body = expectSuccess(result);

      expect(result.status).toBe(200);
      expect(body.data.questions).toHaveLength(10);
      expect(body.data.fallbackCount).toBe(0);
      expect(body.meta).toMatchObject({ mode: "demo", cached: false });

      const stems = new Set<string>();
      for (const question of body.data.questions) {
        expect(question.topic).toBe(topic);
        expect(question.grammarTopic).toBe(grammarTopic[topic]);
        expect(question.level).toBe("A2");
        expect(question.options).toHaveLength(4);
        expect(
          new Set(question.options.map((option) => option.toLowerCase())).size,
        ).toBe(4);
        expect(question.options).toContain(question.correctAnswer);
        expect(
          question.options.filter(
            (option) => option === question.correctAnswer,
          ),
        ).toHaveLength(1);
        expect(question.promptBefore.length + question.promptAfter.length).toBeGreaterThan(
          0,
        );
        stems.add(`${question.promptBefore} ${question.promptAfter}`);
      }
      expect(stems.size).toBe(10);
    }

    expect(drillCalls).toHaveLength(topics.length);
  });

  it("caches normalized requests and regenerates only when asked", async () => {
    const base = {
      topic: "cases",
      level: "A2",
      weakSpots: [
        { pattern: "Dative-Article", count: 2 },
        { pattern: "weil-verb-final", count: 1 },
      ],
    };
    const first = await postJson<DrillResponse>("/api/drills/generate", base);
    const second = await postJson<DrillResponse>("/api/drills/generate", {
      ...base,
      weakSpots: [
        { pattern: "weil verb final", count: 1 },
        { pattern: "dative article", count: 2 },
      ],
    });

    expectSuccess(first);
    const cachedBody = expectSuccess(second);
    expect(cachedBody.meta?.cached).toBe(true);
    expect(drillCalls).toHaveLength(1);

    const regenerated = await postJson<DrillResponse>(
      "/api/drills/generate",
      { ...base, forceRegenerate: true },
    );
    expect(expectSuccess(regenerated).meta?.cached).toBe(false);
    expect(drillCalls).toHaveLength(2);
  });

  it("discards invalid items, asks once for replacements, then fills from the bank", async () => {
    const valid = pickBankDrillQuestions({
      topic: "articles",
      level: "A1",
      count: 1,
    })[0];
    if (!valid) throw new Error("Expected a fallback question.");

    const invalid: DrillQuestionModel = {
      ...valid,
      pattern: "duplicate-options",
      options: [valid.options[0]!, valid.options[0]!, valid.options[2]!, valid.options[3]!],
      correct_answer: valid.options[0]!,
    };
    drillOverride = [valid, invalid];

    const result = await postJson<DrillResponse>("/api/drills/generate", {
      topic: "articles",
      level: "A1",
    });
    const body = expectSuccess(result);

    expect(body.data.questions).toHaveLength(10);
    expect(body.data.fallbackCount).toBe(9);
    expect(drillCalls).toHaveLength(2);
    expect(drillCalls[1]?.excludePrompts).toHaveLength(1);
  });

  it("returns a friendly Arabic error when the provider fails", async () => {
    drillFails = true;
    const result = await postJson("/api/drills/generate", {
      topic: "plurals",
      level: "A1",
    });
    const failure = expectFailure(result);

    expect(result.status).toBe(502);
    expect(failure.error.code).toBe("drill_generation_failed");
    expect(failure.error.message).toContain("جرّب تاني");
    expect(drillCalls).toHaveLength(1);
  });

  it("rejects unknown topics before calling the provider", async () => {
    const result = await postJson("/api/drills/generate", {
      topic: "vocabulary",
      level: "A2",
    });
    const failure = expectFailure(result);

    expect(result.status).toBe(400);
    expect(failure.error.code).toBe("invalid_request");
    expect(drillCalls).toHaveLength(0);
  });
});

describe("observability endpoints", () => {
  interface HealthData {
    status: string;
    ai: string;
    provider: string;
    environment: string;
    timestamp: string;
    uptimeSeconds: number;
    requestCount: number;
    rateLimitStore: string;
    cache: { scenarioEntries: number; drillEntries: number };
  }

  interface MetricsData {
    startedAt: string;
    uptimeSeconds: number;
    counters: Array<{
      name: string;
      labels: Record<string, string | number | boolean>;
      value: number;
    }>;
    timings: Array<{
      key: string;
      count: number;
      avgMs: number;
      maxMs: number;
    }>;
    rateLimitStore: string;
    cache: { scenarioEntries: number; drillEntries: number };
  }

  it("reports mode, uptime, request count, cache sizes and store status", async () => {
    await postJson("/api/chat", {
      scenarioId: "cafe",
      level: "A1",
      learnerMessage: "Guten Morgen!",
    });

    const result = await getJson<HealthData>("/api/health");
    const body = expectSuccess(result);

    expect(result.status).toBe(200);
    expect(result.headers.get("cache-control")).toBe("no-store");
    expect(body.data).toMatchObject({
      status: "ok",
      ai: config.aiMode,
      provider: config.aiProvider,
      environment: config.nodeEnv,
      cache: { scenarioEntries: 0, drillEntries: 0 },
    });
    expect(body.data.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(body.data.requestCount).toBeGreaterThanOrEqual(1);
    expect(["disabled", "connected", "degraded"]).toContain(
      body.data.rateLimitStore,
    );
  });

  it("exposes AI request and cache counters as JSON", async () => {
    await postJson("/api/scenarios/generate", { idea: "Hotel Zimmer" });
    await postJson("/api/scenarios/generate", { idea: "Hotel Zimmer" });

    const result = await getJson<MetricsData>("/api/metrics");
    const body = expectSuccess(result);

    const aiRequests = body.data.counters.find(
      (counter) => counter.name === "ai_requests_total",
    );
    expect(aiRequests?.value).toBe(2);
    expect(aiRequests?.labels).toMatchObject({
      endpoint: "/api/scenarios/generate",
      mode: "demo",
    });

    const cacheMetrics = body.data.counters.filter(
      (counter) => counter.name === "ai_cache_events_total",
    );
    expect(
      cacheMetrics.find((counter) => counter.labels.result === "miss")?.value,
    ).toBe(1);
    expect(
      cacheMetrics.find((counter) => counter.labels.result === "hit")?.value,
    ).toBe(1);

    expect(body.data.cache.scenarioEntries).toBe(1);
    expect(body.data.timings.length).toBeGreaterThan(0);
  });

  it("returns request ids on success and on errors", async () => {
    const ok = await getJson("/api/health", {
      "x-request-id": "health-trace-1234",
    });
    expect(ok.headers.get("x-request-id")).toBe("health-trace-1234");

    const missing = await getJson("/api/does-not-exist", {
      "x-request-id": "missing-trace-1234",
    });
    const failure = expectFailure(missing);

    expect(missing.status).toBe(404);
    expect(missing.headers.get("x-request-id")).toBe("missing-trace-1234");
    expect(failure.error.requestId).toBe("missing-trace-1234");
  });
});
