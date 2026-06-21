import { describe, expect, it } from "vitest";
import { mapDdbModifiersToGrants } from "./grants-mapper";

describe("mapDdbModifiersToGrants", () => {
  it("maps DDB modifiers into canonical grants without treating every proficiency as a skill", () => {
    const grants = mapDdbModifiersToGrants([
      { id: 1, type: "proficiency", subType: "stealth", friendlySubtypeName: "Stealth" },
      {
        id: 2,
        type: "proficiency",
        subType: "martial-weapons",
        friendlySubtypeName: "Martial Weapons",
      },
      { id: 3, type: "proficiency", subType: "heavy-armor", friendlySubtypeName: "Heavy Armor" },
      {
        id: 4,
        type: "proficiency",
        subType: "thieves-tools",
        friendlySubtypeName: "Thieves' Tools",
      },
      { id: 5, type: "resistance", subType: "fire", friendlySubtypeName: "Fire" },
      {
        id: 6,
        type: "immunity",
        subType: "poisoned-condition",
        friendlySubtypeName: "Poisoned Condition",
      },
      { id: 7, type: "bonus", subType: "armor-class", value: 1 },
      { id: 8, type: "weapon-mastery", subType: "longsword", friendlySubtypeName: "Longsword" },
    ]);

    expect(
      grants.some((grant) => grant.type === "skill_proficiency" && grant.value === "stealth"),
    ).toBe(true);
    expect(
      grants.some(
        (grant) => grant.type === "weapon_proficiency" && grant.value === "Martial Weapons",
      ),
    ).toBe(true);
    expect(
      grants.some((grant) => grant.type === "armor_proficiency" && grant.value === "Heavy Armor"),
    ).toBe(true);
    expect(
      grants.some((grant) => grant.type === "tool_proficiency" && grant.value === "Thieves' Tools"),
    ).toBe(true);
    expect(
      grants.some((grant) => grant.type === "damage_resistance" && grant.value === "fire"),
    ).toBe(true);
    expect(
      grants.some((grant) => grant.type === "condition_immunity" && grant.value === "poisoned"),
    ).toBe(true);
    expect(grants.some((grant) => grant.type === "armor_class_bonus" && grant.value === 1)).toBe(
      true,
    );
    expect(
      grants.some((grant) => grant.type === "weapon_mastery" && grant.value === "Longsword"),
    ).toBe(true);
    expect(
      grants.some(
        (grant) => grant.type === "skill_proficiency" && grant.value === "martial_weapons",
      ),
    ).toBe(false);
  });

  it("handles duplicate skill, language, resistance, and immunity grants", () => {
    const grants = mapDdbModifiersToGrants([
      { id: 1, type: "proficiency", subType: "stealth", friendlySubtypeName: "Stealth" },
      { id: 2, type: "proficiency", subType: "stealth", friendlySubtypeName: "Stealth Override" },
      { id: 3, type: "language", subType: "elvish", friendlySubtypeName: "Elvish" },
      { id: 4, type: "language", subType: "elvish", friendlySubtypeName: "Elvish again" },
      { id: 5, type: "resistance", subType: "fire", friendlySubtypeName: "Fire" },
      { id: 6, type: "resistance", subType: "fire", friendlySubtypeName: "Fire" },
      {
        id: 7,
        type: "immunity",
        subType: "poisoned-condition",
        friendlySubtypeName: "Poisoned Condition",
      },
      {
        id: 8,
        type: "immunity",
        subType: "poisoned-condition",
        friendlySubtypeName: "Poisoned Condition",
      },
    ]);

    const stealths = grants.filter((g) => g.type === "skill_proficiency" && g.value === "stealth");
    expect(stealths).toHaveLength(1);

    const languages = grants.filter(
      (g) => g.type === "language" && String(g.value).toLowerCase() === "elvish",
    );
    expect(languages).toHaveLength(1);

    const resistances = grants.filter((g) => g.type === "damage_resistance" && g.value === "fire");
    expect(resistances).toHaveLength(1);

    const immunities = grants.filter(
      (g) => g.type === "condition_immunity" && g.value === "poisoned",
    );
    expect(immunities).toHaveLength(1);
  });

  it("handles senses overlaps by choosing the highest range", () => {
    const grants = mapDdbModifiersToGrants([
      { id: 1, type: "set-base", subType: "darkvision", value: "60" },
      { id: 2, type: "set-base", subType: "darkvision", value: "120" },
      { id: 3, type: "set-base", subType: "truesight", value: "30" },
    ]);

    const darkvisions = grants.filter(
      (g) => g.type === "sense" && String(g.value).startsWith("darkvision"),
    );
    expect(darkvisions).toHaveLength(1);
    expect(darkvisions[0].value).toBe("darkvision 120");

    const truesights = grants.filter(
      (g) => g.type === "sense" && String(g.value).startsWith("truesight"),
    );
    expect(truesights).toHaveLength(1);
    expect(truesights[0].value).toBe("truesight 30");
  });

  it("handles speed overlaps by choosing highest base and summing bonuses", () => {
    const grants = mapDdbModifiersToGrants([
      { id: 1, type: "set-base", subType: "walk", value: 30, friendlySubtypeName: "Walk 30" },
      { id: 2, type: "set-base", subType: "walk", value: 35, friendlySubtypeName: "Walk 35" },
      { id: 3, type: "bonus", subType: "walk", value: 10, friendlySubtypeName: "Bonus 10" },
      { id: 4, type: "bonus", subType: "walk", value: 5, friendlySubtypeName: "Bonus 5" },
    ]);

    const walkBases = grants.filter((g) => g.type === "speed");
    expect(walkBases).toHaveLength(1);
    expect(walkBases[0].value).toEqual({ walk: 35 });

    const walkBonuses = grants.filter((g) => g.type === "speed_bonus");
    expect(walkBonuses).toHaveLength(1);
    expect(walkBonuses[0].value).toEqual({ walk: 15 });
  });
});
