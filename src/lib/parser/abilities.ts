export function mod(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function proficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1;
}

export function computeFinalScore(
  baseStats: any[],
  bonusStats: any[],
  overrideStats: any[],
  modifiers: any[],
  statId: number,
): number {
  const base = baseStats.find((s) => s.id === statId)?.value ?? 10;
  const override = overrideStats.find((s) => s.id === statId)?.value;
  if (typeof override === "number") return override;

  const bonus = bonusStats.find((s) => s.id === statId)?.value ?? 0;

  // Sum modifier bonuses for this stat
  let modBonus = 0;
  let setValue: number | undefined;

  for (const m of modifiers) {
    if (m?.entityId === statId && m?.type === "bonus") {
      if (typeof m.value === "number") modBonus += m.value;
    }
    if (m?.entityId === statId && m?.type === "set" && typeof m.value === "number") {
      setValue = m.value;
    }
  }

  if (setValue !== undefined) return setValue;
  return base + bonus + modBonus;
}

export function computeHitDice(data: any): string {
  const parts: string[] = [];
  for (const c of data.classes ?? []) {
    const total = c.level ?? 0;
    const used = c.hitDiceUsed ?? 0;
    const remaining = total - used;
    const die = c.definition?.hitDice ?? 8;
    if (total > 0) {
      parts.push(`${remaining}/${total}d${die}`);
    }
  }
  return parts.join(" + ");
}

export function flattenModifiers(data: any): any[] {
  const m = data?.modifiers ?? {};
  return [
    ...(m.race ?? []),
    ...(m.class ?? []),
    ...(m.background ?? []),
    ...(m.item ?? []),
    ...(m.feat ?? []),
    ...(m.condition ?? []),
  ];
}
