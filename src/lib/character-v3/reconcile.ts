import { z } from "zod";
import { createRuleFamilyKey, createRuleVersionKey } from "../character-v2/rule-identity";
import { normalizeRuleName } from "../character-v2/reconcile";
import { CharacterAggregateSchema, type CharacterAggregate, type ExactRuleRef } from "./schema";
import {
  authorizeCharacterMutation,
  CharacterMutationPermissionError,
  MutationAuthoritySchema,
  type AuthorizationAudit,
} from "./authority";

export type V3CatalogRecord = {
  kind: ExactRuleRef["kind"];
  id: string;
  name: string;
  sourceId: string;
  edition: string | null;
  contentRevision: string;
};

export type V3Compatibility =
  | "core-2024"
  | "current-2024-compatible"
  | "legacy-5e-compatible";
export type V3ReconciliationStatus =
  | "already-canonical"
  | "resolved-current"
  | "resolved-by-decision"
  | "legacy-match"
  | "missing"
  | "ambiguous";

export type V3ReconciliationEntry = {
  path: string;
  imported: ExactRuleRef;
  status: V3ReconciliationStatus;
  canonical: ExactRuleRef | null;
  requiresDecision: boolean;
};

export type V3ReconciliationReport = {
  entries: V3ReconciliationEntry[];
  resolvedCount: number;
  unresolvedCount: number;
  decisionCount: number;
  capabilityBlockerCount: number;
  readyForNativeAuthority: boolean;
};

const CORE_2024_SOURCES = new Set(["XPHB", "XDMG", "XMM"]);

function compatibility(record: V3CatalogRecord): V3Compatibility {
  if (CORE_2024_SOURCES.has(record.sourceId.toUpperCase())) return "core-2024";
  if (record.edition?.toLowerCase() === "one") return "current-2024-compatible";
  return "legacy-5e-compatible";
}

function isCurrent2024Compatibility(compatibility: ExactRuleRef["compatibility"]): boolean {
  return compatibility === "core-2024" || compatibility === "current-2024-compatible";
}

function supportedIdentityKind(kind: ExactRuleRef["kind"]) {
  return ["language", "tool", "weapon-mastery", "condition"].includes(kind) ? "other" : kind;
}

function catalogRef(record: V3CatalogRecord): ExactRuleRef {
  const classification = compatibility(record);
  const identityKind = supportedIdentityKind(record.kind);
  return {
    kind: record.kind,
    familyKey: createRuleFamilyKey(identityKind, record.name),
    versionKey: createRuleVersionKey({
      kind: identityKind,
      sourceId: record.sourceId,
      upstreamId: record.id,
      contentRevision: record.contentRevision,
    }),
    name: record.name,
    rulesGeneration: "2024",
    sourceId: record.sourceId,
    upstreamId: record.id,
    contentRevision: record.contentRevision,
    compatibility: classification,
    verification: isCurrent2024Compatibility(classification) ? "verified" : "imported-unverified",
  };
}

function reconcileRef(
  path: string,
  imported: ExactRuleRef,
  catalog: V3CatalogRecord[],
): V3ReconciliationEntry {
  if (
    imported.verification === "verified" && isCurrent2024Compatibility(imported.compatibility)
  ) {
    return {
      path,
      imported,
      status: "already-canonical",
      canonical: imported,
      requiresDecision: false,
    };
  }
  const candidates = catalog.filter(
    (record) =>
      record.kind === imported.kind &&
      normalizeRuleName(record.name) === normalizeRuleName(imported.name),
  );
  if (candidates.length === 0) {
    return {
      path,
      imported,
      status: "missing",
      canonical: null,
      requiresDecision: true,
    };
  }
  const current = candidates.filter((record) => isCurrent2024Compatibility(compatibility(record)));
  if (current.length > 1) {
    return {
      path,
      imported,
      status: "ambiguous",
      canonical: null,
      requiresDecision: true,
    };
  }
  if (current.length === 1) {
    return {
      path,
      imported,
      status: "resolved-current",
      canonical: catalogRef(current[0]),
      requiresDecision: false,
    };
  }
  if (candidates.length > 1) {
    return {
      path,
      imported,
      status: "ambiguous",
      canonical: null,
      requiresDecision: true,
    };
  }
  return {
    path,
    imported,
    status: "legacy-match",
    canonical: catalogRef(candidates[0]),
    requiresDecision: true,
  };
}

