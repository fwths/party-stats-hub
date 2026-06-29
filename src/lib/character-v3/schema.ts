import { z } from "zod";
import { createRuleVersionKey } from "../character-v2/rule-identity";

export const CHARACTER_SCHEMA_VERSION = 3 as const;
export const RULES_GENERATION = "2024" as const;

const NonEmptyString = z.string().trim().min(1);
const Identifier = NonEmptyString.max(500);

export const RuleKindSchema = z.enum([
  "species",
  "background",
  "class",
  "subclass",
  "feat",
  "spell",
  "item",
  "feature",
  "proficiency",
  "language",
  "tool",
  "weapon-mastery",
  "condition",
  "other",
]);

export const ExactRuleRefSchema = z
  .object({
    kind: RuleKindSchema,
    familyKey: Identifier,
    versionKey: Identifier,
    name: NonEmptyString,
    rulesGeneration: z.literal(RULES_GENERATION),
    sourceId: Identifier,
    upstreamId: Identifier,
    contentRevision: Identifier,
    compatibility: z.enum(["core-2024", "current-2024-compatible", "legacy", "custom"]),
    verification: z.enum(["verified", "imported-unverified", "custom"]),
  })
  .strict()
  .superRefine((ref, context) => {
    const expected = createRuleVersionKey({
      kind:
        ref.kind === "language" ||
        ref.kind === "tool" ||
        ref.kind === "weapon-mastery" ||
        ref.kind === "condition"
          ? "other"
          : ref.kind,
      sourceId: ref.sourceId,
      upstreamId: ref.upstreamId,
      contentRevision: ref.contentRevision,
    });
    if (ref.versionKey !== expected) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["versionKey"],
        message: `Expected exact rule version key ${expected}`,
      });
    }
    if (
      ref.verification === "verified" &&
      !["core-2024", "current-2024-compatible"].includes(ref.compatibility)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["verification"],
        message: "Only current 2024-compatible content can be verified",
      });
    }
    if (ref.verification === "custom" && ref.compatibility !== "custom") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["compatibility"],
        message: "Custom verification requires custom compatibility",
      });
    }
  });

export type ExactRuleRef = z.infer<typeof ExactRuleRefSchema>;

export const AbilityScoresSchema = z
  .object({
    STR: z.number().int().min(1).max(30),
    DEX: z.number().int().min(1).max(30),
    CON: z.number().int().min(1).max(30),
    INT: z.number().int().min(1).max(30),
    WIS: z.number().int().min(1).max(30),
    CHA: z.number().int().min(1).max(30),
  })
  .strict();

const AbilitySchema = z.enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"]);
const DecisionBase = {
  id: Identifier,
  madeAtCharacterLevel: z.number().int().min(1).max(20).nullable(),
  provenance: z.enum(["native", "imported", "custom"]),
};

const CharacterDecisionUnionSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...DecisionBase,
      type: z.literal("ability-score-increase"),
      sourceRef: ExactRuleRefSchema,
      increases: z
        .array(
          z.object({ ability: AbilitySchema, amount: z.number().int().min(1).max(2) }).strict(),
        )
        .min(1)
        .max(2),
    })
    .strict(),
  z
    .object({
      ...DecisionBase,
      type: z.literal("rule-selection"),
      selectionKind: z.enum([
        "feat",
        "feature-option",
        "proficiency",
        "language",
        "tool",
        "weapon-mastery",
        "other",
      ]),
      sourceRef: ExactRuleRefSchema.nullable(),
      selections: z.array(ExactRuleRefSchema).min(1),
    })
    .strict(),
  z
    .object({
      ...DecisionBase,
      type: z.literal("spell-selection"),
      classVersionKey: Identifier,
      selectionMode: z.enum(["cantrip", "known", "prepared", "always-prepared", "granted"]),
      sourceRef: ExactRuleRefSchema.nullable(),
      spellVersionKeys: z.array(Identifier).min(1),
    })
    .strict(),
  z
    .object({
      ...DecisionBase,
      type: z.literal("magic-initiate-selection"),
      sourceRef: ExactRuleRefSchema.refine((ref) => ref.kind === "feat"),
      spellList: z.enum(["cleric", "druid", "wizard"]),
      castingAbility: z.enum(["INT", "WIS", "CHA"]),
      cantripVersionKeys: z.array(Identifier).length(2),
      levelOneSpellVersionKey: Identifier,
    })
    .strict(),
  z
    .object({
      ...DecisionBase,
      type: z.literal("tiefling-legacy-selection"),
      sourceRef: ExactRuleRefSchema.refine((ref) => ref.kind === "species"),
      legacy: z.enum(["abyssal", "chthonic", "infernal"]),
      castingAbility: z.enum(["INT", "WIS", "CHA"]),
      resistance: z.enum(["Poison", "Necrotic", "Fire"]),
      spellVersionKeys: z.array(Identifier).length(4),
    })
    .strict(),
  z
    .object({
      ...DecisionBase,
      type: z.literal("elf-lineage-selection"),
      sourceRef: ExactRuleRefSchema.refine((ref) => ref.kind === "species"),
      lineage: z.enum(["drow", "high-elf", "wood-elf"]),
      castingAbility: z.enum(["INT", "WIS", "CHA"]),
      spellVersionKeys: z.array(Identifier).length(3),
    })
    .strict(),
  z
    .object({
      ...DecisionBase,
      type: z.literal("species-spell-bundle-selection"),
      sourceRef: ExactRuleRefSchema.refine((ref) => ref.kind === "species"),
      traitName: NonEmptyString,
      castingAbility: z.enum(["INT", "WIS", "CHA"]),
      spellVersionKeys: z.array(Identifier).min(1),
    })
    .strict(),
]);

export const CharacterDecisionSchema = CharacterDecisionUnionSchema.superRefine(
  (decision, context) => {
    if (decision.type === "ability-score-increase") {
      const abilities = new Set(decision.increases.map((increase) => increase.ability));
      const total = decision.increases.reduce((sum, increase) => sum + increase.amount, 0);
      if (abilities.size !== decision.increases.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["increases"],
          message: "An ability-score decision cannot repeat an ability",
        });
      }
      if (total > 2) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["increases"],
          message: "An ability-score decision cannot grant more than two points",
        });
      }
    }
    if (decision.type === "rule-selection" && decision.selectionKind !== "other") {
      const allowedKinds: Record<Exclude<typeof decision.selectionKind, "other">, string[]> = {
        feat: ["feat"],
        "feature-option": ["feature", "other"],
        proficiency: ["proficiency"],
        language: ["language"],
        tool: ["tool"],
        "weapon-mastery": ["weapon-mastery"],
      };
      decision.selections.forEach((selection, index) => {
        if (!allowedKinds[decision.selectionKind].includes(selection.kind)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["selections", index, "kind"],
            message: `${decision.selectionKind} decision cannot select ${selection.kind}`,
          });
        }
      });
    }
    if (
      decision.type === "spell-selection" &&
      new Set(decision.spellVersionKeys).size !== decision.spellVersionKeys.length
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["spellVersionKeys"],
        message: "Spell decision cannot select the same version more than once",
      });
    }
    if (
      decision.type === "magic-initiate-selection" &&
      new Set(decision.cantripVersionKeys).size !== decision.cantripVersionKeys.length
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cantripVersionKeys"],
        message: "Magic Initiate cannot select the same cantrip more than once",
      });
    }
    if (
      decision.type === "tiefling-legacy-selection" &&
      new Set(decision.spellVersionKeys).size !== decision.spellVersionKeys.length
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["spellVersionKeys"],
        message: "Tiefling legacy cannot select the same spell more than once",
      });
    }
    if (
      decision.type === "elf-lineage-selection" &&
      new Set(decision.spellVersionKeys).size !== decision.spellVersionKeys.length
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["spellVersionKeys"],
        message: "Elf lineage cannot select the same spell more than once",
      });
    }
    if (
      decision.type === "species-spell-bundle-selection" &&
      new Set(decision.spellVersionKeys).size !== decision.spellVersionKeys.length
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["spellVersionKeys"],
        message: "Species spell bundle cannot repeat a spell",
      });
    }
    if (decision.type === "tiefling-legacy-selection") {
      const expectedResistance = {
        abyssal: "Poison",
        chthonic: "Necrotic",
        infernal: "Fire",
      }[decision.legacy];
      if (decision.resistance !== expectedResistance) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["resistance"],
          message: `${decision.legacy} legacy requires ${expectedResistance} resistance`,
        });
      }
    }
  },
);

