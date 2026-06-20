import * as fs from "fs";
import * as path from "path";
import * as schema from "../../db/schema";
import { SIZE_MAP, renderEntries, slugify, titleCase } from "../5etools-utils";
import { getSourcePriority, isSourceAllowed } from "../source-config";

type Species = {
  name: string;
  source: string;
  edition?: string;
  page?: number;
  size?: string[];
  speed?: number | Record<string, number>;
  entries?: unknown[];
  ability?: unknown;
  languageProficiencies?: unknown;
  resist?: unknown;
  immune?: unknown;
  darkvision?: number;
  senses?: unknown;
  skillProficiencies?: unknown;
  toolProficiencies?: unknown;
  lineage?: string;
};

function readSpecies(): Species[] {
  const data = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "new data/races.json"), "utf-8"),
  );
  return data.race || [];
}

function selectAllowedSpecies(species: Species[]): Species[] {
  const selected = new Map<string, Species>();

  for (const item of species) {
    if (!isSourceAllowed(item.source)) continue;
    const key = item.name.toLowerCase();
    const existing = selected.get(key);
    const existingPriority = existing ? getSourcePriority(existing.source, existing.edition) : -1;
    const priority = getSourcePriority(item.source, item.edition);
    if (!existing || priority > existingPriority) selected.set(key, item);
  }

  return [...selected.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function formatSize(size: string[] | undefined): string {
  if (!size?.length) return "Medium";
  return size.map((part) => SIZE_MAP[part] || part).join(", ");
}

function formatSpeed(speed: Species["speed"]): number {
  if (typeof speed === "number") return speed;
  if (speed && typeof speed.walk === "number") return speed.walk;
  return 30;
}

function mapFeatures(entries: unknown[] | undefined) {
  return (entries || []).map((entry: any) => ({
    name: entry?.name || "Feature",
    description: renderEntries(entry),
  }));
}

function mapSenses(species: Species) {
  const senses = [];
  if (species.darkvision) senses.push(`Darkvision ${species.darkvision} ft.`);
  if (species.senses) senses.push(species.senses);
  return senses;
}

export async function seedSpecies(db: any) {
  console.log("Seeding species from 5etools data...");

  try {
    const speciesFluffMap = loadSpeciesFluffMap();
    const speciesFoundryMap = loadSpeciesFoundryMap();

    const speciesList = selectAllowedSpecies(readSpecies());

    for (const species of speciesList) {
      const key = `${species.name.toLowerCase()}|${species.source.toLowerCase()}`;
      const fluff = speciesFluffMap.get(key);
      const foundry = speciesFoundryMap.get(key);

      await db
        .insert(schema.species)
        .values({
          id: slugify(species.name),
          name: species.name,
          size: formatSize(species.size),
          speed: formatSpeed(species.speed),
          description: renderEntries(species.entries),
          featuresJson: JSON.stringify(mapFeatures(species.entries)),
          source: species.source,
          page: species.page || null,
          abilityScoreIncreasesJson: JSON.stringify(species.ability || []),
          languagesJson: JSON.stringify(species.languageProficiencies || []),
          resistancesJson: JSON.stringify(species.resist || []),
          immunitiesJson: JSON.stringify(species.immune || []),
          sensesJson: JSON.stringify(mapSenses(species)),
          proficienciesJson: JSON.stringify({
            skills: species.skillProficiencies || [],
            tools: species.toolProficiencies || [],
          }),
          isLineage: !!species.lineage || titleCase(species.name).includes("Lineage"),
          rawJson: JSON.stringify(species),
          fluffJson: fluff ? JSON.stringify(fluff) : null,
          foundryJson: foundry ? JSON.stringify(foundry) : null,
        })
        .onConflictDoUpdate({
          target: schema.species.id,
          set: {
            name: species.name,
            size: formatSize(species.size),
            speed: formatSpeed(species.speed),
            description: renderEntries(species.entries),
            featuresJson: JSON.stringify(mapFeatures(species.entries)),
            source: species.source,
            page: species.page || null,
            abilityScoreIncreasesJson: JSON.stringify(species.ability || []),
            languagesJson: JSON.stringify(species.languageProficiencies || []),
            resistancesJson: JSON.stringify(species.resist || []),
            immunitiesJson: JSON.stringify(species.immune || []),
            sensesJson: JSON.stringify(mapSenses(species)),
            proficienciesJson: JSON.stringify({
              skills: species.skillProficiencies || [],
              tools: species.toolProficiencies || [],
            }),
            isLineage: !!species.lineage || titleCase(species.name).includes("Lineage"),
            rawJson: JSON.stringify(species),
            fluffJson: fluff ? JSON.stringify(fluff) : null,
            foundryJson: foundry ? JSON.stringify(foundry) : null,
          },
        });
    }

    console.log(`Seeded ${speciesList.length} species from 5etools.`);

    // Seed subraces / species variants
    const subraces = readSubraces();
    const allowedSubraces = subraces.filter((s: any) => s.raceName && isSourceAllowed(s.source));
    for (const sub of allowedSubraces) {
      const variantName = sub.name || sub.raceName;
      const id = slugify(`${variantName}-${sub.raceName}-${sub.source}`);
      const desc = renderEntries(sub.entries || []);
      const foundry = getSubraceFoundry(sub, speciesFoundryMap);

      await db
        .insert(schema.speciesVariants)
        .values({
          id,
          speciesId: slugify(sub.raceName),
          name: variantName,
          source: sub.source,
          page: sub.page || null,
          raceName: sub.raceName,
          raceSource: sub.raceSource || "PHB",
          abilityJson: JSON.stringify(sub.ability || []),
          featuresJson: JSON.stringify(mapFeatures(sub.entries)),
          description: desc,
          rawJson: JSON.stringify(sub),
          fluffJson: null,
          foundryJson: foundry ? JSON.stringify(foundry) : null,
        })
        .onConflictDoUpdate({
          target: schema.speciesVariants.id,
          set: {
            speciesId: slugify(sub.raceName),
            name: variantName,
            source: sub.source,
            page: sub.page || null,
            raceName: sub.raceName,
            raceSource: sub.raceSource || "PHB",
            abilityJson: JSON.stringify(sub.ability || []),
            featuresJson: JSON.stringify(mapFeatures(sub.entries)),
            description: desc,
            rawJson: JSON.stringify(sub),
            fluffJson: null,
            foundryJson: foundry ? JSON.stringify(foundry) : null,
          },
        });
    }
    console.log(`Seeded ${allowedSubraces.length} species subraces/variants.`);
  } catch (e) {
    console.error("Error seeding species:", e);
    throw e;
  }
}

function readSubraces(): any[] {
  const data = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "new data/races.json"), "utf-8"),
  );
  return data.subrace || [];
}

