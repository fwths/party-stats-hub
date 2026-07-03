import { z } from "zod";
import {
  authorizeCharacterMutation,
  MutationAuthoritySchema,
  type AuthorizationAudit,
} from "./authority";
import { CharacterAggregateSchema, type CharacterAggregate } from "./schema";

const Identifier = z.string().trim().min(1).max(500);
const BaseInput = {
  mutationId: Identifier,
  actorUserId: Identifier,
  authority: MutationAuthoritySchema.optional(),
  expectedBuildRevision: z.number().int().min(1),
  expectedLiveStateRevision: z.number().int().min(0),
  companionId: Identifier,
};

export const MutateCompanionInputSchema = z.discriminatedUnion("operation", [
  z.object({ ...BaseInput, operation: z.literal("damage"), amount: z.number().int().min(1) }).strict(),
  z.object({ ...BaseInput, operation: z.literal("heal"), amount: z.number().int().min(1) }).strict(),
  z.object({ ...BaseInput, operation: z.literal("set-temporary-hp"), amount: z.number().int().min(0) }).strict(),
  z.object({ ...BaseInput, operation: z.literal("set-active"), active: z.boolean() }).strict(),
]);

type CompanionState = CharacterAggregate["companions"][number]["liveState"];

export function mutateCompanion(rawCharacter: unknown, rawInput: unknown) {
  const character = CharacterAggregateSchema.parse(rawCharacter);
  const input = MutateCompanionInputSchema.parse(rawInput);
  const authorization: AuthorizationAudit = authorizeCharacterMutation({
    character,
    actorUserId: input.actorUserId,
    authority: input.authority,
  });
  if (
    input.expectedBuildRevision !== character.build.revision ||
    input.expectedLiveStateRevision !== character.liveState.revision
  ) {
    throw new Error("character revision conflict while mutating a companion");
  }
  const index = character.companions.findIndex((companion) => companion.id === input.companionId);
  if (index < 0) throw new Error(`Companion ${input.companionId} does not exist`);
  const companion = character.companions[index];
  const before: CompanionState = { ...companion.liveState };
  const maximum = companion.definition.averageHitPoints;
  let after: CompanionState;
  switch (input.operation) {
    case "damage":
      after = {
        ...before,
        removedHitPoints: Math.min(maximum, before.removedHitPoints + input.amount),
      };
      break;
    case "heal":
      after = {
        ...before,
        removedHitPoints: Math.max(0, before.removedHitPoints - input.amount),
      };
      break;
    case "set-temporary-hp":
      after = { ...before, temporaryHitPoints: input.amount };
      break;
    case "set-active":
      after = { ...before, active: input.active };
      break;
  }
  const companions = [...character.companions];
  companions[index] = { ...companion, liveState: after };
  const updated = CharacterAggregateSchema.parse({
    ...character,
    companions,
    liveState: { ...character.liveState, revision: character.liveState.revision + 1 },
  });
  return {
    character: updated,
    auditEvent: {
      mutationId: input.mutationId,
      actorUserId: input.actorUserId,
      characterId: character.identity.id,
      type: `companion-${input.operation}`,
      companionId: input.companionId,
      before,
      after,
      buildRevision: { before: character.build.revision, after: updated.build.revision },
      liveStateRevision: {
        before: character.liveState.revision,
        after: updated.liveState.revision,
      },
      authorization,
    },
  };
}
