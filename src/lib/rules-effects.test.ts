import { describe, expect, it } from "vitest";
import { compareRuleEffects, normalizeActiveEffects } from "./rules-effects";

describe("normalizeActiveEffects", () => {
  it("maps active effect rows to party-member fields", () => {
    const result = normalizeActiveEffects(
      [
        {
          id: "effect-test",
          name: "Draconic Defense",
          changesJson: JSON.stringify({
            senses: [{ type: "Darkvision", value: 60 }],
            activation: "bonus_action",
            uses: { maximum: "proficiency_bonus" },
          }),
          grantsResistances: JSON.stringify(["Fire"]),
          grantsImmunities: JSON.stringify(["Poison"]),
        },
      ],
      {
        finalScores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
        proficiencyBonus: 3,
        source: "class",
      },
    );

    expect(result.defenses).toEqual([
      { type: "resistance", damageType: "Fire" },
      { type: "immunity", damageType: "Poison" },
    ]);
    expect(result.senses).toEqual([{ name: "Darkvision", value: 60 }]);
    expect(result.actions).toEqual([
      {
        name: "Draconic Defense",
        source: "class",
        description: "",
        activation: { activationTime: 1, activationType: 3 },
        uses: { current: 3, max: 3, reset: "Long Rest" },
      },
    ]);
  });

  it("uses ability modifiers for limited-use effects", () => {
    const result = normalizeActiveEffects(
      [
        {
          name: "Commanding Presence",
          changes_json: JSON.stringify({ uses: { maximum: "charisma_modifier" } }),
        },
      ],
      {
        finalScores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 16 },
        proficiencyBonus: 2,
      },
    );

    expect(result.actions[0].uses).toEqual({ current: 3, max: 3, reset: "Long Rest" });
  });

  it("compares normalized rule effect keys", () => {
    const comparison = compareRuleEffects(
      {
        defenses: [{ type: "resistance", damageType: "Fire" }],
        senses: [],
        actions: [{ name: "Second Wind", source: "class" }],
      },
      {
        defenses: [{ type: "resistance", damageType: "Fire" }],
        senses: [{ name: "Darkvision", value: 60 }],
        actions: [],
      },
    );

    expect(comparison).toEqual({
      onlyLeft: ["action:class:Second Wind"],
      onlyRight: ["sense:darkvision:60"],
      shared: ["defense:resistance:fire"],
    });
  });
});
