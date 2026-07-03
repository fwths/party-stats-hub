import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { afterAll, describe, expect, it } from "vitest";
import { migrateDdbPayloadToCharacterV3 } from "./migrate-v2";
import {
  applyAcceptedV3Reconciliation,
  reconcileCharacterV3,
  type V3CatalogRecord,
} from "./reconcile";
import { buildV3ReconstructionReadinessReport } from "./reconstruction";
import { recoverCharacterResources } from "./live-state-operations";
import {
  deriveSpellSlotSemanticReport,
  reconcileSpellSlotResources,
  type SpellcastingSemanticRecord,
} from "./resource-semantics";

const db = new Database(path.join(process.cwd(), "sqlite.db"), { readonly: true });
afterAll(() => db.close());

type ClassRow = {
  id: string;
  name: string;
  source: string;
  raw_json: string | null;
  spellcasting_json: string | null;
};
const rows = db
  .prepare("SELECT id, name, source, raw_json, spellcasting_json FROM classes")
  .all() as ClassRow[];

function edition(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw).edition;
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

const ruleCatalog: V3CatalogRecord[] = rows.map((row) => ({
  kind: "class",
  id: row.id,
  name: row.name,
  sourceId: row.source,
  edition: edition(row.raw_json),
  contentRevision: `catalog:${row.source}:${edition(row.raw_json) ?? "legacy"}`,
}));
const catalogRevision = "mob-spellcasting-semantics:2026-06-30";

const fixtures = [
  { id: 97349530, owner: "qemuel", casterLevel: 4, slots: [4, 3], unresolvedResources: 4 },
  { id: 131296315, owner: "nikos", casterLevel: 7, slots: [4, 3, 3, 1], unresolvedResources: 3 },
  { id: 131593533, owner: "eleni", casterLevel: 7, slots: [4, 3, 3, 1], unresolvedResources: 3 },
  { id: 132900149, owner: "alexia", casterLevel: 7, slots: [4, 3, 3, 1], unresolvedResources: 4 },
  { id: 132940690, owner: "andreas", casterLevel: 0, slots: [], unresolvedResources: 2 },
] as const;

