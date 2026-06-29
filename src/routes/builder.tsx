import { createFileRoute } from "@tanstack/react-router";
import type { ForgeData } from "@/lib/forge/forge-data";
import {
  getBackgroundsFromDb,
  getActiveEffectsFromDb,
  getClassFeaturesFromDb,
  getClassSpellsFromDb,
  getClassesFromDb,
  getFeatureActiveEffectsFromDb,
  getFeatsFromDb,
  getLanguagesFromDb,
  getSpeciesFromDb,
  getSpellsFromDb,
  getSubclassesFromDb,
  getItemActiveEffectsFromDb,
  getSpellActiveEffectsFromDb,
  getMagicItemsFromDb,
  getSpeciesVariantsFromDb,
  getWeaponsFromDb,
  getArmorFromDb,
  getChallengeRatingsFromDb,
  getCharOptionsFromDb,
  getConditionsFromDb,
  getCreatureBuilderEntriesFromDb,
  getItemCardReferencesFromDb,
  getItemGroupsFromDb,
  getItemPropertiesFromDb,
  getItemTypeAdditionalEntriesFromDb,
  getItemTypesFromDb,
  getMagicVariantsFromDb,
  getMundaneGearFromDb,
  getOptionalFeaturesFromDb,
  getRulesActionsFromDb,
  getSensesFromDb,
  getSkillsFromDb,
  getWeaponMasteriesFromDb,
} from "@/lib/db-functions";

import { z } from "zod";

const builderSearchSchema = z.object({
  id: z.number().optional(),
});

async function mapNamesToIds(
  raceName: string | null,
  backgroundName: string | null,
  classesStr: string | null,
  subclassesArr: string[] = [],
) {
  try {
    const { db } = await import("../lib/drizzle.server");
    const schema = await import("../db/schema");
    const { like, sql } = await import("drizzle-orm");

    let raceId = null;
    let backgroundId = null;
    let classId = null;
    let subclassId = null;
    let level = 1;
    const multiClasses: any[] = [];

    // Find species
    if (raceName) {
      const speciesRows = await db
        .select({ id: schema.species.id })
        .from(schema.species)
        .where(like(sql`lower(${schema.species.name})`, `%${raceName.toLowerCase()}%`))
        .limit(1);
      if (speciesRows.length > 0) {
        raceId = speciesRows[0].id;
      } else {
        // Check variants
        const varRows = await db
          .select({ id: schema.speciesVariants.id })
          .from(schema.speciesVariants)
          .where(like(sql`lower(${schema.speciesVariants.name})`, `%${raceName.toLowerCase()}%`))
          .limit(1);
        if (varRows.length > 0) {
          raceId = varRows[0].id;
        }
      }
    }

    // Find background
    if (backgroundName) {
      const bgRows = await db
        .select({ id: schema.backgrounds.id })
        .from(schema.backgrounds)
        .where(like(sql`lower(${schema.backgrounds.name})`, `%${backgroundName.toLowerCase()}%`))
        .limit(1);
      if (bgRows.length > 0) {
        backgroundId = bgRows[0].id;
      }
    }

    // Parse classes (e.g. "Warlock 5" or "Fighter 2 / Wizard 3")
    if (classesStr) {
      const parts = classesStr.split("/").map((p) => p.trim());
      for (let i = 0; i < parts.length; i++) {
        const match = parts[i].match(/^(.+?)\s+(\d+)$/);
        if (match) {
          const cName = match[1].trim();
          const cLvl = Number(match[2]);

          const classRows = await db
            .select({ id: schema.classes.id })
            .from(schema.classes)
            .where(like(sql`lower(${schema.classes.name})`, `%${cName.toLowerCase()}%`))
            .limit(1);

          if (classRows.length > 0) {
            if (i === 0) {
              classId = classRows[0].id;
              level = cLvl;
            } else {
              multiClasses.push({
                classId: classRows[0].id,
                subclassId: null,
                level: cLvl,
              });
            }
          }
        }
      }
    }

    // Find subclass
    if (subclassesArr && subclassesArr.length > 0) {
      const subName = subclassesArr[0];
      const subRows = await db
        .select({ id: schema.subclasses.id })
        .from(schema.subclasses)
        .where(like(sql`lower(${schema.subclasses.name})`, `%${subName.toLowerCase()}%`))
        .limit(1);
      if (subRows.length > 0) {
        subclassId = subRows[0].id;
      }
    }

    return { raceId, backgroundId, classId, subclassId, level, multiClasses };
  } catch (err) {
    console.error("Error mapping names to database IDs:", err);
    return {
      raceId: null,
      backgroundId: null,
      classId: null,
      subclassId: null,
      level: 1,
      multiClasses: [],
    };
  }
}

