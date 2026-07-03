import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { characterV3PublicError } from "./public-errors";
import {
  MOB_DEV_ACTOR_IDS,
  isMobDevIdentityEnabled,
  mobDevIdentityCookie,
  resolveV3ActorUserId,
} from "./mob-dev-identity";
import { CharacterV3Repository } from "./repository.server";
import { CORE_SUPPORTED_RESOURCE_PROGRESSION_LABELS } from "./feature-resource-semantics";
import type { DerivedClassCatalogRecord } from "./derived-sheet";

const Identifier = z.string().trim().min(1).max(500);
const LevelUpPlanDataSchema = z
  .object({ characterId: Identifier, classVersionKey: Identifier })
  .strict();
const CharacterIdDataSchema = z.object({ characterId: Identifier }).strict();
const LevelUpDecisionReviewDataSchema = LevelUpPlanDataSchema.extend({
  selection: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("none") }).strict(),
    z
      .object({
        mode: z.literal("asi"),
        allocation: z
          .array(
            z
              .object({
                ability: z.enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"]),
                amount: z.union([z.literal(1), z.literal(2)]),
              })
              .strict(),
          )
          .min(1)
          .max(2),
      })
      .strict(),
    z.object({ mode: z.literal("feat"), featVersionKey: Identifier }).strict(),
  ]),
  subclassSelection: z
    .discriminatedUnion("mode", [
      z.object({ mode: z.literal("none") }).strict(),
      z.object({ mode: z.literal("subclass"), subclassVersionKey: Identifier }).strict(),
    ])
    .default({ mode: "none" }),
  hitPoints: z.discriminatedUnion("method", [
    z.object({ method: z.literal("fixed") }).strict(),
    z.object({ method: z.literal("rolled"), roll: z.number().int().min(1).max(20) }).strict(),
  ]),
  spellSelections: z
    .array(
      z
        .object({
          index: z.number().int().min(0).max(20),
          selectedSpellVersionKeys: z.array(Identifier).min(1).max(20),
        })
        .strict(),
    )
    .default([]),
  featureSelections: z
    .array(
      z
        .object({
          groupId: Identifier,
          selectedOptionVersionKeys: z.array(Identifier).min(1).max(20),
        })
        .strict(),
    )
    .default([]),
  grantedSpellSelections: z
    .array(
      z
        .object({
          requirementId: Identifier,
          selectedSpellVersionKeys: z.array(Identifier).min(1).max(20),
        })
        .strict(),
    )
    .default([]),
  grantedSpellVariant: z.string().trim().min(1).max(200).nullable().default(null),
}).strict();
const RevisionPairInputSchema = z
  .object({
    build: z.number().int().min(1),
    liveState: z.number().int().min(0),
  })
  .strict();

const ApplyLevelUpDataSchema = LevelUpDecisionReviewDataSchema.extend({
  mutationId: Identifier,
  expectedRevision: RevisionPairInputSchema,
}).strict();

const LiveMutationBaseInputSchema = {
  characterId: Identifier,
  mutationId: Identifier,
  expectedRevision: RevisionPairInputSchema,
};

const SpendResourceDataSchema = z
  .object({
    ...LiveMutationBaseInputSchema,
    resourceKey: Identifier,
    amount: z.number().int().min(1).max(1_000),
  })
  .strict();

const RecoverResourcesDataSchema = z
  .object({
    ...LiveMutationBaseInputSchema,
    trigger: z.enum(["short-rest", "long-rest", "dawn", "manual"]),
  })
  .strict();

const TakeShortRestDataSchema = z
  .object({
    ...LiveMutationBaseInputSchema,
    hitDice: z.array(
      z.object({ classVersionKey: Identifier, amount: z.number().int().min(1) }).strict(),
    ),
    hitPointsRestored: z.number().int().min(0).max(100_000),
  })
  .strict();

const TakeLongRestDataSchema = z.object(LiveMutationBaseInputSchema).strict();

const ApplyDamageDataSchema = z
  .object({
    ...LiveMutationBaseInputSchema,
    amount: z.number().int().min(1).max(100_000),
    criticalHit: z.boolean(),
  })
  .strict();

const RestoreHitPointsDataSchema = z
  .object({
    ...LiveMutationBaseInputSchema,
    amount: z.number().int().min(1).max(100_000),
  })
  .strict();

const GrantTemporaryHitPointsDataSchema = z
  .object({
    ...LiveMutationBaseInputSchema,
    amount: z.number().int().min(0).max(100_000),
  })
  .strict();

const RecordDeathSaveDataSchema = z
  .object({
    ...LiveMutationBaseInputSchema,
    result: z.enum(["success", "failure", "critical-success", "critical-failure"]),
  })
  .strict();

const StabilizeCharacterDataSchema = z.object(LiveMutationBaseInputSchema).strict();

const MutateItemDataSchema = z.discriminatedUnion("operation", [
  z.object({ ...LiveMutationBaseInputSchema, itemId: Identifier, operation: z.literal("set-equipped"), equipped: z.boolean() }).strict(),
  z.object({ ...LiveMutationBaseInputSchema, itemId: Identifier, operation: z.literal("set-attuned"), attuned: z.boolean() }).strict(),
  z.object({ ...LiveMutationBaseInputSchema, itemId: Identifier, operation: z.literal("set-quantity"), quantity: z.number().int().min(1).max(10_000) }).strict(),
  z.object({ ...LiveMutationBaseInputSchema, itemId: Identifier, operation: z.literal("remove-item") }).strict(),
]);

const SearchItemCatalogDataSchema = z.object({ query: z.string().trim().max(100), limit: z.number().int().min(1).max(50).default(30) }).strict();
const AddCatalogItemDataSchema = z.object({
  ...LiveMutationBaseInputSchema,
  catalogKind: z.enum(["weapon", "armor", "magic-item"]),
  catalogId: Identifier,
  quantity: z.number().int().min(1).max(10_000),
}).strict();

const ConfirmFoundationDataSchema = z
  .object({
    characterId: Identifier,
    mutationId: Identifier,
    expectedRevision: RevisionPairInputSchema,
  })
  .strict();

