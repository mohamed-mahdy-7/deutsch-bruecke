import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { KeyRound, RefreshCw, Sparkles } from "lucide-react";
import type { TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAppPreferences } from "@/state/useAppPreferences";
import { useAiAccess } from "@/state/AiAccessProvider";
import {
  AiRequestError,
  isAiUnavailableError,
  isAuthError,
  isBetaGateError,
  isQuotaExhaustedError,
  redeemInviteCode,
  type AiFeature,
} from "@/services/ai";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonCn } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Field, inputCn } from "@/components/ui/Field";
import { ProgressBar } from "@/components/ui/Progress";

export type AiBlockKind =
  | "loading"
  | "signed_out"
  | "beta_required"
  | "quota_exhausted"
  | "unavailable";

const FEATURE_LABEL_KEY: Record<AiFeature, TranslationKey> = {
  chat: "ai.featureChat",
  scenario: "ai.featureScenario",
  drill: "ai.featureDrill",
  word: "ai.featureWord",
  assist: "ai.featureAssist",
  recap: "ai.featureRecap",
};

/**
 * Map a failed AI request to the calm explanation the learner should see.
 * Unknown errors return null so each feature keeps its own copy.
 */
export function aiBlockKindForError(error: unknown): AiBlockKind | null {
  if (!(error instanceof AiRequestError)) return null;
  if (isAuthError(error)) return "signed_out";
  if (isBetaGateError(error)) return "beta_required";
  if (isQuotaExhaustedError(error)) return "quota_exhausted";
  if (isAiUnavailableError(error)) return "unavailable";
  return null;
}

export function InviteCodeForm({ compact = false }: { compact?: boolean }) {
  const { t } = useAppPreferences();
  const { refresh } = useAiAccess();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    tone: "success" | "danger";
    key: TranslationKey;
  } | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = code.trim();
    if (!value || busy) return;

    setBusy(true);
    setMessage(null);
    try {
      const result = await redeemInviteCode(value);
      if (result.ok) {
        setMessage({ tone: "success", key: "ai.inviteSuccess" });
        setCode("");
        await refresh();
        return;
      }
      const reason = result.reason;
      setMessage({
        tone: "danger",
        key:
          reason === "expired"
            ? "ai.inviteExpired"
            : reason === "used_up"
              ? "ai.inviteUsedUp"
              : reason === "invalid_code"
                ? "ai.inviteInvalid"
                : "ai.inviteError",
      });
    } catch {
      setMessage({ tone: "danger", key: "ai.inviteError" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} className={cn("space-y-2", !compact && "mt-3")}>
      <Field label={t("ai.inviteLabel")} htmlFor="ai-invite-code">
        <input
          id="ai-invite-code"
          dir="ltr"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder={t("ai.invitePlaceholder")}
          autoComplete="off"
          autoCapitalize="characters"
          className={cn(inputCn, "ltr-field uppercase tracking-wide")}
          disabled={busy}
        />
      </Field>
      {message ? (
        <p
          role={message.tone === "danger" ? "alert" : "status"}
          className={cn(
            "text-xs font-bold",
            message.tone === "success" ? "text-success" : "text-danger",
          )}
        >
          {t(message.key)}
        </p>
      ) : null}
      <Button
        type="submit"
        size="sm"
        loading={busy}
        disabled={!code.trim()}
        icon={<KeyRound className="h-3.5 w-3.5" aria-hidden="true" />}
      >
        {t("ai.inviteSubmit")}
      </Button>
    </form>
  );
}

/**
 * One calm, actionable message for every non-ready state. Used both as a page
 * gate and as an inline banner when a request fails mid-session.
 */
