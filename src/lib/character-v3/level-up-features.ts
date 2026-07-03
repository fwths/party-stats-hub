import { createRuleFamilyKey, createRuleVersionKey } from "../character-v2/rule-identity";
import {
  CharacterDecisionSchema,
  ExactRuleRefSchema,
  type CharacterDecision,
  type ExactRuleRef,
} from "./schema";

export type LevelUpFeatureCatalogRecord = {
  featureRef: ExactRuleRef;
  classVersionKey: string;
  subclassVersionKey: string | null;
  levelRequired: number;
  optionsJson: string | null;
  usesJson: string | null;
  mathematicalRecoveryJson: string | null;
};

export type UnsupportedLevelUpFeatureSemantic = {
  featureRef: ExactRuleRef;
  semantic: "feature-options" | "resource-uses" | "resource-recovery";
  reason: string;
};

export type LevelUpFeaturePlan = {
  nextClassLevel: number;
  unlockedFeatures: ExactRuleRef[];
  choiceGroups: LevelUpFeatureChoiceGroup[];
  unsupportedSemantics: UnsupportedLevelUpFeatureSemantic[];
};

export type LevelUpFeatureChoiceGroup = {
  id: string;
  featureRef: ExactRuleRef;
  count: number;
  options: ExactRuleRef[];
};

export type LevelUpFeatureSelection = {
  groupId: string;
  selectedOptionVersionKeys: string[];
};

function hasStructuredContent(value: string | null): boolean {
  if (!value?.trim()) return false;
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed === null) return false;
    if (Array.isArray(parsed)) return parsed.length > 0;
    if (typeof parsed === "object") return Object.keys(parsed).length > 0;
    return true;
  } catch {
    return true;
  }
}

function parseChoiceGroups(
  feature: LevelUpFeatureCatalogRecord,
): LevelUpFeatureChoiceGroup[] | null {
  if (!hasStructuredContent(feature.optionsJson)) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(feature.optionsJson!);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const groups: LevelUpFeatureChoiceGroup[] = [];
  for (const [index, rawGroup] of parsed.entries()) {
    if (!rawGroup || typeof rawGroup !== "object" || Array.isArray(rawGroup)) return null;
    const group = rawGroup as Record<string, unknown>;
    if (
      Object.keys(group).some((key) => key !== "count" && key !== "options") ||
      !Number.isInteger(group.count) ||
      Number(group.count) < 1 ||
      !Array.isArray(group.options) ||
      group.options.length < Number(group.count) ||
      group.options.some((option) => typeof option !== "string" || !option.trim())
    ) {
      return null;
    }
    const names = group.options as string[];
    if (new Set(names.map((name) => name.trim().toLowerCase())).size !== names.length) return null;
    groups.push({
      id: `${feature.featureRef.versionKey}:options:${index}`,
      featureRef: feature.featureRef,
      count: Number(group.count),
      options: names.map((name, optionIndex) => {
        const upstreamId = `${feature.featureRef.upstreamId}:option:${optionIndex}:${name}`;
        return ExactRuleRefSchema.parse({
          kind: "feature",
          familyKey: createRuleFamilyKey("feature", `${feature.featureRef.name}: ${name}`),
          versionKey: createRuleVersionKey({
            kind: "feature",
            sourceId: feature.featureRef.sourceId,
            upstreamId,
            contentRevision: feature.featureRef.contentRevision,
          }),
          name,
          rulesGeneration: "2024",
          sourceId: feature.featureRef.sourceId,
          upstreamId,
          contentRevision: feature.featureRef.contentRevision,
          compatibility: feature.featureRef.compatibility,
          verification: feature.featureRef.verification,
        });
      }),
    });
  }
  return groups;
}

export function deriveLevelUpFeaturePlan(input: {
  classVersionKey: string;
  nextClassLevel: number;
  selectedSubclassVersionKey: string | null;
  featureCatalog?: LevelUpFeatureCatalogRecord[];
}): LevelUpFeaturePlan {
  const unlocked = (input.featureCatalog ?? []).filter(
    (feature) =>
      feature.classVersionKey === input.classVersionKey &&
      feature.levelRequired === input.nextClassLevel &&
      (feature.subclassVersionKey === null ||
        feature.subclassVersionKey === input.selectedSubclassVersionKey),
  );
  const unsupportedSemantics: UnsupportedLevelUpFeatureSemantic[] = [];
  const choiceGroups: LevelUpFeatureChoiceGroup[] = [];
  for (const feature of unlocked) {
    const parsedChoiceGroups = parseChoiceGroups(feature);
    if (parsedChoiceGroups === null) {
      unsupportedSemantics.push({
        featureRef: feature.featureRef,
        semantic: "feature-options",
        reason: `${feature.featureRef.name} has an unsupported feature-option shape`,
      });
    } else {
      choiceGroups.push(...parsedChoiceGroups);
    }
    if (hasStructuredContent(feature.usesJson)) {
      unsupportedSemantics.push({
        featureRef: feature.featureRef,
        semantic: "resource-uses",
        reason: `${feature.featureRef.name} requires atomic resource initialization`,
      });
    }
    if (hasStructuredContent(feature.mathematicalRecoveryJson)) {
      unsupportedSemantics.push({
        featureRef: feature.featureRef,
        semantic: "resource-recovery",
        reason: `${feature.featureRef.name} requires verified recovery semantics`,
      });
    }
  }
  return {
    nextClassLevel: input.nextClassLevel,
    unlockedFeatures: unlocked.map((feature) => feature.featureRef),
    choiceGroups,
    unsupportedSemantics,
  };
}

export function compileLevelUpFeatureSelections(input: {
  plan: LevelUpFeaturePlan;
  selections: LevelUpFeatureSelection[];
  madeAtCharacterLevel: number;
  decisionIdPrefix: string;
}): CharacterDecision[] {
  if (input.selections.length !== input.plan.choiceGroups.length) {
    throw new Error(`Level-up requires ${input.plan.choiceGroups.length} feature choice group(s)`);
  }
  const selections = new Map(input.selections.map((selection) => [selection.groupId, selection]));
  if (selections.size !== input.selections.length) {
    throw new Error("Level-up feature choice groups must be unique");
  }
  return input.plan.choiceGroups.map((group, index) => {
    const selection = selections.get(group.id);
    if (!selection) throw new Error(`Level-up is missing feature choice group ${group.id}`);
    if (
      selection.selectedOptionVersionKeys.length !== group.count ||
      new Set(selection.selectedOptionVersionKeys).size !== group.count
    ) {
      throw new Error(
        `${group.featureRef.name} requires exactly ${group.count} distinct option(s)`,
      );
    }
    const selected = selection.selectedOptionVersionKeys.map((versionKey) => {
      const option = group.options.find((candidate) => candidate.versionKey === versionKey);
      if (!option) throw new Error(`Selected option is not eligible for ${group.featureRef.name}`);
      return option;
    });
    return CharacterDecisionSchema.parse({
      id: `${input.decisionIdPrefix}:feature:${index}`,
      type: "rule-selection",
      selectionKind: "feature-option",
      sourceRef: group.featureRef,
      selections: selected,
      madeAtCharacterLevel: input.madeAtCharacterLevel,
      provenance: "native",
    });
  });
}

export function assertSupportedLevelUpFeatures(plan: LevelUpFeaturePlan): void {
  if (plan.unsupportedSemantics.length === 0) return;
  throw new Error(
    `Level-up requires unsupported feature semantics: ${plan.unsupportedSemantics
      .map((blocker) => blocker.reason)
      .join(", ")}`,
  );
}
