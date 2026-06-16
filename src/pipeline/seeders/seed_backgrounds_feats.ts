import * as fs from "fs";
import * as path from "path";
import * as schema from "../../db/schema";
import { BackgroundSchema, OriginFeatSchema } from "../zodSchemas";
import { z } from "zod";

export async function seedBackgroundsFeats(db: any) {
  console.log("Seeding backgrounds and feats from raw data...");

  const dataDir = path.join(process.cwd(), "src/data/raw/character_options");

  // 1. Feats
  const featsFile = path.join(dataDir, "feats.json");
  if (fs.existsSync(featsFile)) {
    try {
      const rawFeats = fs.readFileSync(featsFile, "utf-8");
      const feats = JSON.parse(rawFeats);

      for (const feat of feats) {
        const mappedFeat = {
          ...feat,
          id: feat.id || feat.name.toLowerCase().replace(/\s+/g, "-"),
          prerequisite: feat.prerequisite || undefined,
        };

        // Robust Schema Validation for Origin Feats
        if (feat.category === "Origin") {
          const parsedFeat = OriginFeatSchema.safeParse(mappedFeat);
          if (!parsedFeat.success) {
            console.error(`Validation failed for Origin Feat ${feat.name}:`, parsedFeat.error.message);
            continue;
          }
        }

        await db
          .insert(schema.feats)
          .values({
            id: feat.id || feat.name.toLowerCase().replace(/\s+/g, "-"),
            name: feat.name,
            category: feat.category || "General",
            description: feat.description || "",
            prerequisite: feat.prerequisite || null,
            levelRequirement: feat.levelRequirement || null,
            repeatable: !!feat.repeatable,
            abilityScoreImprovementJson: JSON.stringify(feat.abilityScoreImprovement || {}),
            source: feat.source || "",
            page: feat.page || null,
          })
          .onConflictDoUpdate({
            target: schema.feats.id,
            set: {
              name: feat.name,
              category: feat.category || "General",
              description: feat.description || "",
              prerequisite: feat.prerequisite || null,
              levelRequirement: feat.levelRequirement || null,
              repeatable: !!feat.repeatable,
              abilityScoreImprovementJson: JSON.stringify(feat.abilityScoreImprovement || {}),
              source: feat.source || "",
              page: feat.page || null,
            },
          });
      }
      console.log(`Seeded ${feats.length} feats.`);
    } catch (e) {
      console.error("Error seeding feats:", e);
    }
  }

  // 2. Backgrounds
  const bgFile = path.join(dataDir, "backgrounds.json");
  if (fs.existsSync(bgFile)) {
    try {
      const rawBgs = fs.readFileSync(bgFile, "utf-8");
      const backgrounds = JSON.parse(rawBgs);

      for (const bg of backgrounds) {
        const parsedBg = BackgroundSchema.safeParse(bg);
        if (!parsedBg.success) {
          console.error(`Validation failed for background ${bg.name}:`, parsedBg.error.message);
          continue;
        }
        
        const validBg = parsedBg.data;

        await db
          .insert(schema.backgrounds)
          .values({
            id: validBg.id,
            name: validBg.name,
            description: validBg.description,
            abilityScoreIncreasesJson: JSON.stringify(validBg.abilityScoreIncreases),
            skillProficienciesJson: JSON.stringify(validBg.skillProficiencies),
            toolProficienciesJson: JSON.stringify(validBg.toolProficiencies),
            startingEquipmentJson: JSON.stringify(validBg.startingEquipment),
            originFeatId: validBg.originFeatId || null,
            source: (bg as any).source || "",
            page: (bg as any).page || null,
          })
          .onConflictDoUpdate({
            target: schema.backgrounds.id,
            set: {
              name: validBg.name,
              description: validBg.description,
              abilityScoreIncreasesJson: JSON.stringify(validBg.abilityScoreIncreases),
              skillProficienciesJson: JSON.stringify(validBg.skillProficiencies),
              toolProficienciesJson: JSON.stringify(validBg.toolProficiencies),
              startingEquipmentJson: JSON.stringify(validBg.startingEquipment),
              originFeatId: validBg.originFeatId || null,
              source: (bg as any).source || "",
              page: (bg as any).page || null,
            },
          });
      }
      console.log(`Seeded ${backgrounds.length} backgrounds perfectly.`);
    } catch (e) {
      console.error(`Failed to inject backgrounds`, e);
    }
  }
}
