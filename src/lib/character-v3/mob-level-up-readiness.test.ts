import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { CharacterAggregateSchema } from "./schema";
import { advanceCharacterLevel } from "./operations";
import { compileLevelUpDecision, deriveLevelUpDecisionPlan } from "./level-up-planner";
import { compileLevelUpHitPoints, deriveLevelUpHitPointPlan } from "./level-up-hp";
import {
  deriveLevelUpProgressionRequirements,
  deriveMaximumSpellLevelAtClassLevel,
  deriveUnsupportedLevelUpProgression,
} from "./level-up-progression";
import { compileLevelUpSpellSelection, deriveLevelUpSpellChoicePlans } from "./level-up-spells";
import { compileLevelUpFeatureSelections, deriveLevelUpFeaturePlan } from "./level-up-features";
import {
  buildCoreFeatureResourceSemantics,
  CORE_SUPPORTED_RESOURCE_PROGRESSION_LABELS,
  deriveLevelUpFeatureResourceUpdates,
} from "./feature-resource-semantics";
import {
  compileGrantedLevelUpSpells,
  findGrantedSpellVariant,
  parseGrantedSpellsAtLevel,
} from "./level-up-granted-spells";
import {
  loadClassHitPointRule,
  loadClassProgressionJson,
  loadClassSpellCatalog,
  loadGeneralFeatCandidates,
  loadLevelUpFeatureCatalog,
  loadSubclassAdditionalSpells,
  loadVerifiedSpellCatalog,
} from "./level-up-catalog.server";
import {
  resolveMobCatalogClassIdentity,
  resolveMobCatalogSubclassIdentity,
} from "./mob-catalog-identity";

