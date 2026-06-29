import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { afterAll, describe, expect, it } from "vitest";
import {
  createNextLevelPreview,
  type ClassCatalogRecord,
  type FeatureCatalogRecord,
} from "./level-preview";
import { migrateDdbPayloadToCharacterV2 } from "./migrate-ddb";
import {
  applyCanonicalReconciliation,
  reconcileCharacterBuild,
  type CatalogRecord,
  type CharacterReconciliationReport,
} from "./reconcile";
import { appendCharacterLevel } from "./operations";
import type { CharacterAggregate, RuleRef } from "./schema";

type CatalogRow = {
  id: string;
  name: string;
  source: string | null;
  raw_json: string | null;
};

const db = new Database(path.join(process.cwd(), "sqlite.db"), { readonly: true });
afterAll(() => db.close());

function edition(rawJson: string | null): string | null {
  if (!rawJson) return null;
  try {
    const value = JSON.parse(rawJson)?.edition;
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

function basicCatalogRows(table: string, kind: RuleRef["kind"]): CatalogRecord[] {
  return (db.prepare(`SELECT id, name, source, raw_json FROM ${table}`).all() as CatalogRow[]).map(
    (row) => ({
      kind,
      id: row.id,
      name: row.name,
      sourceId: row.source ?? "unknown",
      edition: edition(row.raw_json),
    }),
  );
}

function loadCatalog(): {
  rules: CatalogRecord[];
  classes: ClassCatalogRecord[];
  features: FeatureCatalogRecord[];
} {
  const classRows = db
    .prepare(
      "SELECT id, name, source, raw_json, hit_dice, hp_higher_levels, options_progression_json FROM classes",
    )
    .all() as Array<
    CatalogRow & {
      hit_dice: number;
      hp_higher_levels: number;
      options_progression_json: string | null;
    }
  >;
  const classes: ClassCatalogRecord[] = classRows.map((row) => ({
    kind: "class",
    id: row.id,
    name: row.name,
    sourceId: row.source ?? "unknown",
    edition: edition(row.raw_json),
    hitDie: row.hit_dice,
    fixedHp: row.hp_higher_levels,
    progressionJson: row.options_progression_json,
  }));
  const classEdition = new Map(classes.map((record) => [record.id, record.edition]));
  const subclassRows = db
    .prepare("SELECT id, class_id, name, source, raw_json FROM subclasses")
    .all() as Array<CatalogRow & { class_id: string }>;
  const subclasses: CatalogRecord[] = subclassRows.map((row) => ({
    kind: "subclass",
    id: row.id,
    name: row.name,
    sourceId: row.source ?? "unknown",
    edition: edition(row.raw_json) ?? classEdition.get(row.class_id) ?? null,
    parentId: row.class_id,
  }));
  const featureRows = db
    .prepare(
      "SELECT id, name, class_id, subclass_id, level_required, source, raw_json, options_json FROM class_features WHERE level_required IS NOT NULL",
    )
    .all() as Array<
    CatalogRow & {
      class_id: string;
      subclass_id: string | null;
      level_required: number;
      options_json: string | null;
    }
  >;
  const features: FeatureCatalogRecord[] = featureRows.map((row) => ({
    kind: "feature",
    id: row.id,
    name: row.name,
    sourceId: row.source ?? "unknown",
    edition: edition(row.raw_json),
    classId: row.class_id,
    subclassId: row.subclass_id,
    levelRequired: row.level_required,
    optionsJson: row.options_json,
  }));

  return {
    rules: [
      ...classes,
      ...subclasses,
      ...basicCatalogRows("species", "species"),
      ...basicCatalogRows("backgrounds", "background"),
      ...basicCatalogRows("feats", "feat"),
    ],
    classes,
    features,
  };
}

const catalog = loadCatalog();
const fixtures = [
  { id: 97349530, owner: "qemuel", targetLevel: 8, fixedHp: 5 },
  { id: 131296315, owner: "nikos", targetLevel: 8, fixedHp: 4 },
  { id: 131593533, owner: "eleni", targetLevel: 7, fixedHp: 5 },
  { id: 132900149, owner: "alexia", targetLevel: 7, fixedHp: 5 },
  { id: 132940690, owner: "andreas", targetLevel: 7, fixedHp: 7 },
] as const;

function mobMigrationOptions(id: number) {
  return id === 97349530
    ? {
        excludedFeatDefinitions: [
          {
            definitionId: 2048517,
            reason: "Player confirmed that Qemuel does not have a Dark Bargain.",
          },
        ],
      }
    : undefined;
}

function migrate(fixture: (typeof fixtures)[number]): CharacterAggregate {
  const payload = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "cache", `char-${fixture.id}.json`), "utf8"),
  );
  return migrateDdbPayloadToCharacterV2(payload, fixture.owner, mobMigrationOptions(fixture.id));
}

