import {
  PartyMember,
  SenseInfo,
  SpellSlotLevel,
  ActionInfo,
  DeathSaves,
  DefenseInfo,
  InventoryItem,
} from "./dndbeyond.functions";

export type LocalCondition = { name: string; rounds: number | null };

const CONDITIONS_KEY = "mob.conditions.v1";

// 1. Read Local HP and Death Saves
export function getLocalHp(
  memberId: number,
  remoteHpCurrent: number,
  remoteTempHp: number,
  remoteDeathSaves: DeathSaves,
): {
  hpCurrent: number;
  tempHp: number;
  deathSaves: DeathSaves;
  spentHitDice: Record<string, number>;
} {
  if (typeof window === "undefined") {
    return {
      hpCurrent: remoteHpCurrent,
      tempHp: remoteTempHp,
      deathSaves: remoteDeathSaves,
      spentHitDice: {},
    };
  }
  try {
    const storageKey = `party-stats:hp:${memberId}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (typeof parsed.hpCurrent === "number" && typeof parsed.tempHp === "number") {
        return {
          hpCurrent: parsed.hpCurrent,
          tempHp: parsed.tempHp,
          deathSaves: parsed.deathSaves ?? remoteDeathSaves,
          spentHitDice: parsed.spentHitDice ?? {},
        };
      }
    }
  } catch (e) {
    console.warn("Failed to load HP data from localStorage:", e);
  }
  return {
    hpCurrent: remoteHpCurrent,
    tempHp: remoteTempHp,
    deathSaves: remoteDeathSaves,
    spentHitDice: {},
  };
}

// 2. Read Local Conditions
export function getLocalConditions(memberId: number): LocalCondition[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CONDITIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const list = parsed[String(memberId)];
      return Array.isArray(list) ? list : [];
    }
  } catch {
    // Ignore error
  }
  return [];
}

export function getLocalActiveInfusions(memberId: number): string[] {
  if (typeof window === "undefined") return [];
  try {
    const storageKey = `party-stats:active-infusions:${memberId}`;
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn(e);
  }
  return [];
}

export function getLocalItemOverrides(
  memberId: number,
): Record<string, { equipped?: boolean; attuned?: boolean }> {
  if (typeof window === "undefined") return {};
  try {
    const storageKey = `party-stats:item-overrides:${memberId}`;
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn(e);
  }
  return {};
}

export function getLocalCustomItems(memberId: number): InventoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const storageKey = `party-stats:custom-items:${memberId}`;
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn(e);
  }
  return [];
}

// 3. Read Local class/subclass options
export function getLocalArmorModel(
  memberId: number,
  initialArmorModel: string | null,
): string | null {
  if (typeof window === "undefined") return initialArmorModel;
  try {
    const storageKey = `party-stats:armor-model:${memberId}`;
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) {
      return stored === "null" ? null : stored;
    }
  } catch (e) {
    console.warn(e);
  }
  return initialArmorModel;
}

export function getLocalTotemAspects(
  memberId: number,
  initialAspects: Array<{ name: string; description: string }>,
): Array<{ name: string; description: string }> {
  if (typeof window === "undefined") return initialAspects;
  try {
    const storageKey = `party-stats:totem-aspects:${memberId}`;
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) {
      return stored === "null" ? [] : JSON.parse(stored);
    }
  } catch (e) {
    console.warn(e);
  }
  return initialAspects;
}

export function getLocalRage(memberId: number): string {
  if (typeof window === "undefined") return "None";
  try {
    const storageKey = `party-stats:rage:${memberId}`;
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) {
      return stored;
    }
  } catch (e) {
    console.warn(e);
  }
  return "None";
}

// 4. Read Local Spell Slots
export function getLocalSpellSlots(
  memberId: number,
  initialSpellSlots: SpellSlotLevel[],
  initialPactSlots: SpellSlotLevel[],
): { spellSlots: SpellSlotLevel[]; pactSlots: SpellSlotLevel[] } {
  if (typeof window === "undefined") {
    return { spellSlots: initialSpellSlots, pactSlots: initialPactSlots };
  }
  try {
    const storageKey = `party-stats:slots:${memberId}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.spellSlotsUsed && parsed.pactSlotsUsed) {
        const getEffective = (slots: SpellSlotLevel[], isPact: boolean) => {
          return slots.map((s) => {
            const localUsed = (isPact ? parsed.pactSlotsUsed : parsed.spellSlotsUsed)[s.level];
            return {
              level: s.level,
              max: s.max,
              used: localUsed !== undefined ? localUsed : s.used,
            };
          });
        };
        return {
          spellSlots: getEffective(initialSpellSlots, false),
          pactSlots: getEffective(initialPactSlots, true),
        };
      }
    }
  } catch (e) {
    console.warn("Failed to load spell slots from localStorage:", e);
  }
  return { spellSlots: initialSpellSlots, pactSlots: initialPactSlots };
}

