import { z } from "zod";

export const CHARACTER_SCHEMA_VERSION = 2 as const;
export const CHARACTER_RULESET = "2024" as const;

const NonEmptyString = z.string().trim().min(1);
const Identifier = z.string().trim().min(1).max(200);

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

export const RuleRefSchema = z
  .object({
    kind: z.enum([
      "species",
      "background",
      "class",
      "subclass",
      "feat",
      "spell",
      "item",
      "feature",
      "proficiency",
      "other",
    ]),
    id: Identifier,
    name: NonEmptyString,
    ruleset: z.literal(CHARACTER_RULESET),
    sourceId: Identifier,
    verification: z.enum(["verified", "imported-unverified", "custom"]),
  })
  .strict();

export type RuleRef = z.infer<typeof RuleRefSchema>;

export const CharacterLevelSchema = z
  .object({
    characterLevel: z.number().int().min(1).max(20),
    classLevel: z.number().int().min(1).max(20),
    classRef: RuleRefSchema.refine((ref) => ref.kind === "class", {
      message: "A character level must reference a class",
    }),
    hpGain: z.number().int().min(1).max(50).nullable(),
    reconstruction: z.enum(["native", "single-class-import", "unverified-import"]),
  })
  .strict();

export const SubclassSelectionSchema = z
  .object({
    classRefId: Identifier,
    subclassRef: RuleRefSchema.refine((ref) => ref.kind === "subclass", {
      message: "A subclass selection must reference a subclass",
    }),
    selectedAtCharacterLevel: z.number().int().min(1).max(20).nullable(),
  })
  .strict();

export const CharacterChoiceSchema = z
  .object({
    id: Identifier,
    groupId: Identifier,
    selection: RuleRefSchema,
    grantedAtCharacterLevel: z.number().int().min(1).max(20).nullable(),
    provenance: z.enum(["native", "imported", "custom"]),
    selectionState: z.enum(["confirmed", "unresolved-required-choice"]),
    payload: z.record(z.unknown()).optional(),
  })
  .strict();

export const CharacterOverrideSchema = z
  .object({
    id: Identifier,
    kind: z.enum(["rule-exception", "homebrew", "migration-baseline"]),
    reason: NonEmptyString,
    payload: z.record(z.unknown()),
  })
  .strict();

export const CharacterBuildSchema = z
  .object({
    schemaVersion: z.literal(CHARACTER_SCHEMA_VERSION),
    ruleset: z.literal(CHARACTER_RULESET),
    contentRevision: Identifier,
    revision: z.number().int().min(1),
    speciesRef: RuleRefSchema.refine((ref) => ref.kind === "species", {
      message: "speciesRef must reference a species",
    }),
    backgroundRef: RuleRefSchema.refine((ref) => ref.kind === "background", {
      message: "backgroundRef must reference a background",
    }),
    abilityBasis: z
      .object({
        method: z.enum(["standard-array", "point-buy", "rolled", "imported-baseline"]),
        scores: AbilityScoresSchema,
        verified: z.boolean(),
      })
      .strict(),
    levels: z.array(CharacterLevelSchema).min(1).max(20),
    subclasses: z.array(SubclassSelectionSchema),
    choices: z.array(CharacterChoiceSchema),
    overrides: z.array(CharacterOverrideSchema),
  })
  .strict()
  .superRefine((build, context) => {
    const seenChoiceIds = new Set<string>();
    const classCounts = new Map<string, number>();
    const knownClassIds = new Set<string>();

    build.levels.forEach((level, index) => {
      const expectedCharacterLevel = index + 1;
      if (level.characterLevel !== expectedCharacterLevel) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["levels", index, "characterLevel"],
          message: `Expected contiguous character level ${expectedCharacterLevel}`,
        });
      }

      const expectedClassLevel = (classCounts.get(level.classRef.id) ?? 0) + 1;
      if (level.classLevel !== expectedClassLevel) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["levels", index, "classLevel"],
          message: `Expected ${level.classRef.name} class level ${expectedClassLevel}`,
        });
      }
      classCounts.set(level.classRef.id, expectedClassLevel);
      knownClassIds.add(level.classRef.id);
    });

    for (const [index, subclass] of build.subclasses.entries()) {
      if (!knownClassIds.has(subclass.classRefId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["subclasses", index, "classRefId"],
          message: "Subclass references a class the character does not have",
        });
      }
      if (
        subclass.selectedAtCharacterLevel !== null &&
        subclass.selectedAtCharacterLevel > build.levels.length
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["subclasses", index, "selectedAtCharacterLevel"],
          message: "Subclass selection cannot occur above the current character level",
        });
      }
    }

    for (const [index, choice] of build.choices.entries()) {
      if (seenChoiceIds.has(choice.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["choices", index, "id"],
          message: "Choice IDs must be unique",
        });
      }
      seenChoiceIds.add(choice.id);
      if (
        choice.grantedAtCharacterLevel !== null &&
        choice.grantedAtCharacterLevel > build.levels.length
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["choices", index, "grantedAtCharacterLevel"],
          message: "A choice cannot be granted above the current character level",
        });
      }
    }
  });

