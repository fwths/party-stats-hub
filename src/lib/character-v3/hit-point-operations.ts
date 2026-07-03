import { z } from "zod";
import {
  authorizeCharacterMutation,
  MutationAuthoritySchema,
  type AuthorizationAudit,
  type MutationAuthority,
} from "./authority";
import {
  CharacterAggregateSchema,
  maximumHitPoints,
  type CharacterAggregate,
  type CharacterLiveState,
} from "./schema";

const Identifier = z.string().trim().min(1).max(500);
const BaseInput = {
  mutationId: Identifier,
  actorUserId: Identifier,
  authority: MutationAuthoritySchema.optional(),
  expectedBuildRevision: z.number().int().min(1),
  expectedLiveStateRevision: z.number().int().min(0),
};

export const ApplyDamageInputSchema = z
  .object({ ...BaseInput, amount: z.number().int().min(1).max(100_000), criticalHit: z.boolean() })
  .strict();
export const RestoreHitPointsInputSchema = z
  .object({ ...BaseInput, amount: z.number().int().min(1).max(100_000) })
  .strict();
export const GrantTemporaryHitPointsInputSchema = z
  .object({ ...BaseInput, amount: z.number().int().min(0).max(100_000) })
  .strict();
export const RecordDeathSaveInputSchema = z
  .object({
    ...BaseInput,
    result: z.enum(["success", "failure", "critical-success", "critical-failure"]),
  })
  .strict();
export const StabilizeCharacterInputSchema = z.object(BaseInput).strict();

export type LifeStatus = "conscious" | "unconscious" | "stable" | "dead";

export function deriveLifeStatus(state: CharacterLiveState): LifeStatus {
  if (state.currentHp > 0) return "conscious";
  if (state.deathSaves.failures >= 3) return "dead";
  if (state.deathSaves.stabilized) return "stable";
  return "unconscious";
}

type HpSnapshot = {
  currentHp: number;
  temporaryHp: number;
  deathSaves: CharacterLiveState["deathSaves"];
  lifeStatus: LifeStatus;
};

type HpAuditEvent = {
  mutationId: string;
  actorUserId: string;
  characterId: string;
  type:
    | "apply-damage"
    | "restore-hit-points"
    | "grant-temporary-hit-points"
    | "record-death-save"
    | "stabilize-character";
  before: HpSnapshot;
  after: HpSnapshot;
  buildRevision: { before: number; after: number };
  liveStateRevision: { before: number; after: number };
  authorization: AuthorizationAudit;
};

function snapshot(state: CharacterLiveState): HpSnapshot {
  return {
    currentHp: state.currentHp,
    temporaryHp: state.temporaryHp,
    deathSaves: state.deathSaves,
    lifeStatus: deriveLifeStatus(state),
  };
}

function prepare(
  rawCharacter: unknown,
  input: {
    actorUserId: string;
    authority?: MutationAuthority;
    expectedBuildRevision: number;
    expectedLiveStateRevision: number;
  },
) {
  const character = CharacterAggregateSchema.parse(rawCharacter);
  const authorization = authorizeCharacterMutation({
    character,
    actorUserId: input.actorUserId,
    authority: input.authority,
  });
  if (
    input.expectedBuildRevision !== character.build.revision ||
    input.expectedLiveStateRevision !== character.liveState.revision
  ) {
    throw new Error("character revision conflict while mutating Hit Points");
  }
  return { character, authorization };
}

function finish(input: {
  character: CharacterAggregate;
  nextState: Omit<CharacterLiveState, "revision">;
  mutationId: string;
  actorUserId: string;
  type: HpAuditEvent["type"];
  authorization: AuthorizationAudit;
}): { character: CharacterAggregate; auditEvent: HpAuditEvent } {
  const updated = CharacterAggregateSchema.parse({
    ...input.character,
    liveState: { ...input.nextState, revision: input.character.liveState.revision + 1 },
  });
  return {
    character: updated,
    auditEvent: {
      mutationId: input.mutationId,
      actorUserId: input.actorUserId,
      characterId: input.character.identity.id,
      type: input.type,
      before: snapshot(input.character.liveState),
      after: snapshot(updated.liveState),
      buildRevision: {
        before: input.character.build.revision,
        after: updated.build.revision,
      },
      liveStateRevision: {
        before: input.character.liveState.revision,
        after: updated.liveState.revision,
      },
      authorization: input.authorization,
    },
  };
}

