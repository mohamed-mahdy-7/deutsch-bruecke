import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { AppError } from "./lib/errors.js";
import { MemoryAccessStore } from "./services/memoryAccessStore.js";
import type { AiGateway } from "./services/ai.js";
import type {
  AuthVerifier,
  AiAccessStore,
} from "./services/supabaseAccess.js";
import type { TutorResponse } from "./schemas.js";

const tutorResponse: TutorResponse = {
  reply_de: "Hallo!",
  translation_ar: "أهلًا!",
  correction: {
    corrected: "Hallo!",
    mistakes: [],
    praise_ar: "تمام.",
    follow_up_question_de: "Wie geht es dir?",
  },
  vocabulary: [],
};

function makeGateway(calls: { count: number }): AiGateway {
  return {
    mode: "demo",
    async tutor() {
      calls.count += 1;
      return tutorResponse;
    },
    async assist() {
      return { translation_ar: "ترجمة." };
    },
    async word() {
      return {
        word: "Haus",
        article: "das",
        plural: "die Häuser",
        part_of_speech: "Nomen",
        meaning_ar: "بيت",
        meaning_en: "house",
        example_de: "Das Haus ist groß.",
        example_ar: "البيت كبير.",
      };
    },
    async generateScenario() {
      throw new AppError(400, "not_used", "not used");
    },
    async generateDrills() {
      throw new AppError(400, "not_used", "not used");
    },
  };
}

const validVerifier: AuthVerifier = {
  async verify(token) {
    if (token === "valid-token") return { id: "user-a" };
    throw new AppError(401, "invalid_token", "invalid token");
  },
};

interface Envelope {
  ok: boolean;
  data?: unknown;
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
}

interface Harness {
  url: string;
  close: () => Promise<void>;
  calls: { count: number };
}

