import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app.js";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = createApp();
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

describe("CORS origin handling", () => {
  it("allows requests with no Origin header", async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    expect(response.status).toBe(200);
  });

  it("allows a same-origin request", async () => {
    const response = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: baseUrl },
    });
    expect(response.status).toBe(200);
  });

  it("allows a listed CLIENT_ORIGIN", async () => {
    const origin = "http://localhost:5173";
    const response = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: origin },
    });
    expect(response.status).toBe(200);
  });

  it("rejects an unknown origin with origin_not_allowed", async () => {
    const response = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: "https://evil.example" },
    });
    expect(response.status).toBe(403);
    const body = (await response.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe("origin_not_allowed");
  });
});