import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { afterAll, describe, expect, it } from "vitest";
import { createRuleFamilyKey, createRuleVersionKey } from "../character-v2/rule-identity";
import {
  CORE_MOB_FEATURE_RESOURCE_DEFINITIONS,
  buildCoreFeatureResourceSemantics,
  deriveLevelUpFeatureResourceUpdates,
  deriveFeatureResourceSemanticReport,
  reconcileFeatureResources,
  type FeatureResourceSemanticRecord,
} from "./feature-resource-semantics";
import { confirmImportedFoundation } from "./foundation-confirmation";
import { migrateDdbPayloadToCharacterV3 } from "./migrate-v2";
import {
  applyAcceptedV3Reconciliation,
  reconcileCharacterV3,
  type V3CatalogRecord,
} from "./reconcile";
import type { CharacterAggregate, ExactRuleRef } from "./schema";

const db = new Database(path.join(process.cwd(), "sqlite.db"), { readonly: true });
afterAll(() => db.close());
type ClassRow = { id: string; name: string; source: string; raw_json: string | null };
type SubclassRow = ClassRow & { class_id: string };
const classRows = db.prepare("SELECT id, name, source, raw_json FROM classes").all() as ClassRow[];
const subclassRows = db
  .prepare("SELECT id, class_id, name, source, raw_json FROM subclasses")
  .all() as SubclassRow[];

function edition(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw).edition;
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

const classCatalog: V3CatalogRecord[] = classRows.map((row) => ({
  kind: "class",
  id: row.id,
  name: row.name,
  sourceId: row.source,
  edition: edition(row.raw_json),
  contentRevision: `catalog:${row.source}:${edition(row.raw_json) ?? "legacy"}`,
}));
const classEdition = new Map(classCatalog.map((record) => [record.id, record.edition]));
const subclassCatalog: V3CatalogRecord[] = subclassRows.map((row) => {
  const recordEdition = edition(row.raw_json) ?? classEdition.get(row.class_id) ?? null;
  return {
    kind: "subclass",
    id: row.id,
    name: row.name,
    sourceId: row.source,
    edition: recordEdition,
    contentRevision: `catalog:${row.source}:${recordEdition ?? "legacy"}`,
  };
});

function canonical(id: number, owner: string): CharacterAggregate {
  const payload = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "cache", `char-${id}.json`), "utf8"),
  );
  const imported = migrateDdbPayloadToCharacterV3({
    payload,
    ownerUserId: owner,
    campaignId: "mother-of-bob",
    v2MigrationOptions:
      id === 97349530
        ? {
            excludedFeatDefinitions: [
              { definitionId: 2048517, reason: "Player confirmed Qemuel has no Dark Bargain." },
            ],
          }
        : undefined,
  });
  return applyAcceptedV3Reconciliation({
    character: imported,
    report: reconcileCharacterV3(imported, [...classCatalog, ...subclassCatalog]),
    catalogRevision: "test-class-and-subclass-catalog",
  });
}

function confirmFoundation(character: CharacterAggregate): CharacterAggregate {
  return confirmImportedFoundation({
    character,
    actorUserId: character.identity.ownerUserId,
    expectedBuildRevision: character.build.revision,
    mutationId: `mutation:${character.identity.ownerUserId}:foundation-for-features`,
    abilityScores: character.build.abilityBasis.baseScores,
    hpMaximum: character.hitPoints.baseline.maximum,
    hpThroughCharacterLevel: character.hitPoints.baseline.throughCharacterLevel,
    reason: "Player confirms the exact imported foundation before ability-derived resource checks.",
  }).character;
}

function featureRef(definition: { featureId: string; sourceId: string }): ExactRuleRef {
  const contentRevision = `catalog:${definition.sourceId}:one`;
  return {
    kind: "feature",
    familyKey: createRuleFamilyKey("feature", definition.featureId),
    versionKey: createRuleVersionKey({
      kind: "feature",
      sourceId: definition.sourceId,
      upstreamId: definition.featureId,
      contentRevision,
    }),
    name: definition.featureId,
    rulesGeneration: "2024",
    sourceId: definition.sourceId,
    upstreamId: definition.featureId,
    contentRevision,
    compatibility: definition.sourceId === "XPHB" ? "core-2024" : "current-2024-compatible",
    verification: "verified",
  };
}

