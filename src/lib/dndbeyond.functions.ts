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

export interface PartyMember {
  id: number;
  name: string;
  avatarUrl: string | null;
  race: string;
  classes: string;
  level: number;
  hpMax: number;
  hpCurrent: number;
  tempHp: number;
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
  readonlyUrl: string;
  error?: string;
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
  [0, 0], [1, 1], [1, 2], [2, 2], [2, 2], [3, 2], [3, 2], [4, 2], [4, 2],
  [5, 2], [5, 2], [5, 3], [5, 3], [5, 3], [5, 3], [5, 3], [5, 3], [5, 4],
  [5, 4], [5, 4], [5, 4],
];

function casterLevelFor(className: string, level: number, subclass: string): number {
  const n = className.toLowerCase();
  if (["bard", "cleric", "druid", "sorcerer", "wizard"].includes(n)) return level;
  if (n === "artificer") return Math.ceil(level / 2); // artificer rounds up
  if (["paladin", "ranger"].includes(n)) return level >= 2 ? Math.floor(level / 2) : 0;
  if (n === "fighter" && /eldritch knight/i.test(subclass)) return level >= 3 ? Math.floor(level / 3) : 0;
  if (n === "rogue" && /arcane trickster/i.test(subclass)) return level >= 3 ? Math.floor(level / 3) : 0;
  return 0;
}

