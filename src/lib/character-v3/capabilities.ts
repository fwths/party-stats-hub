import { z } from "zod";
import { normalizeRuleName } from "../character-v2/reconcile";
import {
  CharacterAggregateSchema,
  ExactRuleRefSchema,
  ImportedCapabilitySchema,
  type CharacterAggregate,
} from "./schema";
import {
  authorizeCharacterMutation,
  CharacterMutationPermissionError,
  type AuthorizationAudit,
  type MutationAuthority,
} from "./authority";

export const NativeCapabilityGrantSchema = z
  .object({
    id: z.string().trim().min(1),
    kind: z.enum([
      "armor-proficiency",
      "weapon-proficiency",
      "tool",
      "language",
      "resistance",
      "immunity",
      "vulnerability",
      "condition-immunity",
      "sense",
    ]),
    label: z.string().trim().min(1),
    value: z.number().int().min(0).nullable(),
    sourceRef: ExactRuleRefSchema,
    grantMode: z.enum([
      "fixed-starting-class",
      "fixed-subclass-feature",
      "fixed-species",
      "fixed-background",
    ]),
  })
  .strict();

export type NativeCapabilityGrant = z.infer<typeof NativeCapabilityGrantSchema>;

export type ClassCapabilityCatalogRecord = {
  id: string;
  sourceId: string;
  proficienciesJson: string | null;
};

export type SubclassFeatureCapabilityCatalogRecord = {
  subclassVersionKey: string;
  featureRef: z.infer<typeof ExactRuleRefSchema>;
  levelRequired: number;
  foundryJson: string | null;
};

export type SpeciesCapabilityCatalogRecord = {
  id: string;
  sourceId: string;
  rawJson: string | null;
  sensesJson: string | null;
  resistancesJson: string | null;
  immunitiesJson: string | null;
  languagesJson: string | null;
};

export type BackgroundCapabilityCatalogRecord = {
  id: string;
  sourceId: string;
  originFeatId: string | null;
  toolProficienciesJson: string | null;
  languageProficienciesJson: string | null;
};

export type CapabilityMatch = {
  baseline: z.infer<typeof ImportedCapabilitySchema>;
  grant: NativeCapabilityGrant;
};

export type CapabilityReconciliationReport = {
  characterId: string;
  buildRevision: number;
  grants: NativeCapabilityGrant[];
  matches: CapabilityMatch[];
  unexplainedBaseline: Array<z.infer<typeof ImportedCapabilitySchema>>;
  missingFromBaseline: NativeCapabilityGrant[];
  deferredChoices: string[];
  issues: string[];
};

const ProficienciesSchema = z
  .object({
    starting: z
      .object({
        armor: z.array(z.string()).optional(),
        weapons: z.array(z.string()).optional(),
        toolProficiencies: z.array(z.record(z.unknown())).optional(),
      })
      .passthrough(),
  })
  .passthrough();

const ARMOR_LABELS: Record<string, string> = {
  light: "Light Armor",
  medium: "Medium Armor",
  heavy: "Heavy Armor",
  shield: "Shields",
  shields: "Shields",
};

const WEAPON_LABELS: Record<string, string> = {
  simple: "Simple Weapons",
  martial: "Martial Weapons",
};

const TOOL_LABELS: Record<string, string> = {
  "thieves tools": "Thieves' Tools",
  "tinkers tools": "Tinker's Tools",
  "tinker s tools": "Tinker's Tools",
  "herbalism kit": "Herbalism Kit",
  "smiths tools": "Smith's Tools",
  "smith s tools": "Smith's Tools",
};

function fixedLabel(value: string, labels: Record<string, string>): string | null {
  return labels[normalizeRuleName(value)] ?? null;
}

