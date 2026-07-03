import { z } from "zod";
import {
  authorizeCharacterMutation,
  MutationAuthoritySchema,
  type AuthorizationAudit,
} from "./authority";
import { CharacterAggregateSchema, type CharacterAggregate } from "./schema";

const Identifier = z.string().trim().min(1).max(500);

export const ReconcileSendingStonesChargesInputSchema = z
  .object({
    character: z.unknown(),
    actorUserId: Identifier,
    authority: MutationAuthoritySchema.optional(),
    expectedBuildRevision: z.number().int().min(1),
    expectedLiveStateRevision: z.number().int().min(0),
    mutationId: Identifier,
  })
  .strict();

export function reconcileSendingStonesCharges(rawInput: unknown): {
  character: CharacterAggregate;
  auditEvent: {
    mutationId: string;
    actorUserId: string;
    characterId: string;
    type: "reconcile-sending-stones-charges";
    itemId: string;
    itemDefinitionVersionKey: string;
    buildRevision: { before: number; after: number };
    liveStateRevision: { before: number; after: number };
    authorization: AuthorizationAudit;
  };
} {
  const input = ReconcileSendingStonesChargesInputSchema.parse(rawInput);
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
    throw new Error("character revision conflict while reconciling Sending Stones charges");
  }
  const itemIndex = character.items.findIndex((item) => item.name === "Sending Stones");
  if (itemIndex < 0) throw new Error("Sending Stones item is not present");
  const item = character.items[itemIndex];
  if (item.definitionRef === null) {
    throw new Error("Sending Stones require an exact item definition before charge semantics");
  }
  if (item.details?.magic !== true) {
    throw new Error("Sending Stones charge semantics require a magic item snapshot");
  }
  const expended = item.charges ? Math.max(0, item.charges.maximum - item.charges.current) : 0;
  const updatedItems = character.items.map((entry, index) =>
    index === itemIndex
      ? {
          ...entry,
          charges: {
            key: `item:${entry.id}:sending-stones-charges`,
            label: "Sending Stones Uses",
            current: Math.max(0, 1 - expended),
            maximum: 1,
            recovery: "dawn" as const,
            sourceVersionKey: item.definitionRef!.versionKey,
            provenance: "verified-rule" as const,
            recoveryRules: [{ trigger: "dawn" as const, restore: { type: "all" as const } }],
          },
        }
      : entry,
  );
  const updated = CharacterAggregateSchema.parse({
    ...character,
    items: updatedItems,
    liveState: { ...character.liveState, revision: character.liveState.revision + 1 },
  });
  return {
    character: updated,
    auditEvent: {
      mutationId: input.mutationId,
      actorUserId: input.actorUserId,
      characterId: character.identity.id,
      type: "reconcile-sending-stones-charges",
      itemId: item.id,
      itemDefinitionVersionKey: item.definitionRef.versionKey,
      buildRevision: { before: character.build.revision, after: updated.build.revision },
      liveStateRevision: {
        before: character.liveState.revision,
        after: updated.liveState.revision,
      },
      authorization,
    },
  };
}
