import { describe, expect, it } from "vitest";
import { parseGrantedSpellsAtLevel } from "./level-up-granted-spells";

describe("granted subclass spell parsing", () => {
  it("parses fixed prepared and known XPHB spell references", () => {
    expect(
      parseGrantedSpellsAtLevel(
        [{ prepared: { 3: ["guiding bolt|xphb"] }, known: { 3: ["guidance|xphb#c"] } }],
        3,
      ),
    ).toEqual({
      spells: [
        { name: "guiding bolt", sourceId: "XPHB", cantrip: false, mode: "always-prepared" },
        { name: "guidance", sourceId: "XPHB", cantrip: true, mode: "granted" },
      ],
      choiceRequirements: [],
      variantChoices: [],
      selectedVariant: null,
      blockers: [],
    });
  });

  it("fails closed for variants, choices, and innate casting", () => {
    const variants = parseGrantedSpellsAtLevel(
      [{ name: "Arid", prepared: { 3: ["fire bolt|xphb"] } }, { name: "Polar" }],
      3,
    );
    expect(variants.variantChoices).toEqual(["Arid", "Polar"]);
    expect(variants.blockers).toEqual([]);
    expect(
      parseGrantedSpellsAtLevel(
        [{ name: "Arid", prepared: { 3: ["fire bolt|xphb"] } }, { name: "Polar" }],
        3,
        "Arid",
      ),
    ).toMatchObject({ selectedVariant: "Arid", spells: [{ name: "fire bolt" }] });
    const result = parseGrantedSpellsAtLevel(
      [
        {
          known: { 3: [{ choose: "level=0;1;2|class=Wizard" }] },
          innate: { 3: ["hex|xphb"] },
        },
      ],
      3,
    );
    expect(result.choiceRequirements).toEqual([
      expect.objectContaining({ count: 1, levels: [0, 1, 2], classIds: ["wizard"] }),
    ]);
    expect(result.blockers).toHaveLength(1);
  });
});
