import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

/**
 * The web and API workspaces share one root .env file. Resolve both the
 * workspace-relative and repository-relative locations so `npm run dev`
 * and container deployments behave identically.
 */
const envCandidates = [
  path.resolve(process.cwd(), "../../.env"),
  path.resolve(process.cwd(), ".env"),
];

for (const candidate of envCandidates) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate, override: false });
  }
}

function intFromEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Like intFromEnv but allows 0, which disables an optional cap. */
function nonNegativeIntFromEnv(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function boolFromEnv(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

const nodeEnv = process.env.NODE_ENV ?? "development";
const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim() ?? "";
const geminiKey = process.env.GEMINI_API_KEY?.trim() ?? "";
const demoRequested = process.env.AI_DEMO_MODE === "true";
const redisUrl = process.env.REDIS_URL?.trim() ?? "";
const rateLimitStoreRequested =
  process.env.RATE_LIMIT_STORE?.trim().toLowerCase();

export type AiProvider = "anthropic" | "gemini" | "demo";

const providerFromEnv = process.env.AI_PROVIDER?.trim().toLowerCase();
const explicitProvider: AiProvider | null =
  providerFromEnv === "anthropic" ||
  providerFromEnv === "gemini" ||
  providerFromEnv === "demo"
    ? providerFromEnv
    : null;

if (providerFromEnv && !explicitProvider) {
  console.warn(
    `[deutsch-bruecke] Ignoring unknown AI_PROVIDER="${providerFromEnv}". Expected anthropic, gemini, or demo.`,
  );
}

const autoProvider: AiProvider = anthropicKey
  ? "anthropic"
  : geminiKey
    ? "gemini"
    : "anthropic";

// AI_DEMO_MODE remains a hard safety override so local UI work never calls a
// paid API by accident, even if AI_PROVIDER names a live provider.
const selectedProvider: AiProvider = demoRequested
  ? "demo"
  : explicitProvider ?? autoProvider;

function providerKey(provider: AiProvider): string {
  if (provider === "anthropic") return anthropicKey;
  if (provider === "gemini") return geminiKey;
  return "";
}

let aiProvider: AiProvider = selectedProvider;
let aiMode: "live" | "demo" | "unavailable";

if (selectedProvider === "demo") {
  aiMode = "demo";
} else if (providerKey(selectedProvider)) {
  aiMode = "live";
} else if (nodeEnv !== "production") {
  if (explicitProvider) {
    console.warn(
      `[deutsch-bruecke] AI_PROVIDER=${selectedProvider} has no matching API key; using the demo gateway in development.`,
    );
  }
  aiProvider = "demo";
  aiMode = "demo";
} else {
  aiMode = "unavailable";
}

// ── Phase 2: beta access control ─────────────────────────────────────
// The server verifies Supabase access tokens. The URL/anon key are public
// values (the anon key is already shipped to the browser), so falling back to
// the VITE_ names keeps a single-project deployment simple.
const supabaseUrl = (
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  ""
)
  .trim()
  .replace(/\/+$/, "");
const supabaseAnonKey = (
  process.env.SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_ANON_KEY ??
  ""
).trim();

const authBypassRequested = boolFromEnv(process.env.AUTH_BYPASS_DEV);
const authBypass = authBypassRequested && nodeEnv !== "production";

if (authBypassRequested && nodeEnv === "production") {
  console.warn(
    "[deutsch-bruecke] Ignoring AUTH_BYPASS_DEV in production. AI routes require a signed-in user.",
  );
}

export const config = {
  nodeEnv,
  isProduction: nodeEnv === "production",
  port: intFromEnv(process.env.PORT, 8787),
  clientOrigins: (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  anthropicApiKey: anthropicKey,
  anthropicModel:
    process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5-20250929",
  geminiApiKey: geminiKey,
  geminiModel:
    process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash",
  aiProvider,
  aiMode,
  trustProxy: process.env.TRUST_PROXY === "1",
  redisUrl,
  // ── Phase 2: AI access control ─────────────────────────────────────
  supabaseUrl,
  supabaseAnonKey,
  /** Kill switch: instantly closes every AI route with a friendly error. */
  aiDisabled: boolFromEnv(process.env.AI_DISABLED),
  /** Optional closed-beta gate: only approved profiles may use AI. */
  betaGate: boolFromEnv(process.env.BETA_GATE),
  /**
   * Total AI calls allowed per UTC day across all users. 0 disables the
   * circuit breaker. Counted in the database so it survives cold starts.
   */
  globalDailyAiCap: nonNegativeIntFromEnv(
    process.env.GLOBAL_DAILY_AI_CAP,
    0,
  ),
  /**
   * Development-only escape hatch. When true (and NODE_ENV !== production),
   * AI routes accept requests without a Supabase token and skip DB quotas so
   * the app stays usable locally. Never honored in production.
   */
  authBypass,
  /** Provider calls time out before the serverless function limit. */
  providerTimeoutMs: intFromEnv(process.env.PROVIDER_TIMEOUT_MS, 25_000),
  /** How many chat turns are forwarded to the provider (cost shaping). */
  chatHistoryTurns: intFromEnv(process.env.CHAT_HISTORY_TURNS, 8),
  /** Per-user daily quotas (UTC). All values are positive integers. */
  quotas: {
    chat: intFromEnv(process.env.AI_QUOTA_CHAT, 40),
    scenario: intFromEnv(process.env.AI_QUOTA_SCENARIO, 5),
    drill: intFromEnv(process.env.AI_QUOTA_DRILL, 10),
    word: intFromEnv(process.env.AI_QUOTA_WORD, 60),
    assist: intFromEnv(process.env.AI_QUOTA_ASSIST, 60),
    recap: intFromEnv(process.env.AI_QUOTA_RECAP, 5),
  },
  // Redis keeps counters shared across API instances. The limiter itself falls
  // back to an in-memory store if Redis is down, so a cache outage never takes
  // the API down with it.
  rateLimitStore:
    rateLimitStoreRequested === "memory"
      ? ("memory" as const)
      : redisUrl
        ? ("redis" as const)
        : ("memory" as const),
  logRequests: nodeEnv !== "test" && process.env.LOG_REQUESTS !== "false",
  rateLimits: {
    chat: {
      windowMs: intFromEnv(process.env.CHAT_RATE_WINDOW_MINUTES, 15) * 60_000,
      max: intFromEnv(process.env.CHAT_RATE_MAX, 30),
    },
    assist: {
      windowMs:
        intFromEnv(process.env.ASSIST_RATE_WINDOW_MINUTES, 15) * 60_000,
      max: intFromEnv(process.env.ASSIST_RATE_MAX, 60),
    },
    word: {
      windowMs: intFromEnv(process.env.WORD_RATE_WINDOW_MINUTES, 15) * 60_000,
      max: intFromEnv(process.env.WORD_RATE_MAX, 150),
    },
    scenario: {
      windowMs:
        intFromEnv(process.env.SCENARIO_RATE_WINDOW_MINUTES, 15) * 60_000,
      max: intFromEnv(process.env.SCENARIO_RATE_MAX, 20),
    },
    drill: {
      windowMs:
        intFromEnv(process.env.DRILL_RATE_WINDOW_MINUTES, 15) * 60_000,
      max: intFromEnv(process.env.DRILL_RATE_MAX, 20),
    },
  },
} as const;

if (config.isProduction && aiMode === "unavailable") {
  // Keep the HTTP server healthy so /api/health can be used by orchestrators,
  // but make the misconfiguration obvious in logs.
  const expectedKey =
    aiProvider === "gemini" ? "GEMINI_API_KEY" : "ANTHROPIC_API_KEY";
  console.warn(
    `[deutsch-bruecke] ${expectedKey} is missing for AI_PROVIDER=${aiProvider} in production. AI routes will return 503.`,
  );
}

if (config.isProduction && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn(
    "[deutsch-bruecke] SUPABASE_URL/SUPABASE_ANON_KEY are missing in production. AI routes fail closed until auth is configured.",
  );
}
