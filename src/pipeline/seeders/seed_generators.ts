import * as fs from "fs";
import * as path from "path";
import * as schema from "../../db/schema";
import { renderEntries, slugify } from "../5etools-utils";
import { isSourceAllowed } from "../source-config";

export async function seedGenerators(db: any) {
  console.log("Seeding life and name generator tables...");

  try {
    // 1. Ingest life.json
    const lifeData = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "new data/life.json"), "utf-8"),
    );

    const rows: any[] = [];

    const classes = lifeData.lifeClass || [];
    for (const c of classes) {
      if (!isSourceAllowed(c.source)) continue;
      const id = slugify(`life-class-${c.name}-${c.source}`);
      rows.push({
        id,
        name: c.name,
        source: c.source,
        page: c.page || null,
        kind: "class",
        tablesJson: JSON.stringify({
          reasons: c.reasons || [],
          other: c.other || {},
        }),
        rawJson: JSON.stringify(c),
      });
    }

    const backgrounds = lifeData.lifeBackground || [];
    for (const bg of backgrounds) {
      if (!isSourceAllowed(bg.source)) continue;
      const id = slugify(`life-background-${bg.name}-${bg.source}`);
      rows.push({
        id,
        name: bg.name,
        source: bg.source,
        page: bg.page || null,
        kind: "background",
        tablesJson: JSON.stringify({
          reasons: bg.reasons || [],
        }),
        rawJson: JSON.stringify(bg),
      });
    }

    const trinkets = lifeData.lifeTrinket || [];
    if (trinkets.length > 0) {
      const id = "life-trinkets";
      rows.push({
        id,
        name: "Trinkets",
        source: "PHB",
        page: 160,
        kind: "trinket",
        tablesJson: JSON.stringify(trinkets),
        rawJson: JSON.stringify({ name: "Trinkets", source: "PHB", trinkets }),
      });
    }

    // 2. Ingest names.json
    const namesData = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "new data/names.json"), "utf-8"),
    );
    const names = namesData.name || [];
    let nameCount = 0;
    for (const nameTable of names) {
      if (!isSourceAllowed(nameTable.source || "XGE")) continue;
      const id = slugify(`name-${nameTable.name}-${nameTable.source || "XGE"}`);
      rows.push({
        id,
        name: nameTable.name,
        source: nameTable.source || "XGE",
        page: nameTable.page || null,
        kind: "name",
        tablesJson: JSON.stringify(nameTable.tables || []),
        rawJson: JSON.stringify(nameTable),
      });
      nameCount++;
    }

    const BATCH_SIZE = 1000;
    if (rows.length > 0) {
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        await db
          .insert(schema.lifeNameTables)
          .values(rows.slice(i, i + BATCH_SIZE))
          .onConflictDoNothing();
      }
    }

    console.log(
      `Seeded life/name tables: ${classes.length} classes, ${backgrounds.length} backgrounds, 1 trinket table, ${nameCount} name tables.`,
    );
  } catch (e) {
    console.error("Error seeding life/name generator tables:", e);
    throw e;
  }
}
