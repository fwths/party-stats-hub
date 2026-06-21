import { RuleGrant } from "./grants";

export type RuleChoiceOptionType =
  | "ability"
  | "skill"
  | "tool"
  | "language"
  | "weapon"
  | "armor"
  | "spell"
  | "feat"
  | "class"
  | "subclass"
  | "invocation"
  | "maneuver"
  | "weapon mastery"
  | "resistance"
  | "sense"
  | "action"
  | "resource"
  | "item"
  | "feature"
  | "free text";

export interface RuleChoicePrerequisite {
  type:
    | "level"
    | "maxLevel"
    | "ability"
    | "species"
    | "class"
    | "spellcasting"
    | "proficiency"
    | "feat"
    | "source";
  value: any;
  description?: string;
}

export interface RuleChoiceOption {
  id: string;
  label: string;
  description?: string;
  source?: string; // The canonical source book for this specific option
  grants?: any[]; // Will be typed as RuleGrant[]
  prerequisites?: RuleChoicePrerequisite[];
}

export interface RuleChoiceGroup {
  id: string;
  sourceEntity: string;
  label: string;
  description?: string;
  min: number;
  max: number;
  exact: boolean;
  repeatable: boolean;
  optionType: RuleChoiceOptionType;
  options: RuleChoiceOption[] | "all"; // "all" implies looking up via ForgeData
  prerequisites?: RuleChoicePrerequisite[];
  defaultSelection?: string[];
  scalesByLevel?: boolean;
  provenance: string;
}

export interface RuleChoiceState {
  groupId: string;
  selectedOptionIds: string[];
}

export interface RuleChoiceValidationResult {
  isValid: boolean;
  issues: string[];
}

export function validateRuleChoiceGroup(
  group: RuleChoiceGroup,
  selectedIds: string[],
): RuleChoiceValidationResult {
  const issues: string[] = [];

  if (selectedIds.length < group.min) {
    issues.push(`Please select at least ${group.min} option(s) for ${group.label}.`);
  }

  if (group.exact && selectedIds.length !== group.min) {
    issues.push(`Please select exactly ${group.min} option(s) for ${group.label}.`);
  }

  if (selectedIds.length > group.max) {
    issues.push(`Please select no more than ${group.max} option(s) for ${group.label}.`);
  }

  if (!group.repeatable) {
    const unique = new Set(selectedIds);
    if (unique.size !== selectedIds.length) {
      issues.push(`Duplicate selections are not allowed for ${group.label}.`);
    }
  }

  // Validate against provided explicit options if not "all"
  if (group.options !== "all") {
    const validOptionIds = new Set(group.options.map((opt) => opt.id));
    for (const id of selectedIds) {
      if (!validOptionIds.has(id)) {
        issues.push(`Invalid selection: ${id} for ${group.label}.`);
      }
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

export function resolveRuleChoicesToGrants(
  choices: Record<string, string[]>,
  groups: RuleChoiceGroup[],
): RuleGrant[] {
  const grants: RuleGrant[] = [];

  for (const group of groups) {
    const selectedIds = choices[group.id] || [];
    for (const id of selectedIds) {
      // Find the specific option if it was explicitly listed
      const optionDef = group.options !== "all" ? group.options.find((opt) => opt.id === id) : null;

      // If the option explicitly provides nested grants, include them
      if (optionDef?.grants && Array.isArray(optionDef.grants)) {
        grants.push(...optionDef.grants);
      }

      // Also map the standard option type into a basic grant
      if (group.optionType === "skill") {
        grants.push({
          id: `${group.id}_grant_${id}`,
          type: group.id.endsWith("_expertise") ? "expertise" : "skill_proficiency",
          value: id,
          mode: "choose",
          sourceEntity: group.sourceEntity,
          provenance: group.provenance,
        });
      } else if (group.optionType === "tool") {
        grants.push({
          id: `${group.id}_grant_${id}`,
          type: group.id.endsWith("_expertise") ? "expertise" : "tool_proficiency",
          value: id,
          mode: "choose",
          sourceEntity: group.sourceEntity,
          provenance: group.provenance,
        });
      } else if (group.optionType === "language") {
        grants.push({
          id: `${group.id}_grant_${id}`,
          type: "language",
          value: id,
          mode: "choose",
          sourceEntity: group.sourceEntity,
          provenance: group.provenance,
        });
      } else if (group.optionType === "spell") {
        grants.push({
          id: `${group.id}_grant_${id}`,
          type: "spell",
          value: id,
          mode: "choose",
          sourceEntity: group.sourceEntity,
          provenance: group.provenance,
        });
      } else if (group.optionType === "ability") {
        grants.push({
          id: `${group.id}_grant_${id}`,
          type: "ability_bonus",
          value: id,
          mode: "choose",
          sourceEntity: group.sourceEntity,
          provenance: group.provenance,
        });
      }
    }
  }

  return grants;
}
