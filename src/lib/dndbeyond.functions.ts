import { createServerFn } from "@tanstack/react-start";
import { PARTY_CHARACTER_IDS } from "./party-config";

export interface AbilityScore {
  name: string;
  score: number;
  modifier: number;
}

export interface SkillInfo {
  key: string;
  name: string;
  ability: string; // STR/DEX/...
  modifier: number;
  proficiency: "none" | "half" | "proficient" | "expertise";
}

export interface SenseInfo {
  name: string;
  value: number | null; // e.g. 60 (ft) or null for non-range senses
}

export interface SaveInfo {
  ability: string; // STR/DEX/...
  modifier: number;
  proficiency: "none" | "proficient" | "expertise";
}

export interface SpellSlotLevel {
  level: number; // 1-9 or 1-5 for pact
  max: number;
  used: number;
}

export interface SpellcastingInfo {
  className: string;
  ability: string; // e.g. INT, WIS, CHA
  saveDc: number;
  attackBonus: number;
}

export interface DefenseInfo {
  type: "resistance" | "immunity" | "vulnerability";
  damageType: string;
}

export interface ActionInfo {
  name: string;
  source: string; // class / race / feat / item
  uses?: { current: number; max: number; reset: string };
}

export interface InventoryItem {
  name: string;
  type: string; // Weapon / Armor / Wondrous item / Potion / ...
  rarity: string | null; // Common, Uncommon, Rare, Very Rare, Legendary, Artifact, Mundane
  magic: boolean;
  equipped: boolean;
  attuned: boolean;
  quantity: number;
}

export interface DeathSaves {
  successes: number;
  failures: number;
  stabilized: boolean;
}

export interface Currencies {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}

export interface AttackInfo {
  name: string;
  attackBonus: number;
  damage: string;
  damageType: string;
  properties: string[];
  isWeapon: boolean;
}

export interface PreparedSpell {
  level: number;
  name: string;
}

export interface PartyMember {
  id: number;
  name: string;
  avatarUrl: string | null;
  race: string;
  background: string;
  classes: string;
  subclasses: string[];
  level: number;
  hpMax: number;
  hpCurrent: number;
  tempHp: number;
  inspiration: boolean;
  exhaustion: number;
  deathSaves: DeathSaves;
  passivePerception: number;
  passiveInvestigation: number;
  passiveInsight: number;
  armorClass: number;
  initiative: number;
  speed: number;
  proficiencyBonus: number;
  senses: SenseInfo[];
  skills: SkillInfo[];
  saves: SaveInfo[];
  spellSlots: SpellSlotLevel[];
  pactSlots: SpellSlotLevel[];
  abilities: AbilityScore[];
  conditions: string[];
  defenses: DefenseInfo[];
  actions: ActionInfo[];
  inventory: InventoryItem[];
  readonlyUrl: string;
  error?: string;
  languages: string[];
  tools: string[];
  spellcasting: SpellcastingInfo[];
  hitDice: string;
  feats: Array<{ name: string; description: string; choices: string[] }>;
  alignment: string | null;
  currencies: Currencies;
  weightCarried: number;
  carryingCapacity: number;
  attacks: AttackInfo[];
  cantrips: string[];
  preparedSpells: PreparedSpell[];
}

const ABILITY_NAMES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;
const ABILITY_ID_TO_INDEX: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };
const WIS_INDEX = 4;
const DEX_INDEX = 1;

// Skill key -> [display name, ability index]
const SKILLS: Array<[string, string, number]> = [
  ["acrobatics", "Acrobatics", 1],
  ["animal-handling", "Animal Handling", 4],
  ["arcana", "Arcana", 3],
  ["athletics", "Athletics", 0],
  ["deception", "Deception", 5],
  ["history", "History", 3],
  ["insight", "Insight", 4],
  ["intimidation", "Intimidation", 5],
  ["investigation", "Investigation", 3],
  ["medicine", "Medicine", 4],
  ["nature", "Nature", 3],
  ["perception", "Perception", 4],
  ["performance", "Performance", 5],
  ["persuasion", "Persuasion", 5],
  ["religion", "Religion", 3],
  ["sleight-of-hand", "Sleight of Hand", 1],
  ["stealth", "Stealth", 1],
  ["survival", "Survival", 4],
];

const ABILITY_LONG = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
] as const;

