import { z } from "zod";
import { authoritativeAttunementCapacityForFeature } from "./attunement-capacity";
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
    compatibility: z.enum([
      "core-2024",
      "current-2024-compatible",
      "legacy-5e-compatible",
      "legacy",
      "custom",
    ]),
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
        message: "Only core or current 2024-era content can be verified",
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
      if (total !== 2) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["increases"],
          message: "An ability-score decision must grant exactly two points",
        });
      }
    }
    if (decision.type === "rule-selection") {
      const selectionVersionKeys = new Set<string>();
      decision.selections.forEach((selection, index) => {
        if (selectionVersionKeys.has(selection.versionKey)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["selections", index],
            message: "Rule-selection decisions cannot repeat a selection",
          });
        }
        selectionVersionKeys.add(selection.versionKey);
      });
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
    active: z.literal(true),
    selectedAtCharacterLevel: z.number().int().min(1).max(20).nullable(),
    provenance: z.enum(["native", "imported", "derived", "custom"]),
    decisionId: Identifier.nullable(),
    details: z
      .object({
        sourceSystem: z.literal("ddb"),
        provenance: z.literal("imported-current-sheet"),
        spellLevel: z.number().int().min(0).max(9),
        description: z.string(),
        school: z.string(),
        activation: z
          .object({
            activationTime: z.number().int().min(0),
            activationType: z.number().int().min(0),
          })
          .strict()
          .nullable(),
        range: z
          .object({
            origin: z.string(),
            rangeValue: z.number().min(0).nullable(),
            aoeType: z.string().nullable(),
            aoeValue: z.number().min(0).nullable(),
          })
          .strict()
          .nullable(),
        duration: z
          .object({
            durationType: z.string(),
            durationInterval: z.number().min(0).nullable(),
            durationUnit: z.string().nullable(),
          })
          .strict()
          .nullable(),
        components: z.array(z.number().int().min(0)),
        componentsDescription: z.string(),
        concentration: z.boolean(),
        ritual: z.boolean(),
        limitedUse: z
          .object({ maximum: z.number().int().min(1), recovery: NonEmptyString })
          .strict()
          .nullable(),
      })
      .strict()
      .nullable()
      .default(null),
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
    if (spell.classVersionKey !== null && spell.castingAbility !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["castingAbility"],
        message: "Class spell selections derive casting ability from their class",
      });
    }
    if (spell.grantSourceRef !== null && spell.mode !== "granted") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mode"],
        message: "Granted spell selections must use granted mode",
      });
    }
    if (spell.mode === "cantrip" && spell.spellLevel !== 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["spellLevel"],
        message: "Cantrip selection must have spell level 0",
      });
    }
    if (spell.details !== null && spell.details.spellLevel !== spell.spellLevel) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["details", "spellLevel"],
        message: "Imported spell detail level must match stored spell level",
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
        currentSheetConfirmation: z
          .object({
            method: z.literal("ddb-current-sheet"),
            status: z.literal("owner-confirmed"),
            sourceSystem: z.literal("ddb"),
          })
          .strict()
          .optional(),
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
    attunementCapacity: z
      .object({
        baseline: z
          .object({
            maximum: z.literal(3),
            basis: z.literal("rules-policy-default"),
          })
          .strict(),
        replacements: z.array(
          z
            .object({
              sourceRef: ExactRuleRefSchema,
              maximum: z.number().int().min(0),
            })
            .strict(),
        ),
      })
      .strict()
      .default({
        baseline: { maximum: 3, basis: "rules-policy-default" },
        replacements: [],
      }),
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
        currentSheetConfirmation: z
          .object({
            method: z.literal("ddb-current-sheet"),
            status: z.literal("owner-confirmed"),
            sourceSystem: z.literal("ddb"),
          })
          .strict()
          .optional(),
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
    additionalSourceVersionKeys: z.array(Identifier).default([]),
    provenance: z
      .enum(["verified-rule", "imported-unverified", "custom"])
      .default("imported-unverified"),
    label: NonEmptyString,
    current: z.number().int().min(0),
    maximum: z.number().int().min(0),
    recovery: z.enum(["short-rest", "long-rest", "dawn", "manual"]),
    recoveryRules: z
      .array(
        z
          .object({
            trigger: z.enum(["short-rest", "long-rest", "dawn", "manual"]),
            restore: z.discriminatedUnion("type", [
              z.object({ type: z.literal("all") }).strict(),
              z.object({ type: z.literal("fixed"), amount: z.number().int().min(1) }).strict(),
            ]),
          })
          .strict(),
      )
      .default([]),
  })
  .strict()
  .refine((resource) => resource.current <= resource.maximum, {
    path: ["current"],
    message: "Resource current value cannot exceed maximum",
  })
  .refine(
    (resource) => resource.provenance !== "verified-rule" || resource.sourceVersionKey !== null,
    {
      path: ["sourceVersionKey"],
      message: "Verified rule resources require an exact source version",
    },
  )
  .superRefine((resource, context) => {
    const sourceKeys = new Set(resource.additionalSourceVersionKeys);
    if (sourceKeys.size !== resource.additionalSourceVersionKeys.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["additionalSourceVersionKeys"],
        message: "Additional resource source versions must be unique",
      });
    }
    if (resource.sourceVersionKey && sourceKeys.has(resource.sourceVersionKey)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["additionalSourceVersionKeys"],
        message: "Primary resource source cannot be repeated as an additional source",
      });
    }
    const triggers = resource.recoveryRules.map((rule) => rule.trigger);
    if (new Set(triggers).size !== triggers.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recoveryRules"],
        message: "A resource can have only one recovery rule per trigger",
      });
    }
    if (resource.provenance === "verified-rule") {
      if (resource.recoveryRules.length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["recoveryRules"],
          message: "Verified rule resources require structured recovery rules",
        });
      }
      if (
        !resource.recoveryRules.some(
          (rule) => rule.trigger === resource.recovery && rule.restore.type === "all",
        )
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["recovery"],
          message: "Primary recovery must identify a full structured recovery rule",
        });
      }
    }
  });

