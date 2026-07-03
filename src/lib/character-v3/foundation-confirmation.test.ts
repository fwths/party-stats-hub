import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { deriveClassSemanticReport } from "./class-semantics";
import { confirmImportedFoundation } from "./foundation-confirmation";
import { migrateDdbPayloadToCharacterV3 } from "./migrate-v2";
import { buildV3ReconstructionReadinessReport } from "./reconstruction";

const fixtures = [
  { id: 97349530, owner: "qemuel" },
  { id: 131296315, owner: "nikos" },
  { id: 131593533, owner: "eleni" },
  { id: 132900149, owner: "alexia" },
  { id: 132940690, owner: "andreas" },
] as const;

function imported(fixture: (typeof fixtures)[number]) {
  const payload = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "cache", `char-${fixture.id}.json`), "utf8"),
  );
  return migrateDdbPayloadToCharacterV3({
    payload,
    ownerUserId: fixture.owner,
    campaignId: "mother-of-bob",
    v2MigrationOptions:
      fixture.id === 97349530
        ? {
            excludedFeatDefinitions: [
              { definitionId: 2048517, reason: "Player confirmed Qemuel has no Dark Bargain." },
            ],
          }
        : undefined,
  });
}

function command(character: ReturnType<typeof imported>, owner: string) {
  return {
    character,
    actorUserId: owner,
    expectedBuildRevision: character.build.revision,
    mutationId: `mutation:${owner}:confirm-foundation`,
    abilityScores: character.build.abilityBasis.baseScores,
    hpMaximum: character.hitPoints.baseline.maximum,
    hpThroughCharacterLevel: character.hitPoints.baseline.throughCharacterLevel,
    reason:
      "Player confirms these current ability scores and historical maximum HP as authoritative.",
  };
}

describe("Character V3 owner-attested imported foundation", () => {
  it.each(fixtures)(
    "detaches ability and HP baselines for $owner without inventing history",
    (fixture) => {
      const before = imported(fixture);
      const result = confirmImportedFoundation(command(before, fixture.owner));
      const readiness = buildV3ReconstructionReadinessReport(result.character);

      expect(result.character.build.abilityBasis).toMatchObject({
        method: "imported-baseline",
        verified: true,
      });
      expect(result.character.hitPoints.baseline).toMatchObject({
        method: "imported-baseline",
        verified: true,
      });
      expect(result.character.resolutions).toContainEqual(
        expect.objectContaining({
          type: "foundation-baseline-confirmed",
          method: "owner-attested-imported-baseline",
          decidedByUserId: fixture.owner,
        }),
      );
      expect(readiness.blockedDomains).not.toContain("abilities");
      expect(readiness.blockedDomains).not.toContain("hit-points");
      expect(result.auditEvent).toMatchObject({
        type: "confirm-imported-foundation",
        buildRevision: { before: 1, after: 2 },
        liveStateRevision: { before: 0, after: 0 },
      });

      const classReport = deriveClassSemanticReport({
        character: result.character,
        catalog: [],
        catalogRevision: "not-needed-for-hp-status",
      });
      expect(classReport.hpFullyReconstructed).toBe(false);
    },
  );

  it("rejects changed values, non-owners, stale revisions, and replay", () => {
    const before = imported(fixtures[4]);
    const valid = command(before, "andreas");
    expect(() =>
      confirmImportedFoundation({
        ...valid,
        abilityScores: { ...valid.abilityScores, STR: valid.abilityScores.STR + 1 },
      }),
    ).toThrow(/exactly echo/);
    expect(() => confirmImportedFoundation({ ...valid, hpMaximum: valid.hpMaximum + 1 })).toThrow(
      /exactly echo/,
    );
    expect(() => confirmImportedFoundation({ ...valid, actorUserId: "qemuel" })).toThrow(/owner/);
    expect(() =>
      confirmImportedFoundation({
        ...valid,
        expectedBuildRevision: before.build.revision + 1,
      }),
    ).toThrow(/revision conflict/);

    const confirmed = confirmImportedFoundation(valid).character;
    expect(() =>
      confirmImportedFoundation({
        ...command(confirmed, "andreas"),
        expectedBuildRevision: confirmed.build.revision,
      }),
    ).toThrow(/already been confirmed/);
  });
});