// Multiclass spell slot table, indexed by total caster level (1-20)
// Each row is slots for levels 1..9
const MULTI_SLOTS: number[][] = [
  [], // 0
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

// Warlock pact magic table by warlock level → [slotLevel, count]
const PACT_TABLE: Array<[number, number]> = [
  [0, 0],
  [1, 1],
  [1, 2],
  [2, 2],
  [2, 2],
  [3, 2],
  [3, 2],
  [4, 2],
  [4, 2],
  [5, 2],
  [5, 2],
  [5, 3],
  [5, 3],
  [5, 3],
  [5, 3],
  [5, 3],
  [5, 3],
  [5, 4],
  [5, 4],
  [5, 4],
  [5, 4],
];

function casterLevelFor(className: string, level: number, subclass: string): number {
  const n = className.toLowerCase();
  if (["bard", "cleric", "druid", "sorcerer", "wizard"].includes(n)) return level;
  if (n === "artificer") return Math.ceil(level / 2); // artificer rounds up
  if (["paladin", "ranger"].includes(n)) return level >= 2 ? Math.floor(level / 2) : 0;
  if (n === "fighter" && /eldritch knight/i.test(subclass))
    return level >= 3 ? Math.floor(level / 3) : 0;
  if (n === "rogue" && /arcane trickster/i.test(subclass))
    return level >= 3 ? Math.floor(level / 3) : 0;
  return 0;
}

function computeSpellSlots(data: any): {
  spellSlots: SpellSlotLevel[];
  pactSlots: SpellSlotLevel[];
} {
  let casterLevel = 0;
  let warlockLevel = 0;
  for (const c of data.classes ?? []) {
    const name = c.definition?.name ?? "";
    const lvl = c.level ?? 0;
    const sub = c.subclassDefinition?.name ?? "";
    if (name.toLowerCase() === "warlock") warlockLevel += lvl;
    else casterLevel += casterLevelFor(name, lvl, sub);
  }
  const usedByLevel = new Map<number, number>();
  for (const s of data.spellSlots ?? []) usedByLevel.set(s.level, s.used ?? 0);
  const pactUsedByLevel = new Map<number, number>();
  for (const s of data.pactMagic ?? []) pactUsedByLevel.set(s.level, s.used ?? 0);

  const slotRow = MULTI_SLOTS[Math.min(casterLevel, 20)] ?? [];
  const spellSlots: SpellSlotLevel[] = slotRow.map((max, i) => ({
    level: i + 1,
    max,
    used: usedByLevel.get(i + 1) ?? 0,
  }));

  const pactSlots: SpellSlotLevel[] = [];
  if (warlockLevel > 0) {
    const [pactLvl, pactCount] = PACT_TABLE[Math.min(warlockLevel, 20)];
    if (pactCount > 0) {
      pactSlots.push({
        level: pactLvl,
        max: pactCount,
        used: pactUsedByLevel.get(pactLvl) ?? 0,
      });
    }
  }
  return { spellSlots, pactSlots };
}

function computeSaves(modifiers: any[], abilities: AbilityScore[], pb: number): SaveInfo[] {
  // Flat bonus that applies to all saves (e.g. Cloak of Protection, Aura of Protection)
  let allSavesBonus = 0;
  for (const m of modifiers) {
    if (m?.subType === "saving-throws" && m?.type === "bonus") {
      if (typeof m.value === "number") {
        allSavesBonus += m.value;
      }
      if (typeof m.statId === "number" && m.statId >= 1 && m.statId <= 6) {
        allSavesBonus += abilities[m.statId - 1].modifier;
      }
    }
  }
  return ABILITY_LONG.map((long, i) => {
    const subType = `${long}-saving-throws`;
    let prof: "none" | "proficient" | "expertise" = "none";
    let bonus = 0;
    for (const m of modifiers) {
      if (m?.subType !== subType) continue;
      if (m.type === "expertise") prof = "expertise";
      else if (m.type === "proficiency" && prof !== "expertise") prof = "proficient";
      else if (m.type === "bonus" && typeof m.value === "number") bonus += m.value;
    }
    const profBonus = prof === "expertise" ? pb * 2 : prof === "proficient" ? pb : 0;
    return {
      ability: ABILITY_NAMES[i],
      modifier: abilities[i].modifier + profBonus + bonus + allSavesBonus,
      proficiency: prof,
    };
  });
}

function mod(score: number): number {
  return Math.floor((score - 10) / 2);
}

function proficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1;
}

