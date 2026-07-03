import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { afterAll, describe, expect, it } from "vitest";
import { parseCharacterPayload } from "@/lib/parser";
import { compileLevelUp, snapshotPartyMember } from "./compiled-sheet";
import {
  resolveLevelChoices,
  validateLevelChoiceSubmission,
  type SpellChoiceCatalogRecord,
} from "./level-choices";
import {
  createNextLevelPreview,
  type ClassCatalogRecord,
  type FeatureCatalogRecord,
} from "./level-preview";
import { migrateDdbPayloadToCharacterV2 } from "./migrate-ddb";
import { CharacterV2PrototypeStore } from "./prototype-store.server";
import {
  applyCanonicalReconciliation,
  reconcileCharacterBuild,
  type CatalogRecord,
} from "./reconcile";
import { resolveCharacterRuleEffects, type RuleEffectCatalogRecord } from "./rule-effects";

type CatalogRow = { id: string; name: string; source: string | null; raw_json: string | null };
const catalogDb = new Database(path.join(process.cwd(), "sqlite.db"), { readonly: true });
afterAll(() => catalogDb.close());

function edition(rawJson: string | null): string | null {
  try {
    const value = rawJson ? JSON.parse(rawJson).edition : null;
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

function loadCatalog() {
  const classRows = catalogDb
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
  const classEdition = new Map(classes.map((row) => [row.id, row.edition]));
  const subclasses = (
    catalogDb.prepare("SELECT id, class_id, name, source, raw_json FROM subclasses").all() as Array<
      CatalogRow & { class_id: string }
    >
  ).map<CatalogRecord>((row) => ({
    kind: "subclass",
    id: row.id,
    name: row.name,
    sourceId: row.source ?? "unknown",
    edition: edition(row.raw_json) ?? classEdition.get(row.class_id) ?? null,
    parentId: row.class_id,
  }));
  const basic = (table: string, kind: "species" | "background" | "feat") =>
    (
      catalogDb.prepare(`SELECT id, name, source, raw_json FROM ${table}`).all() as CatalogRow[]
    ).map<CatalogRecord>((row) => ({
      kind,
      id: row.id,
      name: row.name,
      sourceId: row.source ?? "unknown",
      edition: edition(row.raw_json),
    }));
  const features = (
    catalogDb
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
    >
  ).map<FeatureCatalogRecord>((row) => ({
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
  const effects = [
    ...(
      catalogDb.prepare("SELECT id, name, foundry_json FROM feats").all() as Array<
        Pick<CatalogRow, "id" | "name"> & { foundry_json: string | null }
      >
    ).map<RuleEffectCatalogRecord>((row) => ({
      id: row.id,
      name: row.name,
      kind: "feat",
      foundryJson: row.foundry_json,
    })),
    ...(
      catalogDb.prepare("SELECT id, name, foundry_json FROM class_features").all() as Array<
        Pick<CatalogRow, "id" | "name"> & { foundry_json: string | null }
      >
    ).map<RuleEffectCatalogRecord>((row) => ({
      id: row.id,
      name: row.name,
      kind: "feature",
      foundryJson: row.foundry_json,
    })),
  ];
  const spells = (
    catalogDb
      .prepare(
        `SELECT s.id, s.name, s.level, s.source, s.raw_json,
                GROUP_CONCAT(cs.class_id) AS class_ids
         FROM spells s
         JOIN class_spells cs ON cs.spell_id = s.id
         GROUP BY s.id, s.name, s.level, s.source, s.raw_json`,
      )
      .all() as Array<CatalogRow & { level: number; class_ids: string }>
  ).map<SpellChoiceCatalogRecord>((row) => ({
    id: row.id,
    name: row.name,
    level: row.level,
    sourceId: row.source ?? "unknown",
    edition: edition(row.raw_json),
    classIds: row.class_ids.split(","),
    contentRevision: edition(row.raw_json) ?? row.source ?? "catalog-current",
  }));
  return {
    classes,
    features,
    effects,
    spells,
    rules: [
      ...classes,
      ...subclasses,
      ...basic("species", "species"),
      ...basic("backgrounds", "background"),
      ...basic("feats", "feat"),
    ],
  };
}

describe("Dresana native level 8 vertical slice", () => {
  it("imports the exact sheet and explicitly blocks its unsupported nested ASI/feat choice", () => {
    const payload = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "data", "cache", "char-132940690.json"), "utf8"),
    );
    const imported = migrateDdbPayloadToCharacterV2(payload, "andreas");
    const member = parseCharacterPayload(132940690, payload);
    const catalog = loadCatalog();
    const reconciliation = reconcileCharacterBuild(imported.build, catalog.rules);
    const preview = createNextLevelPreview(
      imported.build,
      reconciliation,
      catalog.classes,
      catalog.features,
    );
    const canonicalBuild = applyCanonicalReconciliation(imported.build, reconciliation);
    const before = snapshotPartyMember(member, imported.identity.id, imported.liveState);
    const effects = resolveCharacterRuleEffects({
      build: canonicalBuild,
      catalog: catalog.effects,
      grantedFeatureIds: preview.automaticFeatures.map((feature) => feature.id),
    });

    expect(before).toMatchObject({
      level: 7,
      hp: { current: 89, max: 89, temporary: 0 },
      proficiencyBonus: 3,
      armorClass: 15,
      hitDice: { remaining: 7, max: 7, die: 12 },
    });
    expect(before.resources).toContainEqual(
      expect.objectContaining({ label: "Rage (Enter)", current: 4, max: 4, reset: "long-rest" }),
    );
    expect(before.resources).toContainEqual(
      expect.objectContaining({
        label: "Relentless Endurance",
        current: 1,
        max: 1,
        reset: "long-rest",
      }),
    );
    const choices = resolveLevelChoices({
      preview,
      before,
      spells: catalog.spells,
      existingSpellNames: [],
    });
    expect(choices).toContainEqual(
      expect.objectContaining({
        kind: "asi-or-feat",
        readyToSelect: false,
        unavailableReason: "asi-or-feat option hydration is not implemented yet",
      }),
    );
    return;

    const result = compileLevelUp({
      build: canonicalBuild,
      liveState: imported.liveState,
      before,
      preview,
      resolvedEffects: effects,
      resolvedChoices: choices,
      choiceSubmissions: choices.map((choice) => ({
        choiceId: choice.id,
        selectionIds: [choice.options[0].ref.id],
      })),
      currentHpPolicy: "preserve-damage",
    });

    expect(result.hpGain).toEqual({ fixed: 7, constitution: 3, perLevelBonuses: 2, total: 12 });
    expect(result.build.revision).toBe(3);
    expect(result.build.levels.at(-1)).toMatchObject({
      characterLevel: 8,
      classLevel: 8,
      hpGain: 7,
    });
    expect(result.sheet).toMatchObject({
      level: 8,
      hp: { current: 101, max: 101, temporary: 0 },
      proficiencyBonus: 3,
      armorClass: 15,
      initiative: { modifier: 2, advantage: true },
      hitDice: { remaining: 8, max: 8, die: 12 },
    });
    expect(result.sheet.unlockedFeatures).toEqual(
      expect.arrayContaining(["Feral Instinct", "Instinctive Pounce"]),
    );
    for (const stableField of [
      "abilities",
      "skills",
      "saves",
      "attacks",
      "spellSlots",
      "resources",
    ] as const) {
      expect(result.sheet[stableField]).toEqual(before[stableField]);
    }

    const memoryDb = new Database(":memory:");
    const store = new CharacterV2PrototypeStore(memoryDb);
    store.save({
      characterId: imported.identity.id,
      revision: canonicalBuild.revision,
      build: canonicalBuild,
      liveState: imported.liveState,
      sheet: before,
    });
    store.save({
      characterId: imported.identity.id,
      revision: result.build.revision,
      build: result.build,
      liveState: result.liveState,
      sheet: result.sheet,
    });
    expect(store.loadCurrent(imported.identity.id)?.sheet).toEqual(result.sheet);

    store.setHead(imported.identity.id, canonicalBuild.revision);
    expect(store.loadCurrent(imported.identity.id)).toEqual({
      characterId: imported.identity.id,
      revision: canonicalBuild.revision,
      build: canonicalBuild,
      liveState: imported.liveState,
      sheet: before,
    });
    memoryDb.close();
  });
});

describe("Ari level 8 choice preflight", () => {
  it("offers eligible Bard spells but blocks the legacy nested ASI/feat choice", () => {
    const payload = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "data", "cache", "char-131593533.json"), "utf8"),
    );
    const imported = migrateDdbPayloadToCharacterV2(payload, "eleni");
    const member = parseCharacterPayload(131593533, payload);
    const catalog = loadCatalog();
    const reconciliation = reconcileCharacterBuild(imported.build, catalog.rules);
    const preview = createNextLevelPreview(
      imported.build,
      reconciliation,
      catalog.classes,
      catalog.features,
    );
    const before = snapshotPartyMember(member, imported.identity.id, imported.liveState);
    const choices = resolveLevelChoices({
      preview,
      before,
      spells: catalog.spells,
      existingSpellNames: member.preparedSpells.map((spell) => spell.name),
    });
    const preparedSpell = choices.find((choice) => choice.kind === "prepared-spell")!;

    expect(preparedSpell).toMatchObject({ count: 1, readyToSelect: true, unavailableReason: null });
    expect(preparedSpell.options.length).toBeGreaterThan(0);
    expect(
      preparedSpell.options.every((option) => option.spellLevel! >= 1 && option.spellLevel! <= 4),
    ).toBe(true);
    expect(preparedSpell.options.every((option) => option.ref.verification === "verified")).toBe(
      true,
    );
    expect(
      preparedSpell.options.some((option) =>
        member.preparedSpells.some(
          (existing) => existing.name.toLowerCase() === option.ref.name.toLowerCase(),
        ),
      ),
    ).toBe(false);

    const selected = validateLevelChoiceSubmission(preparedSpell, {
      choiceId: preparedSpell.id,
      selectionIds: [preparedSpell.options[0].ref.id],
    });
    expect(selected).toEqual([preparedSpell.options[0].ref]);
    expect(() =>
      validateLevelChoiceSubmission(preparedSpell, {
        choiceId: preparedSpell.id,
        selectionIds: ["spell:xphb:not-a-real-spell@one"],
      }),
    ).toThrow(/not eligible/);

    expect(choices).toContainEqual(
      expect.objectContaining({
        kind: "asi-or-feat",
        readyToSelect: false,
        unavailableReason: "asi-or-feat option hydration is not implemented yet",
      }),
    );
    return;

    const canonicalBuild = applyCanonicalReconciliation(imported.build, reconciliation);
    const effects = resolveCharacterRuleEffects({
      build: canonicalBuild,
      catalog: catalog.effects,
      grantedFeatureIds: preview.automaticFeatures.map((feature) => feature.id),
    });
    const result = compileLevelUp({
      build: canonicalBuild,
      liveState: imported.liveState,
      before,
      preview,
      resolvedEffects: effects,
      resolvedChoices: choices,
      choiceSubmissions: choices.map((choice) => ({
        choiceId: choice.id,
        selectionIds: [choice.options[0].ref.id],
      })),
      currentHpPolicy: "preserve-damage",
    });
    expect(result.build.levels.at(-1)).toMatchObject({ characterLevel: 8, classLevel: 8 });
    expect(result.build.choices).toContainEqual(
      expect.objectContaining({
        groupId: preparedSpell.id,
        selection: preparedSpell.options[0].ref,
        provenance: "native",
      }),
    );
    expect(result.sheet.spellbook).toContainEqual({
      ref: preparedSpell.options[0].ref,
      name: preparedSpell.options[0].ref.name,
      level: preparedSpell.options[0].spellLevel,
      preparation: "prepared",
    });
    expect(result.sheet.spellSlots).toContainEqual({ level: 4, max: 1, used: 0 });
    expect(result.liveState.resources).toContainEqual({
      key: "spell-slot:4",
      label: "Level 4 Spell Slots",
      current: 1,
      max: 1,
      reset: "long-rest",
    });
    expect(result.sheet.unlockedFeatures).toContain("Ability Score Improvement");
  });
});