export const CharacterHitDiceStateSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("unavailable"),
      reason: NonEmptyString,
    })
    .strict(),
  z
    .object({
      status: z.literal("tracked"),
      pools: z.array(
        z
          .object({
            classVersionKey: Identifier,
            die: z.number().int().min(4).max(20),
            remaining: z.number().int().min(0),
            maximum: z.number().int().min(1),
            provenance: z.enum(["native", "imported-unverified"]),
          })
          .strict()
          .refine((pool) => pool.remaining <= pool.maximum, {
            path: ["remaining"],
            message: "Remaining hit dice cannot exceed maximum",
          }),
      ),
    })
    .strict(),
]);

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
    hitDice: CharacterHitDiceStateSchema.default({
      status: "unavailable",
      reason: "Persisted V3 snapshot predates hit-die tracking",
    }),
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
  .strict()
  .superRefine((state, context) => {
    const saves = state.deathSaves;
    if (state.currentHp > 0) {
      if (saves.successes !== 0 || saves.failures !== 0 || saves.stabilized) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["deathSaves"],
          message: "A character with Hit Points must have a clear death-save state",
        });
      }
      return;
    }
    if (saves.successes === 3) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deathSaves", "successes"],
        message: "Three successes must transition to the stable state",
      });
    }
    if (saves.stabilized && (saves.successes !== 0 || saves.failures !== 0)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deathSaves"],
        message: "A stable character must have cleared death-save marks",
      });
    }
  });

export type CharacterLiveState = z.infer<typeof CharacterLiveStateSchema>;

