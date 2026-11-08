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

const nodeEnv = process.env.NODE_ENV ?? "development";
const apiKey = process.env.ANTHROPIC_API_KEY?.trim() ?? "";
const demoRequested = process.env.AI_DEMO_MODE === "true";

/** Never fall silently into demo mode in production. */
export const aiMode: "live" | "demo" | "unavailable" = demoRequested
  ? "demo"
  : apiKey
    ? "live"
    : nodeEnv !== "production"
      ? "demo"
      : "unavailable";

export const config = {
  nodeEnv,
  isProduction: nodeEnv === "production",
  port: intFromEnv(process.env.PORT, 8787),
  clientOrigins: (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  anthropicApiKey: apiKey,
  anthropicModel:
    process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5-20250929",
  aiMode,
  trustProxy: process.env.TRUST_PROXY === "1",
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
  },
} as const;

if (config.isProduction && aiMode === "unavailable") {
  // Keep the HTTP server healthy so /api/health can be used by orchestrators,
  // but make the misconfiguration obvious in logs.
  console.warn(
    "[deutsch-bruecke] ANTHROPIC_API_KEY is missing in production. AI routes will return 503.",
  );
}
