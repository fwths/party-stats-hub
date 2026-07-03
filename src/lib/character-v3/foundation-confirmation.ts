import { z } from "zod";
import {
  authorizeCharacterMutation,
  MutationAuthoritySchema,
  type AuthorizationAudit,
} from "./authority";
import { AbilityScoresSchema, CharacterAggregateSchema, type CharacterAggregate } from "./schema";

const Identifier = z.string().trim().min(1).max(500);

const ConfirmFoundationInputSchema = z
  .object({
    actorUserId: Identifier,
    authority: MutationAuthoritySchema.optional(),
    expectedBuildRevision: z.number().int().min(1),
    mutationId: Identifier,
    abilityScores: AbilityScoresSchema,
    hpMaximum: z.number().int().min(1),
    hpThroughCharacterLevel: z.number().int().min(1).max(20),
    reason: z.string().trim().min(10),
  })
  .strict();

export function confirmImportedFoundation(input: {
  character: CharacterAggregate;
  actorUserId: string;
  authority?: z.infer<typeof MutationAuthoritySchema>;
  expectedBuildRevision: number;
  mutationId: string;
  abilityScores: z.infer<typeof AbilityScoresSchema>;
  hpMaximum: number;
  hpThroughCharacterLevel: number;
  reason: string;
}): {
  character: CharacterAggregate;
  auditEvent: {
    mutationId: string;
    actorUserId: string;
    characterId: string;
    type: "confirm-imported-foundation";
    abilityScores: z.infer<typeof AbilityScoresSchema>;
    hpBaseline: { maximum: number; throughCharacterLevel: number };
    buildRevision: { before: number; after: number };
    liveStateRevision: { before: number; after: number };
    authorization: AuthorizationAudit;
  };
} {
  const character = CharacterAggregateSchema.parse(input.character);
  const command = ConfirmFoundationInputSchema.parse({
    actorUserId: input.actorUserId,
    authority: input.authority,
    expectedBuildRevision: input.expectedBuildRevision,
    mutationId: input.mutationId,
    abilityScores: input.abilityScores,
    hpMaximum: input.hpMaximum,
    hpThroughCharacterLevel: input.hpThroughCharacterLevel,
    reason: input.reason,
  });
  const authorization = authorizeCharacterMutation({
    character,
    actorUserId: command.actorUserId,
    authority: command.authority,
  });
  if (command.expectedBuildRevision !== character.build.revision) {
    throw new Error("build revision conflict while confirming imported foundation");
  }
  if (
    character.build.abilityBasis.method !== "imported-baseline" ||
    character.hitPoints.baseline.method !== "imported-baseline"
  ) {
    throw new Error("Only imported ability and HP baselines can use foundation confirmation");
  }
  if (
    character.build.abilityBasis.verified ||
    character.hitPoints.baseline.verified ||
    character.resolutions.some((resolution) => resolution.type === "foundation-baseline-confirmed")
  ) {
    throw new Error("Imported foundation has already been confirmed");
  }
  if (
    JSON.stringify(command.abilityScores) !==
    JSON.stringify(character.build.abilityBasis.baseScores)
  ) {
    throw new Error("Confirmed ability scores must exactly echo the imported baseline");
  }
  if (
    command.hpMaximum !== character.hitPoints.baseline.maximum ||
    command.hpThroughCharacterLevel !== character.hitPoints.baseline.throughCharacterLevel
  ) {
    throw new Error("Confirmed HP values must exactly echo the imported baseline");
  }
  const resolution: CharacterAggregate["resolutions"][number] = {
    id: `resolution:foundation:${command.mutationId}`,
    type: "foundation-baseline-confirmed",
    method: "owner-attested-imported-baseline",
    abilityScores: command.abilityScores,
    hpMaximum: command.hpMaximum,
    hpThroughCharacterLevel: command.hpThroughCharacterLevel,
    reason: command.reason,
    decidedByUserId: command.actorUserId,
  };
  const updated = CharacterAggregateSchema.parse({
    ...character,
    build: {
      ...character.build,
      revision: character.build.revision + 1,
      abilityBasis: { ...character.build.abilityBasis, verified: true },
    },
    hitPoints: {
      ...character.hitPoints,
      baseline: { ...character.hitPoints.baseline, verified: true },
    },
    resolutions: [...character.resolutions, resolution],
  });
  return {
    character: updated,
    auditEvent: {
      mutationId: command.mutationId,
      actorUserId: command.actorUserId,
      characterId: character.identity.id,
      type: "confirm-imported-foundation",
      abilityScores: command.abilityScores,
      hpBaseline: {
        maximum: command.hpMaximum,
        throughCharacterLevel: command.hpThroughCharacterLevel,
      },
      buildRevision: { before: character.build.revision, after: updated.build.revision },
      liveStateRevision: {
        before: character.liveState.revision,
        after: updated.liveState.revision,
      },
      authorization,
    },
  };
}
