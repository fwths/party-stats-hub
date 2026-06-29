import { validateCharacterDraft } from "../../lib/rules/validate-character";
import type { ForgeData } from "@/lib/forge/forge-data";
import {
  ABILITIES,
  SKILL_OPTIONS,
  TOOL_OPTIONS,
  FIGHTING_STYLE_OPTIONS,
  WEAPON_MASTERY_OPTIONS,
  PREPARED_SPELLS_BY_CLASS,
  INVOCATION_LEVEL_PREREQUISITES,
  INVOCATION_PACT_PREREQUISITES,
  WARLOCK_INVOCATION_COUNTS,
  SOURCE_LABELS,
} from "./BuilderConstants";

export type BuilderState = {
  id?: number;
  name: string;
  raceId: string | null;
  speciesVariantId: string | null;
  backgroundId: string | null;
  classId: string | null;
  subclassId: string | null;
  level: number;
  abilities: Record<string, number>;
  abilityBonuses: Record<string, number>;
  ruleChoices: Record<string, string[]>;
  highLevelFeatChoices?: Record<number, string>;
  featChoices?: any;
  classToolChoices?: string[];
  notes?: string;
  sourcePolicy?: any;
  contentToggles?: any;

  // Biography
  avatarUrl?: string;
  playerName?: string;
  alignment?: string;
  age?: string;
  height?: string;
  weight?: string;
  eyes?: string;
  skin?: string;
  hair?: string;
  backstory?: string;

  // HP custom rolling
  hpType: "fixed" | "manual";
  manualHpRolls?: Record<number, number>;

  // Custom equipment catalog
  customEquipment?: Array<{
    name: string;
    type: string;
    quantity: number;
    equipped: boolean;
    attuned: boolean;
    cost?: number;
    weight?: number;
    description?: string;
    rarity?: string;
  }>;

  // Multiclassing
  multiClasses?: Array<{ classId: string; subclassId: string | null; level: number }>;

  // New validation and multiclass spellcasting fields
  abilitiesMethod?: "standard" | "pointbuy" | "roll";
  cantripChoicesByClass?: Record<string, string[]>;
  preparedSpellChoicesByClass?: Record<string, string[]>;
  cantripChoices?: string[];
  preparedSpellChoices?: string[];
  speciesSkillChoices?: string[];
  speciesToolChoices?: string[];
  speciesLanguageChoices?: string[];
  backgroundToolChoices?: string[];
  backgroundLanguageChoices?: string[];
  backgroundEquipmentOption?: string;
  featureChoices?: Record<string, string[]>;
  classSkillChoices?: string[];
  highLevelFeatExtraChoices?: Record<string, any>;
};

export type ChoiceGroup = {
  id: string;
  label: string;
  count: number;
  options: string[];
};

export type TraitChoiceGroup = {
  id: string;
  label: string;
  options: string[];
};

export type FeatureOptionGroup = {
  featureId: string;
  featureName: string;
  count: number;
  options: string[];
};

export function parseJsonValue(value: string | null | undefined, fallback: any) {
  if (!value) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function getSourceLabel(item: any): string {
  const source = String(item.source || "Unknown").toUpperCase();
  return SOURCE_LABELS[source] || item.source || "Unknown";
}

export function getJsonField(item: any, camel: string, snake: string) {
  return item?.[camel] ?? item?.[snake];
}

export function toAbilityKey(value: string): string {
  return value.slice(0, 3).toUpperCase();
}

export function getBackgroundAbilityOptions(background: any): string[] {
  const raw = getJsonField(background, "abilityScoreIncreasesJson", "ability_score_increases_json");
  const entries = parseJsonValue(raw, []);
  const options = new Set<string>();

  const visit = (value: any) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value === "string") {
      const ability = toAbilityKey(value);
      if (ABILITIES.includes(ability)) options.add(ability);
      return;
    }
    if (typeof value !== "object") return;
    if (value.from) visit(value.from);
    if (value.weighted?.from) visit(value.weighted.from);
    if (value.choose) visit(value.choose);
    Object.entries(value).forEach(([key, enabled]) => {
      const ability = toAbilityKey(key);
      if (ABILITIES.includes(ability) && (enabled === true || typeof enabled === "number")) {
        options.add(ability);
      }
      if (typeof enabled === "object") visit(enabled);
    });
  };

  visit(entries);
  return Array.from(options);
}

