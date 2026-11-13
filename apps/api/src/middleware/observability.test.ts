import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The limiter reads `config.rateLimitStore` at construction time, so force the
 * in-memory store before loading the middleware. This keeps the test offline
 * even if a developer's .env points at a real Redis instance.
 */
vi.stubEnv("RATE_LIMIT_STORE", "memory");
vi.stubEnv("REDIS_URL", "");
vi.stubEnv("LOG_REQUESTS", "false");

let server: Server;
let baseUrl: string;
let metricsTotal: (name: string) => number;
let metricsReset: () => void;

beforeAll(async () => {
  const { requestObservability } = await import("./observability.js");
  const { createRateLimiter } = await import("./rateLimit.js");
  const { metrics } = await import("../lib/metrics.js");
  metricsTotal = (name) => metrics.total(name);
  metricsReset = () => metrics.reset();

  const app = express();
  app.use(requestObservability());
  app.get(
    "/limited",
    createRateLimiter({ name: "test-a", windowMs: 60_000, max: 2 }),
    (_req, res) => {
      res.json({ ok: true });
    },
  );
  app.get(
    "/limited-b",
    createRateLimiter({ name: "test-b", windowMs: 60_000, max: 1 }),
    (_req, res) => {
      res.json({ ok: true });
    },
  );
  app.get(
    "/limited-c",
    createRateLimiter({ name: "test-c", windowMs: 60_000, max: 1 }),
    (_req, res) => {
      res.json({ ok: true });
    },
  );
  app.get("/unlimited", (_req, res) => {
    res.json({ ok: true });
  });

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
  metricsReset();
});

describe("requestObservability", () => {
  it("attaches a generated request id to every response", async () => {
    const response = await fetch(`${baseUrl}/unlimited`);
    const requestId = response.headers.get("x-request-id");

    expect(response.status).toBe(200);
    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("keeps a safe incoming request id and replaces an unsafe one", async () => {
    const kept = await fetch(`${baseUrl}/unlimited`, {
      headers: { "x-request-id": "client-request-1234" },
    });
    expect(kept.headers.get("x-request-id")).toBe("client-request-1234");

    const replaced = await fetch(`${baseUrl}/unlimited`, {
      headers: { "x-request-id": "<script>" },
    });
    expect(replaced.headers.get("x-request-id")).not.toBe("<script>");
  });

  it("counts requests and timings by method, route and status", async () => {
    await fetch(`${baseUrl}/unlimited`);
    await fetch(`${baseUrl}/does-not-exist`);

    const snapshot = (await (
      await fetch(`${baseUrl}/unlimited`)
    ).json()) as { ok: boolean };

    expect(snapshot.ok).toBe(true);
    expect(metricsTotal("http_requests_total")).toBeGreaterThanOrEqual(3);
    expect(metricsTotal("http_server_errors_total")).toBe(0);
  });
});

describe("createRateLimiter", () => {
  it("returns 429 with Retry-After and records the hit", async () => {
    const first = await fetch(`${baseUrl}/limited`);
    const second = await fetch(`${baseUrl}/limited`);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const limited = await fetch(`${baseUrl}/limited`);
    const body = (await limited.json()) as {
      ok: false;
      error: { code: string; retryAfterSeconds: number };
    };

    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThanOrEqual(1);
    expect(body.error.code).toBe("rate_limited");
    expect(body.error.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(metricsTotal("rate_limit_hits_total")).toBe(1);
  });

  it("keeps limits independent per route", async () => {
    await fetch(`${baseUrl}/limited-b`);
    await fetch(`${baseUrl}/limited-b`);
    await fetch(`${baseUrl}/limited-b`);

    const other = await fetch(`${baseUrl}/limited-c`);
    expect(other.status).toBe(200);
  });
});