async function startApp(options: {
  auth?: AuthVerifier;
  access?: AiAccessStore;
  aiDisabled?: boolean;
  betaGate?: boolean;
  authBypass?: boolean;
  globalDailyAiCap?: number;
  quotas?: { chat?: number };
} = {}): Promise<Harness> {
  const calls = { count: 0 };
  const server: Server = createApp({
    gateway: makeGateway(calls),
    auth: options.auth ?? validVerifier,
    access: options.access ?? new MemoryAccessStore(),
    authBypass: options.authBypass ?? false,
    aiDisabled: options.aiDisabled ?? false,
    betaGate: options.betaGate ?? false,
    globalDailyAiCap: options.globalDailyAiCap ?? 0,
    quotas: options.quotas ?? { chat: 2 },
  }).listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    calls,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

async function postChat(
  url: string,
  token?: string,
  message = "Hallo",
): Promise<{ status: number; body: Envelope }> {
  const response = await fetch(`${url}/api/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      scenarioId: "cafe",
      level: "A1",
      learnerMessage: message,
    }),
  });
  return { status: response.status, body: (await response.json()) as Envelope };
}

describe("AI route access control", () => {
  it("rejects requests without a token", async () => {
    const harness = await startApp();
    try {
      const result = await postChat(harness.url);
      expect(result.status).toBe(401);
      expect(result.body.error?.code).toBe("auth_required");
      expect(harness.calls.count).toBe(0);
    } finally {
      await harness.close();
    }
  });

  it("rejects an invalid token", async () => {
    const harness = await startApp();
    try {
      const result = await postChat(harness.url, "bad-token");
      expect(result.status).toBe(401);
      expect(result.body.error?.code).toBe("invalid_token");
      expect(harness.calls.count).toBe(0);
    } finally {
      await harness.close();
    }
  });

  it("returns a friendly quota error when the daily limit is exhausted", async () => {
    const harness = await startApp({ quotas: { chat: 1 } });
    try {
      const first = await postChat(harness.url, "valid-token");
      expect(first.status).toBe(200);

      const second = await postChat(harness.url, "valid-token");
      expect(second.status).toBe(429);
      expect(second.body.error?.code).toBe("quota_exhausted");
      expect(second.body.error?.details).toMatchObject({
        feature: "chat",
        remaining: 0,
      });
      expect(harness.calls.count).toBe(1);
    } finally {
      await harness.close();
    }
  });

  it("blocks unapproved users when the beta gate is on", async () => {
    const harness = await startApp({ betaGate: true });
    try {
      const result = await postChat(harness.url, "valid-token");
      expect(result.status).toBe(403);
      expect(result.body.error?.code).toBe("beta_not_approved");
      expect(harness.calls.count).toBe(0);
    } finally {
      await harness.close();
    }
  });

  it("allows an approved user through the beta gate", async () => {
    const access = new MemoryAccessStore();
    access.approve("user-a");
    const harness = await startApp({ betaGate: true, access });
    try {
      const result = await postChat(harness.url, "valid-token");
      expect(result.status).toBe(200);
      expect(harness.calls.count).toBe(1);
    } finally {
      await harness.close();
    }
  });

  it("trips the global circuit breaker", async () => {
    const harness = await startApp({ globalDailyAiCap: 1, quotas: { chat: 10 } });
    try {
      const first = await postChat(harness.url, "valid-token");
      expect(first.status).toBe(200);

      const second = await postChat(harness.url, "valid-token", "Tschüss");
      expect(second.status).toBe(503);
      expect(second.body.error?.code).toBe("ai_global_cap");
      expect(harness.calls.count).toBe(1);
    } finally {
      await harness.close();
    }
  });

  it("honours the kill switch before touching auth or the provider", async () => {
    const harness = await startApp({ aiDisabled: true });
    try {
      const result = await postChat(harness.url, "valid-token");
      expect(result.status).toBe(503);
      expect(result.body.error?.code).toBe("ai_disabled");
      expect(harness.calls.count).toBe(0);
    } finally {
      await harness.close();
    }
  });

  it("fails closed when the access store is unavailable", async () => {
    const broken: AiAccessStore = {
      async consume() {
        throw new AppError(503, "ai_access_unavailable", "waking up");
      },
      async entitlement() {
        throw new AppError(503, "ai_access_unavailable", "waking up");
      },
    };
    const harness = await startApp({ access: broken });
    try {
      const result = await postChat(harness.url, "valid-token");
      expect(result.status).toBe(503);
      expect(result.body.error?.code).toBe("ai_access_unavailable");
      expect(harness.calls.count).toBe(0);
    } finally {
      await harness.close();
    }
  });

  it("lets the dev bypass run without Supabase (never in production)", async () => {
    const harness = await startApp({ authBypass: true, quotas: { chat: 1 } });
    try {
      const result = await postChat(harness.url);
      expect(result.status).toBe(200);
      expect(harness.calls.count).toBe(1);
    } finally {
      await harness.close();
    }
  });
});

describe("GET /api/ai/entitlement", () => {
  it("returns limits and remaining quota without consuming a call", async () => {
    const harness = await startApp({ quotas: { chat: 3 } });
    try {
      const response = await fetch(`${harness.url}/api/ai/entitlement`, {
        headers: { authorization: "Bearer valid-token" },
      });
      const body = (await response.json()) as {
        ok: boolean;
        data: {
          quotas: Record<string, { limit: number; used: number; remaining: number }>;
        };
      };

      expect(response.status).toBe(200);
      expect(body.data.quotas.chat).toEqual({
        limit: 3,
        used: 0,
        remaining: 3,
      });
      expect(harness.calls.count).toBe(0);
    } finally {
      await harness.close();
    }
  });

  it("rejects anonymous callers", async () => {
    const harness = await startApp();
    try {
      const response = await fetch(`${harness.url}/api/ai/entitlement`);
      expect(response.status).toBe(401);
    } finally {
      await harness.close();
    }
  });
});

describe("MemoryAccessStore daily reset", () => {
  it("resets counters at the next UTC day", async () => {
    let now = new Date("2026-01-01T10:00:00.000Z");
    const store = new MemoryAccessStore({ now: () => now });
    const input = {
      userId: "user-a",
      accessToken: "token",
      feature: "chat" as const,
      limit: 1,
      betaGate: false,
      globalCap: 0,
    };

    expect((await store.consume(input)).allowed).toBe(true);
    expect((await store.consume(input)).reason).toBe("quota_exhausted");

    now = new Date("2026-01-02T00:00:01.000Z");
    expect((await store.consume(input)).allowed).toBe(true);
  });
});
