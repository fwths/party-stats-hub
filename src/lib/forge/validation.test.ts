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
});
