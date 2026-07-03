import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { afterAll, describe, expect, it } from "vitest";
import { createRuleFamilyKey, createRuleVersionKey } from "../character-v2/rule-identity";
import {
  CORE_MOB_FEATURE_RESOURCE_DEFINITIONS,
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
import {
  applyResourceTransaction,
  MOB_RESOURCE_TRANSACTION_DEFINITIONS,
  type ResourceTransactionRule,
} from "./resource-transactions";
import { reconcileSpellSlotResources, type SpellcastingSemanticRecord } from "./resource-semantics";
import { CharacterAggregateSchema, type CharacterAggregate, type ExactRuleRef } from "./schema";

type ClassRow = {
  id: string;
  name: string;
  source: string;
  raw_json: string | null;
  spellcasting_json: string | null;
};
type SubclassRow = Omit<ClassRow, "spellcasting_json"> & { class_id: string };
const db = new Database(path.join(process.cwd(), "sqlite.db"), { readonly: true });
afterAll(() => db.close());
const classRows = db
  .prepare("SELECT id, name, source, raw_json, spellcasting_json FROM classes")
  .all() as ClassRow[];
const subclassRows = db
  .prepare("SELECT id, class_id, name, source, raw_json FROM subclasses")
  .all() as SubclassRow[];

function edition(raw: string | null): string | null {
  if (!raw) return null;
  const value = JSON.parse(raw).edition;
  return typeof value === "string" ? value : null;
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

function featureRef(featureId: string, sourceId = "XPHB"): ExactRuleRef {
  const contentRevision = `catalog:${sourceId}:one`;
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
    compatibility: "core-2024",
    verification: "verified",
  };
}

function canonicalAri(): CharacterAggregate {
  const payload = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "cache", "char-131593533.json"), "utf8"),
  );
  const imported = migrateDdbPayloadToCharacterV3({
    payload,
    ownerUserId: "eleni",
    campaignId: "mother-of-bob",
  });
  const canonical = applyAcceptedV3Reconciliation({
    character: imported,
    report: reconcileCharacterV3(imported, [...classCatalog, ...subclassCatalog]),
    catalogRevision: "test-cross-resource-catalog",
  });
  return confirmImportedFoundation({
    character: canonical,
    actorUserId: "eleni",
    expectedBuildRevision: canonical.build.revision,
    mutationId: "test-only:eleni:transaction-foundation",
    abilityScores: canonical.build.abilityBasis.baseScores,
    hpMaximum: canonical.hitPoints.baseline.maximum,
    hpThroughCharacterLevel: canonical.hitPoints.baseline.throughCharacterLevel,
    reason: "Test fixture confirms the imported foundation for resource formula validation.",
  }).character;
}

function featureSemantics(character: CharacterAggregate): FeatureResourceSemanticRecord[] {
  const classRef = character.build.levels[0].classRef;
  return CORE_MOB_FEATURE_RESOURCE_DEFINITIONS.filter(
    (definition) => definition.classId === "bard",
  ).map((definition) => ({
    resourceKey: definition.resourceKey,
    classVersionKey: classRef.versionKey,
    requiredSubclassVersionKey:
      "subclassId" in definition
        ? character.build.subclasses.find(
            (subclass) => subclass.subclassRef.upstreamId === definition.subclassId,
          )!.subclassRef.versionKey
        : null,
    minimumClassLevel: definition.minimumClassLevel,
    sourceFeatureRef: featureRef(definition.featureId, definition.sourceId),
    modifierFeatureRefs:
      "modifierFeatureIds" in definition
        ? definition.modifierFeatureIds.map((id) => featureRef(id, definition.sourceId))
        : [],
    maximum: definition.maximum,
    recovery: definition.recovery,
    recoveryRules: "recoveryRules" in definition ? definition.recoveryRules : [],
  })) as FeatureResourceSemanticRecord[];
}

function transactionRule(
  character: CharacterAggregate,
  id: (typeof MOB_RESOURCE_TRANSACTION_DEFINITIONS)[number]["id"],
): ResourceTransactionRule {
  const definition = MOB_RESOURCE_TRANSACTION_DEFINITIONS.find((item) => item.id === id)!;
  return {
    id: definition.id,
    sourceFeatureRef: featureRef(definition.featureId, definition.sourceId),
    classVersionKey: character.build.levels[0].classRef.versionKey,
    requiredSubclassVersionKey: character.build.subclasses[0].subclassRef.versionKey,
    minimumClassLevel: definition.minimumClassLevel,
    cost: definition.cost,
    benefit: definition.benefit,
  };
}

function authoritativeAri(): CharacterAggregate {
  const character = canonicalAri();
  const withFeatures = reconcileFeatureResources({
    character,
    semantics: featureSemantics(character),
    actorUserId: "eleni",
    expectedBuildRevision: character.build.revision,
    expectedLiveStateRevision: character.liveState.revision,
    mutationId: "test-only:eleni:feature-resources",
  }).character;
  const classRow = classRows.find((row) => row.id === "bard")!;
  const spellcasting = JSON.parse(classRow.spellcasting_json ?? "{}");
  const catalogRevision = "test-cross-resource-spellcasting";
  const catalog: SpellcastingSemanticRecord[] = [
    {
      classVersionKey: withFeatures.build.levels[0].classRef.versionKey,
      catalogRevision,
      progression: spellcasting.progression,
    },
  ];
  return reconcileSpellSlotResources({
    character: withFeatures,
    catalog,
    catalogRevision,
    actorUserId: "eleni",
    expectedBuildRevision: withFeatures.build.revision,
    expectedLiveStateRevision: withFeatures.liveState.revision,
    mutationId: "test-only:eleni:spell-slots",
  }).character;
}

