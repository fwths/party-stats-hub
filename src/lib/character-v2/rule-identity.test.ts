import { describe, expect, it } from "vitest";
import {
  buildRuleCatalogIndex,
  createRuleFamilyKey,
  createRuleVersion,
  DuplicateRuleVersionError,
  resolveRuleFamilyKey,
  selectPreferredRuleVersion,
} from "./rule-identity";

const tceFeyTouched = createRuleVersion({
  identity: {
    kind: "feat",
    sourceId: "TCE",
    upstreamId: "fey-touched",
    contentRevision: "2020",
  },
  name: "Fey Touched",
  compatibility: "legacy",
  releaseOrder: 1,
});

const xphbFeyTouched = createRuleVersion({
  identity: {
    kind: "feat",
    sourceId: "XPHB",
    upstreamId: "fey-touched",
    contentRevision: "2024",
  },
  name: "Fey Touched",
  compatibility: "core-2024",
  releaseOrder: 2,
});

describe("Character V2 canonical rule identities", () => {
  it("preserves same-family rule versions from different sources without collision", () => {
    const index = buildRuleCatalogIndex([tceFeyTouched, xphbFeyTouched]);
    expect(tceFeyTouched.familyKey).toBe(xphbFeyTouched.familyKey);
    expect(tceFeyTouched.versionKey).not.toBe(xphbFeyTouched.versionKey);
    expect(index.byFamilyKey.get(tceFeyTouched.familyKey)).toHaveLength(2);
  });

  it("selects the newest version accepted by the current-compatible policy", () => {
    const index = buildRuleCatalogIndex([tceFeyTouched, xphbFeyTouched]);
    expect(selectPreferredRuleVersion(index, tceFeyTouched.familyKey)).toEqual(xphbFeyTouched);
  });

  it("accepts newer compatible content outside the core books", () => {
    const artificer = createRuleVersion({
      identity: {
        kind: "class",
        sourceId: "EFA",
        upstreamId: "artificer",
        contentRevision: "current",
      },
      name: "Artificer",
      compatibility: "current-2024-compatible",
      releaseOrder: 1,
    });
    const index = buildRuleCatalogIndex([artificer]);
    expect(selectPreferredRuleVersion(index, artificer.familyKey)).toEqual(artificer);
  });

  it("keeps an existing character pinned when a newer family version is added", () => {
    const initial = buildRuleCatalogIndex([tceFeyTouched]);
    const pinnedVersionKey = tceFeyTouched.versionKey;
    const expanded = buildRuleCatalogIndex([tceFeyTouched, xphbFeyTouched]);

    expect(initial.byVersionKey.get(pinnedVersionKey)).toEqual(tceFeyTouched);
    expect(expanded.byVersionKey.get(pinnedVersionKey)).toEqual(tceFeyTouched);
    expect(selectPreferredRuleVersion(expanded, tceFeyTouched.familyKey)).toEqual(xphbFeyTouched);
  });

  it("rejects duplicate exact rule versions", () => {
    expect(() => buildRuleCatalogIndex([xphbFeyTouched, xphbFeyTouched])).toThrow(
      DuplicateRuleVersionError,
    );
  });

  it("resolves spelling aliases to a shared family", () => {
    const familyKey = createRuleFamilyKey("feat", "Fey Touched");
    expect(
      resolveRuleFamilyKey("feat", "Fey-Touched", [
        { kind: "feat", alias: "Fey-Touched", familyKey },
      ]),
    ).toBe(familyKey);
  });
});
