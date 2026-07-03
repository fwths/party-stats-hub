import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { afterAll, describe, expect, it } from "vitest";
import { confirmClassSemantics, deriveClassSemanticReport } from "./class-semantics";
import { migrateDdbPayloadToCharacterV3 } from "./migrate-v2";
import { buildV3ReconstructionReadinessReport } from "./reconstruction";
import {
  applyAcceptedV3Reconciliation,
  reconcileCharacterV3,
  type V3CatalogRecord,
} from "./reconcile";

const db = new Database(path.join(process.cwd(), "sqlite.db"), { readonly: true });
afterAll(() => db.close());

type ClassRow = {
  id: string;
  name: string;
  source: string;
  raw_json: string | null;
  hit_dice: number;
  hp_first_level: number;
  hp_higher_levels: number;
};

function edition(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw).edition;
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

const rows = db
  .prepare(
    "SELECT id, name, source, raw_json, hit_dice, hp_first_level, hp_higher_levels FROM classes",
  )
  .all() as ClassRow[];
const catalogRevision = "mob-class-semantics:2026-06-30";
const ruleCatalog: V3CatalogRecord[] = rows.map((row) => ({
  kind: "class",
  id: row.id,
  name: row.name,
  sourceId: row.source,
  edition: edition(row.raw_json),
  contentRevision: `catalog:${row.source}:${edition(row.raw_json) ?? "legacy"}`,
}));

const fixtures = [
  { id: 97349530, owner: "qemuel", level: 7, proficiencyBonus: 3 },
  { id: 131296315, owner: "nikos", level: 7, proficiencyBonus: 3 },
  { id: 131593533, owner: "eleni", level: 7, proficiencyBonus: 3 },
  { id: 132900149, owner: "alexia", level: 7, proficiencyBonus: 3 },
  { id: 132940690, owner: "andreas", level: 7, proficiencyBonus: 3 },
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
  const report = reconcileCharacterV3(imported, ruleCatalog);
  return applyAcceptedV3Reconciliation({
    character: imported,
    report,
    catalogRevision: "test-class-catalog",
  });
}

function semantics(character: ReturnType<typeof canonical>) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return [
    ...new Map(
      character.build.levels.map((level) => [level.classRef.versionKey, level.classRef]),
    ).values(),
  ].map((ref) => {
    const row = byId.get(ref.upstreamId)!;
    return {
      classVersionKey: ref.versionKey,
      catalogRevision,
      hitDie: row.hit_dice,
      hpFirstLevel: row.hp_first_level,
      hpHigherLevels: row.hp_higher_levels,
    };
  });
}

describe("Character V3 class semantics", () => {
  it.each(fixtures)("verifies exact class progression and hit dice for $id", (fixture) => {
    const character = canonical(fixture);
    const report = deriveClassSemanticReport({
      character,
      catalog: semantics(character),
      catalogRevision,
    });
    expect(report).toMatchObject({
      characterLevel: fixture.level,
      proficiencyBonus: fixture.proficiencyBonus,
      readyToConfirmHitDice: true,
      hpFullyReconstructed: false,
      issues: [],
    });

    const confirmed = confirmClassSemantics({
      character,
      catalog: semantics(character),
      actorUserId: fixture.owner,
      expectedBuildRevision: character.build.revision,
      expectedLiveStateRevision: character.liveState.revision,
      mutationId: `mutation:${fixture.owner}:confirm-class-semantics`,
      catalogRevision,
    });
    expect(confirmed.character.liveState.hitDice).toMatchObject({
      status: "tracked",
      pools: expect.arrayContaining([expect.objectContaining({ provenance: "native" })]),
    });
    expect(confirmed.auditEvent.proficiencyBonus).toBe(fixture.proficiencyBonus);
    expect(buildV3ReconstructionReadinessReport(confirmed.character).blockedDomains).not.toContain(
      "hit-dice",
    );
  });

  it("rejects a hit-die mismatch instead of normalizing it", () => {
    const character = canonical(fixtures[4]);
    const catalog = semantics(character).map((record) => ({ ...record, hitDie: 10 }));
    const report = deriveClassSemanticReport({ character, catalog, catalogRevision });

    expect(report.readyToConfirmHitDice).toBe(false);
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: "hit-die-mismatch",
        message: expect.stringContaining("d12"),
      }),
    );
  });

  it("rejects non-owner confirmation and stale live revisions", () => {
    const character = canonical(fixtures[4]);
    const catalog = semantics(character);
    const command = {
      character,
      catalog,
      actorUserId: "qemuel",
      expectedBuildRevision: character.build.revision,
      expectedLiveStateRevision: character.liveState.revision,
      mutationId: "mutation:qemuel:unauthorized-class-semantics",
      catalogRevision,
    };
    expect(() => confirmClassSemantics(command)).toThrow(/owner/);
    expect(() =>
      confirmClassSemantics({
        ...command,
        actorUserId: "andreas",
        expectedLiveStateRevision: character.liveState.revision + 1,
      }),
    ).toThrow(/revision conflict/);
  });
});
