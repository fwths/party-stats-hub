import { RuleChoiceGroup } from "../choices";
import { RuleGrant } from "../grants";
import { parseJsonValue, normalizeChoiceName } from "../../../components/builder/BuilderUtils";
import { equipmentToRuleChoicesAndGrants } from "./items";

function parseProficiencies(
  proficienciesJson: any,
  sourceEntity: string,
  provenance: string,
): { choices: RuleChoiceGroup[]; grants: RuleGrant[] } {
  const choices: RuleChoiceGroup[] = [];
  const grants: RuleGrant[] = [];

  if (!proficienciesJson) return { choices, grants };

  // Fixed Armor
  if (Array.isArray(proficienciesJson.armor)) {
    proficienciesJson.armor.forEach((armor: string) => {
      grants.push({
        id: `${sourceEntity}_armor_${normalizeChoiceName(armor)}`,
        type: "armor_proficiency",
        value: armor,
        mode: "fixed",
        sourceEntity,
        provenance,
      });
    });
  }

  // Fixed Weapons
  if (Array.isArray(proficienciesJson.weapons)) {
    proficienciesJson.weapons.forEach((weapon: string) => {
      grants.push({
        id: `${sourceEntity}_weapon_${normalizeChoiceName(weapon)}`,
        type: "weapon_proficiency",
        value: weapon,
        mode: "fixed",
        sourceEntity,
        provenance,
      });
    });
  }

  // Fixed Saving Throws
  if (Array.isArray(proficienciesJson.savingThrows)) {
    proficienciesJson.savingThrows.forEach((save: string) => {
      grants.push({
        id: `${sourceEntity}_saving_throw_${normalizeChoiceName(save)}`,
        type: "saving_throw_proficiency",
        value: save,
        mode: "fixed",
        sourceEntity,
        provenance,
      });
    });
  }

  // Tools
  if (Array.isArray(proficienciesJson.tools)) {
    // Sometimes it's a list of strings, sometimes choice objects
    proficienciesJson.tools.forEach((tool: any, i: number) => {
      if (typeof tool === "string") {
        grants.push({
          id: `${sourceEntity}_tool_${normalizeChoiceName(tool)}`,
          type: "tool_proficiency",
          value: tool,
          mode: "fixed",
          sourceEntity,
          provenance,
        });
      } else if (tool.choose?.from) {
        choices.push({
          id: `${sourceEntity}_tool_choose_${i}`,
          sourceEntity,
          label: `Choose ${tool.choose.count || 1} tool${(tool.choose.count || 1) > 1 ? "s" : ""}`,
          min: tool.choose.count || 1,
          max: tool.choose.count || 1,
          exact: true,
          repeatable: false,
          optionType: "tool",
          options: tool.choose.from.map((t: string) => ({
            id: normalizeChoiceName(t),
            label: normalizeChoiceName(t),
          })),
          provenance,
        });
      } else if (tool.any) {
        choices.push({
          id: `${sourceEntity}_tool_any_${i}`,
          sourceEntity,
          label: `Choose ${tool.any} tool${tool.any > 1 ? "s" : ""}`,
          min: tool.any,
          max: tool.any,
          exact: true,
          repeatable: false,
          optionType: "tool",
          options: "all",
          provenance,
        });
      }
    });
  } else if (Array.isArray(proficienciesJson.toolProficiencies)) {
    proficienciesJson.toolProficiencies.forEach((toolMap: any) => {
      if (typeof toolMap === "object") {
        Object.entries(toolMap).forEach(([key, val]) => {
          if (val === true) {
            grants.push({
              id: `${sourceEntity}_tool_${normalizeChoiceName(key)}`,
              type: "tool_proficiency",
              value: key,
              mode: "fixed",
              sourceEntity,
              provenance,
            });
          }
        });
      }
    });
  }

  // Skills
  if (Array.isArray(proficienciesJson.skills)) {
    proficienciesJson.skills.forEach((skill: any, i: number) => {
      if (typeof skill === "string") {
        grants.push({
          id: `${sourceEntity}_skill_${normalizeChoiceName(skill)}`,
          type: "skill_proficiency",
          value: skill,
          mode: "fixed",
          sourceEntity,
          provenance,
        });
      } else if (skill.choose?.from) {
        choices.push({
          id: `${sourceEntity}_skill_choose_${i}`,
          sourceEntity,
          label: `Choose ${skill.choose.count || 1} skill${(skill.choose.count || 1) > 1 ? "s" : ""}`,
          min: skill.choose.count || 1,
          max: skill.choose.count || 1,
          exact: true,
          repeatable: false,
          optionType: "skill",
          options: skill.choose.from.map((sk: string) => ({
            id: normalizeChoiceName(sk),
            label: normalizeChoiceName(sk),
          })),
          provenance,
        });
      } else if (skill.any) {
        choices.push({
          id: `${sourceEntity}_skill_any_${i}`,
          sourceEntity,
          label: `Choose ${skill.any} skill${skill.any > 1 ? "s" : ""}`,
          min: skill.any,
          max: skill.any,
          exact: true,
          repeatable: false,
          optionType: "skill",
          options: "all",
          provenance,
        });
      }
    });
  }

  return { choices, grants };
}

export function classToRuleChoicesAndGrants(
  classEntity: any,
  isPrimary: boolean = true,
): { choices: RuleChoiceGroup[]; grants: RuleGrant[] } {
  if (!classEntity) return { choices: [], grants: [] };

  const sourceEntity = `class_${classEntity.id}`;
  const provenance = `Class: ${classEntity.name}`;

  const profJson = parseJsonValue(classEntity.proficienciesJson, {});
  const rawJson = parseJsonValue(classEntity.rawJson, {});

  let proficienciesToParse = isPrimary
    ? profJson.starting
    : rawJson.multiclassing?.proficienciesGained;

  if (isPrimary && profJson.savingThrows) {
    if (!proficienciesToParse) proficienciesToParse = {};
    proficienciesToParse.savingThrows = profJson.savingThrows;
  }

  const { choices, grants } = parseProficiencies(
    proficienciesToParse || {},
    sourceEntity,
    provenance,
  );

  if (isPrimary && classEntity.startingEquipmentJson) {
    const equip = equipmentToRuleChoicesAndGrants(
      classEntity.startingEquipmentJson,
      classEntity.id,
      classEntity.name,
      "class",
    );
    choices.push(...equip.choices);
    grants.push(...equip.grants);
  }

  return { choices, grants };
}

export function subclassToRuleChoicesAndGrants(subclassEntity: any): {
  choices: RuleChoiceGroup[];
  grants: RuleGrant[];
} {
  const choices: RuleChoiceGroup[] = [];
  const grants: RuleGrant[] = [];

  grants.push({
    id: `subclass_${subclassEntity.id}_reference`,
    type: "feature_reference",
    value: {
      name: subclassEntity.name,
      description: subclassEntity.description || "",
      source: "class",
      sourceName: subclassEntity.name,
      level: subclassEntity.levelChosen || 3, // Defaults to 3 if not provided
    },
    mode: "fixed",
    sourceEntity: `subclass_${subclassEntity.id}`,
    provenance: `Subclass: ${subclassEntity.name}`,
  });

  return { choices, grants };
}
