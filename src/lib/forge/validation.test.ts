import { describe, expect, it } from "vitest";
import { validateCharacterDraft } from "../rules/validate-character";
import type { ForgeData } from "./forge-data";

const baseCharacter: any = {
  name: "Test Hero",
  raceId: "human",
  speciesVariantId: null,
  backgroundId: "soldier",
  classId: "fighter",
  subclassId: null,
  level: 1,
  abilities: { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 },
  abilityBonuses: { STR: 2, DEX: 1, CON: 0, INT: 0, WIS: 0, CHA: 0 },
  ruleChoices: {},
  hpType: "fixed",
  customEquipment: [],
  multiClasses: [],
  abilitiesMethod: "standard",
  cantripChoices: [],
  preparedSpellChoices: [],
  cantripChoicesByClass: {},
  preparedSpellChoicesByClass: {},
};

const forgeData: ForgeData = {
  species: [{ id: "human", name: "Human", source: "XPHB" }],
  speciesVariants: [],
  backgrounds: [{ id: "soldier", name: "Soldier", source: "XPHB" }],
  classes: [{ id: "fighter", name: "Fighter", source: "XPHB", proficienciesJson: "{}" }],
  subclasses: [],
  feats: [],
  spells: [{ id: "shield", name: "Shield", source: "XPHB" }],
  classSpells: [],
  classFeatures: [],
  languages: [{ id: "common", name: "Common", source: "XPHB" }],
  activeEffects: [],
  featureActiveEffects: [],
  itemActiveEffects: [],
  spellActiveEffects: [],
  magicItems: [{ id: "ring-protection", name: "Ring of Protection", source: "XDMG" }],
  weapons: [{ id: "longsword", name: "Longsword", source: "XPHB" }],
  armor: [{ id: "chain-mail", name: "Chain Mail", source: "XPHB" }],
  skills: [{ id: "athletics", name: "Athletics", source: "XPHB" }],
  senses: [{ id: "darkvision", name: "Darkvision", source: "XPHB" }],
  conditions: [{ id: "poisoned", name: "Poisoned", source: "XPHB" }],
  rulesActions: [{ id: "attack", name: "Attack", source: "XPHB" }],
  optionalFeatures: [{ id: "optional-a", name: "Optional A", source: "TCE" }],
  charOptions: [{ id: "char-a", name: "Char A", source: "TCE" }],
  mundaneGear: [{ id: "rope", name: "Rope, Hempen", source: "XPHB" }],
  weaponMasteries: [{ id: "graze", name: "Graze", source: "XPHB" }],
  itemProperties: [{ id: "light", name: "Light", source: "XPHB" }],
  itemTypes: [{ id: "artisan-tools", name: "Artisan's Tools", source: "XPHB" }],
  itemTypeAdditionalEntries: [],
  itemGroups: [{ id: "pack", name: "Explorer's Pack", source: "XPHB" }],
  magicVariants: [{ id: "plus-one", name: "+1 Weapon", source: "XDMG" }],
  itemCardReferences: [{ id: "ref", name: "Reference", source: "XPHB" }],
  challengeRatings: [],
  creatureBuilderEntries: [],
};

