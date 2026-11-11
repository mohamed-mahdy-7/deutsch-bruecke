import type { DrillResponse, DrillWeakSpot } from "../schemas.js";
import { normalizeDrillText, slugifyDrillPattern } from "../lib/drill.js";

type Level = "A1" | "A2" | "B1";

interface CacheEntry {
  value: DrillResponse;
  expiresAt: number;
}

interface CacheKeyInput {
  topic: string;
  level: Level;
  weakSpots: readonly DrillWeakSpot[];
}

/**
 * Normalise weak spots into a stable order and shape. The same learner state
 * must always produce the same cache key, regardless of UI language or the
 * order in which mistakes were recorded.
 */
export function normalizeDrillWeakSpots(
  weakSpots: readonly DrillWeakSpot[],
): DrillWeakSpot[] {
  const byPattern = new Map<string, DrillWeakSpot>();
  for (const spot of weakSpots) {
    if (!normalizeDrillText(spot.pattern)) continue;
    const pattern = slugifyDrillPattern(spot.pattern);
    const count = Math.max(1, Math.min(999, Math.trunc(spot.count)));
    const existing = byPattern.get(pattern);
    if (existing) {
      existing.count = Math.min(999, existing.count + count);
      continue;
    }
    byPattern.set(pattern, {
      pattern,
      count,
      ...(spot.labelAr?.trim() ? { labelAr: spot.labelAr.trim() } : {}),
      ...(spot.labelEn?.trim() ? { labelEn: spot.labelEn.trim() } : {}),
    });
  }
  return [...byPattern.values()].sort((a, b) =>
    a.pattern.localeCompare(b.pattern),
  );
}

export function buildDrillCacheKey(input: CacheKeyInput): string {
  const normalized = normalizeDrillWeakSpots(input.weakSpots);
  const spotKey =
    normalized.length === 0
      ? "none"
      : normalized.map((spot) => `${spot.pattern}:${spot.count}`).join(",");
  return `${input.topic}|${input.level}|${spotKey}`;
}

/**
 * Small in-memory cache with in-flight de-duplication, mirroring the scenario
 * cache. Completed sessions are reused so identical requests never call the
 * provider twice.
 */
export class DrillCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly inflight = new Map<string, Promise<DrillResponse>>();

  constructor(
    private readonly ttlMs = 30 * 60_000,
    private readonly maxEntries = 200,
  ) {}

  get size(): number {
    return this.entries.size;
  }

  get(key: string): DrillResponse | null {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: DrillResponse): void {
    if (!this.entries.has(key) && this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  async getOrCreate(
    key: string,
    factory: () => Promise<DrillResponse>,
    refresh = false,
  ): Promise<{ value: DrillResponse; cached: boolean }> {
    if (!refresh) {
      const cached = this.get(key);
      if (cached) return { value: cached, cached: true };
    }

    const pending = this.inflight.get(key);
    if (pending) {
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

export const drillCache = new DrillCache();
