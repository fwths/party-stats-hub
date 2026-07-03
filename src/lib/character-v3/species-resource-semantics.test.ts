import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createRuleFamilyKey, createRuleVersionKey } from "../character-v2/rule-identity";
import { migrateDdbPayloadToCharacterV3 } from "./migrate-v2";
import { CharacterAggregateSchema, type CharacterAggregate, type ExactRuleRef } from "./schema";
import {
  MOB_SPECIES_RESOURCE_DEFINITIONS,
  deriveSpeciesResourceSemanticReport,
  reconcileSpeciesResources,
  type SpeciesResourceSemanticRecord,
} from "./species-resource-semantics";

function imported(id: number, owner: string): CharacterAggregate {
  const payload = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "cache", `char-${id}.json`), "utf8"),
  );
  return migrateDdbPayloadToCharacterV3({
    payload,
    ownerUserId: owner,
    campaignId: "mother-of-bob",
  });
}

function approved(character: CharacterAggregate): CharacterAggregate {
  const versionKey = character.build.speciesRef.versionKey;
  return CharacterAggregateSchema.parse({
    ...character,
    resolutions: [
      ...character.resolutions,
      {
        id: `test-only:approve:${versionKey}`,
        type: "content-version-decision",
        importedVersionKey: versionKey,
        resolution: "retain-imported",
        selectedVersionKey: versionKey,
        reason: "Test fixture simulates an owner decision; it is not a persisted player approval.",
        decidedByUserId: character.identity.ownerUserId,
      },
    ],
  });
}

function featureRef(featureId: string, sourceId: string): ExactRuleRef {
  const contentRevision = `catalog:${sourceId}:legacy-reviewed`;
  return {
    kind: "feature",
    familyKey: createRuleFamilyKey("feature", featureId),
    versionKey: createRuleVersionKey({
      kind: "feature",
      sourceId,
      upstreamId: featureId,
      contentRevision,
    }),
    name: featureId,
    rulesGeneration: "2024",
    sourceId,
    upstreamId: featureId,
    contentRevision,
    compatibility: "legacy",
    verification: "imported-unverified",
  };
}

function semantics(character: CharacterAggregate): SpeciesResourceSemanticRecord[] {
  const speciesName = character.build.speciesRef.name.toLowerCase();
  const definition = MOB_SPECIES_RESOURCE_DEFINITIONS.find((candidate) =>
    speciesName.includes(candidate.speciesId),
  );
  if (!definition) throw new Error(`No curated species resource for ${speciesName}`);
  return [
    {
      resourceKey: definition.resourceKey,
      speciesVersionKey: character.build.speciesRef.versionKey,
      sourceFeatureRef: featureRef(definition.featureId, definition.sourceId),
      maximum: definition.maximum,
      recovery: definition.recovery,
      recoveryRules: [],
    },
  ];
}

describe("Character V3 curated legacy species resources", () => {
  it.each([
    { id: 132900149, owner: "alexia", key: "action:race:hidden-step", maximum: 3 },
    {
      id: 132940690,
      owner: "andreas",
      key: "action:race:relentless-endurance",
      maximum: 1,
    },
  ])("reconciles $key only after a simulated explicit approval", ({ id, owner, key, maximum }) => {
    const unapproved = imported(id, owner);
    const records = semantics(unapproved);
    expect(
      deriveSpeciesResourceSemanticReport({ character: unapproved, semantics: records }).issues,
    ).toContainEqual(
      expect.objectContaining({ code: "species-version-not-approved", resourceKey: key }),
    );

    const character = approved(unapproved);
    const report = deriveSpeciesResourceSemanticReport({ character, semantics: records });
    expect(report.issues).toEqual([]);
    expect(report.matches).toEqual([expect.objectContaining({ resourceKey: key, maximum })]);
    const result = reconcileSpeciesResources({
      character,
      semantics: records,
      actorUserId: owner,
      expectedBuildRevision: character.build.revision,
      expectedLiveStateRevision: character.liveState.revision,
      mutationId: `test-only:${owner}:species-resource`,
    });
    const resource = result.character.liveState.resources.find((entry) => entry.key === key)!;
    expect(resource).toMatchObject({
      maximum,
      provenance: "imported-unverified",
      recoveryRules: [{ trigger: "long-rest", restore: { type: "all" } }],
    });
    expect(resource.sourceVersionKey).toBe(records[0].sourceFeatureRef.versionKey);
  });

  it("rejects a wrong exact species, non-owner, stale revision, and replay", () => {
    const character = approved(imported(132900149, "alexia"));
    const records = semantics(character);
    const wrongSpecies = records.map((record) => ({
      ...record,
      speciesVersionKey: "species:wrong:version",
    }));
    expect(
      deriveSpeciesResourceSemanticReport({ character, semantics: wrongSpecies }).issues,
    ).toContainEqual(expect.objectContaining({ code: "species-not-present" }));
    const command = {
      character,
      semantics: records,
      actorUserId: "alexia",
      expectedBuildRevision: character.build.revision,
      expectedLiveStateRevision: character.liveState.revision,
      mutationId: "test-only:alexia:species-resource",
    };
    expect(() => reconcileSpeciesResources({ ...command, actorUserId: "qemuel" })).toThrow(/owner/);
    expect(() =>
      reconcileSpeciesResources({
        ...command,
        expectedLiveStateRevision: character.liveState.revision + 1,
      }),
    ).toThrow(/revision conflict/);
    const reconciled = reconcileSpeciesResources(command).character;
    expect(() =>
      reconcileSpeciesResources({
        ...command,
        character: reconciled,
        expectedLiveStateRevision: reconciled.liveState.revision,
      }),
    ).toThrow(/already been reconciled/);
  });
});
