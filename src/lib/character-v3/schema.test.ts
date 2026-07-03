import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { migrateDdbPayloadToCharacterV2 } from "../character-v2/migrate-ddb";
import { createRuleFamilyKey, createRuleVersionKey } from "../character-v2/rule-identity";
import { parseCharacterPayload } from "../parser";
import { migrateCharacterV2ToV3, migrateDdbPayloadToCharacterV3 } from "./migrate-v2";
import {
  CharacterAggregateSchema,
  ExactRuleRefSchema,
  HitPointLedgerSchema,
  maximumHitPoints,
} from "./schema";

const fixtures = [
  { id: 97349530, owner: "qemuel", level: 7, caster: true },
  { id: 131296315, owner: "nikos", level: 7, caster: true },
  { id: 131593533, owner: "eleni", level: 7, caster: true },
  { id: 132900149, owner: "alexia", level: 7, caster: true },
  { id: 132940690, owner: "andreas", level: 7, caster: false },
] as const;

function payload(id: number): unknown {
  return JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "cache", `char-${id}.json`), "utf8"),
  );
}

function v2Options(id: number) {
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

const migratedFixtures = new Map<number, ReturnType<typeof migrateDdbPayloadToCharacterV3>>();

function migrate(index = 4) {
  const fixture = fixtures[index];
  const cached = migratedFixtures.get(fixture.id);
  if (cached) return structuredClone(cached);
  const character = migrateDdbPayloadToCharacterV3({
    payload: payload(fixture.id),
    ownerUserId: fixture.owner,
    campaignId: "mother-of-bob",
    v2MigrationOptions: v2Options(fixture.id),
  });
  migratedFixtures.set(fixture.id, character);
  return structuredClone(character);
}

describe("Character V3 hardened migration", () => {
  it.each(fixtures)("strictly represents DDB character $id", (fixture) => {
    const character = migrateDdbPayloadToCharacterV3({
      payload: payload(fixture.id),
      ownerUserId: fixture.owner,
      campaignId: "mother-of-bob",
      v2MigrationOptions: v2Options(fixture.id),
    });

    expect(CharacterAggregateSchema.parse(character)).toEqual(character);
    expect(character.build.schemaVersion).toBe(3);
    expect(character.build.levels).toHaveLength(fixture.level);
    expect(character.identity.campaignId).toBe("mother-of-bob");
    expect(character.profile.currencies).toEqual(
      expect.objectContaining({ cp: expect.any(Number), gp: expect.any(Number) }),
    );
    expect(character.profile.movement).toEqual(
      expect.objectContaining({
        sourceSystem: "ddb",
        provenance: "imported-current-sheet",
        walk: expect.any(Number),
        special: expect.any(Array),
      }),
    );
    expect(character.profile.armorClass).toEqual({
      sourceSystem: "ddb",
      provenance: "imported-current-sheet",
      value: expect.any(Number),
    });
    expect(character.profile.passiveScores).toEqual({
      sourceSystem: "ddb",
      provenance: "imported-current-sheet",
      perception: expect.any(Number),
      investigation: expect.any(Number),
      insight: expect.any(Number),
    });
    expect(character.profile.skills).toEqual({
      sourceSystem: "ddb",
      provenance: "imported-current-sheet",
      values: expect.any(Array),
    });
    expect(maximumHitPoints(character.hitPoints)).toBeGreaterThan(0);
    expect(character.hitPoints.baseline).toMatchObject({
      throughCharacterLevel: fixture.level,
      method: "imported-baseline",
    });
    expect(character.build.spells.length > 0).toBe(fixture.caster);
    expect(character.build.levels.every((level) => level.classRef.versionKey.includes("@"))).toBe(
      true,
    );
  });

  it("survives a strict JSON round trip", () => {
    const character = migrate(2);
    expect(CharacterAggregateSchema.parse(JSON.parse(JSON.stringify(character)))).toEqual(
      character,
    );
  });

  it("preserves Qemuel's explicit Dark Bargain exclusion as an auditable resolution", () => {
    const qemuel = migrate(0);
    expect(qemuel.resolutions).toContainEqual({
      id: "resolution:ddb:exclude:2048517",
      type: "exclude-imported-definition",
      sourceSystem: "ddb",
      sourceDefinitionId: "2048517",
      reason: "Player confirmed that Qemuel does not have a Dark Bargain.",
    });
    expect(
      qemuel.build.decisions.some(
        (decision) =>
          decision.type === "rule-selection" &&
          decision.selections.some((selection) => selection.name === "Dark Bargain"),
      ),
    ).toBe(false);
  });

  it("marks a pure V2 migration as blocked when its spell snapshot is unavailable", () => {
    const fixture = fixtures[2];
    const v2 = migrateDdbPayloadToCharacterV2(
      payload(fixture.id),
      fixture.owner,
      v2Options(fixture.id),
    );
    const v3 = migrateCharacterV2ToV3(v2, { campaignId: "mother-of-bob" });
    expect(v3.build.spells).toEqual([]);
    expect(v3.migrationIssues).toContainEqual(
      expect.objectContaining({ code: "V3_SPELL_SNAPSHOT_NOT_PROVIDED", severity: "blocking" }),
    );
  });

  it.each(fixtures)("preserves DDB movement for character $id", (fixture) => {
    const raw = payload(fixture.id);
    const imported = parseCharacterPayload(fixture.id, raw);
    const character = migrateDdbPayloadToCharacterV3({
      payload: raw,
      ownerUserId: fixture.owner,
      campaignId: "mother-of-bob",
      v2MigrationOptions: v2Options(fixture.id),
    });

    expect(character.profile.movement.walk).toBe(imported.speed);
    expect(character.profile.movement.special).toEqual(imported.specialSpeeds);
  });

  it.each(fixtures)("preserves DDB armor class for character $id", (fixture) => {
    const raw = payload(fixture.id);
    const imported = parseCharacterPayload(fixture.id, raw);
    const character = migrateDdbPayloadToCharacterV3({
      payload: raw,
      ownerUserId: fixture.owner,
      campaignId: "mother-of-bob",
      v2MigrationOptions: v2Options(fixture.id),
    });

    expect(character.profile.armorClass.value).toBe(imported.armorClass);
  });

  it.each(fixtures)("preserves DDB initiative for character $id", (fixture) => {
    const raw = payload(fixture.id);
    const imported = parseCharacterPayload(fixture.id, raw);
    const character = migrateDdbPayloadToCharacterV3({
      payload: raw,
      ownerUserId: fixture.owner,
      campaignId: "mother-of-bob",
      v2MigrationOptions: v2Options(fixture.id),
    });

    expect(character.profile.initiative).toEqual({
      sourceSystem: "ddb",
      provenance: "imported-current-sheet",
      value: imported.initiative,
    });
  });

  it.each(fixtures)("preserves DDB passive scores for character $id", (fixture) => {
    const raw = payload(fixture.id);
    const imported = parseCharacterPayload(fixture.id, raw);
    const character = migrateDdbPayloadToCharacterV3({
      payload: raw,
      ownerUserId: fixture.owner,
      campaignId: "mother-of-bob",
      v2MigrationOptions: v2Options(fixture.id),
    });

    expect(character.profile.passiveScores).toEqual({
      sourceSystem: "ddb",
      provenance: "imported-current-sheet",
      perception: imported.passivePerception,
      investigation: imported.passiveInvestigation,
      insight: imported.passiveInsight,
    });
  });

  it.each(fixtures)("preserves DDB skill snapshots for character $id", (fixture) => {
    const raw = payload(fixture.id);
    const imported = parseCharacterPayload(fixture.id, raw);
    const character = migrateDdbPayloadToCharacterV3({
      payload: raw,
      ownerUserId: fixture.owner,
      campaignId: "mother-of-bob",
      v2MigrationOptions: v2Options(fixture.id),
    });

    expect(character.profile.skills).toEqual({
      sourceSystem: "ddb",
      provenance: "imported-current-sheet",
      values: imported.skills,
    });
    expect(character.profile.skills.values).toHaveLength(18);
  });

  it.each(fixtures)("preserves DDB saving throw totals for character $id", (fixture) => {
    const raw = payload(fixture.id);
    const imported = parseCharacterPayload(fixture.id, raw);
    const character = migrateDdbPayloadToCharacterV3({
      payload: raw,
      ownerUserId: fixture.owner,
      campaignId: "mother-of-bob",
      v2MigrationOptions: v2Options(fixture.id),
    });

    expect(character.profile.savingThrows).toEqual({
      sourceSystem: "ddb",
      provenance: "imported-current-sheet",
      values: imported.saves,
    });
    expect(character.profile.savingThrows.values).toHaveLength(6);
  });

  it.each(fixtures)("preserves DDB spellcasting totals for character $id", (fixture) => {
    const raw = payload(fixture.id);
    const imported = parseCharacterPayload(fixture.id, raw);
    const character = migrateDdbPayloadToCharacterV3({
      payload: raw,
      ownerUserId: fixture.owner,
      campaignId: "mother-of-bob",
      v2MigrationOptions: v2Options(fixture.id),
    });

    expect(character.profile.spellcastingTotals.values).toEqual(
      imported.spellcasting.map((entry) => ({ ...entry, ability: entry.ability })),
    );
  });

  it.each(fixtures)("preserves DDB senses and defenses for character $id", (fixture) => {
    const raw = payload(fixture.id);
    const imported = parseCharacterPayload(fixture.id, raw);
    const character = migrateDdbPayloadToCharacterV3({
      payload: raw,
      ownerUserId: fixture.owner,
      campaignId: "mother-of-bob",
      v2MigrationOptions: v2Options(fixture.id),
    });

    expect(character.profile.senses).toEqual({
      sourceSystem: "ddb",
      provenance: "imported-current-sheet",
      values: imported.senses,
    });
    expect(character.profile.defenses).toEqual({
      sourceSystem: "ddb",
      provenance: "imported-current-sheet",
      values: imported.defenses,
    });
  });

  it.each(fixtures)("preserves DDB languages and proficiencies for character $id", (fixture) => {
    const raw = payload(fixture.id);
    const imported = parseCharacterPayload(fixture.id, raw);
    const character = migrateDdbPayloadToCharacterV3({
      payload: raw,
      ownerUserId: fixture.owner,
      campaignId: "mother-of-bob",
      v2MigrationOptions: v2Options(fixture.id),
    });

    expect(character.profile.proficiencies).toEqual({
      sourceSystem: "ddb",
      provenance: "imported-current-sheet",
      languages: imported.languages,
      tools: imported.tools,
      armor: imported.armorProficiencies,
      weapons: imported.weaponProficiencies,
    });
  });

  it.each(fixtures)("preserves DDB action metadata for character $id", (fixture) => {
    const raw = payload(fixture.id);
    const imported = parseCharacterPayload(fixture.id, raw);
    const character = migrateDdbPayloadToCharacterV3({
      payload: raw,
      ownerUserId: fixture.owner,
      campaignId: "mother-of-bob",
      v2MigrationOptions: v2Options(fixture.id),
    });

    expect(character.profile.actions.values).toEqual(
      imported.actions.map((action) => ({
        name: action.name,
        source: action.source,
        description: action.description ?? "",
        activation: action.activation ?? null,
        limitedUse: action.uses
          ? { maximum: action.uses.max, recovery: action.uses.reset }
          : null,
      })),
    );
  });

  it.each(fixtures)("preserves DDB attack snapshots for character $id", (fixture) => {
    const raw = payload(fixture.id);
    const imported = parseCharacterPayload(fixture.id, raw);
    const character = migrateDdbPayloadToCharacterV3({
      payload: raw,
      ownerUserId: fixture.owner,
      campaignId: "mother-of-bob",
      v2MigrationOptions: v2Options(fixture.id),
    });

    expect(character.profile.attacks.values).toEqual(imported.attacks);
  });

  it.each(fixtures)("preserves DDB inventory details for character $id", (fixture) => {
    const raw = payload(fixture.id);
    const imported = parseCharacterPayload(fixture.id, raw);
    const character = migrateDdbPayloadToCharacterV3({
      payload: raw,
      ownerUserId: fixture.owner,
      campaignId: "mother-of-bob",
      v2MigrationOptions: v2Options(fixture.id),
    });

    expect(character.items).toHaveLength(imported.inventory.length);
    const importedByName = new Map<string, typeof imported.inventory>();
    imported.inventory.forEach((source) => {
      const key = source.name.trim().toLowerCase();
      importedByName.set(key, [...(importedByName.get(key) ?? []), source]);
    });
    character.items.forEach((item) => {
      const source = importedByName.get(item.name.trim().toLowerCase())?.shift();
      expect(source).toBeDefined();
      if (!source) throw new Error("Expected matching imported inventory item");
      expect(item.details).toEqual({
        sourceSystem: "ddb",
        provenance: "imported-current-sheet",
        type: source.type,
        rarity: source.rarity,
        magic: source.magic,
        weight: source.weight ?? null,
        description: source.description ?? "",
        snippet: source.snippet ?? "",
        cost: source.cost ?? null,
        damage: source.damage ?? null,
        properties: source.properties ?? [],
        armorClass: source.armorClass ?? null,
        armorTypeId: source.armorTypeId ?? null,
      });
    });
  });

  it.each(fixtures)("preserves DDB features and feats for character $id", (fixture) => {
    const raw = payload(fixture.id);
    const imported = parseCharacterPayload(fixture.id, raw);
    const character = migrateDdbPayloadToCharacterV3({
      payload: raw,
      ownerUserId: fixture.owner,
      campaignId: "mother-of-bob",
      v2MigrationOptions: v2Options(fixture.id),
    });

    expect(character.profile.features.values).toEqual(
      imported.features.map((feature) => ({
        ...feature,
        level: feature.level ?? null,
        isUnlocked: feature.isUnlocked ?? true,
      })),
    );
    expect(character.profile.features.feats).toEqual(imported.feats);
  });

  it.each(fixtures)("preserves DDB encumbrance totals for character $id", (fixture) => {
    const raw = payload(fixture.id);
    const imported = parseCharacterPayload(fixture.id, raw);
    const character = migrateDdbPayloadToCharacterV3({
      payload: raw,
      ownerUserId: fixture.owner,
      campaignId: "mother-of-bob",
      v2MigrationOptions: v2Options(fixture.id),
    });

    expect(character.profile.encumbrance).toEqual({
      sourceSystem: "ddb",
      provenance: "imported-current-sheet",
      weightCarried: imported.weightCarried,
      carryingCapacity: imported.carryingCapacity,
    });
  });

  it.each(fixtures)("preserves DDB structured biography for character $id", (fixture) => {
    const raw = payload(fixture.id);
    const imported = parseCharacterPayload(fixture.id, raw);
    const character = migrateDdbPayloadToCharacterV3({
      payload: raw,
      ownerUserId: fixture.owner,
      campaignId: "mother-of-bob",
      v2MigrationOptions: v2Options(fixture.id),
    });

    expect(character.profile.demographics).toEqual({
      sourceSystem: "ddb",
      provenance: "imported-current-sheet",
      gender: imported.characteristics.gender ?? "",
      age: imported.characteristics.age ?? "",
      height: imported.characteristics.height ?? "",
      weight:
        imported.characteristics.weight != null ? String(imported.characteristics.weight) : "",
      eyes: imported.characteristics.eyes ?? "",
      skin: imported.characteristics.skin ?? "",
      hair: imported.characteristics.hair ?? "",
    });
  });

  it.each(fixtures)("preserves DDB class-specific selections for character $id", (fixture) => {
    const raw = payload(fixture.id);
    const imported = parseCharacterPayload(fixture.id, raw);
    const character = migrateDdbPayloadToCharacterV3({
      payload: raw,
      ownerUserId: fixture.owner,
      campaignId: "mother-of-bob",
      v2MigrationOptions: v2Options(fixture.id),
    });

    expect(character.profile.specializations).toEqual({
      sourceSystem: "ddb",
      provenance: "imported-current-sheet",
      activeArmorModel: imported.activeArmorModel,
      activeInfusions: imported.activeInfusions,
      infusions: imported.infusions,
      metamagic: imported.metamagic,
      totemAspects: imported.totemAspects,
      weaponMasteries: imported.weaponMasteries,
    });
  });

  it.each(fixtures.filter((fixture) => fixture.caster))(
    "preserves DDB spell sheet details for character $id",
    (fixture) => {
      const raw = payload(fixture.id);
      const imported = parseCharacterPayload(fixture.id, raw);
      const character = migrateDdbPayloadToCharacterV3({
        payload: raw,
        ownerUserId: fixture.owner,
        campaignId: "mother-of-bob",
        v2MigrationOptions: v2Options(fixture.id),
      });
      const importedSpells = [...imported.cantrips, ...imported.allSpells];

      character.build.spells.forEach((spell) => {
        const source = importedSpells.find(
          (candidate) =>
            candidate.name.trim().toLowerCase() === spell.spellRef.name.trim().toLowerCase(),
        );
        expect(spell.details, `missing spell details for ${spell.spellRef.name}`).not.toBeNull();
        if (!source) return;
        expect(spell.details).toEqual({
          sourceSystem: "ddb",
          provenance: "imported-current-sheet",
          spellLevel: source.level,
          description: source.description ?? "",
          school: source.school ?? "",
          activation: source.activation ?? null,
          range: source.range ?? null,
          duration: source.duration ?? null,
          components: source.components ?? [],
          componentsDescription: source.componentsDescription ?? "",
          concentration: source.concentration ?? false,
          ritual: source.ritual ?? false,
          limitedUse: source.uses
            ? { maximum: source.uses.max, recovery: source.uses.reset }
            : null,
        });
      });
    },
  );

  it.each(fixtures)("preserves DDB companion instances for character $id", (fixture) => {
    const raw = payload(fixture.id);
    const imported = parseCharacterPayload(fixture.id, raw);
    const character = migrateDdbPayloadToCharacterV3({
      payload: raw,
      ownerUserId: fixture.owner,
      campaignId: "mother-of-bob",
      v2MigrationOptions: v2Options(fixture.id),
    });

    expect(character.companions).toHaveLength(imported.creatures.length);
    character.companions.forEach((companion, index) => {
      const source = imported.creatures[index];
      expect(companion.id).toBe(`ddb:creature:${source.id}`);
      expect(companion.liveState).toEqual({
        active: source.isActive,
        removedHitPoints: source.removedHitPoints,
        temporaryHitPoints: source.temporaryHitPoints ?? 0,
      });
      expect(companion.definition.name).toBe(source.definition.name);
      expect(companion.definition.actionsDescription).toBe(
        source.definition.actionsDescription,
      );
    });
  });

  it("preserves the party's known DDB sense and defense facts without inference", () => {
    const qemuel = migrate(0);
    const willow = migrate(1);
    const ari = migrate(2);
    const echo = migrate(3);
    const dresana = migrate(4);

    expect(qemuel.profile.senses.values).toEqual([{ name: "Darkvision", value: 60 }]);
    expect(qemuel.profile.defenses.values).toEqual([
      { type: "resistance", damageType: "Fire" },
    ]);
    expect(willow.profile.senses.values).toEqual([{ name: "Darkvision", value: 60 }]);
    expect(willow.profile.defenses.values).toEqual([
      { type: "condition_immunity", damageType: "Magical Sleep" },
      { type: "resistance", damageType: "Psychic" },
    ]);
    expect(ari.profile.senses.values).toEqual([{ name: "Darkvision", value: 60 }]);
    expect(ari.profile.defenses.values).toEqual([
      { type: "resistance", damageType: "Fire" },
    ]);
    expect(echo.profile.senses.values).toEqual([]);
    expect(echo.profile.defenses.values).toEqual([]);
    expect(dresana.profile.senses.values).toEqual([{ name: "Darkvision", value: 60 }]);
    expect(dresana.profile.defenses.values).toEqual([]);
  });
});

describe("Character V3 adversarial invariants", () => {
  it("rejects duplicate and incomplete imported saving throw snapshots", () => {
    const character = migrate();
    const duplicated = structuredClone(character);
    duplicated.profile.savingThrows.values[1] = {
      ...duplicated.profile.savingThrows.values[0],
    };
    expect(() => CharacterAggregateSchema.parse(duplicated)).toThrow(
      /Saving throw abilities must be unique/,
    );

    const incomplete = structuredClone(character);
    incomplete.profile.savingThrows.values.pop();
    expect(() => CharacterAggregateSchema.parse(incomplete)).toThrow(/all six abilities/);
  });

  it("rejects case-insensitive duplicate imported proficiencies", () => {
    const character = migrate();
    character.profile.proficiencies.languages.push(
      character.profile.proficiencies.languages[0].toUpperCase(),
    );
    expect(() => CharacterAggregateSchema.parse(character)).toThrow(
      /languages proficiencies must be unique/,
    );
  });

  it("rejects duplicate companion instance IDs", () => {
    const character = migrate(3);
    if (character.companions.length === 0) return;
    character.companions.push(structuredClone(character.companions[0]));
    expect(() => CharacterAggregateSchema.parse(character)).toThrow(/companions IDs must be unique/);
  });

  it.each(fixtures)(
    "marks DDB-imported capabilities as owner-confirmed current-sheet truth for $id",
    (fixture) => {
      const character = migrateDdbPayloadToCharacterV3({
        payload: payload(fixture.id),
        ownerUserId: fixture.owner,
        campaignId: "mother-of-bob",
        v2MigrationOptions: v2Options(fixture.id),
      });

      expect(character.migrationBaseline?.capabilities.length).toBeGreaterThan(0);
      expect(
        character.migrationBaseline?.capabilities.every(
          (capability) =>
            capability.status === "imported-unreconciled" &&
            capability.currentSheetConfirmation.method === "ddb-current-sheet" &&
            capability.currentSheetConfirmation.status === "owner-confirmed" &&
            capability.currentSheetConfirmation.sourceSystem === "ddb",
        ),
      ).toBe(true);
    },
  );

  it.each(fixtures)(
    "marks DDB-imported ability and HP foundations as owner-confirmed current-sheet truth for $id",
    (fixture) => {
      const character = migrateDdbPayloadToCharacterV3({
        payload: payload(fixture.id),
        ownerUserId: fixture.owner,
        campaignId: "mother-of-bob",
        v2MigrationOptions: v2Options(fixture.id),
      });

      expect(character.build.abilityBasis).toMatchObject({
        method: "imported-baseline",
        currentSheetConfirmation: {
          method: "ddb-current-sheet",
          status: "owner-confirmed",
          sourceSystem: "ddb",
        },
      });
      expect(character.hitPoints.baseline).toMatchObject({
        method: "imported-baseline",
        currentSheetConfirmation: {
          method: "ddb-current-sheet",
          status: "owner-confirmed",
          sourceSystem: "ddb",
        },
      });
    },
  );

  it("rejects unresolved capabilities that are absent from the profile", () => {
    const character = migrate();
    if (!character.migrationBaseline || character.migrationBaseline.capabilities.length === 0) {
      throw new Error("Expected imported capability baseline");
    }
    character.migrationBaseline.capabilities[0].label = "Capability absent from profile";
    expect(() => CharacterAggregateSchema.parse(character)).toThrow(
      /must be represented in the profile/,
    );
  });

  it("rejects semantic duplicates in the imported capability baseline", () => {
    const character = migrate();
    if (!character.migrationBaseline || character.migrationBaseline.capabilities.length === 0) {
      throw new Error("Expected imported capability baseline");
    }
    const duplicate = structuredClone(character.migrationBaseline.capabilities[0]);
    duplicate.id += ":duplicate";
    character.migrationBaseline.capabilities.push(duplicate);
    expect(() => CharacterAggregateSchema.parse(character)).toThrow(/semantic duplicates/);
  });

  it("rejects a spoofed exact rule version key", () => {
    const ref = migrate().build.levels[0].classRef;
    expect(() => ExactRuleRefSchema.parse({ ...ref, versionKey: "class:fake@fake" })).toThrow(
      /exact rule version key/,
    );
  });

  it("rejects verified legacy-compatible content", () => {
    const ref = migrate().build.speciesRef;
    expect(() =>
      ExactRuleRefSchema.parse({
        ...ref,
        compatibility: "legacy",
        verification: "verified",
      }),
    ).toThrow(/core or current 2024-era/);
  });

  it("rejects an HP gain whose total hides its components", () => {
    expect(() =>
      HitPointLedgerSchema.parse({
        baseline: {
          throughCharacterLevel: 1,
          maximum: 15,
          method: "native-first-level",
          verified: true,
        },
        gains: [
          {
            characterLevel: 2,
            method: "fixed",
            hitDieContribution: 7,
            constitutionModifier: 3,
            bonuses: [{ sourceRef: null, label: "Tough", amount: 2 }],
            total: 10,
          },
        ],
      }),
    ).toThrow(/Expected HP gain 12/);
  });

  it("rejects a level not accounted for by the HP ledger", () => {
    const character = migrate(2);
    const last = character.build.levels.at(-1)!;
    const malformed = {
      ...character,
      build: {
        ...character.build,
        levels: [
          ...character.build.levels,
          {
            ...last,
            characterLevel: last.characterLevel + 1,
            classLevel: last.classLevel + 1,
          },
        ],
      },
    };
    expect(() => CharacterAggregateSchema.parse(malformed)).toThrow(
      /account for every character level/,
    );
  });

  it("rejects current HP above ledger-derived maximum", () => {
    const character = migrate();
    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        liveState: {
          ...character.liveState,
          currentHp: maximumHitPoints(character.hitPoints) + 1,
        },
      }),
    ).toThrow(/derived maximum HP/);
  });

  it("rejects duplicate canonical live conditions without blocking repeated custom labels", () => {
    const character = migrate();
    const poisonedRef = ExactRuleRefSchema.parse({
      kind: "condition",
      familyKey: createRuleFamilyKey("other", "Poisoned"),
      versionKey: createRuleVersionKey({
        kind: "other",
        sourceId: "XPHB",
        upstreamId: "poisoned-condition",
        contentRevision: "2024",
      }),
      name: "Poisoned",
      rulesGeneration: "2024",
      sourceId: "XPHB",
      upstreamId: "poisoned-condition",
      contentRevision: "2024",
      compatibility: "core-2024",
      verification: "verified",
    });
    const canonicalCondition = {
      id: "condition:poisoned:one",
      conditionRef: poisonedRef,
      label: "Poisoned",
      sourceLabel: null,
      appliedByUserId: "danny",
    };
    const customReminder = {
      id: "condition:custom:reminder:one",
      conditionRef: null,
      label: "Reminder",
      sourceLabel: "Table note",
      appliedByUserId: "danny",
    };

    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        liveState: {
          ...character.liveState,
          conditions: [
            canonicalCondition,
            { ...canonicalCondition, id: "condition:poisoned:two" },
          ],
        },
      }),
    ).toThrow(/condition rule refs must be unique/);

    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        liveState: {
          ...character.liveState,
          conditions: [
            customReminder,
            { ...customReminder, id: "condition:custom:reminder:two" },
          ],
        },
      }),
    ).not.toThrow();
  });

  it("rejects duplicate decisions and dangling spell decisions", () => {
    const character = migrate(2);
    const decision = {
      id: "decision:one",
      type: "rule-selection" as const,
      madeAtCharacterLevel: 1,
      provenance: "native" as const,
      selectionKind: "feat" as const,
      sourceRef: null,
      selections: [character.build.speciesRef],
    };
    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        build: { ...character.build, decisions: [decision, decision] },
      }),
    ).toThrow(/IDs must be unique/);
    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        build: {
          ...character.build,
          spells: character.build.spells.map((spell, index) =>
            index === 0 ? { ...spell, decisionId: "decision:missing" } : spell,
          ),
        },
      }),
    ).toThrow(/unknown decision/);
  });

  it("rejects duplicate semantic resolution confirmations", () => {
    const character = migrate();
    const foundation = {
      id: "resolution:foundation:one",
      type: "foundation-baseline-confirmed" as const,
      method: "owner-attested-imported-baseline" as const,
      abilityScores: character.build.abilityBasis.baseScores,
      hpMaximum: character.hitPoints.baseline.maximum,
      hpThroughCharacterLevel: character.hitPoints.baseline.throughCharacterLevel,
      reason: "Owner confirmed imported baseline.",
      decidedByUserId: character.identity.ownerUserId,
    };

    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        resolutions: [
          foundation,
          {
            ...foundation,
            id: "resolution:foundation:two",
          },
        ],
      }),
    ).toThrow(/Foundation baseline can only be confirmed once/);

    const languageRef = ExactRuleRefSchema.parse({
      kind: "language",
      familyKey: createRuleFamilyKey("language", "Giant"),
      versionKey: createRuleVersionKey({
        kind: "other",
        sourceId: "XPHB",
        upstreamId: "giant-language",
        contentRevision: "2024",
      }),
      name: "Giant",
      rulesGeneration: "2024",
      sourceId: "XPHB",
      upstreamId: "giant-language",
      contentRevision: "2024",
      compatibility: "core-2024",
      verification: "verified",
    });
    const languageDecision = {
      id: "decision:language-choice",
      type: "rule-selection" as const,
      madeAtCharacterLevel: 1,
      provenance: "native" as const,
      selectionKind: "language" as const,
      sourceRef: character.build.backgroundRef,
      selections: [languageRef],
    };
    const decisionResolution = {
      id: "resolution:language-choice",
      type: "capability-choice-confirmed" as const,
      requirementId: "requirement:language-choice",
      decisionId: languageDecision.id,
      baselineCapabilityId: "capability:language-choice",
      capabilityKind: "language" as const,
      selectedVersionKey: languageRef.versionKey,
      sourceVersionKey: character.build.backgroundRef.versionKey,
      decidedByUserId: character.identity.ownerUserId,
      method: "owner-confirmed-rule-choice" as const,
    };

    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        build: {
          ...character.build,
          decisions: [...character.build.decisions, languageDecision],
        },
        resolutions: [
          ...character.resolutions,
          decisionResolution,
          {
            ...decisionResolution,
            id: `${decisionResolution.id}:duplicate`,
          },
        ],
      }),
    ).toThrow(/semantically unique/);

    const exclusion = {
      id: "resolution:exclude:one",
      type: "exclude-imported-definition" as const,
      sourceSystem: "ddb" as const,
      sourceDefinitionId: "12345",
      reason: "Owner confirmed this imported definition is not part of the character.",
    };
    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        resolutions: [exclusion, { ...exclusion, id: "resolution:exclude:two" }],
      }),
    ).toThrow(/exclusions must be unique per source definition/);

    const contentDecision = {
      id: "resolution:content:one",
      type: "content-version-decision" as const,
      importedVersionKey: character.build.backgroundRef.versionKey,
      resolution: "retain-imported" as const,
      selectedVersionKey: character.build.backgroundRef.versionKey,
      reason: "Owner retained imported content for now.",
      decidedByUserId: character.identity.ownerUserId,
    };
    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        resolutions: [
          contentDecision,
          { ...contentDecision, id: "resolution:content:two" },
        ],
      }),
    ).toThrow(/Content version decisions must be unique per imported version/);

    const capabilityBaseline = {
      id: "resolution:capability-baseline:one",
      type: "capability-baseline-reconciled" as const,
      baselineCapabilityId: "capability:baseline:one",
      capabilityKind: "language" as const,
      label: "Giant",
      value: 1,
      sourceVersionKey: languageRef.versionKey,
      method: "exact-fixed-rule-match" as const,
    };
    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        resolutions: [
          capabilityBaseline,
          {
            ...capabilityBaseline,
            id: "resolution:capability-baseline:two",
          },
        ],
      }),
    ).toThrow(/Capability baseline resolutions must be unique per baseline capability/);
  });

  it("rejects a typed choice whose selected rule has the wrong kind", () => {
    const character = migrate();
    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        build: {
          ...character.build,
          decisions: [
            {
              id: "decision:not-a-feat",
              type: "rule-selection",
              madeAtCharacterLevel: 1,
              provenance: "native",
              selectionKind: "feat",
              sourceRef: null,
              selections: [character.build.speciesRef],
            },
          ],
        },
      }),
    ).toThrow(/feat decision cannot select species/);
  });

  it("rejects rule-selection decisions that repeat the same selected rule", () => {
    const character = migrate();

    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        build: {
          ...character.build,
          decisions: [
            {
              id: "decision:duplicate-selection",
              type: "rule-selection",
              madeAtCharacterLevel: 1,
              provenance: "native",
              selectionKind: "other",
              sourceRef: null,
              selections: [character.build.backgroundRef, character.build.backgroundRef],
            },
          ],
        },
      }),
    ).toThrow(/cannot repeat a selection/);
  });

  it("rejects a spell instance that disagrees with its decision", () => {
    const character = migrate(2);
    const spell = character.build.spells[0];
    const decision = {
      id: "decision:spell",
      type: "spell-selection" as const,
      madeAtCharacterLevel: character.build.levels.length,
      provenance: "native" as const,
      classVersionKey: spell.classVersionKey,
      selectionMode: spell.mode,
      sourceRef: null,
      spellVersionKeys: [spell.spellRef.versionKey],
    };
    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        build: {
          ...character.build,
          decisions: [decision],
          spells: character.build.spells.map((selection, index) =>
            index === 0
              ? { ...selection, decisionId: decision.id, mode: "granted" as const }
              : selection,
          ),
        },
      }),
    ).toThrow(/does not match its typed decision/);
  });

  it("requires exactly one class or grant source for every spell instance", () => {
    const character = migrate(2);
    const classSpell = character.build.spells.find((spell) => spell.classVersionKey !== null)!;
    const replace = (spell: typeof classSpell) =>
      character.build.spells.map((entry) => (entry.id === spell.id ? spell : entry));
    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        build: {
          ...character.build,
          spells: replace({ ...classSpell, grantSourceRef: character.build.backgroundRef }),
        },
      }),
    ).toThrow(/exactly one class or grant source/);
    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        build: {
          ...character.build,
          spells: replace({ ...classSpell, classVersionKey: null, grantSourceRef: null }),
        },
      }),
    ).toThrow(/exactly one class or grant source/);
  });

  it("keeps spell source semantics schema-enforced", () => {
    const character = migrate(2);
    const classSpell = character.build.spells.find((spell) => spell.classVersionKey !== null)!;
    const grantedSpell = character.build.spells.find((spell) => spell.grantSourceRef !== null)!;
    const replace = (spell: typeof classSpell | typeof grantedSpell) =>
      character.build.spells.map((entry) => (entry.id === spell.id ? spell : entry));

    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        build: {
          ...character.build,
          spells: replace({ ...classSpell, castingAbility: "CHA" }),
        },
      }),
    ).toThrow(/derive casting ability from their class/);

    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        build: {
          ...character.build,
          spells: replace({ ...grantedSpell, mode: "prepared" }),
        },
      }),
    ).toThrow(/Granted spell selections must use granted mode/);
  });

  it("does not allow stored spell selections to be silently hidden", () => {
    const character = migrate(2);
    const spell = character.build.spells[0];

    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        build: {
          ...character.build,
          spells: character.build.spells.map((entry) =>
            entry.id === spell.id ? { ...entry, active: false } : entry,
          ),
        },
      }),
    ).toThrow();
  });

  it("rejects imported spell details that disagree with the stored spell level", () => {
    const character = migrate(2);
    const spell = character.build.spells.find((entry) => entry.details !== null)!;

    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        build: {
          ...character.build,
          spells: character.build.spells.map((entry) =>
            entry.id === spell.id
              ? {
                  ...entry,
                  details: {
                    ...entry.details!,
                    spellLevel: entry.spellLevel === 0 ? 1 : 0,
                  },
                }
              : entry,
          ),
        },
      }),
    ).toThrow(/Imported spell detail level must match stored spell level/);
  });

  it("rejects nonsensical imported limited-use spell details", () => {
    const character = migrate(2);
    const spell = character.build.spells.find((entry) => entry.details !== null)!;

    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        build: {
          ...character.build,
          spells: character.build.spells.map((entry) =>
            entry.id === spell.id
              ? {
                  ...entry,
                  details: {
                    ...entry.details!,
                    limitedUse: { maximum: 0, recovery: "long rest" },
                  },
                }
              : entry,
          ),
        },
      }),
    ).toThrow();

    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        build: {
          ...character.build,
          spells: character.build.spells.map((entry) =>
            entry.id === spell.id
              ? {
                  ...entry,
                  details: {
                    ...entry.details!,
                    limitedUse: { maximum: 1, recovery: "" },
                  },
                }
              : entry,
          ),
        },
      }),
    ).toThrow();
  });

  it("requires spell selections to be unique per spell, source, and mode", () => {
    const character = migrate(2);
    const classSpell = character.build.spells.find((spell) => spell.classVersionKey !== null)!;

    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        build: {
          ...character.build,
          spells: [
            ...character.build.spells,
            {
              ...classSpell,
              id: `${classSpell.id}:duplicate`,
            },
          ],
        },
      }),
    ).toThrow(/unique per spell, source, and mode/);

    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        build: {
          ...character.build,
          spells: [
            ...character.build.spells,
            {
              ...classSpell,
              id: `${classSpell.id}:different-source`,
              classVersionKey: null,
              grantSourceRef: character.build.backgroundRef,
              castingAbility: "CHA",
              mode: "granted",
            },
          ],
        },
      }),
    ).not.toThrow();
  });

  it("keeps attunement limits rule-derived instead of hardcoding three", () => {
    const character = migrate();
    const items = Array.from({ length: 4 }, (_, index) => ({
      id: `custom:item:${index}`,
      definitionRef: null,
      name: `Custom attuned item ${index}`,
      quantity: 1,
      equipped: true,
      attuned: true,
      containerId: null,
      provenance: "custom" as const,
      charges: null,
    }));
    expect(CharacterAggregateSchema.parse({ ...character, items }).items).toHaveLength(4);
  });

  it("rejects forged persisted attunement capacity policy and effects", () => {
    const character = migrate();
    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        build: {
          ...character.build,
          attunementCapacity: {
            baseline: { maximum: 4, basis: "rules-policy-default" },
            replacements: [],
          },
        },
      }),
    ).toThrow();
    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        build: {
          ...character.build,
          attunementCapacity: {
            ...character.build.attunementCapacity,
            replacements: [{ sourceRef: character.build.backgroundRef, maximum: 99 }],
          },
        },
      }),
    ).toThrow(/authoritative feature semantics/i);
  });

  it("rejects missing and self-referential item containers", () => {
    const character = migrate();
    const item = {
      id: "custom:item",
      definitionRef: null,
      name: "Bag",
      quantity: 1,
      equipped: false,
      attuned: false,
      containerId: "missing:item",
      provenance: "custom" as const,
      charges: null,
    };
    expect(() => CharacterAggregateSchema.parse({ ...character, items: [item] })).toThrow(
      /container does not exist/,
    );
    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        items: [{ ...item, containerId: item.id }],
      }),
    ).toThrow(/cannot contain itself/);
  });

  it("rejects multi-item container cycles", () => {
    const character = migrate();
    const item = (id: string, containerId: string) => ({
      id,
      definitionRef: null,
      name: id,
      quantity: 1,
      equipped: false,
      attuned: false,
      containerId,
      provenance: "custom" as const,
      charges: null,
    });
    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        items: [item("bag:a", "bag:b"), item("bag:b", "bag:a")],
      }),
    ).toThrow(/cannot form a cycle/);
  });

  it("rejects verified resource authority without an exact source", () => {
    const character = migrate();
    const [resource, ...rest] = character.liveState.resources;
    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        liveState: {
          ...character.liveState,
          resources: [
            { ...resource, provenance: "verified-rule", sourceVersionKey: null },
            ...rest,
          ],
        },
      }),
    ).toThrow(/exact source version/);
  });

  it("requires structured, non-duplicated recovery rules for verified resources", () => {
    const character = migrate();
    const [resource, ...rest] = character.liveState.resources;
    const verified = {
      ...resource,
      provenance: "verified-rule" as const,
      sourceVersionKey: character.build.levels[0].classRef.versionKey,
    };
    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        liveState: {
          ...character.liveState,
          resources: [{ ...verified, recoveryRules: [] }, ...rest],
        },
      }),
    ).toThrow(/structured recovery rules/);
    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        liveState: {
          ...character.liveState,
          resources: [
            {
              ...verified,
              recoveryRules: [
                { trigger: "long-rest", restore: { type: "all" } },
                { trigger: "long-rest", restore: { type: "fixed", amount: 1 } },
              ],
            },
            ...rest,
          ],
        },
      }),
    ).toThrow(/one recovery rule per trigger/);
  });

  it("requires resource keys to be unique across live resources and item charges", () => {
    const character = migrate();
    const [liveResource] = character.liveState.resources;
    const [firstItem, secondItem] = character.items;
    const charges = {
      key: liveResource.key,
      sourceVersionKey: null,
      label: "Custom Charges",
      current: 0,
      maximum: 1,
      recovery: "manual" as const,
      recoveryRules: [],
      provenance: "custom" as const,
    };

    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        items: [{ ...firstItem, charges }, ...character.items.slice(1)],
      }),
    ).toThrow(/Resource keys must be unique/);

    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        items: [
          { ...firstItem, charges: { ...charges, key: "item:shared:charges" } },
          { ...secondItem, charges: { ...charges, key: "item:shared:charges" } },
          ...character.items.slice(2),
        ],
      }),
    ).toThrow(/Resource keys must be unique/);
  });

  it("requires verified item charges to be sourced from the exact item definition", () => {
    const character = migrate();
    const item = character.items.find((entry) => entry.definitionRef !== null) ?? character.items[0];
    const charges = {
      key: "item:test:charges",
      label: "Test Item Charges",
      current: 1,
      maximum: 3,
      recovery: "dawn" as const,
      sourceVersionKey: character.build.levels[0].classRef.versionKey,
      provenance: "verified-rule" as const,
      recoveryRules: [{ trigger: "dawn" as const, restore: { type: "all" as const } }],
    };

    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        items: [{ ...item, charges }, ...character.items.filter((entry) => entry.id !== item.id)],
      }),
    ).toThrow(/item's exact definition/);

    if (item.definitionRef) {
      expect(
        CharacterAggregateSchema.parse({
          ...character,
          items: [
            {
              ...item,
              charges: { ...charges, sourceVersionKey: item.definitionRef.versionKey },
            },
            ...character.items.filter((entry) => entry.id !== item.id),
          ],
        }).items[0].charges?.sourceVersionKey,
      ).toBe(item.definitionRef.versionKey);
    }
  });

  it("rejects arbitrary fields inside typed decisions", () => {
    const character = migrate();
    expect(() =>
      CharacterAggregateSchema.parse({
        ...character,
        build: {
          ...character.build,
          decisions: [
            {
              id: "decision:unsafe",
              type: "rule-selection",
              madeAtCharacterLevel: 1,
              provenance: "custom",
              selectionKind: "other",
              sourceRef: null,
              selections: [character.build.speciesRef],
              payload: { executableMystery: true },
            },
          ],
        },
      }),
    ).toThrow();
  });
});
