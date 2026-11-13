import { beforeEach, describe, expect, it } from "vitest";
import { MetricsRegistry, metrics } from "./metrics.js";

describe("MetricsRegistry", () => {
  let registry: MetricsRegistry;

  beforeEach(() => {
    registry = new MetricsRegistry();
  });

  it("accumulates counters per label combination", () => {
    registry.increment("http_requests_total", { method: "GET", status: 200 });
    registry.increment("http_requests_total", { method: "GET", status: 200 });
    registry.increment("http_requests_total", { method: "GET", status: 500 });
    registry.increment("http_requests_total", { method: "POST", status: 200 });

    expect(registry.total("http_requests_total")).toBe(4);
    expect(registry.total("missing_total")).toBe(0);

    const snapshot = registry.snapshot();
    const getOk = snapshot.counters.find(
      (counter) =>
        counter.name === "http_requests_total" &&
        counter.labels.method === "GET" &&
        counter.labels.status === 200,
    );
    expect(getOk?.value).toBe(2);
  });

  it("tracks timing count, average and maximum", () => {
    registry.observe("http_request_duration_ms", 10, { route: "/api/chat" });
    registry.observe("http_request_duration_ms", 30, { route: "/api/chat" });

    const timing = registry
      .snapshot()
      .timings.find(
        (entry) => entry.key === 'http_request_duration_ms{route="/api/chat"}',
      );

    expect(timing).toMatchObject({ count: 2, avgMs: 20, maxMs: 30 });
  });

  it("resets counters and timings for test isolation", () => {
    registry.increment("ai_requests_total", { endpoint: "/api/chat" });
    registry.observe("http_request_duration_ms", 5);
    registry.reset();

    const snapshot = registry.snapshot();
    expect(snapshot.counters).toEqual([]);
    expect(snapshot.timings).toEqual([]);
  });

  it("exposes uptime in the snapshot", () => {
    const snapshot = registry.snapshot();
    expect(snapshot.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(snapshot.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it("keeps the shared registry usable across modules", () => {
    metrics.reset();
    metrics.increment("shared_total", {}, 3);
    expect(metrics.total("shared_total")).toBe(3);
    metrics.reset();
  });
});