const SetInspirationDataSchema = z
  .object({
    ...LiveMutationBaseInputSchema,
    inspiration: z.boolean(),
  })
  .strict();

const SetExhaustionDataSchema = z
  .object({
    ...LiveMutationBaseInputSchema,
    exhaustion: z.number().int().min(0).max(6),
  })
  .strict();

const ExactRuleRefInputSchema = z
  .object({
    kind: z.literal("condition"),
    familyKey: Identifier,
    versionKey: Identifier,
    name: Identifier,
    rulesGeneration: z.literal("2024"),
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
  .strict();

const ConditionInputSchema = z
  .object({
    id: Identifier,
    conditionRef: ExactRuleRefInputSchema.nullable(),
    label: Identifier,
    sourceLabel: Identifier.nullable(),
    appliedByUserId: Identifier.nullable(),
  })
  .strict();

const AddConditionDataSchema = z
  .object({
    ...LiveMutationBaseInputSchema,
    condition: ConditionInputSchema,
  })
  .strict();

const RemoveConditionDataSchema = z
  .object({
    ...LiveMutationBaseInputSchema,
    conditionId: Identifier,
  })
  .strict();

const EventsSinceDataSchema = z
  .object({
    campaignId: Identifier,
    afterSequence: z.number().int().min(0).default(0),
    limit: z.number().int().min(1).max(500).default(100),
  })
  .strict();

const SelectMobDevIdentityDataSchema = z
  .object({
    actorUserId: z.enum(MOB_DEV_ACTOR_IDS),
  })
  .strict();

async function getSessionUserIdAndCookie(): Promise<{
  sessionUserId: string | null;
  cookieHeader: string | null;
}> {
  const { getUserIdFromSession } = await import("../db.server");
  const { getRequestHeaders } = await import("@tanstack/react-start/server");
  const cookieHeader = getRequestHeaders().get("cookie");
  const sessionUserId = await getUserIdFromSession(cookieHeader ?? "");
  return { sessionUserId, cookieHeader };
}

async function getCurrentUserId(): Promise<string> {
  const { sessionUserId, cookieHeader } = await getSessionUserIdAndCookie();
  const actorUserId = resolveV3ActorUserId({ sessionUserId, cookieHeader });
  if (!sessionUserId) throw characterV3PublicError("AUTHENTICATION_REQUIRED", "Authentication required");
  if (!actorUserId) {
    throw new Error("Select a Mother of Bob diagnostic identity before using V3 sync.");
  }
  return actorUserId;
}

async function assertAuthenticated(): Promise<void> {
  const { sessionUserId } = await getSessionUserIdAndCookie();
  if (!sessionUserId) throw new Error("Authentication required");
}

async function repository(): Promise<CharacterV3Repository> {
  const { sqlite } = await import("../drizzle.server");
  return new CharacterV3Repository(sqlite);
}

async function assertCampaignMember(campaignId: string, userId: string): Promise<void> {
  const { db } = await import("../drizzle.server");
  const schema = await import("../../db/schema");
  const { and, eq } = await import("drizzle-orm");
  const member = await db
    .select({ campaignId: schema.campaignMembers.campaignId })
    .from(schema.campaignMembers)
    .where(
      and(
        eq(schema.campaignMembers.campaignId, campaignId),
        eq(schema.campaignMembers.userId, userId),
      ),
    )
    .limit(1);
  const dm = await db
    .select({ id: schema.campaigns.id })
    .from(schema.campaigns)
    .where(and(eq(schema.campaigns.id, campaignId), eq(schema.campaigns.dmUserId, userId)))
    .limit(1);
  if (member.length === 0 && dm.length === 0) {
    throw characterV3PublicError("NOT_CAMPAIGN_MEMBER", "You are not a member of this campaign");
  }
}

async function assertCharacterCampaignAccess(characterId: string, userId: string): Promise<void> {
  const character = (await repository()).load(characterId);
  if (!character) throw new Error(`Character ${characterId} is not initialized`);
  await assertCampaignMember(character.identity.campaignId, userId);
}

type LiveMutationCommandInput = {
  mutationId: string;
  expectedRevision: z.infer<typeof RevisionPairInputSchema>;
};

function commandBase(
  data: LiveMutationCommandInput,
  actorUserId: string,
): {
  mutationId: string;
  actorUserId: string;
  expectedBuildRevision: number;
  expectedLiveStateRevision: number;
} {
  return {
    mutationId: data.mutationId,
    actorUserId,
    expectedBuildRevision: data.expectedRevision.build,
    expectedLiveStateRevision: data.expectedRevision.liveState,
  };
}

function assertCompleteSpellSelections(
  selections: Array<{ index: number; selectedSpellVersionKeys: string[] }>,
  planCount: number,
): void {
  if (selections.length !== planCount) {
    throw new Error(`Level-up requires ${planCount} spell choice group(s)`);
  }
  const indexes = new Set(selections.map((selection) => selection.index));
  if (indexes.size !== selections.length) {
    throw new Error("Level-up spell choice groups must be unique");
  }
  for (let index = 0; index < planCount; index += 1) {
    if (!indexes.has(index)) {
      throw new Error(`Level-up is missing spell choice group ${index}`);
    }
  }
}

export const spendCharacterV3ResourceFn = createServerFn({ method: "POST" })
  .inputValidator(SpendResourceDataSchema)
  .handler(async ({ data }) => {
    const actorUserId = await getCurrentUserId();
    await assertCharacterCampaignAccess(data.characterId, actorUserId);
    return (await repository()).spendResource(data.characterId, {
      ...commandBase(data, actorUserId),
      resourceKey: data.resourceKey,
      amount: data.amount,
    });
  });

export const recoverCharacterV3ResourcesFn = createServerFn({ method: "POST" })
  .inputValidator(RecoverResourcesDataSchema)
  .handler(async ({ data }) => {
    const actorUserId = await getCurrentUserId();
    await assertCharacterCampaignAccess(data.characterId, actorUserId);
    return (await repository()).recoverResources(data.characterId, {
      ...commandBase(data, actorUserId),
      trigger: data.trigger,
    });
  });

export const takeCharacterV3ShortRestFn = createServerFn({ method: "POST" })
  .inputValidator(TakeShortRestDataSchema)
  .handler(async ({ data }) => {
    const actorUserId = await getCurrentUserId();
    await assertCharacterCampaignAccess(data.characterId, actorUserId);
    return (await repository()).takeShortRest(data.characterId, {
      ...commandBase(data, actorUserId),
      hitDice: data.hitDice,
      hitPointsRestored: data.hitPointsRestored,
    });
  });

export const takeCharacterV3LongRestFn = createServerFn({ method: "POST" })
  .inputValidator(TakeLongRestDataSchema)
  .handler(async ({ data }) => {
    const actorUserId = await getCurrentUserId();
    await assertCharacterCampaignAccess(data.characterId, actorUserId);
    return (await repository()).takeLongRest(data.characterId, commandBase(data, actorUserId));
  });

export const applyCharacterV3DamageFn = createServerFn({ method: "POST" })
  .inputValidator(ApplyDamageDataSchema)
  .handler(async ({ data }) => {
    const actorUserId = await getCurrentUserId();
    await assertCharacterCampaignAccess(data.characterId, actorUserId);
    return (await repository()).applyDamage(data.characterId, {
      ...commandBase(data, actorUserId),
      amount: data.amount,
      criticalHit: data.criticalHit,
    });
  });

export const restoreCharacterV3HitPointsFn = createServerFn({ method: "POST" })
  .inputValidator(RestoreHitPointsDataSchema)
  .handler(async ({ data }) => {
    const actorUserId = await getCurrentUserId();
    await assertCharacterCampaignAccess(data.characterId, actorUserId);
    return (await repository()).restoreHitPoints(data.characterId, {
      ...commandBase(data, actorUserId),
      amount: data.amount,
    });
  });

export const grantCharacterV3TemporaryHitPointsFn = createServerFn({ method: "POST" })
  .inputValidator(GrantTemporaryHitPointsDataSchema)
  .handler(async ({ data }) => {
    const actorUserId = await getCurrentUserId();
    await assertCharacterCampaignAccess(data.characterId, actorUserId);
    return (await repository()).grantTemporaryHitPoints(data.characterId, {
      ...commandBase(data, actorUserId),
      amount: data.amount,
    });
  });

export const recordCharacterV3DeathSaveFn = createServerFn({ method: "POST" })
  .inputValidator(RecordDeathSaveDataSchema)
  .handler(async ({ data }) => {
    const actorUserId = await getCurrentUserId();
    await assertCharacterCampaignAccess(data.characterId, actorUserId);
    return (await repository()).recordDeathSave(data.characterId, {
      ...commandBase(data, actorUserId),
      result: data.result,
    });
  });

export const stabilizeCharacterV3Fn = createServerFn({ method: "POST" })
  .inputValidator(StabilizeCharacterDataSchema)
  .handler(async ({ data }) => {
    const actorUserId = await getCurrentUserId();
    await assertCharacterCampaignAccess(data.characterId, actorUserId);
    return (await repository()).stabilizeCharacter(data.characterId, {
      ...commandBase(data, actorUserId),
    });
  });

export const mutateCharacterV3ItemFn = createServerFn({ method: "POST" })
  .inputValidator(MutateItemDataSchema)
  .handler(async ({ data }) => {
    const actorUserId = await getCurrentUserId();
    await assertCharacterCampaignAccess(data.characterId, actorUserId);
    return (await repository()).mutateItem(data.characterId, {
      ...commandBase(data, actorUserId),
      itemId: data.itemId,
      operation: data.operation,
      ...(data.operation === "set-equipped"
        ? { equipped: data.equipped }
        : data.operation === "set-attuned"
          ? { attuned: data.attuned }
          : data.operation === "set-quantity"
            ? { quantity: data.quantity }
            : {}),
    });
  });

export const searchCharacterV3ItemCatalogFn = createServerFn({ method: "GET" })
  .inputValidator(SearchItemCatalogDataSchema)
  .handler(async ({ data }) => {
    await getCurrentUserId();
    const { searchItemCatalog } = await import("./item-catalog.server");
    return searchItemCatalog(data.query, data.limit);
  });

export const addCharacterV3CatalogItemFn = createServerFn({ method: "POST" })
  .inputValidator(AddCatalogItemDataSchema)
  .handler(async ({ data }) => {
    const actorUserId = await getCurrentUserId();
    await assertCharacterCampaignAccess(data.characterId, actorUserId);
    const store = await repository();
    const character = store.load(data.characterId);
    if (!character) throw new Error("Character not found");
    const { loadItemCatalogRecord } = await import("./item-catalog.server");
    const { resolveCatalogItem } = await import("./item-catalog");
    const record = loadItemCatalogRecord(data.catalogKind, data.catalogId);
    if (!record) throw new Error("Catalogue item not found");
    const item = resolveCatalogItem({
      record,
      character,
      instanceId: `item:catalog:${crypto.randomUUID()}`,
      quantity: data.quantity,
    });
    return store.mutateItem(data.characterId, {
      ...commandBase(data, actorUserId),
      operation: "add-item",
      item,
    });
  });

export const confirmCharacterV3FoundationFn = createServerFn({ method: "POST" })
  .inputValidator(ConfirmFoundationDataSchema)
  .handler(async ({ data }) => {
    const actorUserId = await getCurrentUserId();
    await assertCharacterCampaignAccess(data.characterId, actorUserId);
    const store = await repository();
    const character = store.load(data.characterId);
    if (!character) throw new Error("Character not found");
    if (character.identity.ownerUserId !== actorUserId) {
      throw characterV3PublicError(
        "NOT_CHARACTER_OWNER",
        "Only the character owner can confirm the imported foundation",
      );
    }
    if (data.expectedRevision.liveState !== character.liveState.revision) {
      throw characterV3PublicError(
        "REVISION_CONFLICT",
        "Live-state revision conflict while confirming imported foundation",
      );
    }
    return store.confirmImportedFoundation(data.characterId, {
      actorUserId,
      expectedBuildRevision: data.expectedRevision.build,
      mutationId: data.mutationId,
      abilityScores: character.build.abilityBasis.baseScores,
      hpMaximum: character.hitPoints.baseline.maximum,
      hpThroughCharacterLevel: character.hitPoints.baseline.throughCharacterLevel,
      reason:
        "Owner confirms the imported ability scores and Hit Point baseline shown in the native sheet.",
    });
  });

export const setCharacterV3InspirationFn = createServerFn({ method: "POST" })
  .inputValidator(SetInspirationDataSchema)
  .handler(async ({ data }) => {
    const actorUserId = await getCurrentUserId();
    await assertCharacterCampaignAccess(data.characterId, actorUserId);
    return (await repository()).setInspiration(data.characterId, {
      ...commandBase(data, actorUserId),
      inspiration: data.inspiration,
    });
  });

export const setCharacterV3ExhaustionFn = createServerFn({ method: "POST" })
  .inputValidator(SetExhaustionDataSchema)
  .handler(async ({ data }) => {
    const actorUserId = await getCurrentUserId();
    await assertCharacterCampaignAccess(data.characterId, actorUserId);
    return (await repository()).setExhaustion(data.characterId, {
      ...commandBase(data, actorUserId),
      exhaustion: data.exhaustion,
    });
  });

export const addCharacterV3ConditionFn = createServerFn({ method: "POST" })
  .inputValidator(AddConditionDataSchema)
  .handler(async ({ data }) => {
    const actorUserId = await getCurrentUserId();
    await assertCharacterCampaignAccess(data.characterId, actorUserId);
    return (await repository()).addCondition(data.characterId, {
      ...commandBase(data, actorUserId),
      condition: {
        ...data.condition,
        appliedByUserId: data.condition.appliedByUserId ?? actorUserId,
      },
    });
  });

export const removeCharacterV3ConditionFn = createServerFn({ method: "POST" })
  .inputValidator(RemoveConditionDataSchema)
  .handler(async ({ data }) => {
    const actorUserId = await getCurrentUserId();
    await assertCharacterCampaignAccess(data.characterId, actorUserId);
    return (await repository()).removeCondition(data.characterId, {
      ...commandBase(data, actorUserId),
      conditionId: data.conditionId,
    });
  });

export const getCharacterV3CampaignEventsFn = createServerFn({ method: "GET" })
  .inputValidator(EventsSinceDataSchema)
  .handler(async ({ data }) => {
    const actorUserId = await getCurrentUserId();
    await assertCampaignMember(data.campaignId, actorUserId);
    return (await repository()).eventsSince(data.campaignId, data.afterSequence, data.limit);
  });

export const getCharacterV3CampaignSnapshotFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ campaignId: Identifier }).strict())
  .handler(async ({ data }) => {
    const actorUserId = await getCurrentUserId();
    await assertCampaignMember(data.campaignId, actorUserId);
    return (await repository()).campaignSnapshot(data.campaignId);
  });