function computeSpellSlots(data: any): { spellSlots: SpellSlotLevel[]; pactSlots: SpellSlotLevel[] } {
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
  // Flat bonus that applies to all saves (e.g. Cloak of Protection)
  let allSavesBonus = 0;
  for (const m of modifiers) {
    if (m?.subType === "saving-throws" && m?.type === "bonus" && typeof m?.value === "number") {
      allSavesBonus += m.value;
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
  const subType = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"][abilityIndex] + "-score";
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

function computeArmorClass(data: any, dexMod: number): number {
  const inv: any[] = data.inventory ?? [];
  const equippedArmor = inv.filter(
    (i) => i.equipped && i.definition?.filterType === "Armor",
  );
  // armorTypeId: 1=light, 2=medium, 3=heavy, 4=shield
  const body = equippedArmor.filter((i) => (i.definition?.armorTypeId ?? 0) <= 3);
  const shields = equippedArmor.filter((i) => i.definition?.armorTypeId === 4);
  let ac = 10 + dexMod;
  if (body.length > 0) {
    // pick the highest-base body armor
    const best = body.reduce((a, b) =>
      (b.definition.armorClass ?? 0) > (a.definition.armorClass ?? 0) ? b : a,
    );
    const base = best.definition.armorClass ?? 10;
    const type = best.definition.armorTypeId;
    if (type === 1) ac = base + dexMod;
    else if (type === 2) ac = base + Math.min(dexMod, 2);
    else ac = base; // heavy
  }
  if (shields.length > 0) {
    const bestShield = shields.reduce((a, b) =>
      (b.definition.armorClass ?? 0) > (a.definition.armorClass ?? 0) ? b : a,
    );
    ac += bestShield.definition.armorClass ?? 0;
  }
  return ac;
}

function computeSenses(modifiers: any[], customSenses: any[]): SenseInfo[] {
  const map = new Map<string, number | null>();
  for (const m of modifiers) {
    if (m?.type === "set-base" || m?.type === "sense" || m?.type === "set") {
      const name = m?.friendlySubtypeName;
      const val = typeof m?.value === "number" ? m.value : null;
      if (name && (m?.subType?.includes("darkvision") || m?.subType?.includes("vision") || m?.subType?.includes("sight") || m?.subType?.includes("sense"))) {
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
  let level: "none" | "half" | "proficient" = "none";
  for (const m of modifiers) {
    if (m?.subType !== subType) continue;
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
): SkillInfo[] {
  return SKILLS.map(([key, name, abilityIdx]) => {
    const prof = computeSkillProficiency(modifiers, key);
    const profBonus =
      prof === "expertise" ? pb * 2 : prof === "proficient" ? pb : prof === "half" ? Math.floor(pb / 2) : 0;
    // Flat skill bonuses (rare)
    let extra = 0;
    for (const m of modifiers) {
      if (m?.subType === key && m?.type === "bonus" && typeof m?.value === "number") {
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

async function fetchCharacter(id: number): Promise<PartyMember> {
  try {
    const res = await fetch(`https://character-service.dndbeyond.com/character/v5/character/${id}`, {
      headers: { Accept: "application/json" },
    });
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
      const score = computeFinalScore(data.stats, data.bonusStats, data.overrideStats, modifiers, i);
      return { name, score, modifier: mod(score) };
    });

    const totalLevel = (data.classes ?? []).reduce((sum: number, c: any) => sum + (c.level ?? 0), 0);
    const classes = (data.classes ?? [])
      .map((c: any) => `${c.definition?.name ?? "?"} ${c.level ?? ""}`.trim())
      .join(" / ");

    const conMod = abilities[2].modifier;
    const baseHp = data.baseHitPoints ?? 0;
    const bonusHp = data.bonusHitPoints ?? 0;
    const overrideHp = data.overrideHitPoints;
    const removedHp = data.removedHitPoints ?? 0;
    const tempHp = data.temporaryHitPoints ?? 0;
    const hpMax =
      typeof overrideHp === "number" && overrideHp > 0
        ? overrideHp
        : baseHp + bonusHp + conMod * totalLevel;
    const hpCurrent = Math.max(0, hpMax - removedHp);

    // Passive perception: 10 + WIS mod + (proficient in Perception ? prof bonus : 0)
    const wisMod = abilities[WIS_INDEX].modifier;
    const pb = proficiencyBonus(totalLevel);
    const perceptionProficient = modifiers.some(
      (m) => m?.type === "proficiency" && m?.subType === "perception",
    );
    const perceptionExpertise = modifiers.some(
      (m) => m?.type === "expertise" && m?.subType === "perception",
    );
    const passivePerception =
      10 + wisMod + (perceptionExpertise ? pb * 2 : perceptionProficient ? pb : 0);

    const dexMod = abilities[DEX_INDEX].modifier;
    const armorClass = computeArmorClass(data, dexMod);
    const initiative = dexMod;
    const speed = data.race?.weightSpeeds?.normal?.walk ?? 30;
    const senses = computeSenses(modifiers, data.customSenses ?? []);
    const skills = computeSkills(modifiers, abilities, pb);
    const saves = computeSaves(modifiers, abilities, pb);
    const { spellSlots, pactSlots } = computeSpellSlots(data);

    const investigationSkill = skills.find((s) => s.key === "investigation");
    const insightSkill = skills.find((s) => s.key === "insight");
    const passiveInvestigation = 10 + (investigationSkill?.modifier ?? abilities[3].modifier);
    const passiveInsight = 10 + (insightSkill?.modifier ?? abilities[WIS_INDEX].modifier);

    return {
      id: data.id,
      name: data.name ?? "Unnamed",
      avatarUrl: data.decorations?.avatarUrl ?? null,
      race: data.race?.fullName ?? data.race?.baseName ?? "Unknown",
      classes: classes || "—",
      level: totalLevel,
      hpMax,
      hpCurrent,
      tempHp,
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
      readonlyUrl: data.readonlyUrl ?? `https://www.dndbeyond.com/characters/${id}`,
    };
  } catch (err: any) {
    return errorMember(id, err?.message ?? "Fetch failed");
  }
}

function errorMember(id: number, message: string): PartyMember {
  return {
    id,
    name: `Character ${id}`,
    avatarUrl: null,
    race: "—",
    classes: "—",
    level: 0,
    hpMax: 0,
    hpCurrent: 0,
    tempHp: 0,
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
    readonlyUrl: `https://www.dndbeyond.com/characters/${id}`,
    error: message,
  };
}

export async function loadParty(ids: number[] = PARTY_CHARACTER_IDS): Promise<PartyMember[]> {
  return Promise.all(ids.map(fetchCharacter));
}

export const getParty = createServerFn({ method: "GET" }).handler(async () => {
  const members = await loadParty();
  return { members, fetchedAt: new Date().toISOString() };
});