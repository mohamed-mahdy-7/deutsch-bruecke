import { config } from "../config.js";
import { AppError } from "../lib/errors.js";

/**
 * Phase 2 access-control plumbing.
 *
 * The API talks to Supabase over its REST/Auth HTTP endpoints:
 *   * `GET  /auth/v1/user`              — verify the caller's access token
 *   * `POST /rest/v1/rpc/consume_ai_call` — atomic beta gate + quota + cap
 *   * `POST /rest/v1/rpc/get_ai_entitlement` — read-only quota meter data
 *
 * Only the public anon key is used. The learner's own JWT is forwarded, so
 * SECURITY DEFINER functions see `auth.uid()` and no service_role key is
 * required anywhere in this codebase.
 */

export type AiFeature =
  | "chat"
  | "scenario"
  | "drill"
  | "word"
  | "assist"
  | "recap";

export const AI_FEATURES: readonly AiFeature[] = [
  "chat",
  "scenario",
  "drill",
  "word",
  "assist",
  "recap",
];

export interface AuthUser {
  id: string;
  email?: string;
}

export interface AuthVerifier {
  verify(accessToken: string): Promise<AuthUser>;
}

export type QuotaReason =
  | "ok"
  | "auth_required"
  | "invalid_token"
  | "beta_not_approved"
  | "quota_exhausted"
  | "global_cap";

export interface QuotaDecision {
  allowed: boolean;
  reason: QuotaReason;
  approved: boolean;
  used: number;
  limit: number;
  remaining: number;
  globalUsed?: number;
}

export interface AiEntitlement {
  approved: boolean;
  usage: Partial<Record<AiFeature, number>>;
}

export interface AiAccessStore {
  consume(input: {
    userId: string;
    accessToken: string;
    feature: AiFeature;
    limit: number;
    betaGate: boolean;
    globalCap: number;
  }): Promise<QuotaDecision>;
  entitlement(input: {
    userId: string;
    accessToken: string;
  }): Promise<AiEntitlement>;
}

const AUTH_CACHE_TTL_MS = 30_000;
const AUTH_CACHE_MAX = 500;
const authCache = new Map<string, { user: AuthUser; expiresAt: number }>();

const AUTH_REQUIRED_MESSAGE =
  "سجّل الدخول الأول عشان تستخدم المدرّس الذكي. باقي التطبيق شغال عادي كضيف.";
const INVALID_TOKEN_MESSAGE =
  "انتهت صلاحية الجلسة. سجّل الدخول تاني وكمّل.";
const SERVICE_UNAVAILABLE_MESSAGE =
  "خدمة الحساب مش متاحة دلوقتي. جرّب تاني بعد دقيقة.";

function unconfigured(): AppError {
  return new AppError(503, "auth_unavailable", SERVICE_UNAVAILABLE_MESSAGE);
}

function accessUnavailable(): AppError {
  return new AppError(
    503,
    "ai_access_unavailable",
    "خدمة الحصص مش متاحة دلوقتي. جرّب تاني بعد دقيقة.",
  );
}

interface SupabaseStoreOptions {
  /** Test-only overrides. Production always uses config values. */
  supabaseUrl?: string;
  anonKey?: string;
}

function resolveStoreOptions(options: SupabaseStoreOptions = {}): {
  url: string;
  anonKey: string;
} {
  return {
    url: options.supabaseUrl ?? config.supabaseUrl,
    anonKey: options.anonKey ?? config.supabaseAnonKey,
  };
}

function baseHeaders(
  accessToken: string | undefined,
  anonKey: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: anonKey,
    "content-type": "application/json",
  };
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;
  return headers;
}

