import { AbilityScore } from "../dndbeyond.types";

export function computeArmorClass(
  data: any,
  dexMod: number,
  modifiers: any[],
  abilities: AbilityScore[],
): number {
  const inv: any[] = data.inventory ?? [];
  const equippedArmor = inv.filter((i) => i.equipped && i.definition?.filterType === "Armor");
  // armorTypeId: 1=light, 2=medium, 3=heavy, 4=shield
  const body = equippedArmor.filter((i) => (i.definition?.armorTypeId ?? 0) <= 3);
  const shields = equippedArmor.filter((i) => i.definition?.armorTypeId === 4);

  let baseAc = 10;
  let dexLimit = Infinity;
  let hasArmor = false;

  if (body.length > 0) {
    hasArmor = true;
    const best = body.reduce((a, b) =>
      (b.definition.armorClass ?? 0) > (a.definition.armorClass ?? 0) ? b : a,
    );
    baseAc = best.definition.armorClass ?? 10;
    const type = best.definition.armorTypeId;
    if (type === 2) dexLimit = 2; // Medium
    if (type === 3) dexLimit = 0; // Heavy
  }

  // Handle Unarmored base sets (e.g. Draconic Resilience, Mage Armor)
  if (!hasArmor) {
    let bestUnarmoredBase = baseAc;
    for (const m of modifiers) {
      if (
        m?.type === "set-base" &&
        (m?.subType === "unarmored-armor-class" || m?.subType === "armor-class")
      ) {
        if (typeof m.value === "number" && m.value > bestUnarmoredBase) {
          bestUnarmoredBase = m.value;
        }
      }
    }
    baseAc = bestUnarmoredBase;
  }

  let ac = baseAc + Math.min(dexMod, dexLimit);

  // Handle Unarmored Defense bonuses (e.g. Monk/Barbarian)
  if (!hasArmor) {
    let unarmoredSetBonus = 0;
    let unarmoredFlatBonus = 0;
    for (const m of modifiers) {
      if (m?.subType === "unarmored-armor-class") {
        if (m?.type === "set") {
          if (typeof m.statId === "number" && m.statId >= 1 && m.statId <= 6) {
            unarmoredSetBonus = Math.max(unarmoredSetBonus, abilities[m.statId - 1].modifier);
          } else if (typeof m.value === "number") {
            unarmoredSetBonus = Math.max(unarmoredSetBonus, m.value);
          }
        } else if (m?.type === "bonus" && typeof m.value === "number") {
          unarmoredFlatBonus += m.value;
        }
      }
    }
    ac += unarmoredSetBonus + unarmoredFlatBonus;
  }

  if (shields.length > 0) {
    const bestShield = shields.reduce((a, b) =>
      (b.definition.armorClass ?? 0) > (a.definition.armorClass ?? 0) ? b : a,
    );
    ac += bestShield.definition.armorClass ?? 0;
  }

  // Add AC bonuses from magic items / traits
  for (const m of modifiers) {
    if (m?.subType === "armor-class" && m?.type === "bonus" && typeof m?.value === "number") {
      ac += m.value;
    }
  }

  // Handle explicit AC set modifiers (e.g. Barkskin)
  for (const m of modifiers) {
    if (m?.subType === "armor-class" && m?.type === "set" && typeof m?.value === "number") {
      if (m.value > ac) ac = m.value; // set AC overrides if higher
    }
  }

  // Handle character manual overrides and bonuses
  const cvOverride = data.characterValues?.find((cv: any) => cv.typeId === 1);
  if (cvOverride && typeof cvOverride.value === "number") {
    ac = cvOverride.value;
  }
  const cvBonus = data.characterValues?.find((cv: any) => cv.typeId === 2);
  if (cvBonus && typeof cvBonus.value === "number") {
    ac += cvBonus.value;
  }

  return ac;
}
