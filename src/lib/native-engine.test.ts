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

  it("applies high-level feats choice active effects and lists them in feats list", () => {
    const mockFeatData = {
      id: "tough",
      name: "Tough",
      category: "General",
      description: "Your HP max increases by 2 for each level.",
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
    };

    const stateWithFeats = {
      ...mockState,
      highLevelFeatChoices: {
        4: "tough",
      },
    };

    const result = createNativePartyMember(
      stateWithFeats,
      mockRaceData,
      mockClassData,
      undefined,
      undefined,
      undefined,
      [],
      [],
      {
        feats: [mockFeatData],
      },
    );

    // Feat should be listed in the returned member's feats list
    const featInfo = result.feats.find((f) => f.name === "Tough");
    expect(featInfo).toBeDefined();
    expect(featInfo?.description).toBe(mockFeatData.description);

    // Active effect (AC +1) should be applied
    expect(result.armorClass).toBe(10 + 1 + 1); // 10 base + 1 dex + 1 feat AC bonus
  });

  it("calculates multiclassing levels, hit dice pools, and combined spell slots", () => {
    const wizardClass = {
      id: "wizard",
      name: "Wizard",
      hitDice: 6,
      spellcastingJson: JSON.stringify({
        ability: "INT",
        progression: "full",
      }),
    };

    const stateWithMulticlass = {
      ...mockState,
      level: 4, // Fighter 4
      multiClasses: [
        { classId: "wizard", subclassId: null, level: 2 }, // Wizard 2
      ],
    };

    const result = createNativePartyMember(
      stateWithMulticlass,
      mockRaceData,
      mockClassData,
      undefined,
      undefined,
      undefined,
      [],
      [],
      {
        classes: [mockClassData, wizardClass],
      },
    );

    expect(result.level).toBe(6);
    expect(result.classes).toBe("Fighter 4 / Wizard 2");
    expect(result.hitDice).toBe("4d10, 2d6");
    
    // Caster level 2 slots should be [3] (3 first-level slots)
    expect(result.spellSlots.length).toBe(1);
    expect(result.spellSlots[0]).toEqual({ level: 1, max: 3, used: 0 });
  });

  it("calculates manual HP rolls level-by-level", () => {
    const stateWithManualHp = {
      ...mockState,
      level: 4,
      abilities: { STR: 10, DEX: 12, CON: 12, INT: 10, WIS: 10, CHA: 10 }, // CON mod +1
      hpType: "manual" as const,
      manualHpRolls: {
        2: 8,
        3: 6,
        4: 7,
      },
    };

    const result = createNativePartyMember(
      stateWithManualHp,
      mockRaceData,
      { ...mockClassData, hitDice: 10 },
      undefined,
      undefined,
      undefined,
      [],
      [],
      {},
    );

    // Level 1: 10 + 1 = 11
    // Level 2: 8 + 1 = 9
    // Level 3: 6 + 1 = 7
    // Level 4: 7 + 1 = 8
    // Total: 11 + 9 + 7 + 8 = 35 HP
    expect(result.hpMax).toBe(35);
  });

  it("includes custom equipment and parses its active effects if equipped & attuned", () => {
    const mockRingOfProtection = {
      name: "Ring of Protection",
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
    };

    const stateWithCustomGear = {
      ...mockState,
      customEquipment: [
        {
          name: "Ring of Protection",
          type: "Wondrous Item",
          quantity: 1,
          equipped: true,
          attuned: true,
          rarity: "Rare",
          description: "Adds +1 to AC.",
        },
      ],
    };

    const result = createNativePartyMember(
      stateWithCustomGear,
      mockRaceData,
      mockClassData,
      undefined,
      undefined,
      undefined,
      [],
      [],
      {
        magicItems: [mockRingOfProtection],
      },
    );

    const item = result.inventory.find((i) => i.name === "Ring of Protection");
    expect(item).toBeDefined();
    expect(item?.magic).toBe(true);
    expect(item?.equipped).toBe(true);
    expect(item?.attuned).toBe(true);

    // AC should be increased by 1 from Ring of Protection
    expect(result.armorClass).toBe(10 + 1 + 1); // 10 base + 1 dex + 1 ring AC bonus
  });
});
