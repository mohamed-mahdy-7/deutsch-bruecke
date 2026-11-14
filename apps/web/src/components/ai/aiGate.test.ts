import { describe, expect, it } from "vitest";
import { AiRequestError } from "@/services/ai";
import { aiBlockKindForError } from "./AiGate";

/**
 * The UI must explain access failures with the same calm copy everywhere.
 * These mappings are the contract between the API error codes and the gates.
 */
describe("aiBlockKindForError", () => {
  it("maps missing or expired sessions to the sign-in state", () => {
    expect(aiBlockKindForError(new AiRequestError("auth_required", "", 401))).toBe(
      "signed_out",
    );
    expect(aiBlockKindForError(new AiRequestError("invalid_token", "", 401))).toBe(
      "signed_out",
    );
  });

  it("maps the beta gate to the invite-code state", () => {
    expect(
      aiBlockKindForError(new AiRequestError("beta_not_approved", "", 403)),
    ).toBe("beta_required");
  });

  it("maps an exhausted quota to the quota state", () => {
    expect(
      aiBlockKindForError(new AiRequestError("quota_exhausted", "", 429)),
    ).toBe("quota_exhausted");
  });

  it("maps kill switch, global cap, and provider outages to unavailable", () => {
    for (const code of [
      "ai_disabled",
      "ai_global_cap",
      "ai_access_unavailable",
      "auth_unavailable",
      "ai_provider_quota",
      "ai_upstream_unavailable",
      "ai_timeout",
    ]) {
      expect(aiBlockKindForError(new AiRequestError(code, "", 503))).toBe(
        "unavailable",
      );
    }
  });

  it("leaves feature-specific errors to each surface", () => {
    expect(aiBlockKindForError(new AiRequestError("rate_limited", "", 429))).toBe(
      null,
    );
    expect(aiBlockKindForError(new AiRequestError("network", ""))).toBe(null);
    expect(aiBlockKindForError(new Error("boom"))).toBe(null);
  });
});
