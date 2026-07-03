import { describe, expect, it } from "vitest";
import { deriveAttunementCapacityReplacements } from "./attunement-capacity";
import type { ExactRuleRef } from "./schema";

function feature(upstreamId: string, verification: "verified" | "unverified" = "verified"): ExactRuleRef {
  return {
    kind: "feature",
    familyKey: `feature:${upstreamId}`,
    versionKey: `feature:${upstreamId}:XPHB:2026-07-03`,
    name: upstreamId,
    rulesGeneration: "2024",
    sourceId: "XPHB",
    upstreamId,
    contentRevision: "2026-07-03",
    compatibility: "current-2024-compatible",
    verification,
  };
}

describe("attunement capacity semantics", () => {
  it("derives typed Artificer replacements from exact verified feature identities", () => {
    expect(
      deriveAttunementCapacityReplacements([
        feature("magic-item-adept"),
        feature("advanced-artifice"),
        feature("magic-item-master"),
      ]).map((effect) => effect.maximum),
    ).toEqual([4, 5, 6]);
  });

  it("does not infer effects from unknown or unverified features", () => {
    expect(deriveAttunementCapacityReplacements([
      feature("some-feature-named-like-attunement"),
      feature("magic-item-adept", "unverified"),
    ])).toEqual([]);
  });
});