function computeFinalScore(
  baseStats: any[],
  bonusStats: any[],
  overrideStats: any[],
  modifiers: any[],
  abilityIndex: number,
): number {
  const id = abilityIndex + 1;
  const override = overrideStats?.find((s) => s.id === id)?.value;
  if (typeof override === "number") return override;
  const base = baseStats?.find((s) => s.id === id)?.value ?? 10;
  const bonus = bonusStats?.find((s) => s.id === id)?.value ?? 0;
  // Look for "bonus" modifiers that grant +N to a stat (subType "<ability>-score")
  const subType =
    ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"][abilityIndex] +
    "-score";
  let modBonus = 0;
  for (const m of modifiers) {
    if (m?.type === "bonus" && m?.subType === subType && typeof m?.value === "number") {
      modBonus += m.value;
    }
    if (m?.type === "set" && m?.subType === subType && typeof m?.value === "number") {
      return m.value;
    }
  }
  return base + bonus + modBonus;
}

function flattenModifiers(data: any): any[] {
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

function computeArmorClass(
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
    let unarmoredBonus = 0;
    for (const m of modifiers) {
      if ((m?.type === "bonus" || m?.type === "set") && m?.subType === "unarmored-armor-class") {
        if (typeof m.statId === "number" && m.statId >= 1 && m.statId <= 6) {
          unarmoredBonus = Math.max(unarmoredBonus, abilities[m.statId - 1].modifier);
        } else if (typeof m.value === "number") {
          unarmoredBonus = Math.max(unarmoredBonus, m.value);
        }
      }
    }
    ac += unarmoredBonus;
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

function computeSenses(modifiers: any[], customSenses: any[]): SenseInfo[] {
  const map = new Map<string, number | null>();
  for (const m of modifiers) {
    if (m?.type === "set-base" || m?.type === "sense" || m?.type === "set") {
      const name = m?.friendlySubtypeName;
      const val = typeof m?.value === "number" ? m.value : null;
      if (
        name &&
        (m?.subType?.includes("darkvision") ||
          m?.subType?.includes("vision") ||
          m?.subType?.includes("sight") ||
          m?.subType?.includes("sense"))
      ) {
        const prev = map.get(name);
        if (prev == null || (val != null && val > (prev ?? 0))) map.set(name, val);
      }
    }
  }
  for (const c of customSenses ?? []) {
    if (c?.name) map.set(c.name, typeof c.distance === "number" ? c.distance : null);
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

function computeSkillProficiency(
  modifiers: any[],
  subType: string,
): "none" | "half" | "proficient" | "expertise" {
  const target = subType.toLowerCase().replace(/\s+/g, "-");
  let level: "none" | "half" | "proficient" = "none";
  for (const m of modifiers) {
    const modSub = String(m?.subType ?? "")
      .toLowerCase()
      .replace(/\s+/g, "-");
    // Jack of All Trades gives half-proficiency to all ability checks
    if (modSub === "ability-checks" && m.type === "half-proficiency" && level === "none") {
      level = "half";
    }
    if (modSub !== target) continue;
    if (m.type === "expertise") return "expertise";
    if (m.type === "proficiency") level = "proficient";
    if (m.type === "half-proficiency" && level === "none") level = "half";
  }
  return level;
}

function computeSkills(
  modifiers: any[],
  abilities: AbilityScore[],
  pb: number,
  characterValues: any[] = [],
): SkillInfo[] {
  // D&D Beyond skill ID -> skill key (used in characterValues overrides)
  const SKILL_ID_TO_KEY: Record<string, string> = {
    "2": "athletics",
    "3": "acrobatics",
    "4": "sleight-of-hand",
    "5": "stealth",
    "6": "arcana",
    "8": "history",
    "9": "investigation",
    "10": "nature",
    "11": "animal-handling",
    "12": "insight",
    "13": "medicine",
    "14": "perception",
    "15": "religion",
    "16": "deception",
    "17": "intimidation",
    "18": "performance",
    "19": "persuasion",
    "20": "survival",
  };
  // typeId 26 = skill proficiency level override
  // value: 1=half, 2=proficient, 3=expertise
  const overrides: Record<string, "half" | "proficient" | "expertise"> = {};
  for (const cv of characterValues) {
    if (cv?.typeId !== 26) continue;
    const key = SKILL_ID_TO_KEY[String(cv.valueId)];
    if (!key) continue;
    const v = cv.value;
    if (v === 4) overrides[key] = "expertise";
    else if (v === 3) overrides[key] = "proficient";
    else if (v === 2) overrides[key] = "half";
  }
  return SKILLS.map(([key, name, abilityIdx]) => {
    const modProf = computeSkillProficiency(modifiers, key);
    const override = overrides[key];
    // Take the higher of the two
    const rank = { none: 0, half: 1, proficient: 2, expertise: 3 } as const;
    const prof: "none" | "half" | "proficient" | "expertise" =
      override && rank[override] > rank[modProf] ? override : modProf;
    const profBonus =
      prof === "expertise"
        ? pb * 2
        : prof === "proficient"
          ? pb
          : prof === "half"
            ? Math.floor(pb / 2)
            : 0;
    // Flat skill bonuses (rare)
    let extra = 0;
    for (const m of modifiers) {
      const modSub = String(m?.subType ?? "")
        .toLowerCase()
        .replace(/\s+/g, "-");
      if (modSub === key && m?.type === "bonus" && typeof m?.value === "number") {
        extra += m.value;
      }
    }
    return {
      key,
      name,
      ability: ABILITY_NAMES[abilityIdx],
      modifier: abilities[abilityIdx].modifier + profBonus + extra,
      proficiency: prof,
    };
  });
}

function computeHitDice(data: any): string {
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

const ALIGNMENT_MAP: Record<number, string> = {
  1: "Lawful Good",
  2: "Neutral Good",
  3: "Chaotic Good",
  4: "Lawful Neutral",
  5: "True Neutral",
  6: "Chaotic Neutral",
  7: "Lawful Evil",
  8: "Neutral Evil",
  9: "Chaotic Evil",
};

function computeCarryingCapacity(strengthScore: number, modifiers: any[]): number {
  let capacity = strengthScore * 15;
  let multiplier = 1;
  let bonus = 0;
  for (const m of modifiers) {
    if (m?.subType === "carrying-capacity") {
      if (m.type === "bonus" && typeof m.value === "number") {
        bonus += m.value;
      }
      if (m.type === "multiplier" && typeof m.value === "number") {
        multiplier *= m.value;
      }
    } else if (m?.subType === "carrying-capacity-multiplier") {
      if (typeof m.value === "number") {
        multiplier *= m.value;
      }
    }
  }
  return (capacity + bonus) * multiplier;
}

function computeWeightCarried(inventory: any[]): number {
  let total = 0;
  for (const item of inventory ?? []) {
    const weight = item?.definition?.weight ?? 0;
    const qty = item?.quantity ?? 1;
    total += weight * qty;
  }
  return Number(total.toFixed(1));
}

function computeAttacks(
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
        let baseDmgBonus = useMod + magicBonus + genMods.damageBonus;

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

      attacks.push({
        name,
        attackBonus: atkBonus,
        damage: damageFormula,
        damageType: def.damageType ?? "Unknown",
        properties: props,
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

        let baseAtkBonus = typeof fixedToHit === "number" ? fixedToHit : (isProf ? pb : 0) + useMod;

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

        attacks.push({
          name: `${name} (${source.charAt(0).toUpperCase() + source.slice(1)})`,
          attackBonus: atkBonus,
          damage: damageFormula,
          damageType: dmgType,
          properties: [],
          isWeapon: false,
        });
      }
    }
  }

  return attacks;
}

function computeSpellsList(data: any): { cantrips: string[]; preparedSpells: PreparedSpell[] } {
  const cantrips: string[] = [];
  const preparedSpells: PreparedSpell[] = [];

  // 1. Process data.spells (race, background, item, feat, and subclass/class always-prepared)
  const sources = ["race", "class", "background", "item", "feat"] as const;
  for (const source of sources) {
    const list = data?.spells?.[source] ?? [];
    for (const s of list) {
      const def = s.definition ?? {};
      const name = def.name;
      if (!name) continue;
      const level = def.level ?? 0;
      const isCantrip = level === 0;
      const isPrep = !!(
        s.prepared ||
        s.alwaysPrepared ||
        source === "item" ||
        source === "feat" ||
        source === "race"
      );

      if (isCantrip) {
        cantrips.push(name);
      } else if (isPrep) {
        preparedSpells.push({ level, name });
      }
    }
  }

  // 2. Process data.classSpells (spellbook/prepared list/known list)
  const classSpellsList = data?.classSpells ?? [];
  for (const cs of classSpellsList) {
    // Find corresponding class definition
    const klass = data.classes?.find((c: any) => c.id === cs.characterClassId);
    const isPreparedCaster = klass?.definition?.spellPrepareType != null;

    const spells = cs.spells ?? [];
    for (const s of spells) {
      const def = s.definition ?? {};
      const name = def.name;
      if (!name) continue;
      const level = def.level ?? 0;
      const isCantrip = level === 0;

      // Available if:
      // - Cantrip (level === 0)
      // - Or level > 0 and (prepared || alwaysPrepared)
      // - Or level > 0 and (not a prepared caster and countsAsKnownSpell is true)
      const isAvailable =
        isCantrip ||
        !!s.prepared ||
        !!s.alwaysPrepared ||
        (!isPreparedCaster && !!s.countsAsKnownSpell);

      if (isCantrip) {
        cantrips.push(name);
      } else if (isAvailable) {
        preparedSpells.push({ level, name });
      }
    }
  }

  const uniqueCantrips = Array.from(new Set(cantrips)).sort();

  const seenSpells = new Set<string>();
  const uniquePrepared: PreparedSpell[] = [];
  for (const p of preparedSpells) {
    if (!seenSpells.has(p.name)) {
      seenSpells.add(p.name);
      uniquePrepared.push(p);
    }
  }

  uniquePrepared.sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.name.localeCompare(b.name);
  });

  return { cantrips: uniqueCantrips, preparedSpells: uniquePrepared };
}

async function fetchCharacter(id: number): Promise<PartyMember> {
  try {
    const res = await fetch(
      `https://character-service.dndbeyond.com/character/v5/character/${id}`,
      {
        headers: { Accept: "application/json" },
      },
    );
    if (!res.ok) {
      return errorMember(id, `D&D Beyond returned ${res.status}`);
    }
    const payload = (await res.json()) as any;
    if (!payload?.success || !payload?.data) {
      return errorMember(id, payload?.message || "Character not found or not public");
    }
    const data = payload.data;
    const modifiers = flattenModifiers(data);

    const abilities: AbilityScore[] = ABILITY_NAMES.map((name, i) => {
      const score = computeFinalScore(
        data.stats,
        data.bonusStats,
        data.overrideStats,
        modifiers,
        i,
      );
      return { name, score, modifier: mod(score) };
    });

    const totalLevel = (data.classes ?? []).reduce(
      (sum: number, c: any) => sum + (c.level ?? 0),
      0,
    );
    const pb = Math.ceil((totalLevel || 1) / 4) + 1;
    const classes = (data.classes ?? [])
      .map((c: any) => `${c.definition?.name ?? "?"} ${c.level ?? ""}`.trim())
      .join(" / ");
    const subclasses: string[] = (data.classes ?? [])
      .map((c: any) => {
        const sub =
          c?.subclassDefinition?.name ??
          c?.definition?.subclassDefinition?.name ??
          c?.subClassDefinition?.name ??
          c?.subclass?.name ??
          "";
        return typeof sub === "string" ? sub.trim() : "";
      })
      .filter((s: string) => s.length > 0);

    const conMod = abilities[2].modifier;
    const baseHp = data.baseHitPoints ?? 0;
    const bonusHp = data.bonusHitPoints ?? 0;
    const overrideHp = data.overrideHitPoints;
    const removedHp = data.removedHitPoints ?? 0;
    const tempHp = data.temporaryHitPoints ?? 0;

    let hpPerLevelBonus = 0;
    for (const m of modifiers) {
      if (
        m?.type === "bonus" &&
        m?.subType === "hit-points-per-level" &&
        typeof m?.value === "number"
      ) {
        hpPerLevelBonus += m.value;
      }
    }

    const hpMax =
      typeof overrideHp === "number" && overrideHp > 0
        ? overrideHp
        : baseHp + bonusHp + (conMod + hpPerLevelBonus) * totalLevel;
    const hpCurrent = Math.max(0, hpMax - removedHp);

    // Passive skills are calculated at the end after computeSkills

    const dexMod = abilities[DEX_INDEX].modifier;
    const armorClass = computeArmorClass(data, dexMod, modifiers, abilities);

    // Calculate Initiative
    let initiative = dexMod;
    let initBonus = 0;
    for (const m of modifiers) {
      if (m?.subType === "initiative") {
        if (m?.type === "bonus") {
          if (typeof m.value === "number") initBonus += m.value;
          if (typeof m.statId === "number" && m.statId >= 1 && m.statId <= 6) {
            initBonus += abilities[m.statId - 1].modifier;
          }
        } else if (m?.type === "half-proficiency") {
          initBonus += Math.floor(pb / 2);
        } else if (m?.type === "proficiency") {
          initBonus += pb;
        }
      }
    }
    initiative += initBonus;

    // Calculate Speed
    let speed = data.race?.weightSpeeds?.normal?.walk ?? 30;
    let speedBonus = 0;
    for (const m of modifiers) {
      if (
        m?.type === "bonus" &&
        (m?.subType === "speed" ||
          m?.subType === "unarmored-movement" ||
          m?.subType === "innate-speed-walking")
      ) {
        if (typeof m.value === "number") speedBonus += m.value;
      }
      if (
        m?.type === "set" &&
        m?.subType === "innate-speed-walking" &&
        typeof m.value === "number"
      ) {
        if (m.value > speed) speed = m.value;
      }
    }
    speed += speedBonus;

    const senses = computeSenses(modifiers, data.customSenses ?? []);
    const skills = computeSkills(modifiers, abilities, pb, data.characterValues ?? []);
    const saves = computeSaves(modifiers, abilities, pb);
    const { spellSlots, pactSlots } = computeSpellSlots(data);

    // Calculate Spellcasting Save DC and Attack Modifiers
    let spellSaveDcBonus = 0;
    let spellAttackBonus = 0;
    let spellSaveDcSet: number | null = null;
    let spellAttackSet: number | null = null;

    for (const m of modifiers) {
      if (m?.subType === "spell-save-dc" && typeof m?.value === "number") {
        if (m.type === "bonus") spellSaveDcBonus += m.value;
        else if (m.type === "set") spellSaveDcSet = m.value;
      }
      if (m?.subType === "spell-attacks" && typeof m?.value === "number") {
        if (m.type === "bonus") spellAttackBonus += m.value;
        else if (m.type === "set") spellAttackSet = m.value;
      }
    }

    const spellcasting: SpellcastingInfo[] = [];
    for (const c of data.classes ?? []) {
      const isCaster =
        c.definition?.canCastSpells ||
        c.subclassDefinition?.canCastSpells ||
        (c.definition?.spellCastingAbilityId != null && c.definition.spellCastingAbilityId > 0) ||
        (c.subclassDefinition?.spellCastingAbilityId != null &&
          c.subclassDefinition.spellCastingAbilityId > 0);

      if (!isCaster) continue;

      const abilityId =
        c.definition?.spellCastingAbilityId || c.subclassDefinition?.spellCastingAbilityId;
      if (typeof abilityId === "number" && abilityId >= 1 && abilityId <= 6) {
        const abilityIndex = abilityId - 1;
        const abilityName = ABILITY_NAMES[abilityIndex];
        const abilityMod = abilities[abilityIndex].modifier;
        const saveDc =
          spellSaveDcSet !== null ? spellSaveDcSet : 8 + pb + abilityMod + spellSaveDcBonus;
        const attackBonus =
          spellAttackSet !== null ? spellAttackSet : pb + abilityMod + spellAttackBonus;
        spellcasting.push({
          className: c.definition?.name ?? "Caster",
          ability: abilityName,
          saveDc,
          attackBonus,
        });
      }
    }

    const defenses = computeDefenses(modifiers);
    const actions = computeActions(data, abilities, pb);
    const inventory = computeInventory(data);
    let exhaustion = 0;
    const conditions: string[] = [];
    let languages: string[] = [];
    let tools: string[] = [];
    for (const m of modifiers) {
      if (m?.type === "language" && m?.friendlySubtypeName) {
        languages.push(m.friendlySubtypeName);
      }
      if (m?.type === "proficiency") {
        const name = m?.friendlySubtypeName;
        if (name) {
          const isTool =
            m?.entityTypeId === 2103445194 ||
            name.toLowerCase().includes("tool") ||
            name.toLowerCase().includes("kit") ||
            name.toLowerCase().includes("supplies") ||
            name.toLowerCase().includes("gaming set") ||
            name.toLowerCase().includes("instruments") ||
            name.toLowerCase().includes("instrument") ||
            name.toLowerCase().includes("vehicles") ||
            name.toLowerCase().includes("vehicle");
          if (isTool) {
            tools.push(name);
          }
        }
      }
    }

    if (Array.isArray(data.customProficiencies)) {
      for (const cp of data.customProficiencies) {
        const name = cp?.name;
        if (!name) continue;
        const type = String(cp?.type ?? "").toLowerCase();
        if (type === "language") {
          languages.push(name);
        } else if (
          type === "tool" ||
          type.includes("tool") ||
          name.toLowerCase().includes("tool") ||
          name.toLowerCase().includes("kit") ||
          name.toLowerCase().includes("supplies") ||
          name.toLowerCase().includes("gaming set") ||
          name.toLowerCase().includes("instruments") ||
          name.toLowerCase().includes("instrument") ||
          name.toLowerCase().includes("vehicles") ||
          name.toLowerCase().includes("vehicle")
        ) {
          tools.push(name);
        }
      }
    }

    languages = Array.from(new Set(languages)).sort();
    tools = Array.from(new Set(tools)).sort();

    if (Array.isArray(data.conditions)) {
      for (const c of data.conditions) {
        const name: string | undefined = c?.definition?.name ?? c?.name;
        if (!name) continue;
        if (/exhaustion/i.test(name)) {
          exhaustion = Math.max(exhaustion, c?.level ?? 1);
          continue;
        }
        conditions.push(name);
      }
    }

    const ds = data.deathSaves ?? {};
    const deathSaves: DeathSaves = {
      successes: ds.successCount ?? 0,
      failures: ds.failCount ?? 0,
      stabilized: !!ds.isStabilized,
    };

    const background =
      data.background?.definition?.name ?? data.background?.customBackground?.name ?? "";

    const perceptionSkill = skills.find((s) => s.key === "perception");
    const investigationSkill = skills.find((s) => s.key === "investigation");
    const insightSkill = skills.find((s) => s.key === "insight");

    let passivePerceptionBonus = 0;
    let passiveInvestigationBonus = 0;
    let passiveInsightBonus = 0;

    for (const m of modifiers) {
      if (m?.type === "bonus" && typeof m?.value === "number") {
        if (m.subType === "passive-perception") passivePerceptionBonus += m.value;
        if (m.subType === "passive-investigation") passiveInvestigationBonus += m.value;
        if (m.subType === "passive-insight") passiveInsightBonus += m.value;
      }
    }

    const passivePerception =
      10 + (perceptionSkill?.modifier ?? abilities[WIS_INDEX].modifier) + passivePerceptionBonus;
    const passiveInvestigation =
      10 + (investigationSkill?.modifier ?? abilities[3].modifier) + passiveInvestigationBonus;
    const passiveInsight =
      10 + (insightSkill?.modifier ?? abilities[WIS_INDEX].modifier) + passiveInsightBonus;

    const hitDice = computeHitDice(data);
    const optionLabels = new Map<number, string>();
    for (const def of data.choices?.choiceDefinitions ?? []) {
      for (const opt of def.options ?? []) {
        if (opt.id != null && opt.label) {
          optionLabels.set(Number(opt.id), opt.label);
        }
      }
    }

    const featsMap = new Map<string, { name: string; description: string; choices: string[] }>();
    for (const f of data.feats ?? []) {
      const def = f.definition;
      if (!def) continue;

      // Filter out internal system placeholder / disguise feats (starting with double underscore)
      const categories = def.categories ?? [];
      const isHidden = categories.some((c: any) => c.tagName && c.tagName.startsWith("__"));
      if (isHidden) continue;

      const name = (def.name ?? "").replace(/^\d+:\s*/, "");
      if (!name) continue;
      const desc = def.snippet || def.description || "";

      const featChoices: string[] = [];
      const featId = def.id;
      if (data.choices?.feat) {
        for (const choice of data.choices.feat) {
          if (choice.componentId === featId && choice.optionValue != null) {
            const label = optionLabels.get(Number(choice.optionValue));
            if (label) {
              const cleanLabel = label.endsWith(" Score") ? label.replace(" Score", "") : label;
              featChoices.push(cleanLabel);
            }
          }
        }
      }
      featsMap.set(name, { name, description: desc, choices: featChoices });
    }
    const feats = Array.from(featsMap.values())
      .map(({ name, description, choices }) => ({ name, description, choices }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const alignment = ALIGNMENT_MAP[data.alignmentId ?? 0] ?? null;

    const currencies = {
      cp: data.currencies?.cp ?? 0,
      sp: data.currencies?.sp ?? 0,
      ep: data.currencies?.ep ?? 0,
      gp: data.currencies?.gp ?? 0,
      pp: data.currencies?.pp ?? 0,
    };

    const weightCarried = computeWeightCarried(data.inventory);
    const carryingCapacity = computeCarryingCapacity(abilities[0].score, modifiers);

    const attacks = computeAttacks(data, abilities, pb, modifiers);
    const { cantrips, preparedSpells } = computeSpellsList(data);

    return {
      id: data.id,
      name: data.name ?? "Unnamed",
      avatarUrl: data.decorations?.avatarUrl ?? null,
      race: data.race?.fullName ?? data.race?.baseName ?? "Unknown",
      background,
      classes: classes || "—",
      subclasses,
      level: totalLevel,
      hpMax,
      hpCurrent,
      tempHp,
      inspiration: !!data.inspiration,
      exhaustion,
      deathSaves,
      passivePerception,
      passiveInvestigation,
      passiveInsight,
      armorClass,
      initiative,
      speed,
      proficiencyBonus: pb,
      senses,
      skills,
      saves,
      spellSlots,
      pactSlots,
      abilities,
      conditions,
      languages,
      tools,
      spellcasting,
      hitDice,
      feats,
      alignment,
      currencies,
      weightCarried,
      carryingCapacity,
      attacks,
      cantrips,
      preparedSpells,
      defenses,
      actions,
      inventory,
      readonlyUrl: data.readonlyUrl ?? `https://www.dndbeyond.com/characters/${id}`,
    };
  } catch (err: any) {
    return errorMember(id, err?.message ?? "Fetch failed");
  }
}

function titleCase(s: string): string {
  return s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function computeDefenses(modifiers: any[]): DefenseInfo[] {
  const seen = new Set<string>();
  const out: DefenseInfo[] = [];
  for (const m of modifiers) {
    let type: DefenseInfo["type"] | null = null;
    if (m?.type === "resistance") type = "resistance";
    else if (m?.type === "immunity") type = "immunity";
    else if (m?.type === "vulnerability") type = "vulnerability";
    if (!type) continue;
    const raw = m?.friendlySubtypeName || m?.subType || "";
    if (!raw) continue;
    const damageType = titleCase(String(raw));
    const key = `${type}:${damageType.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ type, damageType });
  }
  return out;
}

function computeActions(data: any, abilities: AbilityScore[], pb: number): ActionInfo[] {
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
        const info: ActionInfo = { name, source };
        const lu = a?.limitedUse;
        if (lu && typeof lu.maxUses === "number") {
          // statModifierUsesId: 1=STR,2=DEX,3=CON,4=INT,5=WIS,6=CHA
          // operator: 1 = add stat mod to maxUses, 2 = multiply maxUses by stat mod
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

function errorMember(id: number, message: string): PartyMember {
  return {
    id,
    name: `Character ${id}`,
    avatarUrl: null,
    race: "—",
    background: "",
    classes: "—",
    subclasses: [],
    level: 0,
    hpMax: 0,
    hpCurrent: 0,
    tempHp: 0,
    inspiration: false,
    exhaustion: 0,
    deathSaves: { successes: 0, failures: 0, stabilized: false },
    passivePerception: 0,
    passiveInvestigation: 0,
    passiveInsight: 0,
    armorClass: 0,
    initiative: 0,
    speed: 0,
    proficiencyBonus: 0,
    senses: [],
    skills: [],
    saves: [],
    spellSlots: [],
    pactSlots: [],
    abilities: ABILITY_NAMES.map((name) => ({ name, score: 0, modifier: 0 })),
    conditions: [],
    defenses: [],
    actions: [],
    inventory: [],
    languages: [],
    tools: [],
    spellcasting: [],
    hitDice: "—",
    feats: [],
    alignment: null,
    currencies: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    weightCarried: 0,
    carryingCapacity: 0,
    attacks: [],
    cantrips: [],
    preparedSpells: [],
    readonlyUrl: `https://www.dndbeyond.com/characters/${id}`,
    error: message,
  };
}

const RARITY_ORDER = [
  "Mundane",
  "Common",
  "Uncommon",
  "Rare",
  "Very Rare",
  "Legendary",
  "Artifact",
];

function computeInventory(data: any): InventoryItem[] {
  const inv: any[] = data?.inventory ?? [];
  const out: InventoryItem[] = [];
  for (const i of inv) {
    const def = i?.definition ?? {};
    const name: string = def.name;
    if (!name) continue;
    const type: string = def.type ?? def.filterType ?? "Item";
    const rarity: string | null = def.rarity ?? null;
    const magic = !!def.magic || (!!rarity && rarity !== "Common" && rarity !== "Mundane");
    out.push({
      name,
      type,
      rarity,
      magic,
      equipped: !!i.equipped,
      attuned: !!i.isAttuned,
      quantity: i.quantity ?? 1,
    });
  }
  // Sort: attuned > equipped magic > equipped > other magic > rest; within: by rarity desc, then name
  out.sort((a, b) => {
    const rank = (x: InventoryItem) =>
      x.attuned ? 0 : x.equipped && x.magic ? 1 : x.equipped ? 2 : x.magic ? 3 : 4;
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    const rIdx = (x: InventoryItem) => (x.rarity ? RARITY_ORDER.indexOf(x.rarity) : -1);
    const ria = rIdx(a);
    const rib = rIdx(b);
    if (ria !== rib) return rib - ria;
    return a.name.localeCompare(b.name);
  });
  return out;
}

export async function loadParty(ids: number[] = PARTY_CHARACTER_IDS): Promise<PartyMember[]> {
  return Promise.all(ids.map(fetchCharacter));
}

export const getParty = createServerFn({ method: "GET" })
  .inputValidator((input?: { ids?: number[] }) => {
    const ids = Array.isArray(input?.ids)
      ? input!.ids!.filter((n) => Number.isInteger(n) && n > 0).slice(0, 12)
      : [];
    return { ids };
  })
  .handler(async ({ data }) => {
    const ids = data.ids.length > 0 ? data.ids : PARTY_CHARACTER_IDS;
    const members = await loadParty(ids);
    return { members, fetchedAt: new Date().toISOString() };
  });
