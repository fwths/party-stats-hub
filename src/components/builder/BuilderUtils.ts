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
  name: string;
  raceId: string | null;
  backgroundId: string | null;
  classId: string | null;
  subclassId: string | null;
  level: number;
  abilities: Record<string, number>;
  abilityBonuses: Record<string, number>;
  speciesTraitChoices: Record<string, string>;
  speciesSkillChoices: string[];
  speciesToolChoices: string[];
  backgroundToolChoices: string[];
  backgroundEquipmentOption: string | null;
  featChoices: {
    spellList?: string;
    spellcastingAbility?: string;
    cantrips: string[];
    spells: string[];
    skills: string[];
    tools: string[];
  };
  classSkillChoices: string[];
  classToolChoices: string[];
  classEquipmentOption: string | null;
  featureChoices: Record<string, string[]>;
  cantripChoices: string[];
  preparedSpellChoices: string[];
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

export function getSpeciesTraitGroups(species: any): TraitChoiceGroup[] {
  if (!species) return [];
  const id = species.id;
  if (id === "elf") {
    return [
      { id: "elvenLineage", label: "Elven Lineage", options: ["Drow", "High Elf", "Wood Elf"] },
    ];
  }
  if (id === "gnome") {
    return [
      { id: "gnomishLineage", label: "Gnomish Lineage", options: ["Forest Gnome", "Rock Gnome"] },
    ];
  }
  if (id === "tiefling") {
    return [
      {
        id: "fiendishLegacy",
        label: "Fiendish Legacy",
        options: ["Abyssal", "Chthonic", "Infernal"],
      },
    ];
  }
  if (id === "goliath") {
    return [
      {
        id: "giantAncestry",
        label: "Giant Ancestry",
        options: [
          "Cloud's Jaunt",
          "Fire's Burn",
          "Frost's Chill",
          "Hill's Tumble",
          "Stone's Endurance",
          "Storm's Thunder",
        ],
      },
    ];
  }
  if (id === "shifter") {
    return [
      {
        id: "shiftingForm",
        label: "Shifting Benefit",
        options: ["Beasthide", "Longtooth", "Swiftstride", "Wildhunt"],
      },
    ];
  }
  if (id === "dragonborn" || id === "dragonborn-metallic") {
    return [
      {
        id: "draconicAncestry",
        label: "Draconic Ancestry",
        options: [
          "Black",
          "Blue",
          "Brass",
          "Bronze",
          "Copper",
          "Gold",
          "Green",
          "Red",
          "Silver",
          "White",
        ],
      },
    ];
  }
  if (id === "dragonborn-chromatic") {
    return [
      {
        id: "draconicAncestry",
        label: "Chromatic Ancestry",
        options: ["Black", "Blue", "Green", "Red", "White"],
      },
    ];
  }
  if (id === "dragonborn-gem") {
    return [
      {
        id: "draconicAncestry",
        label: "Gem Ancestry",
        options: ["Amethyst", "Crystal", "Emerald", "Sapphire", "Topaz"],
      },
    ];
  }
  return [];
}

