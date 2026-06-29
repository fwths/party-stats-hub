import { z } from "zod";
import { normalizeRuleName } from "../character-v2/reconcile";
import { createRuleFamilyKey, createRuleVersionKey } from "../character-v2/rule-identity";
import { CharacterAggregateSchema, ExactRuleRefSchema, type CharacterAggregate } from "./schema";
import type {
  BackgroundCapabilityCatalogRecord,
  ClassCapabilityCatalogRecord,
  SpeciesCapabilityCatalogRecord,
  SubclassFeatureCapabilityCatalogRecord,
} from "./capabilities";
import {
  authorizeCharacterMutation,
  CharacterMutationPermissionError,
  type AuthorizationAudit,
  type MutationAuthority,
} from "./authority";

export const CapabilityChoiceRequirementSchema = z
  .object({
    id: z.string().trim().min(1),
    characterId: z.string().trim().min(1),
    buildRevision: z.number().int().min(1),
    sourceRef: ExactRuleRefSchema,
    characterSourceVersionKey: z.string().trim().min(1),
    kind: z.enum(["tool", "language", "resistance"]),
    selectionKind: z.enum(["tool", "language", "feature-option"]),
    count: z.number().int().min(1),
    optionSet: z.enum([
      "musical-instrument",
      "standard-language",
      "artisan-tool",
      "damage-resistance",
      "any-tool",
    ]),
    excludedCapabilityLabels: z.array(z.string().trim().min(1)),
  })
  .strict();

export type CapabilityChoiceRequirement = z.infer<typeof CapabilityChoiceRequirementSchema>;

export const CapabilityChoiceOptionSchema = z
  .object({
    ref: ExactRuleRefSchema.refine(
      (ref) => ref.kind === "tool" || ref.kind === "language" || ref.kind === "feature",
    ),
    capabilityLabel: z.string().trim().min(1),
    choiceSourceVersionKey: z.string().trim().min(1).nullable(),
    categories: z
      .array(
        z.enum([
          "musical-instrument",
          "standard-language",
          "artisan-tool",
          "damage-resistance",
          "tool",
        ]),
      )
      .min(1),
  })
  .strict();

export type CapabilityChoiceOption = z.infer<typeof CapabilityChoiceOptionSchema>;

export type OriginFeatCapabilityCatalogRecord = {
  featRef: z.infer<typeof ExactRuleRefSchema>;
  rawJson: string | null;
};

function authorized(character: CharacterAggregate, versionKey: string, verification: string) {
  return (
    verification === "verified" ||
    character.resolutions.some(
      (resolution) =>
        resolution.type === "content-version-decision" &&
        resolution.selectedVersionKey === versionKey,
    )
  );
}

