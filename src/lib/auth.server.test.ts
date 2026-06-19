import { describe, it, expect, vi } from "vitest";
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
    expect(getSessionIdFromHeaders(headers)).toBe("123-abc");
  });

  it("returns null if session ID cookie is missing", () => {
    const headers = new Headers({ cookie: "other=xyz" });
    expect(getSessionIdFromHeaders(headers)).toBeNull();
  });
});

describe("verifyPasscode", () => {
  it("returns true for any passcode while disabled", () => {
    expect(verifyPasscode("")).toBe(true);
    expect(verifyPasscode("criticalfail")).toBe(true);
    expect(verifyPasscode("anything")).toBe(true);
  });
});
