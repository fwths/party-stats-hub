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
import { speciesToRuleChoicesAndGrants } from "./rules/adapters/species";
import { backgroundToRuleChoicesAndGrants } from "./rules/adapters/backgrounds";
import { resolveRuleChoicesToGrants } from "./rules/choices";
import { classToRuleChoicesAndGrants } from "./rules/adapters/classes";
import { classFeatureToRuleChoicesAndGrants } from "./rules/adapters/features";
import { featToRuleChoicesAndGrants } from "./rules/adapters/feats";
import { spellcastingToRuleChoicesAndGrants } from "./rules/adapters/spells";
import { RuleGrant, parseFoundryEffectsToGrants } from "./rules/grants";

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

function skillKeyFromName(name: string): string {
  return normalizeName(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function skillDefinitionsFromData(skillsData?: any[]) {
  const rows = Array.isArray(skillsData) && skillsData.length > 0 ? skillsData : SKILLS;
  return rows
    .map((skill: any) => {
      const name = normalizeName(skill?.name);
      const ability = toAbility(String(skill?.ability || ""));
      if (!name || !ABILITIES.includes(ability)) return null;
      return {
        key: String(skill?.id || skillKeyFromName(name)),
        name,
        ability,
      };
    })
    .filter(Boolean) as Array<{ key: string; name: string; ability: string }>;
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

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
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
    equipped:
      item.equipped !== undefined ? Boolean(item.equipped) : Boolean(weapon || armor || isShield),
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

// Removed parseFoundryJsonEffects, use parseFoundryEffectsToGrants directly where needed.

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

function deriveActionsFromFeatures(
  features: FeatureInfo[],
  finalScores: Record<string, number>,
): ActionInfo[] {
  return features.flatMap((feature) => {
    const description = feature.description;
    const activation = activationFromDescription(description);
    const featLvl = feature.level || 1;

    const uses = featureUsesFromDescription(feature.name, description, {
      ...finalScores,
      level: featLvl,
    });
    if (!activation && !uses) return [];
    return [
      {
        name: feature.name,
        source: feature.source,
        description: "",
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
    feats?: any[];
    weapons?: any[];
    armor?: any[];
    classes?: any[];
    subclasses?: any[];
    skills?: any[];
    senses?: any[];
    conditions?: any[];
    rulesActions?: any[];
    optionalFeatures?: any[];
    charOptions?: any[];
    mundaneGear?: any[];
    weaponMasteries?: any[];
    itemProperties?: any[];
    itemTypes?: any[];
    itemTypeAdditionalEntries?: any[];
    itemGroups?: any[];
    magicVariants?: any[];
    itemCardReferences?: any[];
    challengeRatings?: any[];
    creatureBuilderEntries?: any[];
  },
  speciesVariantData?: any,
): PartyMember {
  const id = Math.floor(Math.random() * 1000000) + 900000000; // Native IDs are 900M+
  const level = state.level || 1;
  const totalLevel =
    level + (state.multiClasses || []).reduce((sum: number, mc: any) => sum + (mc.level || 0), 0);
  const proficiencyBonus = Math.ceil(totalLevel / 4) + 1;

  const { choices: speciesChoices, grants: speciesGrants } = speciesToRuleChoicesAndGrants(
    speciesVariantData || raceData,
  );
  const { choices: bgChoices, grants: bgGrants } = backgroundToRuleChoicesAndGrants(backgroundData);
  const resolvedSpeciesGrants = resolveRuleChoicesToGrants(state.ruleChoices || {}, speciesChoices);
  const resolvedBgGrants = resolveRuleChoicesToGrants(state.ruleChoices || {}, bgChoices);

  // Class and Features Grants
  const classGrants: any[] = [];
  const resolvedClassGrants: any[] = [];

  if (classData) {
    const { choices: classChoices, grants: cGrants } = classToRuleChoicesAndGrants(classData, true);
    classGrants.push(...cGrants);
    resolvedClassGrants.push(...resolveRuleChoicesToGrants(state.ruleChoices || {}, classChoices));

    const { choices: spellChoices, grants: sGrants } = spellcastingToRuleChoicesAndGrants(
      state,
      classData,
      level,
    );
    classGrants.push(...sGrants);
    resolvedClassGrants.push(...resolveRuleChoicesToGrants(state.ruleChoices || {}, spellChoices));
  }

  const mcGrants: any[] = [];
  const resolvedMcGrants: any[] = [];
  if (state.multiClasses && effectData?.classes) {
    for (const mc of state.multiClasses) {
      if (!mc.classId || mc.level <= 0) continue;
      const mcClass = effectData.classes.find((c: any) => c.id === mc.classId);
      if (!mcClass) continue;

      const { choices: mcChoices, grants: mGrants } = classToRuleChoicesAndGrants(mcClass, false);
      mcGrants.push(...mGrants);
      // Need to map the groupId prefix for multiclasses
      let mappedChoices = mcChoices.map((c) => ({ ...c, id: `mc_${mc.classId}_${c.id}` }));
      resolvedMcGrants.push(...resolveRuleChoicesToGrants(state.ruleChoices || {}, mappedChoices));

      const { choices: mcSpellChoices, grants: mcSGrants } = spellcastingToRuleChoicesAndGrants(
        state,
        mcClass,
        mc.level,
      );
      mcGrants.push(...mcSGrants);
      mappedChoices = mcSpellChoices.map((c) => ({ ...c, id: `mc_${mc.classId}_${c.id}` }));
      resolvedMcGrants.push(...resolveRuleChoicesToGrants(state.ruleChoices || {}, mappedChoices));
    }
  }

  const featureGrants: any[] = [];
  const resolvedFeatureGrants: any[] = [];
  const engineClassFeatures = effectData?.classFeatures || classFeatures;
  if (engineClassFeatures) {
    const activeFeatures = engineClassFeatures.filter((feature: any) => {
      const cid = feature.classId ?? feature.class_id;
      const sid = feature.subclassId ?? feature.subclass_id;
      const lvlRequired = feature.levelRequired ?? feature.level_required ?? 0;

      // Is primary?
      if (cid === state.classId && (!sid || sid === state.subclassId) && lvlRequired <= level)
        return true;

      // Is multiclass?
      if (state.multiClasses) {
        for (const mc of state.multiClasses) {
          if (cid === mc.classId && (!sid || sid === mc.subclassId) && lvlRequired <= mc.level)
            return true;
        }
      }
      return false;
    });

    for (const feature of activeFeatures) {
      // Find the character level or mc level for this feature
      const cid = feature.classId ?? feature.class_id;
      let featureLevel = level;
      if (cid !== state.classId && state.multiClasses) {
        const mc = state.multiClasses.find((m: any) => m.classId === cid);
        if (mc) featureLevel = mc.level;
      }

      const { choices: fChoices, grants: fGrants } = classFeatureToRuleChoicesAndGrants(
        feature,
        featureLevel,
        state.ruleChoices || {},
        [], // high level feat skills omitted here, rely on later mapping
      );
      featureGrants.push(...fGrants);

      const mappedFChoices =
        cid === state.classId ? fChoices : fChoices.map((c) => ({ ...c, id: `mc_${cid}_${c.id}` }));
      resolvedFeatureGrants.push(
        ...resolveRuleChoicesToGrants(state.ruleChoices || {}, mappedFChoices),
      );
    }
  }

  const featGrants: any[] = [];
  const resolvedFeatGrants: any[] = [];

  if (state.originFeatId && effectData?.feats) {
    const originFeat = effectData.feats.find((f: any) => f.id === state.originFeatId);
    if (originFeat) {
      const { choices, grants } = featToRuleChoicesAndGrants(
        originFeat,
        1,
        state.ruleChoices?.[`feat_${originFeat.id}_skill`] || [],
      );
      featGrants.push(...grants);
      resolvedFeatGrants.push(...resolveRuleChoicesToGrants(state.ruleChoices || {}, choices));
    }
  }

  const _generatedGrants = [
    ...speciesGrants,
    ...resolvedSpeciesGrants,
    ...bgGrants,
    ...resolvedBgGrants,
    ...classGrants,
    ...resolvedClassGrants,
    ...mcGrants,
    ...resolvedMcGrants,
    ...featureGrants,
    ...resolvedFeatureGrants,
    ...featGrants,
    ...resolvedFeatGrants,
  ];

  const generatedSkills = _generatedGrants
    .filter((g) => g.type === "skill_proficiency")
    .map((g) => g.value);

  const proficientSkills = new Set(generatedSkills.map((skill) => skill.toLowerCase()));

  const savingThrowProficiencies = new Set(
    _generatedGrants
      .filter((g) => g.type === "saving_throw_proficiency")
      .map((g) => toAbility(g.value)),
  );

  // Gather equipment & inventory first
  const selectedEquipment = _generatedGrants
    .filter((g) => g.type === "item_grant")
    .map((g) => g.value)
    .flat();

  const inventory = equipmentToInventory(selectedEquipment);

  if (state.customEquipment) {
    for (const item of state.customEquipment) {
      // Find matches in database
      const dbWeapon = effectData?.weapons?.find(
        (w: any) => w.name.toLowerCase() === item.name.toLowerCase(),
      );
      const dbArmor = effectData?.armor?.find(
        (a: any) => a.name.toLowerCase() === item.name.toLowerCase(),
      );
      const dbMagicItem = effectData?.magicItems?.find(
        (mi: any) => mi.name.toLowerCase() === item.name.toLowerCase(),
      );

      const isShield = item.name.toLowerCase() === "shield";
      const inferredArmor = ARMOR_AC[item.name];
      const inferredWeapon = WEAPON_DAMAGE[item.name];

      // Determine weapon stats
      const damage = dbWeapon
        ? `${dbWeapon.damageDice} ${dbWeapon.damageType}`
        : inferredWeapon?.damage;
      const properties = dbWeapon
        ? parseJsonValue(dbWeapon.propertiesJson, [])
        : inferredWeapon?.properties;

      // Determine armor stats
      const armorClass = dbArmor ? dbArmor.baseAc : isShield ? 2 : inferredArmor?.base;

      inventory.push({
        name: item.name,
        type:
          item.type ||
          (dbWeapon ? "Weapon" : dbArmor ? "Armor" : isShield ? "Shield" : "Adventuring Gear"),
        rarity: item.rarity || dbMagicItem?.rarity || "Mundane",
        magic: Boolean(dbMagicItem || (item.rarity && item.rarity !== "Mundane")),
        equipped: Boolean(item.equipped),
        attuned: Boolean(item.attuned),
        quantity: Number(item.quantity || 1),
        damage,
        properties,
        armorClass,
        description:
          item.description ||
          dbMagicItem?.description ||
          dbWeapon?.description ||
          dbArmor?.description,
      });
    }
  }
  const currencies = equipmentToCurrencies(selectedEquipment);

  // Ability scores base
  const baseScores = Object.fromEntries(
    ABILITIES.map((ability) => [
      ability,
      Number(state.abilities?.[ability] || 10) + Number(state.abilityBonuses?.[ability] || 0),
    ]),
  ) as Record<string, number>;

  // Apply ability score bonuses from canonical grants (e.g. from feats)
  for (const grant of _generatedGrants) {
    if (grant.type === "ability_bonus" && grant.value && typeof grant.value === "string") {
      const ab = grant.value.toUpperCase();
      if (baseScores[ab] !== undefined) {
        baseScores[ab] += 1;
      }
    }
  }

  // Removed parsedAccumulator

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
      _generatedGrants.push(
        ...parseFoundryEffectsToGrants(dbItem.foundryJson, item.name, item.name),
      );
    }
  }

  // 2. Active Spells foundryJson
  for (const spell of selectedSpells) {
    if (spell.foundryJson) {
      _generatedGrants.push(
        ...parseFoundryEffectsToGrants(spell.foundryJson, spell.name, spell.name),
      );
    }
  }

  // 4. Species foundryJson
  if (raceData?.foundryJson) {
    _generatedGrants.push(
      ...parseFoundryEffectsToGrants(raceData.foundryJson, raceData.name, raceData.name),
    );
  }

  // 4b. Species Variant (Subrace) foundryJson
  if (speciesVariantData?.foundryJson) {
    _generatedGrants.push(
      ...parseFoundryEffectsToGrants(
        speciesVariantData.foundryJson,
        speciesVariantData.name,
        speciesVariantData.name,
      ),
    );
  }

  // 5. Unlocked Class Features foundryJson
  const unlockedFeatures = classFeatures.filter((feature) => {
    const classId = getField(feature, "classId", "class_id");
    const subclassId = getField(feature, "subclassId", "subclass_id");
    const levelRequired = Number(getField(feature, "levelRequired", "level_required") || 0);

    // Check primary class
    if (classId === classData?.id && (!subclassId || subclassId === subclassData?.id)) {
      return levelRequired <= Number(state.level || 1);
    }

    // Check multiclasses
    if (state.multiClasses) {
      const mc = state.multiClasses.find((m: any) => m.classId === classId);
      if (mc) {
        if (!subclassId || subclassId === mc.subclassId) {
          return levelRequired <= Number(mc.level || 0);
        }
      }
    }

    return false;
  });
  for (const feature of unlockedFeatures) {
    if (feature?.foundryJson) {
      _generatedGrants.push(
        ...parseFoundryEffectsToGrants(feature.foundryJson, feature.name, feature.name),
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
  const speedBonuses: Record<string, number> = {};
  for (const g of _generatedGrants) {
    if (g.type === "speed_bonus") {
      const type = Object.keys(g.value)[0];
      speedBonuses[type] = (speedBonuses[type] || 0) + Number(g.value[type]);
    }
  }

  // Extract speed adjustments from database active effects changesJson
  const allDatabaseEffects = [...linkedFeatureEffects, ...linkedItemEffects, ...linkedSpellEffects];
  for (const eff of allDatabaseEffects) {
    const changes = parseJsonValue(eff?.changesJson ?? eff?.changes_json, {});
    if (Array.isArray(changes?.speeds)) {
      for (const speedAdjust of changes.speeds) {
        const type = (speedAdjust.type || "walk").toLowerCase();
        const valNum = typeof speedAdjust.value === "number" ? speedAdjust.value : 0;
        speedBonuses[type] = (speedBonuses[type] || 0) + valNum;
      }
    }
  }

  const abilityOverrides: Record<string, number> = {};
  const abilityBonuses: Record<string, number> = {};
  for (const g of _generatedGrants) {
    if (g.type === "ability_score_bonus") {
      const ability = Object.keys(g.value)[0];
      abilityBonuses[ability] = (abilityBonuses[ability] || 0) + Number(g.value[ability]);
    } else if (g.type === "ability_override") {
      const ability = Object.keys(g.value)[0];
      abilityOverrides[ability] = Math.max(
        abilityOverrides[ability] || 0,
        Number(g.value[ability]),
      );
    }
  }

  // Combine Ability Scores
  const finalScores = Object.fromEntries(
    ABILITIES.map((ability) => {
      let score = baseScores[ability];
      score += abilityBonuses[ability] || 0;
      const override = abilityOverrides[ability];
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

  const expertiseSkills = new Set([
    ...featureOptionDetails
      .filter((detail) => /expertise/i.test(detail.featureName))
      .map((detail) => detail.choice.toLowerCase()),
    ..._generatedGrants
      .filter((g) => g.type === "expertise")
      .map((g) => String(g.value).toLowerCase()),
  ]);

  const levelHitDice: number[] = [];
  const primaryHitDie = classData?.hitDice ?? 8;
  for (let i = 0; i < level; i++) {
    levelHitDice.push(primaryHitDie);
  }
  if (state.multiClasses && effectData?.classes) {
    for (const mc of state.multiClasses) {
      const mcCls = effectData.classes.find((c: any) => c.id === mc.classId);
      const mcHitDie = mcCls?.hitDice ?? 8;
      for (let i = 0; i < mc.level; i++) {
        levelHitDice.push(mcHitDie);
      }
    }
  }

  let hpMax = 0;
  if (levelHitDice.length > 0) {
    hpMax += levelHitDice[0] + conMod;
    for (let L = 2; L <= levelHitDice.length; L++) {
      const die = levelHitDice[L - 1];
      if (state.hpType === "manual" && state.manualHpRolls?.[L] !== undefined) {
        hpMax += Number(state.manualHpRolls[L]) + conMod;
      } else {
        hpMax += Math.floor(die / 2) + 1 + conMod;
      }
    }
  } else {
    hpMax = 10;
  }

  const abilities = Object.entries(finalScores).map(([name, score]) => ({
    name,
    score,
    modifier: modifier(score),
  }));

  const skills: SkillInfo[] = skillDefinitionsFromData(effectData?.skills).map((skill) => {
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

  const armorProficiencies = unique([
    ..._generatedGrants.filter((g) => g.type === "armor_proficiency").map((g) => g.value),
  ]);
  const weaponProficiencies = unique([
    ..._generatedGrants.filter((g) => g.type === "weapon_proficiency").map((g) => g.value),
  ]);
  const tools = unique([
    ..._generatedGrants.filter((g) => g.type === "tool_proficiency").map((g) => g.value),
  ]);
  const languages = unique([
    "Common",
    ..._generatedGrants.filter((g) => g.type === "language").map((g) => g.value),
  ]);

  // Merge speed, senses, defenses, actions
  let acBonus = 0;
  for (const g of _generatedGrants) {
    if (g.type === "armor_class_bonus") {
      acBonus += Number(g.value);
    }
  }
  const armorClass = calculateArmorClass(inventory, dexMod) + acBonus;
  const attacks = inventoryToAttacks(inventory, finalScores, proficiencyBonus);

  // Speed
  const speed = (raceData?.speed || 30) + (speedBonuses.walk || 0);
  const specialSpeeds = [...(speedBonuses.fly ? [{ name: "Fly", value: speedBonuses.fly }] : [])];
  for (const [type, value] of Object.entries(speedBonuses)) {
    if (type !== "walk" && type !== "speed") {
      specialSpeeds.push({ type, value });
    }
  }

  // Senses: deduplicate by name
  const sensesList = [
    ..._generatedGrants
      .filter((g) => g.type === "sense")
      .map((g) => {
        const name = Object.keys(g.value)[0];
        return { name, value: Number(g.value[name]) || null };
      }),
    ...normalizedFeatureEffects.senses,
    ...normalizedItemEffects.senses,
    ...normalizedSpellEffects.senses,
  ];
  const uniqueSensesMap = new Map<string, number | null>();
  for (const s of sensesList) {
    const existing = uniqueSensesMap.get(s.name);
    if (existing === undefined || (s.value !== null && (existing === null || s.value > existing))) {
      uniqueSensesMap.set(s.name, s.value);
    }
  }
  const senses = Array.from(uniqueSensesMap.entries()).map(([name, value]) => ({ name, value }));

  // Defenses: deduplicate by type and damageType
  const defensesList = [
    ..._generatedGrants
      .filter((g) =>
        [
          "damage_resistance",
          "damage_immunity",
          "damage_vulnerability",
          "condition_immunity",
        ].includes(g.type),
      )
      .map((g) => ({
        type:
          g.type === "damage_resistance"
            ? "resistance"
            : g.type === "damage_immunity"
              ? "immunity"
              : g.type === "damage_vulnerability"
                ? "vulnerability"
                : "condition_immunity",
        damageType: String(g.value),
      })),
    ...normalizedFeatureEffects.defenses,
    ...normalizedItemEffects.defenses,
    ...normalizedSpellEffects.defenses,
  ];
  const uniqueDefensesMap = new Map<string, DefenseInfo>();
  for (const d of defensesList) {
    const key = `${d.type}:${d.damageType.toLowerCase()}`;
    uniqueDefensesMap.set(key, d);
  }
  const defenses = Array.from(uniqueDefensesMap.values());

  // Features list
  const features = _generatedGrants
    .filter((g) => g.type === "feature_reference" && g.value.source !== "feat")
    .map((g) => ({
      name: g.value.name,
      description: stripTags(g.value.description),
      source: g.value.source as any,
      sourceName: g.value.sourceName,
      level: g.value.level,
      isUnlocked: true,
    }));

  const actions = deriveActionsFromFeatures(features, finalScores)
    .concat(normalizedFeatureEffects.actions)
    .concat(normalizedItemEffects.actions)
    .concat(normalizedSpellEffects.actions);
  const uniqueActionsMap = new Map<string, ActionInfo>();
  for (const a of actions) {
    uniqueActionsMap.set(a.name, a);
  }
  const finalActions = Array.from(uniqueActionsMap.values());

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

  const characterFeats = _generatedGrants
    .filter((g) => g.type === "feature_reference" && g.value.source === "feat")
    .map((g) => ({
      name: g.value.name,
      description: stripTags(g.value.description),
      choices: [], // Legacy compat
    }));

  const spellcastingData = parseJsonValue(classData?.spellcastingJson, {});
  const spellcastingAbility = String(spellcastingData?.ability || "")
    .slice(0, 3)
    .toUpperCase();

  // Combine caster level
  let casterLevelFloat = 0;
  let pactLevel = 0;

  // Check primary class
  const primProg = classData?.spellcastingJson
    ? parseJsonValue(classData.spellcastingJson, {})?.progression
    : "";
  const isMulticlassCaster =
    state.multiClasses &&
    state.multiClasses.length > 0 &&
    (primProg ||
      state.multiClasses.some((mc: any) => {
        const mcCls = effectData?.classes?.find((c: any) => c.id === mc.classId);
        return mcCls?.spellcastingJson;
      }));

  if (primProg === "full") {
    casterLevelFloat += level;
  } else if (primProg === "half") {
    if (isMulticlassCaster) {
      casterLevelFloat += Math.floor(level / 2);
    } else {
      casterLevelFloat += Math.ceil(level / 2);
    }
  } else if (primProg === "artificer") {
    casterLevelFloat += Math.ceil(level / 2);
  } else if (
    primProg === "third" ||
    subclassData?.id === "eldritch-knight" ||
    subclassData?.id === "arcane-trickster"
  ) {
    if (isMulticlassCaster) {
      casterLevelFloat += Math.floor(level / 3);
    } else {
      casterLevelFloat += Math.ceil(level / 3);
    }
  } else if (primProg === "pact") {
    pactLevel += level;
  }

  // Check multiclasses
  if (state.multiClasses && effectData?.classes) {
    for (const mc of state.multiClasses) {
      const mcCls = effectData.classes.find((c: any) => c.id === mc.classId);
      if (!mcCls) continue;
      const mcProgData = parseJsonValue(mcCls.spellcastingJson, {});
      const mcProg = mcProgData?.progression || "";

      if (mcProg === "full") {
        casterLevelFloat += mc.level;
      } else if (mcProg === "half") {
        casterLevelFloat += Math.floor(mc.level / 2);
      } else if (mcProg === "artificer") {
        casterLevelFloat += Math.ceil(mc.level / 2);
      } else if (
        mcProg === "third" ||
        mc.subclassId === "eldritch-knight" ||
        mc.subclassId === "arcane-trickster"
      ) {
        casterLevelFloat += Math.floor(mc.level / 3);
      } else if (mcProg === "pact") {
        pactLevel += mc.level;
      }
    }
  }

  const effectiveCasterLevel = Math.max(0, Math.floor(casterLevelFloat));
  let spellSlots = [];
  if (effectiveCasterLevel > 0) {
    spellSlots = (FULL_CASTER_SLOTS[Math.min(20, effectiveCasterLevel) - 1] || []).map(
      (max, index) => ({
        level: index + 1,
        max,
        used: 0,
      }),
    );
  }

  let pactSlots = [];
  if (pactLevel > 0) {
    const pact = PACT_SLOTS[Math.min(20, Math.max(1, pactLevel)) - 1];
    if (pact) {
      pactSlots = [{ level: pact.level, max: pact.slots, used: 0 }];
    }
  }

  // Gather all spellcasting classes
  const spellcasting = [];
  if (spellcastingAbility && finalScores[spellcastingAbility]) {
    spellcasting.push({
      className: classData?.name || "Unknown",
      ability: spellcastingAbility,
      saveDc: 8 + proficiencyBonus + modifier(finalScores[spellcastingAbility]),
      attackBonus: proficiencyBonus + modifier(finalScores[spellcastingAbility]),
    });
  }

  if (state.multiClasses && effectData?.classes) {
    for (const mc of state.multiClasses) {
      const mcCls = effectData.classes.find((c: any) => c.id === mc.classId);
      if (!mcCls) continue;
      const mcSpellcastingData = parseJsonValue(mcCls.spellcastingJson, {});
      const mcAbility = String(mcSpellcastingData?.ability || "")
        .slice(0, 3)
        .toUpperCase();
      if (mcAbility && finalScores[mcAbility]) {
        if (!spellcasting.some((s) => s.className === mcCls.name)) {
          spellcasting.push({
            className: mcCls.name,
            ability: mcAbility,
            saveDc: 8 + proficiencyBonus + modifier(finalScores[mcAbility]),
            attackBonus: proficiencyBonus + modifier(finalScores[mcAbility]),
          });
        }
      }
    }
  }

  const cantrips = selectedSpells
    .filter((spell) => Number(spell.level || 0) === 0)
    .map(spellToPreparedSpell);
  const preparedSpells = selectedSpells
    .filter((spell) => Number(spell.level || 0) > 0)
    .map(spellToPreparedSpell);

  let classesString = `${classData?.name || "Unknown"} ${level}`;
  const subclassesList = subclassData ? [subclassData.name] : [];

  if (state.multiClasses && effectData?.classes) {
    for (const mc of state.multiClasses) {
      const mcCls = effectData.classes.find((c: any) => c.id === mc.classId);
      if (!mcCls) continue;
      classesString += ` / ${mcCls.name} ${mc.level}`;
      if (mc.subclassId) {
        const mcSub = effectData.subclasses?.find((s: any) => s.id === mc.subclassId);
        if (mcSub) {
          subclassesList.push(mcSub.name);
        } else {
          subclassesList.push(mc.subclassId);
        }
      }
    }
  }

  // Build hit dice pools
  const hitDicePools: string[] = [];
  hitDicePools.push(`${level}d${primaryHitDie}`);
  if (state.multiClasses && effectData?.classes) {
    for (const mc of state.multiClasses) {
      const mcCls = effectData.classes.find((c: any) => c.id === mc.classId);
      const mcHitDie = mcCls?.hitDice ?? 8;
      hitDicePools.push(`${mc.level}d${mcHitDie}`);
    }
  }
  const hitDiceString = hitDicePools.join(", ");

  // _generatedGrants is now built earlier in this function

  const member: PartyMember = {
    id,
    name: state.name || "Unnamed",
    avatarUrl: state.avatarUrl || null,
    race: speciesVariantData
      ? `${speciesVariantData.name} ${raceData?.name || "Species"}`
      : raceData?.name || "Unknown",
    background: backgroundData?.name || "Custom",
    classes: classesString,
    subclasses: subclassesList,
    level: totalLevel,
    _generatedGrants,
    hpMax: Math.max(totalLevel, hpMax) + (originFeat?.id === "tough" ? totalLevel * 2 : 0),
    hpCurrent: Math.max(totalLevel, hpMax) + (originFeat?.id === "tough" ? totalLevel * 2 : 0),
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
    hitDice: hitDiceString,
    feats: characterFeats,
    alignment: state.alignment || null,
    currencies,
    weightCarried: 0,
    carryingCapacity: finalScores.STR * 15,
    attacks,
    cantrips,
    preparedSpells,
    allSpells: [...cantrips, ...preparedSpells],
    features,
    characteristics: {
      personalityTraits: "",
      ideals: "",
      bonds: "",
      flaws: "",
      appearance: "",
      age: state.age || "",
      height: state.height || "",
      weight: state.weight || "",
      eyes: state.eyes || "",
      skin: state.skin || "",
      hair: state.hair || "",
      backstory: state.backstory || "",
    },
    activeArmorModel: null,
    activeInfusions: [],
    infusions,
    metamagic,
    totemAspects: [],
    weaponMasteries,
    creatures: [],
    classDetails: [
      {
        classId: state.classId,
        subclassId: state.subclassId || null,
        level: level,
      },
      ...(state.multiClasses || []).map((mc: any) => ({
        classId: mc.classId,
        subclassId: mc.subclassId || null,
        level: mc.level,
      })),
    ],
    playerName: state.playerName || "Native Builder",
  } as any;

  return member;
}

export const saveNativeCharacter = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ character: z.custom<PartyMember>(), builderState: z.any().optional() }),
  )
  .handler(async ({ data }) => {
    const character = data.character;
    const builderState = data.builderState;
    const cacheDir = path.join(process.cwd(), "data", "cache");
    await fs.mkdir(cacheDir, { recursive: true });
    const filePath = path.join(cacheDir, `native-char-${character.id}.json`);
    await fs.writeFile(
      filePath,
      JSON.stringify({ success: true, data: character }, null, 2),
      "utf-8",
    );

    // Save to SQLite characters table
    try {
      const { db } = await import("./drizzle.server");
      const schema = await import("../db/schema");
      const { eq } = await import("drizzle-orm");

      const classRows = [
        {
          classId: builderState?.classId || character.classes || "",
          subclassId: builderState?.subclassId || character.subclasses?.[0] || null,
          level: builderState?.level || character.level || 1,
          isPrimary: true,
        },
        ...(builderState?.multiClasses || []).map((mc: any) => ({
          classId: mc.classId,
          subclassId: mc.subclassId || null,
          level: Number(mc.level || 0),
          isPrimary: false,
        })),
      ].filter((row) => row.classId && row.level > 0);

      await db
        .insert(schema.characters)
        .values({
          id: character.id.toString(),
          name: character.name,
          playerName: (character as any).playerName || "Native Builder",
          speciesId: builderState?.raceId || builderState?.speciesId || character.race || "unknown",
          backgroundId: builderState?.backgroundId || character.background || "unknown",
          classesJson: JSON.stringify(classRows),
          baseStatsJson: JSON.stringify(character.abilities || {}),
          currencyJson: JSON.stringify(
            character.currencies || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
          ),
          inventoryJson: JSON.stringify(character.inventory || []),
          equippedWeaponIdsJson: JSON.stringify([]),
          equippedArmorId: null,
          attunedItemIdsJson: JSON.stringify([]),
          currentHp: character.hpCurrent || 10,
          temporaryHp: character.tempHp || 0,
          exhaustionLevel: character.exhaustion || 0,
          heroicInspiration: character.inspiration || false,
          deathSavesJson: JSON.stringify(
            character.deathSaves || { successes: 0, failures: 0, stabilized: false },
          ),
          hitDiceExpendedJson: JSON.stringify([]),
          spellSlotsExpendedJson: JSON.stringify([]),
          featureUsesExpendedJson: JSON.stringify([]),
          activeEffectIdsJson: JSON.stringify([]),
          builderStateJson: builderState ? JSON.stringify(builderState) : null,
          rawJson: JSON.stringify(character),
        })
        .onConflictDoUpdate({
          target: schema.characters.id,
          set: {
            name: character.name,
            speciesId:
              builderState?.raceId || builderState?.speciesId || character.race || "unknown",
            backgroundId: builderState?.backgroundId || character.background || "unknown",
            classesJson: JSON.stringify(classRows),
            baseStatsJson: JSON.stringify(character.abilities || {}),
            currencyJson: JSON.stringify(
              character.currencies || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
            ),
            inventoryJson: JSON.stringify(character.inventory || []),
            currentHp: character.hpCurrent || 10,
            temporaryHp: character.tempHp || 0,
            exhaustionLevel: character.exhaustion || 0,
            heroicInspiration: character.inspiration || false,
            deathSavesJson: JSON.stringify(
              character.deathSaves || { successes: 0, failures: 0, stabilized: false },
            ),
            builderStateJson: builderState ? JSON.stringify(builderState) : null,
            rawJson: JSON.stringify(character),
          },
        });

      const characterId = character.id.toString();
      await db
        .delete(schema.characterClasses)
        .where(eq(schema.characterClasses.characterId, characterId));
      await db
        .delete(schema.characterChoices)
        .where(eq(schema.characterChoices.characterId, characterId));
      await db
        .delete(schema.characterInventory)
        .where(eq(schema.characterInventory.characterId, characterId));
      await db
        .delete(schema.characterSpells)
        .where(eq(schema.characterSpells.characterId, characterId));
      await db
        .delete(schema.characterSources)
        .where(eq(schema.characterSources.characterId, characterId));
      await db
        .delete(schema.characterOverrides)
        .where(eq(schema.characterOverrides.characterId, characterId));

      if (classRows.length > 0) {
        await db.insert(schema.characterClasses).values(
          classRows.map((row, index) => ({
            id: `${characterId}:class:${index}`,
            characterId,
            classId: row.classId,
            subclassId: row.subclassId,
            level: row.level,
            isPrimary: row.isPrimary,
          })),
        );
      }

      const ruleChoices = builderState?.ruleChoices || {};
      const choiceRows = Object.entries(ruleChoices).flatMap(([groupId, choiceIds]) =>
        (Array.isArray(choiceIds) ? choiceIds : []).map((choiceId: any, index: number) => ({
          id: `${characterId}:choice:${groupId}:${index}`,
          characterId,
          groupId,
          choiceId: String(choiceId),
        })),
      );
      if (choiceRows.length > 0) {
        await db.insert(schema.characterChoices).values(choiceRows);
      }

      const inventoryRows = (character.inventory || []).map(
        (item: InventoryItem, index: number) => ({
          id: `${characterId}:inventory:${index}`,
          characterId,
          itemId: item.name,
          quantity: Number(item.quantity || 1),
          isEquipped: Boolean(item.equipped),
          isAttuned: Boolean(item.attuned),
        }),
      );
      if (inventoryRows.length > 0) {
        await db.insert(schema.characterInventory).values(inventoryRows);
      }

      const spellRows: Array<{
        id: string;
        characterId: string;
        spellId: string;
        classId: string | null;
        isPrepared: boolean;
        isAlwaysPrepared: boolean;
      }> = [];
      for (const [classId, spellIds] of Object.entries(builderState?.cantripChoicesByClass || {})) {
        for (const spellId of Array.isArray(spellIds) ? spellIds : []) {
          spellRows.push({
            id: `${characterId}:spell:${classId}:cantrip:${spellRows.length}`,
            characterId,
            spellId: String(spellId),
            classId,
            isPrepared: true,
            isAlwaysPrepared: false,
          });
        }
      }
      for (const [classId, spellIds] of Object.entries(
        builderState?.preparedSpellChoicesByClass || {},
      )) {
        for (const spellId of Array.isArray(spellIds) ? spellIds : []) {
          spellRows.push({
            id: `${characterId}:spell:${classId}:prepared:${spellRows.length}`,
            characterId,
            spellId: String(spellId),
            classId,
            isPrepared: true,
            isAlwaysPrepared: false,
          });
        }
      }
      if (spellRows.length > 0) {
        await db.insert(schema.characterSpells).values(spellRows);
      }

      const sourceIds = new Set<string>();
      for (const source of Object.values((character as any).sourceIds || {}) as string[]) {
        if (source) sourceIds.add(source);
      }
      for (const source of builderState?.sourcePolicy?.excludedSources || []) {
        if (source) sourceIds.add(`excluded:${source}`);
      }
      if (sourceIds.size > 0) {
        await db.insert(schema.characterSources).values(
          Array.from(sourceIds).map((sourceId, index) => ({
            id: `${characterId}:source:${index}`,
            characterId,
            sourceId,
          })),
        );
      }
    } catch (dbErr) {
      console.error("Failed to save character to SQLite table:", dbErr);
    }

    return character.id;
  });

export const getNativeCharacter = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ data }) => {
    if (!data?.id) return null;

    // Try loading from SQLite first
    try {
      const { db } = await import("./drizzle.server");
      const schema = await import("../db/schema");
      const { eq } = await import("drizzle-orm");

      const rows = await db
        .select()
        .from(schema.characters)
        .where(eq(schema.characters.id, data.id.toString()));

      if (rows.length > 0 && rows[0].rawJson) {
        const payload = JSON.parse(rows[0].rawJson);
        payload.isNative = true;
        return payload as PartyMember;
      }
    } catch (dbErr) {
      console.warn("Failed to load native character from SQLite:", dbErr);
    }

    // Fallback to cache JSON file
    try {
      const cacheDir = path.join(process.cwd(), "data", "cache");
      const filePath = path.join(cacheDir, `native-char-${data.id}.json`);
      const content = await fs.readFile(filePath, "utf-8");
      const payload = JSON.parse(content);
      const member = payload.data as PartyMember;
      member.isNative = true;
      return member;
    } catch {
      return null;
    }
  });

function parseCanonicalCharacterInput(canonicalCharacter: any) {
  if (!canonicalCharacter) return {};
  if (canonicalCharacter.builderState) return canonicalCharacter.builderState;
  if (canonicalCharacter.builderStateJson) {
    return parseJsonValue(canonicalCharacter.builderStateJson, {});
  }
  if (canonicalCharacter.rawJson) {
    const raw = parseJsonValue(canonicalCharacter.rawJson, {});
    return raw?.builderState || raw;
  }
  return canonicalCharacter;
}

function selectedSpellIdsFromState(state: any) {
  const ids = new Set<string>();
  for (const id of state.cantripChoices || []) ids.add(id);
  for (const id of state.preparedSpellChoices || []) ids.add(id);
  for (const list of Object.values(state.cantripChoicesByClass || {}) as any[]) {
    for (const id of list || []) ids.add(id);
  }
  for (const list of Object.values(state.preparedSpellChoicesByClass || {}) as any[]) {
    for (const id of list || []) ids.add(id);
  }
  for (const values of Object.values(state.ruleChoices || {}) as any[]) {
    for (const id of values || []) ids.add(id);
  }
  for (const extra of Object.values(state.highLevelFeatExtraChoices || {}) as any[]) {
    for (const id of extra?.cantrips || []) ids.add(id);
    for (const id of extra?.spells || []) ids.add(id);
  }
  return ids;
}

export function computeCharacterSnapshot(canonicalCharacter: any, forgeData: any) {
  const state = parseCanonicalCharacterInput(canonicalCharacter);
  const raceData = forgeData?.species?.find(
    (race: any) => race.id === state.raceId || race.id === state.speciesId,
  );
  const speciesVariantData = forgeData?.speciesVariants?.find(
    (variant: any) => variant.id === state.speciesVariantId,
  );
  const backgroundData = forgeData?.backgrounds?.find(
    (background: any) => background.id === state.backgroundId,
  );
  const classData = forgeData?.classes?.find((cls: any) => cls.id === state.classId);
  const subclassData = forgeData?.subclasses?.find(
    (subclass: any) => subclass.id === state.subclassId,
  );
  const originFeat = backgroundData?.originFeatId
    ? forgeData?.feats?.find((feat: any) => feat.id === backgroundData.originFeatId)
    : undefined;
  const selectedSpellIds = selectedSpellIdsFromState(state);
  const selectedSpells = (forgeData?.spells || []).filter((spell: any) =>
    selectedSpellIds.has(spell.id),
  );

  return createNativePartyMember(
    state,
    raceData,
    classData,
    backgroundData,
    subclassData,
    originFeat,
    selectedSpells,
    forgeData?.classFeatures || [],
    {
      activeEffects: forgeData?.activeEffects || [],
      featureActiveEffects: forgeData?.featureActiveEffects || [],
      itemActiveEffects: forgeData?.itemActiveEffects || [],
      spellActiveEffects: forgeData?.spellActiveEffects || [],
      magicItems: forgeData?.magicItems || [],
      feats: forgeData?.feats || [],
      weapons: forgeData?.weapons || [],
      armor: forgeData?.armor || [],
      classes: forgeData?.classes || [],
      subclasses: forgeData?.subclasses || [],
      skills: forgeData?.skills || [],
      senses: forgeData?.senses || [],
      conditions: forgeData?.conditions || [],
      rulesActions: forgeData?.rulesActions || [],
      optionalFeatures: forgeData?.optionalFeatures || [],
      charOptions: forgeData?.charOptions || [],
      mundaneGear: forgeData?.mundaneGear || [],
      weaponMasteries: forgeData?.weaponMasteries || [],
      itemProperties: forgeData?.itemProperties || [],
      itemTypes: forgeData?.itemTypes || [],
      itemTypeAdditionalEntries: forgeData?.itemTypeAdditionalEntries || [],
      itemGroups: forgeData?.itemGroups || [],
      magicVariants: forgeData?.magicVariants || [],
      itemCardReferences: forgeData?.itemCardReferences || [],
      challengeRatings: forgeData?.challengeRatings || [],
      creatureBuilderEntries: forgeData?.creatureBuilderEntries || [],
    },
    speciesVariantData,
  );
}