export type CharacterDecision = z.infer<typeof CharacterDecisionSchema>;

export const CharacterLevelSchema = z
  .object({
    characterLevel: z.number().int().min(1).max(20),
    classLevel: z.number().int().min(1).max(20),
    classRef: ExactRuleRefSchema.refine(
      (ref) => ref.kind === "class",
      "Level must reference a class",
    ),
    provenance: z.enum(["native", "imported-single-class", "imported-reviewed-multiclass"]),
  })
  .strict();

export const CharacterSpellSelectionSchema = z
  .object({
    id: Identifier,
    spellRef: ExactRuleRefSchema.refine(
      (ref) => ref.kind === "spell",
      "Selection must reference a spell",
    ),
    spellLevel: z.number().int().min(0).max(9),
    classVersionKey: Identifier.nullable(),
    grantSourceRef: ExactRuleRefSchema.nullable(),
    castingAbility: AbilitySchema.nullable(),
    mode: z.enum(["cantrip", "known", "prepared", "always-prepared", "granted"]),
    active: z.boolean(),
    selectedAtCharacterLevel: z.number().int().min(1).max(20).nullable(),
    provenance: z.enum(["native", "imported", "derived", "custom"]),
    decisionId: Identifier.nullable(),
  })
  .strict()
  .superRefine((spell, context) => {
    if ((spell.classVersionKey === null) === (spell.grantSourceRef === null)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["grantSourceRef"],
        message: "Spell must have exactly one class or grant source",
      });
    }
    if (spell.mode === "cantrip" && spell.spellLevel !== 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["spellLevel"],
        message: "Cantrip selection must have spell level 0",
      });
    }
    if (spell.spellLevel === 0 && !["cantrip", "granted"].includes(spell.mode)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mode"],
        message: "Level-0 spells must use cantrip or granted mode",
      });
    }
  });

export const CharacterOverrideSchema = z.discriminatedUnion("type", [
  z
    .object({
      id: Identifier,
      type: z.literal("ability-adjustment"),
      ability: AbilitySchema,
      amount: z.number().int().min(-20).max(20),
      reason: NonEmptyString,
    })
    .strict(),
  z
    .object({
      id: Identifier,
      type: z.literal("rule-grant"),
      grantedRef: ExactRuleRefSchema,
      reason: NonEmptyString,
    })
    .strict(),
  z
    .object({
      id: Identifier,
      type: z.literal("rule-suppression"),
      suppressedVersionKey: Identifier,
      reason: NonEmptyString,
    })
    .strict(),
  z
    .object({
      id: Identifier,
      type: z.literal("resource-limit"),
      resourceKey: Identifier,
      maximum: z.number().int().min(0),
      reason: NonEmptyString,
    })
    .strict(),
]);

export const CharacterBuildSchema = z
  .object({
    schemaVersion: z.literal(CHARACTER_SCHEMA_VERSION),
    revision: z.number().int().min(1),
    rulesContext: z
      .object({
        generation: z.literal(RULES_GENERATION),
        policyId: Identifier,
        catalogRevision: Identifier,
      })
      .strict(),
    speciesRef: ExactRuleRefSchema.refine((ref) => ref.kind === "species"),
    backgroundRef: ExactRuleRefSchema.refine((ref) => ref.kind === "background"),
    abilityBasis: z
      .object({
        method: z.enum(["standard-array", "point-buy", "rolled", "imported-baseline"]),
        baseScores: AbilityScoresSchema,
        verified: z.boolean(),
      })
      .strict(),
    levels: z.array(CharacterLevelSchema).min(1).max(20),
    subclasses: z.array(
      z
        .object({
          classVersionKey: Identifier,
          subclassRef: ExactRuleRefSchema.refine((ref) => ref.kind === "subclass"),
          selectedAtCharacterLevel: z.number().int().min(1).max(20).nullable(),
        })
        .strict(),
    ),
    decisions: z.array(CharacterDecisionSchema),
    spells: z.array(CharacterSpellSelectionSchema),
    overrides: z.array(CharacterOverrideSchema),
  })
  .strict();

