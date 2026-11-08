import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";

interface RateLimitOptions {
  windowMs: number;
  max: number;
}

/** JSON-aware rate limiter with consistent headers and error contract. */
export function createRateLimiter({
  windowMs,
  max,
}: RateLimitOptions): RequestHandler {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        ok: false,
        error: {
          code: "rate_limited",
          message:
            "You are practising very quickly. Take a short break and try again shortly.",
        },
      });
    },
  });
}
