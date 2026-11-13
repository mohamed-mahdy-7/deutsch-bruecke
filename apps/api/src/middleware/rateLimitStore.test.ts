import type { Options } from "express-rate-limit";
import { beforeEach, describe, expect, it } from "vitest";
import {
  ResilientRateLimitStore,
  resetSharedRedisForTests,
  type RedisCommands,
  type RedisClientFactory,
} from "./rateLimitStore.js";

const WINDOW_MS = 60_000;

class FakeRedis implements RedisCommands {
  isReady = true;
  failConnect = false;
  failEval = false;
  connectCalls = 0;
  readonly counters = new Map<string, number>();

  async connect(): Promise<unknown> {
    this.connectCalls += 1;
    if (this.failConnect) throw new Error("redis unavailable");
    return this;
  }

  async eval(
    script: string,
    options: { keys: string[]; arguments: string[] },
  ): Promise<unknown> {
    if (this.failEval) throw new Error("eval failed");
    const key = options.keys[0]!;

    if (script.includes("INCR")) {
      const next = (this.counters.get(key) ?? 0) + 1;
      this.counters.set(key, next);
      return [next, Number(options.arguments[0] ?? WINDOW_MS)];
    }

    const current = this.counters.get(key) ?? 0;
    if (current <= 1) {
      this.counters.delete(key);
      return 0;
    }
    this.counters.set(key, current - 1);
    return current - 1;
  }

  async get(key: string): Promise<string | null> {
    const value = this.counters.get(key);
    return value === undefined ? null : String(value);
  }

  async pTTL(key: string): Promise<number> {
    return this.counters.has(key) ? WINDOW_MS : -2;
  }

  async del(keys: string[]): Promise<number> {
    let removed = 0;
    for (const key of keys) {
      if (this.counters.delete(key)) removed += 1;
    }
    return removed;
  }
}

function createStore(factory: RedisClientFactory) {
  const store = new ResilientRateLimitStore({
    prefix: "test:ratelimit:",
    url: "redis://test:6379",
    clientFactory: factory,
  });
  store.init({ windowMs: WINDOW_MS } as Options);
  return store;
}

describe("ResilientRateLimitStore", () => {
  beforeEach(() => {
    resetSharedRedisForTests();
  });

  it("increments and resets counters through Redis", async () => {
    const redis = new FakeRedis();
    const store = createStore(() => redis);

    const first = await store.increment("127.0.0.1");
    const second = await store.increment("127.0.0.1");

    expect(first.totalHits).toBe(1);
    expect(second.totalHits).toBe(2);
    expect(second.resetTime.getTime()).toBeGreaterThan(Date.now());
    expect(redis.counters.get("test:ratelimit:127.0.0.1")).toBe(2);

    await store.decrement("127.0.0.1");
    expect(redis.counters.get("test:ratelimit:127.0.0.1")).toBe(1);

    const current = await store.get("127.0.0.1");
    expect(current?.totalHits).toBe(1);

    await store.resetKey("127.0.0.1");
    expect(redis.counters.has("test:ratelimit:127.0.0.1")).toBe(false);
    await expect(store.get("127.0.0.1")).resolves.toBeUndefined();
  });

  it("resets every known key", async () => {
    const redis = new FakeRedis();
    const store = createStore(() => redis);

    await store.increment("a");
    await store.increment("b");
    await store.resetAll();

    expect(redis.counters.size).toBe(0);
  });

  it("falls back to the in-memory store when Redis cannot connect", async () => {
    const redis = new FakeRedis();
    redis.failConnect = true;
    const store = createStore(() => redis);

    const first = await store.increment("1.2.3.4");
    const firstHits = first.totalHits;
    const second = await store.increment("1.2.3.4");
    const secondHits = second.totalHits;
    const third = await store.increment("1.2.3.4");
    const thirdHits = third.totalHits;

    expect(firstHits).toBe(1);
    expect(secondHits).toBe(2);
    expect(thirdHits).toBe(3);

    // The circuit breaker stops retrying on every request for 15 seconds.
    expect(redis.connectCalls).toBe(1);
  });

  it("falls back to memory when a Redis command fails", async () => {
    const redis = new FakeRedis();
    const store = createStore(() => redis);

    await store.increment("5.6.7.8");
    redis.failEval = true;

    const fallbackFirst = await store.increment("5.6.7.8");
    const firstHits = fallbackFirst.totalHits;
    const fallbackSecond = await store.increment("5.6.7.8");
    const secondHits = fallbackSecond.totalHits;

    // The memory store starts fresh: the Redis hit before the failure is not
    // copied over, which is the safe behaviour for a temporary outage.
    expect(firstHits).toBe(1);
    expect(secondHits).toBe(2);
  });

  it("shares one Redis connection across store instances", async () => {
    const redis = new FakeRedis();
    const factory: RedisClientFactory = () => redis;

    const first = createStore(factory);
    const second = createStore(factory);
    await first.increment("shared");
    await second.increment("shared");

    expect(redis.connectCalls).toBe(1);
  });
});
