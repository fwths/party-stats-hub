import { z } from "zod";
import {
  authorizeCharacterMutation,
  MutationAuthoritySchema,
  type AuthorizationAudit,
} from "./authority";
import {
  CharacterAggregateSchema,
  ExactRuleRefSchema,
  type CharacterAggregate,
  type ExactRuleRef,
} from "./schema";

const Identifier = z.string().trim().min(1).max(500);

const MaximumFormulaSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("fixed"), value: z.number().int().min(1) }).strict(),
  z.object({ type: z.literal("proficiency-bonus") }).strict(),
]);

export const SpeciesResourceSemanticRecordSchema = z
  .object({
    resourceKey: Identifier,
    speciesVersionKey: Identifier,
    sourceFeatureRef: ExactRuleRefSchema.refine((ref) => ref.kind === "feature"),
    maximum: MaximumFormulaSchema,
    recovery: z.enum(["short-rest", "long-rest", "dawn", "manual"]),
    recoveryRules: z
      .array(
        z
          .object({
            trigger: z.enum(["short-rest", "long-rest", "dawn", "manual"]),
            restore: z.discriminatedUnion("type", [
              z.object({ type: z.literal("all") }).strict(),
              z.object({ type: z.literal("fixed"), amount: z.number().int().min(1) }).strict(),
            ]),
          })
          .strict(),
      )
      .default([]),
  })
  .strict();

export type SpeciesResourceSemanticRecord = z.infer<typeof SpeciesResourceSemanticRecordSchema>;

export const MOB_SPECIES_RESOURCE_DEFINITIONS = [
  {
    resourceKey: "action:race:hidden-step",
    speciesId: "firbolg",
    featureId: "firbolg-hidden-step",
    sourceId: "MPMM",
    maximum: { type: "proficiency-bonus" },
    recovery: "long-rest",
  },
  {
    resourceKey: "action:race:relentless-endurance",
    speciesId: "half-orc",
    featureId: "half-orc-relentless-endurance",
    sourceId: "PHB",
    maximum: { type: "fixed", value: 1 },
    recovery: "long-rest",
  },
] as const;

function proficiencyBonus(characterLevel: number): number {
  return Math.floor((characterLevel - 1) / 4) + 2;
}

function speciesIsAuthorized(character: CharacterAggregate, versionKey: string): boolean {
  if (
    character.build.speciesRef.versionKey === versionKey &&
    character.build.speciesRef.verification === "verified"
  ) {
    return true;
  }
  return character.resolutions.some(
    (resolution) =>
      resolution.type === "content-version-decision" &&
      resolution.importedVersionKey === versionKey &&
      resolution.selectedVersionKey === versionKey,
  );
}

export type SpeciesResourceSemanticReport = {
  characterId: string;
  buildRevision: number;
  liveStateRevision: number;
  matches: Array<{ resourceKey: string; sourceFeatureRef: ExactRuleRef; maximum: number }>;
  issues: Array<{
    code:
      | "species-not-present"
      | "species-version-not-approved"
      | "feature-not-authoritative"
      | "resource-missing"
      | "resource-maximum-mismatch"
      | "resource-recovery-mismatch";
    resourceKey: string;
    message: string;
  }>;
};

export function deriveSpeciesResourceSemanticReport(input: {
  character: CharacterAggregate;
  semantics: SpeciesResourceSemanticRecord[];
}): SpeciesResourceSemanticReport {
  const character = CharacterAggregateSchema.parse(input.character);
  const matches: SpeciesResourceSemanticReport["matches"] = [];
  const issues: SpeciesResourceSemanticReport["issues"] = [];
  const seen = new Set<string>();
  input.semantics
    .map((record) => SpeciesResourceSemanticRecordSchema.parse(record))
    .forEach((record) => {
      if (seen.has(record.resourceKey))
        throw new Error(`Duplicate species resource semantic ${record.resourceKey}`);
      seen.add(record.resourceKey);
      if (character.build.speciesRef.versionKey !== record.speciesVersionKey) {
        issues.push({
          code: "species-not-present",
          resourceKey: record.resourceKey,
          message: "Required exact species version is not present",
        });
        return;
      }
      if (!speciesIsAuthorized(character, record.speciesVersionKey)) {
        issues.push({
          code: "species-version-not-approved",
          resourceKey: record.resourceKey,
          message: "Imported species version requires an explicit content-version decision",
        });
        return;
      }
      if (
        record.sourceFeatureRef.verification !== "verified" &&
        !(
          ["legacy", "legacy-5e-compatible"].includes(record.sourceFeatureRef.compatibility) &&
          record.sourceFeatureRef.verification === "imported-unverified"
        )
      ) {
        issues.push({
          code: "feature-not-authoritative",
          resourceKey: record.resourceKey,
          message: `${record.sourceFeatureRef.name} is not verified`,
        });
        return;
      }
      const maximum =
        record.maximum.type === "fixed"
          ? record.maximum.value
          : proficiencyBonus(character.build.levels.length);
      const resource = character.liveState.resources.find(
        (entry) => entry.key === record.resourceKey,
      );
      if (!resource) {
        issues.push({
          code: "resource-missing",
          resourceKey: record.resourceKey,
          message: "Expected species resource is missing",
        });
        return;
      }
      if (resource.maximum !== maximum) {
        issues.push({
          code: "resource-maximum-mismatch",
          resourceKey: record.resourceKey,
          message: `Stored maximum ${resource.maximum} does not match ${maximum}`,
        });
        return;
      }
      if (resource.recovery !== record.recovery) {
        issues.push({
          code: "resource-recovery-mismatch",
          resourceKey: record.resourceKey,
          message: `Stored recovery ${resource.recovery} does not match ${record.recovery}`,
        });
        return;
      }
      matches.push({
        resourceKey: record.resourceKey,
        sourceFeatureRef: record.sourceFeatureRef,
        maximum,
      });
    });
  return {
    characterId: character.identity.id,
    buildRevision: character.build.revision,
    liveStateRevision: character.liveState.revision,
    matches,
    issues,
  };
}