export function deriveStartingClassCapabilities(
  character: CharacterAggregate,
  catalog: ClassCapabilityCatalogRecord[],
): { grants: NativeCapabilityGrant[]; deferredChoices: string[]; issues: string[] } {
  const startingClass = character.build.levels[0].classRef;
  if (startingClass.verification !== "verified") {
    return {
      grants: [],
      deferredChoices: [],
      issues: ["Starting class is not an exact verified rule version."],
    };
  }
  const record = catalog.find(
    (candidate) =>
      candidate.id === startingClass.upstreamId && candidate.sourceId === startingClass.sourceId,
  );
  if (!record?.proficienciesJson) {
    return {
      grants: [],
      deferredChoices: [],
      issues: ["Starting class proficiency data is unavailable."],
    };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(record.proficienciesJson);
  } catch {
    return {
      grants: [],
      deferredChoices: [],
      issues: ["Starting class proficiency data is invalid JSON."],
    };
  }
  const parsed = ProficienciesSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      grants: [],
      deferredChoices: [],
      issues: ["Starting class proficiency data has an unsupported shape."],
    };
  }
  const grants: NativeCapabilityGrant[] = [];
  const deferredChoices: string[] = [];
  const issues: string[] = [];
  const add = (
    kind: NativeCapabilityGrant["kind"],
    rawLabel: string,
    labels: Record<string, string>,
    grantMode: NativeCapabilityGrant["grantMode"] = "fixed-starting-class",
  ) => {
    const label = fixedLabel(rawLabel, labels);
    if (!label) {
      issues.push(`Unsupported ${kind} grant: ${rawLabel}`);
      return;
    }
    grants.push(
      NativeCapabilityGrantSchema.parse({
        id: `derived:${startingClass.versionKey}:${kind}:${normalizeRuleName(label).replace(/ /g, "-")}`,
        kind,
        label,
        value: null,
        sourceRef: startingClass,
        grantMode,
      }),
    );
  };
  for (const armor of parsed.data.starting.armor ?? []) {
    add("armor-proficiency", armor, ARMOR_LABELS);
  }
  for (const weapon of parsed.data.starting.weapons ?? []) {
    add("weapon-proficiency", weapon, WEAPON_LABELS);
  }
  for (const group of parsed.data.starting.toolProficiencies ?? []) {
    for (const [tool, value] of Object.entries(group)) {
      if (value === true) add("tool", tool, TOOL_LABELS);
      else if (typeof value === "number" && value > 0)
        deferredChoices.push(`tool:${tool}:${value}`);
    }
  }
  return { grants, deferredChoices, issues };
}

export function reconcileStartingClassCapabilities(
  character: CharacterAggregate,
  catalog: ClassCapabilityCatalogRecord[],
): CapabilityReconciliationReport {
  const derived = deriveStartingClassCapabilities(character, catalog);
  return reconcileDerivedCapabilities(
    character,
    derived.grants,
    derived.deferredChoices,
    derived.issues,
    ["armor-proficiency", "weapon-proficiency", "tool"],
  );
}

const FeatureCapabilityDataSchema = z
  .object({
    entryData: z
      .object({
        armorProficiencies: z.array(z.record(z.unknown())).optional(),
        toolProficiencies: z.array(z.record(z.unknown())).optional(),
      })
      .passthrough(),
  })
  .passthrough();

