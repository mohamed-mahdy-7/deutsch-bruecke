import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { findApiScenario } from "./data/scenarios.js";
import { AppError } from "./lib/errors.js";
import { asyncHandler, errorHandler, notFoundHandler } from "./lib/http.js";
import { createRateLimiter } from "./middleware/rateLimit.js";
import {
  assistRequestSchema,
  chatRequestSchema,
  explainResponseSchema,
  simplifyResponseSchema,
  translateResponseSchema,
  wordRequestSchema,
} from "./schemas.js";
import { getAiGateway } from "./services/ai.js";

export function createApp(): express.Express {
  const app = express();

  app.disable("x-powered-by");
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

  const chatLimiter = createRateLimiter(config.rateLimits.chat);
  const assistLimiter = createRateLimiter(config.rateLimits.assist);
  const wordLimiter = createRateLimiter(config.rateLimits.word);

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      data: {
        status: "ok",
        ai: config.aiMode,
        timestamp: new Date().toISOString(),
      },
    });
  });

  app.post(
    "/api/chat",
    chatLimiter,
    asyncHandler(async (req, res) => {
      const input = chatRequestSchema.parse(req.body);
      const scenario = findApiScenario(input.scenarioId);
      if (!scenario) {
        throw new AppError(400, "unknown_scenario", "This conversation scenario is not available.");
      }

      const gateway = getAiGateway();
      const data = await gateway.tutor({
        level: input.level,
        dialect: input.dialect,
        safeMode: input.safeMode,
        learnerMessage: input.learnerMessage,
        history: input.history,
        scenario,
      });

      res.json({ ok: true, data, meta: { mode: gateway.mode } });
    }),
  );

  app.post(
    "/api/assist",
    assistLimiter,
    asyncHandler(async (req, res) => {
      const input = assistRequestSchema.parse(req.body);
      const gateway = getAiGateway();
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
      res.json({ ok: true, data, meta: { mode: gateway.mode } });
    }),
  );

  app.post(
    "/api/word",
    wordLimiter,
    asyncHandler(async (req, res) => {
      const input = wordRequestSchema.parse(req.body);
      const gateway = getAiGateway();
      const data = await gateway.word(input.word, input.context, input.level);
      res.json({ ok: true, data, meta: { mode: gateway.mode } });
    }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