export const getCharacterV3DerivedFoundationFn = createServerFn({ method: "GET" })
  .inputValidator(CharacterIdDataSchema)
  .handler(async ({ data }) => {
    const actorUserId = await getCurrentUserId();
    await assertCharacterCampaignAccess(data.characterId, actorUserId);
    const store = await repository();
    const character = store.load(data.characterId);
    if (!character) throw new Error("Character not found");
    const { sqlite } = await import("../drizzle.server");
    const { deriveCharacterV3Foundation } = await import("./derived-sheet");
    const { resolveMobCatalogClassIdentity } = await import("./mob-catalog-identity");
    const classRefs = [
      ...new Map(character.build.levels.map((level) => [level.classRef.versionKey, level.classRef]))
        .values(),
    ];
    const catalog: DerivedClassCatalogRecord[] = classRefs.map((classRef) => {
      const catalogRef = resolveMobCatalogClassIdentity(classRef);
      const row = sqlite
        .prepare(
          "SELECT proficiencies_json, spellcasting_json FROM classes WHERE id = ? AND source = ?",
        )
        .get(catalogRef.upstreamId, catalogRef.sourceId) as
        | { proficiencies_json: string | null; spellcasting_json: string | null }
        | undefined;
      return {
        id: classRef.upstreamId,
        sourceId: classRef.sourceId,
        contentRevision: classRef.contentRevision,
        proficienciesJson: row?.proficiencies_json ?? null,
        spellcastingJson: row?.spellcasting_json ?? null,
      };
    });
    return deriveCharacterV3Foundation(character, catalog);
  });

