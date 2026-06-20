import { RuleChoiceGroup } from "../choices";
import { RuleGrant } from "../grants";
import { parseJsonValue, normalizeChoiceName } from "../../../components/builder/BuilderUtils";
import { equipmentToRuleChoicesAndGrants } from "./items";

export function backgroundToRuleChoicesAndGrants(backgroundEntity: any): { choices: RuleChoiceGroup[]; grants: RuleGrant[] } {
  if (!backgroundEntity) return { choices: [], grants: [] };

  const choices: RuleChoiceGroup[] = [];
  const grants: RuleGrant[] = [];

  const sourceEntity = `background_${backgroundEntity.id}`;
  const provenance = `Background: ${backgroundEntity.name}`;

  // Origin Feat
  if (backgroundEntity.originFeatId) {
    grants.push({
      id: `${sourceEntity}_origin_feat`,
      type: "feature_reference",
      value: backgroundEntity.originFeatId,
      mode: "fixed",
      sourceEntity,
      provenance,
    });
  }

  // Skill Proficiencies
  const skillProficienciesJson = parseJsonValue(backgroundEntity.skillProficienciesJson, []);
  if (Array.isArray(skillProficienciesJson)) {
    skillProficienciesJson.forEach((prof: any, i: number) => {
      if (prof.choose?.from) {
        const count = Number(prof.choose.count || 1);
        choices.push({
          id: `${sourceEntity}_skill_choose_${i}`,
          sourceEntity,
          label: `Choose ${count} skill${count > 1 ? "s" : ""}`,
          min: count,
          max: count,
          exact: true,
          repeatable: false,
          optionType: "skill",
          options: prof.choose.from.map((sk: string) => ({
             id: normalizeChoiceName(sk),
             label: normalizeChoiceName(sk)
          })),
          provenance,
        });
      } else {
        Object.entries(prof).forEach(([key, val]) => {
          if (val === true) {
            grants.push({
              id: `${sourceEntity}_skill_${key}`,
              type: "skill_proficiency",
              value: normalizeChoiceName(key),
              mode: "fixed",
              sourceEntity,
              provenance,
            });
          }
        });
      }
    });
  }

  // Tool Proficiencies
  const toolProficienciesJson = parseJsonValue(backgroundEntity.toolProficienciesJson, []);
  if (Array.isArray(toolProficienciesJson)) {
    toolProficienciesJson.forEach((prof: any, i: number) => {
      if (prof.anyStandard || prof.any) {
         const count = Number(prof.anyStandard || prof.any);
         choices.push({
           id: `${sourceEntity}_tool_any_${i}`,
           sourceEntity,
           label: `Choose ${count} tool${count > 1 ? "s" : ""}`,
           min: count,
           max: count,
           exact: true,
           repeatable: false,
           optionType: "tool",
           options: "all",
           provenance,
         });
      } else if (prof.choose?.from) {
        const count = Number(prof.choose.count || 1);
        choices.push({
          id: `${sourceEntity}_tool_choose_${i}`,
          sourceEntity,
          label: `Choose ${count} tool${count > 1 ? "s" : ""}`,
          min: count,
          max: count,
          exact: true,
          repeatable: false,
          optionType: "tool",
          options: prof.choose.from.map((t: string) => ({
             id: normalizeChoiceName(t),
             label: normalizeChoiceName(t)
          })),
          provenance,
        });
      } else {
         Object.entries(prof).forEach(([key, val]) => {
           if (val === true && !["any", "choose", "other", "anystandard"].includes(key.toLowerCase())) {
             grants.push({
               id: `${sourceEntity}_tool_${key}`,
               type: "tool_proficiency",
               value: normalizeChoiceName(key),
               mode: "fixed",
               sourceEntity,
               provenance,
             });
           }
         });
      }
    });
  }

  // Language Proficiencies
  const languageProficienciesJson = parseJsonValue(backgroundEntity.languageProficienciesJson, []);
  if (Array.isArray(languageProficienciesJson)) {
    languageProficienciesJson.forEach((lang: any, i: number) => {
      if (lang.anyStandard || lang.any) {
        const count = Number(lang.anyStandard || lang.any);
        choices.push({
          id: `${sourceEntity}_language_any_${i}`,
          sourceEntity,
          label: `Choose ${count} language${count === 1 ? "" : "s"}`,
          min: count,
          max: count,
          exact: true,
          repeatable: false,
          optionType: "language",
          options: "all",
          provenance,
        });
      } else if (lang.choose?.from) {
        const count = Number(lang.choose.count || 1);
        choices.push({
          id: `${sourceEntity}_language_choose_${i}`,
          sourceEntity,
          label: `Choose ${count} language${count === 1 ? "" : "s"}`,
          min: count,
          max: count,
          exact: true,
          repeatable: false,
          optionType: "language",
          options: lang.choose.from.map((l: string) => ({
            id: normalizeChoiceName(l),
            label: normalizeChoiceName(l)
          })),
          provenance,
        });
      } else {
         Object.entries(lang).forEach(([key, val]) => {
           if (val === true && !["any", "anystandard", "other", "choose"].includes(key.toLowerCase())) {
             grants.push({
               id: `${sourceEntity}_language_${key}`,
               type: "language",
               value: normalizeChoiceName(key),
               mode: "fixed",
               sourceEntity,
               provenance,
             });
           }
         });
      }
    });
  }

  if (backgroundEntity.startingEquipmentJson) {
    const equip = equipmentToRuleChoicesAndGrants(
      backgroundEntity.startingEquipmentJson,
      backgroundEntity.id,
      backgroundEntity.name,
      "background"
    );
    choices.push(...equip.choices);
    grants.push(...equip.grants);
  }

  return { choices, grants };
}
