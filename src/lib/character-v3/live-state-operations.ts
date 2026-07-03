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
  type CharacterLiveState,
} from "./schema";

const Identifier = z.string().trim().min(1).max(500);
const RecoveryTriggerSchema = z.enum(["short-rest", "long-rest", "dawn", "manual"]);

const LiveMutationBaseSchema = {
  mutationId: Identifier,
  actorUserId: Identifier,
  authority: MutationAuthoritySchema.optional(),
  expectedBuildRevision: z.number().int().min(1),
  expectedLiveStateRevision: z.number().int().min(0),
};

export const SpendCharacterResourceInputSchema = z
  .object({
    ...LiveMutationBaseSchema,
    resourceKey: Identifier,
    amount: z.number().int().min(1).max(1_000),
  })
  .strict();

export const RecoverCharacterResourcesInputSchema = z
  .object({
    ...LiveMutationBaseSchema,
    trigger: RecoveryTriggerSchema,
  })
  .strict();

export const TakeCharacterShortRestInputSchema = z
  .object({
    ...LiveMutationBaseSchema,
    hitDice: z.array(
      z.object({ classVersionKey: Identifier, amount: z.number().int().min(1) }).strict(),
    ),
    hitPointsRestored: z.number().int().min(0),
  })
  .strict();

export const TakeCharacterLongRestInputSchema = z.object(LiveMutationBaseSchema).strict();

export const SetCharacterInspirationInputSchema = z
  .object({
    ...LiveMutationBaseSchema,
    inspiration: z.boolean(),
  })
  .strict();

export const SetCharacterExhaustionInputSchema = z
  .object({
    ...LiveMutationBaseSchema,
    exhaustion: z.number().int().min(0).max(6),
  })
  .strict();

const ConditionInputSchema = z
  .object({
    id: Identifier,
    conditionRef: ExactRuleRefSchema.refine(
      (ref) => ref.kind === "condition",
      "Condition state must reference a condition rule",
    ).nullable(),
    label: Identifier,
    sourceLabel: Identifier.nullable(),
    appliedByUserId: Identifier.nullable(),
  })
  .strict();

export const AddCharacterConditionInputSchema = z
  .object({
    ...LiveMutationBaseSchema,
    condition: ConditionInputSchema,
  })
  .strict();

export const RemoveCharacterConditionInputSchema = z
  .object({
    ...LiveMutationBaseSchema,
    conditionId: Identifier,
  })
  .strict();

type ResourceBalanceChange = {
  resourceKey: string;
  before: number;
  after: number;
};

type LiveCondition = CharacterLiveState["conditions"][number];

type LiveStateAuditBase = {
  mutationId: string;
  actorUserId: string;
  characterId: string;
  buildRevision: { before: number; after: number };
  liveStateRevision: { before: number; after: number };
  authorization: AuthorizationAudit;
};

function authorizeAndCheckRevision(input: {
  character: CharacterAggregate;
  actorUserId: string;
  authority?: z.infer<typeof MutationAuthoritySchema>;
  expectedBuildRevision: number;
  expectedLiveStateRevision: number;
}): AuthorizationAudit {
  const authorization = authorizeCharacterMutation({
    character: input.character,
    actorUserId: input.actorUserId,
    authority: input.authority,
  });
  if (
    input.expectedBuildRevision !== input.character.build.revision ||
    input.expectedLiveStateRevision !== input.character.liveState.revision
  ) {
    throw new Error("character revision conflict while mutating live state");
  }
  return authorization;
}

function buildLiveStateMutationAudit(input: {
  mutationId: string;
  actorUserId: string;
  character: CharacterAggregate;
  updated: CharacterAggregate;
  authorization: AuthorizationAudit;
}): LiveStateAuditBase {
  return {
    mutationId: input.mutationId,
    actorUserId: input.actorUserId,
    characterId: input.character.identity.id,
    buildRevision: {
      before: input.character.build.revision,
      after: input.updated.build.revision,
    },
    liveStateRevision: {
      before: input.character.liveState.revision,
      after: input.updated.liveState.revision,
    },
    authorization: input.authorization,
  };
}

