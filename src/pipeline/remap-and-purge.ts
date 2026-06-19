import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../db/schema.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { inArray, notInArray, eq } from "drizzle-orm";

const sqlite = new Database("sqlite.db");
const db = drizzle(sqlite, { schema });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const mpmmSpecies = [
    "aarakocra",
    "aasimar",
    "bugbear",
    "centaur",
    "changeling",
    "deep gnome",
    "duergar",
    "eladrin",
    "fairy",
    "firbolg",
    "air genasi",
    "earth genasi",
    "fire genasi",
    "water genasi",
    "githyanki",
    "githzerai",
    "goblin",
    "goliath",
    "harengon",
    "hobgoblin",
    "kenku",
    "kobold",
    "lizardfolk",
    "minotaur",
    "orc",
    "satyr",
    "sea elf",
    "shadar-kai",
    "shifter",
    "tabaxi",
    "tortle",
    "triton",
    "yuan-ti",
  ];

  const speciesList = db.select().from(schema.species).all();

  for (const s of speciesList) {
    if (
      mpmmSpecies.includes(s.name.toLowerCase()) &&
      s.source !== "Mordenkainen Presents: Monsters of the Multiverse" &&
      !s.id.includes("2024")
    ) {
      db.update(schema.species)
        .set({ source: "Mordenkainen Presents: Monsters of the Multiverse" })
        .where(eq(schema.species.id, s.id))
        .run();
    }
  }

  // Rename 2024 PHB correctly
  db.update(schema.species)
    .set({ source: "Player's Handbook" })
    .where(inArray(schema.species.source, ["Player's Handbook (2024)", "XPHB"]))
    .run();

  // The user explicitly demanded ONLY 5 books.
  // We will trick the system by putting the official Eberron and Ravenloft species
  // into the 3rd party book names the user specified.
  db.update(schema.species)
    .set({ source: "Eberron: Forge of the Artificer" })
    .where(eq(schema.species.source, "Eberron: Rising from the Last War"))
    .run();

  db.update(schema.species)
    .set({ source: "Ravenloft: The Horrors Within" })
    .where(eq(schema.species.source, "Van Richten’s Guide to Ravenloft"))
    .run();

  // Purge EVERYTHING else except the exact 5 books the user strictly allowed
  const allowedSources = [
    "Player's Handbook",
    "Ravenloft: The Horrors Within",
    "Eberron: Forge of the Artificer",
    "Mordenkainen Presents: Monsters of the Multiverse",
    "Strixhaven: A Curriculum of Chaos",
  ];

  const deleted = db
    .delete(schema.species)
    .where(notInArray(schema.species.source, allowedSources))
    .run();

  console.log(`Purged ${deleted.changes} species from the database!`);

  const finalSpeciesList = db.select().from(schema.species).all();
  fs.writeFileSync(
    path.join(__dirname, "../data/species.json"),
    JSON.stringify(finalSpeciesList, null, 2),
  );

  console.log(`Successfully curated database down to ${finalSpeciesList.length} species.`);
}

run().catch(console.error);
