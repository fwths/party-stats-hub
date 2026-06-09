import { createServerFn } from "@tanstack/react-start";
import { PARTY_CHARACTER_IDS } from "./party-config";

export interface AbilityScore {
  name: string;
  score: number;
  modifier: number;
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
  abilities: AbilityScore[];
  readonlyUrl: string;
  error?: string;
}

const ABILITY_NAMES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;
const ABILITY_ID_TO_INDEX: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };
const WIS_INDEX = 4;

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