export const Route = createFileRoute("/builder")({
  validateSearch: (search) => builderSearchSchema.parse(search),
  loader: async ({ search }): Promise<ForgeData & { initialCharacter?: any }> => {
    const [
      classes,
      species,
      speciesVariants,
      subclasses,
      backgrounds,
      feats,
      spells,
      classSpells,
      classFeatures,
      languages,
      activeEffects,
      featureActiveEffects,
      itemActiveEffects,
      spellActiveEffects,
      magicItems,
      weapons,
      armor,
      skills,
      senses,
      conditions,
      rulesActions,
      optionalFeatures,
      charOptions,
      mundaneGear,
      weaponMasteries,
      itemProperties,
      itemTypes,
      itemTypeAdditionalEntries,
      itemGroups,
      magicVariants,
      itemCardReferences,
      challengeRatings,
      creatureBuilderEntries,
    ] = await Promise.all([
      getClassesFromDb(),
      getSpeciesFromDb(),
      getSpeciesVariantsFromDb(),
      getSubclassesFromDb(),
      getBackgroundsFromDb(),
      getFeatsFromDb(),
      getSpellsFromDb(),
      getClassSpellsFromDb(),
      getClassFeaturesFromDb(),
      getLanguagesFromDb(),
      getActiveEffectsFromDb(),
      getFeatureActiveEffectsFromDb(),
      getItemActiveEffectsFromDb(),
      getSpellActiveEffectsFromDb(),
      getMagicItemsFromDb(),
      getWeaponsFromDb(),
      getArmorFromDb(),
      getSkillsFromDb(),
      getSensesFromDb(),
      getConditionsFromDb(),
      getRulesActionsFromDb(),
      getOptionalFeaturesFromDb(),
      getCharOptionsFromDb(),
      getMundaneGearFromDb(),
      getWeaponMasteriesFromDb(),
      getItemPropertiesFromDb(),
      getItemTypesFromDb(),
      getItemTypeAdditionalEntriesFromDb(),
      getItemGroupsFromDb(),
      getMagicVariantsFromDb(),
      getItemCardReferencesFromDb(),
      getChallengeRatingsFromDb(),
      getCreatureBuilderEntriesFromDb(),
    ]);

    let initialCharacter = null;
    if (search.id) {
      try {
        const { db } = await import("../lib/drizzle.server");
        const schema = await import("../db/schema");
        const { eq } = await import("drizzle-orm");

        const rows = await db
          .select()
          .from(schema.characters)
          .where(eq(schema.characters.id, search.id.toString()));

        if (rows.length > 0) {
          if (rows[0].builderStateJson) {
            initialCharacter = JSON.parse(rows[0].builderStateJson);
          } else if (rows[0].rawJson) {
            // Imported character without native state. Build a synthetic builderState
            const member = JSON.parse(rows[0].rawJson);
            const mapped = await mapNamesToIds(
              member.race || null,
              member.background || null,
              member.classes || null,
              member.subclasses || [],
            );

            const abilitiesObj: Record<string, number> = {
              STR: 10,
              DEX: 10,
              CON: 10,
              INT: 10,
              WIS: 10,
              CHA: 10,
            };
            if (Array.isArray(member.abilities)) {
              for (const ab of member.abilities) {
                if (ab && typeof ab === "object" && typeof ab.name === "string" && typeof ab.score === "number") {
                  abilitiesObj[ab.name] = ab.score;
                }
              }
            }

            initialCharacter = {
              name: member.name || "Unnamed Hero",
              raceId: mapped.raceId,
              speciesVariantId: null,
              backgroundId: mapped.backgroundId,
              classId: mapped.classId,
              subclassId: mapped.subclassId,
              level: mapped.level || 1,
              abilities: abilitiesObj,
              abilityBonuses: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 },
              ruleChoices: {},
              highLevelFeatChoices: {},
              hpType: "fixed",
              manualHpRolls: {},
              customEquipment: [],
              multiClasses: mapped.multiClasses,
              abilitiesMethod: "standard",
            };
          }

          if (initialCharacter) {
            initialCharacter.id = Number(rows[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load initial character for builder:", err);
      }
    }

    return {
      classes,
      species,
      speciesVariants,
      subclasses,
      backgrounds,
      feats,
      spells,
      classSpells,
      classFeatures,
      languages,
      activeEffects,
      featureActiveEffects,
      itemActiveEffects,
      spellActiveEffects,
      magicItems,
      weapons,
      armor,
      skills,
      senses,
      conditions,
      rulesActions,
      optionalFeatures,
      charOptions,
      mundaneGear,
      weaponMasteries,
      itemProperties,
      itemTypes,
      itemTypeAdditionalEntries,
      itemGroups,
      magicVariants,
      itemCardReferences,
      challengeRatings,
      creatureBuilderEntries,
      initialCharacter,
    };
  },
});