function semantics(character: CharacterAggregate): FeatureResourceSemanticRecord[] {
  const classRef = character.build.levels[0].classRef;
  return CORE_MOB_FEATURE_RESOURCE_DEFINITIONS.filter(
    (definition) => definition.classId === classRef.upstreamId,
  ).map((definition) => ({
    resourceKey: definition.resourceKey,
    classVersionKey: classRef.versionKey,
    requiredSubclassVersionKey:
      "subclassId" in definition
        ? (character.build.subclasses.find(
            (subclass) => subclass.subclassRef.upstreamId === definition.subclassId,
          )?.subclassRef.versionKey ?? `missing-subclass:${definition.subclassId}`)
        : null,
    minimumClassLevel: definition.minimumClassLevel,
    sourceFeatureRef: featureRef(definition),
    modifierFeatureRefs:
      "modifierFeatureIds" in definition
        ? definition.modifierFeatureIds.map((featureId) =>
            featureRef({ featureId, sourceId: definition.sourceId }),
          )
        : [],
    maximum: definition.maximum,
    recovery: definition.recovery,
    recoveryRules: "recoveryRules" in definition ? definition.recoveryRules : [],
  })) as FeatureResourceSemanticRecord[];
}

describe("Character V3 curated core feature resources", () => {
  it("derives atomic level-up resource additions and preserves expended uses on maxima increases", () => {
    const character = confirmFoundation(canonical(132940690, "andreas"));
    const classRef = character.build.levels[0].classRef;
    const records = buildCoreFeatureResourceSemantics({
      classRef,
      subclassRefs: character.build.subclasses.map((entry) => entry.subclassRef),
    });
    const rage = character.liveState.resources.find(
      (resource) => resource.key === "action:class:rage-enter",
    )!;
    const withSpentRage = {
      ...character,
      liveState: {
        ...character.liveState,
        resources: character.liveState.resources.map((resource) =>
          resource.key === rage.key ? { ...resource, current: rage.maximum - 1 } : resource,
        ),
      },
    };
    const result = deriveLevelUpFeatureResourceUpdates({
      character: withSpentRage,
      classVersionKey: classRef.versionKey,
      nextClassLevel: 12,
      selectedSubclassVersionKey:
        character.build.subclasses.find((entry) => entry.classVersionKey === classRef.versionKey)
          ?.subclassRef.versionKey ?? null,
      semantics: records,
    });
    expect(result.blockers).toEqual([]);
    expect(result.updates).toContainEqual(
      expect.objectContaining({
        key: "action:class:rage-enter",
        current: 4,
        maximum: 5,
        provenance: "verified-rule",
      }),
    );
  });

  it.each([
    { id: 97349530, owner: "qemuel", expected: 4 },
    { id: 131296315, owner: "nikos", expected: 3 },
    { id: 131593533, owner: "eleni", expected: 3 },
    { id: 132900149, owner: "alexia", expected: 2 },
    { id: 132940690, owner: "andreas", expected: 1 },
  ])("verifies $expected exact core resources for $owner", ({ id, owner, expected }) => {
    const character = canonical(id, owner);
    const records = semantics(character);
    const report = deriveFeatureResourceSemanticReport({ character, semantics: records });
    expect(report.issues).toEqual([]);
    expect(report.matches).toHaveLength(expected);

    const result = reconcileFeatureResources({
      character,
      semantics: records,
      actorUserId: owner,
      expectedBuildRevision: character.build.revision,
      expectedLiveStateRevision: character.liveState.revision,
      mutationId: `mutation:${owner}:core-feature-resources`,
    });
    const keys = new Set(records.map((record) => record.resourceKey));
    expect(
      result.character.liveState.resources
        .filter((resource) => keys.has(resource.key))
        .every(
          (resource) =>
            resource.provenance === "verified-rule" && resource.sourceVersionKey !== null,
        ),
    ).toBe(true);
    expect(result.auditEvent.resourceKeys).toHaveLength(expected);
    if (owner === "eleni") {
      const bardic = result.character.liveState.resources.find(
        (resource) => resource.key === "action:class:bardic-inspiration",
      )!;
      expect(bardic.additionalSourceVersionKeys).toHaveLength(1);
      expect(bardic.recoveryRules).toEqual([
        { trigger: "short-rest", restore: { type: "all" } },
        { trigger: "long-rest", restore: { type: "all" } },
      ]);
    }
    if (owner === "alexia" || owner === "andreas") {
      const mixed = result.character.liveState.resources.find((resource) =>
        owner === "alexia"
          ? resource.key === "action:class:wild-shape"
          : resource.key === "action:class:rage-enter",
      )!;
      expect(mixed.recoveryRules).toContainEqual({
        trigger: "short-rest",
        restore: { type: "fixed", amount: 1 },
      });
    }
  });

  it("requires authoritative ability scores for ability-derived uses", () => {
    const imported = canonical(97349530, "qemuel");
    const character: CharacterAggregate = {
      ...imported,
      build: {
        ...imported.build,
        abilityBasis: {
          ...imported.build.abilityBasis,
          method: "rolled",
          verified: false,
        },
      },
    };
    const report = deriveFeatureResourceSemanticReport({
      character,
      semantics: semantics(character),
    });
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: "ability-basis-unverified",
        resourceKey: "action:class:tinker-s-magic",
      }),
    );
  });

  it("does not trust generic imported ability baselines without DDB current-sheet confirmation", () => {
    const imported = canonical(97349530, "qemuel");
    const character: CharacterAggregate = {
      ...imported,
      identity: {
        ...imported.identity,
        campaignId: "generic-campaign",
      },
      build: {
        ...imported.build,
        abilityBasis: {
          ...imported.build.abilityBasis,
          currentSheetConfirmation: undefined,
          verified: false,
        },
      },
    };
    const report = deriveFeatureResourceSemanticReport({
      character,
      semantics: semantics(character),
    });
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: "ability-basis-unverified",
        resourceKey: "action:class:tinker-s-magic",
      }),
    );
  });

  it("requires the exact Circle of the Stars subclass for Cosmic Omen", () => {
    const character = confirmFoundation(canonical(132900149, "alexia"));
    const records = semantics(character);
    const withoutSubclass = {
      ...character,
      build: { ...character.build, subclasses: [] },
    };
    expect(
      deriveFeatureResourceSemanticReport({ character: withoutSubclass, semantics: records })
        .issues,
    ).toContainEqual(
      expect.objectContaining({
        code: "subclass-not-present",
        resourceKey: "action:class:cosmic-omen-weal",
      }),
    );
  });

  it("rejects mismatched maxima, non-owners, stale revisions, and replay", () => {
    const character = confirmFoundation(canonical(131296315, "nikos"));
    const records = semantics(character);
    const malformed = {
      ...character,
      liveState: {
        ...character.liveState,
        resources: character.liveState.resources.map((resource) =>
          resource.key === "action:class:innate-sorcery" ? { ...resource, maximum: 3 } : resource,
        ),
      },
    };
    expect(
      deriveFeatureResourceSemanticReport({ character: malformed, semantics: records }).issues,
    ).toContainEqual(expect.objectContaining({ code: "resource-maximum-mismatch" }));
    const command = {
      character,
      semantics: records,
      actorUserId: "nikos",
      expectedBuildRevision: character.build.revision,
      expectedLiveStateRevision: character.liveState.revision,
      mutationId: "mutation:nikos:core-feature-resources",
    };
    expect(() => reconcileFeatureResources({ ...command, actorUserId: "qemuel" })).toThrow(/owner/);
    expect(() =>
      reconcileFeatureResources({
        ...command,
        expectedLiveStateRevision: character.liveState.revision + 1,
      }),
    ).toThrow(/revision conflict/);
    const confirmed = reconcileFeatureResources(command).character;
    expect(() =>
      reconcileFeatureResources({
        ...command,
        character: confirmed,
        expectedLiveStateRevision: confirmed.liveState.revision,
      }),
    ).toThrow(/already been reconciled/);
  });
});