function updateLiveState(
  character: CharacterAggregate,
  liveState: Omit<CharacterLiveState, "revision">,
): CharacterAggregate {
  return CharacterAggregateSchema.parse({
    ...character,
    liveState: {
      ...liveState,
      revision: character.liveState.revision + 1,
    },
  });
}

function recoverResourcesForTrigger(
  resources: CharacterLiveState["resources"],
  trigger: "short-rest" | "long-rest",
) {
  return resources.map((resource) => {
    const rule = resource.recoveryRules.find((entry) => entry.trigger === trigger);
    if (!rule) return resource;
    const current =
      rule.restore.type === "all"
        ? resource.maximum
        : Math.min(resource.maximum, resource.current + rule.restore.amount);
    return current === resource.current ? resource : { ...resource, current };
  });
}

export function takeCharacterShortRest(rawCharacter: unknown, rawInput: unknown) {
  const character = CharacterAggregateSchema.parse(rawCharacter);
  const input = TakeCharacterShortRestInputSchema.parse(rawInput);
  const authorization = authorizeAndCheckRevision({ character, ...input });
  if (character.liveState.currentHp < 1) throw new Error("A Short Rest requires at least 1 Hit Point");
  if (character.liveState.hitDice.status !== "tracked") {
    throw new Error("Hit Point Dice must be tracked before taking a Short Rest");
  }
  const requested = new Map<string, number>();
  for (const expenditure of input.hitDice) {
    requested.set(
      expenditure.classVersionKey,
      (requested.get(expenditure.classVersionKey) ?? 0) + expenditure.amount,
    );
  }
  const pools = character.liveState.hitDice.pools.map((pool) => {
    const amount = requested.get(pool.classVersionKey) ?? 0;
    if (amount > pool.remaining) throw new Error(`Insufficient d${pool.die} Hit Point Dice`);
    requested.delete(pool.classVersionKey);
    return amount === 0 ? pool : { ...pool, remaining: pool.remaining - amount };
  });
  if (requested.size > 0) throw new Error("Short Rest references an unknown Hit Point Die pool");
  if (input.hitPointsRestored > 0 && input.hitDice.length === 0) {
    throw new Error("Short Rest healing requires spending at least one Hit Point Die");
  }
  const updated = updateLiveState(character, {
    ...character.liveState,
    currentHp: Math.min(
      character.hitPoints.baseline.maximum +
        character.hitPoints.gains.reduce((sum, gain) => sum + gain.total, 0),
      character.liveState.currentHp + input.hitPointsRestored,
    ),
    hitDice: { status: "tracked", pools },
    resources: recoverResourcesForTrigger(character.liveState.resources, "short-rest"),
  });
  return {
    character: updated,
    auditEvent: {
      ...buildLiveStateMutationAudit({
        mutationId: input.mutationId,
        actorUserId: input.actorUserId,
        character,
        updated,
        authorization,
      }),
      type: "take-character-short-rest" as const,
      hitDice: input.hitDice,
      hitPointsRestored: updated.liveState.currentHp - character.liveState.currentHp,
    },
  };
}

export function takeCharacterLongRest(rawCharacter: unknown, rawInput: unknown) {
  const character = CharacterAggregateSchema.parse(rawCharacter);
  const input = TakeCharacterLongRestInputSchema.parse(rawInput);
  const authorization = authorizeAndCheckRevision({ character, ...input });
  if (character.liveState.currentHp < 1) throw new Error("A Long Rest requires at least 1 Hit Point");
  const maximumHp =
    character.hitPoints.baseline.maximum +
    character.hitPoints.gains.reduce((sum, gain) => sum + gain.total, 0);
  const hitDice =
    character.liveState.hitDice.status === "tracked"
      ? {
          status: "tracked" as const,
          pools: character.liveState.hitDice.pools.map((pool) => ({
            ...pool,
            remaining: pool.maximum,
          })),
        }
      : character.liveState.hitDice;
  const updated = updateLiveState(character, {
    ...character.liveState,
    currentHp: maximumHp,
    temporaryHp: 0,
    exhaustion: Math.max(0, character.liveState.exhaustion - 1),
    deathSaves: { successes: 0, failures: 0, stabilized: false },
    hitDice,
    resources: recoverResourcesForTrigger(character.liveState.resources, "long-rest"),
  });
  return {
    character: updated,
    auditEvent: {
      ...buildLiveStateMutationAudit({
        mutationId: input.mutationId,
        actorUserId: input.actorUserId,
        character,
        updated,
        authorization,
      }),
      type: "take-character-long-rest" as const,
    },
  };
}

