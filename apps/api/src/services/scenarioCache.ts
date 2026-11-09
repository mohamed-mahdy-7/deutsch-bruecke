import type { CustomScenario } from "../schemas.js";

interface CacheEntry {
  value: CustomScenario;
  expiresAt: number;
}

interface CacheKeyInput {
  idea: string;
  level?: string | undefined;
  formality?: string | undefined;
  tone: string;
}

/**
 * Normalise an idea so punctuation, spacing, case and Arabic diacritics do not
 * cause duplicate AI calls for the same request.
 */
export function normalizeScenarioIdea(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function buildScenarioCacheKey(input: CacheKeyInput): string {
  return [
    normalizeScenarioIdea(input.idea),
    input.level ?? "auto",
    input.formality ?? "auto",
    input.tone,
  ].join("|");
}

/**
 * Small in-memory cache with in-flight de-duplication. Identical concurrent
 * requests share one provider call, and completed scenarios are reused for a
 * short time even across different visitors.
 */
export class ScenarioCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly inflight = new Map<string, Promise<CustomScenario>>();

  constructor(
    private readonly ttlMs = 30 * 60_000,
    private readonly maxEntries = 200,
  ) {}

  get size(): number {
    return this.entries.size;
  }

  get(key: string): CustomScenario | null {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: CustomScenario): void {
    if (!this.entries.has(key) && this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  async getOrCreate(
    key: string,
    factory: () => Promise<CustomScenario>,
    refresh = false,
  ): Promise<{ value: CustomScenario; cached: boolean }> {
    if (!refresh) {
      const cached = this.get(key);
      if (cached) return { value: cached, cached: true };
    }

    const pending = this.inflight.get(key);
    if (pending) {
      // Never start a second provider call for the same in-flight request,
      // even when the caller pressed "regenerate" while the first was running.
      return { value: await pending, cached: true };
    }

    const task = (async () => {
      const value = await factory();
      this.set(key, value);
      return value;
    })();
    this.inflight.set(key, task);

    try {
      return { value: await task, cached: false };
    } finally {
      if (this.inflight.get(key) === task) this.inflight.delete(key);
    }
  }

  clear(): void {
    this.entries.clear();
    this.inflight.clear();
  }
}

export const scenarioCache = new ScenarioCache();
