import type { RequestHandler } from "express";
import { AppError } from "../lib/errors.js";
import type {
  AiAccessStore,
  AiFeature,
  AuthVerifier,
} from "../services/supabaseAccess.js";

/**
 * Route guards for every AI endpoint.
 *
 * Order used in app.ts:
 *   kill switch → auth → per-IP limiter → per-user/beta/global quota → handler
 *
 * All DB-dependent checks fail closed: if Supabase is paused or unreachable the
 * learner gets a clear "service waking up" error instead of unmetered AI.
 */

export const DEV_BYPASS_USER_ID = "dev-auth-bypass-user";

export const AUTH_REQUIRED_MESSAGE =
  "سجّل الدخول الأول عشان تستخدم المدرّس الذكي. باقي التطبيق شغال عادي كضيف.";
export const AI_DISABLED_MESSAGE =
  "خدمة المدرّس متوقفة مؤقتًا. جرّب تاني بعد شوية.";
export const GLOBAL_CAP_MESSAGE =
  "الخدمة وصلت للحد اليومي الكلي. جرّب تاني بكرة.";
export const BETA_REQUIRED_MESSAGE =
  "المدرّس متاح للمستخدمين المدعوين بس في مرحلة التجربة. دخّل كود الدعوة عشان تكمّل.";
export const ACCESS_UNAVAILABLE_MESSAGE =
  "خدمة المدرّس صاحية دلوقتي. جرّب تاني بعد دقيقة.";

const FEATURE_LABEL_AR: Record<AiFeature, string> = {
  chat: "المحادثة",
  scenario: "توليد السيناريوهات",
  drill: "تمارين القواعد",
  word: "كلمات المفردات",
  assist: "الشرح والترجمة",
  recap: "ملخص الجلسة",
};

export function nextUtcMidnightIso(): string {
  const now = new Date();
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0,
    ),
  ).toISOString();
}

export function aiKillSwitch(disabled: boolean): RequestHandler {
  return (_req, _res, next) => {
    if (disabled) {
      next(
        new AppError(503, "ai_disabled", AI_DISABLED_MESSAGE, {
          retryAfterSeconds: 60,
        }),
      );
      return;
    }
    next();
  };
}

export function requireAuth(options: {
  verifier: AuthVerifier;
  bypass: boolean;
}): RequestHandler {
  return (req, res, next) => {
    if (options.bypass) {
      res.locals.authUserId = DEV_BYPASS_USER_ID;
      res.locals.authAccessToken = "";
      next();
      return;
    }

    const header = req.header("authorization")?.trim() ?? "";
    const match = /^Bearer\s+(.+)$/i.exec(header);
    const token = match?.[1]?.trim() ?? "";
    if (!token) {
      next(new AppError(401, "auth_required", AUTH_REQUIRED_MESSAGE));
      return;
    }

    void options.verifier
      .verify(token)
      .then((user) => {
        res.locals.authUserId = user.id;
        res.locals.authAccessToken = token;
        next();
      })
      .catch(next);
  };
}

export function requireAiAccess(options: {
  access: AiAccessStore;
  feature: AiFeature;
  limit: number;
  betaGate: boolean;
  globalCap: number;
  bypass: boolean;
}): RequestHandler {
  return (_req, res, next) => {
    if (options.bypass) {
      res.locals.aiQuota = {
        allowed: true,
        reason: "ok",
        approved: true,
        used: 0,
        limit: options.limit,
        remaining: options.limit,
      };
      next();
      return;
    }

    const userId = res.locals.authUserId as string | undefined;
    const accessToken = res.locals.authAccessToken as string | undefined;
    if (!userId || !accessToken) {
      next(new AppError(401, "auth_required", AUTH_REQUIRED_MESSAGE));
      return;
    }

    void options.access
      .consume({
        userId,
        accessToken,
        feature: options.feature,
        limit: options.limit,
        betaGate: options.betaGate,
        globalCap: options.globalCap,
      })
      .then((decision) => {
        res.locals.aiQuota = decision;

        if (decision.allowed) {
          res.locals.aiQuotaConsumed = true;
          res.locals.aiQuotaFeature = options.feature;
          res.locals.aiQuotaLimit = options.limit;
          next();
          return;
        }

        if (decision.reason === "beta_not_approved") {
          next(new AppError(403, "beta_not_approved", BETA_REQUIRED_MESSAGE));
          return;
        }

        if (decision.reason === "quota_exhausted") {
          next(
            new AppError(
              429,
              "quota_exhausted",
              `خلصت حصتك اليومية من ${FEATURE_LABEL_AR[options.feature]}. حصتك بتتجدد بكرة (بالتوقيت العالمي UTC).`,
              {
                feature: options.feature,
                limit: decision.limit,
                remaining: 0,
                resetAt: nextUtcMidnightIso(),
              },
            ),
          );
          return;
        }

        if (decision.reason === "global_cap") {
          next(new AppError(503, "ai_global_cap", GLOBAL_CAP_MESSAGE));
          return;
        }

        if (decision.reason === "invalid_token") {
          next(
            new AppError(
              401,
              "invalid_token",
              "انتهت صلاحية الجلسة. سجّل الدخول تاني وكمّل.",
            ),
          );
          return;
        }

        next(new AppError(503, "ai_access_unavailable", ACCESS_UNAVAILABLE_MESSAGE));
      })
      .catch(next);
  };
}
