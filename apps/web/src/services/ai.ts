import { z } from "zod";
import { env } from "@/config/env";
import { supabase } from "@/services/supabaseClient";
import type { CefrLevel, DrillTopic, NativeDialect } from "@/types/domain";

/* ------------------------------------------------------------------ */
/* Contracts (mirrors apps/api/src/schemas.ts)                         */
/* ------------------------------------------------------------------ */

const mistakeTypeSchema = z.enum([
  "article",
  "case",
  "verb_position",
  "verb_conjugation",
  "preposition",
  "vocabulary",
  "spelling",
  "punctuation",
  "word_order",
  "register",
  "other",
]);

const mistakeSchema = z.object({
  type: mistakeTypeSchema,
  original: z.string(),
  fix: z.string(),
  explanation_ar: z.string(),
});

const correctionSchema = z.object({
  corrected: z.string(),
  mistakes: z.array(mistakeSchema).max(3),
  praise_ar: z.string(),
  follow_up_question_de: z.string(),
});

const vocabularySuggestionSchema = z.object({
  word: z.string(),
  article: z.enum(["der", "die", "das"]).nullable(),
  plural: z.string().nullable(),
  translation_ar: z.string(),
  example_de: z.string(),
});

const tutorResponseSchema = z.object({
  reply_de: z.string(),
  translation_ar: z.string(),
  correction: correctionSchema,
  vocabulary: z.array(vocabularySuggestionSchema).max(3),
});

const explainResponseSchema = z.object({
  explanation_ar: z.string(),
  examples: z
    .array(z.object({ de: z.string(), ar: z.string() }))
    .max(3)
    .default([]),
});

const simplifyResponseSchema = z.object({
  simplified_de: z.string(),
  translation_ar: z.string(),
});

const translateResponseSchema = z.object({
  translation_ar: z.string(),
});

const wordResponseSchema = z.object({
  word: z.string(),
  article: z.enum(["der", "die", "das"]).nullable(),
  plural: z.string().nullable(),
  part_of_speech: z.string(),
  meaning_ar: z.string(),
  meaning_en: z.string(),
  example_de: z.string(),
  example_ar: z.string(),
});

const generatedKeyVocabSchema = z.object({
  de: z.string(),
  article: z.enum(["der", "die", "das"]).nullable(),
  plural: z.string().nullable(),
  ar: z.string(),
});

const generatedPhraseSchema = z.object({
  de: z.string(),
  ar: z.string(),
});

const generatedScenarioSchema = z.object({
  title_de: z.string(),
  title_ar: z.string(),
  emoji: z.string(),
  setting_ar: z.string(),
  ai_role_de: z.string(),
  learner_role_ar: z.string(),
  goal_ar: z.string(),
  level: z.enum(["A1", "A2", "B1"]),
  formality: z.enum(["du", "Sie"]),
  tone: z.enum(["friendly", "strict"]),
  grammar_focus: z.array(z.string()).min(1).max(4),
  key_vocab: z.array(generatedKeyVocabSchema).min(2).max(8),
  useful_phrases: z.array(generatedPhraseSchema).min(1).max(6),
  opening_message_de: z.string(),
  opening_message_ar: z.string(),
});

const drillTopicSchema = z.enum([
  "articles",
  "cases",
  "prepositions",
  "verb_position",
  "separable_verbs",
  "subordinate_clauses",
  "plurals",
]);

const generatedDrillQuestionSchema = z.object({
  id: z.string(),
  topic: drillTopicSchema,
  grammarTopic: z.enum([
    "articles",
    "cases",
    "word_order",
    "vocabulary",
    "prepositions",
  ]),
  pattern: z.string(),
  level: z.enum(["A1", "A2", "B1"]),
  promptBefore: z.string(),
  promptAfter: z.string(),
  hintAr: z.string(),
  hintEn: z.string(),
  options: z.array(z.string()).length(4),
  correctAnswer: z.string(),
  translationAr: z.string(),
  translationEn: z.string(),
  explanationAr: z.string(),
  explanationEn: z.string(),
  weakSpotAr: z.string(),
  weakSpotEn: z.string(),
});

const drillResponseSchema = z.object({
  questions: z.array(generatedDrillQuestionSchema).min(1).max(10),
  fallbackCount: z.number().int().min(0).max(10),
});

const healthResponseSchema = z.object({
  status: z.string(),
  ai: z.enum(["live", "demo", "unavailable"]),
  timestamp: z.string(),
});

const errorEnvelopeSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});

const quotaSchema = z.object({
  limit: z.number(),
  used: z.number(),
  remaining: z.number(),
});