export function spendCharacterResource(
  rawCharacter: unknown,
  rawInput: unknown,
): {
  character: CharacterAggregate;
  auditEvent: LiveStateAuditBase & {
    type: "spend-character-resource";
    change: ResourceBalanceChange;
  };
} {
  const character = CharacterAggregateSchema.parse(rawCharacter);
  const input = SpendCharacterResourceInputSchema.parse(rawInput);
  const authorization = authorizeAndCheckRevision({ character, ...input });
  const resource = character.liveState.resources.find((entry) => entry.key === input.resourceKey);
  if (!resource) throw new Error(`Unknown character resource ${input.resourceKey}`);
  if (resource.current < input.amount)
    throw new Error(`Insufficient ${resource.label}: ${resource.current} remaining`);
  const after = resource.current - input.amount;
  const updated = updateLiveState(character, {
    ...character.liveState,
    resources: character.liveState.resources.map((entry) =>
      entry.key === resource.key ? { ...entry, current: after } : entry,
    ),
  });
  return {
    character: updated,
    auditEvent: {
      ...buildLiveStateMutationAudit({
        mutationId: input.mutationId,
        actorUserId: input.actorUserId,
        character,
        updated,
        authorization,
      }),
      type: "spend-character-resource",
      change: { resourceKey: resource.key, before: resource.current, after },
    },
  };
}

export function recoverCharacterResources(
  rawCharacter: unknown,
  rawInput: unknown,
): {
  character: CharacterAggregate;
  auditEvent: LiveStateAuditBase & {
    type: "recover-character-resources";
    trigger: z.infer<typeof RecoveryTriggerSchema>;
    changes: ResourceBalanceChange[];
  };
} {
  const character = CharacterAggregateSchema.parse(rawCharacter);
  const input = RecoverCharacterResourcesInputSchema.parse(rawInput);
  const authorization = authorizeAndCheckRevision({ character, ...input });
  const changes: ResourceBalanceChange[] = [];
  const resources = character.liveState.resources.map((resource) => {
    const rule = resource.recoveryRules.find((entry) => entry.trigger === input.trigger);
    if (!rule || resource.current === resource.maximum) return resource;
    const after =
      rule.restore.type === "all"
        ? resource.maximum
        : Math.min(resource.maximum, resource.current + rule.restore.amount);
    if (after === resource.current) return resource;
    changes.push({ resourceKey: resource.key, before: resource.current, after });
    return { ...resource, current: after };
  });
  const items = character.items.map((item) => {
    if (!item.charges) return item;
    const rule = item.charges.recoveryRules.find((entry) => entry.trigger === input.trigger);
    if (!rule || item.charges.current === item.charges.maximum) return item;
    const after =
      rule.restore.type === "all"
        ? item.charges.maximum
        : Math.min(item.charges.maximum, item.charges.current + rule.restore.amount);
    if (after === item.charges.current) return item;
    changes.push({ resourceKey: item.charges.key, before: item.charges.current, after });
    return { ...item, charges: { ...item.charges, current: after } };
  });
  if (changes.length === 0) throw new Error(`No depleted resources recover on ${input.trigger}`);
  const updated = CharacterAggregateSchema.parse({
    ...character,
    items,
    liveState: {
      ...character.liveState,
      revision: character.liveState.revision + 1,
      resources,
    },
  });
  return {
    character: updated,
    auditEvent: {
      ...buildLiveStateMutationAudit({
        mutationId: input.mutationId,
        actorUserId: input.actorUserId,
        character,
        updated,
        authorization,
      }),
      type: "recover-character-resources",
      trigger: input.trigger,
      changes,
    },
  };
}

