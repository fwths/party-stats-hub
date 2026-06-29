import { describe, expect, it } from "vitest";
import {
  computeCharacterSnapshot,
  createNativePartyMember,
  refreshNativePartyMemberSnapshot,
} from "./native-engine";

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

  it("deduplicates skills and tools correctly based on overlap rules", () => {
    // This is essentially testing the deduplication in the final mapping,
    // which operates on `_generatedGrants` and unique().
    const state = { ...mockState };
    const fakeRace = {
      id: "fake_race",
      name: "Fake Race",
      foundryJson: JSON.stringify([
        { type: "skill_proficiency", value: "stealth" },
        { type: "skill_proficiency", value: "stealth" }, // Duplicate!
      ]),
    };

    const member = createNativePartyMember(state, fakeRace, null);

    // Stealth should only appear once in member.skills if overlap detection works!
    const stealthSkills = member.skills.filter((s) => s.name.toLowerCase() === "stealth");
    expect(stealthSkills.length).toBe(1);
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
                  changes: [{ key: "system.abilities.str.value", mode: "OVERRIDE", value: 19 }],
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
                  changes: [{ key: "system.attributes.ac.bonus", mode: "ADD", value: 1 }],
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
              opt1: [{ item: "Ring of Fire Resistance", quantity: 1, equipped: true }],
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

    expect(resultEquipped.defenses).toContainEqual({ type: "resistance", damageType: "fire" });
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
            changes: [{ key: "system.attributes.movement.walk", mode: "ADD", value: 5 }],
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
            changes: [{ key: "system.attributes.ac.bonus", mode: "ADD", value: 1 }],
          },
        ],
      }),
    };

    const stateWithFeats = {
      ...mockState,
      originFeatId: "tough",
    };

    const result = createNativePartyMember(
      stateWithFeats,
      mockRaceData,
      mockClassData,
      undefined,
      undefined,
      mockFeatData,
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

    // Active effect (AC +1) should be applied. 10 base + 1 dex + 1 feat AC bonus
    expect(result.armorClass).toBe(12);
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
            changes: [{ key: "system.attributes.ac.bonus", mode: "ADD", value: 1 }],
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

  it("recomputes a native snapshot from canonical builder state and Forge data", () => {
    const forgeData = {
      species: [mockRaceData],
      speciesVariants: [],
      backgrounds: [{ id: "soldier", name: "Soldier" }],
      classes: [mockClassData],
      subclasses: [],
      feats: [],
      spells: [{ id: "shield", name: "Shield", level: 1 }],
      classFeatures: [],
      activeEffects: [],
      featureActiveEffects: [],
      itemActiveEffects: [],
      spellActiveEffects: [],
      magicItems: [],
      weapons: [],
      armor: [],
      skills: [],
      senses: [],
      conditions: [],
      rulesActions: [],
      optionalFeatures: [],
      charOptions: [],
      mundaneGear: [],
      weaponMasteries: [],
      itemProperties: [],
      itemTypes: [],
      itemTypeAdditionalEntries: [],
      itemGroups: [],
      magicVariants: [],
      itemCardReferences: [],
      challengeRatings: [],
      creatureBuilderEntries: [],
      classSpells: [],
      languages: [],
    };

    const result = computeCharacterSnapshot(
      {
        builderState: {
          ...mockState,
          raceId: "human",
          backgroundId: "soldier",
          classId: "fighter",
          preparedSpellChoicesByClass: { fighter: ["shield"] },
        },
      },
      forgeData,
    );

    expect(result.name).toBe("Arthur Pendragon");
    expect(result.race).toBe("Human");
    expect(result.classes).toBe("Fighter 5");
    expect(result.preparedSpells.some((spell) => spell.name === "Shield")).toBe(true);
  });

  it("applies the Alert origin feat to initiative", () => {
    const alert = { id: "alert", name: "Alert", description: "Add proficiency to Initiative." };
    const result = createNativePartyMember(
      { ...mockState, originFeatId: "alert" },
      mockRaceData,
      mockClassData,
      undefined,
      undefined,
      alert,
      [],
      [],
      { feats: [alert] },
    );

    expect(result.initiative).toBe(4); // +1 DEX and +3 proficiency at level 5
  });

  it("keeps explicitly level-gated species features locked", () => {
    const aasimar = {
      ...mockRaceData,
      id: "aasimar",
      name: "Aasimar",
      featuresJson: JSON.stringify([
        {
          name: "Celestial Revelation",
          description: "When you reach character level 3, you can transform.",
        },
      ]),
    };

    const levelOne = createNativePartyMember({ ...mockState, level: 1 }, aasimar, mockClassData);
    const levelThree = createNativePartyMember({ ...mockState, level: 3 }, aasimar, mockClassData);

    expect(levelOne.features.some((feature) => feature.name === "Celestial Revelation")).toBe(
      false,
    );
    expect(levelThree.features.some((feature) => feature.name === "Celestial Revelation")).toBe(
      true,
    );
  });

  it("adds Mending from Tinker's Magic", () => {
    const artificer = {
      ...mockClassData,
      id: "artificer",
      name: "Artificer",
      spellcastingJson: JSON.stringify({ ability: "INT", progression: "artificer" }),
    };
    const tinkersMagic = {
      id: "artificer-tinkers-magic-1",
      classId: "artificer",
      name: "Tinker's Magic",
      description: "You know the Mending cantrip.",
      levelRequired: 1,
    };
    const result = createNativePartyMember(
      { ...mockState, classId: "artificer", level: 1 },
      mockRaceData,
      artificer,
      undefined,
      undefined,
      undefined,
      [],
      [tinkersMagic],
      {
        classFeatures: [tinkersMagic],
        spells: [{ id: "mending", name: "Mending", level: 0, description: "Repair an object." }],
      },
    );

    expect(result.cantrips.some((spell) => spell.name === "Mending")).toBe(true);
  });

  it("adds weapon proficiency only when the native character has it", () => {
    const state = {
      ...mockState,
      customEquipment: [
        { name: "Rapier", type: "Weapon", equipped: true, quantity: 1, rarity: "Mundane" },
      ],
    };
    const weaponData = [
      {
        name: "Rapier",
        damageDice: "1d8",
        damageType: "Piercing",
        propertiesJson: JSON.stringify(["Finesse"]),
      },
    ];
    const simpleOnly = createNativePartyMember(
      state,
      mockRaceData,
      {
        ...mockClassData,
        proficienciesJson: JSON.stringify({ starting: { weapons: ["Simple Weapons"] } }),
      },
      undefined,
      undefined,
      undefined,
      [],
      [],
      { weapons: weaponData },
    );
    const martial = createNativePartyMember(
      state,
      mockRaceData,
      {
        ...mockClassData,
        proficienciesJson: JSON.stringify({ starting: { weapons: ["Martial Weapons"] } }),
      },
      undefined,
      undefined,
      undefined,
      [],
      [],
      { weapons: weaponData },
    );

    expect(simpleOnly.attacks[0].attackBonus).toBe(2);
    expect(martial.attacks[0].attackBonus).toBe(5);
  });

  it("recognizes renamed magical shields and armor dexterity caps", () => {
    const result = createNativePartyMember(
      {
        ...mockState,
        abilities: { ...mockState.abilities, DEX: 18 },
        customEquipment: [
          {
            name: "Scale Mail +1",
            type: "Medium Armor",
            armorClass: 15,
            equipped: true,
            quantity: 1,
            rarity: "Rare",
          },
          {
            name: "Sentinel Shield +1",
            type: "Shield",
            armorTypeId: 4,
            armorClass: 3,
            equipped: true,
            quantity: 1,
            rarity: "Rare",
          },
        ],
      },
      mockRaceData,
      mockClassData,
    );

    expect(result.armorClass).toBe(20); // 15 armor + capped 2 DEX + 3 shield
  });

  it("refreshes previously serialized native snapshots", () => {
    const stale = createNativePartyMember({ ...mockState, level: 1 }, mockRaceData, mockClassData);
    stale.features = [
      {
        name: "Healing Hands",
        description:
          "As a Magic action, restore Hit Points. Once you use this trait, you can't use it again until you finish a Long Rest.",
        source: "race",
        sourceName: "Aasimar",
        isUnlocked: true,
      },
      {
        name: "Tinker's Magic",
        description: "You know the Mending cantrip.",
        source: "class",
        sourceName: "Artificer",
        isUnlocked: true,
      },
      {
        name: "Celestial Revelation",
        description: "When you reach character level 3, you can transform.",
        source: "race",
        sourceName: "Aasimar",
        isUnlocked: true,
      },
    ];
    stale.feats = [{ name: "Alert", description: "", choices: [] }];
    stale.initiative = 1;

    const refreshed = refreshNativePartyMemberSnapshot(stale);

    expect(refreshed.initiative).toBe(3);
    expect(refreshed.cantrips.some((spell) => spell.name === "Mending")).toBe(true);
    expect(refreshed.actions.some((action) => action.name === "Healing Hands")).toBe(true);
    expect(refreshed.features.some((feature) => feature.name === "Celestial Revelation")).toBe(
      false,
    );
  });
});