function collectRefs(character: CharacterAggregate): Array<{ path: string; ref: ExactRuleRef }> {
  const refs: Array<{ path: string; ref: ExactRuleRef }> = [
    { path: "build.speciesRef", ref: character.build.speciesRef },
    { path: "build.backgroundRef", ref: character.build.backgroundRef },
  ];
  character.build.levels.forEach((level, index) =>
    refs.push({ path: `build.levels.${index}.classRef`, ref: level.classRef }),
  );
  character.build.subclasses.forEach((subclass, index) =>
    refs.push({ path: `build.subclasses.${index}.subclassRef`, ref: subclass.subclassRef }),
  );
  character.build.decisions.forEach((decision, index) => {
    if (decision.sourceRef) {
      refs.push({ path: `build.decisions.${index}.sourceRef`, ref: decision.sourceRef });
    }
    if (decision.type === "rule-selection") {
      decision.selections.forEach((selection, selectionIndex) =>
        refs.push({
          path: `build.decisions.${index}.selections.${selectionIndex}`,
          ref: selection,
        }),
      );
    }
  });
  character.build.spells.forEach((spell, index) => {
    refs.push({ path: `build.spells.${index}.spellRef`, ref: spell.spellRef });
    if (spell.grantSourceRef) {
      refs.push({ path: `build.spells.${index}.grantSourceRef`, ref: spell.grantSourceRef });
    }
  });
  character.build.overrides.forEach((override, index) => {
    if (override.type === "rule-grant") {
      refs.push({ path: `build.overrides.${index}.grantedRef`, ref: override.grantedRef });
    }
  });
  character.hitPoints.gains.forEach((gain, gainIndex) =>
    gain.bonuses.forEach((bonus, bonusIndex) => {
      if (bonus.sourceRef) {
        refs.push({
          path: `hitPoints.gains.${gainIndex}.bonuses.${bonusIndex}.sourceRef`,
          ref: bonus.sourceRef,
        });
      }
    }),
  );
  character.items.forEach((item, index) => {
    if (item.definitionRef) {
      refs.push({ path: `items.${index}.definitionRef`, ref: item.definitionRef });
    }
  });
  character.liveState.conditions.forEach((condition, index) => {
    if (condition.conditionRef) {
      refs.push({
        path: `liveState.conditions.${index}.conditionRef`,
        ref: condition.conditionRef,
      });
    }
  });
  character.migrationBaseline?.capabilities.forEach((capability, index) => {
    if (capability.sourceRef) {
      refs.push({
        path: `migrationBaseline.capabilities.${index}.sourceRef`,
        ref: capability.sourceRef,
      });
    }
  });
  return refs;
}

export function reconcileCharacterV3(
  character: CharacterAggregate,
  catalog: V3CatalogRecord[],
): V3ReconciliationReport {
  const unique = new Map<string, { path: string; ref: ExactRuleRef }>();
  for (const entry of collectRefs(character)) {
    if (!unique.has(entry.ref.versionKey)) unique.set(entry.ref.versionKey, entry);
  }
  const rawEntries = [...unique.values()].map(({ path, ref }) => reconcileRef(path, ref, catalog));
  const entries = rawEntries.map((entry): V3ReconciliationEntry => {
    const decision = character.resolutions.find(
      (resolution) =>
        resolution.type === "content-version-decision" &&
        (resolution.importedVersionKey === entry.imported.versionKey ||
          resolution.selectedVersionKey === entry.imported.versionKey),
    );
    if (!decision) return entry;
    const selectedRef =
      decision.selectedVersionKey === entry.imported.versionKey
        ? entry.imported
        : entry.canonical?.versionKey === decision.selectedVersionKey
          ? entry.canonical
          : null;
    if (!selectedRef) return entry;
    return {
      ...entry,
      status: "resolved-by-decision",
      canonical: selectedRef,
      requiresDecision: false,
    };
  });
  const resolvedCount = entries.filter((entry) =>
    ["already-canonical", "resolved-current", "resolved-by-decision"].includes(entry.status),
  ).length;
  const unresolvedCount = entries.length - resolvedCount;
  const decisionCount = entries.filter((entry) => entry.requiresDecision).length;
  const capabilityBlockerCount = character.migrationBaseline?.capabilities.length ?? 0;
  return {
    entries,
    resolvedCount,
    unresolvedCount,
    decisionCount,
    capabilityBlockerCount,
    readyForNativeAuthority: unresolvedCount === 0 && capabilityBlockerCount === 0,
  };
}

export function applyAcceptedV3Reconciliation(input: {
  character: CharacterAggregate;
  report: V3ReconciliationReport;
  catalogRevision: string;
}): CharacterAggregate {
  const replacements = new Map<string, ExactRuleRef>();
  for (const entry of input.report.entries) {
    if (entry.status === "resolved-current" && entry.canonical) {
      replacements.set(entry.imported.versionKey, entry.canonical);
    }
  }
  return applyReferenceReplacements({
    character: input.character,
    replacements,
    catalogRevision: input.catalogRevision,
  });
}

