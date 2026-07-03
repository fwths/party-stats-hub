import { z } from "zod";
import {
  authorizeCharacterMutation,
  MutationAuthoritySchema,
  type AuthorizationAudit,
} from "./authority";
import { CharacterAggregateSchema, type CharacterAggregate } from "./schema";

const Identifier = z.string().trim().min(1).max(500);

export const ClassSemanticRecordSchema = z
  .object({
    classVersionKey: Identifier,
    catalogRevision: Identifier,
    hitDie: z.number().int().min(4).max(20),
    hpFirstLevel: z.number().int().min(1).max(50),
    hpHigherLevels: z.number().int().min(1).max(50),
  })
  .strict();

export type ClassSemanticRecord = z.infer<typeof ClassSemanticRecordSchema>;

export type ClassSemanticReport = {
  characterId: string;
  buildRevision: number;
  liveStateRevision: number;
  catalogRevision: string;
  characterLevel: number;
  proficiencyBonus: number;
  classLevels: Array<{ classVersionKey: string; levels: number }>;
  hpFullyReconstructed: boolean;
  readyToConfirmHitDice: boolean;
  issues: Array<{
    code: "missing-class-semantics" | "hit-die-mismatch" | "hit-dice-unavailable";
    classVersionKey: string | null;
    message: string;
  }>;
};

function catalogByVersion(records: ClassSemanticRecord[]): Map<string, ClassSemanticRecord> {
  const parsed = records.map((record) => ClassSemanticRecordSchema.parse(record));
  const map = new Map<string, ClassSemanticRecord>();
  for (const record of parsed) {
    if (map.has(record.classVersionKey)) {
      throw new Error(`Duplicate class semantic record ${record.classVersionKey}`);
    }
    map.set(record.classVersionKey, record);
  }
  return map;
}

export function deriveClassSemanticReport(input: {
  character: CharacterAggregate;
  catalog: ClassSemanticRecord[];
  catalogRevision: string;
}): ClassSemanticReport {
  const character = CharacterAggregateSchema.parse(input.character);
  const catalog = catalogByVersion(input.catalog);
  const classCounts = new Map<string, number>();
  character.build.levels.forEach((level) => {
    classCounts.set(
      level.classRef.versionKey,
      (classCounts.get(level.classRef.versionKey) ?? 0) + 1,
    );
  });
  const issues: ClassSemanticReport["issues"] = [];
  for (const classVersionKey of classCounts.keys()) {
    const semantic = catalog.get(classVersionKey);
    if (!semantic || semantic.catalogRevision !== input.catalogRevision) {
      issues.push({
        code: "missing-class-semantics",
        classVersionKey,
        message: `No exact class semantics exist for ${classVersionKey} at ${input.catalogRevision}`,
      });
    }
  }
  if (character.liveState.hitDice.status === "unavailable") {
    issues.push({
      code: "hit-dice-unavailable",
      classVersionKey: null,
      message: character.liveState.hitDice.reason,
    });
  } else {
    character.liveState.hitDice.pools.forEach((pool) => {
      const semantic = catalog.get(pool.classVersionKey);
      if (semantic && semantic.hitDie !== pool.die) {
        issues.push({
          code: "hit-die-mismatch",
          classVersionKey: pool.classVersionKey,
          message: `Stored d${pool.die} does not match catalog d${semantic.hitDie}`,
        });
      }
    });
  }
  const characterLevel = character.build.levels.length;
  return {
    characterId: character.identity.id,
    buildRevision: character.build.revision,
    liveStateRevision: character.liveState.revision,
    catalogRevision: input.catalogRevision,
    characterLevel,
    proficiencyBonus: Math.floor((characterLevel - 1) / 4) + 2,
    classLevels: [...classCounts.entries()].map(([classVersionKey, levels]) => ({
      classVersionKey,
      levels,
    })),
    hpFullyReconstructed:
      character.build.abilityBasis.verified &&
      character.hitPoints.baseline.verified &&
      character.hitPoints.baseline.method === "native-first-level",
    readyToConfirmHitDice: issues.length === 0,
    issues,
  };
}

const ConfirmClassSemanticsInputSchema = z
  .object({
    actorUserId: Identifier,
    authority: MutationAuthoritySchema.optional(),
    expectedBuildRevision: z.number().int().min(1),
    expectedLiveStateRevision: z.number().int().min(0),
    mutationId: Identifier,
    catalogRevision: Identifier,
  })
  .strict();

export function confirmClassSemantics(input: {
  character: CharacterAggregate;
  catalog: ClassSemanticRecord[];
  actorUserId: string;
  authority?: z.infer<typeof MutationAuthoritySchema>;
  expectedBuildRevision: number;
  expectedLiveStateRevision: number;
  mutationId: string;
  catalogRevision: string;
}): {
  character: CharacterAggregate;
  report: ClassSemanticReport;
  auditEvent: {
    mutationId: string;
    actorUserId: string;
    characterId: string;
    type: "confirm-class-semantics";
    classVersionKeys: string[];
    proficiencyBonus: number;
    buildRevision: { before: number; after: number };
    liveStateRevision: { before: number; after: number };
    authorization: AuthorizationAudit;
  };
} {
  const character = CharacterAggregateSchema.parse(input.character);
  const command = ConfirmClassSemanticsInputSchema.parse({
    actorUserId: input.actorUserId,
    authority: input.authority,
    expectedBuildRevision: input.expectedBuildRevision,
    expectedLiveStateRevision: input.expectedLiveStateRevision,
    mutationId: input.mutationId,
    catalogRevision: input.catalogRevision,
  });
  const authorization = authorizeCharacterMutation({
    character,
    actorUserId: command.actorUserId,
    authority: command.authority,
  });
  if (
    command.expectedBuildRevision !== character.build.revision ||
    command.expectedLiveStateRevision !== character.liveState.revision
  ) {
    throw new Error("character revision conflict while confirming class semantics");
  }
  const report = deriveClassSemanticReport({
    character,
    catalog: input.catalog,
    catalogRevision: command.catalogRevision,
  });
  if (!report.readyToConfirmHitDice || character.liveState.hitDice.status !== "tracked") {
    throw new Error("Class semantics are not ready to confirm");
  }
  const updated = CharacterAggregateSchema.parse({
    ...character,
    liveState: {
      ...character.liveState,
      revision: character.liveState.revision + 1,
      hitDice: {
        ...character.liveState.hitDice,
        pools: character.liveState.hitDice.pools.map((pool) => ({
          ...pool,
          provenance: "native" as const,
        })),
      },
    },
  });
  return {
    character: updated,
    report,
    auditEvent: {
      mutationId: command.mutationId,
      actorUserId: command.actorUserId,
      characterId: character.identity.id,
      type: "confirm-class-semantics",
      classVersionKeys: report.classLevels.map((entry) => entry.classVersionKey),
      proficiencyBonus: report.proficiencyBonus,
      buildRevision: { before: character.build.revision, after: updated.build.revision },
      liveStateRevision: {
        before: character.liveState.revision,
        after: updated.liveState.revision,
      },
      authorization,
    },
  };
}
