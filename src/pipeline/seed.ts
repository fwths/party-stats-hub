import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../db/schema";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlite = new Database("sqlite.db");
const db = drizzle(sqlite, { schema });

async function seedBarbarian() {
  console.log("Reading barbarian_final.json...");
  const rawData = fs.readFileSync(path.join(__dirname, "barbarian_final.json"), "utf-8");
  const barb = JSON.parse(rawData);

  console.log("Seeding Barbarian Class into rules.db...");

  // Insert Class
  await db
    .insert(schema.classes)
    .values({
      id: barb.id,
      name: barb.name,
      description: barb.description,
      hitDice: barb.hitPoints.hitDice,
      hitDiceType: barb.hitPoints.hitDiceType,
      hpFirstLevel: barb.hitPoints.hpAtFirstLevelValue,
      hpHigherLevels: barb.hitPoints.hpAtHigherLevelsValue,
      primaryAbilityJson: JSON.stringify(barb.primaryAbility),
      proficienciesJson: JSON.stringify(barb.proficiencies),
      startingEquipmentJson: JSON.stringify(barb.startingEquipment),
      acCalculationJson: JSON.stringify(barb.acCalculation),
      optionsProgressionJson: JSON.stringify(barb.weaponMastery), // Using for mastery
    })
    .onConflictDoNothing();

  console.log("Seeding Barbarian Features...");

  // Insert Features
  for (const levelStr of Object.keys(barb.featuresByLevel)) {
    const level = parseInt(levelStr);
    const features = barb.featuresByLevel[levelStr];

    for (const feat of features) {
      await db
        .insert(schema.classFeatures)
        .values({
          id: feat.id,
          classId: barb.id,
          name: feat.name,
          description: feat.description,
          levelRequired: level,
          actionType: feat.actionType || null,
          mathematicalRecoveryJson: feat.mathematicalRecovery
            ? JSON.stringify(feat.mathematicalRecovery)
            : null,
          usesJson: feat.uses ? JSON.stringify(feat.uses) : null,
          numericalModifiersJson: feat.numericalModifiers
            ? JSON.stringify(feat.numericalModifiers)
            : null,
        })
        .onConflictDoNothing();
    }
  }

  console.log("✅ Successfully seeded the Barbarian and its features into rules.db!");
}

seedBarbarian().catch(console.error);
