import { AbilityScore, ActionInfo } from "../dndbeyond.types";

export function computeActions(data: any, abilities: AbilityScore[], pb: number): ActionInfo[] {
  const sources: Array<[string, any[]]> = [
    ["class", data?.actions?.class ?? []],
    ["race", data?.actions?.race ?? []],
    ["feat", data?.actions?.feat ?? []],
    ["item", data?.actions?.item ?? []],
  ];

  const actionsMap = new Map<string, { info: ActionInfo; id: number; componentId: number }>();

  for (const [source, list] of sources) {
    for (const a of list) {
      const name = a?.name;
      if (!name) continue;
      const key = `${source}:${name}`;

      const aId = Number(a?.id ?? 0);
      const aCompId = Number(a?.componentId ?? 0);

      const existing = actionsMap.get(key);
      const isNewer = !existing || aCompId > existing.componentId || aId > existing.id;

      if (!existing || isNewer) {
        const info: ActionInfo = {
          name,
          source,
          description: a?.snippet || a?.description || "",
          activation: a?.activation
            ? {
                activationType: a.activation.activationType,
                activationTime: a.activation.activationTime,
              }
            : undefined,
        };
        const lu = a?.limitedUse;
        if (lu && typeof lu.maxUses === "number") {
          let max = lu.maxUses;
          const statId = lu.statModifierUsesId;
          if (typeof statId === "number" && statId >= 1 && statId <= 6) {
            const statMod = Math.max(1, abilities[statId - 1].modifier);
            max = lu.operator === 2 ? lu.maxUses * statMod : lu.maxUses + statMod;
          }
          if (lu.useProficiencyBonus) {
            max = lu.proficiencyBonusOperator === 2 ? max * pb : max + pb;
          }

          if (max > 0) {
            const reset =
              lu.resetType === 1
                ? "short rest"
                : lu.resetType === 2
                  ? "long rest"
                  : lu.resetType === 3
                    ? "day"
                    : "rest";
            info.uses = {
              current: Math.max(0, max - (lu.numberUsed ?? 0)),
              max,
              reset,
            };
          }
        }
        actionsMap.set(key, { info, id: aId, componentId: aCompId });
      }
    }
  }

  return Array.from(actionsMap.values()).map((item) => item.info);
}