export type CharacterBuild = z.infer<typeof CharacterBuildSchema>;

export const HitPointLedgerSchema = z
  .object({
    baseline: z
      .object({
        throughCharacterLevel: z.number().int().min(1).max(20),
        maximum: z.number().int().min(1),
        method: z.enum(["native-first-level", "imported-baseline"]),
        verified: z.boolean(),
      })
      .strict(),
    gains: z.array(
      z
        .object({
          characterLevel: z.number().int().min(2).max(20),
          method: z.enum(["fixed", "rolled"]),
          hitDieContribution: z.number().int().min(1).max(20),
          constitutionModifier: z.number().int().min(-5).max(10),
          bonuses: z.array(
            z
              .object({
                sourceRef: ExactRuleRefSchema.nullable(),
                label: NonEmptyString,
                amount: z.number().int().min(-50).max(50),
              })
              .strict(),
          ),
          total: z.number().int().min(1).max(100),
        })
        .strict()
        .superRefine((gain, context) => {
          const expected =
            gain.hitDieContribution +
            gain.constitutionModifier +
            gain.bonuses.reduce((sum, bonus) => sum + bonus.amount, 0);
          if (gain.total !== Math.max(1, expected)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["total"],
              message: `Expected HP gain ${Math.max(1, expected)}`,
            });
          }
        }),
    ),
  })
  .strict();

export type HitPointLedger = z.infer<typeof HitPointLedgerSchema>;

export function maximumHitPoints(ledger: HitPointLedger): number {
  return ledger.baseline.maximum + ledger.gains.reduce((sum, gain) => sum + gain.total, 0);
}

export const CharacterResourceSchema = z
  .object({
    key: Identifier,
    sourceVersionKey: Identifier.nullable(),
    label: NonEmptyString,
    current: z.number().int().min(0),
    maximum: z.number().int().min(0),
    recovery: z.enum(["short-rest", "long-rest", "dawn", "manual"]),
  })
  .strict()
  .refine((resource) => resource.current <= resource.maximum, {
    path: ["current"],
    message: "Resource current value cannot exceed maximum",
  });

export const CharacterLiveStateSchema = z
  .object({
    revision: z.number().int().min(0),
    currentHp: z.number().int().min(0),
    temporaryHp: z.number().int().min(0),
    inspiration: z.boolean(),
    exhaustion: z.number().int().min(0).max(6),
    deathSaves: z
      .object({
        successes: z.number().int().min(0).max(3),
        failures: z.number().int().min(0).max(3),
        stabilized: z.boolean(),
      })
      .strict(),
    resources: z.array(CharacterResourceSchema),
    conditions: z.array(
      z
        .object({
          id: Identifier,
          conditionRef: ExactRuleRefSchema.nullable(),
          label: NonEmptyString,
          sourceLabel: NonEmptyString.nullable(),
          appliedByUserId: Identifier.nullable(),
        })
        .strict(),
    ),
  })
  .strict();

export type CharacterLiveState = z.infer<typeof CharacterLiveStateSchema>;

export const CharacterItemSchema = z
  .object({
    id: Identifier,
    definitionRef: ExactRuleRefSchema.nullable(),
    name: NonEmptyString,
    quantity: z.number().int().min(1),
    equipped: z.boolean(),
    attuned: z.boolean(),
    containerId: Identifier.nullable(),
    provenance: z.enum(["native", "imported", "custom"]),
    charges: CharacterResourceSchema.nullable(),
  })
  .strict();

