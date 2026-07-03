import { z } from "zod";
import {
  authorizeCharacterMutation,
  MutationAuthoritySchema,
  type AuthorizationAudit,
} from "./authority";
import { CharacterAggregateSchema, type CharacterAggregate } from "./schema";

const Identifier = z.string().trim().min(1).max(500);

export const SpellcastingSemanticRecordSchema = z
  .object({
    classVersionKey: Identifier,
    catalogRevision: Identifier,
    progression: z.enum(["none", "full", "artificer", "half", "third", "pact"]),
  })
  .strict();

export type SpellcastingSemanticRecord = z.infer<typeof SpellcastingSemanticRecordSchema>;

const FULL_CASTER_SLOTS: number[][] = [
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

const PACT_SLOTS: Array<{ level: number; slots: number }> = [
  { level: 1, slots: 1 },
  { level: 1, slots: 2 },
  { level: 2, slots: 2 },
  { level: 2, slots: 2 },
  { level: 3, slots: 2 },
  { level: 3, slots: 2 },
  { level: 4, slots: 2 },
  { level: 4, slots: 2 },
  { level: 5, slots: 2 },
  { level: 5, slots: 2 },
  { level: 5, slots: 3 },
  { level: 5, slots: 3 },
  { level: 5, slots: 3 },
  { level: 5, slots: 3 },
  { level: 5, slots: 3 },
  { level: 5, slots: 3 },
  { level: 5, slots: 4 },
  { level: 5, slots: 4 },
  { level: 5, slots: 4 },
  { level: 5, slots: 4 },
];

function effectiveCasterLevel(
  classLevel: number,
  progression: SpellcastingSemanticRecord["progression"],
  combinesSpellcasting = false,
): number {
  if (progression === "full") return classLevel;
  if (progression === "artificer") return Math.ceil(classLevel / 2);
  if (progression === "half")
    return combinesSpellcasting ? Math.floor(classLevel / 2) : Math.ceil(classLevel / 2);
  if (progression === "third")
    return combinesSpellcasting ? Math.floor(classLevel / 3) : Math.ceil(classLevel / 3);
  return 0;
}

export type SpellSlotSemanticReport = {
  characterId: string;
  buildRevision: number;
  liveStateRevision: number;
  catalogRevision: string;
  sourceClassVersionKey: string | null;
  effectiveCasterLevel: number;
  expectedSlots: Array<{ key: string; level: number; maximum: number }>;
  expectedPactSlots: Array<{ key: string; level: number; maximum: number }>;
  readyToReconcile: boolean;
  issues: Array<{
    code:
      | "missing-spellcasting-semantics"
      | "missing-slot-resource"
      | "unexpected-slot-resource"
      | "slot-maximum-mismatch"
      | "slot-recovery-mismatch";
    resourceKey: string | null;
    message: string;
  }>;
};

export function deriveSpellSlotSemanticReport(input: {
  character: CharacterAggregate;
  catalog: SpellcastingSemanticRecord[];
  catalogRevision: string;
}): SpellSlotSemanticReport {
  const character = CharacterAggregateSchema.parse(input.character);
  const catalog = new Map<string, SpellcastingSemanticRecord>();
  input.catalog
    .map((record) => SpellcastingSemanticRecordSchema.parse(record))
    .forEach((record) => {
      if (catalog.has(record.classVersionKey))
        throw new Error(`Duplicate spellcasting semantics ${record.classVersionKey}`);
      catalog.set(record.classVersionKey, record);
    });
  const counts = new Map<string, number>();
  character.build.levels.forEach((level) =>
    counts.set(level.classRef.versionKey, (counts.get(level.classRef.versionKey) ?? 0) + 1),
  );
  const issues: SpellSlotSemanticReport["issues"] = [];
  let sourceClassVersionKey: string | null = null;
  let casterLevel = 0;
  let pactLevel = 0;
  const combinesSpellcasting = counts.size > 1;
  sourceClassVersionKey =
    counts.size === 1
      ? [...counts.keys()][0]
      : `multiclass-spellcasting:${[...counts.keys()].sort().join("+")}`;
  for (const [classVersionKey, classLevel] of counts.entries()) {
    const semantic = catalog.get(classVersionKey);
    if (!semantic || semantic.catalogRevision !== input.catalogRevision) {
      issues.push({
        code: "missing-spellcasting-semantics",
        resourceKey: null,
        message: `No exact spellcasting semantics exist for ${classVersionKey}`,
      });
    } else if (semantic.progression === "pact") {
      pactLevel = classLevel;
    } else {
      casterLevel += effectiveCasterLevel(classLevel, semantic.progression, combinesSpellcasting);
    }
  }
  casterLevel = Math.min(20, casterLevel);
  const expectedSlots = casterLevel
    ? (FULL_CASTER_SLOTS[casterLevel - 1] ?? []).map((maximum, index) => ({
        key: `spell-slot:${index + 1}`,
        level: index + 1,
        maximum,
      }))
    : [];
  const pactSlot = pactLevel ? PACT_SLOTS[Math.min(20, Math.max(1, pactLevel)) - 1] : null;
  const expectedPactSlots = pactSlot
    ? [
        {
          key: `pact-slot:${pactSlot.level}`,
          level: pactSlot.level,
          maximum: pactSlot.slots,
        },
      ]
    : [];
  const allExpectedSlots = [...expectedSlots, ...expectedPactSlots];
  const actualSlots = character.liveState.resources.filter((resource) =>
    resource.key.startsWith("spell-slot:") || resource.key.startsWith("pact-slot:"),
  );
  const expectedByKey = new Map(allExpectedSlots.map((slot) => [slot.key, slot]));
  allExpectedSlots.forEach((slot) => {
    const actual = actualSlots.find((resource) => resource.key === slot.key);
    if (!actual) {
      issues.push({
        code: "missing-slot-resource",
        resourceKey: slot.key,
        message: `${slot.key} is missing`,
      });
    } else {
      if (actual.maximum !== slot.maximum) {
        issues.push({
          code: "slot-maximum-mismatch",
          resourceKey: slot.key,
          message: `${slot.key} maximum ${actual.maximum} does not match ${slot.maximum}`,
        });
      }
      const expectedRecovery = slot.key.startsWith("pact-slot:") ? "short-rest" : "long-rest";
      if (actual.recovery !== expectedRecovery) {
        issues.push({
          code: "slot-recovery-mismatch",
          resourceKey: slot.key,
          message: `${slot.key} must recover on a ${expectedRecovery}`,
        });
      }
    }
  });
  actualSlots.forEach((resource) => {
    if (!expectedByKey.has(resource.key)) {
      issues.push({
        code: "unexpected-slot-resource",
        resourceKey: resource.key,
        message: `${resource.key} is not granted by the exact class progression`,
      });
    }
  });
  return {
    characterId: character.identity.id,
    buildRevision: character.build.revision,
    liveStateRevision: character.liveState.revision,
    catalogRevision: input.catalogRevision,
    sourceClassVersionKey,
    effectiveCasterLevel: casterLevel,
    expectedSlots,
    expectedPactSlots,
    readyToReconcile: issues.length === 0,
    issues,
  };
}

export function reconcileSpellSlotResources(input: {
  character: CharacterAggregate;
  catalog: SpellcastingSemanticRecord[];
  catalogRevision: string;
  actorUserId: string;
  authority?: z.infer<typeof MutationAuthoritySchema>;
  expectedBuildRevision: number;
  expectedLiveStateRevision: number;
  mutationId: string;
}): {
  character: CharacterAggregate;
  report: SpellSlotSemanticReport;
  auditEvent: {
    mutationId: string;
    actorUserId: string;
    characterId: string;
    type: "reconcile-spell-slot-resources";
    resourceKeys: string[];
    effectiveCasterLevel: number;
    buildRevision: { before: number; after: number };
    liveStateRevision: { before: number; after: number };
    authorization: AuthorizationAudit;
  };
} {
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
    throw new Error("character revision conflict while reconciling spell slots");
  }
  const report = deriveSpellSlotSemanticReport(input);
  if (!report.readyToReconcile || !report.sourceClassVersionKey) {
    throw new Error("Spell slots are not ready to reconcile");
  }
  const slotsToReconcile = [...report.expectedSlots, ...report.expectedPactSlots];
  if (slotsToReconcile.length === 0)
    throw new Error("Character has no spell-slot resources to reconcile");
  const keys = new Set(slotsToReconcile.map((slot) => slot.key));
  if (
    character.liveState.resources
      .filter((resource) => keys.has(resource.key))
      .every((resource) => resource.sourceVersionKey === report.sourceClassVersionKey)
  ) {
    throw new Error("Spell-slot resources have already been reconciled");
  }
  const updated = CharacterAggregateSchema.parse({
    ...character,
    liveState: {
      ...character.liveState,
      revision: character.liveState.revision + 1,
      resources: character.liveState.resources.map((resource) =>
        keys.has(resource.key)
          ? {
              ...resource,
              sourceVersionKey: report.sourceClassVersionKey,
              provenance: "verified-rule" as const,
              recoveryRules: resource.key.startsWith("pact-slot:")
                ? [
                    { trigger: "short-rest" as const, restore: { type: "all" as const } },
                    { trigger: "long-rest" as const, restore: { type: "all" as const } },
                  ]
                : [{ trigger: "long-rest" as const, restore: { type: "all" as const } }],
            }
          : resource,
      ),
    },
  });
  return {
    character: updated,
    report,
    auditEvent: {
      mutationId: input.mutationId,
      actorUserId: input.actorUserId,
      characterId: character.identity.id,
      type: "reconcile-spell-slot-resources",
      resourceKeys: [...keys],
      effectiveCasterLevel: report.effectiveCasterLevel,
      buildRevision: { before: character.build.revision, after: updated.build.revision },
      liveStateRevision: {
        before: character.liveState.revision,
        after: updated.liveState.revision,
      },
      authorization,
    },
  };
}
