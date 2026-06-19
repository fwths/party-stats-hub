import { AbilityScore } from "./dndbeyond.types";
import { computeActions } from "./parser/actions";
import { computeDefenses } from "./parser/defenses";
import { computeSenses } from "./parser/senses";
import { NormalizedRuleEffects } from "./rules-effects";

export type DdbRuleEffectInput = {
  data: any;
  modifiers: any[];
  abilities: AbilityScore[];
  proficiencyBonus: number;
};

export function normalizeDdbRuleEffects({
  data,
  modifiers,
  abilities,
  proficiencyBonus,
}: DdbRuleEffectInput): NormalizedRuleEffects {
  return {
    defenses: computeDefenses(modifiers),
    senses: computeSenses(modifiers, data?.customSenses ?? []),
    actions: computeActions(data, abilities, proficiencyBonus),
  };
}