export const getCharacterV3LevelUpPlanFn = createServerFn({ method: "GET" })
  .inputValidator(LevelUpPlanDataSchema)
  .handler(async ({ data }) => {
    const actorUserId = await getCurrentUserId();
    await assertCharacterCampaignAccess(data.characterId, actorUserId);
    const store = await repository();
    const character = store.load(data.characterId);
    if (!character) throw new Error("Character not found");
    const { sqlite } = await import("../drizzle.server");
    const {
      loadClassHitPointRule,
      loadClassProgressionJson,
      loadClassSubclassCandidates,
      loadClassSpellCatalog,
      loadGeneralFeatCandidates,
      loadLevelUpFeatureCatalog,
      loadSubclassAdditionalSpells,
      loadVerifiedSpellCatalog,
    } = await import("./level-up-catalog.server");
    const { deriveLevelUpDecisionPlan } = await import("./level-up-planner");
    const { deriveLevelUpSubclassPlan } = await import("./level-up-subclass");
    const {
      deriveMaximumSpellLevelAtClassLevel,
      deriveLevelUpProgressionRequirements,
      deriveUnsupportedLevelUpProgression,
    } = await import("./level-up-progression");
    const { deriveLevelUpSpellChoicePlans } = await import("./level-up-spells");
    const classRef = character.build.levels.find(
      (level) => level.classRef.versionKey === data.classVersionKey,
    )?.classRef;
    if (!classRef) throw new Error("Level-up class is not part of this character build");
    const { resolveMobCatalogClassIdentity, resolveMobCatalogSubclassIdentity } =
      await import("./mob-catalog-identity");
    const catalogClassRef = resolveMobCatalogClassIdentity(classRef);
    const catalogSubclassRefs = character.build.subclasses.map((entry) =>
      resolveMobCatalogSubclassIdentity(entry.subclassRef),
    );
    const decisionPlan = deriveLevelUpDecisionPlan({
      character,
      classVersionKey: data.classVersionKey,
      featCatalog: loadGeneralFeatCandidates(sqlite),
    });
    const subclassCatalog = loadClassSubclassCandidates(sqlite, catalogClassRef);
    const subclassPlan = deriveLevelUpSubclassPlan({
      character,
      classVersionKey: data.classVersionKey,
      subclassCatalog,
    });
    const { deriveLevelUpFeaturePlan } = await import("./level-up-features");
    const existingSubclass = character.build.subclasses.find(
      (entry) => entry.classVersionKey === data.classVersionKey,
    )?.subclassRef;
    const featureCatalog = loadLevelUpFeatureCatalog(sqlite, catalogClassRef, [
      ...catalogSubclassRefs,
      ...subclassCatalog.map((entry) => entry.subclassRef),
    ]);
    const featurePlan = deriveLevelUpFeaturePlan({
      classVersionKey: data.classVersionKey,
      nextClassLevel: decisionPlan.nextClassLevel,
      selectedSubclassVersionKey: existingSubclass?.versionKey ?? null,
      featureCatalog,
    });
    const { deriveGrantedSpellChoicePlans, findGrantedSpellVariant, parseGrantedSpellsAtLevel } =
      await import("./level-up-granted-spells");
    const spellCatalog = loadVerifiedSpellCatalog(sqlite);
    const parsedGrantedSpells = existingSubclass
      ? parseGrantedSpellsAtLevel(
          loadSubclassAdditionalSpells(sqlite, resolveMobCatalogSubclassIdentity(existingSubclass)),
          decisionPlan.nextClassLevel,
          findGrantedSpellVariant(character, existingSubclass),
        )
      : {
          spells: [],
          choiceRequirements: [],
          variantChoices: [],
          selectedVariant: null,
          blockers: [],
        };
    const grantedSpellPlan = {
      ...parsedGrantedSpells,
      choicePlans: deriveGrantedSpellChoicePlans({ parsed: parsedGrantedSpells, spellCatalog }),
    };
    const { deriveLevelUpHitPointPlan } = await import("./level-up-hp");
    const progressionJson = loadClassProgressionJson(sqlite, catalogClassRef);
    const progressionRequirements = deriveLevelUpProgressionRequirements({
      progressionJson,
      currentClassLevel: decisionPlan.nextClassLevel - 1,
      nextClassLevel: decisionPlan.nextClassLevel,
    });
    const unsupportedProgression = deriveUnsupportedLevelUpProgression({
      progressionJson,
      currentClassLevel: decisionPlan.nextClassLevel - 1,
      nextClassLevel: decisionPlan.nextClassLevel,
      supportedResourceLabels: CORE_SUPPORTED_RESOURCE_PROGRESSION_LABELS,
    });
    return {
      ...decisionPlan,
      hitPoints: deriveLevelUpHitPointPlan(
        character,
        loadClassHitPointRule(sqlite, catalogClassRef),
      ),
      subclassPlan,
      featurePlan,
      grantedSpellPlan,
      subclassGrantedSpellPlans: subclassPlan.candidates.map((candidate) => {
        const parsed = parseGrantedSpellsAtLevel(
          loadSubclassAdditionalSpells(sqlite, candidate),
          decisionPlan.nextClassLevel,
        );
        return {
          subclassVersionKey: candidate.versionKey,
          ...parsed,
          choicePlans: deriveGrantedSpellChoicePlans({ parsed, spellCatalog }),
        };
      }),
      subclassFeaturePlans: subclassPlan.candidates.map((candidate) => ({
        subclassVersionKey: candidate.versionKey,
        ...deriveLevelUpFeaturePlan({
          classVersionKey: data.classVersionKey,
          nextClassLevel: decisionPlan.nextClassLevel,
          selectedSubclassVersionKey: candidate.versionKey,
          featureCatalog,
        }),
      })),
      progressionRequirements,
      unsupportedProgression,
      spellChoicePlans: deriveLevelUpSpellChoicePlans({
        character,
        classVersionKey: data.classVersionKey,
        requirements: progressionRequirements,
        spellCatalog: loadClassSpellCatalog(sqlite, catalogClassRef),
        maximumSpellLevel: deriveMaximumSpellLevelAtClassLevel({
          progressionJson,
          classLevel: decisionPlan.nextClassLevel,
        }),
      }),
    };
  });