export function getDefaultBackgroundBonuses(background: any): Record<string, number> {
  const bonuses = Object.fromEntries(ABILITIES.map((ab) => [ab, 0])) as Record<string, number>;
  const options = getBackgroundAbilityOptions(background);
  if (options[0]) bonuses[options[0]] = 2;
  if (options[1]) bonuses[options[1]] = 1;
  return bonuses;
}

export function setBackgroundBonus(
  current: Record<string, number>,
  ability: string,
  amount: 1 | 2,
  options: string[],
): Record<string, number> {
  const next = Object.fromEntries(ABILITIES.map((ab) => [ab, 0])) as Record<string, number>;
  const otherAmount = amount === 2 ? 1 : 2;
  const currentOther = ABILITIES.find((ab) => current[ab] === otherAmount && ab !== ability);
  next[ability] = amount;
  if (currentOther && options.includes(currentOther)) {
    next[currentOther] = otherAmount;
  } else {
    const fallback = options.find((ab) => ab !== ability);
    if (fallback) next[fallback] = otherAmount;
  }
  return next;
}

export function isValidAbilityBonusSet(character: BuilderState): boolean {
  const values = Object.values(character.abilityBonuses);
  return (
    values.filter((value) => value === 2).length === 1 &&
    values.filter((value) => value === 1).length === 1
  );
}

export function getSubclassChoiceLevel(subclasses: any[]): number {
  return Math.min(...subclasses.map((sub) => sub.levelChosen || 3));
}

export function formatList(raw: string | null | undefined): string {
  const value = parseJsonValue(raw, []);
  if (!value) return "";
  if (Array.isArray(value)) return value.map((item) => String(item)).join(", ");
  if (typeof value === "object")
    return Object.values(value)
      .flat()
      .map((item) => String(item))
      .join(", ");
  return String(value);
}

export function normalizeChoiceName(value: unknown): string {
  return String(value ?? "")
    .replace(/\{@(?:item|skill|filter)\s+([^}|]+)(?:\|[^}]*)?\}/g, "$1")
    .replace(/\{@[^}]+\}/g, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace("'S", "'s");
}

export function getProficiencyChoiceGroups(
  raw: unknown,
  type: "skills" | "tools",
  fallbackOptions: string[],
): ChoiceGroup[] {
  const parsed = parseJsonValue(raw as any, {});
  const entries = type && !Array.isArray(parsed) ? parsed?.[type] : parsed;
  if (!Array.isArray(entries)) return [];

  return entries.flatMap((entry: any, index: number) => {
    if (entry?.any) {
      return [
        {
          id: `${type}-any-${index}`,
          label: `Choose ${entry.any} ${type === "skills" ? "skill" : "tool"}${entry.any > 1 ? "s" : ""}`,
          count: Number(entry.any),
          options: fallbackOptions,
        },
      ];
    }
    const choose = entry?.choose;
    if (choose?.from) {
      const options = choose.from.map(normalizeChoiceName).filter(Boolean);
      return [
        {
          id: `${type}-choose-${index}`,
          label: `Choose ${choose.count || 1}`,
          count: Number(choose.count || 1),
          options,
        },
      ];
    }
    return [];
  });
}

