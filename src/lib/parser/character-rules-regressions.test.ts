import { describe, expect, it } from "vitest";
import { computeAttacks } from "./attacks";
import { computeDefenses } from "./defenses";
import { computeSpellSlots } from "./spells";

const abilities = [
  { name: "STR", score: 10, modifier: 0 },
  { name: "DEX", score: 10, modifier: 0 },
  { name: "CON", score: 10, modifier: 0 },
  { name: "INT", score: 10, modifier: 0 },
  { name: "WIS", score: 18, modifier: 4 },
  { name: "CHA", score: 10, modifier: 0 },
];

describe("character rule regressions", () => {
  it("maps D&D Beyond radiant action damage correctly", () => {
    const attacks = computeAttacks(
      {
        actions: {
          class: [
            {
              id: 1,
              name: "Archer: Luminous Arrow",
              isAttack: true,
              attackTypeRange: 2,
              abilityModifierStatId: 5,
              fixedToHit: null,
              isProficient: true,
              damageTypeId: 12,
              dice: { diceString: "1d8" },
            },
          ],
        },
      },
      abilities,
      3,
      [],
    );

    expect(attacks[0].damageType).toBe("Radiant");
  });

  it("classifies non-damage immunities as condition immunities", () => {
    expect(
      computeDefenses([
        { type: "immunity", subType: "magical-sleep", friendlySubtypeName: "Magical Sleep" },
        { type: "immunity", subType: "fire", friendlySubtypeName: "Fire" },
      ]),
    ).toEqual([
      { type: "condition_immunity", damageType: "Magical Sleep" },
      { type: "immunity", damageType: "Fire" },
    ]);
  });

  it("uses single-class slot rounding for half and third casters", () => {
    const paladin = computeSpellSlots({
      classes: [{ definition: { name: "Paladin" }, level: 3 }],
    });
    expect(paladin.spellSlots).toEqual([{ level: 1, max: 3, used: 0 }]);

    const eldritchKnight = computeSpellSlots({
      classes: [
        {
          definition: { name: "Fighter" },
          subclassDefinition: { name: "Eldritch Knight" },
          level: 4,
        },
      ],
    });
    expect(eldritchKnight.spellSlots).toEqual([{ level: 1, max: 3, used: 0 }]);
  });

  it("rounds down when combining spellcasting from multiple classes", () => {
    const slots = computeSpellSlots({
      classes: [
        { definition: { name: "Paladin" }, level: 3 },
        { definition: { name: "Wizard" }, level: 1 },
      ],
    });
    expect(slots.spellSlots).toEqual([{ level: 1, max: 3, used: 0 }]);
  });
});