function loadSpeciesFluffMap(): Map<string, any> {
  const map = new Map<string, any>();
  const filepath = path.join(process.cwd(), "new data/fluff-races.json");
  if (fs.existsSync(filepath)) {
    const data = JSON.parse(fs.readFileSync(filepath, "utf-8"));
    const list = data.raceFluff || [];
    for (const item of list) {
      const key = `${item.name.toLowerCase()}|${item.source.toLowerCase()}`;
      map.set(key, item);
    }
  }
  return map;
}

function loadSpeciesFoundryMap(): Map<string, any> {
  const map = new Map<string, any>();
  const filepath = path.join(process.cwd(), "new data/foundry-races.json");
  if (fs.existsSync(filepath)) {
    const data = JSON.parse(fs.readFileSync(filepath, "utf-8"));
    const list = data.race || [];
    for (const item of list) {
      const key = `${item.name.toLowerCase()}|${item.source.toLowerCase()}`;
      map.set(key, item);
    }
  }
  return map;
}

function getSubraceFoundry(
  sub: { name?: string; raceName: string; source: string },
  foundryMap: Map<string, any>,
): any {
  const variantName = sub.name || sub.raceName;
  // Try direct name + source match
  let key = `${variantName.toLowerCase()}|${sub.source.toLowerCase()}`;
  if (foundryMap.has(key)) return foundryMap.get(key);

  // Try "Race (Subrace)" + source match
  key = `${sub.raceName.toLowerCase()} (${variantName.toLowerCase()})|${sub.source.toLowerCase()}`;
  if (foundryMap.has(key)) return foundryMap.get(key);

  // Try "Subrace Race" + source match
  key = `${variantName.toLowerCase()} ${sub.raceName.toLowerCase()}|${sub.source.toLowerCase()}`;
  if (foundryMap.has(key)) return foundryMap.get(key);

  return null;
}
