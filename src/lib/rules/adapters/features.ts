import { RuleChoiceGroup, RuleChoiceOptionType } from "../choices";
import { RuleGrant, parseFoundryEffectsToGrants } from "../grants";
import { parseJsonValue, normalizeChoiceName } from "../../../components/builder/BuilderUtils";

const FIGHTING_STYLE_OPTIONS = [
  "Archery",
  "Blind Fighting",
  "Defense",
  "Dueling",
  "Great Weapon Fighting",
  "Interception",
  "Protection",
  "Two-Weapon Fighting",
  "Unarmed Fighting",
];

const WEAPON_MASTERY_OPTIONS = [
  "Battleaxe",
  "Blowgun",
  "Club",
  "Dagger",
  "Dart",
  "Flail",
  "Glaive",
  "Greataxe",
  "Greatclub",
  "Greatsword",
  "Halberd",
  "Hand Crossbow",
  "Handaxe",
  "Heavy Crossbow",
  "Javelin",
  "Lance",
  "Light Crossbow",
  "Light Hammer",
  "Longbow",
  "Longsword",
  "Mace",
  "Maul",
  "Morningstar",
  "Net",
  "Pike",
  "Quarterstaff",
  "Rapier",
  "Scimitar",
  "Shortbow",
  "Shortsword",
  "Sickle",
  "Sling",
  "Spear",
  "Trident",
  "War Pick",
  "Warhammer",
  "Whip",
];

function weaponMasteryCount(classId: string | null, level: number): number {
  if (classId === "fighter") return level >= 9 ? 4 : 3;
  if (["barbarian", "paladin", "ranger", "rogue"].includes(classId || "")) return 2;
  return 0;
}

export function classFeatureToRuleChoicesAndGrants(
  feature: any,
  characterLevel: number,
  existingChoices: Record<string, string[]> = {},
  selectedSkillNames: string[] = [], // Used for Expertise dynamic options
): { choices: RuleChoiceGroup[]; grants: RuleGrant[] } {
  if (!feature) return { choices: [], grants: [] };

  const choices: RuleChoiceGroup[] = [];
  const grants: RuleGrant[] = [];

  const sourceEntity = `feature_${feature.id}`;
  const provenance = `Feature: ${feature.name}`;
  const name = String(feature.name || "");
  const classId = feature.classId ?? feature.class_id;
  const featureId = String(feature.id || "");

  // Synthetic: Expertise
  if (name === "Expertise") {
    choices.push({
      id: `${sourceEntity}_expertise`,
      sourceEntity,
      label: "Choose 2 skills to gain Expertise",
      min: 2,
      max: 2,
      exact: true,
      repeatable: false,
      optionType: "skill",
      options:
        selectedSkillNames.length > 0
          ? selectedSkillNames.map((sk) => ({ id: sk, label: sk }))
          : "all",
      provenance,
    });
  }

  // Synthetic: Fighting Style
  if (/fighting style/i.test(name)) {
    choices.push({
      id: `${sourceEntity}_fighting_style`,
      sourceEntity,
      label: "Choose a Fighting Style",
      min: 1,
      max: 1,
      exact: true,
      repeatable: false,
      optionType: "free text",
      options: FIGHTING_STYLE_OPTIONS.map((fs) => ({ id: fs, label: fs })),
      provenance,
    });
  }

  // Synthetic: Weapon Mastery
  if (name === "Weapon Mastery" && /weapon-mastery/i.test(featureId)) {
    const count = weaponMasteryCount(classId, characterLevel);
    if (count > 0) {
      choices.push({
        id: `${sourceEntity}_weapon_mastery`,
        sourceEntity,
        label: `Choose ${count} Weapon Masteries`,
        min: count,
        max: count,
        exact: true,
        repeatable: false,
        optionType: "weapon mastery",
        options: WEAPON_MASTERY_OPTIONS.map((wm) => ({ id: wm, label: wm })),
        provenance,
      });
    }
  }

  // Structured Options (from optionsJson)
  const optionsJson = parseJsonValue(feature.optionsJson ?? feature.options_json, []);
  if (Array.isArray(optionsJson)) {
    optionsJson.forEach((group: any, i: number) => {
      if (Array.isArray(group.options) && group.options.length > 0) {
        let count = Number(group.count || 1);
        let optionType: RuleChoiceOptionType = "free text";

        // Specific handling for Invocations which scale count by level
        if (/eldritch invocation/i.test(name)) {
          const WARLOCK_INVOCATION_COUNTS = [
            0, 2, 2, 2, 3, 3, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8,
          ];
          count = WARLOCK_INVOCATION_COUNTS[Math.max(0, characterLevel - 1)] || count;
          optionType = "invocation";
        }

        choices.push({
          id: `${sourceEntity}_option_${i}`,
          sourceEntity,
          label: `Choose ${count} ${name}${count > 1 ? "s" : ""}`,
          min: count,
          max: count,
          exact: true,
          repeatable: false,
          optionType,
          options: group.options.map((opt: any) => {
            if (opt && typeof opt === "object") {
              const id = opt.id || normalizeChoiceName(opt.name || opt.label);
              return {
                id,
                label: opt.label || opt.name || id,
                description: opt.description,
                source: opt.source,
                grants: Array.isArray(opt.grants) ? opt.grants : undefined,
              };
            }
            return {
              id: normalizeChoiceName(opt),
              label: normalizeChoiceName(opt),
            };
          }),
          provenance,
        });
      }
    });
  }

  // Active Effects parsing for Senses/Defenses
  const inlineGrants = parseFoundryEffectsToGrants(
    feature.foundryJson ?? feature.foundry_json,
    sourceEntity,
    provenance,
  );
  grants.push(...inlineGrants);

  // Emit feature reference
  grants.push({
    id: `${sourceEntity}_reference`,
    type: "feature_reference",
    value: {
      name: feature.name,
      description: feature.description || "",
      source: "class",
      sourceName: feature.name,
      level: feature.levelRequired || feature.level_required || 1,
    },
    mode: "fixed",
    sourceEntity,
    provenance,
  });

  return { choices, grants };
}
