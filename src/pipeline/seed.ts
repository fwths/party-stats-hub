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
    
    console.log("\n==============================================");
    console.log("✅ PIPELINE COMPLETE. ALL DATA INGESTED.");
    console.log("==============================================\n");
  } catch (err) {
    console.error("Pipeline failed:", err);
    process.exit(1);
  }
}

seedAll();
