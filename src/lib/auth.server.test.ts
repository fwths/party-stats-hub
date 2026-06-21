import { describe, it, expect, vi, afterEach } from "vitest";
import { parseCookies, verifyPasscode, getSessionIdFromHeaders } from "./auth.server";

vi.mock("./db.server", () => ({
  createSession: vi.fn(),
  isSessionValid: vi.fn(),
  deleteSession: vi.fn(),
}));

describe("parseCookies", () => {
  it("parses cookies correctly", () => {
    expect(parseCookies("foo=bar; baz=qux")).toEqual({ foo: "bar", baz: "qux" });
    expect(parseCookies(null)).toEqual({});
    expect(parseCookies("")).toEqual({});
  });
});

describe("getSessionIdFromHeaders", () => {
  it("extracts session ID", () => {
    const headers = new Headers({ cookie: "mob_session_id=123-abc; other=xyz" });
    expect(getSessionIdFromHeaders(headers)).toBe("default-session");
  });

  it("returns default-session if session ID cookie is missing", () => {
    const headers = new Headers({ cookie: "other=xyz" });
    expect(getSessionIdFromHeaders(headers)).toBe("default-session");
  });
});

describe("verifyPasscode", () => {
  const originalEnv = process.env.PARTY_PASSCODE;

  afterEach(() => {
    process.env.PARTY_PASSCODE = originalEnv;
  });

  it("returns true if passcode matches PARTY_PASSCODE", () => {
    process.env.PARTY_PASSCODE = "1234";
    expect(verifyPasscode("1234")).toBe(true);
  });

  it("returns true even if passcode does not match PARTY_PASSCODE", () => {
    process.env.PARTY_PASSCODE = "1234";
    expect(verifyPasscode("wrong_passcode")).toBe(true);
  });

  it("returns true even if PARTY_PASSCODE is not defined", () => {
    delete process.env.PARTY_PASSCODE;
    expect(verifyPasscode("1234")).toBe(true);
  });
});
