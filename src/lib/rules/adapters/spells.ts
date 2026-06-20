import { RuleChoiceGroup } from "../choices";
import { RuleGrant } from "../grants";
import {
  getCantripLimit,
  getPreparedSpellLimit,
  getMaxSpellLevel,
  getSpellcastingInfo,
} from "../../../components/builder/BuilderUtils";
import { BuilderState } from "../../../components/builder/BuilderUtils";

export function spellcastingToRuleChoicesAndGrants(
  state: BuilderState,
  classData: any,
  classLevel: number,
): { choices: RuleChoiceGroup[]; grants: RuleGrant[] } {
  if (!classData || !state) return { choices: [], grants: [] };

  const choices: RuleChoiceGroup[] = [];
  const grants: RuleGrant[] = [];

  const spellcastingInfo = getSpellcastingInfo(classData);
  if (!spellcastingInfo || !spellcastingInfo.ability) {
    return { choices, grants };
  }

  const sourceEntity = `class_${classData.id}_spellcasting`;
  const provenance = `${classData.name} Spellcasting`;

  const cantripLimit = getCantripLimit(classLevel, classData);
  const preparedLimit = getPreparedSpellLimit(state.abilities, classData, classLevel);
  const maxSpellLevel = getMaxSpellLevel(classLevel, classData);

  if (cantripLimit > 0) {
    choices.push({
      id: `${sourceEntity}_cantrips`,
      sourceEntity,
      label: `Choose ${cantripLimit} Cantrips`,
      min: cantripLimit,
      max: cantripLimit,
      exact: true,
      repeatable: false,
      optionType: "spell",
      options: "all",
      prerequisites: [
        { type: "class", value: classData.name },
        { type: "level", value: 0 }, // Cantrips are level 0
      ],
      provenance,
    });
  }

  if (preparedLimit > 0) {
    choices.push({
      id: `${sourceEntity}_prepared`,
      sourceEntity,
      label: `Prepare ${preparedLimit} Spells`,
      min: 0, // A character doesn't *have* to prepare all of their spells immediately
      max: preparedLimit,
      exact: false,
      repeatable: false,
      optionType: "spell",
      options: "all",
      prerequisites: [
        { type: "class", value: classData.name },
        { type: "maxLevel", value: maxSpellLevel }, // Indicates max level of spell that can be prepared
      ],
      provenance,
    });
  }

  // The grants will be dynamically resolved from the selected spells later in native-engine
  // But we can grant the spellcasting ability feature
  grants.push({
    type: "feature",
    value: "Spellcasting",
    source: provenance,
    metadata: {
      ability: spellcastingInfo.ability,
    },
  });

  return { choices, grants };
}