function parseArray(value: string | null): unknown[] | null {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function requirement(input: {
  character: CharacterAggregate;
  sourceRef: CharacterAggregate["build"]["backgroundRef"];
  characterSourceVersionKey?: string;
  index: number;
  kind: "tool" | "language" | "resistance";
  count: number;
  optionSet: CapabilityChoiceRequirement["optionSet"];
}): CapabilityChoiceRequirement {
  const sourceRef = input.sourceRef;
  return CapabilityChoiceRequirementSchema.parse({
    id: `choice:${sourceRef.versionKey}:${input.kind}:${input.index}:${input.optionSet}`,
    characterId: input.character.identity.id,
    buildRevision: input.character.build.revision,
    sourceRef,
    characterSourceVersionKey: input.characterSourceVersionKey ?? sourceRef.versionKey,
    kind: input.kind,
    selectionKind: input.kind === "resistance" ? "feature-option" : input.kind,
    count: input.count,
    optionSet: input.optionSet,
    excludedCapabilityLabels: [],
  });
}

export function deriveBackgroundCapabilityChoices(
  inputCharacter: CharacterAggregate,
  catalog: BackgroundCapabilityCatalogRecord[],
): { requirements: CapabilityChoiceRequirement[]; issues: string[] } {
  const character = CharacterAggregateSchema.parse(inputCharacter);
  const background = character.build.backgroundRef;
  if (!authorized(character, background.versionKey, background.verification)) {
    return {
      requirements: [],
      issues: [`${background.name} has not been approved as an exact background version.`],
    };
  }
  const record = catalog.find(
    (candidate) =>
      candidate.id === background.upstreamId && candidate.sourceId === background.sourceId,
  );
  if (!record) return { requirements: [], issues: ["Background capability data is unavailable."] };

  const requirements: CapabilityChoiceRequirement[] = [];
  const issues: string[] = [];
  const tools = parseArray(record.toolProficienciesJson);
  const languages = parseArray(record.languageProficienciesJson);
  if (tools === null) issues.push("Background tool proficiency data is invalid JSON.");
  if (languages === null) issues.push("Background language proficiency data is invalid JSON.");

  (tools ?? []).forEach((entry, index) => {
    if (typeof entry === "string") {
      const key = normalizeRuleName(entry);
      if (key === "anymusicalinstrument") {
        requirements.push(
          requirement({
            character,
            sourceRef: background,
            index,
            kind: "tool",
            count: 1,
            optionSet: "musical-instrument",
          }),
        );
      } else if (key === "any" || key === "anystandard") {
        requirements.push(
          requirement({
            character,
            sourceRef: background,
            index,
            kind: "tool",
            count: 1,
            optionSet: "any-tool",
          }),
        );
      }
      return;
    }
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return;
    for (const [key, value] of Object.entries(entry)) {
      if (typeof value !== "number" || value < 1) continue;
      const normalized = normalizeRuleName(key);
      const optionSet = normalized === "anymusicalinstrument" ? "musical-instrument" : "any-tool";
      requirements.push(
        requirement({
          character,
          sourceRef: background,
          index,
          kind: "tool",
          count: value,
          optionSet,
        }),
      );
    }
  });

  (languages ?? []).forEach((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return;
    for (const [key, value] of Object.entries(entry)) {
      if (typeof value !== "number" || value < 1) continue;
      if (!["any", "any standard", "anystandard"].includes(normalizeRuleName(key))) continue;
      requirements.push(
        requirement({
          character,
          sourceRef: background,
          index,
          kind: "language",
          count: value,
          optionSet: "standard-language",
        }),
      );
    }
  });
  const resolvedRequirementIds = new Set(
    character.resolutions
      .filter((resolution) => resolution.type === "capability-choice-confirmed")
      .map((resolution) => resolution.requirementId),
  );
  return {
    requirements: requirements.filter((entry) => !resolvedRequirementIds.has(entry.id)),
    issues,
  };
}

export function deriveStartingClassCapabilityChoices(
  inputCharacter: CharacterAggregate,
  catalog: ClassCapabilityCatalogRecord[],
): { requirements: CapabilityChoiceRequirement[]; issues: string[] } {
  const character = CharacterAggregateSchema.parse(inputCharacter);
  const sourceRef = character.build.levels[0].classRef;
  if (!authorized(character, sourceRef.versionKey, sourceRef.verification)) {
    return {
      requirements: [],
      issues: [`${sourceRef.name} has not been approved as an exact starting-class version.`],
    };
  }
  const record = catalog.find(
    (candidate) =>
      candidate.id === sourceRef.upstreamId && candidate.sourceId === sourceRef.sourceId,
  );
  if (!record?.proficienciesJson) {
    return { requirements: [], issues: ["Starting class proficiency data is unavailable."] };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(record.proficienciesJson);
  } catch {
    return { requirements: [], issues: ["Starting class proficiency data is invalid JSON."] };
  }
  const groups =
    raw &&
    typeof raw === "object" &&
    "starting" in raw &&
    raw.starting &&
    typeof raw.starting === "object" &&
    "toolProficiencies" in raw.starting &&
    Array.isArray(raw.starting.toolProficiencies)
      ? raw.starting.toolProficiencies
      : [];
  const requirements: CapabilityChoiceRequirement[] = [];
  groups.forEach((group, index) => {
    if (!group || typeof group !== "object" || Array.isArray(group)) return;
    for (const [key, value] of Object.entries(group)) {
      if (typeof value !== "number" || value < 1) continue;
      const normalized = normalizeRuleName(key);
      const optionSet: CapabilityChoiceRequirement["optionSet"] =
        normalized === "anymusicalinstrument"
          ? "musical-instrument"
          : normalized === "anyartisanstool"
            ? "artisan-tool"
            : "any-tool";
      requirements.push(
        requirement({
          character,
          sourceRef,
          index,
          kind: "tool",
          count: value,
          optionSet,
        }),
      );
    }
  });
  const resolvedRequirementIds = new Set(
    character.resolutions
      .filter((resolution) => resolution.type === "capability-choice-confirmed")
      .map((resolution) => resolution.requirementId),
  );
  return {
    requirements: requirements.filter((entry) => !resolvedRequirementIds.has(entry.id)),
    issues: [],
  };
}

export function deriveOriginFeatCapabilityChoices(
  inputCharacter: CharacterAggregate,
  backgrounds: BackgroundCapabilityCatalogRecord[],
  feats: OriginFeatCapabilityCatalogRecord[],
): { requirements: CapabilityChoiceRequirement[]; issues: string[] } {
  const character = CharacterAggregateSchema.parse(inputCharacter);
  const background = character.build.backgroundRef;
  if (!authorized(character, background.versionKey, background.verification)) {
    return {
      requirements: [],
      issues: [`${background.name} has not been approved as an exact background version.`],
    };
  }
  const backgroundRecord = backgrounds.find(
    (candidate) =>
      candidate.id === background.upstreamId && candidate.sourceId === background.sourceId,
  );
  if (!backgroundRecord) {
    return { requirements: [], issues: ["Background capability data is unavailable."] };
  }
  if (!backgroundRecord.originFeatId) return { requirements: [], issues: [] };
  const feat = feats.find(
    (candidate) =>
      candidate.featRef.upstreamId === backgroundRecord.originFeatId &&
      candidate.featRef.sourceId === background.sourceId,
  );
  if (!feat?.rawJson) {
    return { requirements: [], issues: ["Origin feat capability data is unavailable."] };
  }
  if (feat.featRef.verification !== "verified") {
    return { requirements: [], issues: ["Origin feat must be an exact verified version."] };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(feat.rawJson);
  } catch {
    return { requirements: [], issues: ["Origin feat capability data is invalid JSON."] };
  }
  const groups =
    raw &&
    typeof raw === "object" &&
    "toolProficiencies" in raw &&
    Array.isArray(raw.toolProficiencies)
      ? raw.toolProficiencies
      : [];
  const requirements: CapabilityChoiceRequirement[] = [];
  groups.forEach((group, index) => {
    if (!group || typeof group !== "object" || Array.isArray(group)) return;
    for (const [key, value] of Object.entries(group)) {
      if (typeof value !== "number" || value < 1) continue;
      const normalized = normalizeRuleName(key);
      const optionSet: CapabilityChoiceRequirement["optionSet"] =
        normalized === "anymusicalinstrument" ? "musical-instrument" : "any-tool";
      requirements.push(
        requirement({
          character,
          sourceRef: feat.featRef,
          characterSourceVersionKey: background.versionKey,
          index,
          kind: "tool",
          count: value,
          optionSet,
        }),
      );
    }
  });
  const resolved = new Set(
    character.resolutions
      .filter((resolution) => resolution.type === "capability-choice-confirmed")
      .map((resolution) => resolution.requirementId),
  );
  return {
    requirements: requirements.filter((entry) => !resolved.has(entry.id)),
    issues: [],
  };
}

export function deriveSpeciesCapabilityChoices(
  inputCharacter: CharacterAggregate,
  catalog: SpeciesCapabilityCatalogRecord[],
): {
  requirements: CapabilityChoiceRequirement[];
  options: CapabilityChoiceOption[];
  issues: string[];
} {
  const character = CharacterAggregateSchema.parse(inputCharacter);
  const sourceRef = character.build.speciesRef;
  if (!authorized(character, sourceRef.versionKey, sourceRef.verification)) {
    return {
      requirements: [],
      options: [],
      issues: [`${sourceRef.name} has not been approved as an exact species version.`],
    };
  }
  const record = catalog.find(
    (candidate) =>
      candidate.id === sourceRef.upstreamId && candidate.sourceId === sourceRef.sourceId,
  );
  if (!record) {
    return {
      requirements: [],
      options: [],
      issues: ["Species capability data is unavailable."],
    };
  }
  const resistances = parseArray(record.resistancesJson);
  if (resistances === null) {
    return {
      requirements: [],
      options: [],
      issues: ["Species resistance data is invalid JSON."],
    };
  }
  const requirements: CapabilityChoiceRequirement[] = [];
  const options: CapabilityChoiceOption[] = [];
  resistances.forEach((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry) || !("choose" in entry)) return;
    const choose = entry.choose;
    if (
      !choose ||
      typeof choose !== "object" ||
      !("from" in choose) ||
      !Array.isArray(choose.from)
    ) {
      return;
    }
    const values = choose.from.filter((value): value is string => typeof value === "string");
    if (values.length === 0) return;
    requirements.push(
      requirement({
        character,
        sourceRef,
        index,
        kind: "resistance",
        count: 1,
        optionSet: "damage-resistance",
      }),
    );
    values.forEach((value) => {
      const label = value
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
      const upstreamId = `${sourceRef.upstreamId}:resistance:${normalizeRuleName(value).replace(/ /g, "-")}`;
      options.push(
        CapabilityChoiceOptionSchema.parse({
          ref: {
            kind: "feature",
            familyKey: createRuleFamilyKey("feature", `${sourceRef.name} ${label} Resistance`),
            versionKey: createRuleVersionKey({
              kind: "feature",
              sourceId: sourceRef.sourceId,
              upstreamId,
              contentRevision: sourceRef.contentRevision,
            }),
            name: `${sourceRef.name}: ${label} Resistance`,
            rulesGeneration: "2024",
            sourceId: sourceRef.sourceId,
            upstreamId,
            contentRevision: sourceRef.contentRevision,
            compatibility: sourceRef.compatibility,
            verification: sourceRef.verification,
          },
          capabilityLabel: label,
          choiceSourceVersionKey: sourceRef.versionKey,
          categories: ["damage-resistance"],
        }),
      );
    });
  });
  const resolvedRequirementIds = new Set(
    character.resolutions
      .filter((resolution) => resolution.type === "capability-choice-confirmed")
      .map((resolution) => resolution.requirementId),
  );
  return {
    requirements: requirements.filter((entry) => !resolvedRequirementIds.has(entry.id)),
    options,
    issues: [],
  };
}