describe("validateCharacterDraft", () => {
  it("warns when custom equipment does not resolve to canonical item data", () => {
    const issues = validateCharacterDraft(
      { ...baseCharacter, customEquipment: [{ name: "Mystery Blade", quantity: 1 }] },
      forgeData,
    );
    expect(issues.some((issue) => issue.code === "UNRESOLVED_EQUIPMENT")).toBe(true);
  });

  it("errors when more than three items are attuned", () => {
    const issues = validateCharacterDraft(
      {
        ...baseCharacter,
        customEquipment: [
          { name: "Ring of Protection", quantity: 1, attuned: true },
          { name: "Ring of Protection", quantity: 1, attuned: true },
          { name: "Ring of Protection", quantity: 1, attuned: true },
          { name: "Ring of Protection", quantity: 1, attuned: true },
        ],
      },
      forgeData,
    );
    expect(issues.some((issue) => issue.code === "TOO_MANY_ATTUNED_ITEMS")).toBe(true);
  });

  it("errors when a selected spell is unknown", () => {
    const issues = validateCharacterDraft(
      { ...baseCharacter, preparedSpellChoicesByClass: { fighter: ["missing-spell"] } },
      forgeData,
    );
    expect(issues.some((issue) => issue.code === "UNKNOWN_SPELL")).toBe(true);
  });

  it("errors when selected content is from a disabled source", () => {
    const issues = validateCharacterDraft(
      {
        ...baseCharacter,
        preparedSpellChoicesByClass: { fighter: ["shield"] },
        sourcePolicy: {
          allowOfficial: true,
          allowHomebrew: false,
          allowPrerelease: false,
          allowPartner: false,
          allowedTiers: [],
          excludedSources: [],
        },
      },
      forgeData,
    );
    expect(issues.some((issue) => issue.code === "DISABLED_SPECIES_SOURCE")).toBe(true);
    expect(issues.some((issue) => issue.code === "DISABLED_SPELL_SOURCE")).toBe(true);
  });

  it("warns when resolved rule grants are not backed by canonical lookup tables", () => {
    const issues = validateCharacterDraft(
      {
        ...baseCharacter,
        raceId: "grant-test",
      },
      {
        ...forgeData,
        species: [
          {
            id: "grant-test",
            name: "Grant Test",
            source: "XPHB",
            languagesJson: JSON.stringify([{ Elvish: true }]),
            sensesJson: JSON.stringify({ tremorsense: 30 }),
            conditionImmunitiesJson: JSON.stringify(["Frightened"]),
          },
        ],
      },
    );

    expect(issues.some((issue) => issue.code === "UNKNOWN_LANGUAGE_GRANT")).toBe(true);
    expect(issues.some((issue) => issue.code === "UNKNOWN_SENSE_GRANT")).toBe(true);
    expect(issues.some((issue) => issue.code === "UNKNOWN_CONDITION_GRANT")).toBe(true);
  });

  it("warns when feature choices grant unknown rulesActions, weaponMasteries, or activeEffects", () => {
    const issues = validateCharacterDraft(
      {
        ...baseCharacter,
        ruleChoices: {
          "feature_test-feature_option_0": ["broken-option"],
        },
      },
      {
        ...forgeData,
        classFeatures: [
          {
            id: "test-feature",
            name: "Test Feature",
            classId: "fighter",
            levelRequired: 1,
            optionsJson: JSON.stringify([
              {
                count: 1,
                options: [
                  {
                    id: "broken-option",
                    label: "Broken Option",
                    grants: [
                      { type: "action", value: "Impossible Action" },
                      { type: "weapon_mastery", value: "Impossible Mastery" },
                      { type: "active_effect", value: "missing-effect" },
                    ],
                  },
                ],
              },
            ]),
          },
        ],
      },
    );

    expect(issues.some((issue) => issue.code === "UNKNOWN_RULE_ACTION_GRANT")).toBe(true);
    expect(issues.some((issue) => issue.code === "UNKNOWN_WEAPON_MASTERY_GRANT")).toBe(true);
    expect(issues.some((issue) => issue.code === "UNKNOWN_ACTIVE_EFFECT_GRANT")).toBe(true);
  });

  it("warns when featureActiveEffects, itemActiveEffects, or spellActiveEffects have broken links", () => {
    const issues = validateCharacterDraft(baseCharacter, {
      ...forgeData,
      featureActiveEffects: [{ featureId: "missing-feature", effectId: "missing-effect" }],
      itemActiveEffects: [{ itemId: "missing-item", effectId: "missing-effect" }],
      spellActiveEffects: [{ spellId: "missing-spell", effectId: "missing-effect" }],
    });

    expect(issues.some((issue) => issue.code === "UNKNOWN_FEATURE_ACTIVE_EFFECT_SOURCE")).toBe(
      true,
    );
    expect(issues.some((issue) => issue.code === "UNKNOWN_ITEM_ACTIVE_EFFECT_SOURCE")).toBe(true);
    expect(issues.some((issue) => issue.code === "UNKNOWN_SPELL_ACTIVE_EFFECT_SOURCE")).toBe(true);
  });

  it("errors when multiclassing without meeting the minimum ability scores of 13", () => {
    const issues = validateCharacterDraft(
      {
        ...baseCharacter,
        classId: "fighter",
        abilities: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 8 }, // fails Fighter too if it checked primary, but let's check Wizard: INT 10
        multiClasses: [{ classId: "wizard", level: 1, subclassId: null }],
      },
      {
        ...forgeData,
        classes: [
          { id: "fighter", name: "Fighter", source: "XPHB", proficienciesJson: "{}" },
          { id: "wizard", name: "Wizard", source: "XPHB", proficienciesJson: "{}" },
        ],
      },
    );
    expect(issues.some((issue) => issue.code === "INVALID_MULTICLASS_PREREQUISITE")).toBe(true);
  });

  it("errors when a selected general feat does not meet the level gate or ability score requirements", () => {
    const customForgeData = {
      ...forgeData,
      feats: [
        {
          id: "war-caster",
          name: "War Caster",
          source: "XPHB",
          levelRequirement: 4,
          prerequisitesJson: JSON.stringify({ spellcasting: true, ability: [{ INT: 13 }] }),
        },
      ],
    };

    // Character is level 1, has INT 10, no spellcasting, but selects War Caster
    const issues = validateCharacterDraft(
      {
        ...baseCharacter,
        level: 1,
        abilities: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
        highLevelFeatChoices: {
          "4": "war-caster",
        },
      },
      customForgeData,
    );
    expect(issues.some((issue) => issue.code === "INVALID_FEAT_PREREQUISITE")).toBe(true);
  });

  it("warns when a wizard spellbook exceeds the permitted capacity limits", () => {
    const customForgeData = {
      ...forgeData,
      classes: [{ id: "wizard", name: "Wizard", source: "XPHB", proficienciesJson: "{}" }],
      spells: [
        { id: "spell1", name: "Spell 1", level: 1, classId: "wizard", source: "XPHB" },
        { id: "spell2", name: "Spell 2", level: 1, classId: "wizard", source: "XPHB" },
        { id: "spell3", name: "Spell 3", level: 1, classId: "wizard", source: "XPHB" },
        { id: "spell4", name: "Spell 4", level: 1, classId: "wizard", source: "XPHB" },
        { id: "spell5", name: "Spell 5", level: 1, classId: "wizard", source: "XPHB" },
        { id: "spell6", name: "Spell 6", level: 1, classId: "wizard", source: "XPHB" },
        { id: "spell7", name: "Spell 7", level: 1, classId: "wizard", source: "XPHB" }, // 7th spell!
      ],
    };

    const issues = validateCharacterDraft(
      {
        ...baseCharacter,
        classId: "wizard",
        level: 1,
        selectedSpells: ["spell1", "spell2", "spell3", "spell4", "spell5", "spell6", "spell7"],
      },
      customForgeData,
    );
    expect(issues.some((issue) => issue.code === "WIZARD_SPELLBOOK_LIMIT")).toBe(true);
  });

  it("warns when a high-level warlock lacks the required Mystic Arcanum selections", () => {
    const customForgeData = {
      ...forgeData,
      classes: [{ id: "warlock", name: "Warlock", source: "XPHB", proficienciesJson: "{}" }],
      spells: [{ id: "spell6", name: "Spell 6", level: 6, isMysticArcanum: true, source: "XPHB" }],
    };

    // Level 11 Warlock expects 1 Mystic Arcanum (level 6 spell with isMysticArcanum)
    // Here we don't select it, so it warns.
    const issues = validateCharacterDraft(
      {
        ...baseCharacter,
        classId: "warlock",
        level: 11,
        selectedSpells: [], // none selected
      },
      customForgeData,
    );
    expect(issues.some((issue) => issue.code === "WARLOCK_MYSTIC_ARCANUM")).toBe(true);
  });

  it("warns when a druid selects wild shape forms that exceed their level/subclass CR cap", () => {
    const customForgeData = {
      ...forgeData,
      classes: [{ id: "druid", name: "Druid", source: "XPHB", proficienciesJson: "{}" }],
    };

    // Druid level 2 (not Moon Druid, max CR 1/4) selecting CR 1 creature
    const issues = validateCharacterDraft(
      {
        ...baseCharacter,
        classId: "druid",
        subclassId: null,
        level: 2,
        wildShapeBeasts: [{ name: "Brown Bear", challengeRating: 1.0 }],
      } as any,
      customForgeData,
    );
    expect(issues.some((issue) => issue.code === "DRUID_WILD_SHAPE")).toBe(true);
  });
});
