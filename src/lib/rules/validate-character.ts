import type { BuilderState } from "../../components/builder/BuilderUtils";
import type { ForgeData } from "../forge/forge-data";
import { DEFAULT_SOURCE_POLICY, isSourceAllowedByPolicy } from "../forge/source-policy";
import { resolveRuleChoicesToGrants, validateRuleChoiceGroup } from "./choices";
import { speciesToRuleChoicesAndGrants } from "./adapters/species";
import { backgroundToRuleChoicesAndGrants } from "./adapters/backgrounds";
import { classToRuleChoicesAndGrants } from "./adapters/classes";
import { classFeatureToRuleChoicesAndGrants } from "./adapters/features";
import {
  isValidAbilityBonusSet,
  getPointsUsed,
  getSpellcasters,
  getCantripLimit,
  getPreparedSpellLimit,
  getClassCantripChoices,
  getClassPreparedSpellChoices,
  getFeatChoiceLevels,
  getSubclassChoiceLevel,
  areOriginFeatChoicesComplete,
  selectedSkillNames,
} from "../../components/builder/BuilderUtils";

export interface ValidationIssue {
  code: string;
  severity: "error" | "warning" | "suggestion";
  message: string;
  stepId?: number;
  sourceEntity?: string;
  suggestedAction?: string;
}