function applyReferenceReplacements(input: {
  character: CharacterAggregate;
  replacements: Map<string, ExactRuleRef>;
  catalogRevision: string;
  resolutions?: CharacterAggregate["resolutions"];
}): CharacterAggregate {
  const replacements = input.replacements;
  const replace = (ref: ExactRuleRef): ExactRuleRef => replacements.get(ref.versionKey) ?? ref;
  const replaceKey = (versionKey: string): string =>
    replacements.get(versionKey)?.versionKey ?? versionKey;
  const character = input.character;

  return CharacterAggregateSchema.parse({
    ...character,
    build: {
      ...character.build,
      revision: character.build.revision + 1,
      rulesContext: {
        ...character.build.rulesContext,
        catalogRevision: input.catalogRevision,
      },
      speciesRef: replace(character.build.speciesRef),
      backgroundRef: replace(character.build.backgroundRef),
      levels: character.build.levels.map((level) => ({
        ...level,
        classRef: replace(level.classRef),
      })),
      subclasses: character.build.subclasses.map((subclass) => ({
        ...subclass,
        classVersionKey: replaceKey(subclass.classVersionKey),
        subclassRef: replace(subclass.subclassRef),
      })),
      decisions: character.build.decisions.map((decision) => {
        if (decision.type === "ability-score-increase") {
          return { ...decision, sourceRef: replace(decision.sourceRef) };
        }
        if (decision.type === "rule-selection") {
          return {
            ...decision,
            sourceRef: decision.sourceRef ? replace(decision.sourceRef) : null,
            selections: decision.selections.map(replace),
          };
        }
        if (decision.type === "magic-initiate-selection") {
          return {
            ...decision,
            sourceRef: replace(decision.sourceRef),
            cantripVersionKeys: decision.cantripVersionKeys.map(replaceKey),
            levelOneSpellVersionKey: replaceKey(decision.levelOneSpellVersionKey),
          };
        }
        if (decision.type === "tiefling-legacy-selection") {
          return {
            ...decision,
            sourceRef: replace(decision.sourceRef),
            spellVersionKeys: decision.spellVersionKeys.map(replaceKey),
          };
        }
        if (decision.type === "elf-lineage-selection") {
          return {
            ...decision,
            sourceRef: replace(decision.sourceRef),
            spellVersionKeys: decision.spellVersionKeys.map(replaceKey),
          };
        }
        if (decision.type === "species-spell-bundle-selection") {
          return {
            ...decision,
            sourceRef: replace(decision.sourceRef),
            spellVersionKeys: decision.spellVersionKeys.map(replaceKey),
          };
        }
        return {
          ...decision,
          classVersionKey: replaceKey(decision.classVersionKey),
          sourceRef: decision.sourceRef ? replace(decision.sourceRef) : null,
          spellVersionKeys: decision.spellVersionKeys.map(replaceKey),
        };
      }),
      spells: character.build.spells.map((spell) => ({
        ...spell,
        spellRef: replace(spell.spellRef),
        classVersionKey: spell.classVersionKey === null ? null : replaceKey(spell.classVersionKey),
        grantSourceRef: spell.grantSourceRef ? replace(spell.grantSourceRef) : null,
      })),
      overrides: character.build.overrides.map((override) => {
        if (override.type === "rule-grant") {
          return { ...override, grantedRef: replace(override.grantedRef) };
        }
        if (override.type === "rule-suppression") {
          return { ...override, suppressedVersionKey: replaceKey(override.suppressedVersionKey) };
        }
        return override;
      }),
    },
    hitPoints: {
      ...character.hitPoints,
      gains: character.hitPoints.gains.map((gain) => ({
        ...gain,
        bonuses: gain.bonuses.map((bonus) => ({
          ...bonus,
          sourceRef: bonus.sourceRef ? replace(bonus.sourceRef) : null,
        })),
      })),
    },
    liveState: {
      ...character.liveState,
      hitDice:
        character.liveState.hitDice.status === "tracked"
          ? {
              ...character.liveState.hitDice,
              pools: character.liveState.hitDice.pools.map((pool) => ({
                ...pool,
                classVersionKey: replaceKey(pool.classVersionKey),
              })),
            }
          : character.liveState.hitDice,
      resources: character.liveState.resources.map((resource) => ({
        ...resource,
        sourceVersionKey: resource.sourceVersionKey ? replaceKey(resource.sourceVersionKey) : null,
        additionalSourceVersionKeys: resource.additionalSourceVersionKeys.map(replaceKey),
      })),
      conditions: character.liveState.conditions.map((condition) => ({
        ...condition,
        conditionRef: condition.conditionRef ? replace(condition.conditionRef) : null,
      })),
    },
    items: character.items.map((item) => ({
      ...item,
      definitionRef: item.definitionRef ? replace(item.definitionRef) : null,
      charges: item.charges
        ? {
            ...item.charges,
            sourceVersionKey: item.charges.sourceVersionKey
              ? replaceKey(item.charges.sourceVersionKey)
              : null,
            additionalSourceVersionKeys: item.charges.additionalSourceVersionKeys.map(replaceKey),
          }
        : null,
    })),
    migrationBaseline: character.migrationBaseline
      ? {
          ...character.migrationBaseline,
          capabilities: character.migrationBaseline.capabilities.map((capability) => ({
            ...capability,
            sourceRef: capability.sourceRef ? replace(capability.sourceRef) : null,
          })),
        }
      : null,
    resolutions: input.resolutions ?? character.resolutions,
  });
}

