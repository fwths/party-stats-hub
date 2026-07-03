import { describe, expect, it } from "vitest";
import {
  deriveMaximumSpellLevelAtClassLevel,
  deriveLevelUpProgressionRequirements,
  deriveUnsupportedLevelUpProgression,
} from "./level-up-progression";

describe("V3 class progression requirements", () => {
  it("derives prepared-spell and cantrip increases at the next class level", () => {
    const progressionJson = JSON.stringify({
      tableGroups: [
        {
          colLabels: ["Prepared Spells", "Cantrips", "1st"],
          rows: [
            [3, 2, 2],
            [4, 3, 3],
          ],
        },
      ],
    });
    expect(
      deriveLevelUpProgressionRequirements({
        progressionJson,
        currentClassLevel: 1,
        nextClassLevel: 2,
      }),
    ).toEqual([
      { kind: "prepared-spell", count: 1, label: "Choose 1 prepared spell" },
      { kind: "cantrip", count: 1, label: "Choose 1 cantrip" },
    ]);
  });

  it("fails closed for malformed structured progression", () => {
    expect(() =>
      deriveLevelUpProgressionRequirements({
        progressionJson: "not-json",
        currentClassLevel: 7,
        nextClassLevel: 8,
      }),
    ).toThrow(/invalid/);
  });

  it("reports unsupported increasing progression columns without blocking known spell slots", () => {
    const progressionJson = JSON.stringify({
      tableGroups: [
        {
          colLabels: ["Prepared Spells", "Cantrips", "1st", "Mystic Tricks"],
          rows: [
            [3, 2, 2, 1],
            [4, 3, 3, 2],
          ],
        },
      ],
    });

    expect(
      deriveUnsupportedLevelUpProgression({
        progressionJson,
        currentClassLevel: 1,
        nextClassLevel: 2,
      }),
    ).toEqual([
      {
        label: "Mystic Tricks",
        before: 1,
        after: 2,
        reason: "unsupported-progressing-column",
      },
    ]);
  });

  it("accepts only explicitly declared resource progressions", () => {
    const progressionJson = JSON.stringify({
      tableGroups: [
        {
          colLabels: ["Sorcery Points", "Mystic Tricks"],
          rows: [
            [7, 1],
            [8, 2],
          ],
        },
      ],
    });
    expect(
      deriveUnsupportedLevelUpProgression({
        progressionJson,
        currentClassLevel: 1,
        nextClassLevel: 2,
        supportedResourceLabels: ["Sorcery Points"],
      }),
    ).toEqual([expect.objectContaining({ label: "Mystic Tricks" })]);
  });

  it("derives maximum spell level from filtered ordinal slot headers", () => {
    const progressionJson = JSON.stringify({
      tableGroups: [
        {
          colLabels: [
            "{@filter 1st|spells|level=1|class=sorcerer}",
            "{@filter 4th|spells|level=4|class=sorcerer}",
            "{@filter 5th|spells|level=5|class=sorcerer}",
          ],
          rowsSpellProgression: [[4, 2, 0]],
        },
      ],
    });
    expect(deriveMaximumSpellLevelAtClassLevel({ progressionJson, classLevel: 1 })).toBe(4);
  });
});