export function applyDamage(rawCharacter: unknown, rawInput: unknown) {
  const input = ApplyDamageInputSchema.parse(rawInput);
  const { character, authorization } = prepare(rawCharacter, input);
  if (deriveLifeStatus(character.liveState) === "dead")
    throw new Error("Damage cannot mutate a dead character");
  const maximum = maximumHitPoints(character.hitPoints);
  const absorbed = Math.min(character.liveState.temporaryHp, input.amount);
  const remainingDamage = input.amount - absorbed;
  let currentHp = character.liveState.currentHp;
  let deathSaves = character.liveState.deathSaves;
  if (remainingDamage > 0 && currentHp > 0) {
    const overflow = Math.max(0, remainingDamage - currentHp);
    currentHp = Math.max(0, currentHp - remainingDamage);
    if (currentHp === 0) {
      deathSaves =
        overflow >= maximum
          ? { successes: 0, failures: 3, stabilized: false }
          : { successes: 0, failures: 0, stabilized: false };
    }
  } else if (remainingDamage > 0) {
    deathSaves =
      remainingDamage >= maximum
        ? { successes: 0, failures: 3, stabilized: false }
        : {
            successes: deathSaves.successes,
            failures: Math.min(3, deathSaves.failures + (input.criticalHit ? 2 : 1)),
            stabilized: false,
          };
  }
  return finish({
    character,
    nextState: {
      ...character.liveState,
      currentHp,
      temporaryHp: character.liveState.temporaryHp - absorbed,
      deathSaves,
    },
    mutationId: input.mutationId,
    actorUserId: input.actorUserId,
    type: "apply-damage",
    authorization,
  });
}

export function restoreHitPoints(rawCharacter: unknown, rawInput: unknown) {
  const input = RestoreHitPointsInputSchema.parse(rawInput);
  const { character, authorization } = prepare(rawCharacter, input);
  if (deriveLifeStatus(character.liveState) === "dead")
    throw new Error("Ordinary healing cannot restore a dead character");
  const currentHp = Math.min(
    maximumHitPoints(character.hitPoints),
    character.liveState.currentHp + input.amount,
  );
  if (currentHp === character.liveState.currentHp) throw new Error("Hit Points are already full");
  return finish({
    character,
    nextState: {
      ...character.liveState,
      currentHp,
      deathSaves: { successes: 0, failures: 0, stabilized: false },
    },
    mutationId: input.mutationId,
    actorUserId: input.actorUserId,
    type: "restore-hit-points",
    authorization,
  });
}

export function grantTemporaryHitPoints(rawCharacter: unknown, rawInput: unknown) {
  const input = GrantTemporaryHitPointsInputSchema.parse(rawInput);
  const { character, authorization } = prepare(rawCharacter, input);
  if (deriveLifeStatus(character.liveState) === "dead")
    throw new Error("Temporary Hit Points cannot be granted to a dead character");
  if (input.amount === character.liveState.temporaryHp)
    throw new Error("Temporary Hit Points would not change");
  return finish({
    character,
    nextState: { ...character.liveState, temporaryHp: input.amount },
    mutationId: input.mutationId,
    actorUserId: input.actorUserId,
    type: "grant-temporary-hit-points",
    authorization,
  });
}

export function stabilizeCharacter(rawCharacter: unknown, rawInput: unknown) {
  const input = StabilizeCharacterInputSchema.parse(rawInput);
  const { character, authorization } = prepare(rawCharacter, input);
  if (deriveLifeStatus(character.liveState) !== "unconscious")
    throw new Error("Only an unconscious character at 0 Hit Points can be stabilized");
  return finish({
    character,
    nextState: {
      ...character.liveState,
      deathSaves: { successes: 0, failures: 0, stabilized: true },
    },
    mutationId: input.mutationId,
    actorUserId: input.actorUserId,
    type: "stabilize-character",
    authorization,
  });
}

export function recordDeathSave(rawCharacter: unknown, rawInput: unknown) {
  const input = RecordDeathSaveInputSchema.parse(rawInput);
  const { character, authorization } = prepare(rawCharacter, input);
  if (deriveLifeStatus(character.liveState) !== "unconscious")
    throw new Error("Death saves require an unconscious character at 0 Hit Points");
  let currentHp = 0;
  let deathSaves = character.liveState.deathSaves;
  if (input.result === "critical-success") {
    currentHp = 1;
    deathSaves = { successes: 0, failures: 0, stabilized: false };
  } else if (input.result === "success") {
    const successes = deathSaves.successes + 1;
    deathSaves =
      successes >= 3
        ? { successes: 0, failures: 0, stabilized: true }
        : { ...deathSaves, successes };
  } else {
    deathSaves = {
      ...deathSaves,
      failures: Math.min(3, deathSaves.failures + (input.result === "critical-failure" ? 2 : 1)),
    };
  }
  return finish({
    character,
    nextState: { ...character.liveState, currentHp, deathSaves },
    mutationId: input.mutationId,
    actorUserId: input.actorUserId,
    type: "record-death-save",
    authorization,
  });
}
