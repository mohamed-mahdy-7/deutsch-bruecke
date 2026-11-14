import type {
  AiAccessStore,
  AiEntitlement,
  AiFeature,
  QuotaDecision,
} from "./supabaseAccess.js";

/**
 * In-memory quota store used by tests and local development. It mirrors the
 * SQL contract (UTC daily reset, beta gate, global cap) but is NOT used in
 * production, where counters must be shared across serverless instances.
 */
export class MemoryAccessStore implements AiAccessStore {
  private readonly counts = new Map<string, number>();
  private globalCount = 0;
  private globalDay = "";
  private readonly approved = new Set<string>();

  constructor(
    private readonly options: {
      now?: () => Date;
      globalCap?: number;
    } = {},
  ) {}

  approve(userId: string): void {
    this.approved.add(userId);
  }

  private today(): string {
    return (this.options.now?.() ?? new Date()).toISOString().slice(0, 10);
  }

  private rollover(day: string): void {
    if (this.globalDay !== day) {
      this.globalDay = day;
      this.globalCount = 0;
    }
  }

  async consume(input: {
    userId: string;
    accessToken: string;
    feature: AiFeature;
    limit: number;
    betaGate: boolean;
    globalCap: number;
  }): Promise<QuotaDecision> {
    const day = this.today();
    this.rollover(day);

    const isApproved = this.approved.has(input.userId);
    if (input.betaGate && !isApproved) {
      return {
        allowed: false,
        reason: "beta_not_approved",
        approved: false,
        used: 0,
        limit: input.limit,
        remaining: 0,
      };
    }

    const key = `${day}:${input.userId}:${input.feature}`;
    const used = this.counts.get(key) ?? 0;

    if (used >= input.limit) {
      return {
        allowed: false,
        reason: "quota_exhausted",
        approved: isApproved,
        used,
        limit: input.limit,
        remaining: 0,
      };
    }

    const cap = input.globalCap > 0 ? input.globalCap : 0;
    if (cap > 0 && this.globalCount >= cap) {
      return {
        allowed: false,
        reason: "global_cap",
        approved: isApproved,
        used,
        limit: input.limit,
        remaining: Math.max(0, input.limit - used),
        globalUsed: this.globalCount,
      };
    }

    this.counts.set(key, used + 1);
    if (cap > 0) this.globalCount += 1;

    return {
      allowed: true,
      reason: "ok",
      approved: isApproved,
      used: used + 1,
      limit: input.limit,
      remaining: Math.max(0, input.limit - used - 1),
      ...(cap > 0 ? { globalUsed: this.globalCount } : {}),
    };
  }

  async refund(input: {
    userId: string;
    accessToken: string;
    feature: AiFeature;
    limit: number;
  }): Promise<void> {
    try {
      const day = this.today();
      this.rollover(day);
      const key = `${input.userId}:${input.feature}`;
      const current = this.counts.get(key) ?? 0;
      if (current > 0) this.counts.set(key, current - 1);
    } catch {
      // ignore
    }
  }

  async entitlement(input: {
    userId: string;
    accessToken: string;
  }): Promise<AiEntitlement> {
    const day = this.today();
    const usage: Partial<Record<AiFeature, number>> = {};
    for (const [key, value] of this.counts) {
      const [keyDay, userId, feature] = key.split(":");
      if (keyDay === day && userId === input.userId) {
        usage[feature as AiFeature] = value;
      }
    }
    return { approved: this.approved.has(input.userId), usage };
  }
}