const entitlementResponseSchema = z.object({
  aiEnabled: z.boolean(),
  betaGate: z.boolean(),
  approved: z.boolean(),
  quotas: z.record(z.string(), quotaSchema),
  resetAt: z.string(),
});

export type AiMode = "live" | "demo" | "unavailable";
export type TutorAiResponse = z.infer<typeof tutorResponseSchema>;
export type ExplainAiResponse = z.infer<typeof explainResponseSchema>;
export type SimplifyAiResponse = z.infer<typeof simplifyResponseSchema>;
export type TranslateAiResponse = z.infer<typeof translateResponseSchema>;
export type WordAiResponse = z.infer<typeof wordResponseSchema>;
export type GeneratedScenario = z.infer<typeof generatedScenarioSchema>;
export type DrillAiQuestion = z.infer<typeof generatedDrillQuestionSchema>;
export type DrillAiResponse = z.infer<typeof drillResponseSchema>;

export type AiFeature =
  | "chat"
  | "scenario"
  | "drill"
  | "word"
  | "assist"
  | "recap";

export interface AiQuota {
  limit: number;
  used: number;
  remaining: number;
}

export interface AiEntitlement {
  aiEnabled: boolean;
  betaGate: boolean;
  approved: boolean;
  quotas: Partial<Record<AiFeature, AiQuota>>;
  resetAt: string;
}

export interface ScenarioGenerationInput {
  idea: string;
  level?: CefrLevel;
  formality?: "du" | "Sie";
  tone: "friendly" | "strict";
  forceRegenerate?: boolean;
}

export interface DrillGenerationInput {
  topic: DrillTopic;
  level: CefrLevel;
  weakSpots: Array<{
    pattern: string;
    count: number;
    labelAr?: string;
    labelEn?: string;
  }>;
  forceRegenerate?: boolean;
}

export class AiRequestError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    status = 0,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AiRequestError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

interface SuccessEnvelope<T> {
  ok: true;
  data: T;
  meta?: { mode?: AiMode; cached?: boolean };
}

const successEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    ok: z.literal(true),
    data: dataSchema,
    meta: z
      .object({
        mode: z.enum(["live", "demo", "unavailable"]).optional(),
        cached: z.boolean().optional(),
      })
      .optional(),
  }) as z.ZodType<SuccessEnvelope<z.infer<T>>>;

async function authHeaders(hasBody: boolean): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (hasBody) headers["Content-Type"] = "application/json";

  const token = supabase
    ? (await supabase.auth.getSession()).data.session?.access_token
    : undefined;

  if (token) {
    headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  // Local-only escape hatch: the API is running with AUTH_BYPASS_DEV=true and
  // there is no Supabase project, so there is no token to send.
  if (env.aiDevBypass) return headers;

  throw new AiRequestError("auth_required", "Sign in to use the AI tutor.", 401);
}

function notifyUsageChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("ai-usage-changed"));
}

