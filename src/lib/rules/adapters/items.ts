import { RuleChoiceGroup } from "../choices";
import { RuleGrant } from "../grants";
import { parseJsonValue, formatEquipmentPackage } from "../../../components/builder/BuilderUtils";

export function equipmentToRuleChoicesAndGrants(
  rawJson: unknown,
  sourceId: string,
  sourceName: string,
  sourceType: "class" | "background",
): { choices: RuleChoiceGroup[]; grants: RuleGrant[] } {
  const choices: RuleChoiceGroup[] = [];
  const grants: RuleGrant[] = [];

  const parsed = parseJsonValue(rawJson as any, {});
  // JSON structure usually is [{ "a": [...], "b": [...], "default": [...] }]
  const packages = Array.isArray(parsed) ? parsed[0] : parsed?.defaultData?.[0];

  if (!packages || typeof packages !== "object" || Object.keys(packages).length === 0) {
    return { choices, grants };
  }

  const sourceEntity = `${sourceType}_${sourceId}_equipment`;
  const provenance = `${sourceName} Starting Equipment`;

  // If there is only one option (e.g. "default"), just grant it directly
  const packageKeys = Object.keys(packages).filter((k) => k !== "_"); // ignore meta keys if any

  if (packageKeys.length === 1) {
    grants.push({
      id: `${sourceEntity}_grant_${packageKeys[0]}`,
      type: "item_grant",
      value: packages[packageKeys[0]],
      mode: "fixed",
      sourceEntity,
      provenance,
    });
  } else {
    // Create a choice group
    choices.push({
      id: sourceEntity,
      sourceEntity,
      label: `${sourceName} Equipment`,
      min: 1,
      max: 1,
      exact: true,
      repeatable: false,
      optionType: "item",
      options: packageKeys.map((key) => {
        const items = packages[key] as any[];
        return {
          id: key,
          label: `Option ${key.toUpperCase()}`,
          description: formatEquipmentPackage(items),
          grants: [
            {
              id: `${sourceEntity}_grant_${key}`,
              type: "item_grant",
              value: items,
              mode: "fixed",
              sourceEntity,
              provenance,
            },
          ],
        };
      }),
      provenance,
    });
  }

  return { choices, grants };
}
