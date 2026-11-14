import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../lib/errors.js";
import {
  createSupabaseAccessStore,
  createSupabaseAuthVerifier,
  resetAuthCache,
} from "./supabaseAccess.js";

const options = { supabaseUrl: "https://supabase.test", anonKey: "anon-key" };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetAuthCache();
});

describe("Supabase auth verifier", () => {
  it("verifies a token against /auth/v1/user and caches the result", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ id: "user-a", email: "a@example.test" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const verifier = createSupabaseAuthVerifier(options);
    const first = await verifier.verify("token-1");
    const second = await verifier.verify("token-1");

    expect(first).toMatchObject({ id: "user-a" });
    expect(second).toMatchObject({ id: "user-a" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://supabase.test/auth/v1/user");
    expect((init.headers as Record<string, string>).authorization).toBe(
      "Bearer token-1",
    );
    expect((init.headers as Record<string, string>).apikey).toBe("anon-key");
  });

  it("maps 401 to invalid_token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, 401)));
    const verifier = createSupabaseAuthVerifier(options);
    await expect(verifier.verify("bad")).rejects.toMatchObject({
      code: "invalid_token",
      status: 401,
    });
  });

  it("fails closed with auth_unavailable when the auth server is down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    const verifier = createSupabaseAuthVerifier(options);
    await expect(verifier.verify("token")).rejects.toMatchObject({
      code: "auth_unavailable",
      status: 503,
    });
  });
});

describe("Supabase quota store", () => {
  it("forwards the user token and maps an allowed decision", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        allowed: true,
        reason: "ok",
        approved: true,
        used: 4,
        limit: 40,
        remaining: 36,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const store = createSupabaseAccessStore(options);
    const decision = await store.consume({
      userId: "user-a",
      accessToken: "token-1",
      feature: "chat",
      limit: 40,
      betaGate: true,
      globalCap: 500,
    });

    expect(decision).toMatchObject({
      allowed: true,
      reason: "ok",
      approved: true,
      remaining: 36,
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://supabase.test/rest/v1/rpc/consume_ai_call");
    expect((init.headers as Record<string, string>).authorization).toBe(
      "Bearer token-1",
    );
    expect(JSON.parse(String(init.body))).toEqual({
      p_feature: "chat",
      p_user_limit: 40,
      p_global_cap: 500,
      p_beta_gate: true,
    });
  });

  it("maps quota_exhausted and global_cap decisions", async () => {
    const store = createSupabaseAccessStore(options);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          allowed: false,
          reason: "quota_exhausted",
          approved: true,
          used: 40,
          limit: 40,
          remaining: 0,
        }),
      ),
    );
    const quota = await store.consume({
      userId: "user-a",
      accessToken: "token",
      feature: "chat",
      limit: 40,
      betaGate: false,
      globalCap: 0,
    });
    expect(quota).toMatchObject({
      allowed: false,
      reason: "quota_exhausted",
      remaining: 0,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          allowed: false,
          reason: "global_cap",
          approved: true,
          used: 3,
          limit: 40,
          remaining: 37,
          global_used: 500,
        }),
      ),
    );
    const cap = await store.consume({
      userId: "user-a",
      accessToken: "token",
      feature: "chat",
      limit: 40,
      betaGate: false,
      globalCap: 500,
    });
    expect(cap).toMatchObject({ allowed: false, reason: "global_cap" });
  });

  it("fails closed on an RPC error or an unknown reason", async () => {
    const store = createSupabaseAccessStore(options);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, 500)));
    await expect(
      store.consume({
        userId: "user-a",
        accessToken: "token",
        feature: "chat",
        limit: 40,
        betaGate: false,
        globalCap: 0,
      }),
    ).rejects.toMatchObject({ code: "ai_access_unavailable", status: 503 });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ allowed: false, reason: "weird" })),
    );
    await expect(
      store.consume({
        userId: "user-a",
        accessToken: "token",
        feature: "chat",
        limit: 40,
        betaGate: false,
        globalCap: 0,
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("reads the entitlement usage map", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          approved: true,
          day: "2026-01-01",
          usage: { chat: 3, drill: 2, unknown: 99 },
        }),
      ),
    );
    const store = createSupabaseAccessStore(options);
    const entitlement = await store.entitlement({
      userId: "user-a",
      accessToken: "token",
    });
    expect(entitlement.approved).toBe(true);
    expect(entitlement.usage).toEqual({ chat: 3, drill: 2 });
  });
});
