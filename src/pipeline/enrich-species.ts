import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../db/schema.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { eq } from "drizzle-orm";

const sqlite = new Database("sqlite.db");
const db = drizzle(sqlite, { schema });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const URLS = [
  "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/races.json",
  "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/fluff-races.json",
];

async function enrich() {
  console.log("Fetching 5e.tools data...");
  let races: any[] = [];

  for (const url of URLS) {
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.race) races = races.concat(data.race);
    } catch (e) {
      console.log(`Failed to fetch ${url}`, e);
    }
  }

  console.log(`Loaded ${races.length} races from 5e.tools`);

  const speciesList = await db.select().from(schema.species);
  console.log(`Loaded ${speciesList.length} species from local DB`);

  let updatedCount = 0;

  for (const sp of speciesList) {
    const ddbName = sp.name.trim().toLowerCase();

    // Find matching 5e.tools race
    const match = races.find(
      (r) => r.name.toLowerCase() === ddbName || ddbName.includes(r.name.toLowerCase()),
    );

    if (match) {
      let didUpdate = false;
      const updates: any = {};

      // Parse Senses (darkvision, blindsight)
      if (!sp.sensesJson && (match.darkvision || match.blindsight)) {
        const senses: Record<string, number> = {};
        if (match.darkvision) senses["Darkvision"] = match.darkvision;
        if (match.blindsight) senses["Blindsight"] = match.blindsight;
        updates.sensesJson = JSON.stringify(senses);
        didUpdate = true;
      }

      // Parse ASI
      if (!sp.abilityScoreIncreasesJson) {
        if (match.ability && match.ability.length > 0) {
          const ab = match.ability[0];
          const parsedAb: Record<string, number> = {};
          for (const key in ab) {
            if (key !== "choose") parsedAb[key] = ab[key];
          }
          if (ab.choose) {
            parsedAb["any"] = ab.choose.count || 1;
          }
          updates.abilityScoreIncreasesJson = JSON.stringify(parsedAb);
          didUpdate = true;
        } else if (
          match.lineage ||
          ["hexblood", "dhampir", "reborn", "lineage"].some((l) => ddbName.includes(l))
        ) {
          // Standard Lineage ASI rule
          updates.abilityScoreIncreasesJson = JSON.stringify({ any: 2, other: 1 });
          didUpdate = true;
        }
      }

      // Parse Languages
      if (
        !sp.languagesJson &&
        match.languageProficiencies &&
        match.languageProficiencies.length > 0
      ) {
        const langObj = match.languageProficiencies[0];
        const parsedLangs = Object.keys(langObj)
          .filter((k) => k !== "any" && k !== "other")
          .map((k) => k.charAt(0).toUpperCase() + k.slice(1));
        if (langObj.any) parsedLangs.push(`+${langObj.any} Any`);
        updates.languagesJson = JSON.stringify(parsedLangs);
        didUpdate = true;
      }

      if (didUpdate) {
        await db.update(schema.species).set(updates).where(eq(schema.species.id, sp.id));
        updatedCount++;
      }
    } else {
      // Fallback for lineages not strictly matched
      if (
        !sp.abilityScoreIncreasesJson &&
        ["hexblood", "dhampir", "reborn", "lineage"].some((l) => ddbName.includes(l))
      ) {
        await db
          .update(schema.species)
          .set({ abilityScoreIncreasesJson: JSON.stringify({ any: 2, other: 1 }) })
          .where(eq(schema.species.id, sp.id));
        updatedCount++;
      }
    }
  }

  console.log(`Successfully enriched ${updatedCount} species.`);

  // Dump to static file
  const finalSpeciesList = await db.select().from(schema.species);
  const dataDir = path.join(__dirname, "../data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(path.join(dataDir, "species.json"), JSON.stringify(finalSpeciesList, null, 2));
  console.log("Exported enriched species table to src/data/species.json");
}

enrich().catch(console.error);
