import { RuleChoiceGroup } from "../choices";
import { RuleGrant } from "../grants";

// Temporarily isolate legacy hardcoded string matching and special rules here.
// In Sprint D/E, this file will shrink as we move completely to pure rule objects.

export function legacyClassSpecialToRuleChoicesAndGrants(
  classEntity: any,
  level: number,
): { choices: RuleChoiceGroup[]; grants: RuleGrant[] } {
  // Placeholder: Extract expertise choices (e.g. Rogue/Bard expertise)
  // or fighting styles by parsing classFeatures string text.
  const choices: RuleChoiceGroup[] = [];
  const grants: RuleGrant[] = [];

  return { choices, grants };
}