async function postgrest(
  path: string,
  body: unknown,
  accessToken: string,
  options: SupabaseStoreOptions,
): Promise<Response> {
  const { url, anonKey } = resolveStoreOptions(options);
  if (!url || !anonKey) throw unconfigured();
  try {
    return await fetch(`${url}${path}`, {
      method: "POST",
      headers: baseHeaders(accessToken, anonKey),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    // Network failure, DNS failure or timeout: fail closed without leaking
    // connection details to the browser.
    throw accessUnavailable();
  }
}

/** Verifies a Supabase access token against the Auth server. */
export function createSupabaseAuthVerifier(
  options: SupabaseStoreOptions = {},
): AuthVerifier {
  const { url, anonKey } = resolveStoreOptions(options);

  return {
    async verify(accessToken: string): Promise<AuthUser> {
      if (!accessToken) {
        throw new AppError(401, "auth_required", AUTH_REQUIRED_MESSAGE);
      }
      if (!url || !anonKey) throw unconfigured();

      const cached = authCache.get(accessToken);
      if (cached && cached.expiresAt > Date.now()) return cached.user;

      let response: Response;
      try {
        response = await fetch(`${url}/auth/v1/user`, {
          method: "GET",
          headers: baseHeaders(accessToken, anonKey),
          signal: AbortSignal.timeout(8_000),
        });
      } catch {
        throw unconfigured();
      }

      if (response.status === 401 || response.status === 403) {
        throw new AppError(401, "invalid_token", INVALID_TOKEN_MESSAGE);
      }
      if (!response.ok) throw unconfigured();

      const payload = (await response.json().catch(() => null)) as
        | { id?: unknown; email?: unknown }
        | null;
      if (!payload || typeof payload.id !== "string" || !payload.id) {
        throw new AppError(401, "invalid_token", INVALID_TOKEN_MESSAGE);
      }

      const user: AuthUser = {
        id: payload.id,
        ...(typeof payload.email === "string" ? { email: payload.email } : {}),
      };

      if (authCache.size >= AUTH_CACHE_MAX) {
        const oldest = authCache.keys().next().value;
        if (oldest !== undefined) authCache.delete(oldest);
      }
      authCache.set(accessToken, {
        user,
        expiresAt: Date.now() + AUTH_CACHE_TTL_MS,
      });
      return user;
    },
  };
}

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Database-backed quota store using SECURITY DEFINER RPCs. */
export function createSupabaseAccessStore(
  options: SupabaseStoreOptions = {},
): AiAccessStore {
  const { url, anonKey } = resolveStoreOptions(options);

  return {
    async consume(input): Promise<QuotaDecision> {
      if (!url || !anonKey) throw unconfigured();

      const response = await postgrest(
        "/rest/v1/rpc/consume_ai_call",
        {
          p_feature: input.feature,
          p_user_limit: input.limit,
          p_global_cap: input.globalCap,
          p_beta_gate: input.betaGate,
        },
        input.accessToken,
        options,
      );

      if (response.status === 401 || response.status === 403) {
        throw new AppError(401, "invalid_token", INVALID_TOKEN_MESSAGE);
      }
      if (!response.ok) {
        console.warn("ai_access_rpc_failed", {
          rpc: "consume_ai_call",
          status: response.status,
        });
        throw accessUnavailable();
      }

      const payload = (await response.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      if (!payload) throw accessUnavailable();

      const reason = String(payload.reason ?? "quota_exhausted");
      const allowed = payload.allowed === true && reason === "ok";
      const approved = payload.approved === true;
      const used = toNumber(payload.used);
      const limit = toNumber(payload.limit, input.limit);
      const remaining = Math.max(0, toNumber(payload.remaining));

      if (
        !allowed &&
        reason !== "beta_not_approved" &&
        reason !== "quota_exhausted" &&
        reason !== "global_cap"
      ) {
        // Unknown/absent reason means the migration is missing or the function
        // returned something unexpected. Fail closed.
        throw accessUnavailable();
      }

      return {
        allowed,
        reason: allowed ? "ok" : (reason as QuotaReason),
        approved,
        used,
        limit,
        remaining,
        ...(typeof payload.global_used === "number"
          ? { globalUsed: payload.global_used }
          : {}),
      };
    },

    async entitlement(input): Promise<AiEntitlement> {
      if (!url || !anonKey) throw unconfigured();

      const response = await postgrest(
        "/rest/v1/rpc/get_ai_entitlement",
        {},
        input.accessToken,
        options,
      );
      if (response.status === 401 || response.status === 403) {
        throw new AppError(401, "invalid_token", INVALID_TOKEN_MESSAGE);
      }
      if (!response.ok) {
        console.warn("ai_access_rpc_failed", {
          rpc: "get_ai_entitlement",
          status: response.status,
        });
        throw accessUnavailable();
      }

      const payload = (await response.json().catch(() => null)) as {
        approved?: unknown;
        usage?: unknown;
      } | null;
      if (!payload) throw accessUnavailable();

      const usage: Partial<Record<AiFeature, number>> = {};
      if (payload.usage && typeof payload.usage === "object") {
        for (const feature of AI_FEATURES) {
          const value = (payload.usage as Record<string, unknown>)[feature];
          if (typeof value === "number" && Number.isFinite(value)) {
            usage[feature] = value;
          }
        }
      }

      return { approved: payload.approved === true, usage };
    },
  };
}

/** Test/dev helper: an always-allowed store with no database dependency. */
export function createPermissiveAccessStore(): AiAccessStore {
  return {
    async consume(input) {
      return {
        allowed: true,
        reason: "ok",
        approved: true,
        used: 1,
        limit: input.limit,
        remaining: Math.max(0, input.limit - 1),
      };
    },
    async entitlement() {
      return { approved: true, usage: {} };
    },
  };
}

/** Clears the token cache — used by tests to avoid cross-test leakage. */
export function resetAuthCache(): void {
  authCache.clear();
}