async function request<T>(
  path: string,
  dataSchema: z.ZodType<T>,
  options: {
    method?: "GET" | "POST";
    body?: unknown;
    timeoutMs?: number;
    /** Health is public; every AI endpoint requires a Supabase token. */
    auth?: boolean;
    /** Refresh the quota meter after a successful call. */
    notifyUsage?: boolean;
  } = {},
): Promise<{ data: T; mode: AiMode | "unknown"; cached: boolean }> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 45_000,
  );

  try {
    const headers =
      options.auth === false
        ? options.body
          ? { "Content-Type": "application/json" }
          : undefined
        : await authHeaders(Boolean(options.body));

    const response = await fetch(`${env.apiBaseUrl}${path}`, {
      method: options.method ?? "POST",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      credentials: "same-origin",
    });

    const raw: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const parsedError = errorEnvelopeSchema.safeParse(raw);
      throw new AiRequestError(
        parsedError.success ? parsedError.data.error.code : "http_error",
        parsedError.success
          ? parsedError.data.error.message
          : "The tutor service refused the request.",
        response.status,
        parsedError.success ? parsedError.data.error.details : undefined,
      );
    }

    const envelope = successEnvelopeSchema(dataSchema).safeParse(raw);
    if (!envelope.success) {
      throw new AiRequestError(
        "invalid_response",
        "The tutor service returned an unexpected answer.",
        502,
      );
    }

    if (options.notifyUsage !== false) notifyUsageChanged();

    return {
      data: envelope.data.data,
      mode: envelope.data.meta?.mode ?? "unknown",
      cached: Boolean(envelope.data.meta?.cached),
    };
  } catch (error) {
    if (error instanceof AiRequestError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AiRequestError("timeout", "The tutor took too long to answer.");
    }
    throw new AiRequestError(
      "network",
      "Could not reach the tutor service. Check your connection.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

/* ------------------------------------------------------------------ */
/* Public calls                                                        */
/* ------------------------------------------------------------------ */

export interface TutorTurnInput {
  scenarioId: string;
  level: CefrLevel;
  dialect: NativeDialect;
  safeMode: boolean;
  learnerMessage: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  customScenario?: GeneratedScenario;
}

export async function requestTutorTurn(input: TutorTurnInput) {
  return request("/chat", tutorResponseSchema, {
    body: input,
    timeoutMs: 60_000,
  });
}

export async function requestScenarioGeneration(
  input: ScenarioGenerationInput,
) {
  return request("/scenarios/generate", generatedScenarioSchema, {
    body: input,
    timeoutMs: 60_000,
  });
}

export async function requestDrillGeneration(input: DrillGenerationInput) {
  return request("/drills/generate", drillResponseSchema, {
    body: input,
    timeoutMs: 75_000,
  });
}

export async function requestExplanation(input: {
  text: string;
  level: CefrLevel;
  dialect: NativeDialect;
}) {
  return request("/assist", explainResponseSchema, {
    body: { action: "explain", ...input },
  });
}

export async function requestSimplification(input: {
  text: string;
  level: CefrLevel;
  dialect: NativeDialect;
}) {
  return request("/assist", simplifyResponseSchema, {
    body: { action: "simplify", ...input },
  });
}

export async function requestTranslation(input: {
  text: string;
  level: CefrLevel;
  dialect: NativeDialect;
}) {
  return request("/assist", translateResponseSchema, {
    body: { action: "translate", ...input },
  });
}

export async function requestWord(input: {
  word: string;
  context: string;
  level: CefrLevel;
}) {
  return request("/word", wordResponseSchema, {
    body: input,
    timeoutMs: 30_000,
  });
}

export async function fetchAiHealth(): Promise<{
  reachable: boolean;
  mode: AiMode;
}> {
  try {
    const { data } = await request("/health", healthResponseSchema, {
      method: "GET",
      timeoutMs: 8_000,
      auth: false,
      notifyUsage: false,
    });
    return { reachable: true, mode: data.ai };
  } catch {
    return { reachable: false, mode: "unavailable" };
  }
}

export function isRateLimitError(error: unknown): boolean {
  return error instanceof AiRequestError && error.code === "rate_limited";
}

export function isNetworkError(error: unknown): boolean {
  return (
    error instanceof AiRequestError &&
    (error.code === "network" || error.code === "timeout")
  );
}

export function isAuthError(error: unknown): boolean {
  return (
    error instanceof AiRequestError &&
    (error.code === "auth_required" || error.code === "invalid_token")
  );
}

export function isBetaGateError(error: unknown): boolean {
  return error instanceof AiRequestError && error.code === "beta_not_approved";
}

export function isQuotaExhaustedError(error: unknown): boolean {
  return error instanceof AiRequestError && error.code === "quota_exhausted";
}

/** Service-level states that should render a calm "try again later" message. */
export function isAiUnavailableError(error: unknown): boolean {
  return (
    error instanceof AiRequestError &&
    [
      "ai_disabled",
      "ai_global_cap",
      "ai_access_unavailable",
      "auth_unavailable",
      "ai_upstream_unavailable",
      "ai_upstream_error",
      "ai_provider_quota",
      "ai_provider_auth",
      "ai_timeout",
    ].includes(error.code)
  );
}

/* ------------------------------------------------------------------ */
/* Phase 2: entitlement + invite code                                  */
/* ------------------------------------------------------------------ */

export async function fetchAiEntitlement(): Promise<AiEntitlement> {
  const { data } = await request("/ai/entitlement", entitlementResponseSchema, {
    method: "GET",
    timeoutMs: 10_000,
    notifyUsage: false,
  });

  const quotas: Partial<Record<AiFeature, AiQuota>> = {};
  for (const [feature, quota] of Object.entries(data.quotas)) {
    quotas[feature as AiFeature] = quota;
  }

  return {
    aiEnabled: data.aiEnabled,
    betaGate: data.betaGate,
    approved: data.approved,
    quotas,
    resetAt: data.resetAt,
  };
}

export async function redeemInviteCode(
  code: string,
): Promise<{ ok: boolean; reason?: string }> {
  if (!supabase) throw new AiRequestError("auth_required", "Sign in first.", 401);
  const { data, error } = await supabase.rpc("redeem_invite", {
    p_code: code.trim(),
  });
  if (error) {
    throw new AiRequestError("invite_redeem_failed", error.message);
  }
  const payload = data as { ok?: unknown; reason?: unknown } | null;
  return {
    ok: payload?.ok === true,
    ...(typeof payload?.reason === "string" ? { reason: payload.reason } : {}),
  };
}
