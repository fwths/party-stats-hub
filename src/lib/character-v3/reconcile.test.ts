import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { afterAll, describe, expect, it } from "vitest";
import { migrateDdbPayloadToCharacterV3 } from "./migrate-v2";
import {
  applyAcceptedV3Reconciliation,
  recordContentVersionDecision,
  reconcileCharacterV3,
  V3ReconciliationConflictError,
  V3ReconciliationPermissionError,
  type V3CatalogRecord,
} from "./reconcile";
import type { ExactRuleRef } from "./schema";

type Row = { id: string; name: string; source: string | null; raw_json: string | null };
const db = new Database(path.join(process.cwd(), "sqlite.db"), { readonly: true });
afterAll(() => db.close());

function edition(rawJson: string | null): string | null {
  if (!rawJson) return null;
  try {
    const value = JSON.parse(rawJson).edition;
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

function rows(table: string, kind: ExactRuleRef["kind"]): V3CatalogRecord[] {
  return (db.prepare(`SELECT id, name, source, raw_json FROM ${table}`).all() as Row[]).map(
    (row) => ({
      kind,
      id: row.id,
      name: row.name,
      sourceId: row.source ?? "unknown",
      edition: edition(row.raw_json),
      contentRevision: `catalog:${row.source ?? "unknown"}:${edition(row.raw_json) ?? "legacy"}`,
    }),
  );
}

function catalog(): V3CatalogRecord[] {
  const classes = rows("classes", "class");
  const classEdition = new Map(classes.map((record) => [record.id, record.edition]));
  const subclasses = (
    db.prepare("SELECT id, class_id, name, source, raw_json FROM subclasses").all() as Array<
      Row & { class_id: string }
    >
  ).map<V3CatalogRecord>((row) => ({
    kind: "subclass",
    id: row.id,
    name: row.name,
    sourceId: row.source ?? "unknown",
    edition: edition(row.raw_json) ?? classEdition.get(row.class_id) ?? null,
    contentRevision: `catalog:${row.source ?? "unknown"}:${edition(row.raw_json) ?? classEdition.get(row.class_id) ?? "legacy"}`,
  }));
  return [
    ...classes,
    ...subclasses,
    ...rows("species", "species"),
    ...rows("backgrounds", "background"),
    ...rows("feats", "feat"),
    ...rows("spells", "spell"),
    ...rows("weapons", "item"),
    ...rows("armor", "item"),
  ];
}

const ruleCatalog = catalog();
const fixtures = [
  { id: 97349530, owner: "qemuel" },
  { id: 131296315, owner: "nikos" },
  { id: 131593533, owner: "eleni" },
  { id: 132900149, owner: "alexia" },
  { id: 132940690, owner: "andreas" },
] as const;

function migrate(fixture: (typeof fixtures)[number]) {
  const raw = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "cache", `char-${fixture.id}.json`), "utf8"),
  );
  return migrateDdbPayloadToCharacterV3({
    payload: raw,
    ownerUserId: fixture.owner,
    campaignId: "mother-of-bob",
    v2MigrationOptions:
      fixture.id === 97349530
        ? {
            excludedFeatDefinitions: [
              {
                definitionId: 2048517,
                reason: "Player confirmed that Qemuel does not have a Dark Bargain.",
              },
            ],
          }
        : undefined,
  });
}

