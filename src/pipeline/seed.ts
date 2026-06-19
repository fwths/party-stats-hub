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
import { formatSourceConfigSummary } from "./source-config";

// Locate the sqlite.db file at the root of the project
const dbPath = path.join(process.cwd(), "sqlite.db");
const sqlite = new Database(dbPath);
const db = drizzle(sqlite, { schema });

async function resetCompendiumTables() {
  console.log("Resetting compendium tables...");
  await db.delete(schema.compendiumFiles);
  await db.delete(schema.compendiumEntries);
  await db.delete(schema.contentSources);
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
      class_spells: schema.classSpells,
      class_features: schema.classFeatures,
      content_sources: schema.contentSources,
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
