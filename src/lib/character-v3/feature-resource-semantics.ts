import { z } from "zod";
import {
  authorizeCharacterMutation,
  MutationAuthoritySchema,
  type AuthorizationAudit,
} from "./authority";
import { hasAuthoritativeAbilityScores } from "./current-sheet-authority";
import {
  CharacterAggregateSchema,
  CharacterResourceSchema,
  ExactRuleRefSchema,
  type CharacterAggregate,
  type ExactRuleRef,
} from "./schema";
import { createRuleFamilyKey, createRuleVersionKey } from "../character-v2/rule-identity";

const Identifier = z.string().trim().min(1).max(500);
const AbilitySchema = z.enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"]);

const MaximumFormulaSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("fixed"), value: z.number().int().min(1) }).strict(),
  z
    .object({
      type: z.literal("ability-modifier"),
      ability: AbilitySchema,
      minimum: z.number().int().min(1),
    })
    .strict(),
  z.object({ type: z.literal("class-level") }).strict(),
  z
    .object({
      type: z.literal("level-table"),
      entries: z
        .array(
          z
            .object({
              minimumLevel: z.number().int().min(1).max(20),
              value: z.number().int().min(1),
            })
            .strict(),
        )
        .min(1),
    })
    .strict(),
]);

export const FeatureResourceSemanticRecordSchema = z
  .object({
    resourceKey: Identifier,
    classVersionKey: Identifier,
    requiredSubclassVersionKey: Identifier.nullable().default(null),
    minimumClassLevel: z.number().int().min(1).max(20),
    sourceFeatureRef: ExactRuleRefSchema.refine((ref) => ref.kind === "feature"),
    modifierFeatureRefs: z
      .array(ExactRuleRefSchema.refine((ref) => ref.kind === "feature"))
      .default([]),
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

export type FeatureResourceSemanticRecord = z.infer<typeof FeatureResourceSemanticRecordSchema>;

export const CORE_MOB_FEATURE_RESOURCE_DEFINITIONS = [
  {
    resourceKey: "action:class:tinker-s-magic",
    classId: "artificer",
    featureId: "artificer-tinkers-magic-1",
    sourceId: "EFA",
    minimumClassLevel: 1,
    maximum: { type: "ability-modifier", ability: "INT", minimum: 1 },
    recovery: "long-rest",
  },
  {
    resourceKey: "action:class:drain-magic-item",
    classId: "artificer",
    featureId: "artificer-magic-item-tinker-6",
    sourceId: "EFA",
    minimumClassLevel: 6,
    maximum: { type: "fixed", value: 1 },
    recovery: "long-rest",
  },
  {
    resourceKey: "action:class:transmute-magic-item",
    classId: "artificer",
    featureId: "artificer-magic-item-tinker-6",
    sourceId: "EFA",
    minimumClassLevel: 6,
    maximum: { type: "fixed", value: 1 },
    recovery: "long-rest",
  },
  {
    resourceKey: "action:class:flash-of-genius",
    classId: "artificer",
    featureId: "artificer-flash-of-genius-7",
    sourceId: "EFA",
    minimumClassLevel: 7,
    maximum: { type: "ability-modifier", ability: "INT", minimum: 1 },
    recovery: "long-rest",
  },
  {
    resourceKey: "action:class:innate-sorcery",
    classId: "sorcerer",
    featureId: "sorcerer-innate-sorcery-1",
    sourceId: "XPHB",
    minimumClassLevel: 1,
    maximum: { type: "fixed", value: 2 },
    recovery: "long-rest",
  },
  {
    resourceKey: "action:class:font-of-magic-sorcery-points",
    classId: "sorcerer",
    featureId: "sorcerer-font-of-magic-2",
    sourceId: "XPHB",
    minimumClassLevel: 2,
    maximum: { type: "class-level" },
    recovery: "long-rest",
  },
  {
    resourceKey: "action:class:sorcerous-restoration",
    classId: "sorcerer",
    featureId: "sorcerer-sorcerous-restoration-5",
    sourceId: "XPHB",
    minimumClassLevel: 5,
    maximum: { type: "fixed", value: 1 },
    recovery: "long-rest",
  },
  {
    resourceKey: "action:class:rage-enter",
    classId: "barbarian",
    featureId: "barbarian-rage-1",
    sourceId: "XPHB",
    minimumClassLevel: 1,
    maximum: {
      type: "level-table",
      entries: [
        { minimumLevel: 1, value: 2 },
        { minimumLevel: 3, value: 3 },
        { minimumLevel: 6, value: 4 },
        { minimumLevel: 12, value: 5 },
        { minimumLevel: 17, value: 6 },
      ],
    },
    recovery: "long-rest",
    recoveryRules: [
      { trigger: "short-rest", restore: { type: "fixed", amount: 1 } },
      { trigger: "long-rest", restore: { type: "all" } },
    ],
  },
  {
    resourceKey: "action:class:wild-shape",
    classId: "druid",
    featureId: "druid-wild-shape-2",
    sourceId: "XPHB",
    minimumClassLevel: 2,
    maximum: {
      type: "level-table",
      entries: [
        { minimumLevel: 2, value: 2 },
        { minimumLevel: 6, value: 3 },
        { minimumLevel: 17, value: 4 },
      ],
    },
    recovery: "long-rest",
    recoveryRules: [
      { trigger: "short-rest", restore: { type: "fixed", amount: 1 } },
      { trigger: "long-rest", restore: { type: "all" } },
    ],
  },
  {
    resourceKey: "action:class:cosmic-omen-weal",
    classId: "druid",
    subclassId: "druid-stars",
    featureId: "druid-stars-cosmic-omen-6",
    sourceId: "XPHB",
    minimumClassLevel: 6,
    maximum: { type: "ability-modifier", ability: "WIS", minimum: 1 },
    recovery: "long-rest",
  },
  {
    resourceKey: "action:class:bardic-inspiration",
    classId: "bard",
    featureId: "bard-bardic-inspiration-1",
    modifierFeatureIds: ["bard-font-of-inspiration-5"],
    sourceId: "XPHB",
    minimumClassLevel: 5,
    maximum: { type: "ability-modifier", ability: "CHA", minimum: 1 },
    recovery: "short-rest",
    recoveryRules: [
      { trigger: "short-rest", restore: { type: "all" } },
      { trigger: "long-rest", restore: { type: "all" } },
    ],
  },
  {
    resourceKey: "action:class:beguiling-magic",
    classId: "bard",
    subclassId: "bard-glamour",
    featureId: "bard-glamour-beguiling-magic-3",
    sourceId: "XPHB",
    minimumClassLevel: 3,
    maximum: { type: "fixed", value: 1 },
    recovery: "long-rest",
  },
  {
    resourceKey: "action:class:mantle-of-majesty",
    classId: "bard",
    subclassId: "bard-glamour",
    featureId: "bard-glamour-mantle-of-majesty-6",
    sourceId: "XPHB",
    minimumClassLevel: 6,
    maximum: { type: "fixed", value: 1 },
    recovery: "long-rest",
  },
] as const;

export const CORE_SUPPORTED_RESOURCE_PROGRESSION_LABELS = [
  "Rages",
  "Rage Uses",
  "Sorcery Points",
  "Wild Shape Uses",
  "Bardic Inspiration",
] as const;

function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function expectedFeatureResourceMaximum(
  character: CharacterAggregate,
  record: FeatureResourceSemanticRecord,
  classLevel: number,
): number | null {
  if (record.maximum.type === "fixed") return record.maximum.value;
  if (record.maximum.type === "class-level") return classLevel;
  if (record.maximum.type === "level-table") {
    return (
      [...record.maximum.entries]
        .sort((left, right) => left.minimumLevel - right.minimumLevel)
        .filter((entry) => entry.minimumLevel <= classLevel)
        .at(-1)?.value ?? null
    );
  }
  if (!hasAuthoritativeAbilityScores(character)) {
    return null;
  }
  return Math.max(
    record.maximum.minimum,
    abilityModifier(character.build.abilityBasis.baseScores[record.maximum.ability]),
  );
}

export type FeatureResourceSemanticReport = {
  characterId: string;
  buildRevision: number;
  liveStateRevision: number;
  matches: Array<{ resourceKey: string; sourceFeatureRef: ExactRuleRef; maximum: number }>;
  issues: Array<{
    code:
      | "feature-not-authoritative"
      | "class-not-present"
      | "class-level-too-low"
      | "subclass-not-present"
      | "ability-basis-unverified"
      | "resource-missing"
      | "resource-maximum-mismatch"
      | "resource-recovery-mismatch";
    resourceKey: string;
    message: string;
  }>;
};

export function deriveFeatureResourceSemanticReport(input: {
  character: CharacterAggregate;
  semantics: FeatureResourceSemanticRecord[];
}): FeatureResourceSemanticReport {
  const character = CharacterAggregateSchema.parse(input.character);
  const classCounts = new Map<string, number>();
  character.build.levels.forEach((level) =>
    classCounts.set(
      level.classRef.versionKey,
      (classCounts.get(level.classRef.versionKey) ?? 0) + 1,
    ),
  );
  const matches: FeatureResourceSemanticReport["matches"] = [];
  const issues: FeatureResourceSemanticReport["issues"] = [];
  const seen = new Set<string>();
  input.semantics
    .map((record) => FeatureResourceSemanticRecordSchema.parse(record))
    .forEach((record) => {
      if (seen.has(record.resourceKey))
        throw new Error(`Duplicate feature resource semantic ${record.resourceKey}`);
      seen.add(record.resourceKey);
      if (record.sourceFeatureRef.verification !== "verified") {
        issues.push({
          code: "feature-not-authoritative",
          resourceKey: record.resourceKey,
          message: `${record.sourceFeatureRef.name} is not verified`,
        });
        return;
      }
      const classLevel = classCounts.get(record.classVersionKey);
      if (classLevel === undefined) {
        issues.push({
          code: "class-not-present",
          resourceKey: record.resourceKey,
          message: "Required exact class is not present",
        });
        return;
      }
      if (classLevel < record.minimumClassLevel) {
        issues.push({
          code: "class-level-too-low",
          resourceKey: record.resourceKey,
          message: `Requires class level ${record.minimumClassLevel}`,
        });
        return;
      }
      if (
        record.requiredSubclassVersionKey !== null &&
        !character.build.subclasses.some(
          (subclass) => subclass.subclassRef.versionKey === record.requiredSubclassVersionKey,
        )
      ) {
        issues.push({
          code: "subclass-not-present",
          resourceKey: record.resourceKey,
          message: "Required exact subclass is not present",
        });
        return;
      }
      const maximum = expectedFeatureResourceMaximum(character, record, classLevel);
      if (maximum === null) {
        issues.push({
          code: "ability-basis-unverified",
          resourceKey: record.resourceKey,
          message:
            "Ability-derived uses require verified ability scores or DDB-confirmed current-sheet truth",
        });
        return;
      }
      const resource = character.liveState.resources.find(
        (entry) => entry.key === record.resourceKey,
      );
      if (!resource) {
        issues.push({
          code: "resource-missing",
          resourceKey: record.resourceKey,
          message: "Expected feature resource is missing",
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

function featureName(featureId: string): string {
  return featureId
    .replace(/-\d+$/, "")
    .split("-")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function curatedFeatureRef(featureId: string, sourceId: string): ExactRuleRef {
  const compatibility = sourceId === "XPHB" ? "core-2024" : "current-2024-compatible";
  return ExactRuleRefSchema.parse({
    kind: "feature",
    familyKey: createRuleFamilyKey("feature", featureName(featureId)),
    versionKey: createRuleVersionKey({
      kind: "feature",
      sourceId,
      upstreamId: featureId,
      contentRevision: "2024",
    }),
    name: featureName(featureId),
    rulesGeneration: "2024",
    sourceId,
    upstreamId: featureId,
    contentRevision: "2024",
    compatibility,
    verification: "verified",
  });
}

export function buildCoreFeatureResourceSemantics(input: {
  classRef: ExactRuleRef;
  subclassRefs?: ExactRuleRef[];
}): FeatureResourceSemanticRecord[] {
  const subclasses = input.subclassRefs ?? [];
  return CORE_MOB_FEATURE_RESOURCE_DEFINITIONS.filter(
    (definition) =>
      definition.classId === input.classRef.upstreamId &&
      definition.sourceId === input.classRef.sourceId,
  ).map((definition) =>
    FeatureResourceSemanticRecordSchema.parse({
      resourceKey: definition.resourceKey,
      classVersionKey: input.classRef.versionKey,
      requiredSubclassVersionKey:
        "subclassId" in definition
          ? (subclasses.find((subclass) => subclass.upstreamId === definition.subclassId)
              ?.versionKey ?? `missing-subclass:${definition.subclassId}`)
          : null,
      minimumClassLevel: definition.minimumClassLevel,
      sourceFeatureRef: curatedFeatureRef(definition.featureId, definition.sourceId),
      modifierFeatureRefs:
        "modifierFeatureIds" in definition
          ? definition.modifierFeatureIds.map((featureId) =>
              curatedFeatureRef(featureId, definition.sourceId),
            )
          : [],
      maximum: definition.maximum,
      recovery: definition.recovery,
      recoveryRules: "recoveryRules" in definition ? definition.recoveryRules : [],
    }),
  );
}

export function deriveLevelUpFeatureResourceUpdates(input: {
  character: CharacterAggregate;
  classVersionKey: string;
  nextClassLevel: number;
  selectedSubclassVersionKey: string | null;
  semantics: FeatureResourceSemanticRecord[];
}): { updates: Array<z.infer<typeof CharacterResourceSchema>>; blockers: string[] } {
  const character = CharacterAggregateSchema.parse(input.character);
  const updates: Array<z.infer<typeof CharacterResourceSchema>> = [];
  const blockers: string[] = [];
  for (const rawRecord of input.semantics) {
    const record = FeatureResourceSemanticRecordSchema.parse(rawRecord);
    if (
      record.classVersionKey !== input.classVersionKey ||
      record.minimumClassLevel > input.nextClassLevel ||
      (record.requiredSubclassVersionKey !== null &&
        record.requiredSubclassVersionKey !== input.selectedSubclassVersionKey)
    ) {
      continue;
    }
    const maximum = expectedFeatureResourceMaximum(character, record, input.nextClassLevel);
    if (maximum === null) {
      blockers.push(`${record.sourceFeatureRef.name} requires authoritative ability scores`);
      continue;
    }
    const existing = character.liveState.resources.find(
      (resource) => resource.key === record.resourceKey,
    );
    const recoveryRules =
      record.recoveryRules.length > 0
        ? record.recoveryRules
        : [{ trigger: record.recovery, restore: { type: "all" as const } }];
    const expended = existing ? existing.maximum - existing.current : 0;
    const resource = CharacterResourceSchema.parse({
      key: record.resourceKey,
      sourceVersionKey: record.sourceFeatureRef.versionKey,
      additionalSourceVersionKeys: record.modifierFeatureRefs.map((ref) => ref.versionKey),
      provenance: "verified-rule",
      label: existing?.label ?? record.sourceFeatureRef.name,
      current: Math.max(0, maximum - expended),
      maximum,
      recovery: record.recovery,
      recoveryRules,
    });
    if (!existing || JSON.stringify(existing) !== JSON.stringify(resource)) updates.push(resource);
  }
  return { updates, blockers };
}

export function reconcileFeatureResources(input: {
  character: CharacterAggregate;
  semantics: FeatureResourceSemanticRecord[];
  actorUserId: string;
  authority?: z.infer<typeof MutationAuthoritySchema>;
  expectedBuildRevision: number;
  expectedLiveStateRevision: number;
  mutationId: string;
}): {
  character: CharacterAggregate;
  report: FeatureResourceSemanticReport;
  auditEvent: {
    mutationId: string;
    actorUserId: string;
    characterId: string;
    type: "reconcile-feature-resources";
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
    throw new Error("character revision conflict while reconciling feature resources");
  }
  const report = deriveFeatureResourceSemanticReport(input);
  if (report.issues.length > 0 || report.matches.length === 0)
    throw new Error("Feature resources are not ready to reconcile");
  const matches = new Map(report.matches.map((match) => [match.resourceKey, match]));
  const semantics = new Map(
    input.semantics
      .map((record) => FeatureResourceSemanticRecordSchema.parse(record))
      .map((record) => [record.resourceKey, record]),
  );
  if (
    character.liveState.resources
      .filter((resource) => matches.has(resource.key))
      .every(
        (resource) =>
          resource.provenance === "verified-rule" &&
          resource.sourceVersionKey === matches.get(resource.key)!.sourceFeatureRef.versionKey,
      )
  ) {
    throw new Error("Feature resources have already been reconciled");
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
              additionalSourceVersionKeys:
                semantic?.modifierFeatureRefs.map((ref) => ref.versionKey) ?? [],
              provenance: "verified-rule" as const,
              recoveryRules:
                semantic && semantic.recoveryRules.length > 0
                  ? semantic.recoveryRules
                  : [
                      {
                        trigger: resource.recovery,
                        restore: { type: "all" as const },
                      },
                    ],
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
      type: "reconcile-feature-resources",
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
