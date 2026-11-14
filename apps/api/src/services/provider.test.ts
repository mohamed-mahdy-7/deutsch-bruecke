import { describe, expect, it } from "vitest";
import {
  mapProviderError,
  normalizeAnthropicError,
  ProviderHttpError,
  ProviderTimeoutError,
  withProviderRetry,
} from "./provider.js";

describe("mapProviderError", () => {
  it("maps provider 429 to a friendly Arabic quota error", () => {
    const mapped = mapProviderError(new ProviderHttpError(429));
    expect(mapped.status).toBe(429);
    expect(mapped.code).toBe("ai_provider_quota");
    expect(mapped.message).toContain("جرّب تاني");
  });

  it("maps provider 5xx to a friendly unavailable error", () => {
    const mapped = mapProviderError(new ProviderHttpError(503));
    expect(mapped.status).toBe(502);
    expect(mapped.code).toBe("ai_upstream_unavailable");
    expect(mapped.message).not.toContain("503");
  });

  it("never exposes provider auth details", () => {
    const mapped = mapProviderError(new ProviderHttpError(401));
    expect(mapped.status).toBe(503);
    expect(mapped.code).toBe("ai_provider_auth");
    expect(mapped.message).not.toContain("401");
  });

  it("maps timeouts to a retry-later message", () => {
    const mapped = mapProviderError(new ProviderTimeoutError());
    expect(mapped.status).toBe(504);
    expect(mapped.code).toBe("ai_timeout");
  });

  it("returns AppErrors unchanged", () => {
    const original = mapProviderError(new ProviderTimeoutError());
    expect(mapProviderError(original)).toBe(original);
  });
});

describe("withProviderRetry", () => {
  it("retries one 5xx failure and then succeeds", async () => {
    let calls = 0;
    const sleeps: number[] = [];
    const result = await withProviderRetry(
      async () => {
        calls += 1;
        if (calls === 1) throw new ProviderHttpError(500);
        return "ok";
      },
      { attempts: 2, baseDelayMs: 10, sleep: async (ms) => void sleeps.push(ms) },
    );

    expect(result).toBe("ok");
    expect(calls).toBe(2);
    expect(sleeps).toHaveLength(1);
    expect(sleeps[0]).toBeGreaterThanOrEqual(10);
  });

  it("does not retry a 401", async () => {
    let calls = 0;
    await expect(
      withProviderRetry(
        async () => {
          calls += 1;
          throw new ProviderHttpError(401);
        },
        { attempts: 3, sleep: async () => undefined },
      ),
    ).rejects.toBeInstanceOf(ProviderHttpError);
    expect(calls).toBe(1);
  });

  it("stops after the bounded number of attempts", async () => {
    let calls = 0;
    await expect(
      withProviderRetry(
        async () => {
          calls += 1;
          throw new ProviderHttpError(429);
        },
        { attempts: 2, baseDelayMs: 1, sleep: async () => undefined },
      ),
    ).rejects.toBeInstanceOf(ProviderHttpError);
    expect(calls).toBe(2);
  });

  it("does not retry timeouts (avoids doubling latency)", async () => {
    let calls = 0;
    await expect(
      withProviderRetry(
        async () => {
          calls += 1;
          throw new ProviderTimeoutError();
        },
        { attempts: 2, sleep: async () => undefined },
      ),
    ).rejects.toBeInstanceOf(ProviderTimeoutError);
    expect(calls).toBe(1);
  });
});

describe("normalizeAnthropicError", () => {
  it("uses the SDK status when present", () => {
    const normalized = normalizeAnthropicError({ status: 529 });
    expect(normalized).toBeInstanceOf(ProviderHttpError);
    expect((normalized as ProviderHttpError).status).toBe(529);
  });

  it("recognises SDK timeouts", () => {
    expect(normalizeAnthropicError({ name: "APIConnectionTimeoutError" })).toBeInstanceOf(
      ProviderTimeoutError,
    );
  });
});
