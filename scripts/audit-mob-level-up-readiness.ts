import Database from "better-sqlite3";
import { deriveLevelUpDecisionPlan } from "../src/lib/character-v3/level-up-planner";
import { deriveUnsupportedLevelUpProgression } from "../src/lib/character-v3/level-up-progression";
import { deriveLevelUpFeaturePlan } from "../src/lib/character-v3/level-up-features";
import { findGrantedSpellVariant, parseGrantedSpellsAtLevel } from "../src/lib/character-v3/level-up-granted-spells";
import { resolveMobCatalogClassIdentity, resolveMobCatalogSubclassIdentity } from "../src/lib/character-v3/mob-catalog-identity";
import { loadClassProgressionJson, loadLevelUpFeatureCatalog, loadSubclassAdditionalSpells } from "../src/lib/character-v3/level-up-catalog.server";
import { CORE_SUPPORTED_RESOURCE_PROGRESSION_LABELS } from "../src/lib/character-v3/feature-resource-semantics";

const sqlite = new Database("sqlite.db", { readonly: true });
for (const row of sqlite.prepare("SELECT aggregate_json FROM character_v3_snapshots ORDER BY character_id").all() as Array<{aggregate_json:string}>) {
  const character = JSON.parse(row.aggregate_json);
  const classRef = character.build.levels.at(-1).classRef;
  const catalogClassRef = resolveMobCatalogClassIdentity(classRef);
  const decision = deriveLevelUpDecisionPlan({ character, classVersionKey: classRef.versionKey });
  const existingSubclass = character.build.subclasses.find(
    (entry: { classVersionKey: string }) => entry.classVersionKey === classRef.versionKey,
  )?.subclassRef;
  const resolvedSubclass = existingSubclass ? resolveMobCatalogSubclassIdentity(existingSubclass) : null;
  const featureCatalog = loadLevelUpFeatureCatalog(sqlite, catalogClassRef, resolvedSubclass ? [resolvedSubclass] : []);
  const feature = deriveLevelUpFeaturePlan({ character, classVersionKey: classRef.versionKey, nextClassLevel: decision.nextClassLevel, selectedSubclassVersionKey: existingSubclass?.versionKey ?? null, featureCatalog });
  const progression = deriveUnsupportedLevelUpProgression({ progressionJson: loadClassProgressionJson(sqlite, catalogClassRef), currentClassLevel: decision.nextClassLevel - 1, nextClassLevel: decision.nextClassLevel, supportedResourceLabels: CORE_SUPPORTED_RESOURCE_PROGRESSION_LABELS });
  const granted = existingSubclass && resolvedSubclass ? parseGrantedSpellsAtLevel(loadSubclassAdditionalSpells(sqlite, resolvedSubclass), decision.nextClassLevel, findGrantedSpellVariant(character, existingSubclass)) : null;
  console.log(JSON.stringify({ name: character.identity.name, nextLevel: decision.nextCharacterLevel, nextClassLevel: decision.nextClassLevel, progressionBlockers: progression, featureBlockers: feature.unsupportedSemantics, grantedSpellBlockers: granted?.blockers ?? [], grantedSpells: granted?.spells ?? [] }));
}