export function deriveUnlockedSubclassCapabilities(
  character: CharacterAggregate,
  catalog: SubclassFeatureCapabilityCatalogRecord[],
): { grants: NativeCapabilityGrant[]; deferredChoices: string[]; issues: string[] } {
  const grants: NativeCapabilityGrant[] = [];
  const deferredChoices: string[] = [];
  const issues: string[] = [];
  for (const subclass of character.build.subclasses) {
    if (subclass.subclassRef.verification !== "verified") {
      issues.push(`${subclass.subclassRef.name} is not an exact verified subclass version.`);
      continue;
    }
    const classLevel = character.build.levels.filter(
      (level) => level.classRef.versionKey === subclass.classVersionKey,
    ).length;
    const features = catalog.filter(
      (feature) =>
        feature.subclassVersionKey === subclass.subclassRef.versionKey &&
        feature.levelRequired <= classLevel,
    );
    for (const feature of features) {
      if (!feature.foundryJson || feature.featureRef.verification !== "verified") continue;
      let raw: unknown;
      try {
        raw = JSON.parse(feature.foundryJson);
      } catch {
        issues.push(`${feature.featureRef.name} capability data is invalid JSON.`);
        continue;
      }
      const parsed = FeatureCapabilityDataSchema.safeParse(raw);
      if (!parsed.success) continue;
      const addFixed = (
        kind: NativeCapabilityGrant["kind"],
        key: string,
        labels: Record<string, string>,
      ) => {
        const label = fixedLabel(key, labels);
        if (!label) {
          issues.push(`Unsupported ${kind} grant from ${feature.featureRef.name}: ${key}`);
          return;
        }
        grants.push(
          NativeCapabilityGrantSchema.parse({
            id: `derived:${feature.featureRef.versionKey}:${kind}:${normalizeRuleName(label).replace(/ /g, "-")}`,
            kind,
            label,
            value: null,
            sourceRef: feature.featureRef,
            grantMode: "fixed-subclass-feature",
          }),
        );
      };
      for (const group of parsed.data.entryData.armorProficiencies ?? []) {
        for (const [armor, value] of Object.entries(group)) {
          if (value === true) addFixed("armor-proficiency", armor, ARMOR_LABELS);
          else if (typeof value === "number" && value > 0) {
            deferredChoices.push(`armor:${feature.featureRef.versionKey}:${armor}:${value}`);
          }
        }
      }
      const toolGroups = parsed.data.entryData.toolProficiencies ?? [];
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
          decision.sourceRef?.versionKey === subclass.classVersionKey,
      );
      const hasConditionalToolChoice = toolGroups.some((group) =>
        Object.values(group).some((value) => typeof value === "number" && value > 0),
      );
      const fixedTools = toolGroups.flatMap((group) =>
        Object.entries(group).filter(([, value]) => value === true),
      );
      const selectedPriorTools =
        priorToolDecision?.type === "rule-selection"
          ? priorToolDecision.selections.map((selection) => normalizeRuleName(selection.name))
          : [];
      const fallbackIsActive = fixedTools.some(([tool]) => {
        const label = fixedLabel(tool, TOOL_LABELS);
        return label ? selectedPriorTools.includes(normalizeRuleName(label)) : false;
      });
      for (const group of toolGroups) {
        for (const [tool, value] of Object.entries(group)) {
          if (value === true && !hasConditionalToolChoice) {
            addFixed("tool", tool, TOOL_LABELS);
          } else if (value === true) {
            if (!priorToolDecision) {
              deferredChoices.push(`conditional-tool:${feature.featureRef.versionKey}:${tool}`);
            } else if (!fallbackIsActive) {
              addFixed("tool", tool, TOOL_LABELS);
            }
          } else if (typeof value === "number" && value > 0) {
            if (!priorToolDecision || fallbackIsActive) {
              deferredChoices.push(`tool:${feature.featureRef.versionKey}:${tool}:${value}`);
            }
          }
        }
      }
    }
  }
  return { grants, deferredChoices, issues };
}

export function reconcileSubclassCapabilities(
  character: CharacterAggregate,
  catalog: SubclassFeatureCapabilityCatalogRecord[],
): CapabilityReconciliationReport {
  const derived = deriveUnlockedSubclassCapabilities(character, catalog);
  return reconcileDerivedCapabilities(
    character,
    derived.grants,
    derived.deferredChoices,
    derived.issues,
    ["armor-proficiency", "weapon-proficiency", "tool"],
  );
}

function isAuthorizedRuleSource(
  character: CharacterAggregate,
  versionKey: string,
  verification: string,
): boolean {
  if (verification === "verified") return true;
  return character.resolutions.some(
    (resolution) =>
      resolution.type === "content-version-decision" &&
      resolution.selectedVersionKey === versionKey,
  );
}

