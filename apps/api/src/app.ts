import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import {
  customScenarioToApiScenario,
  findApiScenario,
} from "./data/scenarios.js";
import { AppError } from "./lib/errors.js";
import { asyncHandler, errorHandler, notFoundHandler } from "./lib/http.js";
import { metrics } from "./lib/metrics.js";
import { createRateLimiter } from "./middleware/rateLimit.js";
import { rateLimitStoreStatus } from "./middleware/rateLimitStore.js";
import { requestObservability } from "./middleware/observability.js";
import {
  assistRequestSchema,
  chatRequestSchema,
  customScenarioSchema,
  drillRequestSchema,
  drillResponseSchema,
  explainResponseSchema,
  scenarioRequestSchema,
  simplifyResponseSchema,
  translateResponseSchema,
  wordRequestSchema,
} from "./schemas.js";
import { getAiGateway, type AiGateway } from "./services/ai.js";
import { buildDrillCacheKey, drillCache } from "./services/drillCache.js";
import { generateDrillSession } from "./services/drillService.js";
import {
  buildScenarioCacheKey,
  scenarioCache,
} from "./services/scenarioCache.js";

export interface CreateAppOptions {
  /** Injectable gateway keeps endpoint tests offline and deterministic. */
  gateway?: AiGateway;
}

function recordAiRequest(endpoint: string, gateway: AiGateway): void {
  metrics.increment("ai_requests_total", {
    endpoint,
    mode: gateway.mode,
  });
}

function recordCacheEvent(
  cache: "scenario" | "drill",
  cached: boolean,
  forced: boolean,
): void {
  metrics.increment("ai_cache_events_total", {
    cache,
    result: forced ? "bypass" : cached ? "hit" : "miss",
  });
}

