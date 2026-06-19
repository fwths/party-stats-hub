import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../db/schema.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const sqlite = new Database("sqlite.db");
const db = drizzle(sqlite, { schema });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function cleanTags(text: string): string {
  if (typeof text !== "string") return "";
  // Strip 5e.tools tags like {@spell Misty Step|XPHB} -> Misty Step
  return text.replace(/{@\w+\s([^|}]+)[^}]*}/g, "$1");
}

function renderEntry(entry: any): string {
  if (!entry) return "";
  if (typeof entry === "string") return cleanTags(entry);

  if (entry.type === "list") {
    const items = (entry.items || []).map((i: any) => `<li>${renderEntry(i)}</li>`).join("");
    return `<ul>${items}</ul>`;
  }
  if (entry.type === "item") {
    return `<strong>${cleanTags(entry.name)}.</strong> ${renderEntry(entry.entry || entry.entries?.join(" "))}`;
  }
  if (entry.type === "table") {
    const thead = `<thead><tr>${(entry.colLabels || []).map((l: string) => `<th>${cleanTags(l)}</th>`).join("")}</tr></thead>`;
    const tbody = `<tbody>${(entry.rows || []).map((r: any[]) => `<tr>${r.map((c) => `<td>${renderEntry(c)}</td>`).join("")}</tr>`).join("")}</tbody>`;
    return `<table class="table-auto w-full">${thead}${tbody}</table>`;
  }
  if (entry.type === "entries" || Array.isArray(entry.entries)) {
    const content = (entry.entries || []).map((e: any) => renderEntry(e)).join("<br/><br/>");
    return entry.name
      ? `<div><strong>${cleanTags(entry.name)}.</strong><br/>${content}</div>`
      : content;
  }

  return "";
}

async function run() {
  console.log("Fetching 5e.tools XPHB (2024) data...");
  const url = "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/races.json";

  let data;
  try {
    const res = await fetch(url);
    data = await res.json();
  } catch (e) {
    console.error("Failed to fetch 5e.tools data", e);
    return;
  }

  const xphbRaces = data.race.filter((r: any) => r.source === "XPHB");
  console.log(`Found ${xphbRaces.length} XPHB races.`);

  for (const race of xphbRaces) {
    const htmlFeatures = race.entries.map((e: any) => renderEntry(e));
    const featuresJson = JSON.stringify(htmlFeatures);

    let sensesObj: any = null;
    if (race.darkvision) {
      sensesObj = { Darkvision: race.darkvision };
    }

    // Grab legacy description to use for 2024 version
    const legacySpecies = await db.query.species.findFirst({
      where: (sp, { eq }) => eq(sp.name, race.name),
    });
    const fallbackDesc =
      legacySpecies?.description || cleanTags(race.entries?.[0]?.entries?.[0] || "");

    // Insert as new 2024 species
    await db
      .insert(schema.species)
      .values({
        id: `${race.name.toLowerCase().replace(/\s+/g, "-")}-2024`,
        name: race.name,
        size: race.size?.join(", ") || "Medium",
        speed: race.speed?.walk || race.speed || 30,
        description: fallbackDesc,
        featuresJson,
        source: "Player's Handbook (2024)",
        sensesJson: sensesObj ? JSON.stringify(sensesObj) : null,
        abilityScoreIncreasesJson: JSON.stringify({ any: 0 }), // 2024 gets ASI from Background
        languagesJson: JSON.stringify(["Common", "+2 Any"]), // Standard 2024 starting languages
        isLineage: false,
      })
      .onConflictDoUpdate({
        target: schema.species.id,
        set: {
          description: fallbackDesc,
          featuresJson,
          source: "Player's Handbook (2024)",
          sensesJson: sensesObj ? JSON.stringify(sensesObj) : null,
          abilityScoreIncreasesJson: JSON.stringify({ any: 0 }),
          languagesJson: JSON.stringify(["Common", "+2 Any"]),
        },
      });
  }

  console.log("Exporting to cache...");
  const finalSpeciesList = await db.select().from(schema.species);
  fs.writeFileSync(
    path.join(__dirname, "../data/species.json"),
    JSON.stringify(finalSpeciesList, null, 2),
  );

  console.log("Successfully ingested 2024 species!");
}

run().catch(console.error);
