import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { config } from "./config.js";
import {
  customScenarioToApiScenario,
  findApiScenario,
} from "./data/scenarios.js";
import { AppError } from "./lib/errors.js";
import { asyncHandler, errorHandler, notFoundHandler } from "./lib/http.js";
import { dedupeInFlight, hashKey } from "./lib/dedupe.js";
import { metrics } from "./lib/metrics.js";
import { createRateLimiter } from "./middleware/rateLimit.js";
import { rateLimitStoreStatus } from "./middleware/rateLimitStore.js";
import { requestObservability } from "./middleware/observability.js";
import {
  aiKillSwitch,
  nextUtcMidnightIso,
  requireAiAccess,
  requireAuth,
} from "./middleware/aiAccess.js";
import {
  AI_FEATURES,
  createPermissiveAccessStore,
  createSupabaseAccessStore,
  createSupabaseAuthVerifier,
  type AiAccessStore,
  type AiFeature,
  type AuthVerifier,
} from "./services/supabaseAccess.js";
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
  /** Injectable token verifier. Defaults to Supabase Auth. */
  auth?: AuthVerifier;
  /** Injectable quota/beta store. Defaults to Supabase RPCs. */
  access?: AiAccessStore;
  /** Test overrides for environment-level switches. */
  aiDisabled?: boolean;
  betaGate?: boolean;
  authBypass?: boolean;
  globalDailyAiCap?: number;
  quotas?: Partial<Record<AiFeature, number>>;
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

  const authBypass = options.authBypass ?? config.authBypass;
  const aiDisabled = options.aiDisabled ?? config.aiDisabled;
  const betaGate = options.betaGate ?? config.betaGate;
  const globalDailyAiCap =
    options.globalDailyAiCap ?? config.globalDailyAiCap;
  const quotaLimits: Record<AiFeature, number> = {
    ...config.quotas,
    ...options.quotas,
  };

  const authVerifier = options.auth ?? createSupabaseAuthVerifier();
  const accessStore =
    options.access ??
    (authBypass ? createPermissiveAccessStore() : createSupabaseAccessStore());

  const killSwitch = aiKillSwitch(aiDisabled);
  const authGuard = requireAuth({ verifier: authVerifier, bypass: authBypass });
  const accessGuard = (feature: AiFeature) =>
    requireAiAccess({
      access: accessStore,
      feature,
      limit: quotaLimits[feature],
      betaGate,
      globalCap: globalDailyAiCap,
      bypass: authBypass,
    });

  app.disable("x-powered-by");
  // Observability runs before anything that can fail so every response,
  // including CORS and parser errors, carries an id and a metric.
  app.use(requestObservability());
  app.set("trust proxy", config.trustProxy ? 1 : false);
  app.use(helmet());
  // Allow same-origin requests (Vercel/Render same origin, curl/health)
  // automatically, plus CLIENT_ORIGIN and Vercel deployment URLs.
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (!origin) return next();

    const allowed = new Set(config.clientOrigins);
    for (const value of [
      process.env.VERCEL_URL,
      process.env.VERCEL_PROJECT_PRODUCTION_URL,
    ]) {
      if (!value) continue;
      const trimmed = value.trim();
      const normalized = /^https?:\/\//i.test(trimmed)
        ? trimmed.replace(/\/$/, "")
        : `https://${trimmed.replace(/\/$/, "")}`;
      allowed.add(normalized);
    }

    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host?.toLowerCase() ?? null;
    } catch {
      originHost = null;
    }
    const rawHost = String(
      req.headers?.["x-forwarded-host"] || req.headers?.host || "",
    );
    const requestHost = (rawHost.split(",")[0] ?? "").trim().toLowerCase();
    const sameOrigin = Boolean(
      originHost && requestHost && originHost === requestHost,
    );

    if (sameOrigin || allowed.has(origin)) return next();

    console.warn("origin_rejected", {
      origin,
      allowed: [...allowed],
      requestHost,
    });
    next(new AppError(403, "origin_not_allowed", "Origin is not allowed."));
  });

  app.use(cors({ origin: true }));
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
        aiEnabled: !aiDisabled,
        betaGate,
        cache: {
          scenarioEntries: scenarioCache.size,
          drillEntries: drillCache.size,
        },
      },
    });
  });

  /**
   * Quota meter data. Requires a signed-in user but does NOT consume quota.
   * Returns usable data even when the kill switch is on so the UI can show a
   * calm "temporarily unavailable" state instead of an error loop.
   */
  app.get(
    "/api/ai/entitlement",
    authGuard,
    asyncHandler(async (_req, res) => {
      const userId = res.locals.authUserId as string;
      const accessToken = res.locals.authAccessToken as string;

      if (authBypass) {
        const quotas = Object.fromEntries(
          AI_FEATURES.map((feature) => {
            const limit = quotaLimits[feature];
            return [feature, { limit, used: 0, remaining: limit }];
          }),
        );
        res.setHeader("cache-control", "no-store");
        res.json({
          ok: true,
          data: {
            aiEnabled: !aiDisabled,
            betaGate,
            approved: true,
            quotas,
            resetAt: nextUtcMidnightIso(),
          },
        });
        return;
      }

      const entitlement = await accessStore.entitlement({
        userId,
        accessToken,
      });
      const quotas = Object.fromEntries(
        AI_FEATURES.map((feature) => {
          const limit = quotaLimits[feature];
          const used = entitlement.usage[feature] ?? 0;
          return [
            feature,
            { limit, used, remaining: Math.max(0, limit - used) },
          ];
        }),
      );

      res.setHeader("cache-control", "no-store");
      res.json({
        ok: true,
        data: {
          aiEnabled: !aiDisabled,
          betaGate,
          approved: entitlement.approved,
          quotas,
          resetAt: nextUtcMidnightIso(),
        },
      });
    }),
  );

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
    killSwitch,
    authGuard,
    scenarioLimiter,
    accessGuard("scenario"),
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
    killSwitch,
    authGuard,
    drillLimiter,
    accessGuard("drill"),
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
    killSwitch,
    authGuard,
    chatLimiter,
    accessGuard("chat"),
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
      // Cost shaping: only the most recent turns are forwarded.
      const history = input.history.slice(-config.chatHistoryTurns);
      const userId = String(res.locals.authUserId ?? "anonymous");
      const dedupeKey = `chat:${userId}:${hashKey(
        JSON.stringify({
          scenarioId: input.scenarioId,
          level: input.level,
          dialect: input.dialect,
          safeMode: input.safeMode,
          learnerMessage: input.learnerMessage,
          customScenario: input.customScenario ?? null,
          history,
        }),
      )}`;
      const data = await dedupeInFlight(dedupeKey, () =>
        gateway.tutor({
          level: input.level,
          dialect: input.dialect,
          safeMode: input.safeMode,
          learnerMessage: input.learnerMessage,
          history,
          scenario,
        }),
      );

      recordAiRequest("/api/chat", gateway);
      res.json({ ok: true, data, meta: { mode: gateway.mode } });
    }),
  );

  app.post(
    "/api/assist",
    killSwitch,
    authGuard,
    assistLimiter,
    accessGuard("assist"),
    asyncHandler(async (req, res) => {
      const input = assistRequestSchema.parse(req.body);
      const gateway = resolveGateway();
      const userId = String(res.locals.authUserId ?? "anonymous");
      const dedupeKey = `assist:${userId}:${hashKey(
        JSON.stringify(input),
      )}`;
      const data = await dedupeInFlight(dedupeKey, () =>
        gateway.assist(
          input.action,
          input.text,
          input.level,
          input.dialect,
        ),
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
    killSwitch,
    authGuard,
    wordLimiter,
    accessGuard("word"),
    asyncHandler(async (req, res) => {
      const input = wordRequestSchema.parse(req.body);
      const gateway = resolveGateway();
      const userId = String(res.locals.authUserId ?? "anonymous");
      const dedupeKey = `word:${userId}:${hashKey(JSON.stringify(input))}`;
      const data = await dedupeInFlight(dedupeKey, () =>
        gateway.word(input.word, input.context, input.level),
      );
      recordAiRequest("/api/word", gateway);
      res.json({ ok: true, data, meta: { mode: gateway.mode } });
    }),
  );

  // Refund the daily quota when an AI call fails after it was consumed, so a
  // provider outage or validation failure does not charge the learner.
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.locals.aiQuotaConsumed && !authBypass) {
      const userId = res.locals.authUserId as string | undefined;
      const accessToken = res.locals.authAccessToken as string | undefined;
      const feature = res.locals.aiQuotaFeature as AiFeature | undefined;
      const limit = res.locals.aiQuotaLimit as number | undefined;
      if (userId && accessToken && feature && limit) {
        void accessStore
          .refund({ userId, accessToken, feature, limit })
          .catch(() => undefined);
      }
    }
    next(err);
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