export type CharacterBuild = z.infer<typeof CharacterBuildSchema>;

export const CharacterIdentitySchema = z
  .object({
    id: Identifier,
    ownerUserId: Identifier,
    name: NonEmptyString,
    avatarUrl: z.string().url().nullable(),
    externalRefs: z.array(
      z
        .object({
          system: z.enum(["ddb"]),
          id: Identifier,
        })
        .strict(),
    ),
  })
  .strict();

export const CharacterResourceSchema = z
  .object({
    key: Identifier,
    label: NonEmptyString,
    current: z.number().int().min(0),
    max: z.number().int().min(0),
    reset: z.enum(["short-rest", "long-rest", "dawn", "manual"]),
  })
  .strict()
  .refine((resource) => resource.current <= resource.max, {
    message: "Resource current value cannot exceed its maximum",
    path: ["current"],
  });

export const ActiveConditionSchema = z
  .object({
    id: Identifier,
    conditionId: Identifier,
    label: NonEmptyString,
    source: NonEmptyString.nullable(),
    appliedByUserId: Identifier.nullable(),
  })
  .strict();

export const CharacterLiveStateSchema = z
  .object({
    revision: z.number().int().min(0),
    currentHp: z.number().int().min(0),
    maxHp: z.number().int().min(1),
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
    conditions: z.array(ActiveConditionSchema),
  })
  .strict()
  .superRefine((state, context) => {
    if (state.currentHp > state.maxHp) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["currentHp"],
        message: "Current HP cannot exceed maximum HP",
      });
    }

    const resourceKeys = new Set<string>();
    state.resources.forEach((resource, index) => {
      if (resourceKeys.has(resource.key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["resources", index, "key"],
          message: "Resource keys must be unique",
        });
      }
      resourceKeys.add(resource.key);
    });

    const conditionIds = new Set<string>();
    state.conditions.forEach((condition, index) => {
      if (conditionIds.has(condition.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["conditions", index, "id"],
          message: "Active condition instance IDs must be unique",
        });
      }
      conditionIds.add(condition.id);
    });
  });

export type CharacterLiveState = z.infer<typeof CharacterLiveStateSchema>;

export const CharacterItemSchema = z
  .object({
    id: Identifier,
    definitionRef: RuleRefSchema.nullable(),
    name: NonEmptyString,
    quantity: z.number().int().min(1),
    equipped: z.boolean(),
    attuned: z.boolean(),
    containerId: Identifier.nullable(),
    provenance: z.enum(["native", "imported", "custom"]),
  })
  .strict();

export const MigrationIssueSchema = z
  .object({
    code: Identifier,
    severity: z.enum(["info", "warning", "blocking"]),
    message: NonEmptyString,
  })
  .strict();

export const MigrationResolutionSchema = z
  .object({
    kind: z.literal("exclude-imported-feat-wrapper"),
    sourceDefinitionId: Identifier,
    reason: NonEmptyString,
  })
  .strict();

export const CharacterAggregateSchema = z
  .object({
    identity: CharacterIdentitySchema,
    build: CharacterBuildSchema,
    liveState: CharacterLiveStateSchema,
    items: z.array(CharacterItemSchema),
    migrationIssues: z.array(MigrationIssueSchema),
    migrationResolutions: z.array(MigrationResolutionSchema),
  })
  .strict()
  .superRefine((character, context) => {
    const itemIds = new Set<string>();
    let attunedCount = 0;
    character.items.forEach((item, index) => {
      if (itemIds.has(item.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "id"],
          message: "Item instance IDs must be unique",
        });
      }
      itemIds.add(item.id);
      if (item.attuned) attunedCount += 1;
    });
    if (attunedCount > 3) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items"],
        message: "A character cannot have more than three attuned item instances",
      });
    }
  });

export type CharacterAggregate = z.infer<typeof CharacterAggregateSchema>;