export function deriveConditionalSubclassCapabilityChoices(
  inputCharacter: CharacterAggregate,
  catalog: SubclassFeatureCapabilityCatalogRecord[],
): { requirements: CapabilityChoiceRequirement[]; issues: string[] } {
  const character = CharacterAggregateSchema.parse(inputCharacter);
  const requirements: CapabilityChoiceRequirement[] = [];
  const issues: string[] = [];
  const startingClass = character.build.levels[0].classRef;
  const confirmedChoiceDecisionIds = new Set(
    character.resolutions
      .filter((resolution) => resolution.type === "capability-choice-confirmed")
      .map((resolution) => resolution.decisionId),
  );
  const priorToolDecision = character.build.decisions.find(
    (decision) =>
      confirmedChoiceDecisionIds.has(decision.id) &&
      decision.type === "rule-selection" &&
      decision.selectionKind === "tool" &&
      decision.sourceRef?.versionKey === startingClass.versionKey,
  );
  for (const subclass of character.build.subclasses) {
    const classLevel = character.build.levels.filter(
      (level) => level.classRef.versionKey === subclass.classVersionKey,
    ).length;
    const features = catalog.filter(
      (feature) =>
        feature.subclassVersionKey === subclass.subclassRef.versionKey &&
        feature.levelRequired <= classLevel &&
        feature.featureRef.verification === "verified",
    );
    for (const feature of features) {
      if (!feature.foundryJson) continue;
      let raw: unknown;
      try {
        raw = JSON.parse(feature.foundryJson);
      } catch {
        issues.push(`${feature.featureRef.name} capability data is invalid JSON.`);
        continue;
      }
      const groups =
        raw &&
        typeof raw === "object" &&
        "entryData" in raw &&
        raw.entryData &&
        typeof raw.entryData === "object" &&
        "toolProficiencies" in raw.entryData &&
        Array.isArray(raw.entryData.toolProficiencies)
          ? raw.entryData.toolProficiencies
          : [];
      const validGroups = groups.filter(
        (group): group is Record<string, unknown> =>
          !!group && typeof group === "object" && !Array.isArray(group),
      );
      const fixedLabels = validGroups.flatMap((group) =>
        Object.entries(group)
          .filter(([, value]) => value === true)
          .map(([key]) => key),
      );
      const choices = validGroups.flatMap((group, index) =>
        Object.entries(group)
          .filter(([, value]) => typeof value === "number" && value > 0)
          .map(([key, value]) => ({ key, value: value as number, index })),
      );
      if (fixedLabels.length === 0 || choices.length === 0 || !priorToolDecision) continue;
      const selectedNames = priorToolDecision.selections.map((selection) =>
        normalizeRuleName(selection.name),
      );
      for (const fixedLabel of fixedLabels) {
        const normalizedFixed = normalizeRuleName(fixedLabel);
        if (!selectedNames.includes(normalizedFixed)) continue;
        for (const choice of choices) {
          const choiceKey = choice.key;
          const count = choice.value;
          const optionSet = normalizeRuleName(choiceKey).includes("artisan")
            ? "artisan-tool"
            : "any-tool";
          const entry = requirement({
            character,
            sourceRef: feature.featureRef,
            characterSourceVersionKey: subclass.subclassRef.versionKey,
            index: choice.index,
            kind: "tool",
            count: count as number,
            optionSet,
          });
          requirements.push({
            ...entry,
            excludedCapabilityLabels: [fixedLabel],
          });
        }
      }
    }
  }
  const resolved = new Set(
    character.resolutions
      .filter((resolution) => resolution.type === "capability-choice-confirmed")
      .map((resolution) => resolution.requirementId),
  );
  return {
    requirements: requirements.filter((entry) => !resolved.has(entry.id)),
    issues,
  };
}

