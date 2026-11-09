import { z } from "zod";
import type { CustomScenario } from "@/types/domain";
import { safeJsonParse } from "@/lib/utils";

const keyVocabRecordSchema = z.object({
  de: z.string().trim().min(1).max(60),
  article: z.enum(["der", "die", "das"]).nullable(),
  plural: z.string().trim().max(80).nullable(),
  ar: z.string().trim().min(1).max(120),
});

const phraseRecordSchema = z.object({
  de: z.string().trim().min(1).max(160),
  ar: z.string().trim().min(1).max(160),
});

/**
 * Runtime guard for guest storage and Supabase JSONB. It mirrors the API
 * contract so a hand-edited localStorage entry can never reach the chat request.
 */
export const customScenarioRecordSchema = z.object({
  id: z.string().trim().min(1).max(80),
  titleDe: z.string().trim().min(1).max(80),
  titleAr: z.string().trim().min(1).max(80),
  emoji: z.string().trim().min(1).max(16),
  settingAr: z.string().trim().min(1).max(400),
  aiRoleDe: z.string().trim().min(1).max(160),
  learnerRoleAr: z.string().trim().min(1).max(240),
  goalAr: z.string().trim().min(1).max(400),
  level: z.enum(["A1", "A2", "B1"]),
  formality: z.enum(["du", "Sie"]),
  tone: z.enum(["friendly", "strict"]),
  grammarFocus: z.array(z.string().trim().min(1).max(80)).min(1).max(4),
  keyVocab: z.array(keyVocabRecordSchema).min(2).max(8),
  usefulPhrases: z.array(phraseRecordSchema).min(1).max(6),
  openingDe: z.string().trim().min(1).max(400),
  openingAr: z.string().trim().min(1).max(400),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

const envelopeSchema = z.object({
  version: z.literal(1),
  savedAt: z.string(),
  scenarios: z.array(z.unknown()),
});

const STORAGE_PREFIX = "deutsch-bruecke:custom-scenarios:v1";

export function customScenarioStorageKey(ownerId: string): string {
  return `${STORAGE_PREFIX}:${ownerId}`;
}

export function parseCustomScenario(value: unknown): CustomScenario | null {
  const parsed = customScenarioRecordSchema.safeParse(value);
  if (!parsed.success || !parsed.data.id.startsWith("custom_")) return null;
  return parsed.data as CustomScenario;
}

export function readLocalCustomScenarios(ownerId: string): CustomScenario[] {
  try {
    const raw = localStorage.getItem(customScenarioStorageKey(ownerId));
    const parsed = safeJsonParse<unknown>(raw);
    const envelope = envelopeSchema.safeParse(parsed);
    if (!envelope.success) return [];
    return envelope.data.scenarios
      .map(parseCustomScenario)
      .filter((scenario): scenario is CustomScenario => scenario !== null);
  } catch {
    return [];
  }
}

export function writeLocalCustomScenarios(
  ownerId: string,
  scenarios: CustomScenario[],
): boolean {
  try {
    localStorage.setItem(
      customScenarioStorageKey(ownerId),
      JSON.stringify({
        version: 1,
        savedAt: new Date().toISOString(),
        scenarios,
      }),
    );
    return true;
  } catch (error) {
    console.warn("[storage] Could not save custom scenarios:", error);
    return false;
  }
}

export function clearLocalCustomScenarios(ownerId: string): void {
  try {
    localStorage.removeItem(customScenarioStorageKey(ownerId));
  } catch {
    // no-op
  }
}

/**
 * Merge per-owner local data, promoted guest data and Supabase rows by id,
 * always keeping the newest `updatedAt`.
 */
export function mergeCustomScenarios(
  ...groups: CustomScenario[][]
): CustomScenario[] {
  const byId = new Map<string, CustomScenario>();
  for (const group of groups) {
    for (const scenario of group) {
      const existing = byId.get(scenario.id);
      if (
        !existing ||
        new Date(scenario.updatedAt).getTime() >=
          new Date(existing.updatedAt).getTime()
      ) {
        byId.set(scenario.id, scenario);
      }
    }
  }
  return [...byId.values()].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}
