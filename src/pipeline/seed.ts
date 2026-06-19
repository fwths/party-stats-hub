import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../db/schema";
import * as path from "path";

// Import modular seeders
import { seedClasses } from "./seeders/seed_classes";
import { seedSpells } from "./seeders/seed_spells";
import { seedMonsters } from "./seeders/seed_monsters";
import { seedEquipment } from "./seeders/seed_equipment";
import { seedBackgroundsFeats } from "./seeders/seed_backgrounds_feats";
import { seedSpecies } from "./seeders/seed_species";
import { seedCompendiumRaw } from "./seeders/seed_compendium_raw";
import { seedAdventuringContent } from "./seeders/seed_adventuring_content";
import { seedReferenceEntries } from "./seeders/seed_reference_entries";
import { seedActiveEffects } from "./seeders/seed_active_effects";
import { seedRulesReferences } from "./seeders/seed_rules_references";
import { seedGenerators } from "./seeders/seed_generators";
import { formatSourceConfigSummary } from "./source-config";

// Locate the sqlite.db file at the root of the project
const dbPath = path.join(process.cwd(), "sqlite.db");
const sqlite = new Database(dbPath);
const db = drizzle(sqlite, { schema });

async function resetCompendiumTables() {
  console.log("Resetting compendium tables...");
  await db.delete(schema.compendiumFiles);
  await db.delete(schema.compendiumEntries);
  await db.delete(schema.sourceDocuments);
  await db.delete(schema.contentSources);
  await db.delete(schema.rulesActions);
  await db.delete(schema.conditions);
  await db.delete(schema.languages);
  await db.delete(schema.languageScripts);
  await db.delete(schema.skills);
  await db.delete(schema.senses);
  await db.delete(schema.spellActiveEffects);
  await db.delete(schema.featureActiveEffects);
  await db.delete(schema.itemActiveEffects);
  await db.delete(schema.activeEffects);
  await db.delete(schema.classSpells);
  await db.delete(schema.classFeatures);
  await db.delete(schema.subclasses);
  await db.delete(schema.classes);
  await db.delete(schema.spells);
  await db.delete(schema.species);
  await db.delete(schema.backgrounds);
  await db.delete(schema.feats);
  await db.delete(schema.monsters);
  await db.delete(schema.weapons);
  await db.delete(schema.armor);
  await db.delete(schema.magicItems);
  await db.delete(schema.vehicles);
  await db.delete(schema.bastions);
  await db.delete(schema.hazards);
  await db.delete(schema.charOptions);
  await db.delete(schema.optionalFeatures);
  await db.delete(schema.deities);
  await db.delete(schema.rewards);
  await db.delete(schema.objects);
  await db.delete(schema.recipes);
  await db.delete(schema.decks);
  await db.delete(schema.cards);
  await db.delete(schema.rollTables);
  await db.delete(schema.variantRules);
  await db.delete(schema.cultsBoons);
  await db.delete(schema.itemProperties);
  await db.delete(schema.itemTypes);
  await db.delete(schema.itemTypeAdditionalEntries);
  await db.delete(schema.mundaneGear);
  await db.delete(schema.weaponMasteries);
  await db.delete(schema.itemGroups);
  await db.delete(schema.magicVariants);
  await db.delete(schema.lootTables);
  await db.delete(schema.treasureTables);
  await db.delete(schema.itemCardReferences);
  await db.delete(schema.vehicleUpgrades);
  await db.delete(schema.speciesVariants);
  await db.delete(schema.monsterFeatures);
  await db.delete(schema.creatureBuilderEntries);
  await db.delete(schema.encounters);
  await db.delete(schema.lifeNameTables);
  await db.delete(schema.encounterShapes);
  await db.delete(schema.challengeRatings);
  await db.delete(schema.psionics);
}

