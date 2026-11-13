import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Provider selection is resolved when config.ts is imported, so each case
 * re-imports a fresh module with a clean environment.
 */
async function loadConfig(env: Record<string, string | undefined>) {
  vi.resetModules();
  vi.stubEnv("AI_PROVIDER", env.AI_PROVIDER ?? "");
  vi.stubEnv("AI_DEMO_MODE", env.AI_DEMO_MODE ?? "");
  vi.stubEnv("ANTHROPIC_API_KEY", env.ANTHROPIC_API_KEY ?? "");
  vi.stubEnv("GEMINI_API_KEY", env.GEMINI_API_KEY ?? "");
  vi.stubEnv("NODE_ENV", env.NODE_ENV ?? "development");
  vi.stubEnv("REDIS_URL", env.REDIS_URL ?? "");
  vi.stubEnv("RATE_LIMIT_STORE", env.RATE_LIMIT_STORE ?? "");
  vi.stubEnv("LOG_REQUESTS", env.LOG_REQUESTS ?? "");
  return import("./config.js");
}

describe("AI provider selection", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses the demo gateway in development when no key exists", async () => {
    const { config } = await loadConfig({});
    expect(config.aiProvider).toBe("demo");
    expect(config.aiMode).toBe("demo");
  });

  it("auto-selects Gemini when only its key is configured", async () => {
    const { config } = await loadConfig({ GEMINI_API_KEY: "gemini-test-key" });
    expect(config.aiProvider).toBe("gemini");
    expect(config.aiMode).toBe("live");
  });

  it("uses an explicit Gemini provider", async () => {
    const { config } = await loadConfig({
      AI_PROVIDER: "gemini",
      GEMINI_API_KEY: "gemini-test-key",
    });
    expect(config.aiProvider).toBe("gemini");
    expect(config.aiMode).toBe("live");
  });

  it("uses an explicit Anthropic provider even when both keys exist", async () => {
    const { config } = await loadConfig({
      AI_PROVIDER: "anthropic",
      ANTHROPIC_API_KEY: "anthropic-test-key",
      GEMINI_API_KEY: "gemini-test-key",
    });
    expect(config.aiProvider).toBe("anthropic");
    expect(config.aiMode).toBe("live");
  });

  it("falls back to demo in development when the selected key is missing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { config } = await loadConfig({ AI_PROVIDER: "gemini" });
    expect(config.aiProvider).toBe("demo");
    expect(config.aiMode).toBe("demo");
  });

  it("reports the selected provider as unavailable in production without a key", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { config } = await loadConfig({
      AI_PROVIDER: "gemini",
      NODE_ENV: "production",
    });
    expect(config.aiProvider).toBe("gemini");
    expect(config.aiMode).toBe("unavailable");
  });

  it("lets AI_DEMO_MODE override a live provider", async () => {
    const { config } = await loadConfig({
      AI_PROVIDER: "gemini",
      GEMINI_API_KEY: "gemini-test-key",
      AI_DEMO_MODE: "true",
    });
    expect(config.aiProvider).toBe("demo");
    expect(config.aiMode).toBe("demo");
  });

  it("ignores an unknown provider and auto-selects from the keys", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { config } = await loadConfig({
      AI_PROVIDER: "openai",
      ANTHROPIC_API_KEY: "anthropic-test-key",
    });
    expect(config.aiProvider).toBe("anthropic");
    expect(config.aiMode).toBe("live");
  });
});

describe("runtime infrastructure config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses the in-memory rate limit store when Redis is not configured", async () => {
    const { config } = await loadConfig({});
    expect(config.rateLimitStore).toBe("memory");
  });

  it("selects Redis when REDIS_URL is present", async () => {
    const { config } = await loadConfig({
      REDIS_URL: "redis://localhost:6379",
    });
    expect(config.redisUrl).toBe("redis://localhost:6379");
    expect(config.rateLimitStore).toBe("redis");
  });

  it("lets RATE_LIMIT_STORE=memory override a configured Redis URL", async () => {
    const { config } = await loadConfig({
      REDIS_URL: "redis://localhost:6379",
      RATE_LIMIT_STORE: "memory",
    });
    expect(config.rateLimitStore).toBe("memory");
  });

  it("disables request logs in tests and when LOG_REQUESTS=false", async () => {
    const testConfig = await loadConfig({ NODE_ENV: "test" });
    expect(testConfig.config.logRequests).toBe(false);

    const quietConfig = await loadConfig({ LOG_REQUESTS: "false" });
    expect(quietConfig.config.logRequests).toBe(false);

    const defaultConfig = await loadConfig({});
    expect(defaultConfig.config.logRequests).toBe(true);
  });
});