export function getToolChoiceGroups(raw: unknown, toolOptions = TOOL_OPTIONS): ChoiceGroup[] {
  const parsed = parseJsonValue(raw as any, []);
  const values = Array.isArray(parsed) ? parsed : [parsed];
  return values.flatMap((entry: any, index: number) => {
    if (typeof entry === "string" && /AnyArtisansTool/i.test(entry)) {
      return [
        {
          id: `artisan-tool-${index}`,
          label: "Choose one artisan's tool",
          count: 1,
          options: getArtisanToolOptions(toolOptions),
        },
      ];
    }
    if (entry?.anyArtisansTool) {
      return [
        {
          id: `artisan-tool-${index}`,
          label: `Choose ${entry.anyArtisansTool} artisan's tool`,
          count: Number(entry.anyArtisansTool),
          options: getArtisanToolOptions(toolOptions),
        },
      ];
    }
    if (entry?.any) {
      return [
        {
          id: `tool-any-${index}`,
          label: `Choose ${entry.any} tool${entry.any > 1 ? "s" : ""}`,
          count: Number(entry.any),
          options: toolOptions,
        },
      ];
    }
    return [];
  });
}

export function getLanguageOptions(referenceEntries: any[]): string[] {
  return Array.from(
    new Set(
      (referenceEntries || [])
        .filter((entry: any) => !entry.entityType || entry.entityType === "language")
        .map((entry: any) => normalizeChoiceName(entry.name))
        .filter(Boolean),
    ),
  ).sort();
}

export function getSkillOptionsFromDb(skills: any[] | undefined): string[] {
  const options = (skills || [])
    .map((skill: any) => normalizeChoiceName(skill.name))
    .filter(Boolean);
  return options.length > 0 ? Array.from(new Set(options)).sort() : SKILL_OPTIONS;
}

export function getToolOptionsFromDb(mundaneGear: any[] | undefined, itemTypes?: any[]): string[] {
  const toolTypeCodes = new Set(["AT", "GS", "INS", "T"]);
  const typeNames = (itemTypes || [])
    .filter((type: any) => toolTypeCodes.has(String(type.abbreviation || "").split("|")[0]))
    .map((type: any) => normalizeChoiceName(type.name))
    .filter(Boolean);
  const gearNames = (mundaneGear || [])
    .filter((item: any) => {
      const type = String(item.type || "").split("|")[0];
      const name = String(item.name || "");
      return toolTypeCodes.has(type) || /tools|supplies|utensils|kit|instrument|set/i.test(name);
    })
    .map((item: any) => normalizeChoiceName(item.name))
    .filter(Boolean);
  const options = Array.from(new Set([...typeNames, ...gearNames])).sort();
  return options.length > 0 ? options : TOOL_OPTIONS;
}

export function getArtisanToolOptions(toolOptions: string[]): string[] {
  const artisanTools = toolOptions.filter((tool) => /Supplies|Tools|Utensils/i.test(tool));
  return artisanTools.length > 0
    ? artisanTools
    : TOOL_OPTIONS.filter((tool) => /Supplies|Tools|Utensils/i.test(tool));
}

export function getLanguageChoiceGroups(raw: unknown, languageOptions: string[]): ChoiceGroup[] {
  const parsed = parseJsonValue(raw as any, []);
  const values = Array.isArray(parsed) ? parsed : [parsed];

  return values.flatMap((entry: any, index: number) => {
    if (!entry || typeof entry !== "object") return [];
    if (entry.anyStandard || entry.any) {
      const count = Number(entry.anyStandard || entry.any);
      return [
        {
          id: `language-any-${index}`,
          label: `Choose ${count} language${count === 1 ? "" : "s"}`,
          count,
          options: languageOptions,
        },
      ];
    }
    if (entry.other) {
      return [
        {
          id: `language-other-${index}`,
          label: "Choose one language",
          count: 1,
          options: languageOptions,
        },
      ];
    }
    if (entry.choose?.from) {
      const options = entry.choose.from
        .map((language: unknown) =>
          String(language).toLowerCase() === "other"
            ? languageOptions
            : [normalizeChoiceName(language)],
        )
        .flat()
        .filter(Boolean);
      return [
        {
          id: `language-choose-${index}`,
          label: `Choose ${entry.choose.count || 1} language${Number(entry.choose.count || 1) === 1 ? "" : "s"}`,
          count: Number(entry.choose.count || 1),
          options: Array.from(new Set(options)),
        },
      ];
    }
    return [];
  });
}

