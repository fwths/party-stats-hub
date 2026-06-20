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
});
