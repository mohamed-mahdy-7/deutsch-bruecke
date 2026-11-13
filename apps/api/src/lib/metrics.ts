export type MetricLabels = Record<string, string | number | boolean>;

interface Timing {
  count: number;
  sumMs: number;
  maxMs: number;
}

interface CounterRecord {
  name: string;
  labels: MetricLabels;
  value: number;
}

function labelKey(labels: MetricLabels): string {
  const entries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return "";
  return entries
    .map(([key, value]) => `${key}="${String(value)}"`)
    .join(",");
}

function metricKey(name: string, labels: MetricLabels): string {
  const suffix = labelKey(labels);
  return suffix ? `${name}{${suffix}}` : name;
}

/**
 * Tiny in-process metrics registry. It deliberately avoids a heavyweight
 * Prometheus client: the API only needs counters and a handful of timings, and
 * /api/metrics exposes them as stable JSON for any dashboard or test.
 */
export class MetricsRegistry {
  private readonly startedAt = Date.now();
  private readonly counters = new Map<string, CounterRecord>();
  private readonly timings = new Map<string, Timing>();

  increment(name: string, labels: MetricLabels = {}, value = 1): void {
    const key = metricKey(name, labels);
    const existing = this.counters.get(key);
    if (existing) {
      existing.value += value;
      return;
    }
    this.counters.set(key, { name, labels: { ...labels }, value });
  }

  /** Sum of every label combination for a counter, for compact health output. */
  total(name: string): number {
    let sum = 0;
    for (const counter of this.counters.values()) {
      if (counter.name === name) sum += counter.value;
    }
    return sum;
  }

  observe(name: string, valueMs: number, labels: MetricLabels = {}): void {
    const key = metricKey(name, labels);
    const existing = this.timings.get(key);
    if (existing) {
      existing.count += 1;
      existing.sumMs += valueMs;
      existing.maxMs = Math.max(existing.maxMs, valueMs);
      return;
    }
    this.timings.set(key, { count: 1, sumMs: valueMs, maxMs: valueMs });
  }

  snapshot() {
    return {
      startedAt: new Date(this.startedAt).toISOString(),
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      counters: [...this.counters.values()]
        .map((counter) => ({ ...counter, labels: { ...counter.labels } }))
        .sort((a, b) => metricKey(a.name, a.labels).localeCompare(metricKey(b.name, b.labels))),
      timings: [...this.timings.entries()]
        .map(([key, timing]) => ({
          key,
          count: timing.count,
          avgMs: Math.round((timing.sumMs / timing.count) * 10) / 10,
          maxMs: timing.maxMs,
        }))
        .sort((a, b) => a.key.localeCompare(b.key)),
    };
  }

  /** Test helper: a fresh process is not available inside one Vitest file. */
  reset(): void {
    this.counters.clear();
    this.timings.clear();
  }
}

export const metrics = new MetricsRegistry();
