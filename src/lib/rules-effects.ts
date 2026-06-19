import { ActionInfo, DefenseInfo, SenseInfo } from "./dndbeyond.types";

export type RuleEffectContext = {
  finalScores: Record<string, number>;
  proficiencyBonus: number;
  source?: string;
};

export type NormalizedRuleEffects = {
  defenses: DefenseInfo[];
  senses: SenseInfo[];
  actions: ActionInfo[];
};

export type RuleEffectComparison = {
  onlyLeft: string[];
  onlyRight: string[];
  shared: string[];
};

function parseJsonValue(value: unknown, fallback: any) {
  if (value == null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeName(value: unknown): string {
  return String(value ?? "")
    .replace(
      /\{@(?:spell|item|condition|skill|sense|action|dc|damage|filter|book|note|b|i|scaledice|dice)\s+([^}|]+)(?:\|[^}]*)?\}/g,
      "$1",
    )
    .replace(/\{@[^}]+\}/g, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function modifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function parseEffectChanges(effect: any) {
  return parseJsonValue(effect?.changesJson ?? effect?.changes_json, {});
}

function effectUseMax(
  maximum: unknown,
  finalScores: Record<string, number>,
  proficiencyBonus: number,
) {
  if (maximum === "proficiency_bonus") return proficiencyBonus;
  if (typeof maximum === "number") return maximum;
  if (typeof maximum === "string" && maximum.endsWith("_modifier")) {
    const ability = maximum.slice(0, 3).toUpperCase();
    return Math.max(1, modifier(finalScores[ability] || 10));
  }
  return 1;
}

export function normalizeActiveEffects(
  effects: any[],
  context: RuleEffectContext,
): NormalizedRuleEffects {
  const defenses: DefenseInfo[] = [];
  const senses: SenseInfo[] = [];
  const actions: ActionInfo[] = [];

  for (const effect of effects || []) {
    const changes = parseEffectChanges(effect);
    const resistances = parseJsonValue(effect.grantsResistances ?? effect.grants_resistances, []);
    const immunities = parseJsonValue(effect.grantsImmunities ?? effect.grants_immunities, []);

    if (Array.isArray(resistances)) {
      defenses.push(
        ...resistances.map((damageType) => ({ type: "resistance" as const, damageType })),
      );
    }
    if (Array.isArray(immunities)) {
      defenses.push(...immunities.map((damageType) => ({ type: "immunity" as const, damageType })));
    }

    if (Array.isArray(changes.senses)) {
      senses.push(
        ...changes.senses.map((sense: any) => ({
          name: normalizeName(sense.type || sense.name),
          value: typeof sense.value === "number" ? sense.value : null,
        })),
      );
    }

    if (changes.activation || changes.uses) {
      const maxUses = changes.uses
        ? effectUseMax(changes.uses.maximum, context.finalScores, context.proficiencyBonus)
        : 0;
      actions.push({
        name: effect.name,
        source: context.source || "class",
        description: "",
        activation: changes.activation
          ? {
              activationTime: 1,
              activationType:
                changes.activation === "bonus_action"
                  ? 3
                  : changes.activation === "reaction"
                    ? 4
                    : 1,
            }
          : undefined,
        uses: changes.uses
          ? {
              current: maxUses,
              max: maxUses,
              reset: "Long Rest",
            }
          : undefined,
      });
    }
  }

  return { defenses, senses, actions };
}

export function ruleEffectKeys(effects: NormalizedRuleEffects): string[] {
  return [
    ...effects.defenses.map(
      (defense) => `defense:${defense.type}:${String(defense.damageType).toLowerCase()}`,
    ),
    ...effects.senses.map(
      (sense) => `sense:${String(sense.name).toLowerCase()}:${sense.value ?? "any"}`,
    ),
    ...effects.actions.map(
      (action) => `action:${String(action.source).toLowerCase()}:${action.name}`,
    ),
  ].sort();
}

export function compareRuleEffects(
  left: NormalizedRuleEffects,
  right: NormalizedRuleEffects,
): RuleEffectComparison {
  const leftKeys = new Set(ruleEffectKeys(left));
  const rightKeys = new Set(ruleEffectKeys(right));
  return {
    onlyLeft: [...leftKeys].filter((key) => !rightKeys.has(key)).sort(),
    onlyRight: [...rightKeys].filter((key) => !leftKeys.has(key)).sort(),
    shared: [...leftKeys].filter((key) => rightKeys.has(key)).sort(),
  };
}