export const reviewCharacterV3LevelUpDecisionFn = createServerFn({ method: "POST" })
  .inputValidator(LevelUpDecisionReviewDataSchema)
  .handler(async ({ data }) => {
    const actorUserId = await getCurrentUserId();
    await assertCharacterCampaignAccess(data.characterId, actorUserId);
    const store = await repository();
    const character = store.load(data.characterId);
    if (!character) throw new Error("Character not found");
    if (character.identity.ownerUserId !== actorUserId) {
      throw characterV3PublicError(
        "NOT_CHARACTER_OWNER",
        "Only the character owner can review a level-up selection",
      );
    }
    const { sqlite } = await import("../drizzle.server");
    const {
      loadClassHitPointRule,
      loadClassProgressionJson,
      loadClassSubclassCandidates,
      loadClassSpellCatalog,
      loadGeneralFeatCandidates,
      loadLevelUpFeatureCatalog,
      loadSubclassAdditionalSpells,
      loadVerifiedSpellCatalog,
    } = await import("./level-up-catalog.server");
    const { compileLevelUpDecision, deriveLevelUpDecisionPlan } =
      await import("./level-up-planner");
    const { compileLevelUpSubclassChoice, deriveLevelUpSubclassPlan } =
      await import("./level-up-subclass");
    const {
      deriveMaximumSpellLevelAtClassLevel,
      deriveLevelUpProgressionRequirements,
      deriveUnsupportedLevelUpProgression,
    } = await import("./level-up-progression");
    const { compileLevelUpSpellSelection, deriveLevelUpSpellChoicePlans } =
      await import("./level-up-spells");
    const plan = deriveLevelUpDecisionPlan({
      character,
      classVersionKey: data.classVersionKey,
      featCatalog: loadGeneralFeatCandidates(sqlite),
    });
    const classRef = character.build.levels.find(
      (level) => level.classRef.versionKey === data.classVersionKey,
    )?.classRef;
    if (!classRef) throw new Error("Level-up class is not part of this character build");
    const { resolveMobCatalogClassIdentity, resolveMobCatalogSubclassIdentity } =
      await import("./mob-catalog-identity");
    const catalogClassRef = resolveMobCatalogClassIdentity(classRef);
    const catalogSubclassRefs = character.build.subclasses.map((entry) =>
      resolveMobCatalogSubclassIdentity(entry.subclassRef),
    );
    const subclassCatalog = loadClassSubclassCandidates(sqlite, catalogClassRef);
    const subclassPlan = deriveLevelUpSubclassPlan({
      character,
      classVersionKey: data.classVersionKey,
      subclassCatalog,
    });
    const subclass = compileLevelUpSubclassChoice({
      character,
      classVersionKey: data.classVersionKey,
      plan: subclassPlan,
      selection: data.subclassSelection,
    });
    const {
      assertSupportedLevelUpFeatures,
      compileLevelUpFeatureSelections,
      deriveLevelUpFeaturePlan,
    } = await import("./level-up-features");
    const selectedSubclass =
      subclass?.subclassRef ??
      character.build.subclasses.find((entry) => entry.classVersionKey === data.classVersionKey)
        ?.subclassRef ??
      null;
    const featurePlan = deriveLevelUpFeaturePlan({
      classVersionKey: data.classVersionKey,
      nextClassLevel: plan.nextClassLevel,
      selectedSubclassVersionKey: selectedSubclass?.versionKey ?? null,
      featureCatalog: loadLevelUpFeatureCatalog(sqlite, catalogClassRef, [
        ...catalogSubclassRefs,
        ...subclassCatalog.map((entry) => entry.subclassRef),
      ]),
    });
    assertSupportedLevelUpFeatures(featurePlan);
    const { buildCoreFeatureResourceSemantics, deriveLevelUpFeatureResourceUpdates } =
      await import("./feature-resource-semantics");
    const resourcePlan = deriveLevelUpFeatureResourceUpdates({
      character,
      classVersionKey: data.classVersionKey,
      nextClassLevel: plan.nextClassLevel,
      selectedSubclassVersionKey: selectedSubclass?.versionKey ?? null,
      semantics: buildCoreFeatureResourceSemantics({
        classRef: catalogClassRef,
        subclassRefs: [
          ...catalogSubclassRefs,
          ...(subclass ? [resolveMobCatalogSubclassIdentity(subclass.subclassRef)] : []),
        ],
      }),
    });
    if (resourcePlan.blockers.length > 0) {
      throw new Error(`Level-up resource compiler blocked: ${resourcePlan.blockers.join(", ")}`);
    }
    const featureDecisions = compileLevelUpFeatureSelections({
      plan: featurePlan,
      selections: data.featureSelections,
      madeAtCharacterLevel: plan.nextCharacterLevel,
      decisionIdPrefix: `draft:${character.identity.id}:level-${plan.nextCharacterLevel}`,
    });
    const { deriveAttunementCapacityReplacements } = await import("./attunement-capacity");
    const attunementCapacityReplacements = deriveAttunementCapacityReplacements(
      featurePlan.unlockedFeatures,
    );
    const { compileGrantedLevelUpSpells, findGrantedSpellVariant, parseGrantedSpellsAtLevel } =
      await import("./level-up-granted-spells");
    const existingGrantedSpellVariant = selectedSubclass
      ? findGrantedSpellVariant(character, selectedSubclass)
      : null;
    const grantedSpells = selectedSubclass
      ? compileGrantedLevelUpSpells({
          character,
          classVersionKey: data.classVersionKey,
          subclassRef: selectedSubclass,
          parsed: parseGrantedSpellsAtLevel(
            loadSubclassAdditionalSpells(
              sqlite,
              resolveMobCatalogSubclassIdentity(selectedSubclass),
            ),
            plan.nextClassLevel,
            existingGrantedSpellVariant ?? data.grantedSpellVariant,
          ),
          spellCatalog: loadVerifiedSpellCatalog(sqlite),
          choiceSelections: data.grantedSpellSelections,
          persistVariantDecision:
            existingGrantedSpellVariant === null && data.grantedSpellVariant !== null,
          decisionId: `draft:${character.identity.id}:level-${plan.nextCharacterLevel}:granted`,
        })
      : { decisions: [], spells: [] };
    const { compileLevelUpHitPoints, deriveLevelUpHitPointPlan } = await import("./level-up-hp");
    const hitPoints = compileLevelUpHitPoints({
      plan: deriveLevelUpHitPointPlan(character, loadClassHitPointRule(sqlite, catalogClassRef)),
      selection: data.hitPoints,
    });
    const decision = compileLevelUpDecision({
      character,
      classVersionKey: data.classVersionKey,
      plan,
      selection: data.selection,
      decisionId: `draft:${character.identity.id}:level-${plan.nextCharacterLevel}`,
    });
    const progressionJson = loadClassProgressionJson(sqlite, catalogClassRef);
    const progressionRequirements = deriveLevelUpProgressionRequirements({
      progressionJson,
      currentClassLevel: plan.nextClassLevel - 1,
      nextClassLevel: plan.nextClassLevel,
    });
    const unsupportedProgression = deriveUnsupportedLevelUpProgression({
      progressionJson,
      currentClassLevel: plan.nextClassLevel - 1,
      nextClassLevel: plan.nextClassLevel,
      supportedResourceLabels: CORE_SUPPORTED_RESOURCE_PROGRESSION_LABELS,
    });
    if (unsupportedProgression.length > 0) {
      throw new Error(
        `Level-up requires unsupported progression choices: ${unsupportedProgression
          .map((blocker) => blocker.label)
          .join(", ")}`,
      );
    }
    const spellChoicePlans = deriveLevelUpSpellChoicePlans({
      character,
      classVersionKey: data.classVersionKey,
      requirements: progressionRequirements,
      spellCatalog: loadClassSpellCatalog(sqlite, catalogClassRef),
      maximumSpellLevel: deriveMaximumSpellLevelAtClassLevel({
        progressionJson,
        classLevel: plan.nextClassLevel,
      }),
    });
    assertCompleteSpellSelections(data.spellSelections, spellChoicePlans.length);
    const spellSelections = data.spellSelections.map((selection) => {
      const spellPlan = spellChoicePlans[selection.index];
      if (!spellPlan) throw new Error("Spell selection targets an unknown choice group");
      return compileLevelUpSpellSelection({
        character,
        classVersionKey: data.classVersionKey,
        plan: spellPlan,
        selectedSpellVersionKeys: selection.selectedSpellVersionKeys,
        decisionId: `draft:${character.identity.id}:level-${plan.nextCharacterLevel}:spells:${selection.index}`,
      });
    });
    return {
      decision,
      subclass,
      hitPoints,
      subclassPlan,
      featurePlan,
      featureDecisions,
      resourceUpdates: resourcePlan.updates,
      attunementCapacityReplacements,
      grantedSpells,
      progressionRequirements,
      spellSelections,
      expectedRevision: {
        build: character.build.revision,
        liveState: character.liveState.revision,
      },
    };
  });