export function getFixedLanguages(raw: unknown): string[] {
  const parsed = parseJsonValue(raw as any, []);
  const values = Array.isArray(parsed) ? parsed : [parsed];
  const ignored = new Set(["any", "anystandard", "other", "choose"]);
  return Array.from(
    new Set(
      values.flatMap((entry: any) => {
        if (!entry || typeof entry !== "object") return [];
        return Object.entries(entry)
          .filter(([key, enabled]) => !ignored.has(key.toLowerCase()) && enabled === true)
          .map(([key]) => normalizeChoiceName(key));
      }),
    ),
  );
}

export function areChoiceGroupsComplete(groups: ChoiceGroup[], selected: string[]): boolean {
  return selected.length >= groups.reduce((total, group) => total + group.count, 0);
}

export function toggleChoice(selected: string[], choice: string, max: number): string[] {
  if (selected.includes(choice)) return selected.filter((item) => item !== choice);
  if (selected.length >= max) return [...selected.slice(1), choice];
  return [...selected, choice];
}

export function getEquipmentOptions(raw: unknown): Array<{ id: string; summary: string }> {
  const parsed = parseJsonValue(raw as any, {});
  const packages = Array.isArray(parsed) ? parsed[0] : parsed?.defaultData?.[0];
  if (!packages || typeof packages !== "object") return [];
  return Object.entries(packages).map(([id, items]) => ({
    id,
    summary: formatEquipmentPackage(items as any[]),
  }));
}

export function formatEquipmentPackage(items: any[]): string {
  if (!Array.isArray(items)) return "";
  return items
    .map((item) => {
      if (item.value) return `${Math.floor(Number(item.value) / 100)} GP`;
      if (item.displayName) return normalizeChoiceName(item.displayName);
      if (item.item) {
        const [name] = String(item.item).split("|");
        return `${item.quantity && item.quantity > 1 ? `${item.quantity} ` : ""}${normalizeChoiceName(name)}`;
      }
      if (item.equipmentType) return normalizeChoiceName(item.equipmentType);
      if (item.special) return normalizeChoiceName(item.special);
      return "";
    })
    .filter(Boolean)
    .join(", ");
}

export function getSpellcastingInfo(cls: any) {
  return parseJsonValue(cls?.spellcastingJson, {});
}

export function isSpellcaster(cls: any): boolean {
  const spellcasting = getSpellcastingInfo(cls);
  return Boolean(spellcasting?.progression || spellcasting?.cantrips?.length);
}

export function getCantripLimit(characterOrLevel: BuilderState | number, cls: any): number {
  const level = typeof characterOrLevel === "number" ? characterOrLevel : characterOrLevel.level;
  const cantrips = getSpellcastingInfo(cls)?.cantrips;
  if (!Array.isArray(cantrips)) return 0;
  return Number(cantrips[Math.max(0, level - 1)] || 0);
}

export function getMaxSpellLevel(characterOrLevel: BuilderState | number, cls: any): number {
  const level = typeof characterOrLevel === "number" ? characterOrLevel : characterOrLevel.level;
  const progression = getSpellcastingInfo(cls)?.progression;
  if (!progression) return 0;
  if (progression === "full") return Math.min(9, Math.ceil(level / 2));
  if (progression === "artificer" || progression === "half") {
    return Math.min(5, Math.max(1, Math.ceil(level / 4)));
  }
  if (progression === "third") return Math.min(4, Math.max(1, Math.ceil(level / 6)));
  return 1;
}

export function getPreparedSpellLimit(
  characterOrAbilities: BuilderState | Record<string, number>,
  cls: any,
  levelInput?: number,
): number {
  if (!isSpellcaster(cls)) return 0;
  let abilities: Record<string, number>;
  let bonuses: Record<string, number> = {};
  let level: number;

  if (
    characterOrAbilities &&
    "abilities" in characterOrAbilities &&
    typeof (characterOrAbilities as any).abilities === "object"
  ) {
    abilities = (characterOrAbilities as any).abilities;
    bonuses = (characterOrAbilities as any).abilityBonuses || {};
    level = (characterOrAbilities as any).level;
  } else {
    abilities = characterOrAbilities as Record<string, number>;
    level = levelInput || 1;
  }

  const byClass = PREPARED_SPELLS_BY_CLASS[cls.id];
  if (byClass) return Number(byClass[Math.max(0, level - 1)] || 0);

  const ability = String(getSpellcastingInfo(cls)?.ability || "int")
    .slice(0, 3)
    .toUpperCase();
  const abilityScore = (abilities[ability] || 10) + (bonuses[ability] || 0);
  return Math.max(1, level + Math.floor((abilityScore - 10) / 2));
}