describe("Character V3 exact catalog reconciliation", () => {
  it.each(fixtures)("canonicalizes the current class progression for $id", (fixture) => {
    const character = migrate(fixture);
    const report = reconcileCharacterV3(character, ruleCatalog);
    const applied = applyAcceptedV3Reconciliation({
      character,
      report,
      catalogRevision: "sqlite:test-current",
    });

    expect(report.entries.find((entry) => entry.imported.kind === "class")).toMatchObject({
      status: "resolved-current",
      requiresDecision: false,
    });
    expect(applied.build.levels.every((level) => level.classRef.verification === "verified")).toBe(
      true,
    );
    expect(new Set(applied.build.levels.map((level) => level.classRef.versionKey)).size).toBe(1);
    expect(applied.build.revision).toBe(character.build.revision + 1);
    expect(applied.build.rulesContext.catalogRevision).toBe("sqlite:test-current");
  });

  it("accepts current-compatible Artificer without pretending it is core PHB", () => {
    const character = migrate(fixtures[0]);
    const applied = applyAcceptedV3Reconciliation({
      character,
      report: reconcileCharacterV3(character, ruleCatalog),
      catalogRevision: "sqlite:test-current",
    });
    expect(applied.build.levels[0].classRef).toMatchObject({
      name: "Artificer",
      sourceId: "EFA",
      compatibility: "current-2024-compatible",
      verification: "verified",
    });
  });

  it("canonicalizes accepted spells while retaining unresolved legacy references", () => {
    const ari = migrate(fixtures[2]);
    const report = reconcileCharacterV3(ari, ruleCatalog);
    const applied = applyAcceptedV3Reconciliation({
      character: ari,
      report,
      catalogRevision: "sqlite:test-current",
    });
    const resolvedSpells = applied.build.spells.filter(
      (spell) => spell.spellRef.verification === "verified",
    );
    expect(resolvedSpells.length).toBeGreaterThan(0);
    expect(resolvedSpells.every((spell) => spell.spellRef.versionKey.startsWith("spell:"))).toBe(
      true,
    );
    expect(report.readyForNativeAuthority).toBe(false);
    expect(report.decisionCount).toBeGreaterThan(0);
  });

  it("does not silently bless Dresana's legacy species and background", () => {
    const character = migrate(fixtures[4]);
    const report = reconcileCharacterV3(character, ruleCatalog);
    expect(report.entries.find((entry) => entry.imported.name === "Half-Orc")).toMatchObject({
      status: "legacy-match",
      requiresDecision: true,
    });
    expect(report.entries.find((entry) => entry.imported.name === "Outlander")).toMatchObject({
      status: "legacy-match",
      requiresDecision: true,
    });
    const applied = applyAcceptedV3Reconciliation({
      character,
      report,
      catalogRevision: "sqlite:test-current",
    });
    expect(applied.build.speciesRef.verification).toBe("imported-unverified");
    expect(applied.build.backgroundRef.verification).toBe("imported-unverified");
  });

  it("preserves imported capabilities explicitly until their rule sources are reconciled", () => {
    for (const fixture of fixtures) {
      const capabilities = migrate(fixture).migrationBaseline?.capabilities ?? [];
      expect(capabilities.length).toBeGreaterThan(0);
      expect(
        capabilities.every((capability) => capability.status === "imported-unreconciled"),
      ).toBe(true);
    }
  });

  it("records Andreas accepting the matched legacy Half-Orc version", () => {
    const imported = migrate(fixtures[4]);
    const accepted = applyAcceptedV3Reconciliation({
      character: imported,
      report: reconcileCharacterV3(imported, ruleCatalog),
      catalogRevision: "sqlite:test-current",
    });
    const report = reconcileCharacterV3(accepted, ruleCatalog);
    const halfOrc = report.entries.find((entry) => entry.imported.name === "Half-Orc")!;
    const result = recordContentVersionDecision({
      character: accepted,
      report,
      decision: {
        mutationId: "andreas:accept-half-orc",
        actorUserId: "andreas",
        expectedBuildRevision: accepted.build.revision,
        importedVersionKey: halfOrc.imported.versionKey,
        resolution: "accept-matched-version",
        reason: "Player approved retaining the matched legacy species for this character.",
        catalogRevision: "sqlite:test-current",
      },
    });

    expect(result.character.build.speciesRef).toMatchObject({
      name: "Half-Orc",
      sourceId: "PHB",
      compatibility: "legacy-5e-compatible",
      verification: "imported-unverified",
    });
    expect(result.character.resolutions).toContainEqual(
      expect.objectContaining({
        type: "content-version-decision",
        resolution: "accept-matched-version",
        decidedByUserId: "andreas",
      }),
    );
    const after = reconcileCharacterV3(result.character, ruleCatalog);
    expect(after.entries.find((entry) => entry.imported.name === "Half-Orc")).toMatchObject({
      status: "resolved-by-decision",
      requiresDecision: false,
    });
    expect(after.capabilityBlockerCount).toBeGreaterThan(0);
    expect(after.readyForNativeAuthority).toBe(false);
  });

  it("can retain an imported version without falsely verifying it", () => {
    const character = migrate(fixtures[4]);
    const report = reconcileCharacterV3(character, ruleCatalog);
    const outlander = report.entries.find((entry) => entry.imported.name === "Outlander")!;
    const result = recordContentVersionDecision({
      character,
      report,
      decision: {
        mutationId: "andreas:retain-outlander-import",
        actorUserId: "andreas",
        expectedBuildRevision: character.build.revision,
        importedVersionKey: outlander.imported.versionKey,
        resolution: "retain-imported",
        reason: "Keep the imported background until a campaign-approved replacement is chosen.",
        catalogRevision: "sqlite:test-current",
      },
    });
    expect(result.character.build.backgroundRef.versionKey).toBe(outlander.imported.versionKey);
    expect(result.character.build.backgroundRef.verification).toBe("imported-unverified");
    expect(
      reconcileCharacterV3(result.character, ruleCatalog).entries.find(
        (entry) => entry.imported.name === "Outlander",
      ),
    ).toMatchObject({ status: "resolved-by-decision", requiresDecision: false });
  });

  it("enforces owner and build-revision checks for content decisions", () => {
    const character = migrate(fixtures[4]);
    const report = reconcileCharacterV3(character, ruleCatalog);
    const halfOrc = report.entries.find((entry) => entry.imported.name === "Half-Orc")!;
    const decision = {
      mutationId: "decision:guard",
      actorUserId: "andreas",
      expectedBuildRevision: character.build.revision,
      importedVersionKey: halfOrc.imported.versionKey,
      resolution: "retain-imported" as const,
      reason: "Test decision guards.",
      catalogRevision: "sqlite:test-current",
    };
    expect(() =>
      recordContentVersionDecision({
        character,
        report,
        decision: { ...decision, actorUserId: "qemuel" },
      }),
    ).toThrow(V3ReconciliationPermissionError);
    const adminOverride = recordContentVersionDecision({
      character,
      report,
      decision: {
        ...decision,
        mutationId: "decision:admin-override",
        actorUserId: "qemuel",
        authority: {
          actorRole: "admin",
          mode: "administrator-override",
          reason: "Creator-approved migration support for Andreas while hardening schema.",
        },
      },
    });
    expect(adminOverride.auditEvent.authorization).toEqual({
      mode: "administrator-override",
      actorRole: "admin",
      overrideReason: "Creator-approved migration support for Andreas while hardening schema.",
    });
    expect(adminOverride.character.resolutions).toContainEqual(
      expect.objectContaining({
        type: "content-version-decision",
        decidedByUserId: "qemuel",
      }),
    );
    expect(() =>
      recordContentVersionDecision({
        character,
        report,
        decision: { ...decision, expectedBuildRevision: character.build.revision + 1 },
      }),
    ).toThrow(V3ReconciliationConflictError);
  });
});