export class CapabilityChoicePermissionError extends Error {
  constructor() {
    super("Only the character owner can confirm capability choices");
    this.name = "CapabilityChoicePermissionError";
  }
}

export class CapabilityChoiceConflictError extends Error {
  constructor(
    readonly expected: number,
    readonly actual: number,
  ) {
    super(`build revision conflict: expected ${expected}, found ${actual}`);
    this.name = "CapabilityChoiceConflictError";
  }
}

export function isCapabilityChoiceOptionEligible(
  requirementValue: CapabilityChoiceRequirement,
  option: CapabilityChoiceOption,
) {
  if (
    requirementValue.excludedCapabilityLabels.some(
      (label) => normalizeRuleName(label) === normalizeRuleName(option.capabilityLabel),
    )
  )
    return false;
  if (
    requirementValue.kind === "resistance"
      ? option.ref.kind !== "feature" ||
        option.choiceSourceVersionKey !== requirementValue.sourceRef.versionKey
      : option.ref.kind !== requirementValue.kind
  )
    return false;
  if (requirementValue.optionSet === "any-tool") return option.categories.includes("tool");
  return option.categories.includes(requirementValue.optionSet);
}

function characterHasSource(character: CharacterAggregate, versionKey: string): boolean {
  return (
    character.build.backgroundRef.versionKey === versionKey ||
    character.build.speciesRef.versionKey === versionKey ||
    character.build.levels.some((level) => level.classRef.versionKey === versionKey) ||
    character.build.subclasses.some((subclass) => subclass.subclassRef.versionKey === versionKey)
  );
}

