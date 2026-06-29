import { z } from "zod";
import {
  CharacterBuildSchema,
  CharacterIdentitySchema,
  CharacterLiveStateSchema,
  RuleRefSchema,
  type CharacterBuild,
  type CharacterLiveState,
} from "./schema";

const StateCommandBase = {
  mutationId: z.string().trim().min(1),
  actorUserId: z.string().trim().min(1),
  expectedRevision: z.number().int().min(0),
};

export const CharacterStateCommandSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...StateCommandBase,
      type: z.literal("adjust-hit-points"),
      delta: z.number().int().min(-1_000).max(1_000),
    })
    .strict(),
  z
    .object({
      ...StateCommandBase,
      type: z.literal("set-temporary-hit-points"),
      value: z.number().int().min(0).max(1_000),
    })
    .strict(),
  z
    .object({
      ...StateCommandBase,
      type: z.literal("spend-resource"),
      resourceKey: z.string().trim().min(1),
      amount: z.number().int().min(1).max(1_000),
    })
    .strict(),
]);

export type CharacterStateCommand = z.infer<typeof CharacterStateCommandSchema>;

export type CharacterStateEvent = {
  mutationId: string;
  actorUserId: string;
  characterId: string;
  type: CharacterStateCommand["type"];
  fromRevision: number;
  toRevision: number;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
};

export class CharacterStateConflictError extends Error {
  constructor(expectedRevision: number, actualRevision: number) {
    super(
      `Character state revision conflict: expected ${expectedRevision}, received ${actualRevision}`,
    );
    this.name = "CharacterStateConflictError";
  }
}

export class CharacterPermissionError extends Error {
  constructor() {
    super("Only the owning player may edit this character");
    this.name = "CharacterPermissionError";
  }
}

export function applyCharacterStateCommand(
  rawIdentity: unknown,
  rawState: unknown,
  rawCommand: unknown,
  appliedMutationIds: ReadonlySet<string> = new Set(),
): { state: CharacterLiveState; event: CharacterStateEvent | null; duplicate: boolean } {
  const identity = CharacterIdentitySchema.parse(rawIdentity);
  const state = CharacterLiveStateSchema.parse(rawState);
  const command = CharacterStateCommandSchema.parse(rawCommand);

  if (command.actorUserId !== identity.ownerUserId) {
    throw new CharacterPermissionError();
  }
  if (appliedMutationIds.has(command.mutationId)) {
    return { state, event: null, duplicate: true };
  }
  if (command.expectedRevision !== state.revision) {
    throw new CharacterStateConflictError(command.expectedRevision, state.revision);
  }

  let nextState: CharacterLiveState;
  let before: Record<string, unknown>;
  let after: Record<string, unknown>;

  switch (command.type) {
    case "adjust-hit-points": {
      const currentHp = Math.min(state.maxHp, Math.max(0, state.currentHp + command.delta));
      before = { currentHp: state.currentHp };
      after = { currentHp };
      nextState = { ...state, currentHp, revision: state.revision + 1 };
      break;
    }
    case "set-temporary-hit-points": {
      before = { temporaryHp: state.temporaryHp };
      after = { temporaryHp: command.value };
      nextState = { ...state, temporaryHp: command.value, revision: state.revision + 1 };
      break;
    }
    case "spend-resource": {
      const resourceIndex = state.resources.findIndex(
        (resource) => resource.key === command.resourceKey,
      );
      if (resourceIndex < 0) {
        throw new Error(`Unknown character resource: ${command.resourceKey}`);
      }
      const resource = state.resources[resourceIndex];
      if (resource.current < command.amount) {
        throw new Error(`Insufficient ${resource.label}: ${resource.current} remaining`);
      }
      const nextResource = { ...resource, current: resource.current - command.amount };
      const resources = state.resources.map((entry, index) =>
        index === resourceIndex ? nextResource : entry,
      );
      before = { resourceKey: resource.key, current: resource.current };
      after = { resourceKey: resource.key, current: nextResource.current };
      nextState = { ...state, resources, revision: state.revision + 1 };
      break;
    }
  }

  const validatedState = CharacterLiveStateSchema.parse(nextState);
  return {
    state: validatedState,
    duplicate: false,
    event: {
      mutationId: command.mutationId,
      actorUserId: command.actorUserId,
      characterId: identity.id,
      type: command.type,
      fromRevision: state.revision,
      toRevision: validatedState.revision,
      before,
      after,
    },
  };
}

export const AppendCharacterLevelInputSchema = z
  .object({
    expectedRevision: z.number().int().min(1),
    classRef: RuleRefSchema.refine((ref) => ref.kind === "class", {
      message: "A level-up must reference a class",
    }),
    hpGain: z.number().int().min(1).max(50),
  })
  .strict();

export function appendCharacterLevel(rawBuild: unknown, rawInput: unknown): CharacterBuild {
  const build = CharacterBuildSchema.parse(rawBuild);
  const input = AppendCharacterLevelInputSchema.parse(rawInput);
  if (input.expectedRevision !== build.revision) {
    throw new CharacterStateConflictError(input.expectedRevision, build.revision);
  }
  if (build.levels.length >= 20) {
    throw new Error("A character cannot advance beyond level 20");
  }

  const previousClassLevels = build.levels.filter(
    (level) => level.classRef.id === input.classRef.id,
  ).length;
  return CharacterBuildSchema.parse({
    ...build,
    revision: build.revision + 1,
    levels: [
      ...build.levels,
      {
        characterLevel: build.levels.length + 1,
        classLevel: previousClassLevels + 1,
        classRef: input.classRef,
        hpGain: input.hpGain,
        reconstruction: "native",
      },
    ],
  });
}
