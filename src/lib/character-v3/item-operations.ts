import { z } from "zod";
import {
  authorizeCharacterMutation,
  MutationAuthoritySchema,
  type AuthorizationAudit,
} from "./authority";
import { CharacterAggregateSchema, CharacterItemSchema, type CharacterAggregate } from "./schema";

const Identifier = z.string().trim().min(1).max(500);
const BaseInput = {
  mutationId: Identifier,
  actorUserId: Identifier,
  authority: MutationAuthoritySchema.optional(),
  expectedBuildRevision: z.number().int().min(1),
  expectedLiveStateRevision: z.number().int().min(0),
  itemId: Identifier,
};

export const MutateItemInputSchema = z.discriminatedUnion("operation", [
  z
    .object({
      mutationId: BaseInput.mutationId,
      actorUserId: BaseInput.actorUserId,
      authority: BaseInput.authority,
      expectedBuildRevision: BaseInput.expectedBuildRevision,
      expectedLiveStateRevision: BaseInput.expectedLiveStateRevision,
      operation: z.literal("add-item"),
      item: CharacterItemSchema,
    })
    .strict(),
  z.object({ ...BaseInput, operation: z.literal("set-equipped"), equipped: z.boolean() }).strict(),
  z.object({ ...BaseInput, operation: z.literal("set-attuned"), attuned: z.boolean() }).strict(),
  z.object({ ...BaseInput, operation: z.literal("set-quantity"), quantity: z.number().int().min(1) }).strict(),
  z.object({ ...BaseInput, operation: z.literal("remove-item") }).strict(),
]);

type ItemSnapshot = CharacterAggregate["items"][number] | null;

export function maximumAttunedItems(character: CharacterAggregate): number {
  return character.build.attunementCapacity.replacements.reduce(
    (maximum, replacement) => Math.max(maximum, replacement.maximum),
    character.build.attunementCapacity.baseline.maximum,
  );
}

export function mutateItem(rawCharacter: unknown, rawInput: unknown) {
  const character = CharacterAggregateSchema.parse(rawCharacter);
  const input = MutateItemInputSchema.parse(rawInput);
  const authorization: AuthorizationAudit = authorizeCharacterMutation({
    character,
    actorUserId: input.actorUserId,
    authority: input.authority,
  });
  if (
    input.expectedBuildRevision !== character.build.revision ||
    input.expectedLiveStateRevision !== character.liveState.revision
  ) {
    throw new Error("character revision conflict while mutating inventory");
  }
  if (input.operation === "add-item") {
    if (character.items.some((item) => item.id === input.item.id)) {
      throw new Error(`Item ${input.item.id} already exists`);
    }
    if (
      input.item.containerId !== null &&
      !character.items.some((item) => item.id === input.item.containerId)
    ) {
      throw new Error(`Container ${input.item.containerId} does not exist`);
    }
    const updated = CharacterAggregateSchema.parse({
      ...character,
      items: [...character.items, input.item],
      liveState: { ...character.liveState, revision: character.liveState.revision + 1 },
    });
    return {
      character: updated,
      auditEvent: {
        mutationId: input.mutationId,
        actorUserId: input.actorUserId,
        characterId: character.identity.id,
        type: "item-add-item",
        itemId: input.item.id,
        before: null,
        after: structuredClone(input.item),
        buildRevision: { before: character.build.revision, after: updated.build.revision },
        liveStateRevision: {
          before: character.liveState.revision,
          after: updated.liveState.revision,
        },
        authorization,
      },
    };
  }
  const index = character.items.findIndex((item) => item.id === input.itemId);
  if (index < 0) throw new Error(`Item ${input.itemId} does not exist`);
  const before: ItemSnapshot = structuredClone(character.items[index]);
  const items = [...character.items];
  if (input.operation === "remove-item") {
    if (items.some((item) => item.containerId === input.itemId)) {
      throw new Error("A non-empty container cannot be removed");
    }
    items.splice(index, 1);
  } else if (input.operation === "set-equipped") {
    items[index] = { ...items[index], equipped: input.equipped };
  } else if (input.operation === "set-attuned") {
    if (
      input.attuned &&
      items[index].attunementRequirement.status === "not-required" &&
      items[index].attunementRequirement.provenance === "verified-rule"
    ) {
      throw new Error(`${items[index].name} does not require attunement`);
    }
    if (
      input.attuned &&
      !items[index].attuned &&
      items.filter((item) => item.attuned).length >= maximumAttunedItems(character)
    ) {
      throw new Error(`Attunement capacity of ${maximumAttunedItems(character)} has been reached`);
    }
    items[index] = { ...items[index], attuned: input.attuned };
  } else {
    items[index] = { ...items[index], quantity: input.quantity };
  }
  const updated = CharacterAggregateSchema.parse({
    ...character,
    items,
    liveState: { ...character.liveState, revision: character.liveState.revision + 1 },
  });
  const after: ItemSnapshot =
    input.operation === "remove-item" ? null : structuredClone(updated.items[index]);
  return {
    character: updated,
    auditEvent: {
      mutationId: input.mutationId,
      actorUserId: input.actorUserId,
      characterId: character.identity.id,
      type: `item-${input.operation}`,
      itemId: input.itemId,
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