export function AiAccessNotice({
  kind,
  feature,
  compact = false,
  className,
}: {
  kind: AiBlockKind;
  feature: AiFeature;
  compact?: boolean;
  className?: string;
}) {
  const { t } = useAppPreferences();
  const { refresh } = useAiAccess();

  if (kind === "loading") {
    return (
      <div
        role="status"
        className={cn(
          "flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 text-xs font-bold text-muted-foreground",
          className,
        )}
      >
        <Spinner className="h-4 w-4" />
        {t("ai.gateLoading")}
      </div>
    );
  }

  if (kind === "signed_out") {
    return (
      <Alert
        tone="info"
        title={t("ai.gateSignInTitle")}
        className={className}
        action={
          <Link to="/auth" className={buttonCn("primary", "sm")}>
            {t("ai.gateSignInCta")}
          </Link>
        }
      >
        {t("ai.gateSignInBody")}
      </Alert>
    );
  }

  if (kind === "beta_required") {
    return (
      <Alert
        tone="info"
        title={t("ai.gateBetaTitle")}
        className={className}
        action={
          <span className="hidden h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary sm:inline-flex">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
        }
      >
        <p>{t("ai.gateBetaBody")}</p>
        <InviteCodeForm compact={compact} />
        <p className="mt-2 text-xs text-muted-foreground">{t("ai.gateBetaHint")}</p>
      </Alert>
    );
  }

  if (kind === "quota_exhausted") {
    return (
      <Alert tone="warning" title={t("ai.gateQuotaTitle")} className={className}>
        <p>{t("ai.gateQuotaBody", { feature: t(FEATURE_LABEL_KEY[feature]) })}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("ai.gateQuotaHint")}</p>
      </Alert>
    );
  }

  return (
    <Alert
      tone="warning"
      title={t("ai.gateUnavailableTitle")}
      className={className}
      action={
        <Button
          size="sm"
          variant="outline"
          onClick={() => void refresh()}
          icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          {t("ai.retry")}
        </Button>
      }
    >
      {t("ai.gateUnavailableBody")}
    </Alert>
  );
}

/** Renders children only when AI calls are allowed; otherwise explains why. */
export function AiGate({
  feature,
  children,
  compact,
  className,
}: {
  feature: AiFeature;
  children: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  const { status } = useAiAccess();
  if (status === "ready") return <>{children}</>;

  return (
    <AiAccessNotice
      kind={status === "loading" ? "loading" : status}
      feature={feature}
      compact={compact}
      className={className}
    />
  );
}

function QuotaRow({ feature }: { feature: AiFeature }) {
  const { t } = useAppPreferences();
  const { entitlement } = useAiAccess();
  const quota = entitlement?.quotas[feature];
  if (!quota) return null;

  const exhausted = quota.remaining <= 0;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="font-bold">{t(FEATURE_LABEL_KEY[feature])}</span>
        <span
          className={cn(
            "tnum font-bold",
            exhausted ? "text-warning" : "text-muted-foreground",
          )}
        >
          {exhausted
            ? t("ai.quotaUsedUp")
            : t("ai.quotaRemaining", {
                remaining: quota.remaining,
                limit: quota.limit,
              })}
        </span>
      </div>
      <ProgressBar
        value={quota.used}
        max={Math.max(quota.limit, 1)}
        tone={exhausted ? "warning" : "primary"}
        className="h-1.5"
        label={t(FEATURE_LABEL_KEY[feature])}
      />
    </div>
  );
}

const QUOTA_ORDER: AiFeature[] = [
  "chat",
  "scenario",
  "drill",
  "assist",
  "word",
  "recap",
];

/** Compact daily quota panel for the profile page. */
export function AiQuotaSummary({ className }: { className?: string }) {
  const { t } = useAppPreferences();
  const { status, entitlement, devBypass } = useAiAccess();

  if (status !== "ready" || !entitlement) {
    const kind: AiBlockKind = status === "ready" ? "unavailable" : status;
    return <AiAccessNotice kind={kind} feature="chat" className={className} />;
  }

  return (
    <div className={cn("space-y-2.5", className)}>
      <p className="text-xs font-bold text-muted-foreground">{t("ai.quotaTitle")}</p>
      {QUOTA_ORDER.map((feature) => (
        <QuotaRow key={feature} feature={feature} />
      ))}
      <p className="text-[0.7rem] text-muted-foreground">
        {t("ai.quotaResetNote")}
        {devBypass ? ` · ${t("ai.quotaDevBypass")}` : ""}
      </p>
    </div>
  );
}
