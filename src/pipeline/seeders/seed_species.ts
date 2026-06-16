import * as fs from "fs";
import * as path from "path";
import * as schema from "../../db/schema";

export async function seedSpecies(db: any) {
  console.log("Seeding species from enriched cache...");
  const speciesFile = path.join(process.cwd(), "src/data/species.json");
  if (fs.existsSync(speciesFile)) {
    try {
      const raw = fs.readFileSync(speciesFile, "utf-8");
      const speciesData = JSON.parse(raw);

      for (const sp of speciesData) {
        await db
          .insert(schema.species)
          .values({
            id: sp.id,
            name: sp.name,
            size: sp.size || "Medium",
            speed: sp.speed || 30,
            description: sp.description || "",
            featuresJson: sp.featuresJson || "[]",
            source: sp.source || "",
            page: sp.page || null,
            abilityScoreIncreasesJson: sp.abilityScoreIncreasesJson,
            languagesJson: sp.languagesJson,
            resistancesJson: sp.resistancesJson,
            immunitiesJson: sp.immunitiesJson,
            sensesJson: sp.sensesJson,
            proficienciesJson: sp.proficienciesJson,
            isLineage: sp.isLineage || false,
          })
          .onConflictDoUpdate({
            target: schema.species.id,
            set: {
              name: sp.name,
              size: sp.size || "Medium",
              speed: sp.speed || 30,
              description: sp.description || "",
              featuresJson: sp.featuresJson || "[]",
              source: sp.source || "",
              page: sp.page || null,
              abilityScoreIncreasesJson: sp.abilityScoreIncreasesJson,
              languagesJson: sp.languagesJson,
              resistancesJson: sp.resistancesJson,
              immunitiesJson: sp.immunitiesJson,
              sensesJson: sp.sensesJson,
              proficienciesJson: sp.proficienciesJson,
              isLineage: sp.isLineage || false,
            },
          });
      }
      console.log(`Seeded ${speciesData.length} species.`);
    } catch (e) {
      console.error("Error seeding species:", e);
    }
  }
}