export function createApp(options: CreateAppOptions = {}): express.Express {
  const app = express();
  const resolveGateway = (): AiGateway => options.gateway ?? getAiGateway();

  app.disable("x-powered-by");
  // Observability runs before anything that can fail so every response,
  // including CORS and parser errors, carries an id and a metric.
  app.use(requestObservability());
  app.set("trust proxy", config.trustProxy ? 1 : false);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.clientOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new AppError(403, "origin_not_allowed", "Origin is not allowed."));
      },
    }),
  );
  app.use(express.json({ limit: "32kb" }));

  const chatLimiter = createRateLimiter({
    name: "chat",
    ...config.rateLimits.chat,
  });
  const assistLimiter = createRateLimiter({
    name: "assist",
    ...config.rateLimits.assist,
  });
  const wordLimiter = createRateLimiter({
    name: "word",
    ...config.rateLimits.word,
  });
  const scenarioLimiter = createRateLimiter({
    name: "scenario",
    ...config.rateLimits.scenario,
  });
  const drillLimiter = createRateLimiter({
    name: "drill",
    ...config.rateLimits.drill,
  });

  app.get("/api/health", (_req, res) => {
    res.setHeader("cache-control", "no-store");
    res.json({
      ok: true,
      data: {
        status: "ok",
        ai: config.aiMode,
        provider: config.aiProvider,
        environment: config.nodeEnv,
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.round(process.uptime()),
        requestCount: metrics.total("http_requests_total"),
        rateLimitStore: rateLimitStoreStatus(),
        cache: {
          scenarioEntries: scenarioCache.size,
          drillEntries: drillCache.size,
        },
      },
    });
  });

  app.get("/api/metrics", (_req, res) => {
    res.setHeader("cache-control", "no-store");
    res.json({
      ok: true,
      data: {
        ...metrics.snapshot(),
        rateLimitStore: rateLimitStoreStatus(),
        cache: {
          scenarioEntries: scenarioCache.size,
          drillEntries: drillCache.size,
        },
      },
    });
  });

  app.post(
    "/api/scenarios/generate",
    scenarioLimiter,
    asyncHandler(async (req, res) => {
      const input = scenarioRequestSchema.parse(req.body);
      const gateway = resolveGateway();
      const cacheKey = buildScenarioCacheKey(input);

      const result = await scenarioCache.getOrCreate(
        cacheKey,
        async () => {
          const draft = await gateway.generateScenario({
            idea: input.idea,
            level: input.level,
            formality: input.formality,
          });

          if ("refused_ar" in draft) {
            throw new AppError(422, "scenario_refused", draft.refused_ar);
          }

          return customScenarioSchema.parse({
            ...draft,
            level: input.level ?? draft.level,
            formality: input.formality ?? draft.formality,
            tone: input.tone,
          });
        },
        input.forceRegenerate,
      );

      recordAiRequest("/api/scenarios/generate", gateway);
      recordCacheEvent("scenario", result.cached, Boolean(input.forceRegenerate));

      res.json({
        ok: true,
        data: result.value,
        meta: { mode: gateway.mode, cached: result.cached },
      });
    }),
  );

  app.post(
    "/api/drills/generate",
    drillLimiter,
    asyncHandler(async (req, res) => {
      const input = drillRequestSchema.parse(req.body);
      const gateway = resolveGateway();
      const cacheKey = buildDrillCacheKey({
        topic: input.topic,
        level: input.level,
        weakSpots: input.weakSpots,
      });

      const result = await drillCache.getOrCreate(
        cacheKey,
        () => generateDrillSession(input, gateway),
        input.forceRegenerate,
      );

      // Defensive validation at the transport boundary, mirroring /api/assist.
      drillResponseSchema.parse(result.value);
      recordAiRequest("/api/drills/generate", gateway);
      recordCacheEvent("drill", result.cached, Boolean(input.forceRegenerate));
      res.json({
        ok: true,
        data: result.value,
        meta: { mode: gateway.mode, cached: result.cached },
      });
    }),
  );

  app.post(
    "/api/chat",
    chatLimiter,
    asyncHandler(async (req, res) => {
      const input = chatRequestSchema.parse(req.body);
      let scenario = findApiScenario(input.scenarioId);

      if (input.scenarioId === "free") {
        scenario = {
          id: "free",
          titleDe: "Freie Konversation",
          role: "freundliche Gesprächspartnerin",
          setting: "Eine freie Konversation auf Deutsch",
          goal: "Freies Sprechen üben und korrigiert werden",
          learnerLevelHint: input.level,
          learnerRole: "Lernende/r",
          formality: "du",
          tone: "friendly",
          grammarFocus: [],
          keyVocab: [],
          usefulPhrases: [],
        };
      }

      if (
        !scenario &&
        input.scenarioId.startsWith("custom_") &&
        input.customScenario
      ) {
        scenario = customScenarioToApiScenario(input.customScenario);
      }

      if (!scenario) {
        throw new AppError(400, "unknown_scenario", "This conversation scenario is not available.");
      }

      const gateway = resolveGateway();
      const data = await gateway.tutor({
        level: input.level,
        dialect: input.dialect,
        safeMode: input.safeMode,
        learnerMessage: input.learnerMessage,
        history: input.history,
        scenario,
      });

      recordAiRequest("/api/chat", gateway);
      res.json({ ok: true, data, meta: { mode: gateway.mode } });
    }),
  );

  app.post(
    "/api/assist",
    assistLimiter,
    asyncHandler(async (req, res) => {
      const input = assistRequestSchema.parse(req.body);
      const gateway = resolveGateway();
      const data = await gateway.assist(
        input.action,
        input.text,
        input.level,
        input.dialect,
      );

      const outputSchema =
        input.action === "explain"
          ? explainResponseSchema
          : input.action === "simplify"
            ? simplifyResponseSchema
            : translateResponseSchema;

      // Defensive second validation at the transport boundary.
      outputSchema.parse(data);
      recordAiRequest("/api/assist", gateway);
      res.json({ ok: true, data, meta: { mode: gateway.mode } });
    }),
  );

  app.post(
    "/api/word",
    wordLimiter,
    asyncHandler(async (req, res) => {
      const input = wordRequestSchema.parse(req.body);
      const gateway = resolveGateway();
      const data = await gateway.word(input.word, input.context, input.level);
      recordAiRequest("/api/word", gateway);
      res.json({ ok: true, data, meta: { mode: gateway.mode } });
    }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
