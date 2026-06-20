import { describe, it, expect } from "vitest";

// These fixtures act as placeholders for the representative build tests.
// In Sprint B and beyond, we will plug these into the actual engine to
// ensure grants, choices, and rules evaluate correctly.

describe("Native Character Builds Coverage", () => {
  it("fixture: simple martial (Fighter 1)", () => {
    const fighter = {
      name: "Fighter Build",
      classId: "fighter",
      level: 1,
      abilities: { STR: 16, DEX: 14, CON: 14, INT: 10, WIS: 10, CHA: 10 },
    };
    expect(fighter.classId).toBe("fighter");
    expect(fighter.level).toBe(1);
  });

  it("fixture: simple caster (Wizard 1)", () => {
    const wizard = {
      name: "Wizard Build",
      classId: "wizard",
      level: 1,
      cantripChoices: ["fire bolt", "mage hand", "prestidigitation"],
    };
    expect(wizard.classId).toBe("wizard");
    expect(wizard.cantripChoices).toHaveLength(3);
  });

  it("fixture: multiclass (Fighter 1 / Wizard 1)", () => {
    const multiclass = {
      name: "Gish Build",
      classId: "fighter",
      level: 1,
      multiClasses: [{ classId: "wizard", subclassId: null, level: 1 }],
    };
    expect(multiclass.multiClasses[0].classId).toBe("wizard");
  });

  it("fixture: species with variants (e.g. Dragonborn)", () => {
    const speciesWithVariant = {
      name: "Gem Dragonborn",
      raceId: "dragonborn-gem",
      speciesVariantId: "amethyst",
    };
    expect(speciesWithVariant.raceId).toBe("dragonborn-gem");
    expect(speciesWithVariant.speciesVariantId).toBe("amethyst");
  });

  it("fixture: background with ASI and Origin Feat", () => {
    const backgroundWithOrigin = {
      name: "Acolyte",
      backgroundId: "acolyte",
      abilityBonuses: { WIS: 2, INT: 1 },
      featChoices: {
        skills: [],
        tools: [],
        spells: ["guidance", "sacred flame", "cure wounds"],
      },
    };
    expect(backgroundWithOrigin.backgroundId).toBe("acolyte");
    expect(backgroundWithOrigin.abilityBonuses.WIS).toBe(2);
  });
});