function report(character: CharacterAggregate): CharacterReconciliationReport {
  return reconcileCharacterBuild(character.build, catalog.rules);
}

describe("Character V2 canonical 2024 reconciliation", () => {
  it("canonicalizes every Dresana class level before native advancement", () => {
    const character = migrate(fixtures[4]);
    const result = report(character);
    const canonical = applyCanonicalReconciliation(character.build, result);

    expect(canonical.revision).toBe(2);
    expect(canonical.levels.every((level) => level.classRef.id === "barbarian")).toBe(true);
    expect(canonical.subclasses).toContainEqual(
      expect.objectContaining({
        classRefId: "barbarian",
        subclassRef: expect.objectContaining({ id: "barbarian-wild-heart" }),
      }),
    );
    expect(canonical.speciesRef).toMatchObject({
      id: "half-orc",
      verification: "imported-unverified",
    });
    expect(canonical.backgroundRef).toMatchObject({
      id: "outlander",
      verification: "imported-unverified",
    });

    const advanced = appendCharacterLevel(canonical, {
      expectedRevision: 2,
      classRef: canonical.levels.at(-1)!.classRef,
      hpGain: 7,
    });
    expect(advanced.levels.at(-1)).toMatchObject({ characterLevel: 7, classLevel: 7 });
  });

  it.each(fixtures)("resolves the class progression for DDB character $id", (fixture) => {
    const character = migrate(fixture);
    const result = report(character);
    expect(result.classProgressionReady).toBe(true);
    expect(
      result.entries
        .filter((entry) => ["class", "subclass"].includes(entry.imported.kind))
        .every((entry) => entry.canonical !== null),
    ).toBe(true);
  });

  it("maps specialized Magic Initiate names and ignores generated pseudo-feats", () => {
    const willow = migrate(fixtures[1]);
    const result = report(willow);
    const magicInitiate = result.entries.find((entry) =>
      entry.imported.name.startsWith("Magic Initiate"),
    );
    const backgroundAsi = result.entries.find((entry) =>
      entry.imported.name.endsWith("Ability Score Improvements"),
    );

    expect(magicInitiate).toMatchObject({
      status: "resolved-alias",
      compatibility: "core-2024",
      acceptedByCurrentRulesPolicy: true,
      canonical: { id: "magic-initiate" },
    });
    expect(magicInitiate?.aliasDetail).toContain("Cleric");
    expect(backgroundAsi).toMatchObject({ status: "derived-grant", requiresDecision: false });
  });

  it("reports legacy and missing content rather than silently blessing it as 2024", () => {
    const qemuel = report(migrate(fixtures[0]));
    const ari = report(migrate(fixtures[2]));
    const echo = report(migrate(fixtures[3]));
    const dresana = report(migrate(fixtures[4]));

    expect(qemuel.entries.find((entry) => entry.imported.name === "Dark Bargain")).toBeUndefined();
    expect(qemuel.entries.find((entry) => entry.imported.name === "Fey Touched")).toMatchObject({
      compatibility: "legacy",
      requiresDecision: true,
    });
    expect(ari.entries.find((entry) => entry.imported.name === "Fey-Touched")).toMatchObject({
      compatibility: "legacy",
    });
    expect(echo.entries.find((entry) => entry.imported.name === "Firbolg")).toMatchObject({
      compatibility: "legacy",
    });
    expect(dresana.entries.find((entry) => entry.imported.name === "Half-Orc")).toMatchObject({
      compatibility: "legacy",
    });
    expect(dresana.entries.find((entry) => entry.imported.name === "Outlander")).toMatchObject({
      compatibility: "legacy",
    });
  });

  it("classifies the newer Artificer catalog as compatible without calling it core PHB content", () => {
    const qemuel = report(migrate(fixtures[0]));
    expect(qemuel.entries.find((entry) => entry.imported.name === "Artificer")).toMatchObject({
      canonical: { id: "artificer", sourceId: "EFA" },
      compatibility: "current-2024-compatible",
      acceptedByCurrentRulesPolicy: true,
    });
    expect(qemuel.entries.find((entry) => entry.imported.name === "Armorer")).toMatchObject({
      canonical: { id: "artificer-armorer", sourceId: "EFA" },
      compatibility: "current-2024-compatible",
      acceptedByCurrentRulesPolicy: true,
    });
  });
});

