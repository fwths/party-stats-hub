import { afterEach, describe, expect, it } from "vitest";
import {
  getSessionIdFromHeaders,
  parseCookies,
  verifyMotherOfBobClaimToken,
  verifyPasscode,
} from "./auth.server";
import { getSessionIdFromCookieHeader } from "./db.server";

const originalPasscode = process.env.PARTY_PASSCODE;
const originalFotisClaimToken = process.env.MOB_CLAIM_TOKEN_FOTIS;

afterEach(() => {
  if (originalPasscode === undefined) delete process.env.PARTY_PASSCODE;
  else process.env.PARTY_PASSCODE = originalPasscode;
  if (originalFotisClaimToken === undefined) delete process.env.MOB_CLAIM_TOKEN_FOTIS;
  else process.env.MOB_CLAIM_TOKEN_FOTIS = originalFotisClaimToken;
});

describe("authentication boundary", () => {
  it("parses the real session cookie without inventing a fallback session", () => {
    expect(parseCookies("theme=dark; mob_session_id=abc-123")).toMatchObject({
      theme: "dark",
      mob_session_id: "abc-123",
    });
    expect(getSessionIdFromHeaders(new Headers())).toBeNull();
    expect(
      getSessionIdFromHeaders(new Headers({ cookie: "mob_session_id=abc-123; theme=dark" })),
    ).toBe("abc-123");
    expect(getSessionIdFromCookieHeader("theme=dark; mob_session_id=abc-123")).toBe("abc-123");
    expect(getSessionIdFromCookieHeader("theme=dark")).toBeNull();
    expect(getSessionIdFromCookieHeader("mob_session_id=")).toBeNull();
  });

  it("requires the configured campaign passcode", () => {
    process.env.PARTY_PASSCODE = "mother-of-bob-test";
    expect(verifyPasscode("mother-of-bob-test")).toBe(true);
    expect(verifyPasscode("mother-of-bob-wrong")).toBe(false);
  });

  it("binds reserved account claims to a private per-user token", () => {
    process.env.MOB_CLAIM_TOKEN_FOTIS = "fotis-private-claim";
    expect(verifyMotherOfBobClaimToken("fotis", "fotis-private-claim")).toBe(true);
    expect(verifyMotherOfBobClaimToken("fotis", "shared-campaign-code")).toBe(false);
    expect(verifyMotherOfBobClaimToken("nikos", "fotis-private-claim")).toBe(false);
  });

  it("fails closed when the campaign passcode is not configured", () => {
    delete process.env.PARTY_PASSCODE;
    expect(() => verifyPasscode("anything")).toThrow(
      "PARTY_PASSCODE environment variable is required",
    );
  });
});
