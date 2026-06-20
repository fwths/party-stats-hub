import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function getSnapshot(): Promise<Record<string, any[]>> {
  try {
    const snapshot = await import("./db-snapshot.server");
    return await snapshot.getSnapshot();
  } catch {
    return {};
  }
}

async function queryTable(tableName: string, schemaKey: string): Promise<any[]> {
  try {
    const { db } = await import("./drizzle.server");
    const schema = await import("../db/schema");
    const table = (schema as any)[schemaKey];
    if (table) return await db.select().from(table);
  } catch {
    // better-sqlite3 not available (edge runtime) — use JSON snapshot
  }
  const snapshot = await getSnapshot();
  return snapshot[tableName] || [];
}

export const getClassesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("classes", "classes");
});

export const getSpellsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("spells", "spells");
});

export const getFeatsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("feats", "feats");
});

export const getBackgroundsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("backgrounds", "backgrounds");
});

export const getSpeciesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("species", "species");
});

export const getSubclassesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("subclasses", "subclasses");
});

export const getClassSpellsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("class_spells", "classSpells");
});

export const getClassFeaturesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("class_features", "classFeatures");
});

export const getContentSourcesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("content_sources", "contentSources");
});

export const getCompendiumEntriesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("compendium_entries", "compendiumEntries");
});

export const searchCompendiumEntriesFromDb = createServerFn({ method: "GET" }).handler(
  async ({
    data,
  }: {
    data?: { query?: string; entityType?: string; source?: string; limit?: number };
  }) => {
    const query = data?.query?.trim().toLowerCase() || "";
    const entityType = data?.entityType?.trim();
    const source = data?.source?.trim();
    const limit = Math.min(Math.max(data?.limit || 200, 1), 500);

    try {
      const { db } = await import("./drizzle.server");
      const schema = await import("../db/schema");
      const { and, eq, like, or, sql } = await import("drizzle-orm");
      const filters = [];
      if (query) {
        const pattern = `%${query}%`;
        filters.push(
          or(
            like(sql`lower(${schema.compendiumEntries.name})`, pattern),
            like(sql`lower(${schema.compendiumEntries.searchText})`, pattern),
          ),
        );
      }
      if (entityType) filters.push(eq(schema.compendiumEntries.entityType, entityType));
      if (source) filters.push(eq(schema.compendiumEntries.source, source));

      return await db
        .select()
        .from(schema.compendiumEntries)
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(schema.compendiumEntries.name)
        .limit(limit);
    } catch {
      const snapshot = await getSnapshot();
      return (snapshot.compendium_entries || [])
        .filter((entry: any) => {
          if (entityType && entry.entityType !== entityType) return false;
          if (source && entry.source !== source) return false;
          if (!query) return true;
          return `${entry.name || ""}\n${entry.searchText || ""}`.toLowerCase().includes(query);
        })
        .slice(0, limit);
    }
  },
);

export const getCompendiumSearchMetaFromDb = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { db } = await import("./drizzle.server");
    const schema = await import("../db/schema");
    const { asc, count } = await import("drizzle-orm");

    const entityTypes = await db
      .select({
        entityType: schema.compendiumEntries.entityType,
        count: count(),
      })
      .from(schema.compendiumEntries)
      .groupBy(schema.compendiumEntries.entityType)
      .orderBy(asc(schema.compendiumEntries.entityType));

    const sources = await db
      .select({
        source: schema.compendiumEntries.source,
        count: count(),
      })
      .from(schema.compendiumEntries)
      .groupBy(schema.compendiumEntries.source)
      .orderBy(asc(schema.compendiumEntries.source));

    return { entityTypes, sources };
  } catch {
    return { entityTypes: [], sources: [] };
  }
});

export const getCompendiumFilesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("compendium_files", "compendiumFiles");
});

export const getSourceDocumentsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("source_documents", "sourceDocuments");
});

export const getMonstersFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("monsters", "monsters");
});

export const getMagicItemsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("magic_items", "magicItems");
});

export const getWeaponsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("weapons", "weapons");
});