// 5. Read Local Class Resources
export function getLocalResources(memberId: number, actions: ActionInfo[]): ActionInfo[] {
  if (typeof window === "undefined") return actions;
  try {
    const storageKey = `party-stats:resources:${memberId}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.spent) {
        return actions.map((a) => {
          if (!a.uses) return a;
          const spent = parsed.spent[a.name] ?? 0;
          return {
            ...a,
            uses: {
              ...a.uses,
              current: Math.max(0, a.uses.max - spent),
            },
          };
        });
      }
    }
  } catch (e) {
    console.warn("Failed to load class resources from localStorage:", e);
  }
  return actions;
}

// 6. Calculate Fully Modified Stats
export function getFullyModifiedStats(member: PartyMember) {
  const localHp = getLocalHp(member.id, member.hpCurrent, member.tempHp, member.deathSaves);
  const localConditions = getLocalConditions(member.id);
  const localArmorModel = getLocalArmorModel(member.id, member.activeArmorModel);
  const localTotemAspects = getLocalTotemAspects(member.id, member.totemAspects || []);
  const localRage = getLocalRage(member.id);
  const { spellSlots, pactSlots } = getLocalSpellSlots(
    member.id,
    member.spellSlots,
    member.pactSlots,
  );
  const actions = getLocalResources(member.id, member.actions || []);
  const localActiveInfusions = getLocalActiveInfusions(member.id);

  const localItemOverrides = getLocalItemOverrides(member.id);
  const localCustomItems = getLocalCustomItems(member.id);
  const inventory = [
    ...(member.inventory || []).map((item) => {
      const over = localItemOverrides[item.name];
      if (over) {
        return {
          ...item,
          equipped: over.equipped !== undefined ? over.equipped : item.equipped,
          attuned: over.attuned !== undefined ? over.attuned : item.attuned,
        };
      }
      return item;
    }),
    ...localCustomItems,
  ];

  let ac = member.armorClass;
  let speed = member.speed;
  const acNotes: string[] = [];
  const speedNotes: string[] = [];

  const dexMod = member.abilities.find((a) => a.name === "DEX")?.modifier ?? 0;

  // 1. Shield Adjustment
  const isShield = (i: InventoryItem) => i.armorTypeId === 4;
  const remoteShieldItem = member.inventory?.find((i) => i.equipped && isShield(i));
  const localShieldItem = inventory.find((i) => i.equipped && isShield(i));

  const getShieldAcValue = (item: InventoryItem) => {
    const base = item.armorClass ?? 2;
    const magicMatch = item.name.match(/\+(\d+)/);
    const magic = magicMatch ? parseInt(magicMatch[1], 10) : 0;
    return base + magic;
  };

  if (remoteShieldItem && !localShieldItem) {
    const shieldVal = getShieldAcValue(remoteShieldItem);
    ac -= shieldVal;
    acNotes.push(`-${shieldVal} from unequipping ${remoteShieldItem.name}`);
  } else if (!remoteShieldItem && localShieldItem) {
    const shieldVal = getShieldAcValue(localShieldItem);
    ac += shieldVal;
    acNotes.push(`+${shieldVal} from equipping ${localShieldItem.name}`);
  } else if (
    remoteShieldItem &&
    localShieldItem &&
    remoteShieldItem.name !== localShieldItem.name
  ) {
    const remVal = getShieldAcValue(remoteShieldItem);
    const locVal = getShieldAcValue(localShieldItem);
    ac += locVal - remVal;
    acNotes.push(
      `Net AC change: ${locVal - remVal > 0 ? "+" : ""}${locVal - remVal} (equipped ${localShieldItem.name} instead of ${remoteShieldItem.name})`,
    );
  }

  // 2. Armor Adjustment
  const isBodyArmor = (i: InventoryItem) =>
    (i.type?.toLowerCase().includes("armor") || i.type === "Armor") &&
    (i.armorTypeId ?? 0) <= 3 &&
    !isShield(i);
  const remoteArmorItem = member.inventory?.find((i) => i.equipped && isBodyArmor(i));
  const localArmorItem = inventory.find((i) => i.equipped && isBodyArmor(i));

  const getArmorContribution = (item: InventoryItem | undefined) => {
    if (!item) return 0;
    const base = item.armorClass ?? 10;
    const magicMatch = item.name.match(/\+(\d+)/);
    const magic = magicMatch ? parseInt(magicMatch[1], 10) : 0;
    const typeId = item.armorTypeId ?? 0;
    const dexLimit = typeId === 3 ? 0 : typeId === 2 ? 2 : Infinity;
    return base + magic + Math.min(dexMod, dexLimit) - (10 + dexMod);
  };

  const remoteContrib = getArmorContribution(remoteArmorItem);
  const localContrib = getArmorContribution(localArmorItem);
  const netArmorChange = localContrib - remoteContrib;
  if (netArmorChange !== 0) {
    ac += netArmorChange;
    acNotes.push(`${netArmorChange > 0 ? "+" : ""}${netArmorChange} AC from armor changes`);
  }

  // 2.5. Wondrous Item / Ring AC Adjustment
  const requiresAttunement = (item: InventoryItem) => {
    const typeLower = item.type?.toLowerCase() || "";
    const descLower = item.description?.toLowerCase() || "";
    if (typeLower.includes("ring") || typeLower.includes("wondrous")) {
      return true;
    }
    if (descLower.includes("attunement") || descLower.includes("attune")) {
      return true;
    }
    return false;
  };

  inventory.forEach((item) => {
    if (item.armorClass && item.armorClass > 0 && !isShield(item) && !isBodyArmor(item)) {
      const isActive = item.equipped && (!requiresAttunement(item) || item.attuned);
      const remoteItem = member.inventory?.find((ri) => ri.name === item.name);

      if (remoteItem) {
        const remoteActive = remoteItem.equipped && (!requiresAttunement(remoteItem) || remoteItem.attuned);
        if (remoteActive && !isActive) {
          ac -= item.armorClass;
          acNotes.push(`-${item.armorClass} from unequipping/unattuning ${item.name}`);
        } else if (!remoteActive && isActive) {
          ac += item.armorClass;
          acNotes.push(`+${item.armorClass} from equipping/attuning ${item.name}`);
        }
      } else {
        // Local custom item
        if (isActive) {
          ac += item.armorClass;
          acNotes.push(`+${item.armorClass} from equipping/attuning ${item.name}`);
        }
      }
    }
  });

  // 3. Heavy Armor Speed Penalty Adjustment
  const getHeavyArmorPenalty = (item: InventoryItem | undefined) => {
    if (!item) return false;
    const name = item.name.toLowerCase();
    const strScore = member.abilities.find((a) => a.name === "STR")?.score ?? 10;
    if (name.includes("plate") && strScore < 15) return true;
    if (name.includes("chain mail") && strScore < 13) return true;
    return false;
  };
  const remotePenalty = getHeavyArmorPenalty(remoteArmorItem);
  const localPenalty = getHeavyArmorPenalty(localArmorItem);
  if (remotePenalty && !localPenalty) {
    speed += 10;
    speedNotes.push("+10 ft. from unequipping heavy armor (Strength requirement removed)");
  } else if (!remotePenalty && localPenalty) {
    speed -= 10;
    speedNotes.push("-10 ft. from equipping heavy armor without Strength requirement");
  }

  const isArmorer =
    member.subclasses.some((s) => s.toLowerCase().includes("armorer")) ||
    member.activeArmorModel !== null;

  const isBarbarian =
    member.classes.toLowerCase().includes("barbarian") ||
    (member.totemAspects && member.totemAspects.length > 0);

  // Combine remote and local conditions for checks
  const remoteConds = Array.isArray(member.conditions) ? member.conditions : [];
  const allConditions = [
    ...remoteConds.map((c) => c.toLowerCase()),
    ...localConditions.map((c) => c.name.toLowerCase()),
  ];

  // 1. Check Exhaustion (2024 Rules: Speed reduced by 5 ft per level of exhaustion)
  if (member.exhaustion > 0) {
    const penalty = member.exhaustion * 5;
    speed = Math.max(0, speed - penalty);
    speedNotes.push(`-${penalty} ft. from Exhaustion (Level ${member.exhaustion})`);
  }

  // 2. Check Restraining Conditions (Speed becomes 0)
  const zeroSpeedConditions = [
    "grappled",
    "restrained",
    "paralyzed",
    "petrified",
    "stunned",
    "unconscious",
  ];
  const activeZeroSpeed = zeroSpeedConditions.filter((c) => allConditions.includes(c));
  if (activeZeroSpeed.length > 0) {
    speed = 0;
    speedNotes.push(
      `Speed 0 from ${activeZeroSpeed.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(", ")}`,
    );
  }

  // 3. Check Shield Spell (+5 AC)
  if (allConditions.includes("shield")) {
    ac += 5;
    acNotes.push("+5 from Shield spell");
  }

  // 4. Check Haste Spell (+2 AC, double Speed)
  if (allConditions.includes("haste")) {
    ac += 2;
    acNotes.push("+2 from Haste spell");
    if (speed > 0) {
      speed = speed * 2;
      speedNotes.push("Speed doubled from Haste spell");
    }
  }

  // 5. Check Slow Spell (-2 AC, half Speed)
  if (allConditions.includes("slow")) {
    ac = Math.max(0, ac - 2);
    acNotes.push("-2 from Slow spell");
    if (speed > 0) {
      speed = Math.floor(speed / 2);
      speedNotes.push("Speed halved from Slow spell");
    }
  }

  // Bladesong (+INT modifier to AC [min +1], +10 ft speed)
  if (allConditions.includes("bladesong")) {
    const intMod = member.abilities.find((a) => a.name === "INT")?.modifier ?? 0;
    const bladesongAc = Math.max(1, intMod);
    ac += bladesongAc;
    acNotes.push(`+${bladesongAc} from Bladesong (INT)`);
    speed += 10;
    speedNotes.push("+10 ft. from Bladesong");
  }

  // Longstrider (+10 ft speed)
  if (allConditions.includes("longstrider")) {
    speed += 10;
    speedNotes.push("+10 ft. from Longstrider spell");
  }

  // Warding Bond (+1 AC)
  if (allConditions.includes("warding bond")) {
    ac += 1;
    acNotes.push("+1 from Warding Bond");
  }

  // Cover (+2 AC for Half, +5 AC for Three-Quarters)
  if (allConditions.includes("half cover")) {
    ac += 2;
    acNotes.push("+2 from Half Cover");
  }
  if (allConditions.includes("three-quarters cover") || allConditions.includes("3/4 cover")) {
    ac += 5;
    acNotes.push("+5 from 3/4 Cover");
  }

  // 6. Armorer steps
  if (isArmorer && localArmorModel === "Infiltrator") {
    speed += 5;
    speedNotes.push("+5 ft. (Powered Steps)");
  }

  // Artificer Infusions AC modifiers (checks for double counting remote DDB active infusions)
  const isArtificer = member.classes.toLowerCase().includes("artificer");
  if (isArtificer) {
    const remoteActive = member.activeInfusions || [];

    // 1. Shield Infusions (Shield +1 / Repulsion Shield)
    const remoteShield =
      remoteActive.includes("Shield, +1") || remoteActive.includes("Repulsion Shield");
    const localShield =
      localActiveInfusions.includes("Shield, +1") ||
      localActiveInfusions.includes("Repulsion Shield");
    const hasShield = inventory.some(
      (i) => i.equipped && (i.armorTypeId === 4 || i.definition?.armorTypeId === 4),
    );

    if (hasShield) {
      const shieldDiff = (localShield ? 1 : 0) - (remoteShield ? 1 : 0);
      if (shieldDiff !== 0) {
        ac += shieldDiff;
        acNotes.push(`${shieldDiff > 0 ? "+" : ""}${shieldDiff} from Shield Infusion`);
      }
    }

    // 2. Armor Infusions (Plate +1 / Enhanced Defense / scale, ring, leather +1, etc.)
    const armorInfusionNames = [
      "Plate, +1",
      "Scale Mail, +1",
      "Breastplate, +1",
      "Ring Mail, +1",
      "Chain Mail, +1",
      "Half Plate, +1",
      "Leather, +1",
      "Studded Leather, +1",
      "Enhanced Defense",
    ];
    const remoteArmor = remoteActive.some((name) => armorInfusionNames.includes(name));
    const localArmor = localActiveInfusions.some((name) => armorInfusionNames.includes(name));
    const hasArmor = inventory.some(
      (i) =>
        i.equipped &&
        (i.type?.toLowerCase().includes("armor") || i.definition?.filterType === "Armor") &&
        (i.armorTypeId ?? i.definition?.armorTypeId ?? 0) <= 3,
    );

    if (hasArmor) {
      const armorDiff = (localArmor ? 1 : 0) - (remoteArmor ? 1 : 0);
      if (armorDiff !== 0) {
        ac += armorDiff;
        acNotes.push(`${armorDiff > 0 ? "+" : ""}${armorDiff} from Enhanced Defense Infusion`);
      }
    }
  }

  // 7. Elk Rage
  if (isBarbarian && localRage === "Elk") {
    speed += 15;
    speedNotes.push("+15 ft. (Elk Totem Rage)");
  }

  // 8. Senses modification (Owl Totem Aspect)
  const senses: SenseInfo[] = [...(member.senses ?? [])];
  if (isBarbarian && localTotemAspects[0]?.name === "Owl") {
    const dvIndex = senses.findIndex((s) => s.name.toLowerCase().includes("darkvision"));
    if (dvIndex >= 0) {
      const currentVal = senses[dvIndex].value ?? 0;
      senses[dvIndex] = {
        name: senses[dvIndex].name,
        value: currentVal + 60,
      };
    } else {
      senses.push({ name: "Darkvision", value: 60 });
    }
  }

  // 9. Carrying Capacity modification (Bear Totem Aspect)
  let carryingCapacity = member.carryingCapacity;
  if (isBarbarian && localTotemAspects[0]?.name === "Bear") {
    carryingCapacity *= 2;
  }

  // 10. Special Speeds modification (Panther/Salmon totem aspects)
  const specialSpeeds = [...(member.specialSpeeds ?? [])];
  if (isBarbarian && localTotemAspects[0]?.name === "Panther") {
    const exists = specialSpeeds.some((s) => s.type.toLowerCase().includes("climb"));
    if (!exists) {
      specialSpeeds.push({ type: "climb", value: speed });
    }
  }
  if (isBarbarian && localTotemAspects[0]?.name === "Salmon") {
    const exists = specialSpeeds.some((s) => s.type.toLowerCase().includes("swim"));
    if (!exists) {
      specialSpeeds.push({ type: "swim", value: speed });
    }
  }

  // Combine unique condition names for display list
  const uniqueConditionNames = Array.from(
    new Set([
      ...remoteConds.map((c) => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase()),
      ...localConditions.map((c) => c.name.charAt(0).toUpperCase() + c.name.slice(1).toLowerCase()),
    ]),
  );

  return {
    hpCurrent: localHp.hpCurrent,
    tempHp: localHp.tempHp,
    hpMax: member.hpMax,
    deathSaves: localHp.deathSaves,
    hitDice: getModifiedHitDice(member.hitDice, localHp.spentHitDice),
    ac,
    speed,
    acNotes,
    speedNotes,
    conditions: uniqueConditionNames,
    senses,
    carryingCapacity,
    specialSpeeds,
    spellSlots,
    pactSlots,
    actions,
    defenses: getModifiedDefenses(member, localRage, localTotemAspects),
    isDowned: localHp.hpCurrent <= 0,
  };
}

// 7. Calculate Modified Defenses (Rage Resistances)
export function getModifiedDefenses(
  member: PartyMember,
  localRage: string,
  localTotemAspects: Array<{ name: string; description: string }>,
): DefenseInfo[] {
  const list = [...(member.defenses || [])];
  const isBarbarian =
    member.classes.toLowerCase().includes("barbarian") ||
    (member.totemAspects && member.totemAspects.length > 0);
  const isRaging = localRage !== "None";

  if (isBarbarian && isRaging) {
    const physicalTypes = ["Bludgeoning", "Piercing", "Slashing"];
    physicalTypes.forEach((dt) => {
      if (
        !list.some(
          (d) => d.damageType.toLowerCase() === dt.toLowerCase() && d.type === "resistance",
        )
      ) {
        list.push({ type: "resistance", damageType: dt });
      }
    });

    const hasBearResistance = localRage === "Bear" || localTotemAspects[0]?.name === "Bear";
    if (hasBearResistance) {
      const bearTypes = ["Acid", "Cold", "Fire", "Lightning", "Poison", "Thunder"];
      bearTypes.forEach((dt) => {
        if (
          !list.some(
            (d) => d.damageType.toLowerCase() === dt.toLowerCase() && d.type === "resistance",
          )
        ) {
          list.push({ type: "resistance", damageType: dt });
        }
      });
    }
  }
  return list;
}

// 8. Calculate Modified Hit Dice String
export function getModifiedHitDice(
  hitDiceStr: string,
  spentHitDice: Record<string, number>,
): string {
  if (!hitDiceStr || hitDiceStr === "—") return hitDiceStr;
  const parts = hitDiceStr.split("+").map((part) => {
    const m = part.trim().match(/(\d+)\/(\d+)d(\d+)/);
    if (m) {
      const total = parseInt(m[2], 10);
      const die = `d${m[3]}`;
      const spent = spentHitDice[die] ?? 0;
      const remaining = Math.max(0, parseInt(m[1], 10) - spent);
      return `${remaining}/${total}${die}`;
    }
    return part.trim();
  });
  return parts.join(" + ");
}
