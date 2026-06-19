import { describe, expect, it } from "vitest";
import { AbilityScore } from "./dndbeyond.types";
import { normalizeDdbRuleEffects } from "./ddb-rule-effects";

const abilities: AbilityScore[] = [
  { name: "STR", score: 10, modifier: 0 },
  { name: "DEX", score: 10, modifier: 0 },
  { name: "CON", score: 10, modifier: 0 },
  { name: "INT", score: 10, modifier: 0 },
  { name: "WIS", score: 10, modifier: 0 },
  { name: "CHA", score: 16, modifier: 3 },
];

describe("normalizeDdbRuleEffects", () => {
  it("normalizes DDB defenses and senses to shared rule effects", () => {
    const result = normalizeDdbRuleEffects({
      data: { customSenses: [{ name: "Tremorsense", distance: 10 }] },
      modifiers: [
        { type: "resistance", friendlySubtypeName: "Fire" },
        { type: "immunity", friendlySubtypeName: "Poison" },
        {
          type: "set",
          subType: "darkvision",
          friendlySubtypeName: "Darkvision",
          value: 60,
        },
      ],
      abilities,
      proficiencyBonus: 3,
    });

    expect(result.defenses).toEqual([
      { type: "resistance", damageType: "Fire" },
      { type: "immunity", damageType: "Poison" },
    ]);
    expect(result.senses).toEqual([
      { name: "Darkvision", value: 60 },
      { name: "Tremorsense", value: 10 },
    ]);
  });

  it("normalizes DDB actions and limited uses to shared rule effects", () => {
    const result = normalizeDdbRuleEffects({
      data: {
        actions: {
          class: [
            {
              id: 1,
              componentId: 1,
              name: "Commanding Presence",
              description: "Bolster an ally.",
              activation: { activationType: 3, activationTime: 1 },
              limitedUse: {
                maxUses: 1,
                statModifierUsesId: 6,
                operator: 2,
                useProficiencyBonus: true,
                proficiencyBonusOperator: 1,
                resetType: 2,
                numberUsed: 1,
              },
            },
          ],
        },
      },
      modifiers: [],
      abilities,
      proficiencyBonus: 3,
    });

    expect(result.actions).toEqual([
      {
        name: "Commanding Presence",
        source: "class",
        description: "Bolster an ally.",
        activation: { activationType: 3, activationTime: 1 },
        uses: { current: 5, max: 6, reset: "long rest" },
      },
    ]);
  });
});