describe("real MOB native next-level readiness", () => {
  it("dry-runs an atomic 7→8 advancement for all five persisted DDB-authoritative snapshots", () => {
    const sqlite = new Database("sqlite.db", { readonly: true });
    const rows = sqlite
      .prepare("SELECT aggregate_json FROM character_v3_snapshots ORDER BY character_id")
      .all() as Array<{ aggregate_json: string }>;
    expect(rows).toHaveLength(5);

    for (const row of rows) {
      const character = CharacterAggregateSchema.parse(JSON.parse(row.aggregate_json));
      const classRef = character.build.levels.at(-1)!.classRef;
      const catalogClassRef = resolveMobCatalogClassIdentity(classRef);
      const subclassRef = character.build.subclasses.find(
        (entry) => entry.classVersionKey === classRef.versionKey,
      )?.subclassRef;
      const catalogSubclassRef = subclassRef
        ? resolveMobCatalogSubclassIdentity(subclassRef)
        : null;
      const plan = deriveLevelUpDecisionPlan({
        character,
        classVersionKey: classRef.versionKey,
        featCatalog: loadGeneralFeatCandidates(sqlite),
      });
      expect(plan.nextCharacterLevel).toBe(8);
      const decision = compileLevelUpDecision({
        character,
        classVersionKey: classRef.versionKey,
        plan,
        selection: plan.requiresAsiOrFeat
          ? { mode: "asi", allocation: plan.asiAllocations[0] }
          : { mode: "none" },
        decisionId: `dry-run:${character.identity.id}:asi`,
      });
      const progressionJson = loadClassProgressionJson(sqlite, catalogClassRef);
      expect(
        deriveUnsupportedLevelUpProgression({
          progressionJson,
          currentClassLevel: plan.nextClassLevel - 1,
          nextClassLevel: plan.nextClassLevel,
          supportedResourceLabels: CORE_SUPPORTED_RESOURCE_PROGRESSION_LABELS,
        }),
      ).toEqual([]);
      const spellRequirements = deriveLevelUpProgressionRequirements({
        progressionJson,
        currentClassLevel: plan.nextClassLevel - 1,
        nextClassLevel: plan.nextClassLevel,
      });
      const spellPlans = deriveLevelUpSpellChoicePlans({
        character,
        classVersionKey: classRef.versionKey,
        requirements: spellRequirements,
        spellCatalog: loadClassSpellCatalog(sqlite, catalogClassRef),
        maximumSpellLevel: deriveMaximumSpellLevelAtClassLevel({
          progressionJson,
          classLevel: plan.nextClassLevel,
        }),
      });
      expect(
        spellPlans.map((entry) => ({
          label: entry.label,
          count: entry.count,
          options: entry.options.length,
          ready: entry.readyToSelect,
        })),
        character.identity.name,
      ).toEqual(spellPlans.map(() => expect.objectContaining({ ready: true })));
      const spellSelections = spellPlans.map((spellPlan, index) =>
        compileLevelUpSpellSelection({
          character,
          classVersionKey: classRef.versionKey,
          plan: spellPlan,
          selectedSpellVersionKeys: spellPlan.options
            .slice(0, spellPlan.count)
            .map((entry) => entry.spellRef.versionKey),
          decisionId: `dry-run:${character.identity.id}:spells:${index}`,
        }),
      );
      const featurePlan = deriveLevelUpFeaturePlan({
        classVersionKey: classRef.versionKey,
        nextClassLevel: plan.nextClassLevel,
        selectedSubclassVersionKey: subclassRef?.versionKey ?? null,
        featureCatalog: loadLevelUpFeatureCatalog(
          sqlite,
          catalogClassRef,
          catalogSubclassRef ? [catalogSubclassRef] : [],
        ),
      });
      expect(featurePlan.unsupportedSemantics).toEqual([]);
      const featureDecisions = compileLevelUpFeatureSelections({
        plan: featurePlan,
        selections: featurePlan.choiceGroups.map((group) => ({
          groupId: group.id,
          selectedOptionVersionKeys: group.options
            .slice(0, group.count)
            .map((entry) => entry.versionKey),
        })),
        madeAtCharacterLevel: plan.nextCharacterLevel,
        decisionIdPrefix: `dry-run:${character.identity.id}`,
      });
      const resourcePlan = deriveLevelUpFeatureResourceUpdates({
        character,
        classVersionKey: classRef.versionKey,
        nextClassLevel: plan.nextClassLevel,
        selectedSubclassVersionKey: subclassRef?.versionKey ?? null,
        semantics: buildCoreFeatureResourceSemantics({
          classRef: catalogClassRef,
          subclassRefs: catalogSubclassRef ? [catalogSubclassRef] : [],
        }),
      });
      expect(resourcePlan.blockers).toEqual([]);
      const granted =
        subclassRef && catalogSubclassRef
          ? compileGrantedLevelUpSpells({
              character,
              classVersionKey: classRef.versionKey,
              subclassRef,
              parsed: parseGrantedSpellsAtLevel(
                loadSubclassAdditionalSpells(sqlite, catalogSubclassRef),
                plan.nextClassLevel,
                findGrantedSpellVariant(character, subclassRef),
              ),
              spellCatalog: loadVerifiedSpellCatalog(sqlite),
              choiceSelections: [],
              decisionId: `dry-run:${character.identity.id}:granted`,
            })
          : { decisions: [], spells: [] };
      const hp = compileLevelUpHitPoints({
        plan: deriveLevelUpHitPointPlan(character, loadClassHitPointRule(sqlite, catalogClassRef)),
        selection: { method: "fixed" },
      });
      const advanced = advanceCharacterLevel(character, {
        mutationId: `dry-run:${character.identity.id}:level-8`,
        actorUserId: character.identity.ownerUserId,
        expectedBuildRevision: character.build.revision,
        expectedLiveStateRevision: character.liveState.revision,
        classRef,
        hp,
        currentHpPolicy: "preserve-damage",
        decisions: [
          ...(decision ? [decision] : []),
          ...featureDecisions,
          ...granted.decisions,
          ...spellSelections.map((entry) => entry.decision),
        ],
        subclasses: [],
        spells: [...granted.spells, ...spellSelections.flatMap((entry) => entry.spells)],
        resourceUpdates: resourcePlan.updates,
      });
      expect(advanced.character.build.levels).toHaveLength(8);
      expect(advanced.character.build.revision).toBe(character.build.revision + 1);
      expect(advanced.character.liveState.revision).toBe(character.liveState.revision + 1);
    }
    sqlite.close();
  });
});