export function setCharacterInspiration(
  rawCharacter: unknown,
  rawInput: unknown,
): {
  character: CharacterAggregate;
  auditEvent: LiveStateAuditBase & {
    type: "set-character-inspiration";
    change: { before: boolean; after: boolean };
  };
} {
  const character = CharacterAggregateSchema.parse(rawCharacter);
  const input = SetCharacterInspirationInputSchema.parse(rawInput);
  const authorization = authorizeAndCheckRevision({ character, ...input });
  if (character.liveState.inspiration === input.inspiration) {
    throw new Error(`Character inspiration is already ${input.inspiration}`);
  }
  const updated = updateLiveState(character, {
    ...character.liveState,
    inspiration: input.inspiration,
  });
  return {
    character: updated,
    auditEvent: {
      ...buildLiveStateMutationAudit({
        mutationId: input.mutationId,
        actorUserId: input.actorUserId,
        character,
        updated,
        authorization,
      }),
      type: "set-character-inspiration",
      change: { before: character.liveState.inspiration, after: updated.liveState.inspiration },
    },
  };
}

export function setCharacterExhaustion(
  rawCharacter: unknown,
  rawInput: unknown,
): {
  character: CharacterAggregate;
  auditEvent: LiveStateAuditBase & {
    type: "set-character-exhaustion";
    change: { before: number; after: number };
  };
} {
  const character = CharacterAggregateSchema.parse(rawCharacter);
  const input = SetCharacterExhaustionInputSchema.parse(rawInput);
  const authorization = authorizeAndCheckRevision({ character, ...input });
  if (character.liveState.exhaustion === input.exhaustion) {
    throw new Error(`Character exhaustion is already ${input.exhaustion}`);
  }
  const updated = updateLiveState(character, {
    ...character.liveState,
    exhaustion: input.exhaustion,
  });
  return {
    character: updated,
    auditEvent: {
      ...buildLiveStateMutationAudit({
        mutationId: input.mutationId,
        actorUserId: input.actorUserId,
        character,
        updated,
        authorization,
      }),
      type: "set-character-exhaustion",
      change: { before: character.liveState.exhaustion, after: updated.liveState.exhaustion },
    },
  };
}

export function addCharacterCondition(
  rawCharacter: unknown,
  rawInput: unknown,
): {
  character: CharacterAggregate;
  auditEvent: LiveStateAuditBase & {
    type: "add-character-condition";
    condition: LiveCondition;
  };
} {
  const character = CharacterAggregateSchema.parse(rawCharacter);
  const input = AddCharacterConditionInputSchema.parse(rawInput);
  const authorization = authorizeAndCheckRevision({ character, ...input });
  if (character.liveState.conditions.some((condition) => condition.id === input.condition.id)) {
    throw new Error(`Character condition ${input.condition.id} already exists`);
  }
  if (
    input.condition.conditionRef !== null &&
    character.liveState.conditions.some(
      (condition) =>
        condition.conditionRef?.versionKey === input.condition.conditionRef?.versionKey,
    )
  ) {
    throw new Error(`Character already has condition ${input.condition.conditionRef.name}`);
  }
  const updated = updateLiveState(character, {
    ...character.liveState,
    conditions: [...character.liveState.conditions, input.condition],
  });
  return {
    character: updated,
    auditEvent: {
      ...buildLiveStateMutationAudit({
        mutationId: input.mutationId,
        actorUserId: input.actorUserId,
        character,
        updated,
        authorization,
      }),
      type: "add-character-condition",
      condition: input.condition,
    },
  };
}

export function removeCharacterCondition(
  rawCharacter: unknown,
  rawInput: unknown,
): {
  character: CharacterAggregate;
  auditEvent: LiveStateAuditBase & {
    type: "remove-character-condition";
    condition: LiveCondition;
  };
} {
  const character = CharacterAggregateSchema.parse(rawCharacter);
  const input = RemoveCharacterConditionInputSchema.parse(rawInput);
  const authorization = authorizeAndCheckRevision({ character, ...input });
  const condition = character.liveState.conditions.find((entry) => entry.id === input.conditionId);
  if (!condition) throw new Error(`Character condition ${input.conditionId} does not exist`);
  const updated = updateLiveState(character, {
    ...character.liveState,
    conditions: character.liveState.conditions.filter((entry) => entry.id !== input.conditionId),
  });
  return {
    character: updated,
    auditEvent: {
      ...buildLiveStateMutationAudit({
        mutationId: input.mutationId,
        actorUserId: input.actorUserId,
        character,
        updated,
        authorization,
      }),
      type: "remove-character-condition",
      condition,
    },
  };
}
