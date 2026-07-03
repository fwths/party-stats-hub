import { CharacterAggregateSchema, type CharacterAggregate, type ExactRuleRef } from "./schema";
import { effectiveAbilityScores } from "./derived-sheet";

export type ClassHitPointRule = {
  classVersionKey: string;
  hitDie: number;
  fixedContribution: number;
};

export type LevelUpHitPointPlan = {
  hitDie: number;
  fixedContribution: number;
  constitutionModifier: number;
  bonuses: Array<{ sourceRef: ExactRuleRef; label: string; amount: number }>;
  fixedTotal: number;
};

function perLevelHitPointBonuses(character: CharacterAggregate) {
  return character.build.decisions.flatMap((decision) => {
    if (decision.type !== "rule-selection" || decision.selectionKind !== "feat") return [];
    return decision.selections
      .filter((selection) => selection.name.trim().toLowerCase() === "tough")
      .map((selection) => ({ sourceRef: selection, label: "Tough", amount: 2 }));
  });
}

export function deriveLevelUpHitPointPlan(
  rawCharacter: unknown,
  rule: ClassHitPointRule,
): LevelUpHitPointPlan {
  const character = CharacterAggregateSchema.parse(rawCharacter);
  if (!character.build.levels.some((level) => level.classRef.versionKey === rule.classVersionKey)) {
    throw new Error("Hit Point rule class is not part of this character build");
  }
  if (!Number.isInteger(rule.hitDie) || rule.hitDie < 4 || rule.hitDie > 20) {
    throw new Error("Class Hit Die is invalid");
  }
  if (
    !Number.isInteger(rule.fixedContribution) ||
    rule.fixedContribution < 1 ||
    rule.fixedContribution > rule.hitDie
  ) {
    throw new Error("Class fixed Hit Point contribution is invalid");
  }
  const constitutionModifier = Math.floor((effectiveAbilityScores(character).CON - 10) / 2);
  const bonuses = perLevelHitPointBonuses(character);
  return {
    hitDie: rule.hitDie,
    fixedContribution: rule.fixedContribution,
    constitutionModifier,
    bonuses,
    fixedTotal: Math.max(
      1,
      rule.fixedContribution +
        constitutionModifier +
        bonuses.reduce((sum, bonus) => sum + bonus.amount, 0),
    ),
  };
}

export function compileLevelUpHitPoints(input: {
  plan: LevelUpHitPointPlan;
  selection: { method: "fixed" } | { method: "rolled"; roll: number };
}) {
  const hitDieContribution =
    input.selection.method === "fixed" ? input.plan.fixedContribution : input.selection.roll;
  if (
    !Number.isInteger(hitDieContribution) ||
    hitDieContribution < 1 ||
    hitDieContribution > input.plan.hitDie
  ) {
    throw new Error(`Physical Hit Die roll must be between 1 and ${input.plan.hitDie}`);
  }
  return {
    method: input.selection.method,
    hitDieContribution,
    constitutionModifier: input.plan.constitutionModifier,
    bonuses: input.plan.bonuses,
  };
}
