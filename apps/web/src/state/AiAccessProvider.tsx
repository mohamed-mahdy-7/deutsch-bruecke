import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { env, isSupabaseConfigured } from "@/config/env";
import { useAuth } from "@/state/AuthProvider";
import {
  fetchAiEntitlement,
  isAuthError,
  type AiEntitlement,
  type AiFeature,
} from "@/services/ai";

/**
 * Phase 2: the single source of truth for whether the signed-in learner may
 * use AI right now. The server remains authoritative — this context only
 * mirrors the entitlement so the UI can explain *why* a call would fail
 * before the learner types a message.
 */
export type AiAccessStatus =
  | "loading"
  | "ready"
  | "signed_out"
  | "beta_required"
  | "unavailable";

export interface AiAccessContextValue {
  status: AiAccessStatus;
  entitlement: AiEntitlement | null;
  /** True when local development runs without Supabase (never in deploy). */
  devBypass: boolean;
  refresh: () => Promise<void>;
  /** Remaining calls today, or null when the server did not report a quota. */
  remaining: (feature: AiFeature) => number | null;
  canUse: (feature: AiFeature) => boolean;
}

const AiAccessContext = createContext<AiAccessContextValue | null>(null);

export function AiAccessProvider({ children }: { children: ReactNode }) {
  const { mode } = useAuth();
  const devBypass = env.aiDevBypass && !isSupabaseConfigured;
  const [status, setStatus] = useState<AiAccessStatus>("loading");
  const [entitlement, setEntitlement] = useState<AiEntitlement | null>(null);
  const requestSeq = useRef(0);

  const load = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (mode === "loading") return;

      const seq = requestSeq.current + 1;
      requestSeq.current = seq;

      if (devBypass) {
        // No Supabase locally: never block the developer. If the API is
        // unreachable the AI pages already show their own connection errors.
        try {
          const next = await fetchAiEntitlement();
          if (requestSeq.current === seq) {
            setEntitlement(next);
            setStatus(next.aiEnabled ? "ready" : "unavailable");
          }
        } catch {
          if (requestSeq.current === seq) {
            setEntitlement(null);
            setStatus("ready");
          }
        }
        return;
      }

      if (!isSupabaseConfigured || mode !== "authenticated") {
        setEntitlement(null);
        setStatus("signed_out");
        return;
      }

      if (!options.silent) setStatus("loading");

      try {
        const next = await fetchAiEntitlement();
        if (requestSeq.current !== seq) return;
        setEntitlement(next);
        if (!next.aiEnabled) {
          setStatus("unavailable");
        } else if (next.betaGate && !next.approved) {
          setStatus("beta_required");
        } else {
          setStatus("ready");
        }
      } catch (error) {
        if (requestSeq.current !== seq) return;
        setEntitlement(null);
        setStatus(isAuthError(error) ? "signed_out" : "unavailable");
      }
    },
    [devBypass, mode],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Every successful AI call dispatches this event so the meter stays honest
  // without each page knowing the quota model.
  useEffect(() => {
    const onUsageChanged = () => void load({ silent: true });
    window.addEventListener("ai-usage-changed", onUsageChanged);

    const onVisible = () => {
      if (document.visibilityState === "visible") void load({ silent: true });
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("ai-usage-changed", onUsageChanged);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const remaining = useCallback(
    (feature: AiFeature) => entitlement?.quotas[feature]?.remaining ?? null,
    [entitlement],
  );

  const canUse = useCallback(
    (feature: AiFeature) => status === "ready" && (remaining(feature) ?? 1) > 0,
    [remaining, status],
  );

  const value = useMemo<AiAccessContextValue>(
    () => ({
      status,
      entitlement,
      devBypass,
      refresh: () => load({ silent: true }),
      remaining,
      canUse,
    }),
    [status, entitlement, devBypass, load, remaining, canUse],
  );

  return (
    <AiAccessContext.Provider value={value}>{children}</AiAccessContext.Provider>
  );
}

export function useAiAccess(): AiAccessContextValue {
  const value = useContext(AiAccessContext);
  if (!value) throw new Error("useAiAccess must be used inside AiAccessProvider");
  return value;
}
