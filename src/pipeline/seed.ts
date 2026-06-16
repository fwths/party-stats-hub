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

// Locate the sqlite.db file at the root of the project
const dbPath = path.join(process.cwd(), "sqlite.db");
const sqlite = new Database(dbPath);
const db = drizzle(sqlite, { schema });

async function seedAll() {
  console.log("==============================================");
  console.log("🚀 STARTING UNIFIED DATABASE INGESTION PIPELINE");
  console.log("==============================================\n");

  try {
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
