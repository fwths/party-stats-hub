import { RuleChoiceGroup } from "../choices";
import { RuleGrant, parseFoundryEffectsToGrants } from "../grants";
import { parseJsonValue } from "../../../components/builder/BuilderUtils";

const ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

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
  const rawData = parseJsonValue(feat.rawJson, {});

  // Parse abilities
  if (rawData.ability) {
    const abArr = Array.isArray(rawData.ability) ? rawData.ability : [rawData.ability];
    abArr.forEach((ab: any, i: number) => {
      if (ab.choose) {
        const from = ab.choose.from || [];
        const amount = ab.choose.amount || ab.choose.count || 1;
        const opts = from.map((f: string) => {
          const abName = String(f).toUpperCase();
          return { id: abName, label: abName };
        });
        choices.push({
          id: `${sourceEntity}_ability_${i}`,
          sourceEntity,
          label: `Increase ${amount} Ability Score(s)`,
          min: amount,
          max: amount,
          exact: true,
          repeatable: ab.choose.amount === 2 ? true : false,
          optionType: "ability",
          options: opts.length > 0 ? opts : ABILITIES.map((ab) => ({ id: ab, label: ab })),
          provenance,
        });
      } else {
        Object.entries(ab).forEach(([key, val]) => {
          if (ABILITIES.includes(String(key).toUpperCase())) {
            grants.push({
              id: `${sourceEntity}_ability_${key}_${i}`,
              type: "ability_score",
              value: `${String(key).toUpperCase()}:${val}`,
              mode: "add",
              sourceEntity,
              provenance,
            });
          }
        });
      }
    });
  }

  // Parse skill proficiencies
  if (rawData.skillProficiencies) {
    const spArr = Array.isArray(rawData.skillProficiencies)
      ? rawData.skillProficiencies
      : [rawData.skillProficiencies];
    spArr.forEach((sp: any, i: number) => {
      if (sp.any) {
        choices.push({
          id: `${sourceEntity}_skill_${i}`,
          sourceEntity,
          label: `Choose ${sp.any} Skill Proficiency`,
          min: sp.any,
          max: sp.any,
          exact: true,
          repeatable: false,
          optionType: "skill",
          options: "all",
          provenance,
        });
      } else if (sp.choose && sp.choose.from) {
        choices.push({
          id: `${sourceEntity}_skill_${i}`,
          sourceEntity,
          label: `Choose ${sp.choose.count || 1} Skill Proficiency`,
          min: sp.choose.count || 1,
          max: sp.choose.count || 1,
          exact: true,
          repeatable: false,
          optionType: "skill",
          options: sp.choose.from.map((sk: string) => ({ id: sk, label: sk })),
          provenance,
        });
      } else {
        Object.keys(sp)
          .filter((k) => sp[k] === true)
          .forEach((sk) => {
            grants.push({
              id: `${sourceEntity}_skill_grant_${sk}`,
              type: "proficiency",
              value: sk,
              mode: "add",
              sourceEntity,
              provenance,
            });
          });
      }
    });
  }

  // Parse expertise
  if (rawData.expertise) {
    const expArr = Array.isArray(rawData.expertise) ? rawData.expertise : [rawData.expertise];
    expArr.forEach((ex: any, i: number) => {
      if (ex.anyProficientSkill) {
        choices.push({
          id: `${sourceEntity}_expertise_${i}`,
          sourceEntity,
          label: `Choose ${ex.anyProficientSkill} Skill Expertise`,
          min: ex.anyProficientSkill,
          max: ex.anyProficientSkill,
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
    });
  }

  // Parse tool proficiencies
  if (rawData.toolProficiencies) {
    const tpArr = Array.isArray(rawData.toolProficiencies)
      ? rawData.toolProficiencies
      : [rawData.toolProficiencies];
    tpArr.forEach((tp: any, i: number) => {
      if (tp.any) {
        choices.push({
          id: `${sourceEntity}_tools_${i}`,
          sourceEntity,
          label: `Choose ${tp.any} Tool Proficiency`,
          min: tp.any,
          max: tp.any,
          exact: true,
          repeatable: false,
          optionType: "tool",
          options: "all",
          provenance,
        });
      } else if (tp.anyArtisanTool) {
        choices.push({
          id: `${sourceEntity}_artisan_tools_${i}`,
          sourceEntity,
          label: `Choose ${tp.anyArtisanTool} Artisan's Tool`,
          min: tp.anyArtisanTool,
          max: tp.anyArtisanTool,
          exact: true,
          repeatable: false,
          optionType: "tool",
          options: "all",
          provenance,
        });
      }
    });
  }

  // Parse saving throw proficiencies
  if (rawData.savingThrowProficiencies) {
    const stArr = Array.isArray(rawData.savingThrowProficiencies)
      ? rawData.savingThrowProficiencies
      : [rawData.savingThrowProficiencies];
    stArr.forEach((st: any, i: number) => {
      if (st.choose && st.choose.from) {
        choices.push({
          id: `${sourceEntity}_save_${i}`,
          sourceEntity,
          label: `Choose ${st.choose.count || 1} Saving Throw`,
          min: st.choose.count || 1,
          max: st.choose.count || 1,
          exact: true,
          repeatable: false,
          optionType: "ability",
          options: st.choose.from.map((ab: string) => ({
            id: String(ab).toUpperCase(),
            label: String(ab).toUpperCase(),
          })),
          provenance,
        });
      }
    });
  }

  // Parse additional spells (Magic Initiate, Aberrant Dragonmark, etc)
  if (rawData.additionalSpells) {
    const asArr = Array.isArray(rawData.additionalSpells)
      ? rawData.additionalSpells
      : [rawData.additionalSpells];
    asArr.forEach((asObj: any, i: number) => {
      if (asObj.ability && asObj.ability.choose) {
        if (!choices.find((c) => c.id === `${sourceEntity}_spellcasting_ability`)) {
          choices.push({
            id: `${sourceEntity}_spellcasting_ability`,
            sourceEntity,
            label: "Choose Spellcasting Ability",
            min: 1,
            max: 1,
            exact: true,
            repeatable: false,
            optionType: "ability",
            options: asObj.ability.choose.map((ab: string) => ({
              id: String(ab).toUpperCase(),
              label: String(ab).toUpperCase(),
            })),
            provenance,
          });
        }
      }

      if (asObj.known && asObj.known._) {
        asObj.known._.forEach((k: any, j: number) => {
          if (k.choose) {
            choices.push({
              id: `${sourceEntity}_known_spells_${i}_${j}`,
              sourceEntity,
              label: `Choose ${k.choose.count || 1} Spells`,
              min: k.choose.count || 1,
              max: k.choose.count || 1,
              exact: true,
              repeatable: false,
              optionType: "spell",
              options: "all",
              provenance,
            });
          }
        });
      }

      if (asObj.innate && asObj.innate._) {
        Object.values(asObj.innate._).forEach((group: any) => {
          Object.values(group).forEach((slots: any) => {
            if (Array.isArray(slots)) {
              slots.forEach((s: any, j: number) => {
                if (s.choose) {
                  choices.push({
                    id: `${sourceEntity}_innate_spells_${i}_${j}`,
                    sourceEntity,
                    label: `Choose ${s.choose.count || 1} Innate Spell`,
                    min: s.choose.count || 1,
                    max: s.choose.count || 1,
                    exact: true,
                    repeatable: false,
                    optionType: "spell",
                    options: "all",
                    provenance,
                  });
                }
              });
            }
          });
        });
      }
    });

    if (asArr.length > 1 && asArr.every((as: any) => as.name)) {
      choices.push({
        id: `${sourceEntity}_spell_list`,
        sourceEntity,
        label: "Choose Spell List",
        min: 1,
        max: 1,
        exact: true,
        repeatable: false,
        optionType: "free text",
        options: asArr.map((a: any) => ({ id: a.name, label: a.name })),
        provenance,
      });
    }
  }

  // Active Effects
  const inlineGrants = parseFoundryEffectsToGrants(
    feat.foundryJson ?? feat.foundry_json,
    sourceEntity,
    provenance,
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
