import type { ProgressState } from "@/types/domain";
import { safeJsonParse } from "@/lib/utils";

const STORAGE_KEY = "deutsch-bruecke:progress:v1";

interface StoredEnvelope {
  version: 1;
  savedAt: string;
  state: ProgressState;
}

function isUsableProgress(value: unknown): value is ProgressState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ProgressState>;
  return (
    candidate.version === 1 &&
    typeof candidate.ownerId === "string" &&
    Boolean(candidate.profile) &&
    typeof candidate.profile?.onboardingCompleted === "boolean" &&
    Array.isArray(candidate.weakSpots) &&
    Array.isArray(candidate.vocabCards) &&
    Array.isArray(candidate.drillResults) &&
    Array.isArray(candidate.conversations) &&
    Array.isArray(candidate.activity) &&
    Boolean(candidate.streak) &&
    typeof candidate.xp === "number"
  );
}

export function readLocalProgress(): ProgressState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = safeJsonParse<StoredEnvelope>(raw);
    if (!parsed || parsed.version !== 1) return null;
    return isUsableProgress(parsed.state) ? parsed.state : null;
  } catch {
    return null;
  }
}

export function writeLocalProgress(state: ProgressState): boolean {
  try {
    const envelope: StoredEnvelope = {
      version: 1,
      savedAt: new Date().toISOString(),
      state,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    return true;
  } catch (error) {
    // Quota errors and blocked storage should not crash the learning session.
    console.warn("[storage] Could not save local progress:", error);
    return false;
  }
}

export function clearLocalProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}
