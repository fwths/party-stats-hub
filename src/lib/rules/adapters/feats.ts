import { RuleChoiceGroup } from "../choices";
import { RuleGrant, parseFoundryEffectsToGrants } from "../grants";
import { normalizeChoiceName, parseJsonValue } from "../../../components/builder/BuilderUtils";

const ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
const CASTING_ABILITIES = ["INT", "WIS", "CHA"];
const MAGIC_INITIATE_LISTS = ["Cleric", "Druid", "Wizard"];

export function featToRuleChoicesAndGrants(
  feat: any,
  characterLevel: number,
  selectedSkillNames: string[] = [],
): { choices: RuleChoiceGroup[]; grants: RuleGrant[] } {
  if (!feat) return { choices: [], grants: [] };

  const choices: RuleChoiceGroup[] = [];
  const grants: RuleGrant[] = [];

  const sourceEntity = `feat_${feat.id}`;
  const provenance = `Feat: ${feat.name}`;
  const name = String(feat.name || "");

  if (/ability score improvement/i.test(name)) {
    choices.push({
      id: `${sourceEntity}_asi`,
      sourceEntity,
      label: "Choose +2 to one Ability or +1 to two Abilities",
      min: 2,
      max: 2,
      exact: true,
      repeatable: true,
      optionType: "ability",
      options: ABILITIES.map(ab => ({ id: ab, label: ab })),
      provenance,
    });
  } else if (/skill expert/i.test(name)) {
    choices.push({
      id: `${sourceEntity}_ability`,
      sourceEntity,
      label: "Increase one Ability Score by 1",
      min: 1,
      max: 1,
      exact: true,
      repeatable: false,
      optionType: "ability",
      options: ABILITIES.map(ab => ({ id: ab, label: ab })),
      provenance,
    });
    choices.push({
      id: `${sourceEntity}_skill`,
      sourceEntity,
      label: "Choose 1 Skill Proficiency",
      min: 1,
      max: 1,
      exact: true,
      repeatable: false,
      optionType: "skill",
      options: "all",
      provenance,
    });
    choices.push({
      id: `${sourceEntity}_expertise`,
      sourceEntity,
      label: "Choose 1 Skill Expertise",
      min: 1,
      max: 1,
      exact: true,
      repeatable: false,
      optionType: "skill",
      options: selectedSkillNames.length > 0
        ? selectedSkillNames.map(sk => ({ id: sk, label: sk }))
        : "all",
      provenance,
    });
  } else if (/resilient/i.test(name)) {
    choices.push({
      id: `${sourceEntity}_ability_and_save`,
      sourceEntity,
      label: "Choose 1 Ability Score (+1 and Saving Throw)",
      min: 1,
      max: 1,
      exact: true,
      repeatable: false,
      optionType: "ability",
      options: ABILITIES.map(ab => ({ id: ab, label: ab })),
      provenance,
    });
  } else if (/skilled/i.test(name) && !/expert/i.test(name)) {
    // We can use choice group picker for Skilled. It's 3 skills or tools. 
    // Wait, the UI has two separate choice group pickers for Skilled (one for skills, one for tools). 
    // The optionType must be explicit. For simplicity in ruleChoices, let's just make it 'skill' and we'll handle it magically or break it down.
    // Actually, `RuleChoiceGroupPicker` supports 'free text' with predefined options or 'all' for skills.
    // We'll create two groups that share a pool of 3? That's tricky.
    // Let's use `free text` and provide all skill and tool options dynamically in the UI later, or just return optionType "skill" and map options manually.
    choices.push({
      id: `${sourceEntity}_skills`,
      sourceEntity,
      label: "Choose up to 3 Skills",
      min: 0,
      max: 3,
      exact: false,
      repeatable: false,
      optionType: "skill",
      options: "all",
      provenance,
    });
    choices.push({
      id: `${sourceEntity}_tools`,
      sourceEntity,
      label: "Choose up to 3 Tools",
      min: 0,
      max: 3,
      exact: false,
      repeatable: false,
      optionType: "tool",
      options: "all",
      provenance,
    });
  } else if (/crafter/i.test(name)) {
    choices.push({
      id: `${sourceEntity}_tools`,
      sourceEntity,
      label: "Choose 3 Artisan's Tools",
      min: 3,
      max: 3,
      exact: true,
      repeatable: false,
      optionType: "tool",
      options: "all", // Ideally filtered to artisan tools in the UI
      provenance,
    });
  } else if (/magic initiate/i.test(name)) {
    choices.push({
      id: `${sourceEntity}_spell_list`,
      sourceEntity,
      label: "Choose Spell List",
      min: 1,
      max: 1,
      exact: true,
      repeatable: false,
      optionType: "free text",
      options: MAGIC_INITIATE_LISTS.map(l => ({ id: l, label: l })),
      provenance,
    });
    choices.push({
      id: `${sourceEntity}_spellcasting_ability`,
      sourceEntity,
      label: "Choose Spellcasting Ability",
      min: 1,
      max: 1,
      exact: true,
      repeatable: false,
      optionType: "ability",
      options: CASTING_ABILITIES.map(ab => ({ id: ab, label: ab })),
      provenance,
    });
    choices.push({
      id: `${sourceEntity}_cantrips`,
      sourceEntity,
      label: "Choose 2 Cantrips",
      min: 2,
      max: 2,
      exact: true,
      repeatable: false,
      optionType: "spell",
      options: "all", 
      provenance,
    });
    choices.push({
      id: `${sourceEntity}_spells`,
      sourceEntity,
      label: "Choose 1 Level 1 Spell",
      min: 1,
      max: 1,
      exact: true,
      repeatable: false,
      optionType: "spell",
      options: "all",
      provenance,
    });
  } else if (/aberrant dragonmark/i.test(name)) {
    choices.push({
      id: `${sourceEntity}_cantrips`,
      sourceEntity,
      label: "Choose 1 Sorcerer Cantrip",
      min: 1,
      max: 1,
      exact: true,
      repeatable: false,
      optionType: "spell",
      options: "all",
      provenance,
    });
    choices.push({
      id: `${sourceEntity}_spells`,
      sourceEntity,
      label: "Choose 1 Level 1 Sorcerer Spell",
      min: 1,
      max: 1,
      exact: true,
      repeatable: false,
      optionType: "spell",
      options: "all",
      provenance,
    });
    grants.push({
      id: `${sourceEntity}_ability_con`,
      type: "ability_score",
      value: "CON:1",
      mode: "add",
      sourceEntity,
      provenance
    });
  }

  // Parse rawJson for fixed ability score improvements (e.g. from half-feats where stat is hardcoded)
  const rawData = parseJsonValue(feat.rawJson, {});
  if (rawData.ability) {
    const abArr = Array.isArray(rawData.ability) ? rawData.ability : [rawData.ability];
    abArr.forEach((ab: any, i: number) => {
      if (!ab.choose) {
        Object.entries(ab).forEach(([key, val]) => {
          if (ABILITIES.includes(String(key).toUpperCase())) {
            grants.push({
              id: `${sourceEntity}_ability_${key}_${i}`,
              type: "ability_score",
              value: `${String(key).toUpperCase()}:${val}`,
              mode: "add",
              sourceEntity,
              provenance
            });
          }
        });
      }
    });
  }

  // Active Effects
  const inlineGrants = parseFoundryEffectsToGrants(
    feat.foundryJson ?? feat.foundry_json,
    sourceEntity,
    provenance
  );
  grants.push(...inlineGrants);

  // Emit feature reference
  grants.push({
    id: `${sourceEntity}_reference`,
    type: "feature_reference",
    value: {
      name: feat.name,
      description: feat.description || "",
      source: "feat",
      sourceName: feat.name,
      level: 1,
    },
    mode: "fixed",
    sourceEntity,
    provenance,
  });

  return { choices, grants };
}