async function seedAll() {
  console.log("==============================================");
  console.log("🚀 STARTING UNIFIED DATABASE INGESTION PIPELINE");
  console.log(formatSourceConfigSummary());
  console.log("==============================================\n");

  try {
    await resetCompendiumTables();
    console.log("----------------------------------------------");
    await seedClasses(db);
    console.log("----------------------------------------------");
    await seedSpells(db);
    console.log("----------------------------------------------");
    await seedMonsters(db);
    console.log("----------------------------------------------");
    await seedEquipment(db);
    console.log("----------------------------------------------");
    await seedBackgroundsFeats(db);
    console.log("----------------------------------------------");
    await seedSpecies(db);
    console.log("----------------------------------------------");
    await seedAdventuringContent(db);
    console.log("----------------------------------------------");
    await seedRulesReferences(db);
    console.log("----------------------------------------------");
    await seedReferenceEntries(db);
    console.log("----------------------------------------------");
    await seedActiveEffects(db);
    console.log("----------------------------------------------");
    await seedGenerators(db);
    console.log("----------------------------------------------");
    await seedCompendiumRaw(db);

    // Export all tables to a JSON snapshot for edge runtime fallback
    // Uses drizzle queries to get camelCase column names matching the app's expectations
    console.log("----------------------------------------------");
    console.log("Exporting database snapshot for edge fallback...");
    const fs = await import("fs");
    const tableMap: Record<string, any> = {
      classes: schema.classes,
      subclasses: schema.subclasses,
      spells: schema.spells,
      species: schema.species,
      feats: schema.feats,
      monsters: schema.monsters,
      weapons: schema.weapons,
      armor: schema.armor,
      magic_items: schema.magicItems,
      backgrounds: schema.backgrounds,
      vehicles: schema.vehicles,
      bastions: schema.bastions,
      hazards: schema.hazards,
      rules_actions: schema.rulesActions,
      conditions: schema.conditions,
      languages: schema.languages,
      language_scripts: schema.languageScripts,
      skills: schema.skills,
      senses: schema.senses,
      source_documents: schema.sourceDocuments,
      char_options: schema.charOptions,
      optional_features: schema.optionalFeatures,
      deities: schema.deities,
      rewards: schema.rewards,
      objects: schema.objects,
      recipes: schema.recipes,
      decks: schema.decks,
      cards: schema.cards,
      roll_tables: schema.rollTables,
      variant_rules: schema.variantRules,
      cults_boons: schema.cultsBoons,
      item_properties: schema.itemProperties,
      item_types: schema.itemTypes,
      item_type_additional_entries: schema.itemTypeAdditionalEntries,
      mundane_gear: schema.mundaneGear,
      weapon_masteries: schema.weaponMasteries,
      item_groups: schema.itemGroups,
      magic_variants: schema.magicVariants,
      loot_tables: schema.lootTables,
      treasure_tables: schema.treasureTables,
      item_card_references: schema.itemCardReferences,
      vehicle_upgrades: schema.vehicleUpgrades,
      species_variants: schema.speciesVariants,
      monster_features: schema.monsterFeatures,
      creature_builder_entries: schema.creatureBuilderEntries,
      encounters: schema.encounters,
      life_name_tables: schema.lifeNameTables,
      encounter_shapes: schema.encounterShapes,
      challenge_ratings: schema.challengeRatings,
      psionics: schema.psionics,
      active_effects: schema.activeEffects,
      spell_active_effects: schema.spellActiveEffects,
      feature_active_effects: schema.featureActiveEffects,
      item_active_effects: schema.itemActiveEffects,
      class_spells: schema.classSpells,
      class_features: schema.classFeatures,
      content_sources: schema.contentSources,
      compendium_files: schema.compendiumFiles,
    };
    const snapshot: Record<string, any[]> = {};
    for (const [key, table] of Object.entries(tableMap)) {
      try {
        const rows = await db.select().from(table);
        snapshot[key] = rows;
        console.log(`  Exported ${rows.length} rows from ${key}`);
      } catch (e) {
        console.warn(`  Skipped ${key} (may not exist)`);
        snapshot[key] = [];
      }
    }
    const snapshotPath = path.join(process.cwd(), "src/data/db-snapshot.json");
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot));
    console.log(`Snapshot saved to ${snapshotPath}`);

    console.log("\n==============================================");
    console.log("✅ PIPELINE COMPLETE. ALL DATA INGESTED.");
    console.log("==============================================\n");
  } catch (err) {
    console.error("Pipeline failed:", err);
    process.exit(1);
  }
}

seedAll();
