import { describe, it, expect } from "vitest";
import { isSourceAllowedByPolicy, DEFAULT_SOURCE_POLICY, ForgeSourcePolicy } from "./source-policy";

describe("source-policy", () => {
  it("allows core sources by default", () => {
    expect(isSourceAllowedByPolicy("PHB")).toBe(true);
    expect(isSourceAllowedByPolicy("XPHB")).toBe(true);
    expect(isSourceAllowedByPolicy("MM")).toBe(true);
  });

  it("blocks homebrew by default", () => {
    expect(isSourceAllowedByPolicy("HB")).toBe(false);
    expect(isSourceAllowedByPolicy("HOMEBREW")).toBe(false);
  });

  it("blocks UA by default", () => {
    expect(isSourceAllowedByPolicy("UA")).toBe(false);
    expect(isSourceAllowedByPolicy("UA2024PlayerHandbookCb1")).toBe(false);
  });

  it("blocks excluded sources explicitly", () => {
    const policy: ForgeSourcePolicy = { ...DEFAULT_SOURCE_POLICY, excludedSources: ["XPHB"] };
    expect(isSourceAllowedByPolicy("XPHB", policy)).toBe(false);
  });

  it("blocks homebrew even if a stale policy tries to allow it", () => {
    const policy: ForgeSourcePolicy = { ...DEFAULT_SOURCE_POLICY, allowHomebrew: true };
    expect(isSourceAllowedByPolicy("HB", policy)).toBe(false);
  });

  it("respects allowedTiers", () => {
    const policy: ForgeSourcePolicy = { ...DEFAULT_SOURCE_POLICY, allowedTiers: ["core"] };
    // TCE is in supplements
    expect(isSourceAllowedByPolicy("TCE", policy)).toBe(false);
    expect(isSourceAllowedByPolicy("XPHB", policy)).toBe(true);
  });
});
