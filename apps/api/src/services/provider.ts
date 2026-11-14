import { AppError } from "../lib/errors.js";

/**
 * Provider error normalisation.
 *
 * Raw provider messages can contain request metadata, so they are never
 * forwarded to the browser. This module turns network/HTTP/timeout failures
 * into a small set of AppErrors with friendly Arabic copy, and provides one
 * bounded retry helper shared by Anthropic and Gemini.
 */

export class ProviderHttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`provider_http_${status}`);
    this.name = "ProviderHttpError";
    this.status = status;
  }
}

export class ProviderTimeoutError extends Error {
  constructor() {
    super("provider_timeout");
    this.name = "ProviderTimeoutError";
  }
}

export class ProviderNetworkError extends Error {
  constructor() {
    super("provider_network");
    this.name = "ProviderNetworkError";
  }
}

const QUOTA_MESSAGE =
  "المدرّس مشغول دلوقتي أو كوتة المزوّد خلصت. جرّب تاني بعد شوية.";
const UNAVAILABLE_MESSAGE =
  "خدمة المدرّس مش متاحة دلوقتي. جرّب تاني بعد دقيقة.";
const TIMEOUT_MESSAGE = "المدرّس اتأخر في الرد. جرّب تاني.";
const AUTH_MESSAGE =
  "خدمة المدرّس مش متاحة دلوقتي. جرّب تاني بعد دقيقة.";

export function mapProviderError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof ProviderTimeoutError) {
    return new AppError(504, "ai_timeout", TIMEOUT_MESSAGE);
  }
  if (error instanceof ProviderHttpError) {
    if (error.status === 429) {
      return new AppError(429, "ai_provider_quota", QUOTA_MESSAGE);
    }
    if (error.status === 401 || error.status === 403) {
      // Configuration problem on our side. Never reveal provider auth detail.
      return new AppError(503, "ai_provider_auth", AUTH_MESSAGE);
    }
    if (error.status >= 500) {
      return new AppError(502, "ai_upstream_unavailable", UNAVAILABLE_MESSAGE);
    }
    return new AppError(502, "ai_upstream_error", UNAVAILABLE_MESSAGE);
  }
  if (error instanceof ProviderNetworkError) {
    return new AppError(502, "ai_upstream_unavailable", UNAVAILABLE_MESSAGE);
  }

  return new AppError(502, "ai_upstream_error", UNAVAILABLE_MESSAGE);
}

function isRetryable(error: unknown): boolean {
  return (
    error instanceof ProviderHttpError &&
    (error.status === 429 || error.status >= 500)
  );
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Two attempts max, with one short jittered backoff. Never retries 4xx errors
 * that will not change (bad request, auth) and never retries timeouts, so a
 * slow provider cannot double the request latency.
 */
export async function withProviderRetry<T>(
  run: () => Promise<T>,
  options: {
    attempts?: number;
    baseDelayMs?: number;
    sleep?: (ms: number) => Promise<void>;
  } = {},
): Promise<T> {
  const attempts = Math.max(1, Math.min(3, options.attempts ?? 2));
  const baseDelayMs = options.baseDelayMs ?? 300;
  const sleep = options.sleep ?? defaultSleep;

  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      const canRetry = attempt < attempts - 1 && isRetryable(error);
      if (!canRetry) break;
      const jitter = Math.floor(Math.random() * 150);
      await sleep(baseDelayMs * (attempt + 1) + jitter);
    }
  }
  throw lastError;
}

/** Normalise an Anthropic SDK error without importing provider internals. */
export function normalizeAnthropicError(error: unknown): Error {
  const candidate = error as { status?: unknown; name?: unknown } | null;

  if (
    candidate &&
    (candidate.name === "APIConnectionTimeoutError" ||
      candidate.name === "AbortError")
  ) {
    return new ProviderTimeoutError();
  }

  if (candidate && typeof candidate.status === "number") {
    return new ProviderHttpError(candidate.status);
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("timeout") || message.includes("timed out")) {
    return new ProviderTimeoutError();
  }
  if (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("econn")
  ) {
    return new ProviderNetworkError();
  }
  return new ProviderNetworkError();
}