export class V3ReconciliationPermissionError extends Error {
  constructor() {
    super("Only the character owner can resolve imported content versions");
    this.name = "V3ReconciliationPermissionError";
  }
}

export class V3ReconciliationConflictError extends Error {
  constructor(
    readonly expected: number,
    readonly actual: number,
  ) {
    super(`build revision conflict: expected ${expected}, found ${actual}`);
    this.name = "V3ReconciliationConflictError";
  }
}

export const RecordContentVersionDecisionInputSchema = z
  .object({
    mutationId: z.string().trim().min(1),
    actorUserId: z.string().trim().min(1),
    authority: MutationAuthoritySchema.optional(),
    expectedBuildRevision: z.number().int().min(1),
    importedVersionKey: z.string().trim().min(1),
    resolution: z.enum(["retain-imported", "accept-matched-version"]),
    reason: z.string().trim().min(1),
    catalogRevision: z.string().trim().min(1),
  })
  .strict();

export function recordContentVersionDecision(input: {
  character: CharacterAggregate;
  report: V3ReconciliationReport;
  decision: unknown;
}): {
  character: CharacterAggregate;
  auditEvent: {
    mutationId: string;
    actorUserId: string;
    characterId: string;
    type: "resolve-content-version";
    importedVersionKey: string;
    selectedVersionKey: string;
    resolution: "retain-imported" | "accept-matched-version";
    buildRevision: { before: number; after: number };
    authorization: AuthorizationAudit;
  };
} {
  const character = CharacterAggregateSchema.parse(input.character);
  const decision = RecordContentVersionDecisionInputSchema.parse(input.decision);
  let authorization: AuthorizationAudit;
  try {
    authorization = authorizeCharacterMutation({
      character,
      actorUserId: decision.actorUserId,
      authority: decision.authority,
    });
  } catch (error) {
    if (error instanceof CharacterMutationPermissionError) {
      throw new V3ReconciliationPermissionError();
    }
    throw error;
  }
  if (decision.expectedBuildRevision !== character.build.revision) {
    throw new V3ReconciliationConflictError(
      decision.expectedBuildRevision,
      character.build.revision,
    );
  }
  if (
    character.resolutions.some(
      (resolution) =>
        resolution.type === "content-version-decision" &&
        resolution.importedVersionKey === decision.importedVersionKey,
    )
  ) {
    throw new Error("This imported content version already has a recorded decision");
  }
  const entry = input.report.entries.find(
    (candidate) => candidate.imported.versionKey === decision.importedVersionKey,
  );
  if (!entry || !entry.requiresDecision) {
    throw new Error("Content version does not require an owner decision");
  }
  const selectedRef =
    decision.resolution === "retain-imported"
      ? entry.imported
      : entry.status === "legacy-match" && entry.canonical
        ? entry.canonical
        : null;
  if (!selectedRef) {
    throw new Error("No single matched catalog version is available to accept");
  }
  const resolution: CharacterAggregate["resolutions"][number] = {
    id: `resolution:content:${decision.mutationId}`,
    type: "content-version-decision",
    importedVersionKey: entry.imported.versionKey,
    resolution: decision.resolution,
    selectedVersionKey: selectedRef.versionKey,
    reason: decision.reason,
    decidedByUserId: decision.actorUserId,
  };
  const replacements = new Map<string, ExactRuleRef>();
  if (decision.resolution === "accept-matched-version") {
    replacements.set(entry.imported.versionKey, selectedRef);
  }
  const resolved = applyReferenceReplacements({
    character,
    replacements,
    catalogRevision: decision.catalogRevision,
    resolutions: [...character.resolutions, resolution],
  });
  return {
    character: resolved,
    auditEvent: {
      mutationId: decision.mutationId,
      actorUserId: decision.actorUserId,
      characterId: character.identity.id,
      type: "resolve-content-version",
      importedVersionKey: entry.imported.versionKey,
      selectedVersionKey: selectedRef.versionKey,
      resolution: decision.resolution,
      buildRevision: { before: character.build.revision, after: resolved.build.revision },
      authorization,
    },
  };
}
