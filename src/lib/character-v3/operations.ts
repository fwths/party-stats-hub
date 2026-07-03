import { z } from "zod";
import { deriveAttunementCapacityReplacements } from "./attunement-capacity";
import {
  CharacterAggregateSchema,
  CharacterDecisionSchema,
  CharacterResourceSchema,
  CharacterSpellSelectionSchema,
  ExactRuleRefSchema,
  type CharacterAggregate,
  maximumHitPoints,
} from "./schema";
import {
  authorizeCharacterMutation,
  CharacterMutationPermissionError,
  MutationAuthoritySchema,
  type AuthorizationAudit,
} from "./authority";
import { effectiveAbilityScores } from "./derived-sheet";
import { LevelUpSubclassChoiceSchema } from "./level-up-subclass";

export class CharacterV3ConflictError extends Error {
  constructor(
    readonly target: "build" | "live-state",
    readonly expected: number,
    readonly actual: number,
  ) {
    super(`${target} revision conflict: expected ${expected}, found ${actual}`);
    this.name = "CharacterV3ConflictError";
  }
}

export class CharacterV3PermissionError extends Error {
  constructor() {
    super("Only the character owner can advance this character");
    this.name = "CharacterV3PermissionError";
  }
}

const HpBonusSchema = z
  .object({
    sourceRef: ExactRuleRefSchema.nullable(),
    label: z.string().trim().min(1),
    amount: z.number().int().min(-50).max(50),
  })
  .strict();

export const AdvanceCharacterInputSchema = z
  .object({
    mutationId: z.string().trim().min(1),
    actorUserId: z.string().trim().min(1),
    authority: MutationAuthoritySchema.optional(),
    expectedBuildRevision: z.number().int().min(1),
    expectedLiveStateRevision: z.number().int().min(0),
    classRef: ExactRuleRefSchema.refine((ref) => ref.kind === "class"),
    hp: z
      .object({
        method: z.enum(["fixed", "rolled"]),
        hitDieContribution: z.number().int().min(1).max(20),
        constitutionModifier: z.number().int().min(-5).max(10),
        bonuses: z.array(HpBonusSchema),
      })
      .strict(),
    currentHpPolicy: z.enum(["preserve-damage", "preserve-current"]),
    decisions: z.array(CharacterDecisionSchema),
    subclasses: z.array(LevelUpSubclassChoiceSchema).default([]),
    spells: z.array(CharacterSpellSelectionSchema),
    resourceUpdates: z.array(CharacterResourceSchema).default([]),
    attunementCapacityReplacements: z
      .array(z.object({ sourceRef: ExactRuleRefSchema, maximum: z.number().int().min(0) }).strict())
      .default([]),
  })
  .strict();

export type AdvanceCharacterResult = {
  character: CharacterAggregate;
  auditEvent: {
    mutationId: string;
    actorUserId: string;
    characterId: string;
    type: "advance-character-level";
    characterLevel: { before: number; after: number };
    buildRevision: { before: number; after: number };
    liveStateRevision: { before: number; after: number };
    maximumHp: { before: number; after: number };
    currentHp: { before: number; after: number };
    authorization: AuthorizationAudit;
  };
};

