import { describe, it, expect } from "vitest";
import { getSkillOptionsFromDb, getToolOptionsFromDb } from "./BuilderUtils";
import { SKILL_OPTIONS, TOOL_OPTIONS } from "./BuilderConstants";

describe("BuilderUtils Coverage", () => {
  it("getSkillOptionsFromDb returns canonical skill names when DB data provided", () => {
    const mockDbSkills = [
      { name: "Acrobatics" },
      { name: "Animal Handling" },
      { name: "Arcana" },
      // testing normalization
      { name: "{@skill Athletics}" },
    ];

    const result = getSkillOptionsFromDb(mockDbSkills);
    expect(result).toContain("Acrobatics");
    expect(result).toContain("Athletics");
    expect(result.length).toBe(4);
  });

  it("getSkillOptionsFromDb falls back to SKILL_OPTIONS if DB data is empty", () => {
    const result = getSkillOptionsFromDb(undefined);
    expect(result).toEqual(SKILL_OPTIONS);
  });

  it("getToolOptionsFromDb extracts tools from mundane gear and item types", () => {
    const mockMundaneGear = [
      { name: "Alchemist's Supplies", type: "AT" },
      { name: "Thieves' Tools", type: "T" },
      { name: "Rope, Hempen", type: "G" }, // Not a tool
    ];

    const mockItemTypes = [
      { name: "Artisan's Tools", abbreviation: "AT" },
      { name: "Gaming Set", abbreviation: "GS" },
    ];

    const result = getToolOptionsFromDb(mockMundaneGear, mockItemTypes);
    expect(result).toContain("Alchemist's Supplies");
    expect(result).toContain("Thieves' Tools");
    expect(result).toContain("Artisan's Tools");
    expect(result).toContain("Gaming Set");
    expect(result).not.toContain("Rope, Hempen");
  });

  it("getToolOptionsFromDb falls back to TOOL_OPTIONS if DB data is empty", () => {
    const result = getToolOptionsFromDb(undefined, undefined);
    expect(result).toEqual(TOOL_OPTIONS);
  });
});