export const CharacterItemSchema = z
  .object({
    id: Identifier,
    definitionRef: ExactRuleRefSchema.nullable(),
    name: NonEmptyString,
    quantity: z.number().int().min(1),
    equipped: z.boolean(),
    attuned: z.boolean(),
    attunementRequirement: z
      .object({
        status: z.enum(["required", "not-required", "unknown"]),
        conditions: z.string().nullable(),
        provenance: z.enum(["verified-rule", "imported-current-sheet", "unspecified"]),
      })
      .strict()
      .default({ status: "unknown", conditions: null, provenance: "unspecified" }),
    containerId: Identifier.nullable(),
    provenance: z.enum(["native", "imported", "custom"]),
    charges: CharacterResourceSchema.nullable(),
    details: z
      .discriminatedUnion("sourceSystem", [
        z
          .object({
            sourceSystem: z.literal("ddb"),
            provenance: z.literal("imported-current-sheet"),
            type: z.string(),
            rarity: z.string().nullable(),
            magic: z.boolean(),
            weight: z.number().min(0).nullable(),
            description: z.string(),
            snippet: z.string(),
            cost: z.number().min(0).nullable(),
            damage: z.string().nullable(),
            properties: z.array(z.string()),
            armorClass: z.number().int().min(0).nullable(),
            armorTypeId: z.number().int().min(0).nullable(),
          })
          .strict(),
        z
          .object({
            sourceSystem: z.literal("rules-catalog"),
            provenance: z.literal("verified-rule"),
            type: z.string(),
            rarity: z.string().nullable(),
            magic: z.boolean(),
            weight: z.number().min(0).nullable(),
            description: z.string(),
            snippet: z.string(),
            cost: z.number().min(0).nullable(),
            damage: z.string().nullable(),
            properties: z.array(z.string()),
            armorClass: z.number().int().min(0).nullable(),
            armorTypeId: z.number().int().min(0).nullable(),
          })
          .strict(),
      ])
      .nullable()
      .default(null),
  })
  .strict()
  .superRefine((item, context) => {
    if (item.details?.sourceSystem === "rules-catalog" && item.definitionRef === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["definitionRef"],
        message: "Verified catalogue item details require an exact item rule reference",
      });
    }
  });

