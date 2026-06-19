import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../db/schema.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { inArray, notInArray } from "drizzle-orm";

const sqlite = new Database("sqlite.db");
const db = drizzle(sqlite, { schema });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log("Renaming 2024 Core to 'Player's Handbook'...");
  db.update(schema.species)
    .set({ source: "Player's Handbook" })
    .where(inArray(schema.species.source, ["Player's Handbook (2024)", "XPHB"]))
    .run();

  const allowedSources = [
    "Player's Handbook",
    "Ravenloft: The Horrors Within",
    "Eberron: Forge of the Artificer",
    "Mordenkainen Presents: Monsters of the Multiverse",
    "Strixhaven: A Curriculum of Chaos",
  ];

  console.log("Purging all other species...");
  const deleted = db
    .delete(schema.species)
    .where(notInArray(schema.species.source, allowedSources))
    .run();

  console.log(`Purged ${deleted.changes} species from the database!`);

  console.log("Exporting curated list to cache...");
  const finalSpeciesList = db.select().from(schema.species).all();
  fs.writeFileSync(
    path.join(__dirname, "../data/species.json"),
    JSON.stringify(finalSpeciesList, null, 2),
  );

  console.log(`Successfully curated database down to ${finalSpeciesList.length} species.`);
}

run().catch(console.error);
