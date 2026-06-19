import { describe, expect, it } from "vitest";
import { createNativePartyMember } from "./native-engine";

const mockState = {
  name: "Arthur Pendragon",
  level: 5,
  abilities: { STR: 14, DEX: 12, CON: 14, INT: 10, WIS: 10, CHA: 12 },
  abilityBonuses: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 },
  featureChoices: {},
  classEquipmentOption: "opt1",
};

const mockClassData = {
  id: "fighter",
  name: "Fighter",
  hitDice: 10,
  proficienciesJson: JSON.stringify({
    savingThrows: ["str", "con"],
    starting: {
      armor: ["Light Armor", "Medium Armor", "Heavy Armor", "Shield"],
      weapons: ["Simple Weapons", "Martial Weapons"],
    },
  }),
};

const mockRaceData = {
  id: "human",
  name: "Human",
  speed: 30,
  sensesJson: JSON.stringify([]),
};

describe("createNativePartyMember with active effects", () => {
  it("calculates base character sheet details without active effects", () => {
    const result = createNativePartyMember(
      mockState,
      mockRaceData,
      mockClassData,
      undefined,
      undefined,
      undefined,
      [],
      [],
      {},
    );

    expect(result.name).toBe("Arthur Pendragon");
    expect(result.level).toBe(5);
    expect(result.hpMax).toBe(10 + 2 + 4 * (5 + 1 + 2)); // 10 + 2 (CON mod) + 4 * (5 + 1 + 2) = 44
    expect(result.abilities.find((a) => a.name === "STR")?.score).toBe(14);
    expect(result.armorClass).toBe(10 + 1); // no armor equipped, dex mod is 1
  });

  it("applies ability score overrides and AC bonuses from equipped items foundryJson", () => {
    // E.g. Gauntlets of Ogre Power setting Strength to 19, and Cloak of Protection giving +1 AC
    const result = createNativePartyMember(
      mockState,
      mockRaceData,
      {
        ...mockClassData,
        startingEquipmentJson: JSON.stringify({
          defaultData: [
            {
              opt1: [
                { item: "Gauntlets of Ogre Power", quantity: 1, equipped: true },
                { item: "Cloak of Protection", quantity: 1, equipped: true },
              ],
            },
          ],
        }),
      },
      undefined,
      undefined,
      undefined,
      [],
      [],
      {
        magicItems: [
          {
            name: "Gauntlets of Ogre Power",
            foundryJson: JSON.stringify({
              effects: [
                {
                  disabled: false,
                  changes: [
                    { key: "system.abilities.str.value", mode: "OVERRIDE", value: 19 },
                  ],
                },
              ],
            }),
          },
          {
            name: "Cloak of Protection",
            foundryJson: JSON.stringify({
              effects: [
                {
                  disabled: false,
                  changes: [
                    { key: "system.attributes.ac.bonus", mode: "ADD", value: 1 },
                  ],
                },
              ],
            }),
          },
        ],
      },
    );

    // Strength should be overridden to 19
    const strScore = result.abilities.find((a) => a.name === "STR")?.score;
    expect(strScore).toBe(19);

    // AC should include +1 Cloak of Protection bonus
    expect(result.armorClass).toBe(10 + 1 + 1); // 10 base + 1 dex + 1 cloak
  });

  it("applies active spell active effects from database active effects changes", () => {
    const result = createNativePartyMember(
      mockState,
      mockRaceData,
      mockClassData,
      undefined,
      undefined,
      undefined,
      [{ id: "haste", name: "Haste" }],
      [],
      {
        activeEffects: [
          {
            id: "effect-spell-haste",
            name: "Haste",
            changesJson: JSON.stringify({
              speeds: [{ type: "walk", value: 30 }],
            }),
          },
        ],
        spellActiveEffects: [{ spellId: "haste", effectId: "effect-spell-haste" }],
      },
    );

    // Base speed 30 + 30 Haste bonus = 60
    expect(result.speed).toBe(60);
  });

  it("applies defenses and senses from foundryJson correctly", () => {
    // Equipping the ring
    const resultEquipped = createNativePartyMember(
      mockState,
      mockRaceData,
      {
        ...mockClassData,
        startingEquipmentJson: JSON.stringify({
          defaultData: [
            {
              opt1: [
                { item: "Ring of Fire Resistance", quantity: 1, equipped: true },
              ],
            },
          ],
        }),
      },
      undefined,
      undefined,
      undefined,
      [],
      [],
      {
        magicItems: [
          {
            name: "Ring of Fire Resistance",
            foundryJson: JSON.stringify({
              effects: [
                {
                  disabled: false,
                  changes: [
                    { key: "system.traits.dr.value", mode: "ADD", value: "fire" },
                    { key: "system.attributes.senses.darkvision", mode: "ADD", value: 60 },
                  ],
                },
              ],
            }),
          },
        ],
      },
    );

    expect(resultEquipped.defenses).toContainEqual({ type: "resistance", damageType: "Fire" });
    expect(resultEquipped.senses).toContainEqual({ name: "Darkvision", value: 60 });
  });

  it("applies species variant (subrace) features and active effects", () => {
    const mockSubraceData = {
      name: "Hill",
      featuresJson: JSON.stringify([
        { name: "Dwarven Toughness", description: "Your hit point maximum increases by 1." },
      ]),
      foundryJson: JSON.stringify({
        effects: [
          {
            disabled: false,
            changes: [
              { key: "system.attributes.movement.walk", mode: "ADD", value: 5 },
            ],
          },
        ],
      }),
    };

    const result = createNativePartyMember(
      mockState,
      { ...mockRaceData, name: "Dwarf" },
      mockClassData,
      undefined,
      undefined,
      undefined,
      [],
      [],
      {},
      mockSubraceData,
    );

    // Race name should be combined: "Hill Dwarf"
    expect(result.race).toBe("Hill Dwarf");

    // Subrace feature should be added
    const toughness = result.features.find((f) => f.name === "Dwarven Toughness");
    expect(toughness).toBeDefined();
    expect(toughness?.description).toBe("Your hit point maximum increases by 1.");

    // Active effect (speed walk + 5) should be applied
    expect(result.speed).toBe(30 + 5); // 30 base speed + 5 subrace walk bonus = 35
  });
});