export const applyCharacterV3LevelUpFn = createServerFn({ method: "POST" })
  .inputValidator(ApplyLevelUpDataSchema)
  .handler(async ({ data }) => {
    const actorUserId = await getCurrentUserId();
    await assertCharacterCampaignAccess(data.characterId, actorUserId);
    const store = await repository();
    const character = store.load(data.characterId);
    if (!character) throw new Error("Character not found");
    if (character.identity.ownerUserId !== actorUserId) {
      throw characterV3PublicError(
        "NOT_CHARACTER_OWNER",
        "Only the character owner can apply a level-up",
      );
    }
    const { sqlite } = await import("../drizzle.server");
    const {
      loadClassHitPointRule,
      loadClassProgressionJson,
      loadClassSubclassCandidates,
      loadClassSpellCatalog,
      loadGeneralFeatCandidates,
      loadLevelUpFeatureCatalog,
      loadSubclassAdditionalSpells,
      loadVerifiedSpellCatalog,
    } = await import("./level-up-catalog.server");
    const { compileLevelUpDecision, deriveLevelUpDecisionPlan } =
      await import("./level-up-planner");
    const { compileLevelUpSubclassChoice, deriveLevelUpSubclassPlan } =
      await import("./level-up-subclass");
    const { compileLevelUpHitPoints, deriveLevelUpHitPointPlan } = await import("./level-up-hp");
    const {
      deriveMaximumSpellLevelAtClassLevel,
      deriveLevelUpProgressionRequirements,
      deriveUnsupportedLevelUpProgression,
    } = await import("./level-up-progression");
    const { compileLevelUpSpellSelection, deriveLevelUpSpellChoicePlans } =
      await import("./level-up-spells");
    const plan = deriveLevelUpDecisionPlan({
      character,
      classVersionKey: data.classVersionKey,
      featCatalog: loadGeneralFeatCandidates(sqlite),
    });
    const classRef = character.build.levels.find(
      (level) => level.classRef.versionKey === data.classVersionKey,
    )?.classRef;
    if (!classRef) throw new Error("Level-up class is not part of this character build");
    const { resolveMobCatalogClassIdentity, resolveMobCatalogSubclassIdentity } =
      await import("./mob-catalog-identity");
    const catalogClassRef = resolveMobCatalogClassIdentity(classRef);
    const catalogSubclassRefs = character.build.subclasses.map((entry) =>
      resolveMobCatalogSubclassIdentity(entry.subclassRef),
    );
    const subclassCatalog = loadClassSubclassCandidates(sqlite, catalogClassRef);
    const subclassPlan = deriveLevelUpSubclassPlan({
      character,
      classVersionKey: data.classVersionKey,
      subclassCatalog,
    });
    const subclass = compileLevelUpSubclassChoice({
      character,
      classVersionKey: data.classVersionKey,
      plan: subclassPlan,
      selection: data.subclassSelection,
    });
    const {
      assertSupportedLevelUpFeatures,
      compileLevelUpFeatureSelections,
      deriveLevelUpFeaturePlan,
    } = await import("./level-up-features");
    const selectedSubclass =
      subclass?.subclassRef ??
      character.build.subclasses.find((entry) => entry.classVersionKey === data.classVersionKey)
        ?.subclassRef ??
      null;
    const featurePlan = deriveLevelUpFeaturePlan({
      classVersionKey: data.classVersionKey,
      nextClassLevel: plan.nextClassLevel,
      selectedSubclassVersionKey: selectedSubclass?.versionKey ?? null,
      featureCatalog: loadLevelUpFeatureCatalog(sqlite, catalogClassRef, [
        ...catalogSubclassRefs,
        ...subclassCatalog.map((entry) => entry.subclassRef),
      ]),
    });
    assertSupportedLevelUpFeatures(featurePlan);
    const { buildCoreFeatureResourceSemantics, deriveLevelUpFeatureResourceUpdates } =
      await import("./feature-resource-semantics");
    const resourcePlan = deriveLevelUpFeatureResourceUpdates({
      character,
      classVersionKey: data.classVersionKey,
      nextClassLevel: plan.nextClassLevel,
      selectedSubclassVersionKey: selectedSubclass?.versionKey ?? null,
      semantics: buildCoreFeatureResourceSemantics({
        classRef: catalogClassRef,
        subclassRefs: [
          ...catalogSubclassRefs,
          ...(subclass ? [resolveMobCatalogSubclassIdentity(subclass.subclassRef)] : []),
        ],
      }),
    });
    if (resourcePlan.blockers.length > 0) {
      throw new Error(`Level-up resource compiler blocked: ${resourcePlan.blockers.join(", ")}`);
    }
    const featureDecisions = compileLevelUpFeatureSelections({
      plan: featurePlan,
      selections: data.featureSelections,
      madeAtCharacterLevel: plan.nextCharacterLevel,
      decisionIdPrefix: data.mutationId,
    });
    const { deriveAttunementCapacityReplacements } = await import("./attunement-capacity");
    const attunementCapacityReplacements = deriveAttunementCapacityReplacements(
      featurePlan.unlockedFeatures,
    );
    const { compileGrantedLevelUpSpells, findGrantedSpellVariant, parseGrantedSpellsAtLevel } =
      await import("./level-up-granted-spells");
    const existingGrantedSpellVariant = selectedSubclass
      ? findGrantedSpellVariant(character, selectedSubclass)
      : null;
    const grantedSpells = selectedSubclass
      ? compileGrantedLevelUpSpells({
          character,
          classVersionKey: data.classVersionKey,
          subclassRef: selectedSubclass,
          parsed: parseGrantedSpellsAtLevel(
            loadSubclassAdditionalSpells(
              sqlite,
              resolveMobCatalogSubclassIdentity(selectedSubclass),
            ),
            plan.nextClassLevel,
            existingGrantedSpellVariant ?? data.grantedSpellVariant,
          ),
          spellCatalog: loadVerifiedSpellCatalog(sqlite),
          choiceSelections: data.grantedSpellSelections,
          persistVariantDecision:
            existingGrantedSpellVariant === null && data.grantedSpellVariant !== null,
          decisionId: `${data.mutationId}:granted`,
        })
      : { decisions: [], spells: [] };
    const decision = compileLevelUpDecision({
      character,
      classVersionKey: data.classVersionKey,
      plan,
      selection: data.selection,
      decisionId: `${data.mutationId}:decision`,
    });
    const hitPoints = compileLevelUpHitPoints({
      plan: deriveLevelUpHitPointPlan(character, loadClassHitPointRule(sqlite, catalogClassRef)),
      selection: data.hitPoints,
    });
    const progressionJson = loadClassProgressionJson(sqlite, catalogClassRef);
    const progressionRequirements = deriveLevelUpProgressionRequirements({
      progressionJson,
      currentClassLevel: plan.nextClassLevel - 1,
      nextClassLevel: plan.nextClassLevel,
    });
    const unsupportedProgression = deriveUnsupportedLevelUpProgression({
      progressionJson,
      currentClassLevel: plan.nextClassLevel - 1,
      nextClassLevel: plan.nextClassLevel,
      supportedResourceLabels: CORE_SUPPORTED_RESOURCE_PROGRESSION_LABELS,
    });
    if (unsupportedProgression.length > 0) {
      throw new Error(
        `Level-up requires unsupported progression choices: ${unsupportedProgression
          .map((blocker) => blocker.label)
          .join(", ")}`,
      );
    }
    const spellChoicePlans = deriveLevelUpSpellChoicePlans({
      character,
      classVersionKey: data.classVersionKey,
      requirements: progressionRequirements,
      spellCatalog: loadClassSpellCatalog(sqlite, catalogClassRef),
      maximumSpellLevel: deriveMaximumSpellLevelAtClassLevel({
        progressionJson,
        classLevel: plan.nextClassLevel,
      }),
    });
    assertCompleteSpellSelections(data.spellSelections, spellChoicePlans.length);
    const spellSelections = data.spellSelections.map((selection) => {
      const spellPlan = spellChoicePlans[selection.index];
      if (!spellPlan) throw new Error("Spell selection targets an unknown choice group");
      return compileLevelUpSpellSelection({
        character,
        classVersionKey: data.classVersionKey,
        plan: spellPlan,
        selectedSpellVersionKeys: selection.selectedSpellVersionKeys,
        decisionId: `${data.mutationId}:spells:${selection.index}`,
      });
    });
    return store.advanceCharacterLevel(data.characterId, {
      ...commandBase(data, actorUserId),
      classRef,
      hp: hitPoints,
      currentHpPolicy: "preserve-damage",
      decisions: [
        ...(decision ? [decision] : []),
        ...featureDecisions,
        ...grantedSpells.decisions,
        ...spellSelections.map((selection) => selection.decision),
      ],
      subclasses: subclass ? [subclass] : [],
      spells: [
        ...spellSelections.flatMap((selection) => selection.spells),
        ...grantedSpells.spells,
      ],
      resourceUpdates: resourcePlan.updates,
      attunementCapacityReplacements,
    });
  });

