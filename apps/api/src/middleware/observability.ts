import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { metrics } from "../lib/metrics.js";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,64}$/;

function resolveRequestId(header: string | undefined): string {
  // Honor an upstream request id (proxies and mobile clients often send one)
  // but never echo arbitrary data or unsafe header values.
  if (header && REQUEST_ID_PATTERN.test(header)) return header;
  return randomUUID();
}

/**
 * One middleware for the whole API: attach a request id, count requests and
 * timings, and emit a structured log line when the response finishes.
 *
 * The route label uses `req.route.path` (the matched pattern) rather than the
 * raw URL so unmatched 404s do not create unbounded metric cardinality.
 */
export function requestObservability(): RequestHandler {
  return (req, res, next) => {
    const requestId = resolveRequestId(req.header("x-request-id"));
    const startedAt = process.hrtime.bigint();

    res.locals.requestId = requestId;
    res.setHeader("x-request-id", requestId);

    res.on("finish", () => {
      const durationMs =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const route =
        typeof req.route?.path === "string" ? req.route.path : "unmatched";
      const labels = {
        method: req.method,
        route,
        status: res.statusCode,
      };

      metrics.increment("http_requests_total", labels);
      metrics.observe("http_request_duration_ms", Math.round(durationMs), {
        method: req.method,
        route,
      });
      if (res.statusCode >= 500) {
        metrics.increment("http_server_errors_total", labels);
      }

      if (config.logRequests) {
        logger.info("http_request", {
          requestId,
          method: req.method,
          route,
          path: req.originalUrl,
          status: res.statusCode,
          durationMs: Math.round(durationMs),
        });
      }
    });

    next();
  };
}