export function areTraitGroupsComplete(
  groups: TraitChoiceGroup[],
  choices: Record<string, string>,
): boolean {
  return groups.every((group) => Boolean(choices[group.id]));
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

export function getToolChoiceGroups(raw: unknown): ChoiceGroup[] {
  const parsed = parseJsonValue(raw as any, []);
  const values = Array.isArray(parsed) ? parsed : [parsed];
  return values.flatMap((entry: any, index: number) => {
    if (typeof entry === "string" && /AnyArtisansTool/i.test(entry)) {
      return [
        {
          id: `artisan-tool-${index}`,
          label: "Choose one artisan's tool",
          count: 1,
          options: TOOL_OPTIONS.filter((tool) => /Supplies|Tools|Utensils/.test(tool)),
        },
      ];
    }
    if (entry?.anyArtisansTool) {
      return [
        {
          id: `artisan-tool-${index}`,
          label: `Choose ${entry.anyArtisansTool} artisan's tool`,
          count: Number(entry.anyArtisansTool),
          options: TOOL_OPTIONS.filter((tool) => /Supplies|Tools|Utensils/.test(tool)),
        },
      ];
    }
    if (entry?.any) {
      return [
        {
          id: `tool-any-${index}`,
          label: `Choose ${entry.any} tool${entry.any > 1 ? "s" : ""}`,
          count: Number(entry.any),
          options: TOOL_OPTIONS,
        },
      ];
    }
    return [];
  });
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

export function getCantripLimit(character: BuilderState, cls: any): number {
  const cantrips = getSpellcastingInfo(cls)?.cantrips;
  if (!Array.isArray(cantrips)) return 0;
  return Number(cantrips[Math.max(0, character.level - 1)] || 0);
}

export function getMaxSpellLevel(character: BuilderState, cls: any): number {
  const progression = getSpellcastingInfo(cls)?.progression;
  if (!progression) return 0;
  if (progression === "full") return Math.min(9, Math.ceil(character.level / 2));
  if (progression === "artificer" || progression === "half") {
    return Math.min(5, Math.max(1, Math.ceil(character.level / 4)));
  }
  if (progression === "third") return Math.min(4, Math.max(1, Math.ceil(character.level / 6)));
  return 1;
}

export function getPreparedSpellLimit(character: BuilderState, cls: any): number {
  if (!isSpellcaster(cls)) return 0;
  const byClass = PREPARED_SPELLS_BY_CLASS[cls.id];
  if (byClass) return Number(byClass[Math.max(0, character.level - 1)] || 0);

  const ability = String(getSpellcastingInfo(cls)?.ability || "int")
    .slice(0, 3)
    .toUpperCase();
  const abilityScore =
    (character.abilities[ability] || 10) + (character.abilityBonuses[ability] || 0);
  return Math.max(1, character.level + Math.floor((abilityScore - 10) / 2));
}

export function isSpellStepValid(character: BuilderState, classes: any[]): boolean {
  const cls = classes.find((candidate) => candidate.id === character.classId);
  if (!isSpellcaster(cls)) return true;
  const cantripLimit = getCantripLimit(character, cls);
  const preparedLimit = getPreparedSpellLimit(character, cls);
  return (
    character.cantripChoices.length === cantripLimit &&
    character.preparedSpellChoices.length >= Math.min(1, preparedLimit) &&
    character.preparedSpellChoices.length <= preparedLimit
  );
}

export function getBuilderValidationIssues(
  character: BuilderState,
  data: {
    backgrounds: any[];
    classes: any[];
    feats: any[];
    species: any[];
    subclasses: any[];
    classFeatures: any[];
  },
): string[] {
  const issues: string[] = [];
  const race = data.species.find((item) => item.id === character.raceId);
  const background = data.backgrounds.find((item) => item.id === character.backgroundId);
  const cls = data.classes.find((item) => item.id === character.classId);
  const availableSubclasses = data.subclasses.filter((item) => item.classId === character.classId);
  const subclassLevel =
    availableSubclasses.length > 0 ? getSubclassChoiceLevel(availableSubclasses) : 0;
  const originFeat = background?.originFeatId
    ? data.feats.find((feat) => feat.id === background.originFeatId)
    : null;

  if (!character.name.trim()) issues.push("Enter a character name.");
  if (!race) {
    issues.push("Choose a species.");
  } else {
    getSpeciesTraitGroups(race)
      .filter((group) => !character.speciesTraitChoices[group.id])
      .forEach((group) => issues.push(`Choose ${group.label}.`));

    const speciesProficiencies = getJsonField(race, "proficienciesJson", "proficiencies_json");
    if (
      !areChoiceGroupsComplete(
        getProficiencyChoiceGroups(speciesProficiencies, "skills", SKILL_OPTIONS),
        character.speciesSkillChoices,
      )
    ) {
      issues.push("Complete species skill choices.");
    }
    if (
      !areChoiceGroupsComplete(
        getProficiencyChoiceGroups(speciesProficiencies, "tools", TOOL_OPTIONS),
        character.speciesToolChoices,
      )
    ) {
      issues.push("Complete species tool choices.");
    }
  }

  if (!background) {
    issues.push("Choose a background.");
  } else {
    if (!isValidAbilityBonusSet(character)) {
      issues.push("Choose one +2 and one +1 background ability bonus.");
    }
    if (
      !areChoiceGroupsComplete(
        getToolChoiceGroups(
          getJsonField(background, "toolProficienciesJson", "tool_proficiencies_json"),
        ),
        character.backgroundToolChoices,
      )
    ) {
      issues.push("Complete background tool choices.");
    }
    const backgroundEquipmentOptions = getEquipmentOptions(
      getJsonField(background, "startingEquipmentJson", "starting_equipment_json"),
    );
    if (
      backgroundEquipmentOptions.length > 0 &&
      !backgroundEquipmentOptions.some(
        (option) => option.id === character.backgroundEquipmentOption,
      )
    ) {
      issues.push("Choose a background equipment package.");
    }
    if (!areOriginFeatChoicesComplete(originFeat, character)) {
      issues.push(`Complete ${originFeat?.name || "origin feat"} choices.`);
    }
  }

  if (!cls) {
    issues.push("Choose a class.");
  } else {
    if (
      availableSubclasses.length > 0 &&
      character.level >= subclassLevel &&
      !availableSubclasses.some((subclass) => subclass.id === character.subclassId)
    ) {
      issues.push(`Choose a subclass for level ${subclassLevel} or higher.`);
    }
    const classProficiencies = parseJsonValue(cls.proficienciesJson, {});
    if (
      !areChoiceGroupsComplete(
        getProficiencyChoiceGroups(classProficiencies, "skills", SKILL_OPTIONS),
        character.classSkillChoices,
      )
    ) {
      issues.push("Complete class skill choices.");
    }
    if (
      !areChoiceGroupsComplete(
        getToolChoiceGroups(classProficiencies?.starting?.toolProficiencies),
        character.classToolChoices,
      )
    ) {
      issues.push("Complete class tool choices.");
    }
    const classEquipmentOptions = getEquipmentOptions(cls.startingEquipmentJson);
    if (
      classEquipmentOptions.length > 0 &&
      !classEquipmentOptions.some((option) => option.id === character.classEquipmentOption)
    ) {
      issues.push("Choose a class equipment package.");
    }
    if (
      !areFeatureChoicesComplete(
        getUnlockedFeatureOptionGroups(character, data.classFeatures),
        character.featureChoices,
      )
    ) {
      issues.push("Complete class feature choices.");
    }
  }

  if (!Object.values(character.abilities).every((value) => Number(value) > 0)) {
    issues.push("Assign every ability score.");
  }
  if (cls && !isSpellStepValid(character, data.classes)) {
    const cantripLimit = getCantripLimit(character, cls);
    const preparedLimit = getPreparedSpellLimit(character, cls);
    issues.push(
      `Choose ${cantripLimit} cantrip${cantripLimit === 1 ? "" : "s"} and up to ${preparedLimit} prepared/known spell${preparedLimit === 1 ? "" : "s"}.`,
    );
  }

  return issues;
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
      const syntheticGroups = getSyntheticFeatureOptionGroups(feature, character);
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
    Object.entries(character.featureChoices)
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
      ...character.speciesSkillChoices,
      ...character.featChoices.skills,
      ...character.classSkillChoices,
    ]),
  ).filter(Boolean);
}

export function weaponMasteryCount(classId: string | null, level: number): number {
  if (classId === "fighter") return level >= 9 ? 4 : 3;
  if (["barbarian", "paladin", "ranger", "rogue"].includes(classId || "")) return 2;
  return 0;
}

export function getSyntheticFeatureOptionGroups(feature: any, character: BuilderState) {
  const name = String(feature.name || "");
  const featureId = String(feature.id || "");
  const classId = feature.classId ?? feature.class_id;
  const levelRequired = Number(feature.levelRequired ?? feature.level_required ?? 0);

  if (name === "Expertise") {
    const options = selectedSkillNames(character);
    return options.length > 0 ? [{ count: 2, options }] : [{ count: 2, options: SKILL_OPTIONS }];
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