export function getSpellcasters(
  character: BuilderState,
  classes: any[],
): Array<{ cls: any; level: number }> {
  const result: Array<{ cls: any; level: number }> = [];
  if (character.classId) {
    const cls = classes.find((c) => c.id === character.classId);
    if (cls && isSpellcaster(cls)) {
      result.push({ cls, level: character.level });
    }
  }
  if (character.multiClasses) {
    for (const mc of character.multiClasses) {
      if (mc.classId) {
        const cls = classes.find((c) => c.id === mc.classId);
        if (cls && isSpellcaster(cls)) {
          result.push({ cls, level: mc.level });
        }
      }
    }
  }
  return result;
}

export function getClassCantripChoices(character: BuilderState, classId: string): string[] {
  if (character.cantripChoicesByClass?.[classId]) {
    return character.cantripChoicesByClass[classId];
  }
  if (classId === character.classId) {
    return character.cantripChoices || [];
  }
  return [];
}

export function getClassPreparedSpellChoices(character: BuilderState, classId: string): string[] {
  if (character.preparedSpellChoicesByClass?.[classId]) {
    return character.preparedSpellChoicesByClass[classId];
  }
  if (classId === character.classId) {
    return character.preparedSpellChoices || [];
  }
  return [];
}

export function getPointsUsed(abilities: Record<string, number>): number {
  const pointCosts: Record<number, number> = {
    8: 0,
    9: 1,
    10: 2,
    11: 3,
    12: 4,
    13: 5,
    14: 7,
    15: 9,
  };
  let total = 0;
  for (const ab of ABILITIES) {
    const val = abilities[ab] || 8;
    if (val >= 8 && val <= 15) {
      total += pointCosts[val] || 0;
    } else {
      total += val < 8 ? 0 : 9 + (val - 15) * 2;
    }
  }
  return total;
}

export function isSpellStepValid(character: BuilderState, classes: any[]): boolean {
  const spellcasters = getSpellcasters(character, classes);
  if (spellcasters.length === 0) return true;

  for (const { cls, level } of spellcasters) {
    const cantripLimit = getCantripLimit(level, cls);
    const preparedLimit = getPreparedSpellLimit(character.abilities, cls, level);
    const selectedCantrips = getClassCantripChoices(character, cls.id);
    const selectedPrepared = getClassPreparedSpellChoices(character, cls.id);

    if (selectedCantrips.length !== cantripLimit) return false;
    if (
      selectedPrepared.length < Math.min(1, preparedLimit) ||
      selectedPrepared.length > preparedLimit
    ) {
      return false;
    }
  }
  return true;
}

export function meetsClassPrerequisites(
  classEntity: any,
  finalAbilities: Record<string, number>,
): boolean {
  if (!classEntity?.primaryAbilityJson) return true;
  const prim = parseJsonValue(classEntity.primaryAbilityJson, []);
  if (!Array.isArray(prim) || prim.length === 0) return true;

  return prim.some((condition: any) => {
    return Object.keys(condition).every((abilityKey) => {
      const score = finalAbilities[abilityKey.toUpperCase()] || 10;
      return score >= 13;
    });
  });
}

export function calculateFinalAbilities(character: BuilderState): Record<string, number> {
  const finalAbilities: Record<string, number> = {};
  for (const ab of ABILITIES) {
    finalAbilities[ab] = (character.abilities[ab] || 10) + (character.abilityBonuses[ab] || 0);
  }
  return finalAbilities;
}

