import { AbilityScore, AttackInfo } from "../dndbeyond.types";

export function computeAttacks(
  data: any,
  abilities: AbilityScore[],
  pb: number,
  modifiers: any[],
): AttackInfo[] {
  const strMod = abilities[0].modifier;
  const dexMod = abilities[1].modifier;
  const abilityModifiers = abilities.map((a) => a.modifier);

  const attacks: AttackInfo[] = [];
  const cvs = data.characterValues ?? [];

  const getCvValue = (valId: number, typeId: number) => {
    const cv = cvs.find((c: any) => String(c.valueId) === String(valId) && c.typeId === typeId);
    return cv ? cv.value : undefined;
  };

  const getGeneralModifiers = (isWeapon: boolean, isRanged: boolean) => {
    let attackBonus = 0;
    let damageBonus = 0;

    for (const m of modifiers ?? []) {
      if (m.type === "bonus") {
        const sub = m.subType;
        if (sub === "attacks" || sub === "weapon-attacks") {
          if (isWeapon) {
            if (typeof m.value === "number") attackBonus += m.value;
          }
        } else if (sub === "melee-attacks" || sub === "melee-weapon-attacks") {
          if (isWeapon && !isRanged) {
            if (typeof m.value === "number") attackBonus += m.value;
          }
        } else if (sub === "ranged-attacks" || sub === "ranged-weapon-attacks") {
          if (isWeapon && isRanged) {
            if (typeof m.value === "number") attackBonus += m.value;
          }
        }

        if (sub === "damage" || sub === "weapon-damage") {
          if (isWeapon) {
            if (typeof m.value === "number") damageBonus += m.value;
          }
        } else if (sub === "melee-damage" || sub === "melee-weapon-damage") {
          if (isWeapon && !isRanged) {
            if (typeof m.value === "number") damageBonus += m.value;
          }
        } else if (sub === "ranged-damage" || sub === "ranged-weapon-damage") {
          if (isWeapon && isRanged) {
            if (typeof m.value === "number") damageBonus += m.value;
          }
        }
      }
    }
    return { attackBonus, damageBonus };
  };

  // 1. Equipped weapons in inventory
  for (const item of data.inventory ?? []) {
    if (!item.equipped) continue;
    const def = item.definition ?? {};
    if (def.filterType === "Weapon") {
      const item_id = item.id;

      const nameOverride = getCvValue(item_id, 8);
      const name =
        typeof nameOverride === "string" && nameOverride.trim() ? nameOverride : def.name;

      const props: string[] = (def.properties ?? []).map((p: any) => p.name);
      const isFinesse = props.includes("Finesse");
      const isRanged = def.attackType === 2;

      const useMod = isRanged ? dexMod : isFinesse ? Math.max(strMod, dexMod) : strMod;
      let baseAtkBonus = useMod + pb;

      let magicBonus = 0;
      for (const m of def.grantedModifiers ?? []) {
        if (m.type === "bonus" && (m.subType === "magic" || m.subType === "attack-rolls")) {
          if (typeof m.value === "number") {
            magicBonus += m.value;
          }
        }
      }
      baseAtkBonus += magicBonus;

      const genMods = getGeneralModifiers(true, isRanged);
      baseAtkBonus += genMods.attackBonus;

      const toHitOverride = getCvValue(item_id, 11);
      const toHitBonus = getCvValue(item_id, 10);

      let atkBonus = baseAtkBonus;
      if (typeof toHitOverride === "number") {
        atkBonus = toHitOverride;
      } else if (typeof toHitBonus === "number") {
        atkBonus += toHitBonus;
      }

      const dmg = def.damage ?? {};
      const diceStr = dmg.diceString;
      let damageFormula = "None";

      if (diceStr) {
        const baseDmgBonus = useMod + magicBonus + genMods.damageBonus;

        const dmgOverride = getCvValue(item_id, 13);
        const dmgBonusCv = getCvValue(item_id, 12);

        let dmgBonus = baseDmgBonus;
        if (typeof dmgOverride === "number") {
          dmgBonus = dmgOverride;
        } else if (typeof dmgBonusCv === "number") {
          dmgBonus += dmgBonusCv;
        }

        if (dmgBonus > 0) {
          damageFormula = `${diceStr} + ${dmgBonus}`;
        } else if (dmgBonus < 0) {
          damageFormula = `${diceStr} - ${Math.abs(dmgBonus)}`;
        } else {
          damageFormula = diceStr;
        }
      }

      const weaponProps = [...props];
      if (!isRanged) {
        weaponProps.push("Melee");
      } else {
        weaponProps.push("Ranged");
      }
      attacks.push({
        name,
        attackBonus: atkBonus,
        damage: damageFormula,
        damageType: def.damageType ?? "Unknown",
        properties: weaponProps,
        isWeapon: true,
      });
    }
  }

  // 2. Special attacks in actions
  const sources = [
    ["class", data?.actions?.class ?? []],
    ["race", data?.actions?.race ?? []],
    ["feat", data?.actions?.feat ?? []],
    ["item", data?.actions?.item ?? []],
  ] as const;

  const DAMAGE_TYPES: Record<number, string> = {
    1: "Bludgeoning",
    2: "Piercing",
    3: "Slashing",
    4: "Acid",
    5: "Cold",
    6: "Fire",
    7: "Lightning",
    8: "Necrotic",
    9: "Thunder",
    10: "Force",
    11: "Psychic",
    12: "Poison",
    13: "Radiant",
  };

  for (const [source, list] of sources) {
    for (const a of list) {
      const isAtk = !!(a.isAttack || a.displayAsAttack);
      const hasAtkRoll =
        a.attackTypeRange !== null || a.abilityModifierStatId !== null || a.fixedToHit !== null;
      if (isAtk && hasAtkRoll) {
        const action_id = a.id;

        const nameOverride = getCvValue(action_id, 8);
        const name =
          typeof nameOverride === "string" && nameOverride.trim() ? nameOverride : a.name;

        const abilityId = a.abilityModifierStatId;
        let useMod = 0;
        if (typeof abilityId === "number" && abilityId >= 1 && abilityId <= 6) {
          useMod = abilityModifiers[abilityId - 1];
        } else {
          useMod = strMod;
        }

        const isProf = !!a.isProficient;
        const fixedToHit = a.fixedToHit;

        const baseAtkBonus =
          typeof fixedToHit === "number" ? fixedToHit : (isProf ? pb : 0) + useMod;

        const toHitOverride = getCvValue(action_id, 11);
        const toHitBonus = getCvValue(action_id, 10);

        let atkBonus = baseAtkBonus;
        if (typeof toHitOverride === "number") {
          atkBonus = toHitOverride;
        } else if (typeof toHitBonus === "number") {
          atkBonus += toHitBonus;
        }

        const dice = a.dice ?? {};
        const diceStr = dice.diceString;
        const dmgTypeId = a.damageTypeId;
        const dmgType = DAMAGE_TYPES[dmgTypeId] ?? "Unknown";

        let damageFormula = "None";
        if (diceStr) {
          const baseDmgBonus = useMod;

          const dmgOverride = getCvValue(action_id, 13);
          const dmgBonusCv = getCvValue(action_id, 12);

          let dmgBonus = baseDmgBonus;
          if (typeof dmgOverride === "number") {
            dmgBonus = dmgOverride;
          } else if (typeof dmgBonusCv === "number") {
            dmgBonus += dmgBonusCv;
          }

          if (dmgBonus > 0) {
            damageFormula = `${diceStr} + ${dmgBonus}`;
          } else if (dmgBonus < 0) {
            damageFormula = `${diceStr} - ${Math.abs(dmgBonus)}`;
          } else {
            damageFormula = diceStr;
          }
        }

        const actionProps: string[] = [];
        if (a.attackSubtype === 1) {
          actionProps.push("Melee");
        } else if (a.attackSubtype === 2) {
          actionProps.push("Ranged");
        }
        attacks.push({
          name: `${name} (${source.charAt(0).toUpperCase() + source.slice(1)})`,
          attackBonus: atkBonus,
          damage: damageFormula,
          damageType: dmgType,
          properties: actionProps,
          isWeapon: false,
        });
      }
    }
  }

  return attacks;
}