export const selectMotherOfBobDevIdentityFn = createServerFn({ method: "POST" })
  .inputValidator(SelectMobDevIdentityDataSchema)
  .handler(async ({ data }) => {
    const { sessionUserId } = await getSessionUserIdAndCookie();
    if (!sessionUserId) throw new Error("Authentication required");
    // Diagnostic identity switching exists only for the legacy local placeholder.
    // A real account always acts as its authenticated stable party identity.
    if (sessionUserId !== "default-user") {
      return { actorUserId: sessionUserId };
    }
    if (!isMobDevIdentityEnabled()) {
      throw new Error("Mother of Bob diagnostic identity switching is disabled in production.");
    }
    const { setResponseHeaders } = await import("@tanstack/react-start/server");
    const secureFlag = process.env.NODE_ENV === "production" ? "; Secure" : "";
    setResponseHeaders({
      "Set-Cookie": `${mobDevIdentityCookie(data.actorUserId)}${secureFlag}`,
    } as Record<string, string>);
    return { actorUserId: data.actorUserId };
  });

export const getMotherOfBobDevIdentityFn = createServerFn({ method: "GET" }).handler(async () => {
  return { actorUserId: await getCurrentUserId() };
});

export const bootstrapMotherOfBobV3Fn = createServerFn({ method: "POST" }).handler(async () => {
  if (!isMobDevIdentityEnabled()) {
    throw new Error("Mother of Bob bootstrap is available only through deployment tooling.");
  }
  await assertAuthenticated();
  const { sqlite } = await import("../drizzle.server");
  const { bootstrapMotherOfBobV3 } = await import("./mob-bootstrap.server");
  return bootstrapMotherOfBobV3(sqlite);
});
