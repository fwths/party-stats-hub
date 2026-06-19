import {
  ActionInfo,
  AttackInfo,
  FeatureInfo,
  InventoryItem,
  PartyMember,
  PreparedSpell,
  SaveInfo,
  SkillInfo,
} from "./dndbeyond.types";

import { createServerFn } from "@tanstack/react-start";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { z } from "zod";
import { normalizeActiveEffects } from "./rules-effects";

const ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
const SKILLS = [
  { key: "acrobatics", name: "Acrobatics", ability: "DEX" },
  { key: "animal-handling", name: "Animal Handling", ability: "WIS" },
  { key: "arcana", name: "Arcana", ability: "INT" },
  { key: "athletics", name: "Athletics", ability: "STR" },
  { key: "deception", name: "Deception", ability: "CHA" },
  { key: "history", name: "History", ability: "INT" },
  { key: "insight", name: "Insight", ability: "WIS" },
  { key: "intimidation", name: "Intimidation", ability: "CHA" },
  { key: "investigation", name: "Investigation", ability: "INT" },
  { key: "medicine", name: "Medicine", ability: "WIS" },
  { key: "nature", name: "Nature", ability: "INT" },
  { key: "perception", name: "Perception", ability: "WIS" },
  { key: "performance", name: "Performance", ability: "CHA" },
  { key: "persuasion", name: "Persuasion", ability: "CHA" },
  { key: "religion", name: "Religion", ability: "INT" },
  { key: "sleight-of-hand", name: "Sleight of Hand", ability: "DEX" },
  { key: "stealth", name: "Stealth", ability: "DEX" },
  { key: "survival", name: "Survival", ability: "WIS" },
];