export function getBuilderValidationIssues(character: BuilderState, data: ForgeData): string[] {
  const issues = validateCharacterDraft(character, data);
  return issues.map((i) => i.message);
}

export function spellSummary(spell: any): string {
  return [spell.school, spell.castingTime, spell.range].filter(Boolean).join(" • ");
}

export function emptyFeatChoices(): BuilderState["featChoices"] {
  return { cantrips: [], spells: [], skills: [], tools: [] };
}

export function getClassSpellOptions(
  spellList: string | undefined,
  level: number,
  spells: any[],
  classSpells: any[],
) {
  if (!spellList) return [];
  const linkedSpellIds = new Set(
    classSpells
      .filter((link: any) => (link.classId ?? link.class_id) === spellList)
      .map((link: any) => link.spellId ?? link.spell_id),
  );
  return spells
    .filter((spell: any) => linkedSpellIds.has(spell.id) && spell.level === level)
    .sort((a: any, b: any) => a.name.localeCompare(b.name));
}

export function areOriginFeatChoicesComplete(originFeat: any, character: BuilderState): boolean {
  if (!originFeat) return true;
  const choices = character.featChoices;
  if (originFeat.id === "magic-initiate") {
    return (
      Boolean(choices.spellList) &&
      Boolean(choices.spellcastingAbility) &&
      choices.cantrips.length === 2 &&
      choices.spells.length === 1
    );
  }
  if (originFeat.id === "aberrant-dragonmark") {
    return choices.cantrips.length === 1 && choices.spells.length === 1;
  }
  if (originFeat.id === "crafter") return choices.tools.length === 3;
  if (originFeat.id === "skilled") return choices.skills.length + choices.tools.length === 3;
  return true;
}

export function getUnlockedFeatureOptionGroups(
  character: BuilderState,
  classFeatures: any[],
  skillOptions = SKILL_OPTIONS,
): FeatureOptionGroup[] {
  if (!character.classId) return [];
  return classFeatures
    .filter((feature: any) => {
      const classId = feature.classId ?? feature.class_id;
      const subclassId = feature.subclassId ?? feature.subclass_id;
      const levelRequired = feature.levelRequired ?? feature.level_required ?? 0;
      return (
        classId === character.classId &&
        (!subclassId || subclassId === character.subclassId) &&
        Number(levelRequired || 0) <= character.level
      );
    })
    .flatMap((feature: any) => {
      const groups = parseJsonValue(feature.optionsJson ?? feature.options_json, []);
      const structuredGroups = Array.isArray(groups) ? groups : [];
      const syntheticGroups = getSyntheticFeatureOptionGroups(feature, character, skillOptions);
      return [...structuredGroups, ...syntheticGroups].flatMap((group: any, index: number) => {
        if (!Array.isArray(group.options) || group.options.length === 0) return [];
        const options = filterFeatureOptions(
          feature,
          group.options.map(normalizeChoiceName),
          character,
        );
        if (options.length === 0) return [];
        return [
          {
            featureId: `${feature.id}:${index}`,
            featureName: feature.name,
            count: getFeatureOptionCount(feature, Number(group.count || 1), character),
            options,
          },
        ];
      });
    });
}

export function getFeatureOptionCount(
  feature: any,
  fallbackCount: number,
  character: BuilderState,
): number {
  const name = String(feature.name || "");
  if (/eldritch invocation/i.test(name)) {
    return WARLOCK_INVOCATION_COUNTS[Math.max(0, character.level - 1)] || fallbackCount;
  }
  return fallbackCount;
}

export function filterFeatureOptions(
  feature: any,
  options: string[],
  character: BuilderState,
): string[] {
  const name = String(feature.name || "");
  if (!/eldritch invocation/i.test(name)) return options;

  const selectedInvocations = new Set(
    Object.entries(character.featureChoices || {})
      .filter(([featureChoiceId]) => featureChoiceId.startsWith(String(feature.id)))
      .flatMap(([, selected]) => selected),
  );

  return options.filter((option) => {
    const requiredLevel = INVOCATION_LEVEL_PREREQUISITES[option] || 0;
    if (requiredLevel && character.level < requiredLevel) return false;

    const requiredPact = INVOCATION_PACT_PREREQUISITES[option];
    if (requiredPact && !selectedInvocations.has(requiredPact)) return false;

    return true;
  });
}

