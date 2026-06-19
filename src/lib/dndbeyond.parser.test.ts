import { describe, it, expect } from "vitest";
import { parseCharacterPayload } from "./dndbeyond.parser";

describe("parseCharacterPayload", () => {
  it("returns errorMember when payload is invalid", () => {
    const result = parseCharacterPayload(12345, null);
    expect(result.id).toBe(12345);
    expect(result.error).toBeDefined();
    expect(result.name).toBe("Character 12345");
  });

  it("parses a basic character payload successfully", () => {
    const payload = {
      success: true,
      data: {
        id: 99999,
        name: "Mock Hero",
        baseHitPoints: 10,
        bonusHitPoints: 0,
        overrideHitPoints: null,
        removedHitPoints: 3,
        temporaryHitPoints: 0,
        traits: {
          personalityTraits: "",
          ideals: "",
          bonds: "",
          flaws: "",
          appearance: "",
        },
        classes: [
          {
            definition: {
              name: "Fighter",
              hitDice: 10,
            },
            level: 3,
            isXP: true,
          },
        ],
        race: {
          fullName: "Dragonborn",
        },
        stats: [
          { id: 1, value: 15 }, // STR
          { id: 2, value: 14 }, // DEX
          { id: 3, value: 13 }, // CON
          { id: 4, value: 12 }, // INT
          { id: 5, value: 10 }, // WIS
          { id: 6, value: 8 }, // CHA
        ],
        bonusStats: [
          { id: 1, value: null },
          { id: 2, value: null },
          { id: 3, value: null },
          { id: 4, value: null },
          { id: 5, value: null },
          { id: 6, value: null },
        ],
        overrideStats: [
          { id: 1, value: null },
          { id: 2, value: null },
          { id: 3, value: null },
          { id: 4, value: null },
          { id: 5, value: null },
          { id: 6, value: null },
        ],
      },
    };

    const result = parseCharacterPayload(99999, payload);
    expect(result.id).toBe(99999);
    expect(result.name).toBe("Mock Hero");
    expect(result.classes).toBe("Fighter 3");
    expect(result.race).toBe("Dragonborn");
    expect(result.hpMax).toBe(13); // base 10 + (1 CON mod * 3 levels) = 13
    expect(result.hpCurrent).toBe(10); // 13 - 3 = 10

    // Check parsed abilities
    const str = result.abilities.find((a) => a.name === "STR");
    expect(str?.score).toBe(15);
    expect(str?.modifier).toBe(2); // (15 - 10) / 2 = 2
  });
});
