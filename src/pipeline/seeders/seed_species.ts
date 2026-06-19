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
    const speciesList = selectAllowedSpecies(readSpecies());

    for (const species of speciesList) {
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
          },
        });
    }

    console.log(`Seeded ${speciesList.length} species from 5etools.`);
  } catch (e) {
    console.error("Error seeding species:", e);
    throw e;
  }
}