export const getArmorFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("armor", "armor");
});

export const getVehiclesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("vehicles", "vehicles");
});

export const getBastionsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("bastions", "bastions");
});

export const getHazardsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("hazards", "hazards");
});

export const getCharOptionsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("char_options", "charOptions");
});

export const getOptionalFeaturesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("optional_features", "optionalFeatures");
});

export const getDeitiesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("deities", "deities");
});

export const getRewardsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("rewards", "rewards");
});

export const getObjectsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("objects", "objects");
});

export const getRecipesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("recipes", "recipes");
});

export const getDecksFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("decks", "decks");
});

export const getCardsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("cards", "cards");
});

export const getRollTablesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("roll_tables", "rollTables");
});

export const getVariantRulesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("variant_rules", "variantRules");
});

export const getCultsBoonsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("cults_boons", "cultsBoons");
});

export const getRulesActionsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("rules_actions", "rulesActions");
});

export const getConditionsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("conditions", "conditions");
});

export const getLanguagesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("languages", "languages");
});

export const getLanguageScriptsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("language_scripts", "languageScripts");
});

export const getSkillsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("skills", "skills");
});

export const getSensesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("senses", "senses");
});

export const getActiveEffectsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("active_effects", "activeEffects");
});

export const getSpellActiveEffectsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("spell_active_effects", "spellActiveEffects");
});

export const getFeatureActiveEffectsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("feature_active_effects", "featureActiveEffects");
});

export const getItemActiveEffectsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("item_active_effects", "itemActiveEffects");
});

export const getItemPropertiesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("item_properties", "itemProperties");
});

export const getItemTypesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("item_types", "itemTypes");
});

export const getItemTypeAdditionalEntriesFromDb = createServerFn({ method: "GET" }).handler(
  async () => {
    return await queryTable("item_type_additional_entries", "itemTypeAdditionalEntries");
  },
);

export const getMundaneGearFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("mundane_gear", "mundaneGear");
});

export const getWeaponMasteriesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("weapon_masteries", "weaponMasteries");
});

export const getItemGroupsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("item_groups", "itemGroups");
});

export const getMagicVariantsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("magic_variants", "magicVariants");
});

export const getLootTablesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("loot_tables", "lootTables");
});

export const getTreasureTablesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("treasure_tables", "treasureTables");
});

export const getItemCardReferencesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("item_card_references", "itemCardReferences");
});

export const getVehicleUpgradesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("vehicle_upgrades", "vehicleUpgrades");
});

export const getSpeciesVariantsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("species_variants", "speciesVariants");
});

export const getMonsterFeaturesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("monster_features", "monsterFeatures");
});

export const getCreatureBuilderEntriesFromDb = createServerFn({ method: "GET" }).handler(
  async () => {
    return await queryTable("creature_builder_entries", "creatureBuilderEntries");
  },
);

export const getEncountersFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("encounters", "encounters");
});

export const getLifeNameTablesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("life_name_tables", "lifeNameTables");
});

export const getEncounterShapesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("encounter_shapes", "encounterShapes");
});

export const getChallengeRatingsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("challenge_ratings", "challengeRatings");
});

export const getPsionicsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("psionics", "psionics");
});

export const getMonsterFluffByName = createServerFn({ method: "GET" })
  .inputValidator(z.object({ name: z.string() }))
  .handler(async ({ data }) => {
    try {
      const { db } = await import("./drizzle.server");
      const schema = await import("../db/schema");
      const { eq, sql } = await import("drizzle-orm");
      const row = await db
        .select({ fluffJson: schema.monsters.fluffJson })
        .from(schema.monsters)
        .where(eq(sql`lower(${schema.monsters.name})`, data.name.toLowerCase()))
        .limit(1);
      return row[0]?.fluffJson || null;
    } catch {
      // snapshop fallback if better-sqlite3 not available
      try {
        const snapshot = await getSnapshot();
        const m = (snapshot.monsters || []).find(
          (mon: any) => mon.name.toLowerCase() === data.name.toLowerCase(),
        );
        return m?.fluffJson || null;
      } catch {
        return null;
      }
    }
  });