function parseJsonValue(value: unknown, fallback: any) {
  if (value == null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function getField(item: any, camel: string, snake: string) {
  return item?.[camel] ?? item?.[snake];
}

function stripTags(value: unknown): string {
  return String(value ?? "")
    .replace(
      /\{@(?:spell|item|condition|skill|sense|action|dc|damage|filter|book|note|b|i|scaledice|dice)\s+([^}|]+)(?:\|[^}]*)?\}/g,
      "$1",
    )
    .replace(/\{@[^}]+\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeName(value: unknown): string {
  return stripTags(value)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function modifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function toAbility(value: string): string {
  return value.slice(0, 3).toUpperCase();
}

function asStringArray(value: unknown): string[] {
  const parsed = parseJsonValue(value, []);
  if (!parsed) return [];
  if (Array.isArray(parsed)) {
    return parsed
      .flatMap((item) => {
        if (typeof item === "string") return [normalizeName(item)];
        if (item?.name) return [normalizeName(item.name)];
        if (item?.choose) return [];
        return [];
      })
      .filter(Boolean);
  }
  if (typeof parsed === "object") {
    return Object.entries(parsed)
      .filter(([, enabled]) => enabled === true || typeof enabled === "number")
      .map(([name]) => normalizeName(name));
  }
  return [normalizeName(parsed)];
}

function parseProficiencyNames(value: unknown, type?: "skills" | "tools"): string[] {
  const parsed = parseJsonValue(value, []);
  if (Array.isArray(parsed)) return parsed.map(normalizeName).filter(Boolean);
  if (!parsed || typeof parsed !== "object") return [];

  const selected = type ? parsed[type] : parsed;
  if (Array.isArray(selected)) {
    return selected
      .flatMap((entry: any) => {
        if (typeof entry === "string") return [normalizeName(entry)];
        if (entry?.proficiency) return [normalizeName(entry.proficiency)];
        if (entry?.skill) return [normalizeName(entry.skill)];
        if (entry?.tool) return [normalizeName(entry.tool)];
        return [];
      })
      .filter(Boolean);
  }
  return [];
}

function parseFixedLanguages(value: unknown): string[] {
  const parsed = parseJsonValue(value, []);
  const values = Array.isArray(parsed) ? parsed : [parsed];
  const ignored = new Set(["any", "anystandard", "other", "choose"]);
  return values.flatMap((entry: any) => {
    if (!entry || typeof entry !== "object") return [];
    return Object.entries(entry)
      .filter(([key, enabled]) => !ignored.has(key.toLowerCase()) && enabled === true)
      .map(([key]) => normalizeName(key));
  });
}

function parseSenses(value: unknown) {
  return asStringArray(value).map((sense) => {
    const match = sense.match(/^(.+?)\s+(\d+)/);
    return {
      name: match ? match[1].trim() : sense,
      value: match ? Number(match[2]) : null,
    };
  });
}

function parseDefenses(value: unknown, type: "resistance" | "immunity" | "vulnerability") {
  return asStringArray(value).map((damageType) => ({ type, damageType }));
}

function parseFeatureEntries(
  value: unknown,
  source: "class" | "race" | "background" | "other" | "feat",
  sourceName: string,
) {
  const parsed = parseJsonValue(value, []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((entry: any) => {
      if (typeof entry === "string") {
        return { name: stripTags(entry), description: "", source, sourceName, isUnlocked: true };
      }
      return {
        name: stripTags(entry?.name || sourceName),
        description: stripTags(
          Array.isArray(entry?.entries) ? entry.entries.join(" ") : entry?.description || "",
        ),
        source,
        sourceName,
        level: entry?.level,
        isUnlocked: true,
      };
    })
    .filter((feature) => feature.name);
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getEquipmentPackages(raw: unknown): Record<string, any[]> {
  const parsed = parseJsonValue(raw, {});
  const packages = Array.isArray(parsed) ? parsed[0] : parsed?.defaultData?.[0];
  return packages && typeof packages === "object" ? packages : {};
}

function getSelectedEquipment(raw: unknown, optionId: string | null | undefined): any[] {
  const packages = getEquipmentPackages(raw);
  if (!optionId || !packages[optionId]) return [];
  return packages[optionId];
}

function equipmentItemName(item: any): string {
  if (item.displayName) return normalizeName(item.displayName);
  if (item.item) return normalizeName(String(item.item).split("|")[0]);
  if (item.equipmentType) return normalizeName(item.equipmentType);
  if (item.special) return normalizeName(item.special);
  return "Equipment";
}

const WEAPON_DAMAGE: Record<string, { damage: string; damageType: string; properties: string[] }> =
  {
    Club: { damage: "1d4", damageType: "Bludgeoning", properties: ["Light"] },
    Dagger: { damage: "1d4", damageType: "Piercing", properties: ["Finesse", "Light", "Thrown"] },
    Greatclub: { damage: "1d8", damageType: "Bludgeoning", properties: ["Two-Handed"] },
    Handaxe: { damage: "1d6", damageType: "Slashing", properties: ["Light", "Thrown"] },
    Javelin: { damage: "1d6", damageType: "Piercing", properties: ["Thrown"] },
    "Light Hammer": { damage: "1d4", damageType: "Bludgeoning", properties: ["Light", "Thrown"] },
    Mace: { damage: "1d6", damageType: "Bludgeoning", properties: [] },
    Quarterstaff: { damage: "1d6", damageType: "Bludgeoning", properties: ["Versatile"] },
    Sickle: { damage: "1d4", damageType: "Slashing", properties: ["Light"] },
    Spear: { damage: "1d6", damageType: "Piercing", properties: ["Thrown", "Versatile"] },
    Crossbow: { damage: "1d8", damageType: "Piercing", properties: ["Ammunition", "Loading"] },
    Dart: { damage: "1d4", damageType: "Piercing", properties: ["Finesse", "Thrown"] },
    Shortbow: { damage: "1d6", damageType: "Piercing", properties: ["Ammunition", "Two-Handed"] },
    Sling: { damage: "1d4", damageType: "Bludgeoning", properties: ["Ammunition"] },
    Battleaxe: { damage: "1d8", damageType: "Slashing", properties: ["Versatile"] },
    Flail: { damage: "1d8", damageType: "Bludgeoning", properties: [] },
    Glaive: {
      damage: "1d10",
      damageType: "Slashing",
      properties: ["Heavy", "Reach", "Two-Handed"],
    },
    Greataxe: { damage: "1d12", damageType: "Slashing", properties: ["Heavy", "Two-Handed"] },
    Greatsword: { damage: "2d6", damageType: "Slashing", properties: ["Heavy", "Two-Handed"] },
    Halberd: {
      damage: "1d10",
      damageType: "Slashing",
      properties: ["Heavy", "Reach", "Two-Handed"],
    },
    Lance: { damage: "1d10", damageType: "Piercing", properties: ["Reach"] },
    Longsword: { damage: "1d8", damageType: "Slashing", properties: ["Versatile"] },
    Maul: { damage: "2d6", damageType: "Bludgeoning", properties: ["Heavy", "Two-Handed"] },
    Morningstar: { damage: "1d8", damageType: "Piercing", properties: [] },
    Pike: { damage: "1d10", damageType: "Piercing", properties: ["Heavy", "Reach", "Two-Handed"] },
    Rapier: { damage: "1d8", damageType: "Piercing", properties: ["Finesse"] },
    Scimitar: { damage: "1d6", damageType: "Slashing", properties: ["Finesse", "Light"] },
    Shortsword: { damage: "1d6", damageType: "Piercing", properties: ["Finesse", "Light"] },
    Trident: { damage: "1d6", damageType: "Piercing", properties: ["Thrown", "Versatile"] },
    Warhammer: { damage: "1d8", damageType: "Bludgeoning", properties: ["Versatile"] },
    Whip: { damage: "1d4", damageType: "Slashing", properties: ["Finesse", "Reach"] },
    Blowgun: { damage: "1", damageType: "Piercing", properties: ["Ammunition", "Loading"] },
    Longbow: {
      damage: "1d8",
      damageType: "Piercing",
      properties: ["Ammunition", "Heavy", "Two-Handed"],
    },
  };

const ARMOR_AC: Record<string, { type: string; base: number; maxDex?: number }> = {
  "Padded Armor": { type: "Light Armor", base: 11 },
  "Leather Armor": { type: "Light Armor", base: 11 },
  "Studded Leather Armor": { type: "Light Armor", base: 12 },
  "Hide Armor": { type: "Medium Armor", base: 12, maxDex: 2 },
  "Chain Shirt": { type: "Medium Armor", base: 13, maxDex: 2 },
  "Scale Mail": { type: "Medium Armor", base: 14, maxDex: 2 },
  Breastplate: { type: "Medium Armor", base: 14, maxDex: 2 },
  "Half Plate Armor": { type: "Medium Armor", base: 15, maxDex: 2 },
  "Ring Mail": { type: "Heavy Armor", base: 14, maxDex: 0 },
  "Chain Mail": { type: "Heavy Armor", base: 16, maxDex: 0 },
  "Splint Armor": { type: "Heavy Armor", base: 17, maxDex: 0 },
  "Plate Armor": { type: "Heavy Armor", base: 18, maxDex: 0 },
};

function inferInventoryItem(item: any): InventoryItem {
  const name = equipmentItemName(item);
  const weapon = WEAPON_DAMAGE[name];
  const armor = ARMOR_AC[name];
  const isShield = name === "Shield";

  return {
    name,
    type: weapon ? "Weapon" : isShield ? "Shield" : armor?.type || "Adventuring Gear",
    rarity: "Mundane",
    magic: false,
    equipped: item.equipped !== undefined ? Boolean(item.equipped) : Boolean(weapon || armor || isShield),
    attuned: item.attuned !== undefined ? Boolean(item.attuned) : false,
    quantity: item.quantity || 1,
    damage: weapon?.damage,
    properties: weapon?.properties,
    armorClass: isShield ? 2 : armor?.base,
    description: item.special ? normalizeName(item.special) : undefined,
  };
}

function equipmentToInventory(items: any[]) {
  return items.filter((item) => !item.value).map(inferInventoryItem);
}

function equipmentToCurrencies(items: any[]) {
  const copperValue = items.reduce((total, item) => total + Number(item.value || 0), 0);
  return {
    cp: copperValue % 10,
    sp: Math.floor(copperValue / 10) % 10,
    ep: 0,
    gp: Math.floor(copperValue / 100),
    pp: 0,
  };
}

function calculateArmorClass(inventory: InventoryItem[], dexMod: number): number {
  const shieldBonus = inventory.some((item) => item.name === "Shield" && item.equipped) ? 2 : 0;
  const equippedArmor = inventory
    .filter((item) => item.equipped && item.armorClass && item.name !== "Shield")
    .sort((a, b) => Number(b.armorClass || 0) - Number(a.armorClass || 0))[0];

  if (!equippedArmor?.armorClass) return 10 + dexMod + shieldBonus;

  const armor = ARMOR_AC[equippedArmor.name];
  const dexBonus = armor?.maxDex === 0 ? 0 : Math.min(dexMod, armor?.maxDex ?? dexMod);
  return equippedArmor.armorClass + dexBonus + shieldBonus;
}

function inventoryToAttacks(
  inventory: InventoryItem[],
  finalScores: Record<string, number>,
  proficiencyBonus: number,
): AttackInfo[] {
  return inventory
    .filter((item) => item.type === "Weapon" && item.damage)
    .map((item) => {
      const weapon = WEAPON_DAMAGE[item.name];
      const isRanged = item.properties?.includes("Ammunition");
      const isFinesse = item.properties?.includes("Finesse");
      const strengthMod = modifier(finalScores.STR);
      const dexMod = modifier(finalScores.DEX);
      const abilityMod = isRanged
        ? dexMod
        : isFinesse
          ? Math.max(strengthMod, dexMod)
          : strengthMod;
      return {
        name: item.name,
        attackBonus: proficiencyBonus + abilityMod,
        damage: `${item.damage}${abilityMod >= 0 ? `+${abilityMod}` : abilityMod}`,
        damageType: weapon?.damageType || "",
        properties: item.properties || [],
        isWeapon: true,
      };
    });
}

function spellToPreparedSpell(spell: any): PreparedSpell {
  return {
    level: spell.level || 0,
    name: spell.name,
    description: stripTags(spell.description),
    school: spell.school,
    activation: { activationTime: 1, activationType: 1 },
    range: {
      origin: spell.range || "Self",
      rangeValue: null,
      aoeType: null,
      aoeValue: null,
    },
    duration: {
      durationType: spell.duration || "Instantaneous",
      durationInterval: null,
      durationUnit: null,
    },
    components: [],
    componentsDescription: "",
    concentration: !!spell.concentration,
    ritual: !!spell.ritual,
    prepared: true,
    alwaysPrepared: false,
  };
}

const FULL_CASTER_SLOTS: number[][] = [
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
const PACT_SLOTS: Array<{ level: number; slots: number }> = [
  { level: 1, slots: 1 },
  { level: 1, slots: 2 },
  { level: 2, slots: 2 },
  { level: 2, slots: 2 },
  { level: 3, slots: 2 },
  { level: 3, slots: 2 },
  { level: 4, slots: 2 },
  { level: 4, slots: 2 },
  { level: 5, slots: 2 },
  { level: 5, slots: 2 },
  { level: 5, slots: 3 },
  { level: 5, slots: 3 },
  { level: 5, slots: 3 },
  { level: 5, slots: 3 },
  { level: 5, slots: 3 },
  { level: 5, slots: 3 },
  { level: 5, slots: 4 },
  { level: 5, slots: 4 },
  { level: 5, slots: 4 },
  { level: 5, slots: 4 },
];

function getSpellSlots(level: number, progression: string) {
  if (!progression || progression === "pact") return [];
  const effectiveLevel =
    progression === "full"
      ? level
      : progression === "artificer" || progression === "half"
        ? Math.max(1, Math.ceil(level / 2))
        : progression === "third"
          ? Math.max(1, Math.ceil(level / 3))
          : 0;
  if (!effectiveLevel) return [];
  return (FULL_CASTER_SLOTS[Math.min(20, effectiveLevel) - 1] || []).map((max, index) => ({
    level: index + 1,
    max,
    used: 0,
  }));
}

function getPactSlots(level: number, progression: string) {
  if (progression !== "pact") return [];
  const pact = PACT_SLOTS[Math.min(20, Math.max(1, level)) - 1];
  return pact ? [{ level: pact.level, max: pact.slots, used: 0 }] : [];
}

const DRAGON_DAMAGE_BY_ANCESTRY: Record<string, string> = {
  Black: "Acid",
  Blue: "Lightning",
  Brass: "Fire",
  Bronze: "Lightning",
  Copper: "Acid",
  Gold: "Fire",
  Green: "Poison",
  Red: "Fire",
  Silver: "Cold",
  White: "Cold",
  Amethyst: "Force",
  Crystal: "Radiant",
  Emerald: "Psychic",
  Sapphire: "Thunder",
  Topaz: "Necrotic",
};

function makeTraitSpell(name: string, level: number): PreparedSpell {
  return spellToPreparedSpell({
    name,
    level,
    description: "Granted by species trait.",
    school: "",
    range: "",
    duration: "",
  });
}

function getSpeciesTraitEffects(
  raceId: string | undefined,
  choices: Record<string, string>,
  level: number,
) {
  const effects: {
    speed?: number;
    senses: Array<{ name: string; value: number | null }>;
    defenses: Array<{ type: "resistance"; damageType: string }>;
    features: Array<{
      name: string;
      description: string;
      source: "race";
      sourceName: string;
      isUnlocked: boolean;
    }>;
    cantrips: PreparedSpell[];
    preparedSpells: PreparedSpell[];
  } = { senses: [], defenses: [], features: [], cantrips: [], preparedSpells: [] };

  const addFeature = (name: string, description: string) => {
    effects.features.push({
      name,
      description,
      source: "race",
      sourceName: name,
      isUnlocked: true,
    });
  };
  const addProgressionSpell = (spellLevel: number, name: string) => {
    if (level >= spellLevel)
      effects.preparedSpells.push(makeTraitSpell(name, spellLevel === 3 ? 1 : 2));
  };

  if (raceId === "elf") {
    const lineage = choices.elvenLineage;
    if (lineage === "Drow") {
      effects.senses.push({ name: "Darkvision", value: 120 });
      effects.cantrips.push(makeTraitSpell("Dancing Lights", 0));
      addProgressionSpell(3, "Faerie Fire");
      addProgressionSpell(5, "Darkness");
    } else if (lineage === "High Elf") {
      effects.cantrips.push(makeTraitSpell("Prestidigitation", 0));
      addProgressionSpell(3, "Detect Magic");
      addProgressionSpell(5, "Misty Step");
    } else if (lineage === "Wood Elf") {
      effects.speed = 35;
      effects.cantrips.push(makeTraitSpell("Druidcraft", 0));
      addProgressionSpell(3, "Longstrider");
      addProgressionSpell(5, "Pass without Trace");
    }
    if (lineage) addFeature(`Elven Lineage: ${lineage}`, `${lineage} lineage selected.`);
  }

  if (raceId === "gnome") {
    const lineage = choices.gnomishLineage;
    if (lineage === "Forest Gnome") {
      effects.cantrips.push(makeTraitSpell("Minor Illusion", 0));
      effects.preparedSpells.push(makeTraitSpell("Speak with Animals", 1));
    } else if (lineage === "Rock Gnome") {
      effects.cantrips.push(makeTraitSpell("Mending", 0), makeTraitSpell("Prestidigitation", 0));
    }
    if (lineage) addFeature(`Gnomish Lineage: ${lineage}`, `${lineage} lineage selected.`);
  }

  if (raceId === "tiefling") {
    const legacy = choices.fiendishLegacy;
    if (legacy === "Abyssal") {
      effects.defenses.push({ type: "resistance", damageType: "Poison" });
      effects.cantrips.push(makeTraitSpell("Poison Spray", 0));
      addProgressionSpell(3, "Ray of Sickness");
      addProgressionSpell(5, "Hold Person");
    } else if (legacy === "Chthonic") {
      effects.defenses.push({ type: "resistance", damageType: "Necrotic" });
      effects.cantrips.push(makeTraitSpell("Chill Touch", 0));
      addProgressionSpell(3, "False Life");
      addProgressionSpell(5, "Ray of Enfeeblement");
    } else if (legacy === "Infernal") {
      effects.defenses.push({ type: "resistance", damageType: "Fire" });
      effects.cantrips.push(makeTraitSpell("Fire Bolt", 0));
      addProgressionSpell(3, "Hellish Rebuke");
      addProgressionSpell(5, "Darkness");
    }
    if (legacy) addFeature(`Fiendish Legacy: ${legacy}`, `${legacy} legacy selected.`);
  }

  if (raceId?.startsWith("dragonborn")) {
    const ancestry = choices.draconicAncestry;
    const damageType = DRAGON_DAMAGE_BY_ANCESTRY[ancestry];
    if (damageType) {
      effects.defenses.push({ type: "resistance", damageType });
      addFeature(
        `Draconic Ancestry: ${ancestry}`,
        `Breath Weapon and resistance use ${damageType} damage.`,
      );
    }
  }

  if (raceId === "goliath" && choices.giantAncestry) {
    addFeature(`Giant Ancestry: ${choices.giantAncestry}`, `${choices.giantAncestry} selected.`);
  }

  if (raceId === "shifter" && choices.shiftingForm) {
    addFeature(`Shifting: ${choices.shiftingForm}`, `${choices.shiftingForm} benefit selected.`);
  }

  return effects;
}

function featureChoiceFeatures(
  choices: Record<string, string[]> | undefined,
  classFeatures: any[],
) {
  return Object.entries(choices || {}).flatMap(([featureId, selected]) => {
    const sourceId = featureId.split(":")[0];
    const feature = classFeatures.find((candidate) => candidate.id === sourceId);
    const sourceName = feature?.name || sourceId;
    return selected.map((choice) => ({
      name: `Feature Choice: ${choice}`,
      description: `${choice} selected for ${sourceName}.`,
      source: "class" as const,
      sourceName,
      isUnlocked: true,
    }));
  });
}

function unlockedClassFeatureEntries(
  classFeatures: any[],
  state: any,
  classData: any,
  subclassData: any,
): FeatureInfo[] {
  return classFeatures
    .filter((feature) => {
      const classId = getField(feature, "classId", "class_id");
      const subclassId = getField(feature, "subclassId", "subclass_id");
      const levelRequired = Number(getField(feature, "levelRequired", "level_required") || 0);
      return (
        classId === classData?.id &&
        (!subclassId || subclassId === subclassData?.id) &&
        levelRequired <= Number(state.level || 1)
      );
    })
    .map((feature) => ({
      name: stripTags(feature.name),
      description: stripTags(feature.description),
      source: "class" as const,
      sourceName:
        subclassData && getField(feature, "subclassId", "subclass_id")
          ? subclassData.name
          : classData?.name || "Class",
      level: Number(getField(feature, "levelRequired", "level_required") || 0) || undefined,
      isUnlocked: true,
    }));
}

function selectedFeatureOptionDetails(
  choices: Record<string, string[]> | undefined,
  classFeatures: any[],
) {
  return Object.entries(choices || {}).flatMap(([featureChoiceId, selected]) => {
    const featureId = featureChoiceId.split(":")[0];
    const feature = classFeatures.find((candidate) => candidate.id === featureId);
    return selected.map((choice) => ({
      featureName: feature?.name || featureId,
      choice,
    }));
  });
}

function featureEffectDetails(
  classFeatures: any[],
  state: any,
  classData: any,
  subclassData: any,
  effectData?: { activeEffects?: any[]; featureActiveEffects?: any[] },
) {
  const activeEffects = effectData?.activeEffects || [];
  const links = effectData?.featureActiveEffects || [];
  const effectById = new Map(activeEffects.map((effect) => [effect.id, effect]));
  const unlockedFeatureIds = new Set(
    classFeatures
      .filter((feature) => {
        const classId = getField(feature, "classId", "class_id");
        const subclassId = getField(feature, "subclassId", "subclass_id");
        const levelRequired = Number(getField(feature, "levelRequired", "level_required") || 0);
        return (
          classId === classData?.id &&
          (!subclassId || subclassId === subclassData?.id) &&
          levelRequired <= Number(state.level || 1)
        );
      })
      .map((feature) => feature.id),
  );

  return links
    .filter((link) => unlockedFeatureIds.has(link.featureId ?? link.feature_id))
    .map((link) => effectById.get(link.effectId ?? link.effect_id))
    .filter(Boolean);
}

function itemEffectDetails(
  inventory: InventoryItem[],
  effectData?: {
    activeEffects?: any[];
    itemActiveEffects?: any[];
    magicItems?: any[];
  },
) {
  const activeEffects = effectData?.activeEffects || [];
  const links = effectData?.itemActiveEffects || [];
  const magicItems = effectData?.magicItems || [];
  const effectById = new Map(activeEffects.map((effect) => [effect.id, effect]));

  const equippedMagicItemIds = new Set<string>();
  for (const item of inventory) {
    const requiresAttunement = (i: InventoryItem) => {
      const typeLower = i.type?.toLowerCase() || "";
      const descLower = i.description?.toLowerCase() || "";
      return (
        typeLower === "ring" ||
        typeLower.includes("wondrous") ||
        descLower.includes("attunement") ||
        descLower.includes("attune")
      );
    };
    const isActive = item.equipped && (!requiresAttunement(item) || item.attuned);
    if (!isActive) continue;

    const dbItem = magicItems.find((mi) => mi.name.toLowerCase() === item.name.toLowerCase());
    if (dbItem?.id) {
      equippedMagicItemIds.add(dbItem.id);
    }
  }

  return links
    .filter((link) => equippedMagicItemIds.has(link.itemId ?? link.item_id))
    .map((link) => effectById.get(link.effectId ?? link.effect_id))
    .filter(Boolean);
}

function spellEffectDetails(
  selectedSpells: any[],
  effectData?: { activeEffects?: any[]; spellActiveEffects?: any[] },
) {
  const activeEffects = effectData?.activeEffects || [];
  const links = effectData?.spellActiveEffects || [];
  const effectById = new Map(activeEffects.map((effect) => [effect.id, effect]));

  const selectedSpellIds = new Set(selectedSpells.map((s) => s.id));

  return links
    .filter((link) => selectedSpellIds.has(link.spellId ?? link.spell_id))
    .map((link) => effectById.get(link.effectId ?? link.effect_id))
    .filter(Boolean);
}

type ParsedEffects = {
  abilityBonuses: Record<string, number>;
  abilityOverrides: Record<string, number>;
  acBonus: number;
  speedBonuses: Record<string, number>;
  senses: Array<{ name: string; value: number | null }>;
  defenses: Array<{ type: "resistance" | "immunity" | "vulnerability"; damageType: string }>;
  actions: ActionInfo[];
};

function parseFoundryJsonEffects(
  foundryJsonStr: string | null | undefined,
  effectsAccumulator: ParsedEffects,
  finalScores: Record<string, number>,
  proficiencyBonus: number,
  sourceName: string,
) {
  if (!foundryJsonStr) return;
  const parsed = parseJsonValue(foundryJsonStr, null);
  if (!parsed) return;

  const effects = Array.isArray(parsed.effects) ? parsed.effects : [];
  for (const effect of effects) {
    if (effect.disabled === true) continue;

    const changes = Array.isArray(effect.changes) ? effect.changes : [];
    for (const change of changes) {
      const key = String(change.key || "");
      const mode = change.mode;
      const rawValue = change.value;

      const parseValNum = (val: any): number => {
        if (typeof val === "number") return val;
        if (typeof val === "string") {
          const parsedNum = parseInt(val, 10);
          return isNaN(parsedNum) ? 0 : parsedNum;
        }
        return 0;
      };

      // 1. Ability Scores
      const abilityMatch = key.match(/^system\.abilities\.([a-z]{3})\.value$/i);
      if (abilityMatch) {
        const ability = abilityMatch[1].toUpperCase();
        const valNum = parseValNum(rawValue);
        if (mode === "OVERRIDE" || mode === 5 || mode === "UPGRADE" || mode === 4) {
          effectsAccumulator.abilityOverrides[ability] = Math.max(
            effectsAccumulator.abilityOverrides[ability] || 0,
            valNum,
          );
        } else {
          effectsAccumulator.abilityBonuses[ability] =
            (effectsAccumulator.abilityBonuses[ability] || 0) + valNum;
        }
        continue;
      }

      // 2. Armor Class
      if (key === "system.attributes.ac.bonus") {
        const valNum = parseValNum(rawValue);
        effectsAccumulator.acBonus += valNum;
        continue;
      }

      // 3. Speed
      const movementMatch = key.match(/^system\.attributes\.movement\.([a-z]+)$/i);
      if (movementMatch) {
        const moveType = movementMatch[1].toLowerCase();
        const valNum = parseValNum(rawValue);
        effectsAccumulator.speedBonuses[moveType] =
          (effectsAccumulator.speedBonuses[moveType] || 0) + valNum;
        continue;
      }

      // 4. Senses
      const sensesMatch = key.match(/^system\.attributes\.senses\.([a-z]+)$/i);
      if (sensesMatch) {
        const senseType = sensesMatch[1].toLowerCase();
        const valNum = parseValNum(rawValue);
        const name =
          senseType === "darkvision"
            ? "Darkvision"
            : senseType === "blindsight"
              ? "Blindsight"
              : senseType === "truesight"
                ? "Truesight"
                : senseType.charAt(0).toUpperCase() + senseType.slice(1);
        effectsAccumulator.senses.push({ name, value: valNum });
        continue;
      }

      // 5. Defenses (Resistances/Immunities/Vulnerabilities)
      if (key === "system.traits.dr.value" || key === "system.traits.dr") {
        const types =
          typeof rawValue === "string"
            ? [rawValue]
            : Array.isArray(rawValue)
              ? rawValue
              : [];
        for (const t of types) {
          effectsAccumulator.defenses.push({ type: "resistance", damageType: normalizeName(t) });
        }
        continue;
      }
      if (key === "system.traits.di.value") {
        const types =
          typeof rawValue === "string"
            ? [rawValue]
            : Array.isArray(rawValue)
              ? rawValue
              : [];
        for (const t of types) {
          effectsAccumulator.defenses.push({ type: "immunity", damageType: normalizeName(t) });
        }
        continue;
      }
      if (key === "system.traits.dv.value") {
        const types =
          typeof rawValue === "string"
            ? [rawValue]
            : Array.isArray(rawValue)
              ? rawValue
              : [];
        for (const t of types) {
          effectsAccumulator.defenses.push({
            type: "vulnerability",
            damageType: normalizeName(t),
          });
        }
        continue;
      }
      if (key === "system.traits.ci.value") {
        const types =
          typeof rawValue === "string"
            ? [rawValue]
            : Array.isArray(rawValue)
              ? rawValue
              : [];
        for (const t of types) {
          effectsAccumulator.defenses.push({ type: "immunity", damageType: normalizeName(t) });
        }
        continue;
      }
    }
  }
}


function activationFromDescription(description: string) {
  const text = description.toLowerCase();
  if (/\bbonus action\b/.test(text)) return { activationTime: 1, activationType: 3 };
  if (/\breaction\b/.test(text)) return { activationTime: 1, activationType: 4 };
  if (/\bmagic action\b/.test(text)) return { activationTime: 1, activationType: 1 };
  if (/\baction\b/.test(text)) return { activationTime: 1, activationType: 1 };
  return undefined;
}

function featureUsesFromDescription(
  featureName: string,
  description: string,
  finalScores: Record<string, number>,
) {
  const text = description.toLowerCase();
  let max = 0;
  if (/charisma modifier/.test(text)) max = Math.max(1, modifier(finalScores.CHA));
  else if (/intelligence modifier/.test(text)) max = Math.max(1, modifier(finalScores.INT));
  else if (/wisdom modifier/.test(text)) max = Math.max(1, modifier(finalScores.WIS));
  else if (/strength modifier/.test(text)) max = Math.max(1, modifier(finalScores.STR));
  else if (/dexterity modifier/.test(text)) max = Math.max(1, modifier(finalScores.DEX));
  else if (/constitution modifier/.test(text)) max = Math.max(1, modifier(finalScores.CON));
  else if (/proficiency bonus/.test(text))
    max = 2 + Math.ceil((Number(finalScores.level || 1) - 1) / 4);
  else if (/once/.test(text)) max = 1;

  if (/bardic inspiration/i.test(featureName)) max = Math.max(1, modifier(finalScores.CHA));
  if (!max) return undefined;

  return {
    current: max,
    max,
    reset: /\bshort or long rest\b/.test(text) ? "Short Rest" : "Long Rest",
  };
}

function unlockedClassFeatureActions(
  classFeatures: any[],
  state: any,
  classData: any,
  subclassData: any,
  finalScores: Record<string, number>,
): ActionInfo[] {
  return classFeatures
    .filter((feature) => {
      const classId = getField(feature, "classId", "class_id");
      const subclassId = getField(feature, "subclassId", "subclass_id");
      const levelRequired = Number(getField(feature, "levelRequired", "level_required") || 0);
      return (
        classId === classData?.id &&
        (!subclassId || subclassId === subclassData?.id) &&
        levelRequired <= Number(state.level || 1)
      );
    })
    .flatMap((feature) => {
      const description = stripTags(feature.description);
      const activation = activationFromDescription(description);
      const uses = featureUsesFromDescription(feature.name, description, {
        ...finalScores,
        level: state.level || 1,
      });
      if (!activation && !uses) return [];
      return [
        {
          name: stripTags(feature.name),
          source: "class",
          description,
          activation,
          uses,
        },
      ];
    });
}

export function createNativePartyMember(
  state: any,
  raceData: any,
  classData: any,
  backgroundData?: any,
  subclassData?: any,
  originFeat?: any,
  selectedSpells: any[] = [],
  classFeatures: any[] = [],
  effectData?: {
    activeEffects?: any[];
    featureActiveEffects?: any[];
    itemActiveEffects?: any[];
    spellActiveEffects?: any[];
    magicItems?: any[];
  },
  speciesVariantData?: any,
): PartyMember {
  const id = Math.floor(Math.random() * 1000000) + 900000000; // Native IDs are 900M+
  const level = state.level || 1;
  const proficiencyBonus = Math.ceil(level / 4) + 1;

  // Gather equipment & inventory first
  const selectedEquipment = [
    ...getSelectedEquipment(
      getField(backgroundData, "startingEquipmentJson", "starting_equipment_json"),
      state.backgroundEquipmentOption,
    ),
    ...getSelectedEquipment(classData?.startingEquipmentJson, state.classEquipmentOption),
  ];
  const inventory = equipmentToInventory(selectedEquipment);
  const currencies = equipmentToCurrencies(selectedEquipment);

  // Ability scores base
  const baseScores = Object.fromEntries(
    ABILITIES.map((ability) => [
      ability,
      Number(state.abilities?.[ability] || 10) + Number(state.abilityBonuses?.[ability] || 0),
    ]),
  ) as Record<string, number>;

  // Accumulate all active effects and foundryJson modifications
  const parsedAccumulator: ParsedEffects = {
    abilityBonuses: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 },
    abilityOverrides: {},
    acBonus: 0,
    speedBonuses: {},
    senses: [],
    defenses: [],
    actions: [],
  };

  // 1. Equipped Inventory Items foundryJson
  for (const item of inventory) {
    const requiresAttunement = (i: InventoryItem) => {
      const typeLower = i.type?.toLowerCase() || "";
      const descLower = i.description?.toLowerCase() || "";
      return (
        typeLower === "ring" ||
        typeLower.includes("wondrous") ||
        descLower.includes("attunement") ||
        descLower.includes("attune")
      );
    };
    const isActive = item.equipped && (!requiresAttunement(item) || item.attuned);
    if (!isActive) continue;

    const dbItem = effectData?.magicItems?.find(
      (mi) => mi.name.toLowerCase() === item.name.toLowerCase(),
    );
    if (dbItem?.foundryJson) {
      parseFoundryJsonEffects(
        dbItem.foundryJson,
        parsedAccumulator,
        baseScores,
        proficiencyBonus,
        item.name,
      );
    }
  }

  // 2. Active Spells foundryJson
  for (const spell of selectedSpells) {
    if (spell?.foundryJson) {
      parseFoundryJsonEffects(
        spell.foundryJson,
        parsedAccumulator,
        baseScores,
        proficiencyBonus,
        spell.name,
      );
    }
  }

  // 3. Feats foundryJson
  if (originFeat?.foundryJson) {
    parseFoundryJsonEffects(
      originFeat.foundryJson,
      parsedAccumulator,
      baseScores,
      proficiencyBonus,
      originFeat.name,
    );
  }

  // 4. Species foundryJson
  if (raceData?.foundryJson) {
    parseFoundryJsonEffects(
      raceData.foundryJson,
      parsedAccumulator,
      baseScores,
      proficiencyBonus,
      raceData.name,
    );
  }

  // 4b. Species Variant (Subrace) foundryJson
  if (speciesVariantData?.foundryJson) {
    parseFoundryJsonEffects(
      speciesVariantData.foundryJson,
      parsedAccumulator,
      baseScores,
      proficiencyBonus,
      speciesVariantData.name,
    );
  }

  // 5. Unlocked Class Features foundryJson
  const unlockedFeatures = classFeatures.filter((feature) => {
    const classId = getField(feature, "classId", "class_id");
    const subclassId = getField(feature, "subclassId", "subclass_id");
    const levelRequired = Number(getField(feature, "levelRequired", "level_required") || 0);
    return (
      classId === classData?.id &&
      (!subclassId || subclassId === subclassData?.id) &&
      levelRequired <= Number(state.level || 1)
    );
  });
  for (const feature of unlockedFeatures) {
    if (feature?.foundryJson) {
      parseFoundryJsonEffects(
        feature.foundryJson,
        parsedAccumulator,
        baseScores,
        proficiencyBonus,
        feature.name,
      );
    }
  }

  // Database Active Effects
  // Features
  const linkedFeatureEffects = featureEffectDetails(
    classFeatures,
    state,
    classData,
    subclassData,
    effectData as any,
  );
  const normalizedFeatureEffects = normalizeActiveEffects(linkedFeatureEffects, {
    finalScores: baseScores,
    proficiencyBonus,
    source: "class",
  });

  // Equipped Items
  const linkedItemEffects = itemEffectDetails(inventory, effectData);
  const normalizedItemEffects = normalizeActiveEffects(linkedItemEffects, {
    finalScores: baseScores,
    proficiencyBonus,
    source: "item",
  });

  // Active Spells
  const linkedSpellEffects = spellEffectDetails(selectedSpells, effectData as any);
  const normalizedSpellEffects = normalizeActiveEffects(linkedSpellEffects, {
    finalScores: baseScores,
    proficiencyBonus,
    source: "spell",
  });

  // Extract speed adjustments from database active effects changesJson
  const allDatabaseEffects = [...linkedFeatureEffects, ...linkedItemEffects, ...linkedSpellEffects];
  for (const eff of allDatabaseEffects) {
    const changes = parseJsonValue(eff?.changesJson ?? eff?.changes_json, {});
    if (Array.isArray(changes?.speeds)) {
      for (const speedAdjust of changes.speeds) {
        const type = (speedAdjust.type || "walk").toLowerCase();
        const valNum = typeof speedAdjust.value === "number" ? speedAdjust.value : 0;
        parsedAccumulator.speedBonuses[type] =
          (parsedAccumulator.speedBonuses[type] || 0) + valNum;
      }
    }
  }

  // Combine Ability Scores
  const finalScores = Object.fromEntries(
    ABILITIES.map((ability) => {
      let score = baseScores[ability];
      score += parsedAccumulator.abilityBonuses[ability] || 0;
      const override = parsedAccumulator.abilityOverrides[ability];
      if (override !== undefined && override > score) {
        score = override;
      }
      return [ability, score];
    }),
  ) as Record<string, number>;

  // Ability modifiers
  const conMod = modifier(finalScores.CON);
  const dexMod = modifier(finalScores.DEX);
  const wisMod = modifier(finalScores.WIS);
  const intMod = modifier(finalScores.INT);

  // Features, expertises, and skills/saves
  const featureOptionDetails = selectedFeatureOptionDetails(state.featureChoices, classFeatures);
  const expertiseSkills = new Set(
    featureOptionDetails
      .filter((detail) => /expertise/i.test(detail.featureName))
      .map((detail) => detail.choice.toLowerCase()),
  );

  const hitDice = classData?.hitDice ?? 8;
  const hpMax = classData
    ? hitDice + conMod + (level - 1) * (Math.floor(hitDice / 2) + 1 + conMod)
    : 10;

  const backgroundSkills = parseProficiencyNames(
    getField(backgroundData, "skillProficienciesJson", "skill_proficiencies_json"),
  );
  const speciesSkills = parseProficiencyNames(
    getField(raceData, "proficienciesJson", "proficiencies_json"),
    "skills",
  );
  const proficientSkills = new Set(
    [
      ...backgroundSkills,
      ...speciesSkills,
      ...(state.speciesSkillChoices || []),
      ...(state.classSkillChoices || []),
      ...(state.featChoices?.skills || []),
    ].map((skill) => skill.toLowerCase()),
  );
  const classProficiencies = parseJsonValue(classData?.proficienciesJson, {});
  const savingThrowProficiencies = new Set(
    (classProficiencies?.savingThrows || []).map((save: string) => toAbility(save)),
  );

  const abilities = Object.entries(finalScores).map(([name, score]) => ({
    name,
    score,
    modifier: modifier(score),
  }));

  const skills: SkillInfo[] = SKILLS.map((skill) => {
    const isProficient = proficientSkills.has(skill.name.toLowerCase());
    const proficiency: SkillInfo["proficiency"] =
      isProficient && expertiseSkills.has(skill.name.toLowerCase())
        ? "expertise"
        : isProficient
          ? "proficient"
          : "none";
    return {
      ...skill,
      modifier:
        modifier(finalScores[skill.ability]) +
        (proficiency === "expertise"
          ? proficiencyBonus * 2
          : proficiency === "proficient"
            ? proficiencyBonus
            : 0),
      proficiency,
    };
  });

  const saves: SaveInfo[] = ABILITIES.map((ability) => {
    const proficiency: SaveInfo["proficiency"] = savingThrowProficiencies.has(ability)
      ? "proficient"
      : "none";
    return {
      ability,
      modifier:
        modifier(finalScores[ability]) + (proficiency === "proficient" ? proficiencyBonus : 0),
      proficiency,
    };
  });

  const armorProficiencies = asStringArray(classProficiencies?.starting?.armor);
  const weaponProficiencies = asStringArray(classProficiencies?.starting?.weapons);
  const tools = unique([
    ...asStringArray(getField(backgroundData, "toolProficienciesJson", "tool_proficiencies_json")),
    ...(state.backgroundToolChoices || []),
    ...(state.featChoices?.tools || []),
    ...asStringArray(classProficiencies?.starting?.tools),
    ...(state.classToolChoices || []),
    ...parseProficiencyNames(
      getField(raceData, "proficienciesJson", "proficiencies_json"),
      "tools",
    ),
    ...(state.speciesToolChoices || []),
  ]);
  const languages = unique([
    "Common",
    ...parseFixedLanguages(getField(raceData, "languagesJson", "languages_json")),
    ...(state.speciesLanguageChoices || []),
    ...parseFixedLanguages(
      getField(backgroundData, "languageProficienciesJson", "language_proficiencies_json"),
    ),
    ...(state.backgroundLanguageChoices || []),
  ]);

  const traitEffects = getSpeciesTraitEffects(raceData?.id, state.speciesTraitChoices || {}, level);

  // Merge speed, senses, defenses, actions
  const armorClass = calculateArmorClass(inventory, dexMod) + parsedAccumulator.acBonus;
  const attacks = inventoryToAttacks(inventory, finalScores, proficiencyBonus);

  // Speed
  const speed =
    (traitEffects.speed || raceData?.speed || 30) + (parsedAccumulator.speedBonuses.walk || 0);
  const specialSpeeds = [...(traitEffects.speed ? [] : [])];
  for (const [type, value] of Object.entries(parsedAccumulator.speedBonuses)) {
    if (type !== "walk" && type !== "speed") {
      specialSpeeds.push({ type, value });
    }
  }

  // Senses: deduplicate by name
  const sensesList = [
    ...parseSenses(getField(raceData, "sensesJson", "senses_json")).filter(
      (sense) => !traitEffects.senses.some((traitSense) => traitSense.name === sense.name),
    ),
    ...traitEffects.senses,
    ...normalizedFeatureEffects.senses,
    ...normalizedItemEffects.senses,
    ...normalizedSpellEffects.senses,
    ...parsedAccumulator.senses,
  ];
  const uniqueSensesMap = new Map<string, number | null>();
  for (const s of sensesList) {
    const existing = uniqueSensesMap.get(s.name);
    if (
      existing === undefined ||
      (s.value !== null && (existing === null || s.value > existing))
    ) {
      uniqueSensesMap.set(s.name, s.value);
    }
  }
  const senses = Array.from(uniqueSensesMap.entries()).map(([name, value]) => ({ name, value }));

  // Defenses: deduplicate by type and damageType
  const defensesList = [
    ...parseDefenses(getField(raceData, "resistancesJson", "resistances_json"), "resistance"),
    ...parseDefenses(getField(raceData, "immunitiesJson", "immunities_json"), "immunity"),
    ...parseDefenses(
      getField(raceData, "vulnerabilitiesJson", "vulnerabilities_json"),
      "vulnerability",
    ),
    ...traitEffects.defenses,
    ...normalizedFeatureEffects.defenses,
    ...normalizedItemEffects.defenses,
    ...normalizedSpellEffects.defenses,
    ...parsedAccumulator.defenses,
  ];
  const uniqueDefensesMap = new Map<string, DefenseInfo>();
  for (const d of defensesList) {
    const key = `${d.type}:${d.damageType.toLowerCase()}`;
    uniqueDefensesMap.set(key, d);
  }
  const defenses = Array.from(uniqueDefensesMap.values());

  // Features list
  const features = [
    ...parseFeatureEntries(
      getField(raceData, "featuresJson", "features_json"),
      "race",
      raceData?.name || "Species",
    ),
    ...(speciesVariantData
      ? parseFeatureEntries(
          getField(speciesVariantData, "featuresJson", "features_json"),
          "race",
          speciesVariantData.name,
        )
      : []),
    ...(backgroundData
      ? [
          {
            name: backgroundData.name,
            description: stripTags(backgroundData.description),
            source: "background" as const,
            sourceName: backgroundData.name,
            isUnlocked: true,
          },
        ]
      : []),
    ...(subclassData
      ? [
          {
            name: subclassData.name,
            description: stripTags(subclassData.description),
            source: "class" as const,
            sourceName: subclassData.name,
            level: subclassData.levelChosen,
            isUnlocked: true,
          },
        ]
      : []),
    ...unlockedClassFeatureEntries(classFeatures, state, classData, subclassData),
    ...traitEffects.features,
    ...featureChoiceFeatures(state.featureChoices, classFeatures),
  ];

  const metamagic = featureOptionDetails
    .filter((detail) => /metamagic/i.test(detail.featureName))
    .map((detail) => ({
      name: detail.choice,
      description: `${detail.choice} selected as a Metamagic option.`,
    }));
  const infusions = featureOptionDetails
    .filter((detail) => /infusion/i.test(detail.featureName))
    .map((detail) => ({
      name: detail.choice,
      description: `${detail.choice} selected as an infusion option.`,
    }));
  const weaponMasteries = featureOptionDetails
    .filter((detail) => /weapon mastery|mastery/i.test(detail.featureName))
    .map((detail) => ({
      name: detail.choice,
      description: `${detail.choice} selected as a weapon mastery option.`,
    }));
  const featSpellChoices = selectedSpells
    .filter(
      (spell) =>
        state.featChoices?.cantrips?.includes(spell.id) ||
        state.featChoices?.spells?.includes(spell.id),
    )
    .map((spell) => spell.name);
  const feats = originFeat
    ? [
        {
          name: originFeat.name,
          description: stripTags(originFeat.description),
          choices: [
            state.featChoices?.spellList,
            state.featChoices?.spellcastingAbility,
            ...(state.featChoices?.skills || []),
            ...(state.featChoices?.tools || []),
            ...featSpellChoices,
          ].filter(Boolean),
        },
      ]
    : [];

  const actions = unlockedClassFeatureActions(
    classFeatures,
    state,
    classData,
    subclassData,
    finalScores,
  )
    .concat(normalizedFeatureEffects.actions)
    .concat(normalizedItemEffects.actions)
    .concat(normalizedSpellEffects.actions);
  const uniqueActionsMap = new Map<string, ActionInfo>();
  for (const a of actions) {
    uniqueActionsMap.set(a.name, a);
  }
  const finalActions = Array.from(uniqueActionsMap.values());

  const spellcastingData = parseJsonValue(classData?.spellcastingJson, {});
  const spellcastingAbility = String(spellcastingData?.ability || "")
    .slice(0, 3)
    .toUpperCase();
  const spellcasting =
    spellcastingAbility && finalScores[spellcastingAbility]
      ? [
          {
            className: classData?.name || "Unknown",
            ability: spellcastingAbility,
            saveDc: 8 + proficiencyBonus + modifier(finalScores[spellcastingAbility]),
            attackBonus: proficiencyBonus + modifier(finalScores[spellcastingAbility]),
          },
        ]
      : [];
  const cantrips = selectedSpells
    .filter((spell) => Number(spell.level || 0) === 0)
    .map(spellToPreparedSpell);
  const preparedSpells = selectedSpells
    .filter((spell) => Number(spell.level || 0) > 0)
    .map(spellToPreparedSpell);
  const spellSlots = getSpellSlots(level, spellcastingData?.progression || "");
  const pactSlots = getPactSlots(level, spellcastingData?.progression || "");

  const member: PartyMember = {
    id,
    name: state.name || "Unnamed",
    avatarUrl: null,
    race: speciesVariantData
      ? `${speciesVariantData.name} ${raceData?.name || "Species"}`
      : (raceData?.name || "Unknown"),
    background: backgroundData?.name || "Custom",
    classes: classData?.name || "Unknown",
    subclasses: subclassData ? [subclassData.name] : [],
    level,
    hpMax: Math.max(level, hpMax) + (originFeat?.id === "tough" ? level * 2 : 0),
    hpCurrent: Math.max(level, hpMax) + (originFeat?.id === "tough" ? level * 2 : 0),
    tempHp: 0,
    inspiration: false,
    exhaustion: 0,
    deathSaves: { successes: 0, failures: 0, stabilized: false },
    passivePerception:
      10 + (skills.find((skill) => skill.key === "perception")?.modifier ?? wisMod),
    passiveInvestigation:
      10 + (skills.find((skill) => skill.key === "investigation")?.modifier ?? intMod),
    passiveInsight: 10 + (skills.find((skill) => skill.key === "insight")?.modifier ?? wisMod),
    armorClass,
    initiative: dexMod,
    speed,
    proficiencyBonus,
    senses,
    skills,
    saves,
    spellSlots,
    pactSlots,
    abilities,
    conditions: [],
    defenses,
    actions: finalActions,
    inventory,
    readonlyUrl: `/character/${id}`,
    languages,
    tools,
    armorProficiencies,
    weaponProficiencies,
    specialSpeeds,
    spellcasting,
    hitDice: `${level}/${level}d${hitDice}`,
    feats,
    alignment: null,
    currencies,
    weightCarried: 0,
    carryingCapacity: finalScores.STR * 15,
    attacks,
    cantrips: [...cantrips, ...traitEffects.cantrips],
    preparedSpells: [...preparedSpells, ...traitEffects.preparedSpells],
    allSpells: [
      ...cantrips,
      ...traitEffects.cantrips,
      ...preparedSpells,
      ...traitEffects.preparedSpells,
    ],
    features,
    characteristics: {
      personalityTraits: "",
      ideals: "",
      bonds: "",
      flaws: "",
      appearance: "",
    },
    activeArmorModel: null,
    activeInfusions: [],
    infusions,
    metamagic,
    totemAspects: [],
    weaponMasteries,
    creatures: [],
  };

  return member;
}

export const saveNativeCharacter = createServerFn({ method: "POST" })
  .inputValidator(z.object({ character: z.custom<PartyMember>() }))
  .handler(async ({ data }) => {
    const character = data.character;
    const cacheDir = path.join(process.cwd(), "data", "cache");
    await fs.mkdir(cacheDir, { recursive: true });
    const filePath = path.join(cacheDir, `native-char-${character.id}.json`);
    await fs.writeFile(
      filePath,
      JSON.stringify({ success: true, data: character }, null, 2),
      "utf-8",
    );
    return character.id;
  });

export const getNativeCharacter = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ data }) => {
    if (!data?.id) return null;
    try {
      const cacheDir = path.join(process.cwd(), "data", "cache");
      const filePath = path.join(cacheDir, `native-char-${data.id}.json`);
      const content = await fs.readFile(filePath, "utf-8");
      const payload = JSON.parse(content);
      return payload.data as PartyMember;
    } catch {
      return null;
    }
  });