export function validateCharacterDraft(
  character: BuilderState,
  data: ForgeData,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const pushError = (msg: string, code = "INVALID_CHOICE", stepId = 0) => {
    issues.push({ code, severity: "error", message: msg, stepId });
  };

  const race = data.species.find((item) => item.id === character.raceId);
  const background = data.backgrounds.find((item) => item.id === character.backgroundId);
  const cls = data.classes.find((item) => item.id === character.classId);
  const availableSubclasses = data.subclasses.filter((item) => item.classId === character.classId);
  const subclassLevel =
    availableSubclasses.length > 0 ? getSubclassChoiceLevel(availableSubclasses) : 0;
  const originFeat = background?.originFeatId
    ? data.feats.find((feat) => feat.id === background.originFeatId)
    : null;
  const sourcePolicy = character.sourcePolicy || DEFAULT_SOURCE_POLICY;
  const selectedRuleChoiceIds = new Set(
    Object.values(character.ruleChoices || {})
      .flat()
      .map(String),
  );
  const spellIds = new Set((data.spells || []).map((spell) => spell.id));
  const itemNames = new Set(
    [
      ...(data.weapons || []),
      ...(data.armor || []),
      ...(data.magicItems || []),
      ...(data.mundaneGear || []),
      ...(data.itemTypes || []),
      ...(data.itemGroups || []),
      ...(data.magicVariants || []),
      ...(data.itemProperties || []),
      ...(data.itemCardReferences || []),
    ]
      .map((item: any) => String(item.name || item.id || "").toLowerCase())
      .filter(Boolean),
  );
  const languageNames = normalizedNameSet(data.languages);
  const senseNames = normalizedNameSet(data.senses);
  const conditionNames = normalizedNameSet(data.conditions);
  const actionNames = normalizedNameSet(data.rulesActions);
  const weaponMasteryNames = normalizedNameSet(data.weaponMasteries);
  const weaponNames = normalizedNameSet(data.weapons);
  const activeEffectIds = new Set(
    (data.activeEffects || []).map((effect: any) => String(effect.id || "")),
  );
  const classFeatureIds = new Set(
    (data.classFeatures || []).map((feature: any) => String(feature.id || "")),
  );
  const itemIds = new Set(
    [
      ...(data.weapons || []),
      ...(data.armor || []),
      ...(data.magicItems || []),
      ...(data.mundaneGear || []),
    ].map((item: any) => String(item.id || "")),
  );
  const resolvedGrants: any[] = [];

  const validateSelectedSource = (entity: any, code: string, stepId: number) => {
    if (!entity?.source) return;
    if (!isSourceAllowedByPolicy(String(entity.source), sourcePolicy)) {
      pushError(
        `${entity.name || entity.id || "Selected content"} is from disabled source ${entity.source}.`,
        code,
        stepId,
      );
    }
  };

  if (!character.name?.trim()) pushError("Enter a character name.", "MISSING_NAME", 6);
  if (!race) {
    pushError("Choose a species.", "MISSING_SPECIES", 2);
  } else {
    validateSelectedSource(race, "DISABLED_SPECIES_SOURCE", 1);
    if (data.speciesVariants) {
      const subraces = data.speciesVariants.filter((sv: any) => sv.speciesId === race.id);
      if (subraces.length > 0 && !character.speciesVariantId) {
        pushError("Choose a species subrace / variant.", "MISSING_SUBRACE", 2);
      }
    }
    const subrace = data.speciesVariants?.find((sv: any) => sv.id === character.speciesVariantId);
    if (subrace) validateSelectedSource(subrace, "DISABLED_SPECIES_VARIANT_SOURCE", 1);
    const speciesData = subrace || race;
    const { choices: speciesChoices } = speciesData
      ? speciesToRuleChoicesAndGrants(speciesData)
      : { choices: [] };
    const { grants: speciesGrants } = speciesData
      ? speciesToRuleChoicesAndGrants(speciesData)
      : { grants: [] };
    resolvedGrants.push(
      ...speciesGrants,
      ...resolveRuleChoicesToGrants(character.ruleChoices || {}, speciesChoices),
    );
    for (const group of speciesChoices) {
      const selectedIds = character.ruleChoices[group.id] || [];
      const result = validateRuleChoiceGroup(group, selectedIds);
      if (!result.isValid) {
        result.issues.forEach((msg) => pushError(msg, "INVALID_SPECIES_CHOICE", 2));
      }
    }
  }

  if (!background) {
    pushError("Choose a background.", "MISSING_BACKGROUND", 2);
  } else {
    validateSelectedSource(background, "DISABLED_BACKGROUND_SOURCE", 2);
    if (!isValidAbilityBonusSet(character)) {
      pushError(
        "Choose one +2 and one +1 background ability bonus.",
        "INVALID_BACKGROUND_BONUS",
        2,
      );
    }
    const { choices: bgChoices } = background
      ? backgroundToRuleChoicesAndGrants(background)
      : { choices: [] };
    const { grants: bgGrants } = background
      ? backgroundToRuleChoicesAndGrants(background)
      : { grants: [] };
    resolvedGrants.push(
      ...bgGrants,
      ...resolveRuleChoicesToGrants(character.ruleChoices || {}, bgChoices),
    );
    for (const group of bgChoices) {
      const selectedIds = character.ruleChoices[group.id] || [];
      const result = validateRuleChoiceGroup(group, selectedIds);
      if (!result.isValid) {
        result.issues.forEach((msg) => pushError(msg, "INVALID_BACKGROUND_CHOICE", 2));
      }
    }
    if (!areOriginFeatChoicesComplete(originFeat, character)) {
      pushError(
        `Complete ${originFeat?.name || "origin feat"} choices.`,
        "INCOMPLETE_ORIGIN_FEAT",
        2,
      );
    }
  }

  if (!cls) {
    pushError("Choose a class.", "MISSING_CLASS", 3);
  } else {
    validateSelectedSource(cls, "DISABLED_CLASS_SOURCE", 3);
    const selectedSubclass = data.subclasses.find(
      (subclass) => subclass.id === character.subclassId,
    );
    if (selectedSubclass) validateSelectedSource(selectedSubclass, "DISABLED_SUBCLASS_SOURCE", 3);
    if (
      availableSubclasses.length > 0 &&
      character.level >= subclassLevel &&
      !availableSubclasses.some((subclass) => subclass.id === character.subclassId)
    ) {
      pushError(`Choose a subclass for level ${subclassLevel} or higher.`, "MISSING_SUBCLASS", 3);
    }
    const allClassesToValidate = [
      {
        classId: cls.id,
        subclassId: character.subclassId,
        level: character.level,
        isPrimary: true,
      },
      ...(character.multiClasses || [])
        .filter((mc) => mc.classId && mc.level > 0)
        .map((mc) => ({
          classId: mc.classId,
          subclassId: mc.subclassId,
          level: mc.level,
          isPrimary: false,
        })),
    ];

    for (const mc of allClassesToValidate) {
      const mcClass = data.classes.find((c) => c.id === mc.classId);
      if (!mcClass) continue;
      validateSelectedSource(mcClass, "DISABLED_MULTICLASS_SOURCE", 3);
      const mcSubclass = data.subclasses.find((subclass) => subclass.id === mc.subclassId);
      if (mcSubclass) validateSelectedSource(mcSubclass, "DISABLED_MULTICLASS_SUBCLASS_SOURCE", 3);
      const { choices: classChoices } = classToRuleChoicesAndGrants(mcClass, mc.isPrimary);
      const { grants: classGrants } = classToRuleChoicesAndGrants(mcClass, mc.isPrimary);
      const mappedClassChoices = mc.isPrimary
        ? classChoices
        : classChoices.map((group) => ({ ...group, id: `mc_${mc.classId}_${group.id}` }));
      resolvedGrants.push(
        ...classGrants,
        ...resolveRuleChoicesToGrants(character.ruleChoices || {}, mappedClassChoices),
      );
      const activeFeatures = (data.classFeatures || []).filter((feature: any) => {
        const classId = feature.classId ?? feature.class_id;
        const subclassId = feature.subclassId ?? feature.subclass_id;
        const levelRequired = feature.levelRequired ?? feature.level_required ?? 0;
        return (
          classId === mc.classId &&
          (!subclassId || subclassId === mc.subclassId) &&
          Number(levelRequired || 0) <= mc.level
        );
      });
      const featureChoices = activeFeatures.flatMap((feature) => {
        const { choices, grants } = classFeatureToRuleChoicesAndGrants(
          feature,
          mc.level,
          character.ruleChoices || {},
          safeSelectedSkillNames(character),
        );
        const featureClassId = feature.classId ?? feature.class_id;
        const mappedChoices =
          mc.isPrimary || featureClassId === character.classId
            ? choices
            : choices.map((group) => ({ ...group, id: `mc_${featureClassId}_${group.id}` }));
        resolvedGrants.push(
          ...grants,
          ...resolveRuleChoicesToGrants(character.ruleChoices || {}, mappedChoices),
        );
        return choices;
      });
      const allChoices = [...classChoices, ...featureChoices];
      for (const group of allChoices) {
        const groupId = mc.isPrimary ? group.id : `mc_${mc.classId}_${group.id}`;
        const selectedIds = character.ruleChoices[groupId] || [];
        const result = validateRuleChoiceGroup({ ...group, id: groupId }, selectedIds);
        if (!result.isValid) {
          result.issues.forEach((msg) => pushError(msg, "INVALID_CLASS_CHOICE", 3));
        }
      }
    }
  }

  const abilitiesMethod = character.abilitiesMethod || "standard";
  if (abilitiesMethod === "standard") {
    const sortedVals = Object.values(character.abilities).sort((a, b) => a - b);
    const expected = [8, 10, 12, 13, 14, 15];
    const ok = sortedVals.length === 6 && sortedVals.every((v, i) => v === expected[i]);
    if (!ok)
      pushError(
        "Assign every ability score using Standard Array values (15, 14, 13, 12, 10, 8) exactly once.",
        "INVALID_STANDARD_ARRAY",
        4,
      );
  } else if (abilitiesMethod === "pointbuy") {
    const spent = getPointsUsed(character.abilities);
    const outOfRange = Object.values(character.abilities).some((v) => v < 8 || v > 15);
    if (outOfRange)
      pushError("Point Buy base scores must be between 8 and 15.", "INVALID_POINT_BUY_BOUNDS", 4);
    if (spent !== 27)
      pushError(
        `Spend exactly 27 points in Point Buy (spent: ${spent}/27).`,
        "INVALID_POINT_BUY_TOTAL",
        4,
      );
  } else if (abilitiesMethod === "roll") {
    const outOfRange = Object.values(character.abilities).some((v) => v < 3 || v > 18);
    const incomplete = Object.values(character.abilities).some((v) => !v || v <= 0);
    if (incomplete) pushError("Assign every ability score.", "INCOMPLETE_ROLLS", 4);
    else if (outOfRange)
      pushError("Rolled/manual ability scores must be between 3 and 18.", "INVALID_ROLL_BOUNDS", 4);
  }

  const spellcasters = getSpellcasters(character, data.classes);
  for (const { cls: spellcasterClass, level: spellcasterLevel } of spellcasters) {
    const cantripLimit = getCantripLimit(spellcasterLevel, spellcasterClass);
    const preparedLimit = getPreparedSpellLimit(
      character.abilities,
      spellcasterClass,
      spellcasterLevel,
    );
    const selectedCantrips = getClassCantripChoices(character, spellcasterClass.id);
    const selectedPrepared = getClassPreparedSpellChoices(character, spellcasterClass.id);

    if (selectedCantrips.length !== cantripLimit) {
      pushError(
        `Choose exactly ${cantripLimit} cantrips for ${spellcasterClass.name}.`,
        "INVALID_CANTRIP_COUNT",
        5,
      );
    }
    if (
      selectedPrepared.length < Math.min(1, preparedLimit) ||
      selectedPrepared.length > preparedLimit
    ) {
      pushError(
        `Choose between 1 and ${preparedLimit} prepared spells for ${spellcasterClass.name}.`,
        "INVALID_PREPARED_COUNT",
        5,
      );
    }
  }

  const featLevels = getFeatChoiceLevels(character.classId, character.level);
  for (const lvl of featLevels) {
    if (!character.highLevelFeatChoices?.[lvl]) {
      pushError(`Choose a feat for level ${lvl}.`, "MISSING_FEAT", 3);
    }
  }

  if (character.highLevelFeatChoices) {
    for (const [lvlStr, featId] of Object.entries(character.highLevelFeatChoices)) {
      const lvl = Number(lvlStr);
      const featRecord = data.feats.find((f) => f.id === featId);
      if (!featRecord) continue;
      validateSelectedSource(featRecord, "DISABLED_FEAT_SOURCE", 5);
      const name = featRecord.name.toLowerCase();
      const extra = character.highLevelFeatExtraChoices?.[`${lvl}:${featId}`];

      if (name === "skilled" || featId === "skilled") {
        const skillsCount = (extra?.skills || []).length;
        const toolsCount = (extra?.tools || []).length;
        if (skillsCount + toolsCount !== 3)
          pushError(
            `Level ${lvl} Feat (Skilled): Choose exactly 3 skill/tool proficiencies.`,
            "INVALID_FEAT_SKILLED",
            3,
          );
      } else if (name === "magic initiate" || featId.startsWith("magic-initiate")) {
        if ((extra?.cantrips || []).length !== 2)
          pushError(
            `Level ${lvl} Feat (Magic Initiate): Choose exactly 2 cantrips.`,
            "INVALID_FEAT_MAGIC_INITIATE",
            3,
          );
        if ((extra?.spells || []).length !== 1)
          pushError(
            `Level ${lvl} Feat (Magic Initiate): Choose exactly 1 first-level spell.`,
            "INVALID_FEAT_MAGIC_INITIATE",
            3,
          );
        if (!extra?.ability)
          pushError(
            `Level ${lvl} Feat (Magic Initiate): Choose a spellcasting ability.`,
            "INVALID_FEAT_MAGIC_INITIATE",
            3,
          );
      } else if (name === "skill expert" || featId === "skill-expert") {
        if (!extra?.ability)
          pushError(
            `Level ${lvl} Feat (Skill Expert): Choose an ability score to increase.`,
            "INVALID_FEAT_SKILL_EXPERT",
            3,
          );
        if ((extra?.skills || []).length !== 1)
          pushError(
            `Level ${lvl} Feat (Skill Expert): Choose 1 skill proficiency.`,
            "INVALID_FEAT_SKILL_EXPERT",
            3,
          );
      } else if (name === "resilient" || featId.startsWith("resilient")) {
        if (!extra?.ability)
          pushError(
            `Level ${lvl} Feat (Resilient): Choose an ability score.`,
            "INVALID_FEAT_RESILIENT",
            3,
          );
      }
    }
  }

  if (character.multiClasses) {
    for (let i = 0; i < character.multiClasses.length; i++) {
      const mc = character.multiClasses[i];
      if (!mc.classId) {
        pushError(
          `Multi-class slot ${i + 1}: Select a class or remove the slot.`,
          "INVALID_MULTICLASS",
          3,
        );
        continue;
      }
      const availableMcSubclasses = data.subclasses.filter((sub) => sub.classId === mc.classId);
      const mcSubclassLevel =
        availableMcSubclasses.length > 0 ? getSubclassChoiceLevel(availableMcSubclasses) : 3;
      if (availableMcSubclasses.length > 0 && mc.level >= mcSubclassLevel && !mc.subclassId) {
        const mcClass = data.classes.find((c) => c.id === mc.classId);
        pushError(
          `Multi-class ${mcClass?.name || mc.classId}: Choose a subclass for level ${mcSubclassLevel}+.`,
          "MISSING_MULTICLASS_SUBCLASS",
          3,
        );
      }
    }
  }

  for (const spellId of [
    ...(character.cantripChoices || []),
    ...(character.preparedSpellChoices || []),
    ...Object.values(character.cantripChoicesByClass || {}).flat(),
    ...Object.values(character.preparedSpellChoicesByClass || {}).flat(),
  ]) {
    if (!spellIds.has(spellId)) {
      pushError(
        `Selected spell ${spellId} is not in the canonical spells table.`,
        "UNKNOWN_SPELL",
        6,
      );
      continue;
    }
    const spell = data.spells.find((candidate) => candidate.id === spellId);
    validateSelectedSource(spell, "DISABLED_SPELL_SOURCE", 6);
  }

  for (const choiceId of selectedRuleChoiceIds) {
    const spell = data.spells.find((candidate) => candidate.id === choiceId);
    if (spell) validateSelectedSource(spell, "DISABLED_RULE_CHOICE_SPELL_SOURCE", 6);
    const feat = data.feats.find((candidate) => candidate.id === choiceId);
    if (feat) validateSelectedSource(feat, "DISABLED_RULE_CHOICE_FEAT_SOURCE", 5);
    const optionalFeature = data.optionalFeatures.find((candidate) => candidate.id === choiceId);
    if (optionalFeature)
      validateSelectedSource(optionalFeature, "DISABLED_OPTIONAL_FEATURE_SOURCE", 5);
    const charOption = data.charOptions.find((candidate) => candidate.id === choiceId);
    if (charOption) validateSelectedSource(charOption, "DISABLED_CHAR_OPTION_SOURCE", 5);
  }

  for (const grant of resolvedGrants) {
    validateCanonicalGrant(grant, {
      languageNames,
      senseNames,
      conditionNames,
      actionNames,
      weaponMasteryNames,
      weaponNames,
      activeEffectIds,
      pushWarning: (code, message) =>
        issues.push({
          code,
          severity: "warning",
          message,
          stepId: 9,
          sourceEntity: grant.sourceEntity,
        }),
    });
  }

  validateActiveEffectLinks({
    featureActiveEffects: data.featureActiveEffects || [],
    itemActiveEffects: data.itemActiveEffects || [],
    spellActiveEffects: data.spellActiveEffects || [],
    activeEffectIds,
    classFeatureIds,
    itemIds,
    spellIds,
    issues,
  });

  const attunedItems = (character.customEquipment || []).filter((item) => item.attuned);
  if (attunedItems.length > 3) {
    pushError(
      "A character can normally attune to no more than 3 magic items.",
      "TOO_MANY_ATTUNED_ITEMS",
      7,
    );
  }
  for (const item of character.customEquipment || []) {
    const key = String(item.name || "").toLowerCase();
    if (key && !itemNames.has(key)) {
      issues.push({
        code: "UNRESOLVED_EQUIPMENT",
        severity: "warning",
        message: `${item.name} is not resolved to a canonical weapon, armor, magic item, mundane gear, item group, magic variant, item property, or item card reference.`,
        stepId: 7,
        sourceEntity: item.name,
        suggestedAction: "Choose the item from the Equipment catalog when possible.",
      });
    }
  }

  return issues;
}

