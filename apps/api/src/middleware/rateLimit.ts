import rateLimit from "express-rate-limit";
import type { Request, RequestHandler } from "express";
import type { AugmentedRequest } from "express-rate-limit";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { metrics } from "../lib/metrics.js";
import { createRateLimitStore } from "./rateLimitStore.js";

interface RateLimitOptions {
  /** Stable limiter name used for metrics and Redis key prefixes. */
  name: string;
  windowMs: number;
  max: number;
}

function retryAfterSeconds(request: Request): number {
  const resetTime = (request as AugmentedRequest).rateLimit?.resetTime;
  if (!resetTime) return Math.ceil(60_000 / 1000);
  return Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000));
}

/** JSON-aware rate limiter with consistent headers and error contract. */
export function createRateLimiter({
  name,
  windowMs,
  max,
}: RateLimitOptions): RequestHandler {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    store: createRateLimitStore(name),
    handler: (req, res) => {
      const retryAfter = retryAfterSeconds(req);
      metrics.increment("rate_limit_hits_total", { limiter: name });
      res.setHeader("Retry-After", String(retryAfter));
      if (config.logRequests) {
        logger.warn("rate_limit_exceeded", {
          requestId: res.locals.requestId,
          limiter: name,
          method: req.method,
          path: req.originalUrl,
          retryAfter,
        });
      }
      res.status(429).json({
        ok: false,
        error: {
          code: "rate_limited",
          message:
            "You are practising very quickly. Take a short break and try again shortly.",
          retryAfterSeconds: retryAfter,
        },
      });
    },
  });
}