export const CharacterIdentitySchema = z
  .object({
    id: Identifier,
    campaignId: Identifier,
    ownerUserId: Identifier,
    name: NonEmptyString,
    avatarUrl: z.string().url().nullable(),
    externalRefs: z.array(z.object({ system: z.enum(["ddb"]), id: Identifier }).strict()),
  })
  .strict();

export const CharacterProfileSchema = z
  .object({
    alignment: z.string().trim().min(1).nullable(),
    personalityTraits: z.string(),
    ideals: z.string(),
    bonds: z.string(),
    flaws: z.string(),
    appearance: z.string(),
    backstory: z.string(),
    allies: z.string(),
    enemies: z.string(),
    organizations: z.string(),
    notes: z.string(),
    currencies: z
      .object({
        cp: z.number().int().min(0),
        sp: z.number().int().min(0),
        ep: z.number().int().min(0),
        gp: z.number().int().min(0),
        pp: z.number().int().min(0),
      })
      .strict(),
  })
  .strict();

export const ImportedCapabilitySchema = z
  .object({
    id: Identifier,
    kind: z.enum([
      "language",
      "tool",
      "armor-proficiency",
      "weapon-proficiency",
      "resistance",
      "immunity",
      "vulnerability",
      "condition-immunity",
      "sense",
    ]),
    label: NonEmptyString,
    value: z.number().int().min(0).nullable(),
    sourceRef: ExactRuleRefSchema.nullable(),
    status: z.literal("imported-unreconciled"),
  })
  .strict();

export const MigrationBaselineSchema = z
  .object({
    sourceSystem: z.literal("ddb"),
    capabilities: z.array(ImportedCapabilitySchema),
  })
  .strict();

export const CharacterResolutionSchema = z.discriminatedUnion("type", [
  z
    .object({
      id: Identifier,
      type: z.literal("exclude-imported-definition"),
      sourceSystem: z.literal("ddb"),
      sourceDefinitionId: Identifier,
      reason: NonEmptyString,
    })
    .strict(),
  z
    .object({
      id: Identifier,
      type: z.literal("content-version-decision"),
      importedVersionKey: Identifier,
      resolution: z.enum(["retain-imported", "accept-matched-version", "replace-with-current"]),
      selectedVersionKey: Identifier,
      reason: NonEmptyString,
      decidedByUserId: Identifier,
    })
    .strict(),
  z
    .object({
      id: Identifier,
      type: z.literal("capability-baseline-reconciled"),
      baselineCapabilityId: Identifier,
      capabilityKind: z.enum([
        "armor-proficiency",
        "weapon-proficiency",
        "tool",
        "language",
        "resistance",
        "immunity",
        "vulnerability",
        "condition-immunity",
        "sense",
      ]),
      label: NonEmptyString,
      value: z.number().int().min(0).nullable(),
      sourceVersionKey: Identifier,
      method: z.literal("exact-fixed-rule-match"),
    })
    .strict(),
  z
    .object({
      id: Identifier,
      type: z.literal("capability-choice-confirmed"),
      requirementId: Identifier,
      decisionId: Identifier,
      baselineCapabilityId: Identifier,
      capabilityKind: z.enum(["tool", "language", "resistance"]),
      selectedVersionKey: Identifier,
      sourceVersionKey: Identifier,
      decidedByUserId: Identifier,
      method: z.literal("owner-confirmed-rule-choice"),
    })
    .strict(),
  z
    .object({
      id: Identifier,
      type: z.literal("magic-initiate-import-confirmed"),
      decisionId: Identifier,
      sourceVersionKey: Identifier,
      importedSpellIds: z.array(Identifier).length(3),
      decidedByUserId: Identifier,
    })
    .strict(),
  z
    .object({
      id: Identifier,
      type: z.literal("tiefling-legacy-import-confirmed"),
      decisionId: Identifier,
      sourceVersionKey: Identifier,
      baselineResistanceId: Identifier,
      importedSpellIds: z.array(Identifier).length(4),
      decidedByUserId: Identifier,
    })
    .strict(),
  z
    .object({
      id: Identifier,
      type: z.literal("elf-lineage-import-confirmed"),
      decisionId: Identifier,
      sourceVersionKey: Identifier,
      importedSpellIds: z.array(Identifier).length(3),
      decidedByUserId: Identifier,
    })
    .strict(),
  z
    .object({
      id: Identifier,
      type: z.literal("species-spell-bundle-import-confirmed"),
      decisionId: Identifier,
      sourceVersionKey: Identifier,
      importedSpellIds: z.array(Identifier).min(1),
      decidedByUserId: Identifier,
    })
    .strict(),
]);