export function selectedSkillNames(character: BuilderState): string[] {
  return Array.from(
    new Set([
      ...(character.speciesSkillChoices || []),
      ...(character.featChoices?.skills || []),
      ...(character.classSkillChoices || []),
    ]),
  ).filter(Boolean);
}

export function weaponMasteryCount(classId: string | null, level: number): number {
  if (classId === "fighter") return level >= 9 ? 4 : 3;
  if (["barbarian", "paladin", "ranger", "rogue"].includes(classId || "")) return 2;
  return 0;
}

export function getSyntheticFeatureOptionGroups(
  feature: any,
  character: BuilderState,
  skillOptions = SKILL_OPTIONS,
) {
  const name = String(feature.name || "");
  const featureId = String(feature.id || "");
  const classId = feature.classId ?? feature.class_id;
  const levelRequired = Number(feature.levelRequired ?? feature.level_required ?? 0);

  if (name === "Expertise") {
    const options = selectedSkillNames(character);
    return options.length > 0 ? [{ count: 2, options }] : [{ count: 2, options: skillOptions }];
  }

  if (/fighting style/i.test(name)) {
    return [{ count: 1, options: FIGHTING_STYLE_OPTIONS }];
  }

  if (name === "Weapon Mastery" && /weapon-mastery/i.test(featureId)) {
    const count = weaponMasteryCount(classId, character.level || levelRequired);
    return count > 0 ? [{ count, options: WEAPON_MASTERY_OPTIONS }] : [];
  }

  return [];
}

export function areFeatureChoicesComplete(
  groups: FeatureOptionGroup[],
  choices: Record<string, string[]>,
): boolean {
  return groups.every((group) => {
    const selected = choices[group.featureId] || [];
    return (
      selected.length >= group.count && selected.every((choice) => group.options.includes(choice))
    );
  });
}

export function formatAbilitySummary(raw: string | null | undefined): string {
  const value = parseJsonValue(raw, []);
  if (!value || (Array.isArray(value) && value.length === 0)) return "";

  if (Array.isArray(value)) {
    return value
      .flatMap((entry: any) => {
        if (!entry || typeof entry !== "object") return [];
        return Object.entries(entry)
          .filter(([, enabled]) => enabled === true || typeof enabled === "number")
          .map(([ability, amount]) =>
            typeof amount === "number"
              ? `+${amount} ${ability.toUpperCase()}`
              : ability.toUpperCase(),
          );
      })
      .join(", ");
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .map(([ability, amount]) => `+${amount} ${ability.toUpperCase()}`)
      .join(", ");
  }

  return "";
}

export function formatSensesSummary(raw: string | null | undefined): string {
  const value = parseJsonValue(raw, []);
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([sense, distance]) => `${sense} ${distance}ft`)
      .join(", ");
  }
  return "";
}

export function formatPrimaryAbility(raw: string | null | undefined): string {
  const value = parseJsonValue(raw, []);
  if (!Array.isArray(value)) return "";

  return value
    .flatMap((entry: any) =>
      entry && typeof entry === "object"
        ? Object.entries(entry)
            .filter(([, enabled]) => enabled === true)
            .map(([ability]) => ability.toUpperCase())
        : [],
    )
    .join(" or ");
}

export function getFeatChoiceLevels(classId: string | null, level: number): number[] {
  if (level < 4) return [];
  const levels: number[] = [];
  if (level >= 4) levels.push(4);
  if (classId === "fighter" && level >= 6) levels.push(6);
  if (level >= 8) levels.push(8);
  if (classId === "rogue" && level >= 10) levels.push(10);
  if (level >= 12) levels.push(12);
  if (classId === "fighter" && level >= 14) levels.push(14);
  if (level >= 16) levels.push(16);
  if (level >= 19) levels.push(19);
  return levels;
}