function parseJsonArray(value: string | null): unknown[] | null {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function titleCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function deriveFixedSpeciesCapabilities(
  character: CharacterAggregate,
  catalog: SpeciesCapabilityCatalogRecord[],
): { grants: NativeCapabilityGrant[]; deferredChoices: string[]; issues: string[] } {
  const species = character.build.speciesRef;
  if (!isAuthorizedRuleSource(character, species.versionKey, species.verification)) {
    return {
      grants: [],
      deferredChoices: [],
      issues: [`${species.name} has not been approved as an exact species version.`],
    };
  }
  const record = catalog.find(
    (candidate) => candidate.id === species.upstreamId && candidate.sourceId === species.sourceId,
  );
  if (!record) {
    return { grants: [], deferredChoices: [], issues: ["Species capability data is unavailable."] };
  }
  const grants: NativeCapabilityGrant[] = [];
  const deferredChoices: string[] = [];
  const issues: string[] = [];
  const add = (kind: NativeCapabilityGrant["kind"], label: string, value: number | null = null) => {
    grants.push(
      NativeCapabilityGrantSchema.parse({
        id: `derived:${species.versionKey}:${kind}:${normalizeRuleName(label).replace(/ /g, "-")}:${value ?? "none"}`,
        kind,
        label,
        value,
        sourceRef: species,
        grantMode: "fixed-species",
      }),
    );
  };

  const senses = parseJsonArray(record.sensesJson);
  if (senses === null) issues.push("Species senses data is invalid JSON.");
  for (const sense of senses ?? []) {
    if (typeof sense !== "string") {
      issues.push("Species sense has an unsupported structured value.");
      continue;
    }
    const match = sense.match(/^(.+?)\s+(\d+)\s*ft\.?$/i);
    if (!match) {
      issues.push(`Unsupported species sense: ${sense}`);
      continue;
    }
    add("sense", titleCase(match[1]), Number(match[2]));
  }

  const addFixedOrChoice = (rawJson: string | null, kind: "resistance" | "immunity") => {
    const entries = parseJsonArray(rawJson);
    if (entries === null) {
      issues.push(`Species ${kind} data is invalid JSON.`);
      return;
    }
    for (const entry of entries) {
      if (typeof entry === "string") {
        add(kind, titleCase(entry));
      } else if (entry && typeof entry === "object" && "choose" in entry) {
        deferredChoices.push(`${kind}-choice:${species.versionKey}`);
      } else {
        issues.push(`Species ${kind} has an unsupported structured value.`);
      }
    }
  };
  addFixedOrChoice(record.resistancesJson, "resistance");
  addFixedOrChoice(record.immunitiesJson, "immunity");

  const languages = parseJsonArray(record.languagesJson);
  if (languages === null) issues.push("Species language data is invalid JSON.");
  for (const group of languages ?? []) {
    if (!group || typeof group !== "object" || Array.isArray(group)) {
      issues.push("Species language data has an unsupported value.");
      continue;
    }
    for (const [language, value] of Object.entries(group)) {
      if (value === true) add("language", titleCase(language));
      else if (typeof value === "number" && value > 0) {
        deferredChoices.push(`language-choice:${species.versionKey}:${language}:${value}`);
      }
    }
  }
  return { grants, deferredChoices, issues };
}

export function reconcileSpeciesCapabilities(
  character: CharacterAggregate,
  catalog: SpeciesCapabilityCatalogRecord[],
): CapabilityReconciliationReport {
  const derived = deriveFixedSpeciesCapabilities(character, catalog);
  return reconcileDerivedCapabilities(
    character,
    derived.grants,
    derived.deferredChoices,
    derived.issues,
    ["language", "resistance", "immunity", "vulnerability", "condition-immunity", "sense"],
  );
}

const BACKGROUND_TOOL_LABELS: Record<string, string> = {
  "calligrapher s supplies": "Calligrapher's Supplies",
  "calligraphers supplies": "Calligrapher's Supplies",
};

function deriveFixedBackgroundGroup(input: {
  sourceRef: CharacterAggregate["build"]["backgroundRef"];
  rawJson: string | null;
  kind: "tool" | "language";
  grants: NativeCapabilityGrant[];
  deferredChoices: string[];
  issues: string[];
}) {
  const { sourceRef, kind, grants, deferredChoices, issues } = input;
  const groups = parseJsonArray(input.rawJson);
  if (groups === null) {
    issues.push(`Background ${kind} proficiency data is invalid JSON.`);
    return;
  }
  groups.forEach((group, index) => {
    if (typeof group === "string") {
      const normalized = normalizeRuleName(group);
      if (normalized.startsWith("any")) {
        deferredChoices.push(
          `background-choice:${sourceRef.versionKey}:${kind}:${index}:${normalized}:1`,
        );
        return;
      }
      const label = kind === "tool" ? BACKGROUND_TOOL_LABELS[normalized] : titleCase(group);
      if (!label) {
        issues.push(`Unsupported fixed background ${kind} grant: ${group}`);
        return;
      }
      grants.push(
        NativeCapabilityGrantSchema.parse({
          id: `derived:${sourceRef.versionKey}:${kind}:${normalizeRuleName(label).replace(/ /g, "-")}`,
          kind,
          label,
          value: null,
          sourceRef,
          grantMode: "fixed-background",
        }),
      );
      return;
    }
    if (!group || typeof group !== "object" || Array.isArray(group)) {
      issues.push(`Background ${kind} proficiency data has an unsupported value.`);
      return;
    }
    for (const [option, value] of Object.entries(group)) {
      if (value === true) {
        const normalized = normalizeRuleName(option);
        const label = kind === "tool" ? BACKGROUND_TOOL_LABELS[normalized] : titleCase(option);
        if (!label) issues.push(`Unsupported fixed background ${kind} grant: ${option}`);
        else
          grants.push(
            NativeCapabilityGrantSchema.parse({
              id: `derived:${sourceRef.versionKey}:${kind}:${normalizeRuleName(label).replace(/ /g, "-")}`,
              kind,
              label,
              value: null,
              sourceRef,
              grantMode: "fixed-background",
            }),
          );
      } else if (typeof value === "number" && value > 0) {
        deferredChoices.push(
          `background-choice:${sourceRef.versionKey}:${kind}:${index}:${option}:${value}`,
        );
      } else if (option === "choose" && value && typeof value === "object") {
        deferredChoices.push(`background-choice:${sourceRef.versionKey}:${kind}:${index}:choose`);
      }
    }
  });
}

export function deriveFixedBackgroundCapabilities(
  character: CharacterAggregate,
  catalog: BackgroundCapabilityCatalogRecord[],
): { grants: NativeCapabilityGrant[]; deferredChoices: string[]; issues: string[] } {
  const background = character.build.backgroundRef;
  if (!isAuthorizedRuleSource(character, background.versionKey, background.verification)) {
    return {
      grants: [],
      deferredChoices: [],
      issues: [`${background.name} has not been approved as an exact background version.`],
    };
  }
  const record = catalog.find(
    (candidate) =>
      candidate.id === background.upstreamId && candidate.sourceId === background.sourceId,
  );
  if (!record) {
    return {
      grants: [],
      deferredChoices: [],
      issues: ["Background capability data is unavailable."],
    };
  }
  const grants: NativeCapabilityGrant[] = [];
  const deferredChoices: string[] = [];
  const issues: string[] = [];
  deriveFixedBackgroundGroup({
    sourceRef: background,
    rawJson: record.toolProficienciesJson,
    kind: "tool",
    grants,
    deferredChoices,
    issues,
  });
  deriveFixedBackgroundGroup({
    sourceRef: background,
    rawJson: record.languageProficienciesJson,
    kind: "language",
    grants,
    deferredChoices,
    issues,
  });
  return { grants, deferredChoices, issues };
}

export function reconcileBackgroundCapabilities(
  character: CharacterAggregate,
  catalog: BackgroundCapabilityCatalogRecord[],
): CapabilityReconciliationReport {
  const derived = deriveFixedBackgroundCapabilities(character, catalog);
  return reconcileDerivedCapabilities(
    character,
    derived.grants,
    derived.deferredChoices,
    derived.issues,
    ["tool", "language"],
  );
}

function reconcileDerivedCapabilities(
  character: CharacterAggregate,
  grants: NativeCapabilityGrant[],
  deferredChoices: string[],
  issues: string[],
  targetKinds: Array<z.infer<typeof ImportedCapabilitySchema>["kind"]>,
): CapabilityReconciliationReport {
  const relevantBaseline = (character.migrationBaseline?.capabilities ?? []).filter((capability) =>
    targetKinds.includes(capability.kind),
  );
  const matchedIds = new Set<string>();
  const matches: CapabilityMatch[] = [];
  for (const grant of grants) {
    const baseline = relevantBaseline.find(
      (candidate) =>
        !matchedIds.has(candidate.id) &&
        candidate.kind === grant.kind &&
        normalizeRuleName(candidate.label) === normalizeRuleName(grant.label) &&
        candidate.value === grant.value,
    );
    if (!baseline) continue;
    matchedIds.add(baseline.id);
    matches.push({ baseline, grant });
  }
  return {
    characterId: character.identity.id,
    buildRevision: character.build.revision,
    grants,
    matches,
    unexplainedBaseline: relevantBaseline.filter((capability) => !matchedIds.has(capability.id)),
    missingFromBaseline: grants.filter(
      (grant) => !matches.some((match) => match.grant.id === grant.id),
    ),
    deferredChoices,
    issues,
  };
}

export class CapabilityReconciliationPermissionError extends Error {
  constructor() {
    super("Only the character owner can reconcile imported capabilities");
    this.name = "CapabilityReconciliationPermissionError";
  }
}

export class CapabilityReconciliationConflictError extends Error {
  constructor(
    readonly expected: number,
    readonly actual: number,
  ) {
    super(`build revision conflict: expected ${expected}, found ${actual}`);
    this.name = "CapabilityReconciliationConflictError";
  }
}

export function applyCapabilityMatches(input: {
  character: CharacterAggregate;
  report: CapabilityReconciliationReport;
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
    type: "reconcile-capability-baseline";
    removedCapabilityIds: string[];
    sourceVersionKeys: string[];
    buildRevision: { before: number; after: number };
    authorization: AuthorizationAudit;
  };
} {
  const character = CharacterAggregateSchema.parse(input.character);
  let authorization: AuthorizationAudit;
  try {
    authorization = authorizeCharacterMutation({
      character,
      actorUserId: input.actorUserId,
      authority: input.authority,
    });
  } catch (error) {
    if (error instanceof CharacterMutationPermissionError) {
      throw new CapabilityReconciliationPermissionError();
    }
    throw error;
  }
  if (input.expectedBuildRevision !== character.build.revision) {
    throw new CapabilityReconciliationConflictError(
      input.expectedBuildRevision,
      character.build.revision,
    );
  }
  if (
    input.report.characterId !== character.identity.id ||
    input.report.buildRevision !== character.build.revision
  ) {
    throw new Error("Capability report does not match the current character revision");
  }
  if (input.report.matches.length === 0) {
    throw new Error("Capability report contains no exact matches to apply");
  }
  const currentCapabilities = character.migrationBaseline?.capabilities ?? [];
  const currentIds = new Set(currentCapabilities.map((capability) => capability.id));
  for (const match of input.report.matches) {
    if (!currentIds.has(match.baseline.id)) {
      throw new Error(`Baseline capability ${match.baseline.id} no longer exists`);
    }
    if (
      !isAuthorizedRuleSource(
        character,
        match.grant.sourceRef.versionKey,
        match.grant.sourceRef.verification,
      )
    ) {
      throw new Error("Capability source must be verified or explicitly approved");
    }
  }
  const removedIds = new Set(input.report.matches.map((match) => match.baseline.id));
  const remaining = currentCapabilities.filter((capability) => !removedIds.has(capability.id));
  const resolutions: CharacterAggregate["resolutions"] = input.report.matches.map(
    (match, index) => ({
      id: `resolution:capability:${input.mutationId}:${index}`,
      type: "capability-baseline-reconciled",
      baselineCapabilityId: match.baseline.id,
      capabilityKind: match.baseline.kind,
      label: match.baseline.label,
      value: match.baseline.value,
      sourceVersionKey: match.grant.sourceRef.versionKey,
      method: "exact-fixed-rule-match",
    }),
  );
  const reconciled = CharacterAggregateSchema.parse({
    ...character,
    build: { ...character.build, revision: character.build.revision + 1 },
    migrationBaseline:
      character.migrationBaseline && remaining.length > 0
        ? { ...character.migrationBaseline, capabilities: remaining }
        : null,
    resolutions: [...character.resolutions, ...resolutions],
  });
  return {
    character: reconciled,
    auditEvent: {
      mutationId: input.mutationId,
      actorUserId: input.actorUserId,
      characterId: character.identity.id,
      type: "reconcile-capability-baseline",
      removedCapabilityIds: [...removedIds],
      sourceVersionKeys: [
        ...new Set(input.report.matches.map((match) => match.grant.sourceRef.versionKey)),
      ],
      buildRevision: { before: character.build.revision, after: reconciled.build.revision },
      authorization,
    },
  };
}