export const CharacterAggregateSchema = z
  .object({
    identity: CharacterIdentitySchema,
    profile: CharacterProfileSchema,
    build: CharacterBuildSchema,
    hitPoints: HitPointLedgerSchema,
    liveState: CharacterLiveStateSchema,
    items: z.array(CharacterItemSchema),
    migrationBaseline: MigrationBaselineSchema.nullable(),
    resolutions: z.array(CharacterResolutionSchema),
    migrationIssues: z.array(
      z
        .object({
          code: Identifier,
          severity: z.enum(["info", "warning", "blocking"]),
          message: NonEmptyString,
        })
        .strict(),
    ),
  })
  .strict()
  .superRefine((character, context) => {
    const levelCount = character.build.levels.length;
    const classCounts = new Map<string, number>();
    const classVersionKeys = new Set<string>();
    character.build.levels.forEach((level, index) => {
      const expectedCharacterLevel = index + 1;
      if (level.characterLevel !== expectedCharacterLevel) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["build", "levels", index, "characterLevel"],
          message: `Expected contiguous character level ${expectedCharacterLevel}`,
        });
      }
      const expectedClassLevel = (classCounts.get(level.classRef.versionKey) ?? 0) + 1;
      if (level.classLevel !== expectedClassLevel) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["build", "levels", index, "classLevel"],
          message: `Expected contiguous class level ${expectedClassLevel}`,
        });
      }
      classCounts.set(level.classRef.versionKey, expectedClassLevel);
      classVersionKeys.add(level.classRef.versionKey);
    });

    const ids = (values: Array<{ id: string }>, path: string) => {
      const seen = new Set<string>();
      values.forEach((value, index) => {
        if (seen.has(value.id)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [path, index, "id"],
            message: `${path} IDs must be unique`,
          });
        }
        seen.add(value.id);
      });
      return seen;
    };
    const decisionIds = ids(character.build.decisions, "build.decisions");
    const decisionsById = new Map(
      character.build.decisions.map((decision) => [decision.id, decision]),
    );
    ids(character.build.spells, "build.spells");
    const itemIds = ids(character.items, "items");
    ids(character.liveState.conditions, "liveState.conditions");
    if (character.migrationBaseline) {
      ids(character.migrationBaseline.capabilities, "migrationBaseline.capabilities");
    }
    ids(character.resolutions, "resolutions");

    character.resolutions.forEach((resolution, index) => {
      const decision = "decisionId" in resolution ? decisionsById.get(resolution.decisionId) : null;
      if (
        resolution.type === "capability-choice-confirmed" &&
        (decision?.type !== "rule-selection" ||
          decision.selectionKind !==
            (resolution.capabilityKind === "resistance"
              ? "feature-option"
              : resolution.capabilityKind) ||
          decision.sourceRef?.versionKey !== resolution.sourceVersionKey ||
          !decision.selections.some(
            (selection) => selection.versionKey === resolution.selectedVersionKey,
          ))
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["resolutions", index, "decisionId"],
          message: "Confirmed capability choice does not match its authoritative decision",
        });
      }
      if (
        resolution.type === "magic-initiate-import-confirmed" &&
        (decision?.type !== "magic-initiate-selection" ||
          decision.sourceRef.versionKey !== resolution.sourceVersionKey)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["resolutions", index, "decisionId"],
          message: "Magic Initiate resolution does not match its authoritative decision",
        });
      }
      if (
        resolution.type === "tiefling-legacy-import-confirmed" &&
        (decision?.type !== "tiefling-legacy-selection" ||
          decision.sourceRef.versionKey !== resolution.sourceVersionKey)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["resolutions", index, "decisionId"],
          message: "Tiefling legacy resolution does not match its authoritative decision",
        });
      }
      if (
        resolution.type === "elf-lineage-import-confirmed" &&
        (decision?.type !== "elf-lineage-selection" ||
          decision.sourceRef.versionKey !== resolution.sourceVersionKey)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["resolutions", index, "decisionId"],
          message: "Elf lineage resolution does not match its authoritative decision",
        });
      }
      if (
        resolution.type === "species-spell-bundle-import-confirmed" &&
        (decision?.type !== "species-spell-bundle-selection" ||
          decision.sourceRef.versionKey !== resolution.sourceVersionKey)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["resolutions", index, "decisionId"],
          message: "Species spell bundle resolution does not match its authoritative decision",
        });
      }
    });

    character.build.subclasses.forEach((subclass, index) => {
      if (!classVersionKeys.has(subclass.classVersionKey)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["build", "subclasses", index, "classVersionKey"],
          message: "Subclass references a class version the character does not have",
        });
      }
      if (
        subclass.selectedAtCharacterLevel !== null &&
        subclass.selectedAtCharacterLevel > levelCount
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["build", "subclasses", index, "selectedAtCharacterLevel"],
          message: "Subclass cannot be selected above the current character level",
        });
      }
    });
    character.build.decisions.forEach((decision, index) => {
      if (decision.madeAtCharacterLevel !== null && decision.madeAtCharacterLevel > levelCount) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["build", "decisions", index, "madeAtCharacterLevel"],
          message: "Decision cannot be made above the current character level",
        });
      }
    });
    character.build.spells.forEach((spell, index) => {
      if (spell.classVersionKey !== null && !classVersionKeys.has(spell.classVersionKey)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["build", "spells", index, "classVersionKey"],
          message: "Spell selection references a class version the character does not have",
        });
      }
      if (spell.decisionId !== null && !decisionIds.has(spell.decisionId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["build", "spells", index, "decisionId"],
          message: "Spell selection references an unknown decision",
        });
      }
      if (spell.selectedAtCharacterLevel !== null && spell.selectedAtCharacterLevel > levelCount) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["build", "spells", index, "selectedAtCharacterLevel"],
          message: "Spell cannot be selected above the current character level",
        });
      }
      if (spell.decisionId !== null) {
        const decision = decisionsById.get(spell.decisionId);
        const matchesClassDecision =
          decision?.type === "spell-selection" &&
          spell.classVersionKey !== null &&
          decision.classVersionKey === spell.classVersionKey &&
          decision.selectionMode === spell.mode &&
          decision.spellVersionKeys.includes(spell.spellRef.versionKey);
        const matchesMagicInitiate =
          decision?.type === "magic-initiate-selection" &&
          spell.classVersionKey === null &&
          spell.grantSourceRef?.versionKey === decision.sourceRef.versionKey &&
          spell.castingAbility === decision.castingAbility &&
          spell.mode === "granted" &&
          (spell.spellLevel === 0
            ? decision.cantripVersionKeys.includes(spell.spellRef.versionKey)
            : spell.spellLevel === 1 &&
              decision.levelOneSpellVersionKey === spell.spellRef.versionKey);
        const matchesTieflingLegacy =
          decision?.type === "tiefling-legacy-selection" &&
          spell.classVersionKey === null &&
          spell.grantSourceRef?.versionKey === decision.sourceRef.versionKey &&
          spell.castingAbility === decision.castingAbility &&
          spell.mode === "granted" &&
          decision.spellVersionKeys.includes(spell.spellRef.versionKey);
        const matchesElfLineage =
          decision?.type === "elf-lineage-selection" &&
          spell.classVersionKey === null &&
          spell.grantSourceRef?.versionKey === decision.sourceRef.versionKey &&
          spell.castingAbility === decision.castingAbility &&
          spell.mode === "granted" &&
          decision.spellVersionKeys.includes(spell.spellRef.versionKey);
        const matchesSpeciesBundle =
          decision?.type === "species-spell-bundle-selection" &&
          spell.classVersionKey === null &&
          spell.grantSourceRef?.versionKey === decision.sourceRef.versionKey &&
          spell.castingAbility === decision.castingAbility &&
          spell.mode === "granted" &&
          decision.spellVersionKeys.includes(spell.spellRef.versionKey);
        if (
          !matchesClassDecision &&
          !matchesMagicInitiate &&
          !matchesTieflingLegacy &&
          !matchesElfLineage &&
          !matchesSpeciesBundle
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["build", "spells", index, "decisionId"],
            message: "Spell selection does not match its typed decision",
          });
        }
      }
    });
    character.build.decisions.forEach((decision, index) => {
      if (decision.type === "spell-selection" && !classVersionKeys.has(decision.classVersionKey)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["build", "decisions", index, "classVersionKey"],
          message: "Spell decision references a class version the character does not have",
        });
      }
      const versionKeys =
        decision.type === "spell-selection"
          ? decision.spellVersionKeys
          : decision.type === "magic-initiate-selection"
            ? [...decision.cantripVersionKeys, decision.levelOneSpellVersionKey]
            : decision.type === "tiefling-legacy-selection"
              ? decision.spellVersionKeys
              : decision.type === "elf-lineage-selection"
                ? decision.spellVersionKeys
                : decision.type === "species-spell-bundle-selection"
                  ? decision.spellVersionKeys
                  : [];
      for (const versionKey of versionKeys) {
        const selection = character.build.spells.find(
          (spell) => spell.decisionId === decision.id && spell.spellRef.versionKey === versionKey,
        );
        if (!selection) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["build", "decisions", index, "spellVersionKeys"],
            message: "Spell decision is missing its authoritative spell selection",
          });
        }
      }
    });

    const baselineLevel = character.hitPoints.baseline.throughCharacterLevel;
    if (baselineLevel > levelCount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hitPoints", "baseline", "throughCharacterLevel"],
        message: "HP baseline cannot extend above current level",
      });
    }
    character.hitPoints.gains.forEach((gain, index) => {
      const expectedLevel = baselineLevel + index + 1;
      if (gain.characterLevel !== expectedLevel) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["hitPoints", "gains", index, "characterLevel"],
          message: `Expected HP gain for character level ${expectedLevel}`,
        });
      }
    });
    if (baselineLevel + character.hitPoints.gains.length !== levelCount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hitPoints", "gains"],
        message: "HP ledger must account for every character level",
      });
    }
    const maximumHp = maximumHitPoints(character.hitPoints);
    if (character.liveState.currentHp > maximumHp) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["liveState", "currentHp"],
        message: `Current HP cannot exceed derived maximum HP ${maximumHp}`,
      });
    }

    const resourceKeys = new Set<string>();
    character.liveState.resources.forEach((resource, index) => {
      if (resourceKeys.has(resource.key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["liveState", "resources", index, "key"],
          message: "Live resource keys must be unique",
        });
      }
      resourceKeys.add(resource.key);
    });
    character.items.forEach((item, index) => {
      if (item.containerId !== null && !itemIds.has(item.containerId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "containerId"],
          message: "Item container does not exist",
        });
      }
      if (item.containerId === item.id) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "containerId"],
          message: "Item cannot contain itself",
        });
      }
    });
    const containers = new Map(character.items.map((item) => [item.id, item.containerId]));
    character.items.forEach((item, index) => {
      const seen = new Set<string>([item.id]);
      let containerId = item.containerId;
      while (containerId !== null) {
        if (seen.has(containerId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["items", index, "containerId"],
            message: "Item containers cannot form a cycle",
          });
          break;
        }
        seen.add(containerId);
        containerId = containers.get(containerId) ?? null;
      }
    });
  });

export type CharacterAggregate = z.infer<typeof CharacterAggregateSchema>;