export const CharacterCompanionSchema = z
  .object({
    id: Identifier,
    sourceSystem: z.literal("ddb"),
    provenance: z.literal("imported-current-sheet"),
    name: z.string().trim().min(1).nullable(),
    description: z.string().nullable(),
    liveState: z
      .object({
        active: z.boolean(),
        removedHitPoints: z.number().int().min(0),
        temporaryHitPoints: z.number().int().min(0),
      })
      .strict(),
    definition: z
      .object({
        upstreamId: Identifier,
        name: NonEmptyString,
        armorClass: z.number().int().min(0),
        armorClassDescription: z.string().nullable(),
        averageHitPoints: z.number().int().min(0),
        hitPointDice: z
          .object({
            diceCount: z.number().int().min(0),
            diceValue: z.number().int().min(1),
            diceString: z.string(),
          })
          .strict()
          .nullable(),
        movements: z.array(
          z
            .object({
              movementId: z.number().int(),
              speed: z.number().int().min(0),
              notes: z.string(),
            })
            .strict(),
        ),
        passivePerception: z.number().int().min(0),
        avatarUrl: z.string().nullable(),
        stats: z.array(
          z
            .object({ statId: z.number().int(), name: z.string().nullable(), value: z.number().int() })
            .strict(),
        ),
        senses: z.array(
          z.object({ senseId: z.number().int(), notes: z.string() }).strict(),
        ),
        specialTraitsDescription: z.string(),
        actionsDescription: z.string(),
        reactionsDescription: z.string(),
        bonusActionsDescription: z.string(),
        characteristicsDescription: z.string(),
        skills: z.array(z.object({ name: NonEmptyString, value: z.number().int() }).strict()),
        savingThrows: z.array(
          z.object({ name: NonEmptyString, value: z.number().int() }).strict(),
        ),
      })
      .strict(),
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

export const CharacterMovementSchema = z
  .object({
    sourceSystem: z.literal("ddb"),
    provenance: z.literal("imported-current-sheet"),
    walk: z.number().int().min(0).nullable(),
    special: z.array(
      z
        .object({
          type: z.enum(["Fly", "Swim", "Climb", "Burrow"]),
          value: z.number().int().min(0),
        })
        .strict(),
    ),
  })
  .strict();

export const CharacterArmorClassSchema = z
  .object({
    sourceSystem: z.literal("ddb"),
    provenance: z.literal("imported-current-sheet"),
    value: z.number().int().min(0).nullable(),
  })
  .strict();

export const CharacterInitiativeSchema = z
  .object({
    sourceSystem: z.literal("ddb"),
    provenance: z.literal("imported-current-sheet"),
    value: z.number().int().nullable(),
  })
  .strict();

export const CharacterPassiveScoresSchema = z
  .object({
    sourceSystem: z.literal("ddb"),
    provenance: z.literal("imported-current-sheet"),
    perception: z.number().int().min(0).nullable(),
    investigation: z.number().int().min(0).nullable(),
    insight: z.number().int().min(0).nullable(),
  })
  .strict();

export const CharacterSkillSnapshotSchema = z
  .object({
    key: Identifier,
    name: NonEmptyString,
    ability: z.enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"]),
    modifier: z.number().int(),
    proficiency: z.enum(["none", "half", "proficient", "expertise"]),
  })
  .strict();

export const CharacterSkillsSchema = z
  .object({
    sourceSystem: z.literal("ddb"),
    provenance: z.literal("imported-current-sheet"),
    values: z.array(CharacterSkillSnapshotSchema),
  })
  .strict();

export const CharacterSavingThrowSnapshotSchema = z
  .object({
    ability: z.enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"]),
    modifier: z.number().int(),
    proficiency: z.enum(["none", "proficient", "expertise"]),
  })
  .strict();

export const CharacterSavingThrowsSchema = z
  .object({
    sourceSystem: z.literal("ddb"),
    provenance: z.literal("imported-current-sheet"),
    values: z.array(CharacterSavingThrowSnapshotSchema),
  })
  .strict();

export const CharacterSpellcastingTotalsSchema = z
  .object({
    sourceSystem: z.literal("ddb"),
    provenance: z.literal("imported-current-sheet"),
    values: z.array(
      z
        .object({
          className: NonEmptyString,
          ability: z.enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"]),
          saveDc: z.number().int().min(0),
          attackBonus: z.number().int(),
        })
        .strict(),
    ),
  })
  .strict();

export const CharacterSenseSnapshotSchema = z
  .object({
    name: NonEmptyString,
    value: z.number().int().min(0).nullable(),
  })
  .strict();

export const CharacterSensesSchema = z
  .object({
    sourceSystem: z.literal("ddb"),
    provenance: z.literal("imported-current-sheet"),
    values: z.array(CharacterSenseSnapshotSchema),
  })
  .strict();

export const CharacterDefenseSnapshotSchema = z
  .object({
    type: z.enum(["resistance", "immunity", "vulnerability", "condition_immunity"]),
    damageType: NonEmptyString,
  })
  .strict();

export const CharacterDefensesSchema = z
  .object({
    sourceSystem: z.literal("ddb"),
    provenance: z.literal("imported-current-sheet"),
    values: z.array(CharacterDefenseSnapshotSchema),
  })
  .strict();

export const CharacterProficienciesSchema = z
  .object({
    sourceSystem: z.literal("ddb"),
    provenance: z.literal("imported-current-sheet"),
    languages: z.array(NonEmptyString),
    tools: z.array(NonEmptyString),
    armor: z.array(NonEmptyString),
    weapons: z.array(NonEmptyString),
  })
  .strict();

export const CharacterActionSnapshotSchema = z
  .object({
    name: NonEmptyString,
    source: NonEmptyString,
    description: z.string(),
    activation: z
      .object({
        activationType: z.number().int().min(0),
        activationTime: z.number().int().min(0).nullable(),
      })
      .strict()
      .nullable(),
    limitedUse: z
      .object({
        maximum: z.number().int().min(0),
        recovery: z.string(),
      })
      .strict()
      .nullable(),
  })
  .strict();

export const CharacterActionsSchema = z
  .object({
    sourceSystem: z.literal("ddb"),
    provenance: z.literal("imported-current-sheet"),
    values: z.array(CharacterActionSnapshotSchema),
  })
  .strict();

export const CharacterAttackSnapshotSchema = z
  .object({
    name: NonEmptyString,
    attackBonus: z.number().int(),
    damage: z.string(),
    damageType: z.string(),
    properties: z.array(z.string()),
    isWeapon: z.boolean(),
  })
  .strict();

export const CharacterAttacksSchema = z
  .object({
    sourceSystem: z.literal("ddb"),
    provenance: z.literal("imported-current-sheet"),
    values: z.array(CharacterAttackSnapshotSchema),
  })
  .strict();

export const CharacterFeatureSnapshotSchema = z
  .object({
    name: NonEmptyString,
    description: z.string(),
    source: z.enum(["class", "race", "background", "other", "feat"]),
    sourceName: NonEmptyString,
    level: z.number().int().min(0).nullable(),
    isUnlocked: z.boolean(),
  })
  .strict();

export const CharacterFeatSnapshotSchema = z
  .object({
    name: NonEmptyString,
    description: z.string(),
    choices: z.array(z.string()),
  })
  .strict();

export const CharacterFeaturesSchema = z
  .object({
    sourceSystem: z.literal("ddb"),
    provenance: z.literal("imported-current-sheet"),
    values: z.array(CharacterFeatureSnapshotSchema),
    feats: z.array(CharacterFeatSnapshotSchema),
  })
  .strict();

export const CharacterEncumbranceSchema = z
  .object({
    sourceSystem: z.literal("ddb"),
    provenance: z.literal("imported-current-sheet"),
    weightCarried: z.number().min(0).nullable(),
    carryingCapacity: z.number().min(0).nullable(),
  })
  .strict();

export const CharacterDemographicsSchema = z
  .object({
    sourceSystem: z.literal("ddb"),
    provenance: z.literal("imported-current-sheet"),
    gender: z.string(),
    age: z.string(),
    height: z.string(),
    weight: z.string(),
    eyes: z.string(),
    skin: z.string(),
    hair: z.string(),
  })
  .strict();

const CharacterNamedOptionSnapshotSchema = z
  .object({ name: NonEmptyString, description: z.string() })
  .strict();

export const CharacterSpecializationsSchema = z
  .object({
    sourceSystem: z.literal("ddb"),
    provenance: z.literal("imported-current-sheet"),
    activeArmorModel: z.string().trim().min(1).nullable(),
    activeInfusions: z.array(NonEmptyString),
    infusions: z.array(CharacterNamedOptionSnapshotSchema),
    metamagic: z.array(CharacterNamedOptionSnapshotSchema),
    totemAspects: z.array(CharacterNamedOptionSnapshotSchema),
    weaponMasteries: z.array(CharacterNamedOptionSnapshotSchema),
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
    movement: CharacterMovementSchema.default({
      sourceSystem: "ddb",
      provenance: "imported-current-sheet",
      walk: null,
      special: [],
    }),
    armorClass: CharacterArmorClassSchema.default({
      sourceSystem: "ddb",
      provenance: "imported-current-sheet",
      value: null,
    }),
    initiative: CharacterInitiativeSchema.default({
      sourceSystem: "ddb",
      provenance: "imported-current-sheet",
      value: null,
    }),
    passiveScores: CharacterPassiveScoresSchema.default({
      sourceSystem: "ddb",
      provenance: "imported-current-sheet",
      perception: null,
      investigation: null,
      insight: null,
    }),
    skills: CharacterSkillsSchema.default({
      sourceSystem: "ddb",
      provenance: "imported-current-sheet",
      values: [],
    }),
    savingThrows: CharacterSavingThrowsSchema.default({
      sourceSystem: "ddb",
      provenance: "imported-current-sheet",
      values: [],
    }),
    spellcastingTotals: CharacterSpellcastingTotalsSchema.default({
      sourceSystem: "ddb",
      provenance: "imported-current-sheet",
      values: [],
    }),
    senses: CharacterSensesSchema.default({
      sourceSystem: "ddb",
      provenance: "imported-current-sheet",
      values: [],
    }),
    defenses: CharacterDefensesSchema.default({
      sourceSystem: "ddb",
      provenance: "imported-current-sheet",
      values: [],
    }),
    proficiencies: CharacterProficienciesSchema.default({
      sourceSystem: "ddb",
      provenance: "imported-current-sheet",
      languages: [],
      tools: [],
      armor: [],
      weapons: [],
    }),
    actions: CharacterActionsSchema.default({
      sourceSystem: "ddb",
      provenance: "imported-current-sheet",
      values: [],
    }),
    attacks: CharacterAttacksSchema.default({
      sourceSystem: "ddb",
      provenance: "imported-current-sheet",
      values: [],
    }),
    features: CharacterFeaturesSchema.default({
      sourceSystem: "ddb",
      provenance: "imported-current-sheet",
      values: [],
      feats: [],
    }),
    encumbrance: CharacterEncumbranceSchema.default({
      sourceSystem: "ddb",
      provenance: "imported-current-sheet",
      weightCarried: null,
      carryingCapacity: null,
    }),
    demographics: CharacterDemographicsSchema.default({
      sourceSystem: "ddb",
      provenance: "imported-current-sheet",
      gender: "",
      age: "",
      height: "",
      weight: "",
      eyes: "",
      skin: "",
      hair: "",
    }),
    specializations: CharacterSpecializationsSchema.default({
      sourceSystem: "ddb",
      provenance: "imported-current-sheet",
      activeArmorModel: null,
      activeInfusions: [],
      infusions: [],
      metamagic: [],
      totemAspects: [],
      weaponMasteries: [],
    }),
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
    currentSheetConfirmation: z
      .object({
        method: z.literal("ddb-current-sheet"),
        status: z.literal("owner-confirmed"),
        sourceSystem: z.literal("ddb"),
      })
      .strict()
      .default({
        method: "ddb-current-sheet",
        status: "owner-confirmed",
        sourceSystem: "ddb",
      }),
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
      type: z.literal("foundation-baseline-confirmed"),
      method: z.literal("owner-attested-imported-baseline"),
      abilityScores: AbilityScoresSchema,
      hpMaximum: z.number().int().min(1),
      hpThroughCharacterLevel: z.number().int().min(1).max(20),
      reason: NonEmptyString,
      decidedByUserId: Identifier,
    })
    .strict(),
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
    companions: z.array(CharacterCompanionSchema).default([]),
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
    const attunementSources = new Set<string>();
    for (const [index, replacement] of character.build.attunementCapacity.replacements.entries()) {
      const authoritative = authoritativeAttunementCapacityForFeature(replacement.sourceRef);
      if (authoritative === null || authoritative !== replacement.maximum) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["build", "attunementCapacity", "replacements", index],
          message: "Attunement capacity replacement does not match authoritative feature semantics",
        });
      }
      if (attunementSources.has(replacement.sourceRef.versionKey)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["build", "attunementCapacity", "replacements", index, "sourceRef"],
          message: "Attunement capacity replacement sources must be unique",
        });
      }
      attunementSources.add(replacement.sourceRef.versionKey);
    }
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
    ids(character.companions, "companions");
    ids(character.liveState.conditions, "liveState.conditions");
    const liveConditionRefs = new Set<string>();
    character.liveState.conditions.forEach((condition, index) => {
      if (condition.conditionRef === null) return;
      if (condition.conditionRef.kind !== "condition") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["liveState", "conditions", index, "conditionRef"],
          message: "Live conditions must reference condition rules",
        });
      }
      if (liveConditionRefs.has(condition.conditionRef.versionKey)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["liveState", "conditions", index, "conditionRef"],
          message: "Live condition rule refs must be unique",
        });
      }
      liveConditionRefs.add(condition.conditionRef.versionKey);
    });
    if (character.migrationBaseline) {
      ids(character.migrationBaseline.capabilities, "migrationBaseline.capabilities");
    }
    ids(character.resolutions, "resolutions");

    const uniqueText = (values: string[], path: string, label: string) => {
      const seen = new Set<string>();
      values.forEach((value, index) => {
        const key = value.trim().toLowerCase();
        if (seen.has(key)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...path.split("."), index],
            message: `${label} must be unique`,
          });
        }
        seen.add(key);
      });
    };

    uniqueText(
      character.profile.skills.values.map((skill) => skill.key),
      "profile.skills.values",
      "Skill keys",
    );
    uniqueText(
      character.profile.senses.values.map((sense) => sense.name),
      "profile.senses.values",
      "Sense names",
    );
    uniqueText(
      character.profile.defenses.values.map(
        (defense) => `${defense.type}:${defense.damageType}`,
      ),
      "profile.defenses.values",
      "Defense entries",
    );
    for (const key of ["languages", "tools", "armor", "weapons"] as const) {
      uniqueText(
        character.profile.proficiencies[key],
        `profile.proficiencies.${key}`,
        `${key} proficiencies`,
      );
    }
    const saveAbilities = character.profile.savingThrows.values.map((save) => save.ability);
    uniqueText(saveAbilities, "profile.savingThrows.values", "Saving throw abilities");
    if (saveAbilities.length > 0 && saveAbilities.length !== 6) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["profile", "savingThrows", "values"],
        message: "An imported saving throw snapshot must contain all six abilities",
      });
    }
    uniqueText(
      character.profile.spellcastingTotals.values.map(
        (entry) => `${entry.className}:${entry.ability}`,
      ),
      "profile.spellcastingTotals.values",
      "Spellcasting class totals",
    );
    uniqueText(
      character.profile.specializations.activeInfusions,
      "profile.specializations.activeInfusions",
      "Active infusions",
    );
    for (const key of ["infusions", "metamagic", "totemAspects", "weaponMasteries"] as const) {
      uniqueText(
        character.profile.specializations[key].map((entry) => entry.name),
        `profile.specializations.${key}`,
        `${key} selections`,
      );
    }

    if (character.migrationBaseline) {
      const capabilityKey = (kind: string, label: string, value: number | null) =>
        `${kind}:${label.trim().toLowerCase()}:${value ?? "none"}`;
      const expectedCapabilities = new Set<string>();
      character.profile.proficiencies.languages.forEach((label) =>
        expectedCapabilities.add(capabilityKey("language", label, null)),
      );
      character.profile.proficiencies.tools.forEach((label) =>
        expectedCapabilities.add(capabilityKey("tool", label, null)),
      );
      character.profile.proficiencies.armor.forEach((label) =>
        expectedCapabilities.add(capabilityKey("armor-proficiency", label, null)),
      );
      character.profile.proficiencies.weapons.forEach((label) =>
        expectedCapabilities.add(capabilityKey("weapon-proficiency", label, null)),
      );
      character.profile.defenses.values.forEach((defense) =>
        expectedCapabilities.add(
          capabilityKey(
            defense.type === "condition_immunity" ? "condition-immunity" : defense.type,
            defense.damageType,
            null,
          ),
        ),
      );
      character.profile.senses.values.forEach((sense) =>
        expectedCapabilities.add(capabilityKey("sense", sense.name, sense.value)),
      );
      const actualCapabilities = new Set(
        character.migrationBaseline.capabilities.map((capability) =>
          capabilityKey(capability.kind, capability.label, capability.value),
        ),
      );
      if (
        expectedCapabilities.size > 0 &&
        [...actualCapabilities].some((key) => !expectedCapabilities.has(key))
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["migrationBaseline", "capabilities"],
          message: "Every unresolved capability baseline must be represented in the profile",
        });
      }
      if (actualCapabilities.size !== character.migrationBaseline.capabilities.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["migrationBaseline", "capabilities"],
          message: "Imported capability baseline cannot contain semantic duplicates",
        });
      }
    }

    let foundationResolutionSeen = false;
    const decisionResolutionKeys = new Set<string>();
    const excludedDefinitionKeys = new Set<string>();
    const contentVersionDecisionKeys = new Set<string>();
    const capabilityBaselineResolutionKeys = new Set<string>();
    character.resolutions.forEach((resolution, index) => {
      if (resolution.type === "foundation-baseline-confirmed") {
        if (foundationResolutionSeen) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["resolutions", index],
            message: "Foundation baseline can only be confirmed once",
          });
        }
        foundationResolutionSeen = true;
      } else if ("decisionId" in resolution) {
        const resolutionKey =
          resolution.type === "capability-choice-confirmed"
            ? `${resolution.type}:${resolution.decisionId}:${resolution.baselineCapabilityId}`
            : `${resolution.type}:${resolution.decisionId}`;
        if (decisionResolutionKeys.has(resolutionKey)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["resolutions", index, "decisionId"],
            message: "Decision-backed resolutions must be semantically unique",
          });
        }
        decisionResolutionKeys.add(resolutionKey);
      }
      if (resolution.type === "exclude-imported-definition") {
        const exclusionKey = `${resolution.sourceSystem}:${resolution.sourceDefinitionId}`;
        if (excludedDefinitionKeys.has(exclusionKey)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["resolutions", index, "sourceDefinitionId"],
            message: "Imported definition exclusions must be unique per source definition",
          });
        }
        excludedDefinitionKeys.add(exclusionKey);
      }
      if (resolution.type === "content-version-decision") {
        if (contentVersionDecisionKeys.has(resolution.importedVersionKey)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["resolutions", index, "importedVersionKey"],
            message: "Content version decisions must be unique per imported version",
          });
        }
        contentVersionDecisionKeys.add(resolution.importedVersionKey);
      }
      if (resolution.type === "capability-baseline-reconciled") {
        if (capabilityBaselineResolutionKeys.has(resolution.baselineCapabilityId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["resolutions", index, "baselineCapabilityId"],
            message: "Capability baseline resolutions must be unique per baseline capability",
          });
        }
        capabilityBaselineResolutionKeys.add(resolution.baselineCapabilityId);
      }
      if (resolution.type === "foundation-baseline-confirmed") {
        const abilityMismatch = (
          Object.keys(resolution.abilityScores) as Array<keyof typeof resolution.abilityScores>
        ).some(
          (ability) =>
            resolution.abilityScores[ability] !== character.build.abilityBasis.baseScores[ability],
        );
        if (
          abilityMismatch ||
          resolution.hpMaximum !== character.hitPoints.baseline.maximum ||
          resolution.hpThroughCharacterLevel !==
            character.hitPoints.baseline.throughCharacterLevel ||
          !character.build.abilityBasis.verified ||
          !character.hitPoints.baseline.verified
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["resolutions", index],
            message:
              "Foundation confirmation must exactly match the verified ability and HP baselines",
          });
        }
      }
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
    const spellSelectionKeys = new Set<string>();
    character.build.spells.forEach((spell, index) => {
      const sourceKey =
        spell.classVersionKey !== null
          ? `class:${spell.classVersionKey}`
          : `grant:${spell.grantSourceRef?.versionKey ?? "missing"}`;
      const selectionKey = [
        spell.spellRef.versionKey,
        spell.mode,
        sourceKey,
      ].join("|");
      if (spellSelectionKeys.has(selectionKey)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["build", "spells", index, "spellRef"],
          message: "Spell selections must be unique per spell, source, and mode",
        });
      }
      spellSelectionKeys.add(selectionKey);
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

    if (character.liveState.hitDice.status === "tracked") {
      const seenHitDiceClasses = new Set<string>();
      character.liveState.hitDice.pools.forEach((pool, index) => {
        if (seenHitDiceClasses.has(pool.classVersionKey)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["liveState", "hitDice", "pools", index, "classVersionKey"],
            message: "Hit-die pools must be unique by class version",
          });
        }
        seenHitDiceClasses.add(pool.classVersionKey);
        const expectedMaximum = classCounts.get(pool.classVersionKey);
        if (expectedMaximum === undefined) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["liveState", "hitDice", "pools", index, "classVersionKey"],
            message: "Hit-die pool references a class version the character does not have",
          });
        } else if (pool.maximum !== expectedMaximum) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["liveState", "hitDice", "pools", index, "maximum"],
            message: `Expected ${expectedMaximum} hit dice for this class`,
          });
        }
      });
      if (seenHitDiceClasses.size !== classCounts.size) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["liveState", "hitDice", "pools"],
          message: "Tracked hit dice must include every character class",
        });
      }
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
      if (item.charges) {
        if (resourceKeys.has(item.charges.key)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["items", index, "charges", "key"],
            message: "Resource keys must be unique across live resources and item charges",
          });
        }
        resourceKeys.add(item.charges.key);
      }
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
      if (item.charges?.provenance === "verified-rule") {
        if (item.definitionRef === null) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["items", index, "charges", "sourceVersionKey"],
            message: "Verified item charges require an exact item definition",
          });
        } else if (item.charges.sourceVersionKey !== item.definitionRef.versionKey) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["items", index, "charges", "sourceVersionKey"],
            message: "Verified item charges must use the item's exact definition as their source",
          });
        }
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