function validateActiveEffectLinks(context: {
  featureActiveEffects: any[];
  itemActiveEffects: any[];
  spellActiveEffects: any[];
  activeEffectIds: Set<string>;
  classFeatureIds: Set<string>;
  itemIds: Set<string>;
  spellIds: Set<string>;
  issues: ValidationIssue[];
}) {
  const push = (code: string, message: string, sourceEntity?: string) => {
    context.issues.push({
      code,
      severity: "warning",
      message,
      stepId: 9,
      sourceEntity,
    });
  };

  for (const link of context.featureActiveEffects) {
    const featureId = String(link.featureId ?? link.feature_id ?? "");
    const effectId = String(link.effectId ?? link.effect_id ?? "");
    if (featureId && !context.classFeatureIds.has(featureId)) {
      push(
        "UNKNOWN_FEATURE_ACTIVE_EFFECT_SOURCE",
        `Feature active effect references unknown feature ${featureId}.`,
        featureId,
      );
    }
    if (effectId && !context.activeEffectIds.has(effectId)) {
      push(
        "UNKNOWN_FEATURE_ACTIVE_EFFECT",
        `Feature active effect references unknown active effect ${effectId}.`,
        effectId,
      );
    }
  }

  for (const link of context.itemActiveEffects) {
    const itemId = String(link.itemId ?? link.item_id ?? "");
    const effectId = String(link.effectId ?? link.effect_id ?? "");
    if (itemId && !context.itemIds.has(itemId)) {
      push(
        "UNKNOWN_ITEM_ACTIVE_EFFECT_SOURCE",
        `Item active effect references unknown item ${itemId}.`,
        itemId,
      );
    }
    if (effectId && !context.activeEffectIds.has(effectId)) {
      push(
        "UNKNOWN_ITEM_ACTIVE_EFFECT",
        `Item active effect references unknown active effect ${effectId}.`,
        effectId,
      );
    }
  }

  for (const link of context.spellActiveEffects) {
    const spellId = String(link.spellId ?? link.spell_id ?? "");
    const effectId = String(link.effectId ?? link.effect_id ?? "");
    if (spellId && !context.spellIds.has(spellId)) {
      push(
        "UNKNOWN_SPELL_ACTIVE_EFFECT_SOURCE",
        `Spell active effect references unknown spell ${spellId}.`,
        spellId,
      );
    }
    if (effectId && !context.activeEffectIds.has(effectId)) {
      push(
        "UNKNOWN_SPELL_ACTIVE_EFFECT",
        `Spell active effect references unknown active effect ${effectId}.`,
        effectId,
      );
    }
  }
}

