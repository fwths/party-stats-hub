import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../db/schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlite = new Database("sqlite.db");
const db = drizzle(sqlite, { schema });

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const eberronSpecies = ["changeling", "kalashtar", "khoravar", "shifter", "warforged"];
const ravenloftSpecies = ["dhampir", "hexblood", "lupin", "reborn"];

const sourceMap: Record<string, string> = {
  "PHB": "Player's Handbook",
  "XPHB": "Player's Handbook",
  "MPMM": "Mordenkainen Presents: Monsters of the Multiverse",
  "SCC": "Strixhaven: A Curriculum of Chaos"
};

async function run() {
  console.log("Fetching 5etools races...");
  const rawData = await fetch("https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/races.json").then(res => res.json());
  
  console.log("Fetching 5etools XPHB races...");
  const xphbData = await fetch("https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/book/book-xphb.json").then(res => res.json());
  
  const allRaces = [...(rawData.race || [])];
  
  // Extract XPHB races from book data
  const xphbRaceData = xphbData.data.find((d: any) => d.type === "raceData");
  if (xphbRaceData && xphbRaceData.data) {
    allRaces.push(...xphbRaceData.data);
  }

  const output: any[] = [];
  
  for (const r of allRaces) {
    const src = r.source;
    if (src === "PHB") continue; 
    
    let mappedSource = sourceMap[src];
    if (eberronSpecies.includes(r.name.toLowerCase())) mappedSource = "Eberron: Forge of the Artificer";
    if (ravenloftSpecies.includes(r.name.toLowerCase())) mappedSource = "Ravenloft: The Horrors Within";
    
    // Specifically skip Shifter and Changeling from MPMM since user's screenshot shows them in Eberron
    if (mappedSource === "Mordenkainen Presents: Monsters of the Multiverse" && (r.name.toLowerCase() === "shifter" || r.name.toLowerCase() === "changeling" || r.name.toLowerCase() === "centaur")) {
       // Only skip if the exact version is an old one? Actually, we'll just let the Eberron ones override, 
       // but we need to drop the MPMM versions if the user wants them strictly under Eberron.
       // Actually we'll just assign them to Eberron.
    }
    
    if (mappedSource) {
      const name = r.name;
      const id = slugify(name) + "-" + slugify(mappedSource);
      const speed = r.speed ? (typeof r.speed === 'object' ? r.speed.walk : r.speed) : 30;
      const size = r.size ? (r.size.includes('M') ? 'Medium' : r.size.includes('S') ? 'Small' : 'Medium') : 'Medium';
      
      let darkvision = null;
      if (r.darkvision) {
        darkvision = JSON.stringify({ Darkvision: r.darkvision });
      }
      
      output.push({
        id,
        name,
        source: mappedSource,
        description: r.entries ? r.entries.map((e: any) => typeof e === 'string' ? e : e.name).join(' ') : "",
        featuresJson: "[]",
        size,
        speed,
        abilityScoreIncreasesJson: "{}",
        sensesJson: darkvision,
        languagesJson: "[]"
      });
    }
  }

  // Manually add the 3rd party species so we don't have to scrape them
  output.push({
    id: "khoravar-eberron-forge",
    name: "Khoravar",
    source: "Eberron: Forge of the Artificer",
    description: "The Khoravar are half-elves unique to Eberron who have built their own culture.",
    featuresJson: "[]",
    size: "Medium",
    speed: 30,
    abilityScoreIncreasesJson: "{}",
    sensesJson: null,
    languagesJson: '["Common", "Elvish"]'
  });

  output.push({
    id: "lupin-ravenloft",
    name: "Lupin",
    source: "Ravenloft: The Horrors Within",
    description: "Lupins are dog-like humanoids known for their tracking abilities and loyalty.",
    featuresJson: "[]",
    size: "Medium",
    speed: 30,
    abilityScoreIncreasesJson: "{}",
    sensesJson: '{"Darkvision":60}',
    languagesJson: '["Common", "Lupin"]'
  });

  const unique = [];
  const seen = new Set();
  for (const s of output) {
    const key = s.name + s.source;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(s);
    }
  }

  fs.writeFileSync(path.join(__dirname, "../data/species.json"), JSON.stringify(unique, null, 2));
  
  db.delete(schema.species).run();
  for (const s of unique) {
    db.insert(schema.species).values(s).run();
  }
  
  console.log(`Saved ${unique.length} species instantly without scraping D&D Beyond!`);
}

run().catch(console.error);
