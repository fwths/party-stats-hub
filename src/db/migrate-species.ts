import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { classes } from "../data/srd/classes";
import { races } from "../data/srd/races";
import * as fs from "fs";
import * as path from "path";

// Locate the sqlite.db file at the root of the project
const dbPath = path.join(process.cwd(), "sqlite.db");
const sqlite = new Database(dbPath);
const db = drizzle(sqlite, { schema });

async function migrateAll() {
  console.log("Migrating species from races.ts...");
  for (const race of races) {
    try {
      await db
        .insert(schema.species)
        .values({
          id: race.id,
          name: race.name,
          size: race.size || "Medium",
          speed: race.speed || 30,
          description: race.description || "",
          featuresJson: JSON.stringify(race.features || []),
          source: race.source,
        })
        .onConflictDoNothing();
      console.log(`Inserted species: ${race.name}`);
    } catch (e) {
      console.error(`Failed to insert species ${race.name}:`, e);
    }
  }

  console.log("Migrating subclasses from parsed_classes/...");
  const classesDir = path.join(process.cwd(), "parsed_classes");
  const classFiles = fs.readdirSync(classesDir).filter((f) => f.endsWith(".json"));
  for (const file of classFiles) {
    const rawData = fs.readFileSync(path.join(classesDir, file), "utf-8");
    const c = JSON.parse(rawData);

    if (c.subclasses && c.subclasses.length > 0) {
      for (const sub of c.subclasses) {
        try {
          await db
            .insert(schema.subclasses)
            .values({
              id: sub.id,
              classId: c.id === "barbarian" ? "class_barbarian_2024" : c.id,
              name: sub.name,
              description: sub.description || "",
              levelChosen: sub.levelChosen || 3,
              spellcastingJson: JSON.stringify(sub.featuresByLevel || {}),
            })
            .onConflictDoNothing();
          console.log(`Inserted subclass: ${sub.name} (for ${c.name})`);
        } catch (e) {
          console.error(`Failed to insert subclass ${sub.name}:`, e);
        }
      }
    }
  }

  console.log("Migrating subclasses from subclasses.json...");
  const subclassesJsonPath = path.join(process.cwd(), "src/data/reference/subclasses.json");
  if (fs.existsSync(subclassesJsonPath)) {
    const rawSubclasses = JSON.parse(fs.readFileSync(subclassesJsonPath, "utf-8"));
    for (const sub of rawSubclasses) {
      try {
        const classId = sub.parentClass.toLowerCase();
        await db
          .insert(schema.subclasses)
          .values({
            id: sub.id,
            classId: classId,
            name: sub.name,
            description: sub.description || "",
            levelChosen: 3,
            spellcastingJson: JSON.stringify(sub.featuresByLevel || {}),
          })
          .onConflictDoNothing();
        console.log(`Inserted subclass: ${sub.name} (for ${sub.parentClass})`);
      } catch (e) {
        console.error(
          `Failed to insert subclass ${sub.name} (foreign key might fail if class doesn't exist):`,
          e,
        );
      }
    }
  }

  console.log("Migration complete!");
}

migrateAll().catch(console.error);
