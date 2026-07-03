import { z } from "zod";
import {
  authorizeCharacterMutation,
  MutationAuthoritySchema,
  type AuthorizationAudit,
} from "./authority";
import { CharacterAggregateSchema, ExactRuleRefSchema, type CharacterAggregate } from "./schema";

const Identifier = z.string().trim().min(1).max(500);

const ResourceCostSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("exact-resource"),
      resourceKey: Identifier,
      amount: z.number().int().min(1),
    })
    .strict(),
  z
    .object({
      type: z.literal("spell-slot"),
      minimumLevel: z.number().int().min(1).max(9),
    })
    .strict(),
]);

export const ResourceTransactionRuleSchema = z
  .object({
    id: Identifier,
    sourceFeatureRef: ExactRuleRefSchema.refine((ref) => ref.kind === "feature"),
    classVersionKey: Identifier,
    requiredSubclassVersionKey: Identifier.nullable().default(null),
    minimumClassLevel: z.number().int().min(1).max(20),
    cost: ResourceCostSchema,
    benefit: z
      .object({
        resourceKey: Identifier,
        restore: z.discriminatedUnion("type", [
          z.object({ type: z.literal("all") }).strict(),
          z.object({ type: z.literal("fixed"), amount: z.number().int().min(1) }).strict(),
        ]),
      })
      .strict(),
  })
  .strict();

export type ResourceTransactionRule = z.infer<typeof ResourceTransactionRuleSchema>;

export const MOB_RESOURCE_TRANSACTION_DEFINITIONS = [
  {
    id: "bard-glamour:beguiling-magic:regain-use",
    classId: "bard",
    subclassId: "bard-glamour",
    featureId: "bard-glamour-beguiling-magic-3",
    sourceId: "XPHB",
    minimumClassLevel: 3,
    cost: {
      type: "exact-resource",
      resourceKey: "action:class:bardic-inspiration",
      amount: 1,
    },
    benefit: {
      resourceKey: "action:class:beguiling-magic",
      restore: { type: "fixed", amount: 1 },
    },
  },
  {
    id: "bard-glamour:mantle-of-majesty:regain-use",
    classId: "bard",
    subclassId: "bard-glamour",
    featureId: "bard-glamour-mantle-of-majesty-6",
    sourceId: "XPHB",
    minimumClassLevel: 6,
    cost: { type: "spell-slot", minimumLevel: 3 },
    benefit: {
      resourceKey: "action:class:mantle-of-majesty",
      restore: { type: "fixed", amount: 1 },
    },
  },
] as const;

function spellSlotLevel(resourceKey: string): number | null {
  const match = /^spell-slot:([1-9])$/.exec(resourceKey);
  return match ? Number(match[1]) : null;
}

function assertCuratedRule(character: CharacterAggregate, rule: ResourceTransactionRule): void {
  const definition = MOB_RESOURCE_TRANSACTION_DEFINITIONS.find((entry) => entry.id === rule.id);
  if (!definition) throw new Error("Unknown resource transaction rule");
  const classRef = character.build.levels.find(
    (level) => level.classRef.versionKey === rule.classVersionKey,
  )?.classRef;
  if (!classRef || classRef.upstreamId !== definition.classId)
    throw new Error("Resource transaction class does not match its curated rule");
  const subclassRef = character.build.subclasses.find(
    (subclass) => subclass.subclassRef.versionKey === rule.requiredSubclassVersionKey,
  )?.subclassRef;
  if (!subclassRef || subclassRef.upstreamId !== definition.subclassId)
    throw new Error("Resource transaction exact subclass does not match its curated rule");
  if (
    rule.sourceFeatureRef.upstreamId !== definition.featureId ||
    rule.sourceFeatureRef.sourceId !== definition.sourceId ||
    rule.minimumClassLevel !== definition.minimumClassLevel ||
    JSON.stringify(rule.cost) !== JSON.stringify(definition.cost) ||
    JSON.stringify(rule.benefit) !== JSON.stringify(definition.benefit)
  ) {
    throw new Error("Resource transaction does not match the reviewed rule registry");
  }
}

