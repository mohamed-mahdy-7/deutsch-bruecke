import { createClient } from "redis";
import { MemoryStore, type ClientRateLimitInfo, type Options, type Store } from "express-rate-limit";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";

/**
 * Atomic counter: INCR and set the expiry on the first hit. Returning both
 * values in one round trip keeps concurrent requests consistent.
 */
const INCREMENT_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
local ttl = redis.call("PTTL", KEYS[1])
if ttl < 0 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {current, ttl}
`;

const DECREMENT_SCRIPT = `
local current = redis.call("GET", KEYS[1])
if not current then
  return 0
end
if tonumber(current) > 1 then
  return redis.call("DECR", KEYS[1])
end
redis.call("DEL", KEYS[1])
return 0
`;

/**
 * The subset of the Redis client this store uses. Keeping the surface small
 * makes the fallback logic easy to exercise without a real Redis server.
 */
export interface RedisCommands {
  readonly isReady: boolean;
  connect(): Promise<unknown>;
  eval(
    script: string,
    options: { keys: string[]; arguments: string[] },
  ): Promise<unknown>;
  get(key: string): Promise<string | null>;
  pTTL(key: string): Promise<number>;
  del(keys: string[]): Promise<number>;
}

export type RedisClientFactory = (url: string) => RedisCommands;

function defaultClientFactory(url: string): RedisCommands {
  const client = createClient({ url });
  client.on("error", (error) => {
    logger.warn("redis_client_error", { message: error.message });
  });
  return client as unknown as RedisCommands;
}

const REDIS_RETRY_AFTER_MS = 15_000;
const REDIS_LOG_INTERVAL_MS = 60_000;

let sharedClient: RedisCommands | null = null;
let sharedClientUrl = "";
let clientPromise: Promise<RedisCommands> | null = null;
let redisRetryAt = 0;
let lastFailureLogAt = 0;
let lastRecoveryLogAt = 0;

export type RateLimitStoreStatus = "disabled" | "connected" | "degraded";

export function rateLimitStoreStatus(): RateLimitStoreStatus {
  if (config.rateLimitStore !== "redis" || !config.redisUrl) return "disabled";
  if (Date.now() < redisRetryAt) return "degraded";
  return sharedClient?.isReady ? "connected" : "degraded";
}

async function getRedisClient(
  url: string,
  factory: RedisClientFactory,
): Promise<RedisCommands> {
  if (!url) throw new Error("redis_not_configured");
  if (Date.now() < redisRetryAt) throw new Error("redis_circuit_open");
  if (sharedClient?.isReady && sharedClientUrl === url) return sharedClient;
  if (clientPromise && sharedClientUrl === url) return clientPromise;

  sharedClientUrl = url;
  const client = factory(url);
  clientPromise = client
    .connect()
    .then(() => {
      sharedClient = client;
      if (Date.now() - lastFailureLogAt > REDIS_LOG_INTERVAL_MS) {
        logger.info("rate_limit_redis_connected");
        lastRecoveryLogAt = Date.now();
      }
      return client;
    })
    .catch((error: unknown) => {
      clientPromise = null;
      sharedClient = null;
      throw error;
    });

  return clientPromise;
}

function markRedisFailure(error: unknown): void {
  redisRetryAt = Date.now() + REDIS_RETRY_AFTER_MS;
  const now = Date.now();
  if (now - lastFailureLogAt > REDIS_LOG_INTERVAL_MS) {
    lastFailureLogAt = now;
    logger.warn("rate_limit_redis_unavailable", {
      message: error instanceof Error ? error.message : String(error),
      fallback: "memory",
      retryAfterMs: REDIS_RETRY_AFTER_MS,
    });
  }
}

function markRedisSuccess(): void {
  redisRetryAt = 0;
  const now = Date.now();
  if (lastFailureLogAt > 0 && now - lastRecoveryLogAt > REDIS_LOG_INTERVAL_MS) {
    lastRecoveryLogAt = now;
    logger.info("rate_limit_redis_recovered");
  }
}

/** Test hook: drop the shared connection so each test starts clean. */
export function resetSharedRedisForTests(): void {
  sharedClient = null;
  clientPromise = null;
  sharedClientUrl = "";
  redisRetryAt = 0;
  lastFailureLogAt = 0;
  lastRecoveryLogAt = 0;
}

export class ResilientRateLimitStore implements Store {
  /** Counter keys must be prefixed because the limiter only passes the client key. */
  readonly localKeys = false;
  readonly prefix: string;
  private readonly url: string;
  private readonly factory: RedisClientFactory;
  private readonly memory = new MemoryStore();
  private readonly knownKeys = new Set<string>();
  private windowMs = 60_000;

  constructor(options: {
    prefix: string;
    url: string;
    clientFactory?: RedisClientFactory;
  }) {
    this.prefix = options.prefix;
    this.url = options.url;
    this.factory = options.clientFactory ?? defaultClientFactory;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
    this.memory.init(options);
  }

  private redisKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    this.knownKeys.add(key);
    try {
      const client = await getRedisClient(this.url, this.factory);
      const reply = (await client.eval(INCREMENT_SCRIPT, {
        keys: [this.redisKey(key)],
        arguments: [String(this.windowMs)],
      })) as [number, number] | number[];
      const totalHits = Number(reply[0]);
      const ttl = Number(reply[1]);
      if (!Number.isFinite(totalHits) || totalHits < 0) {
        throw new Error("redis_increment_invalid_reply");
      }
      markRedisSuccess();
      return {
        totalHits,
        resetTime: new Date(Date.now() + Math.max(ttl, 1)),
      };
    } catch (error) {
      markRedisFailure(error);
      // MemoryStore returns a live object that later increments mutate; copy
      // it so callers see the count for this request, not the latest one.
      return { ...(await this.memory.increment(key)) };
    }
  }

  async decrement(key: string): Promise<void> {
    try {
      const client = await getRedisClient(this.url, this.factory);
      await client.eval(DECREMENT_SCRIPT, {
        keys: [this.redisKey(key)],
        arguments: [],
      });
      markRedisSuccess();
    } catch (error) {
      markRedisFailure(error);
      await this.memory.decrement(key);
    }
  }

  async resetKey(key: string): Promise<void> {
    this.knownKeys.delete(key);
    try {
      const client = await getRedisClient(this.url, this.factory);
      await client.del([this.redisKey(key)]);
      markRedisSuccess();
    } catch (error) {
      markRedisFailure(error);
      await this.memory.resetKey(key);
    }
  }

  async resetAll(): Promise<void> {
    try {
      const client = await getRedisClient(this.url, this.factory);
      if (this.knownKeys.size > 0) {
        await client.del([...this.knownKeys].map((key) => this.redisKey(key)));
      }
      this.knownKeys.clear();
      markRedisSuccess();
    } catch (error) {
      markRedisFailure(error);
      await this.memory.resetAll();
    }
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    try {
      const client = await getRedisClient(this.url, this.factory);
      const redisKey = this.redisKey(key);
      const [value, ttl] = await Promise.all([
        client.get(redisKey),
        client.pTTL(redisKey),
      ]);
      if (value === null || ttl < 0) return undefined;
      return {
        totalHits: Number(value) || 0,
        resetTime: new Date(Date.now() + ttl),
      };
    } catch (error) {
      markRedisFailure(error);
      const info = await this.memory.get(key);
      return info ? { ...info } : undefined;
    }
  }

  shutdown(): void {
    this.memory.shutdown();
  }
}

/**
 * Redis when configured, memory otherwise. The fallback is per-process, so a
 * Redis outage temporarily weakens limits rather than breaking the API.
 */
export function createRateLimitStore(name: string): Store {
  if (config.rateLimitStore !== "redis" || !config.redisUrl) {
    return new MemoryStore();
  }
  return new ResilientRateLimitStore({
    prefix: `bruecke:ratelimit:${name}:`,
    url: config.redisUrl,
  });
}
