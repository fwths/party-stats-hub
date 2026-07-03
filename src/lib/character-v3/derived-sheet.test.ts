import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { migrateDdbPayloadToCharacterV3 } from "./migrate-v2";
import {
  abilityModifier,
  deriveCharacterV3Foundation,
  proficiencyBonusForLevel,
} from "./derived-sheet";

const fixtures = [
  { ddbId: 97349530, ownerUserId: "qemuel", level: 7, proficiency: 3 },
  { ddbId: 131296315, ownerUserId: "nikos", level: 7, proficiency: 3 },
  { ddbId: 131593533, ownerUserId: "eleni", level: 7, proficiency: 3 },
  { ddbId: 132900149, ownerUserId: "alexia", level: 7, proficiency: 3 },
  { ddbId: 132940690, ownerUserId: "andreas", level: 7, proficiency: 3 },
] as const;

function payload(ddbId: number): unknown {
  return JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "cache", "char-" + ddbId + ".json"), "utf8"),
  );
}

describe("Character V3 derived-sheet foundation", () => {
  it("implements the level 1-20 proficiency progression", () => {
    expect([1, 4, 5, 8, 9, 12, 13, 16, 17, 20].map(proficiencyBonusForLevel)).toEqual([
      2, 2, 3, 3, 4, 4, 5, 5, 6, 6,
    ]);
    expect(() => proficiencyBonusForLevel(0)).toThrow();
    expect(() => proficiencyBonusForLevel(21)).toThrow();
  });

  it("uses floor semantics for odd negative ability modifiers", () => {
    expect(abilityModifier(1)).toBe(-5);
    expect(abilityModifier(9)).toBe(-1);
    expect(abilityModifier(10)).toBe(0);
    expect(abilityModifier(20)).toBe(5);
  });

  it.each(fixtures)("derives traceable foundation values for DDB fixture $ddbId", (fixture) => {
    const character = migrateDdbPayloadToCharacterV3({
      payload: payload(fixture.ddbId),
      ownerUserId: fixture.ownerUserId,
      campaignId: "mother-of-bob",
    });
    const derived = deriveCharacterV3Foundation(character);

    expect(derived.characterLevel).toBe(fixture.level);
    expect(derived.proficiencyBonus.value).toBe(fixture.proficiency);
    expect(derived.proficiencyBonus.sourcePaths).toEqual(["build.levels"]);
    expect(derived.baseInitiative.value).toBe(derived.abilityModifiers.DEX.value);
    expect(derived.compilerVersion).toBe("v3-derived-sheet/1");
  });

  it("exposes imported movement as a traceable baseline", () => {
    const character = migrateDdbPayloadToCharacterV3({
      payload: payload(97349530),
      ownerUserId: "qemuel",
      campaignId: "mother-of-bob",
      v2MigrationOptions: {
        excludedFeatDefinitions: [
          {
            definitionId: 2048517,
            reason: "Player confirmed that Qemuel does not have a Dark Bargain.",
          },
        ],
      },
    });
    const derived = deriveCharacterV3Foundation(character);

    expect(derived.movement.status).toBe("imported-baseline");
    if (derived.movement.status !== "imported-baseline") throw new Error("Expected movement");
    expect(derived.movement.sourceSystem).toBe("ddb");
    expect(derived.movement.speeds[0]).toEqual({
      type: "Walk",
      value: {
        value: character.profile.movement.walk,
        formula: "DDB imported current sheet walking speed",
        sourcePaths: ["profile.movement.walk"],
      },
    });
  });

  it("exposes imported armor class as a traceable baseline", () => {
    const character = migrateDdbPayloadToCharacterV3({
      payload: payload(132940690),
      ownerUserId: "andreas",
      campaignId: "mother-of-bob",
    });
    const derived = deriveCharacterV3Foundation(character);

    expect(derived.armorClass.status).toBe("imported-baseline");
    if (derived.armorClass.status !== "imported-baseline") {
      throw new Error("Expected armor class");
    }
    expect(derived.armorClass).toEqual({
      status: "imported-baseline",
      sourceSystem: "ddb",
      value: {
        value: character.profile.armorClass.value,
        formula: "DDB imported current sheet armor class",
        sourcePaths: ["profile.armorClass.value"],
      },
    });
  });

  it("keeps imported total initiative separate from the derived Dexterity baseline", () => {
    const character = migrateDdbPayloadToCharacterV3({
      payload: payload(131296315),
      ownerUserId: "nikos",
      campaignId: "mother-of-bob",
    });
    const derived = deriveCharacterV3Foundation(character);

    expect(derived.initiative.status).toBe("imported-baseline");
    if (derived.initiative.status !== "imported-baseline") throw new Error("Expected initiative");
    expect(derived.initiative.value).toEqual({
      value: character.profile.initiative.value,
      formula: "DDB imported current sheet initiative",
      sourcePaths: ["profile.initiative.value"],
    });
    expect(derived.baseInitiative.value).toBe(derived.abilityModifiers.DEX.value);
  });

  it("exposes imported passive scores as traceable baselines", () => {
    const character = migrateDdbPayloadToCharacterV3({
      payload: payload(131593533),
      ownerUserId: "eleni",
      campaignId: "mother-of-bob",
    });
    const derived = deriveCharacterV3Foundation(character);

    expect(derived.passiveScores.status).toBe("imported-baseline");
    if (derived.passiveScores.status !== "imported-baseline") {
      throw new Error("Expected passive scores");
    }
    expect(derived.passiveScores.sourceSystem).toBe("ddb");
    expect(derived.passiveScores.values.perception).toEqual({
      value: character.profile.passiveScores.perception,
      formula: "DDB imported current sheet passive Perception",
      sourcePaths: ["profile.passiveScores.perception"],
    });
    expect(derived.passiveScores.values.investigation).toEqual({
      value: character.profile.passiveScores.investigation,
      formula: "DDB imported current sheet passive Investigation",
      sourcePaths: ["profile.passiveScores.investigation"],
    });
    expect(derived.passiveScores.values.insight).toEqual({
      value: character.profile.passiveScores.insight,
      formula: "DDB imported current sheet passive Insight",
      sourcePaths: ["profile.passiveScores.insight"],
    });
  });

  it("exposes imported skills as traceable baselines", () => {
    const character = migrateDdbPayloadToCharacterV3({
      payload: payload(132940690),
      ownerUserId: "andreas",
      campaignId: "mother-of-bob",
    });
    const derived = deriveCharacterV3Foundation(character);

    expect(derived.skills.status).toBe("imported-baseline");
    if (derived.skills.status !== "imported-baseline") throw new Error("Expected skills");
    expect(derived.skills.sourceSystem).toBe("ddb");
    expect(derived.skills.values).toHaveLength(18);
    expect(derived.skills.values[0]).toEqual({
      key: character.profile.skills.values[0].key,
      name: character.profile.skills.values[0].name,
      ability: character.profile.skills.values[0].ability,
      proficiency: character.profile.skills.values[0].proficiency,
      modifier: {
        value: character.profile.skills.values[0].modifier,
        formula: "DDB imported current sheet skill modifier",
        sourcePaths: ["profile.skills.values.0.modifier"],
      },
    });
  });

  it("exposes imported senses and defenses as traceable baselines", () => {
    const character = migrateDdbPayloadToCharacterV3({
      payload: payload(97349530),
      ownerUserId: "qemuel",
      campaignId: "mother-of-bob",
      v2MigrationOptions: {
        excludedFeatDefinitions: [
          {
            definitionId: 2048517,
            reason: "Player confirmed that Qemuel does not have a Dark Bargain.",
          },
        ],
      },
    });
    const derived = deriveCharacterV3Foundation(character);

    expect(derived.senses.status).toBe("imported-baseline");
    if (derived.senses.status !== "imported-baseline") throw new Error("Expected senses");
    expect(derived.senses.values[0].name).toBe("Darkvision");
    expect(derived.senses.values[0].range?.value).toBe(60);
    expect(derived.senses.values[0].sourcePaths).toEqual(["profile.senses.values.0"]);
    if (derived.senses.values[0].range) {
      expect(derived.senses.values[0].range.sourcePaths).toEqual([
        "profile.senses.values.0.value",
      ]);
    }

    expect(derived.defenses.status).toBe("imported-baseline");
    if (derived.defenses.status !== "imported-baseline") throw new Error("Expected defenses");
    expect(derived.defenses.values[0]).toMatchObject({
      type: "resistance",
      damageType: "Fire",
    });
    expect(derived.defenses.values[0]).toEqual({
      ...character.profile.defenses.values[0],
      sourcePaths: ["profile.defenses.values.0"],
    });
  });

  it("exposes imported languages and proficiencies as traceable baselines", () => {
    const character = migrateDdbPayloadToCharacterV3({
      payload: payload(131296315),
      ownerUserId: "nikos",
      campaignId: "mother-of-bob",
    });
    const derived = deriveCharacterV3Foundation(character);

    expect(derived.proficiencies.status).toBe("imported-baseline");
    if (derived.proficiencies.status !== "imported-baseline") {
      throw new Error("Expected proficiencies");
    }
    expect(derived.proficiencies.languages[0]).toEqual({
      value: character.profile.proficiencies.languages[0],
      sourcePaths: ["profile.proficiencies.languages.0"],
    });
    expect(derived.proficiencies.tools[0]).toEqual({
      value: character.profile.proficiencies.tools[0],
      sourcePaths: ["profile.proficiencies.tools.0"],
    });
  });

  it("exposes imported actions without duplicating mutable remaining uses", () => {
    const character = migrateDdbPayloadToCharacterV3({
      payload: payload(131593533),
      ownerUserId: "eleni",
      campaignId: "mother-of-bob",
    });
    const derived = deriveCharacterV3Foundation(character);

    expect(derived.actions.status).toBe("imported-baseline");
    if (derived.actions.status !== "imported-baseline") throw new Error("Expected actions");
    expect(derived.actions.values[0].sourcePaths).toEqual(["profile.actions.values.0"]);
    expect(derived.actions.values.some((action) => "current" in (action.limitedUse ?? {}))).toBe(
      false,
    );
  });

  it("exposes imported attacks with traceable attack bonuses", () => {
    const character = migrateDdbPayloadToCharacterV3({
      payload: payload(132940690),
      ownerUserId: "andreas",
      campaignId: "mother-of-bob",
    });
    const derived = deriveCharacterV3Foundation(character);

    expect(derived.attacks.status).toBe("imported-baseline");
    if (derived.attacks.status !== "imported-baseline") throw new Error("Expected attacks");
    expect(derived.attacks.values[0].attackBonus).toEqual({
      value: character.profile.attacks.values[0].attackBonus,
      formula: "DDB imported current sheet attack bonus",
      sourcePaths: ["profile.attacks.values.0.attackBonus"],
    });
  });

  it("exposes imported features and feats with traceable sheet provenance", () => {
    const character = migrateDdbPayloadToCharacterV3({
      payload: payload(131296315),
      ownerUserId: "nikos",
      campaignId: "mother-of-bob",
    });
    const derived = deriveCharacterV3Foundation(character);

    expect(derived.features.status).toBe("imported-baseline");
    if (derived.features.status !== "imported-baseline") throw new Error("Expected features");
    expect(derived.features.values[0].sourcePaths).toEqual(["profile.features.values.0"]);
    if (derived.features.feats.length > 0) {
      expect(derived.features.feats[0].sourcePaths).toEqual(["profile.features.feats.0"]);
    }
  });

  it("exposes imported encumbrance with a traceable remaining capacity", () => {
    const character = migrateDdbPayloadToCharacterV3({
      payload: payload(97349530),
      ownerUserId: "qemuel",
      campaignId: "mother-of-bob",
    });
    const derived = deriveCharacterV3Foundation(character);

    expect(derived.encumbrance.status).toBe("imported-baseline");
    if (derived.encumbrance.status !== "imported-baseline") {
      throw new Error("Expected encumbrance");
    }
    expect(derived.encumbrance.remainingCapacity.value).toBe(
      Math.max(
        0,
        character.profile.encumbrance.carryingCapacity! -
          character.profile.encumbrance.weightCarried!,
      ),
    );
    expect(derived.encumbrance.remainingCapacity.sourcePaths).toEqual([
      "profile.encumbrance.carryingCapacity",
      "profile.encumbrance.weightCarried",
    ]);
  });

  it("derives saving throws only from the exact starting-class catalog version", () => {
    const character = migrateDdbPayloadToCharacterV3({
      payload: payload(97349530),
      ownerUserId: "qemuel",
      campaignId: "mother-of-bob",
    });
    const startingClass = character.build.levels[0].classRef;
    const exactRecord = {
      id: startingClass.upstreamId,
      sourceId: startingClass.sourceId,
      contentRevision: startingClass.contentRevision,
      proficienciesJson: JSON.stringify({ savingThrows: ["CON", "INT"] }),
    };
    const unavailable = deriveCharacterV3Foundation(character, [
      { ...exactRecord, contentRevision: "wrong-revision" },
    ]);
    expect(unavailable.savingThrows.status).toBe("unavailable");

    const derived = deriveCharacterV3Foundation(character, [exactRecord]);
    expect(derived.savingThrows.status).toBe("derived");
    if (derived.savingThrows.status !== "derived") throw new Error("Expected derived saves");
    expect(derived.savingThrows.sourceVersionKey).toBe(startingClass.versionKey);
    expect(derived.savingThrows.values.CON.proficient).toBe(true);
    expect(derived.savingThrows.values.INT.proficient).toBe(true);
    expect(derived.savingThrows.values.DEX.proficient).toBe(false);
    expect(derived.savingThrows.values.CON.value).toBe(
      derived.abilityModifiers.CON.value + derived.proficiencyBonus.value,
    );
  });

  it("keeps imported total saving throws separate from native class derivation", () => {
    const character = migrateDdbPayloadToCharacterV3({
      payload: payload(131593533),
      ownerUserId: "eleni",
      campaignId: "mother-of-bob",
    });
    const derived = deriveCharacterV3Foundation(character);
    const strengthIndex = character.profile.savingThrows.values.findIndex(
      (save) => save.ability === "STR",
    );
    const strength = character.profile.savingThrows.values[strengthIndex];

    expect(derived.totalSavingThrows.status).toBe("imported-baseline");
    if (derived.totalSavingThrows.status !== "imported-baseline") {
      throw new Error("Expected total saving throws");
    }
    expect(derived.totalSavingThrows.values.STR).toEqual({
      value: strength.modifier,
      proficiency: strength.proficiency,
      formula: "DDB imported current sheet saving throw modifier",
      sourcePaths: [`profile.savingThrows.values.${strengthIndex}.modifier`],
    });
  });

  it("fails closed for malformed or non-unique saving throw catalog data", () => {
    const character = migrateDdbPayloadToCharacterV3({
      payload: payload(97349530),
      ownerUserId: "qemuel",
      campaignId: "mother-of-bob",
    });
    const startingClass = character.build.levels[0].classRef;
    const record = (savingThrows: unknown) => ({
      id: startingClass.upstreamId,
      sourceId: startingClass.sourceId,
      contentRevision: startingClass.contentRevision,
      proficienciesJson: JSON.stringify({ savingThrows }),
    });
    expect(deriveCharacterV3Foundation(character, [record(["CON"])]).savingThrows.status).toBe(
      "unavailable",
    );
    expect(
      deriveCharacterV3Foundation(character, [record(["CON", "CON"])]).savingThrows.status,
    ).toBe("unavailable");
    expect(
      deriveCharacterV3Foundation(character, [record(["CON", "LUCK"])]).savingThrows.status,
    ).toBe("unavailable");
  });

  it("derives spell save DC and spell attack from exact class spellcasting ability", () => {
    const character = migrateDdbPayloadToCharacterV3({
      payload: payload(131296315),
      ownerUserId: "nikos",
      campaignId: "mother-of-bob",
    });
    const classRef = character.build.levels[0].classRef;
    const derived = deriveCharacterV3Foundation(character, [
      {
        id: classRef.upstreamId,
        sourceId: classRef.sourceId,
        contentRevision: classRef.contentRevision,
        proficienciesJson: null,
        spellcastingJson: JSON.stringify({ ability: "CHA", progression: "full" }),
      },
    ]);
    expect(derived.spellcasting.status).toBe("derived");
    if (derived.spellcasting.status !== "derived") throw new Error("Expected spellcasting");
    expect(derived.spellcasting.classes).toEqual([
      expect.objectContaining({
        classVersionKey: classRef.versionKey,
        className: classRef.name,
        ability: "CHA",
      }),
    ]);
    const entry = derived.spellcasting.classes[0];
    expect(entry.spellSaveDc.value).toBe(
      8 + derived.proficiencyBonus.value + derived.abilityModifiers.CHA.value,
    );
    expect(entry.spellAttackBonus.value).toBe(
      derived.proficiencyBonus.value + derived.abilityModifiers.CHA.value,
    );
  });

  it("keeps imported spellcasting totals separate from native class derivation", () => {
    const character = migrateDdbPayloadToCharacterV3({
      payload: payload(132900149),
      ownerUserId: "alexia",
      campaignId: "mother-of-bob",
    });
    const derived = deriveCharacterV3Foundation(character);

    expect(derived.totalSpellcasting.status).toBe("imported-baseline");
    if (derived.totalSpellcasting.status !== "imported-baseline") {
      throw new Error("Expected spellcasting totals");
    }
    expect(derived.totalSpellcasting.values[0].spellSaveDc.sourcePaths).toEqual([
      "profile.spellcastingTotals.values.0.saveDc",
    ]);
    expect(derived.totalSpellcasting.values[0].spellAttackBonus.sourcePaths).toEqual([
      "profile.spellcastingTotals.values.0.attackBonus",
    ]);
  });

  it("fails closed for missing or malformed spellcasting ability catalog data", () => {
    const character = migrateDdbPayloadToCharacterV3({
      payload: payload(131296315),
      ownerUserId: "nikos",
      campaignId: "mother-of-bob",
    });
    const classRef = character.build.levels[0].classRef;
    const baseRecord = {
      id: classRef.upstreamId,
      sourceId: classRef.sourceId,
      contentRevision: classRef.contentRevision,
      proficienciesJson: null,
    };
    expect(deriveCharacterV3Foundation(character, [baseRecord]).spellcasting.status).toBe(
      "unavailable",
    );
    expect(
      deriveCharacterV3Foundation(character, [
        { ...baseRecord, spellcastingJson: JSON.stringify({ ability: "LUCK" }) },
      ]).spellcasting.status,
    ).toBe("unavailable");
  });
});