function canonical(fixture: (typeof fixtures)[number]) {
  const payload = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "cache", `char-${fixture.id}.json`), "utf8"),
  );
  const imported = migrateDdbPayloadToCharacterV3({
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
  return applyAcceptedV3Reconciliation({
    character: imported,
    report: reconcileCharacterV3(imported, ruleCatalog),
    catalogRevision: "test-class-catalog",
  });
}

function semanticCatalog(character: ReturnType<typeof canonical>): SpellcastingSemanticRecord[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return [
    ...new Map(
      character.build.levels.map((level) => [level.classRef.versionKey, level.classRef]),
    ).values(),
  ].map((ref) => {
    const row = byId.get(ref.upstreamId)!;
    const spellcasting = row.spellcasting_json ? JSON.parse(row.spellcasting_json) : {};
    return {
      classVersionKey: ref.versionKey,
      catalogRevision,
      progression: (spellcasting.progression ??
        "none") as SpellcastingSemanticRecord["progression"],
    };
  });
}

describe("Character V3 spell-slot resource semantics", () => {
  it.each(fixtures)("derives exact spell slots for $id", (fixture) => {
    const character = canonical(fixture);
    const catalog = semanticCatalog(character);
    const report = deriveSpellSlotSemanticReport({ character, catalog, catalogRevision });

    expect(report).toMatchObject({
      effectiveCasterLevel: fixture.casterLevel,
      readyToReconcile: true,
      issues: [],
    });
    expect(report.expectedSlots.map((slot) => slot.maximum)).toEqual(fixture.slots);

    if (fixture.slots.length === 0) {
      expect(() =>
        reconcileSpellSlotResources({
          character,
          catalog,
          catalogRevision,
          actorUserId: fixture.owner,
          expectedBuildRevision: character.build.revision,
          expectedLiveStateRevision: character.liveState.revision,
          mutationId: `mutation:${fixture.owner}:spell-slots`,
        }),
      ).toThrow(/no spell-slot resources/);
      return;
    }

    const result = reconcileSpellSlotResources({
      character,
      catalog,
      catalogRevision,
      actorUserId: fixture.owner,
      expectedBuildRevision: character.build.revision,
      expectedLiveStateRevision: character.liveState.revision,
      mutationId: `mutation:${fixture.owner}:spell-slots`,
    });
    const slotResources = result.character.liveState.resources.filter((resource) =>
      resource.key.startsWith("spell-slot:"),
    );
    expect(
      slotResources.every(
        (resource) => resource.sourceVersionKey !== null && resource.provenance === "verified-rule",
      ),
    ).toBe(true);
    const unresolved = buildV3ReconstructionReadinessReport(result.character).blockers.filter(
      (blocker) => blocker.code === "resource-without-rule-source",
    );
    expect(unresolved).toHaveLength(fixture.unresolvedResources);
    expect(unresolved.every((blocker) => !blocker.path.includes("spell-slot"))).toBe(true);
  });

  it("rejects slot maximum mismatches, stale revisions, and non-owner writes", () => {
    const character = canonical(fixtures[1]);
    const catalog = semanticCatalog(character);
    const malformed = {
      ...character,
      liveState: {
        ...character.liveState,
        resources: character.liveState.resources.map((resource) =>
          resource.key === "spell-slot:4" ? { ...resource, maximum: 2 } : resource,
        ),
      },
    };
    expect(
      deriveSpellSlotSemanticReport({ character: malformed, catalog, catalogRevision }).issues,
    ).toContainEqual(expect.objectContaining({ code: "slot-maximum-mismatch" }));
    const command = {
      character,
      catalog,
      catalogRevision,
      actorUserId: "nikos",
      expectedBuildRevision: character.build.revision,
      expectedLiveStateRevision: character.liveState.revision,
      mutationId: "mutation:nikos:spell-slots",
    };
    expect(() => reconcileSpellSlotResources({ ...command, actorUserId: "qemuel" })).toThrow(
      /owner/,
    );
    expect(() =>
      reconcileSpellSlotResources({
        ...command,
        expectedLiveStateRevision: character.liveState.revision + 1,
      }),
    ).toThrow(/revision conflict/);
  });

  it.each(fixtures)("keeps $id spell slots isolated from short rests and restores them on long rests", (fixture) => {
    const character = canonical(fixture);
    const catalog = semanticCatalog(character);

    if (fixture.slots.length === 0) {
      expect(character.liveState.resources.some((resource) => resource.key.startsWith("spell-slot:"))).toBe(false);
      return;
    }

    const reconciled = reconcileSpellSlotResources({
      character,
      catalog,
      catalogRevision,
      actorUserId: fixture.owner,
      expectedBuildRevision: character.build.revision,
      expectedLiveStateRevision: character.liveState.revision,
      mutationId: `mutation:${fixture.owner}:rest-proof-slots`,
    }).character;
    const slot = reconciled.liveState.resources.find((resource) =>
      resource.key.startsWith("spell-slot:"),
    )!;
    const depleted = {
      ...reconciled,
      liveState: {
        ...reconciled.liveState,
        resources: [
          ...reconciled.liveState.resources.map((resource) =>
            resource.key.startsWith("spell-slot:") ? { ...resource, current: 0 } : resource,
          ),
          {
            ...slot,
            key: "test:short-rest-control",
            label: "Short-rest control",
            current: 0,
            maximum: 1,
            recovery: "short-rest" as const,
            recoveryRules: [
              { trigger: "short-rest" as const, restore: { type: "all" as const } },
              { trigger: "long-rest" as const, restore: { type: "all" as const } },
            ],
          },
        ],
      },
    };

    const shortRest = recoverCharacterResources(depleted, {
      mutationId: `mutation:${fixture.owner}:short-rest-proof`,
      actorUserId: fixture.owner,
      expectedBuildRevision: depleted.build.revision,
      expectedLiveStateRevision: depleted.liveState.revision,
      trigger: "short-rest",
    });
    expect(
      shortRest.character.liveState.resources
        .filter((resource) => resource.key.startsWith("spell-slot:"))
        .map((resource) => resource.current),
    ).toEqual(fixture.slots.map(() => 0));

    const longRest = recoverCharacterResources(shortRest.character, {
      mutationId: `mutation:${fixture.owner}:long-rest-proof`,
      actorUserId: fixture.owner,
      expectedBuildRevision: shortRest.character.build.revision,
      expectedLiveStateRevision: shortRest.character.liveState.revision,
      trigger: "long-rest",
    });
    expect(
      longRest.character.liveState.resources
        .filter((resource) => resource.key.startsWith("spell-slot:"))
        .map((resource) => resource.current),
    ).toEqual([...fixture.slots]);
  });

  it("models Pact Magic as a separate short-rest resource pool", () => {
    const base = canonical(fixtures[1]);
    const classVersionKey = base.build.levels[0].classRef.versionKey;
    const spellSlotTemplate = base.liveState.resources.find((resource) =>
      resource.key.startsWith("spell-slot:"),
    )!;
    const pactCaster = {
      ...base,
      liveState: {
        ...base.liveState,
        resources: [
          ...base.liveState.resources.filter((resource) => !resource.key.startsWith("spell-slot:")),
          {
            ...spellSlotTemplate,
            key: "pact-slot:4",
            label: "Level 4 Pact Slots",
            current: 0,
            maximum: 2,
            recovery: "short-rest" as const,
            sourceVersionKey: null,
            recoveryRules: [],
          },
        ],
      },
    };
    const catalog: SpellcastingSemanticRecord[] = [
      {
        classVersionKey,
        catalogRevision,
        progression: "pact",
      },
    ];

    const report = deriveSpellSlotSemanticReport({
      character: pactCaster,
      catalog,
      catalogRevision,
    });

    expect(report).toMatchObject({
      effectiveCasterLevel: 0,
      expectedSlots: [],
      expectedPactSlots: [{ key: "pact-slot:4", level: 4, maximum: 2 }],
      readyToReconcile: true,
      issues: [],
    });

    const reconciled = reconcileSpellSlotResources({
      character: pactCaster,
      catalog,
      catalogRevision,
      actorUserId: fixtures[1].owner,
      expectedBuildRevision: pactCaster.build.revision,
      expectedLiveStateRevision: pactCaster.liveState.revision,
      mutationId: "mutation:nikos:pact-slots",
    }).character;
    const pactSlot = reconciled.liveState.resources.find((resource) => resource.key === "pact-slot:4")!;

    expect(pactSlot).toMatchObject({
      current: 0,
      maximum: 2,
      recovery: "short-rest",
      sourceVersionKey: classVersionKey,
      provenance: "verified-rule",
      recoveryRules: [
        { trigger: "short-rest", restore: { type: "all" } },
        { trigger: "long-rest", restore: { type: "all" } },
      ],
    });

    const shortRest = recoverCharacterResources(reconciled, {
      mutationId: "mutation:nikos:pact-short-rest",
      actorUserId: fixtures[1].owner,
      expectedBuildRevision: reconciled.build.revision,
      expectedLiveStateRevision: reconciled.liveState.revision,
      trigger: "short-rest",
    });

    expect(
      shortRest.character.liveState.resources.find((resource) => resource.key === "pact-slot:4")
        ?.current,
    ).toBe(2);
  });

  it("combines multiclass spell-slot progression with multiclass rounding", () => {
    const base = canonical(fixtures[1]);
    const secondClass = canonical(fixtures[0]).build.levels[0].classRef;
    const primaryClass = base.build.levels[0].classRef;
    const spellSlotTemplate = base.liveState.resources.find((resource) =>
      resource.key.startsWith("spell-slot:"),
    )!;
    const multiclass = {
      ...base,
      build: {
        ...base.build,
        levels: [
          ...[1, 2, 3].map((classLevel, index) => ({
            ...base.build.levels[index],
            characterLevel: index + 1,
            classLevel,
            classRef: primaryClass,
            provenance: "imported-reviewed-multiclass" as const,
          })),
          ...[1, 2, 3, 4].map((classLevel, index) => ({
            ...base.build.levels[index + 3],
            characterLevel: index + 4,
            classLevel,
            classRef: secondClass,
            provenance: "imported-reviewed-multiclass" as const,
          })),
        ],
      },
      liveState: {
        ...base.liveState,
        hitDice:
          base.liveState.hitDice.status === "tracked"
            ? {
                ...base.liveState.hitDice,
                pools: [
                  {
                    ...base.liveState.hitDice.pools[0],
                    classVersionKey: primaryClass.versionKey,
                    remaining: Math.min(base.liveState.hitDice.pools[0].remaining, 3),
                    maximum: 3,
                  },
                  {
                    ...base.liveState.hitDice.pools[0],
                    classVersionKey: secondClass.versionKey,
                    remaining: Math.min(base.liveState.hitDice.pools[0].remaining, 4),
                    maximum: 4,
                  },
                ],
              }
            : base.liveState.hitDice,
        resources: [
          ...base.liveState.resources.filter((resource) => !resource.key.startsWith("spell-slot:")),
          ...[4, 3, 2].map((maximum, index) => ({
            ...spellSlotTemplate,
            key: `spell-slot:${index + 1}`,
            label: `Level ${index + 1} Spell Slots`,
            current: 0,
            maximum,
            recovery: "long-rest" as const,
            sourceVersionKey: null,
            recoveryRules: [],
          })),
        ],
      },
    };
    const catalog: SpellcastingSemanticRecord[] = [
      {
        classVersionKey: primaryClass.versionKey,
        catalogRevision,
        progression: "half",
      },
      {
        classVersionKey: secondClass.versionKey,
        catalogRevision,
        progression: "full",
      },
    ];

    const report = deriveSpellSlotSemanticReport({
      character: multiclass,
      catalog,
      catalogRevision,
    });

    expect(report).toMatchObject({
      effectiveCasterLevel: 5,
      expectedSlots: [
        { key: "spell-slot:1", level: 1, maximum: 4 },
        { key: "spell-slot:2", level: 2, maximum: 3 },
        { key: "spell-slot:3", level: 3, maximum: 2 },
      ],
      expectedPactSlots: [],
      readyToReconcile: true,
      issues: [],
    });

    const reconciled = reconcileSpellSlotResources({
      character: multiclass,
      catalog,
      catalogRevision,
      actorUserId: fixtures[1].owner,
      expectedBuildRevision: multiclass.build.revision,
      expectedLiveStateRevision: multiclass.liveState.revision,
      mutationId: "mutation:nikos:multiclass-spell-slots",
    }).character;

    expect(
      reconciled.liveState.resources
        .filter((resource) => resource.key.startsWith("spell-slot:"))
        .map((resource) => ({
          key: resource.key,
          sourceVersionKey: resource.sourceVersionKey,
          recoveryRules: resource.recoveryRules,
        })),
    ).toEqual([
      {
        key: "spell-slot:1",
        sourceVersionKey: `multiclass-spellcasting:${[primaryClass.versionKey, secondClass.versionKey].sort().join("+")}`,
        recoveryRules: [{ trigger: "long-rest", restore: { type: "all" } }],
      },
      {
        key: "spell-slot:2",
        sourceVersionKey: `multiclass-spellcasting:${[primaryClass.versionKey, secondClass.versionKey].sort().join("+")}`,
        recoveryRules: [{ trigger: "long-rest", restore: { type: "all" } }],
      },
      {
        key: "spell-slot:3",
        sourceVersionKey: `multiclass-spellcasting:${[primaryClass.versionKey, secondClass.versionKey].sort().join("+")}`,
        recoveryRules: [{ trigger: "long-rest", restore: { type: "all" } }],
      },
    ]);
  });
});