function withResourceCurrent(
  character: CharacterAggregate,
  values: Record<string, number>,
): CharacterAggregate {
  return CharacterAggregateSchema.parse({
    ...character,
    liveState: {
      ...character.liveState,
      resources: character.liveState.resources.map((resource) =>
        resource.key in values ? { ...resource, current: values[resource.key] } : resource,
      ),
    },
  });
}

describe("Character V3 atomic cross-resource transactions", () => {
  it("spends Bardic Inspiration to restore Beguiling Magic atomically", () => {
    const character = withResourceCurrent(authoritativeAri(), {
      "action:class:bardic-inspiration": 2,
      "action:class:beguiling-magic": 0,
    });
    const result = applyResourceTransaction({
      character,
      rule: transactionRule(character, "bard-glamour:beguiling-magic:regain-use"),
      selectedCostResourceKey: "action:class:bardic-inspiration",
      actorUserId: "eleni",
      expectedBuildRevision: character.build.revision,
      expectedLiveStateRevision: character.liveState.revision,
      mutationId: "mutation:eleni:restore-beguiling",
    });
    expect(result.auditEvent.cost).toMatchObject({ before: 2, after: 1 });
    expect(result.auditEvent.benefit).toMatchObject({ before: 0, after: 1 });
    expect(result.character.liveState.revision).toBe(character.liveState.revision + 1);
  });

  it("spends a chosen level 3+ spell slot to restore Mantle of Majesty", () => {
    const character = withResourceCurrent(authoritativeAri(), {
      "spell-slot:3": 2,
      "action:class:mantle-of-majesty": 0,
    });
    const result = applyResourceTransaction({
      character,
      rule: transactionRule(character, "bard-glamour:mantle-of-majesty:regain-use"),
      selectedCostResourceKey: "spell-slot:3",
      actorUserId: "eleni",
      expectedBuildRevision: character.build.revision,
      expectedLiveStateRevision: character.liveState.revision,
      mutationId: "mutation:eleni:restore-mantle",
    });
    expect(result.auditEvent.cost).toMatchObject({ before: 2, after: 1 });
    expect(result.auditEvent.benefit).toMatchObject({ before: 0, after: 1 });
  });

  it("rejects invalid costs, full targets, unverified resources, wrong subclass, and stale writes", () => {
    const base = authoritativeAri();
    const rule = transactionRule(base, "bard-glamour:mantle-of-majesty:regain-use");
    const command = {
      character: withResourceCurrent(base, {
        "spell-slot:2": 1,
        "spell-slot:3": 1,
        "action:class:mantle-of-majesty": 0,
      }),
      rule,
      selectedCostResourceKey: "spell-slot:2",
      actorUserId: "eleni",
      expectedBuildRevision: base.build.revision,
      expectedLiveStateRevision: base.liveState.revision,
      mutationId: "mutation:eleni:invalid-mantle",
    };
    expect(() => applyResourceTransaction(command)).toThrow(/level 3 or higher/);
    expect(() =>
      applyResourceTransaction({
        ...command,
        selectedCostResourceKey: "spell-slot:3",
        character: withResourceCurrent(base, { "action:class:mantle-of-majesty": 1 }),
      }),
    ).toThrow(/already full/);
    expect(() =>
      applyResourceTransaction({
        ...command,
        selectedCostResourceKey: "spell-slot:3",
        character: CharacterAggregateSchema.parse({
          ...command.character,
          liveState: {
            ...command.character.liveState,
            resources: command.character.liveState.resources.map((resource) =>
              resource.key === "spell-slot:3"
                ? { ...resource, provenance: "imported-unverified" }
                : resource,
            ),
          },
        }),
      }),
    ).toThrow(/verified rule provenance/);
    expect(() =>
      applyResourceTransaction({
        ...command,
        selectedCostResourceKey: "spell-slot:3",
        rule: { ...rule, requiredSubclassVersionKey: "subclass:wrong:version" },
      }),
    ).toThrow(/exact subclass/);
    expect(() =>
      applyResourceTransaction({
        ...command,
        selectedCostResourceKey: "spell-slot:3",
        expectedLiveStateRevision: base.liveState.revision + 1,
      }),
    ).toThrow(/revision conflict/);
    expect(() =>
      applyResourceTransaction({
        ...command,
        selectedCostResourceKey: "spell-slot:3",
        actorUserId: "qemuel",
      }),
    ).toThrow(/owner/);
    expect(() =>
      applyResourceTransaction({
        ...command,
        selectedCostResourceKey: "spell-slot:3",
        rule: {
          ...rule,
          benefit: { resourceKey: "action:class:bardic-inspiration", restore: { type: "all" } },
        },
      }),
    ).toThrow(/reviewed rule registry/);
  });
});
