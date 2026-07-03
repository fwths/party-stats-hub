import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import {
  generalFeatCandidateFromRow,
  loadClassHitPointRule,
  loadClassSpellCatalog,
  loadLevelUpFeatureCatalog,
} from "./level-up-catalog.server";

function row(raw: object) {
  return {
    id: "athlete",
    name: "Athlete",
    category: "General",
    level_requirement: 4,
    repeatable: 0,
    source: "XPHB",
    raw_json: JSON.stringify(raw),
  };
}

describe("V3 exact-version General Feat catalog", () => {
  it("preserves OR prerequisite alternatives", () => {
    const candidate = generalFeatCandidateFromRow(
      row({
        prerequisite: [
          { level: 4, ability: [{ str: 13 }] },
          { level: 4, ability: [{ dex: 13 }] },
        ],
      }),
    );
    expect(candidate).toMatchObject({
      minimumCharacterLevel: 4,
      prerequisiteAlternatives: [
        [{ ability: "STR", minimum: 13 }],
        [{ ability: "DEX", minimum: 13 }],
      ],
      ref: { sourceId: "XPHB", compatibility: "core-2024", verification: "verified" },
    });
  });

  it("fails closed for unsupported feat prerequisites and non-2024 sources", () => {
    expect(
      generalFeatCandidateFromRow(row({ prerequisite: [{ feat: ["other-feat"] }] })),
    ).toBeNull();
    expect(generalFeatCandidateFromRow({ ...row({}), source: "TCE" })).toBeNull();
  });

  it("loads an exact-version class Hit Point rule from the catalog columns", () => {
    const sqlite = new Database(":memory:");
    sqlite.exec(
      "CREATE TABLE classes (id TEXT PRIMARY KEY, hit_dice INTEGER, hp_higher_levels INTEGER, source TEXT)",
    );
    sqlite.prepare("INSERT INTO classes VALUES (?, ?, ?, ?)").run("barbarian", 12, 7, "XPHB");
    expect(
      loadClassHitPointRule(sqlite, {
        versionKey: "rule:class:xphb:barbarian:2024",
        upstreamId: "barbarian",
        sourceId: "XPHB",
      }),
    ).toEqual({
      classVersionKey: "rule:class:xphb:barbarian:2024",
      hitDie: 12,
      fixedContribution: 7,
    });
    sqlite.close();
  });

  it("loads verified XPHB class spell options from the class spell table", () => {
    const sqlite = new Database(":memory:");
    sqlite.exec(
      "CREATE TABLE classes (id TEXT PRIMARY KEY, source TEXT); CREATE TABLE spells (id TEXT PRIMARY KEY, name TEXT, level INTEGER, source TEXT); CREATE TABLE class_spells (class_id TEXT, spell_id TEXT)",
    );
    sqlite.prepare("INSERT INTO classes VALUES (?, ?)").run("druid", "XPHB");
    sqlite
      .prepare("INSERT INTO spells VALUES (?, ?, ?, ?)")
      .run("cure-wounds", "Cure Wounds", 1, "XPHB");
    sqlite
      .prepare("INSERT INTO spells VALUES (?, ?, ?, ?)")
      .run("legacy-spell", "Legacy Spell", 1, "TCE");
    sqlite.prepare("INSERT INTO class_spells VALUES (?, ?)").run("druid", "cure-wounds");
    sqlite.prepare("INSERT INTO class_spells VALUES (?, ?)").run("druid", "legacy-spell");

    const catalog = loadClassSpellCatalog(sqlite, {
      versionKey: "rule:class:xphb:druid:2024",
      upstreamId: "druid",
      sourceId: "XPHB",
    });

    expect(catalog).toHaveLength(1);
    expect(catalog[0]).toMatchObject({
      level: 1,
      classVersionKeys: ["rule:class:xphb:druid:2024"],
      spellRef: {
        name: "Cure Wounds",
        sourceId: "XPHB",
        verification: "verified",
      },
    });
    sqlite.close();
  });

  it("loads exact class and explicitly allowed subclass feature semantics", () => {
    const sqlite = new Database(":memory:");
    sqlite.exec(
      "CREATE TABLE class_features (id TEXT, name TEXT, class_id TEXT, subclass_id TEXT, level_required INTEGER, source TEXT, class_source TEXT, subclass_source TEXT, options_json TEXT, uses_json TEXT, mathematical_recovery_json TEXT)",
    );
    const insert = sqlite.prepare(
      "INSERT INTO class_features VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    );
    insert.run(
      "danger-sense",
      "Danger Sense",
      "barbarian",
      null,
      2,
      "XPHB",
      "XPHB",
      null,
      null,
      null,
      null,
    );
    insert.run(
      "frenzy",
      "Frenzy",
      "barbarian",
      "berserker",
      3,
      "XPHB",
      "XPHB",
      "XPHB",
      "[]",
      null,
      null,
    );
    insert.run(
      "other",
      "Other Path",
      "barbarian",
      "world-tree",
      3,
      "XPHB",
      "XPHB",
      "XPHB",
      null,
      null,
      null,
    );
    const catalog = loadLevelUpFeatureCatalog(
      sqlite,
      { versionKey: "class:v", upstreamId: "barbarian", sourceId: "XPHB" },
      [{ versionKey: "subclass:v", upstreamId: "berserker", sourceId: "XPHB" }],
    );
    expect(catalog.map((entry) => entry.featureRef.name)).toEqual(["Danger Sense", "Frenzy"]);
    expect(catalog[1]).toMatchObject({
      classVersionKey: "class:v",
      subclassVersionKey: "subclass:v",
      levelRequired: 3,
    });
    sqlite.close();
  });
});