export function advanceCharacterLevel(
  rawCharacter: unknown,
  rawInput: unknown,
): AdvanceCharacterResult {
  const character = CharacterAggregateSchema.parse(rawCharacter);
  const input = AdvanceCharacterInputSchema.parse(rawInput);
  let authorization: AuthorizationAudit;
  try {
    authorization = authorizeCharacterMutation({
      character,
      actorUserId: input.actorUserId,
      authority: input.authority,
    });
  } catch (error) {
    if (error instanceof CharacterMutationPermissionError) {
      throw new CharacterV3PermissionError();
    }
    throw error;
  }
  if (input.expectedBuildRevision !== character.build.revision) {
    throw new CharacterV3ConflictError(
      "build",
      input.expectedBuildRevision,
      character.build.revision,
    );
  }
  if (input.expectedLiveStateRevision !== character.liveState.revision) {
    throw new CharacterV3ConflictError(
      "live-state",
      input.expectedLiveStateRevision,
      character.liveState.revision,
    );
  }
  const beforeLevel = character.build.levels.length;
  if (beforeLevel >= 20) throw new Error("Character cannot advance beyond level 20");
  const nextLevel = beforeLevel + 1;
  const previousClassLevels = character.build.levels.filter(
    (level) => level.classRef.versionKey === input.classRef.versionKey,
  ).length;
  const existingDecisionIds = new Set(character.build.decisions.map((decision) => decision.id));
  const newDecisionIds = new Set<string>();
  for (const decision of input.decisions) {
    if (decision.provenance !== "native" || decision.madeAtCharacterLevel !== nextLevel) {
      throw new Error("New level decisions must be native and assigned to the new character level");
    }
    if (existingDecisionIds.has(decision.id) || newDecisionIds.has(decision.id)) {
      throw new Error("New level decisions must have unique IDs");
    }
    newDecisionIds.add(decision.id);
  }
  const resultingScores = effectiveAbilityScores(character);
  for (const decision of input.decisions) {
    if (decision.type !== "ability-score-increase") continue;
    for (const increase of decision.increases) {
      resultingScores[increase.ability] += increase.amount;
      if (resultingScores[increase.ability] > 20) {
        throw new Error(
          `Ability score ${increase.ability} cannot exceed 20 during level advancement`,
        );
      }
    }
  }
  for (const spell of input.spells) {
    if (spell.provenance !== "native" || spell.selectedAtCharacterLevel !== nextLevel) {
      throw new Error("New level spells must be native and assigned to the new character level");
    }
  }
  const existingSubclassClasses = new Set(
    character.build.subclasses.map((subclass) => subclass.classVersionKey),
  );
  const newSubclassClasses = new Set<string>();
  for (const subclass of input.subclasses) {
    if (subclass.classVersionKey !== input.classRef.versionKey) {
      throw new Error("New level subclass must belong to the advanced class");
    }
    if (subclass.selectedAtCharacterLevel !== nextLevel) {
      throw new Error("New level subclass must be assigned to the new character level");
    }
    if (
      existingSubclassClasses.has(subclass.classVersionKey) ||
      newSubclassClasses.has(subclass.classVersionKey)
    ) {
      throw new Error("A class can have only one subclass selection");
    }
    newSubclassClasses.add(subclass.classVersionKey);
  }
  const resourceUpdateKeys = new Set<string>();
  for (const resource of input.resourceUpdates) {
    if (resourceUpdateKeys.has(resource.key)) {
      throw new Error("Level-up resource updates must have unique keys");
    }
    if (resource.provenance !== "verified-rule") {
      throw new Error("Level-up resource updates require verified rule provenance");
    }
    resourceUpdateKeys.add(resource.key);
  }
  const replacementVersionKeys = new Set<string>();
  for (const replacement of input.attunementCapacityReplacements) {
    if (replacement.sourceRef.kind !== "feature" || replacement.sourceRef.verification !== "verified") {
      throw new Error("Attunement capacity replacements require an exact verified feature source");
    }
    if (replacementVersionKeys.has(replacement.sourceRef.versionKey)) {
      throw new Error("Attunement capacity replacements must have unique sources");
    }
    const authoritative = deriveAttunementCapacityReplacements([replacement.sourceRef])[0];
    if (!authoritative || authoritative.maximum !== replacement.maximum) {
      throw new Error("Attunement capacity replacement does not match authoritative feature semantics");
    }
    replacementVersionKeys.add(replacement.sourceRef.versionKey);
  }

  const hpTotal = Math.max(
    1,
    input.hp.hitDieContribution +
      input.hp.constitutionModifier +
      input.hp.bonuses.reduce((sum, bonus) => sum + bonus.amount, 0),
  );
  const beforeMaximumHp = maximumHitPoints(character.hitPoints);
  const afterMaximumHp = beforeMaximumHp + hpTotal;
  const damage = beforeMaximumHp - character.liveState.currentHp;
  const afterCurrentHp =
    input.currentHpPolicy === "preserve-damage"
      ? afterMaximumHp - damage
      : character.liveState.currentHp;
  if (character.liveState.hitDice.status !== "tracked") {
    throw new Error("Character hit dice must be tracked before advancing a level");
  }
  const hitDicePool = character.liveState.hitDice.pools.find(
    (pool) => pool.classVersionKey === input.classRef.versionKey,
  );
  if (!hitDicePool) throw new Error("Level class has no tracked hit-die pool");

  const advanced = CharacterAggregateSchema.parse({
    ...character,
    build: {
      ...character.build,
      revision: character.build.revision + 1,
      levels: [
        ...character.build.levels,
        {
          characterLevel: nextLevel,
          classLevel: previousClassLevels + 1,
          classRef: input.classRef,
          provenance: "native",
        },
      ],
      subclasses: [...character.build.subclasses, ...input.subclasses],
      decisions: [...character.build.decisions, ...input.decisions],
      spells: [...character.build.spells, ...input.spells],
      attunementCapacity: {
        ...character.build.attunementCapacity,
        replacements: [
          ...character.build.attunementCapacity.replacements.filter(
            (existing) => !replacementVersionKeys.has(existing.sourceRef.versionKey),
          ),
          ...input.attunementCapacityReplacements,
        ],
      },
    },
    hitPoints: {
      ...character.hitPoints,
      gains: [
        ...character.hitPoints.gains,
        {
          characterLevel: nextLevel,
          method: input.hp.method,
          hitDieContribution: input.hp.hitDieContribution,
          constitutionModifier: input.hp.constitutionModifier,
          bonuses: input.hp.bonuses,
          total: hpTotal,
        },
      ],
    },
    liveState: {
      ...character.liveState,
      revision: character.liveState.revision + 1,
      currentHp: afterCurrentHp,
      hitDice: {
        status: "tracked",
        pools: character.liveState.hitDice.pools.map((pool) =>
          pool.classVersionKey === input.classRef.versionKey
            ? { ...pool, maximum: pool.maximum + 1, remaining: pool.remaining + 1 }
            : pool,
        ),
      },
      resources: [
        ...character.liveState.resources
          .filter((resource) => !resourceUpdateKeys.has(resource.key))
          .map((resource) => resource),
        ...input.resourceUpdates,
      ],
    },
  });

  return {
    character: advanced,
    auditEvent: {
      mutationId: input.mutationId,
      actorUserId: input.actorUserId,
      characterId: character.identity.id,
      type: "advance-character-level",
      characterLevel: { before: beforeLevel, after: nextLevel },
      buildRevision: { before: character.build.revision, after: advanced.build.revision },
      liveStateRevision: {
        before: character.liveState.revision,
        after: advanced.liveState.revision,
      },
      maximumHp: { before: beforeMaximumHp, after: afterMaximumHp },
      currentHp: { before: character.liveState.currentHp, after: afterCurrentHp },
      authorization,
    },
  };
}