function normalizedName(value: any): string {
  return String(value || "")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function safeSelectedSkillNames(character: BuilderState): string[] {
  try {
    return selectedSkillNames({
      ...character,
      speciesSkillChoices: (character as any).speciesSkillChoices || [],
      classSkillChoices: (character as any).classSkillChoices || [],
      backgroundSkillChoices: (character as any).backgroundSkillChoices || [],
      featChoices: (character as any).featChoices || { skills: [], tools: [] },
    } as any);
  } catch {
    return [];
  }
}

function normalizedNameSet(items: any[] = []): Set<string> {
  const names = new Set<string>();
  for (const item of items) {
    for (const value of [item?.id, item?.name, item?.type]) {
      const normalized = normalizedName(value);
      if (normalized) names.add(normalized);
    }
  }
  return names;
}

function grantValueNames(value: any): string[] {
  if (value == null) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(grantValueNames);
  if (typeof value === "object") {
    return [
      ...Object.keys(value),
      ...Object.values(value)
        .filter((candidate) => typeof candidate === "string")
        .map(String),
    ];
  }
  return [String(value)];
}

function validateCanonicalGrant(
  grant: any,
  context: {
    languageNames: Set<string>;
    senseNames: Set<string>;
    conditionNames: Set<string>;
    actionNames: Set<string>;
    weaponMasteryNames: Set<string>;
    weaponNames: Set<string>;
    activeEffectIds: Set<string>;
    pushWarning: (code: string, message: string) => void;
  },
) {
  const valueNames = grantValueNames(grant?.value).map(normalizedName).filter(Boolean);
  const hasAny = (names: Set<string>) => valueNames.some((name) => names.has(name));

  if (grant?.type === "language" && !hasAny(context.languageNames)) {
    context.pushWarning(
      "UNKNOWN_LANGUAGE_GRANT",
      `Language grant ${valueNames.join(", ") || grant.id} is not backed by the canonical languages table.`,
    );
  }
  if (grant?.type === "sense" && !hasAny(context.senseNames)) {
    context.pushWarning(
      "UNKNOWN_SENSE_GRANT",
      `Sense grant ${valueNames.join(", ") || grant.id} is not backed by the canonical senses table.`,
    );
  }
  if (grant?.type === "condition_immunity" && !hasAny(context.conditionNames)) {
    context.pushWarning(
      "UNKNOWN_CONDITION_GRANT",
      `Condition grant ${valueNames.join(", ") || grant.id} is not backed by the canonical conditions table.`,
    );
  }
  if (
    ["action", "bonus_action", "reaction"].includes(grant?.type) &&
    !hasAny(context.actionNames)
  ) {
    context.pushWarning(
      "UNKNOWN_RULE_ACTION_GRANT",
      `Action grant ${valueNames.join(", ") || grant.id} is not backed by the canonical rules actions table.`,
    );
  }
  if (
    grant?.type === "weapon_mastery" &&
    !hasAny(context.weaponMasteryNames) &&
    !hasAny(context.weaponNames)
  ) {
    context.pushWarning(
      "UNKNOWN_WEAPON_MASTERY_GRANT",
      `Weapon mastery grant ${valueNames.join(", ") || grant.id} is not backed by canonical weapon or mastery data.`,
    );
  }
  if (grant?.type === "active_effect") {
    const ids = grantValueNames(grant.value).map(String);
    if (!ids.some((id) => context.activeEffectIds.has(id))) {
      context.pushWarning(
        "UNKNOWN_ACTIVE_EFFECT_GRANT",
        `Active effect grant ${ids.join(", ") || grant.id} is not backed by the canonical active effects table.`,
      );
    }
  }
}