export function reconcileSpeciesResources(input: {
  character: CharacterAggregate;
  semantics: SpeciesResourceSemanticRecord[];
  actorUserId: string;
  authority?: z.infer<typeof MutationAuthoritySchema>;
  expectedBuildRevision: number;
  expectedLiveStateRevision: number;
  mutationId: string;
}): {
  character: CharacterAggregate;
  report: SpeciesResourceSemanticReport;
  auditEvent: {
    mutationId: string;
    actorUserId: string;
    characterId: string;
    type: "reconcile-species-resources";
    resourceKeys: string[];
    sourceFeatureVersionKeys: string[];
    buildRevision: { before: number; after: number };
    liveStateRevision: { before: number; after: number };
    authorization: AuthorizationAudit;
  };
} {
  const character = CharacterAggregateSchema.parse(input.character);
  const authorization = authorizeCharacterMutation({
    character,
    actorUserId: input.actorUserId,
    authority: input.authority,
  });
  if (
    input.expectedBuildRevision !== character.build.revision ||
    input.expectedLiveStateRevision !== character.liveState.revision
  ) {
    throw new Error("character revision conflict while reconciling species resources");
  }
  const report = deriveSpeciesResourceSemanticReport(input);
  if (report.issues.length > 0 || report.matches.length === 0)
    throw new Error("Species resources are not ready to reconcile");
  const matches = new Map(report.matches.map((match) => [match.resourceKey, match]));
  const semantics = new Map(
    input.semantics
      .map((record) => SpeciesResourceSemanticRecordSchema.parse(record))
      .map((record) => [record.resourceKey, record]),
  );
  if (
    character.liveState.resources
      .filter((resource) => matches.has(resource.key))
      .every(
        (resource) =>
          resource.sourceVersionKey === matches.get(resource.key)!.sourceFeatureRef.versionKey,
      )
  ) {
    throw new Error("Species resources have already been reconciled");
  }
  const updated = CharacterAggregateSchema.parse({
    ...character,
    liveState: {
      ...character.liveState,
      revision: character.liveState.revision + 1,
      resources: character.liveState.resources.map((resource) => {
        const match = matches.get(resource.key);
        const semantic = semantics.get(resource.key);
        return match
          ? {
              ...resource,
              sourceVersionKey: match.sourceFeatureRef.versionKey,
              additionalSourceVersionKeys: [],
              provenance:
                match.sourceFeatureRef.verification === "verified"
                  ? ("verified-rule" as const)
                  : ("imported-unverified" as const),
              recoveryRules:
                semantic && semantic.recoveryRules.length > 0
                  ? semantic.recoveryRules
                  : [{ trigger: resource.recovery, restore: { type: "all" as const } }],
            }
          : resource;
      }),
    },
  });
  return {
    character: updated,
    report,
    auditEvent: {
      mutationId: input.mutationId,
      actorUserId: input.actorUserId,
      characterId: character.identity.id,
      type: "reconcile-species-resources",
      resourceKeys: [...matches.keys()],
      sourceFeatureVersionKeys: [
        ...new Set(report.matches.map((match) => match.sourceFeatureRef.versionKey)),
      ],
      buildRevision: { before: character.build.revision, after: updated.build.revision },
      liveStateRevision: {
        before: character.liveState.revision,
        after: updated.liveState.revision,
      },
      authorization,
    },
  };
}
