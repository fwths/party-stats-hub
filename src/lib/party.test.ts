import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getCookie, parseCookieIds, readStoredIds, COOKIE_KEY, STORAGE_KEY } from "./party";

describe("getCookie", () => {
  it("extracts named cookie correctly", () => {
    expect(getCookie("mob_party_ids=123,456; other=abc", "mob_party_ids")).toBe("123,456");
    expect(getCookie("other=abc; mob_party_ids=123,456", "mob_party_ids")).toBe("123,456");
    expect(getCookie("other=abc", "mob_party_ids")).toBeNull();
  });
});

describe("parseCookieIds", () => {
  it("parses valid comma-separated IDs", () => {
    expect(parseCookieIds("123, 456 , 789")).toEqual([123, 456, 789]);
  });

  it("filters out invalid IDs", () => {
    expect(parseCookieIds("123, abc, -5, 0, 4.5")).toEqual([123]);
  });

  it("returns null for empty or invalid input", () => {
    expect(parseCookieIds("")).toBeNull();
    expect(parseCookieIds(null)).toBeNull();
    expect(parseCookieIds("abc, def")).toBeNull();
  });
});

describe("readStoredIds", () => {
  beforeEach(() => {
    // Reset global document.cookie and localStorage before each test
    if (typeof document !== "undefined") {
      Object.defineProperty(document, "cookie", {
        writable: true,
        value: "",
      });
    }
    localStorage.clear();
  });

  it("reads IDs from cookie if present", () => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: `${COOKIE_KEY}=101,202`,
    });
    expect(readStoredIds()).toEqual([101, 202]);
  });

  it("reads IDs from localStorage if cookie is absent", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([303, 404]));
    expect(readStoredIds()).toEqual([303, 404]);
  });

  it("returns null if both are missing or invalid", () => {
    expect(readStoredIds()).toBeNull();

    localStorage.setItem(STORAGE_KEY, "invalid-json");
    expect(readStoredIds()).toBeNull();
  });
});