export function applyResourceTransaction(input: {
  character: CharacterAggregate;
  rule: ResourceTransactionRule;
  selectedCostResourceKey: string;
  actorUserId: string;
  authority?: z.infer<typeof MutationAuthoritySchema>;
  expectedBuildRevision: number;
  expectedLiveStateRevision: number;
  mutationId: string;
}): {
  character: CharacterAggregate;
  auditEvent: {
    mutationId: string;
    actorUserId: string;
    characterId: string;
    type: "apply-resource-transaction";
    ruleId: string;
    sourceFeatureVersionKey: string;
    cost: { resourceKey: string; before: number; after: number };
    benefit: { resourceKey: string; before: number; after: number };
    buildRevision: { before: number; after: number };
    liveStateRevision: { before: number; after: number };
    authorization: AuthorizationAudit;
  };
} {
  const character = CharacterAggregateSchema.parse(input.character);
  const rule = ResourceTransactionRuleSchema.parse(input.rule);
  const authorization = authorizeCharacterMutation({
    character,
    actorUserId: input.actorUserId,
    authority: input.authority,
  });
  assertCuratedRule(character, rule);
  if (
    input.expectedBuildRevision !== character.build.revision ||
    input.expectedLiveStateRevision !== character.liveState.revision
  ) {
    throw new Error("character revision conflict while applying resource transaction");
  }
  if (rule.sourceFeatureRef.verification !== "verified")
    throw new Error("Resource transaction source feature must be verified");
  const classLevel = character.build.levels.filter(
    (level) => level.classRef.versionKey === rule.classVersionKey,
  ).length;
  if (classLevel < rule.minimumClassLevel)
    throw new Error(`Resource transaction requires class level ${rule.minimumClassLevel}`);
  if (
    rule.requiredSubclassVersionKey !== null &&
    !character.build.subclasses.some(
      (subclass) => subclass.subclassRef.versionKey === rule.requiredSubclassVersionKey,
    )
  ) {
    throw new Error("Resource transaction requires the exact subclass version");
  }
  if (
    rule.cost.type === "exact-resource" &&
    input.selectedCostResourceKey !== rule.cost.resourceKey
  ) {
    throw new Error("Selected cost resource does not match the transaction rule");
  }
  if (rule.cost.type === "spell-slot") {
    const level = spellSlotLevel(input.selectedCostResourceKey);
    if (level === null || level < rule.cost.minimumLevel)
      throw new Error(
        `Transaction requires a level ${rule.cost.minimumLevel} or higher spell slot`,
      );
  }
  if (input.selectedCostResourceKey === rule.benefit.resourceKey)
    throw new Error("A resource transaction cannot spend and restore the same resource");
  const cost = character.liveState.resources.find(
    (resource) => resource.key === input.selectedCostResourceKey,
  );
  const benefit = character.liveState.resources.find(
    (resource) => resource.key === rule.benefit.resourceKey,
  );
  if (!cost) throw new Error(`Unknown cost resource ${input.selectedCostResourceKey}`);
  if (!benefit) throw new Error(`Unknown benefit resource ${rule.benefit.resourceKey}`);
  if (cost.provenance !== "verified-rule")
    throw new Error("Transaction cost resource must have verified rule provenance");
  if (
    benefit.provenance !== "verified-rule" ||
    benefit.sourceVersionKey !== rule.sourceFeatureRef.versionKey
  ) {
    throw new Error("Transaction benefit resource must match the verified source feature");
  }
  const costAmount = rule.cost.type === "exact-resource" ? rule.cost.amount : 1;
  if (cost.current < costAmount) throw new Error("Insufficient resource to pay transaction cost");
  if (benefit.current >= benefit.maximum) throw new Error("Benefit resource is already full");
  const benefitAfter =
    rule.benefit.restore.type === "all"
      ? benefit.maximum
      : Math.min(benefit.maximum, benefit.current + rule.benefit.restore.amount);
  const costAfter = cost.current - costAmount;
  const updated = CharacterAggregateSchema.parse({
    ...character,
    liveState: {
      ...character.liveState,
      revision: character.liveState.revision + 1,
      resources: character.liveState.resources.map((resource) => {
        if (resource.key === cost.key) return { ...resource, current: costAfter };
        if (resource.key === benefit.key) return { ...resource, current: benefitAfter };
        return resource;
      }),
    },
  });
  return {
    character: updated,
    auditEvent: {
      mutationId: input.mutationId,
      actorUserId: input.actorUserId,
      characterId: character.identity.id,
      type: "apply-resource-transaction",
      ruleId: rule.id,
      sourceFeatureVersionKey: rule.sourceFeatureRef.versionKey,
      cost: { resourceKey: cost.key, before: cost.current, after: costAfter },
      benefit: { resourceKey: benefit.key, before: benefit.current, after: benefitAfter },
      buildRevision: { before: character.build.revision, after: updated.build.revision },
      liveStateRevision: {
        before: character.liveState.revision,
        after: updated.liveState.revision,
      },
      authorization,
    },
  };
}