describe("Character V2 next-level previews from canonical rule data", () => {
  it.each(fixtures)("previews the real next level for DDB character $id", (fixture) => {
    const character = migrate(fixture);
    const preview = createNextLevelPreview(
      character.build,
      report(character),
      catalog.classes,
      catalog.features,
    );

    expect(preview.readyToPreview).toBe(true);
    expect(preview.characterLevel.after).toBe(fixture.targetLevel);
    expect(preview.classLevel.after).toBe(fixture.targetLevel);
    expect(preview.hp.fixed).toBe(fixture.fixedHp);
    expect(preview.hp.hitDie).toBeGreaterThan(0);
  });

  it("previews the level-8 ASI/feat decision for Qemuel and Willow", () => {
    for (const fixture of [fixtures[0], fixtures[1]]) {
      const character = migrate(fixture);
      const preview = createNextLevelPreview(
        character.build,
        report(character),
        catalog.classes,
        catalog.features,
      );
      expect(preview.automaticFeatures.map((feature) => feature.name)).toContain(
        "Ability Score Improvement",
      );
      expect(preview.requiredChoices).toContainEqual(
        expect.objectContaining({ label: "Ability Score Improvement or eligible feat", count: 1 }),
      );
    }
  });

  it("previews Ari's Countercharm and required prepared-spell choice", () => {
    const character = migrate(fixtures[2]);
    const preview = createNextLevelPreview(
      character.build,
      report(character),
      catalog.classes,
      catalog.features,
    );
    expect(preview.automaticFeatures.map((feature) => feature.name)).toEqual(["Countercharm"]);
    expect(preview.requiredChoices).toContainEqual({
      id: "bard:level-7:prepared-spells",
      label: "Choose 1 prepared spell",
      count: 1,
      options: ["Eligible class spell"],
    });
  });

  it("models Echo's Elemental Fury as one choice rather than granting both options", () => {
    const character = migrate(fixtures[3]);
    const preview = createNextLevelPreview(
      character.build,
      report(character),
      catalog.classes,
      catalog.features,
    );
    expect(preview.automaticFeatures.map((feature) => feature.name)).toContain("Elemental Fury");
    expect(preview.automaticFeatures.map((feature) => feature.name)).not.toContain(
      "Potent Spellcasting",
    );
    expect(preview.automaticFeatures.map((feature) => feature.name)).not.toContain("Primal Strike");
    expect(preview.requiredChoices).toContainEqual({
      id: "druid-elemental-fury-7:option:0",
      label: "Elemental Fury",
      count: 1,
      options: ["Potent Spellcasting", "Primal Strike"],
    });
  });

  it("previews both of Dresana's automatic level-7 features", () => {
    const character = migrate(fixtures[4]);
    const preview = createNextLevelPreview(
      character.build,
      report(character),
      catalog.classes,
      catalog.features,
    );
    expect(preview.automaticFeatures.map((feature) => feature.name)).toEqual([
      "Feral Instinct",
      "Instinctive Pounce",
    ]);
    expect(preview.requiredChoices).toEqual([]);
  });

  it("refuses to classify any remaining MOB advancement as automatic", () => {
    const expectedChoiceLabels = new Map<number, string[]>([
      [97349530, ["Ability Score Improvement or eligible feat"]],
      [131296315, ["Choose 1 prepared spell", "Ability Score Improvement or eligible feat"]],
      [131593533, ["Choose 1 prepared spell"]],
      [132900149, ["Elemental Fury", "Choose 1 prepared spell"]],
    ]);

    for (const fixture of fixtures.slice(0, 4)) {
      const character = migrate(fixture);
      const preview = createNextLevelPreview(
        character.build,
        report(character),
        catalog.classes,
        catalog.features,
      );
      expect(preview.requiredChoices.map((choice) => choice.label).sort()).toEqual(
        expectedChoiceLabels.get(fixture.id)!.sort(),
      );
    }
  });
});