export function applyCapabilityChoice(input: {
  character: CharacterAggregate;
  requirement: CapabilityChoiceRequirement;
  options: CapabilityChoiceOption[];
  selectedBaselineCapabilityIds: string[];
  actorUserId: string;
  authority?: MutationAuthority;
  expectedBuildRevision: number;
  mutationId: string;
}): {
  character: CharacterAggregate;
  auditEvent: {
    mutationId: string;
    actorUserId: string;
    characterId: string;
    type: "confirm-capability-choice";
    requirementId: string;
    removedCapabilityIds: string[];
    selectedVersionKeys: string[];
    buildRevision: { before: number; after: number };
    authorization: AuthorizationAudit;
  };
} {
  const character = CharacterAggregateSchema.parse(input.character);
  const choice = CapabilityChoiceRequirementSchema.parse(input.requirement);
  const options = input.options.map((option) => CapabilityChoiceOptionSchema.parse(option));
  let authorization: AuthorizationAudit;
  try {
    authorization = authorizeCharacterMutation({
      character,
      actorUserId: input.actorUserId,
      authority: input.authority,
    });
  } catch (error) {
    if (error instanceof CharacterMutationPermissionError) {
      throw new CapabilityChoicePermissionError();
    }
    throw error;
  }
  if (input.expectedBuildRevision !== character.build.revision) {
    throw new CapabilityChoiceConflictError(input.expectedBuildRevision, character.build.revision);
  }
  if (
    choice.characterId !== character.identity.id ||
    choice.buildRevision !== character.build.revision ||
    !characterHasSource(character, choice.characterSourceVersionKey)
  ) {
    throw new Error("Capability choice requirement does not match the current character revision");
  }
  if (!authorized(character, choice.sourceRef.versionKey, choice.sourceRef.verification)) {
    throw new Error("Capability choice source must be verified or explicitly approved");
  }
  if (
    choice.kind === "resistance" &&
    choice.sourceRef.kind === "species" &&
    normalizeRuleName(choice.sourceRef.name) === "tiefling"
  ) {
    throw new Error("Tiefling resistance must be confirmed with the atomic legacy operation");
  }
  if (
    character.resolutions.some(
      (resolution) =>
        resolution.type === "capability-choice-confirmed" && resolution.requirementId === choice.id,
    )
  ) {
    throw new Error(`Capability choice requirement ${choice.id} has already been resolved`);
  }
  if (
    input.selectedBaselineCapabilityIds.length !== choice.count ||
    new Set(input.selectedBaselineCapabilityIds).size !== choice.count
  ) {
    throw new Error(`Capability choice requires exactly ${choice.count} distinct selection(s)`);
  }
  const baseline = character.migrationBaseline?.capabilities ?? [];
  const selected = input.selectedBaselineCapabilityIds.map((id) => {
    const capability = baseline.find((candidate) => candidate.id === id);
    if (!capability) throw new Error(`Baseline capability ${id} no longer exists`);
    if (capability.kind !== choice.kind)
      throw new Error(`Baseline capability ${id} has the wrong kind`);
    const matches = options.filter(
      (option) =>
        normalizeRuleName(option.capabilityLabel) === normalizeRuleName(capability.label) &&
        isCapabilityChoiceOptionEligible(choice, option),
    );
    if (matches.length !== 1) {
      throw new Error(
        `Capability ${capability.label} does not resolve to one eligible exact option`,
      );
    }
    if (matches[0].ref.verification !== "verified") {
      throw new Error(`Capability option ${matches[0].ref.name} is not an exact verified version`);
    }
    return { capability, option: matches[0] };
  });
  const decisionId = `decision:capability-choice:${input.mutationId}`;
  const removedIds = new Set(input.selectedBaselineCapabilityIds);
  const remaining = baseline.filter((capability) => !removedIds.has(capability.id));
  const resolutions: CharacterAggregate["resolutions"] = selected.map(
    ({ capability, option }, index) => ({
      id: `resolution:capability-choice:${input.mutationId}:${index}`,
      type: "capability-choice-confirmed",
      requirementId: choice.id,
      decisionId,
      baselineCapabilityId: capability.id,
      capabilityKind: choice.kind,
      selectedVersionKey: option.ref.versionKey,
      sourceVersionKey: choice.sourceRef.versionKey,
      decidedByUserId: input.actorUserId,
      method: "owner-confirmed-rule-choice",
    }),
  );
  const updated = CharacterAggregateSchema.parse({
    ...character,
    build: {
      ...character.build,
      revision: character.build.revision + 1,
      decisions: [
        ...character.build.decisions,
        {
          id: decisionId,
          type: "rule-selection",
          selectionKind: choice.selectionKind,
          sourceRef: choice.sourceRef,
          selections: selected.map(({ option }) => option.ref),
          madeAtCharacterLevel: null,
          provenance: "imported",
        },
      ],
    },
    migrationBaseline:
      character.migrationBaseline && remaining.length > 0
        ? { ...character.migrationBaseline, capabilities: remaining }
        : null,
    resolutions: [...character.resolutions, ...resolutions],
  });
  return {
    character: updated,
    auditEvent: {
      mutationId: input.mutationId,
      actorUserId: input.actorUserId,
      characterId: character.identity.id,
      type: "confirm-capability-choice",
      requirementId: choice.id,
      removedCapabilityIds: [...removedIds],
      selectedVersionKeys: selected.map(({ option }) => option.ref.versionKey),
      buildRevision: { before: character.build.revision, after: updated.build.revision },
      authorization,
    },
  };
}
