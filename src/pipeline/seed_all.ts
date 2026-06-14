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

async function seedAll() {
  console.log("Seeding entire database from pre-parsed JSONs...");

  // 1. Seed Classes
  const classesDir = path.join(__dirname, "../../parsed_classes");
  if (fs.existsSync(classesDir)) {
    const classFiles = fs.readdirSync(classesDir).filter((f) => f.endsWith(".json"));
    for (const file of classFiles) {
      try {
        const rawData = fs.readFileSync(path.join(classesDir, file), "utf-8");
        const data = JSON.parse(rawData);

        // Some old scripts don't perfectly match our new schema. We do our best.
        await db
          .insert(schema.classes)
          .values({
            id: data.id || file.replace(".json", ""),
            name: data.name || data.className || file.replace(".json", ""),
            description: data.description || "",
            hitDice: data.hitPoints?.hitDice || 8,
            hitDiceType: data.hitPoints?.hitDiceType || "d8",
            hpFirstLevel: data.hitPoints?.hpAtFirstLevelValue || 8,
            hpHigherLevels: data.hitPoints?.hpAtHigherLevelsValue || 5,
            primaryAbilityJson: JSON.stringify(data.primaryAbility || []),
            proficienciesJson: JSON.stringify(data.proficiencies || {}),
            startingEquipmentJson: JSON.stringify(data.startingEquipment || {}),
            acCalculationJson: JSON.stringify(data.acCalculation || {}),
            speedJson: JSON.stringify(data.speed || {}),
            sensesJson: JSON.stringify(data.senses || {}),
            spellcastingJson: JSON.stringify(data.spellcasting || {}),
            infusionsJson: JSON.stringify(data.infusions || {}),
            wildShapeJson: JSON.stringify(data.wildShape || {}),
            optionsProgressionJson: JSON.stringify(
              data.weaponMastery || data.optionsProgression || {},
            ),
          })
          .onConflictDoNothing();

        console.log(`Seeded class: ${data.name || file}`);
      } catch (e) {
        console.error(`Error seeding class file ${file}:`, e);
      }
    }
  }

  // 2. Seed Spells
  const spellsFile = path.join(__dirname, "../data/reference/spells.json");
  if (fs.existsSync(spellsFile)) {
    try {
      const rawSpells = fs.readFileSync(spellsFile, "utf-8");
      const spellsData = JSON.parse(rawSpells);

      // Assume it's an array of spells or an object containing an array
      const spellsList = Array.isArray(spellsData) ? spellsData : spellsData.spells || [];

      for (const spell of spellsList) {
        await db
          .insert(schema.spells)
          .values({
            id: spell.id || spell.name.toLowerCase().replace(/\s+/g, "-"),
            name: spell.name,
            level: spell.level || 0,
            school: spell.school || "Evocation",
            castingTime: spell.castingTime || "1 action",
            range: spell.range || "120 feet",
            duration: spell.duration || "Instantaneous",
            concentration: !!spell.concentration,
            ritual: !!spell.ritual,
            description: spell.description || "",
            componentsJson: JSON.stringify(spell.components || {}),
            damageJson: JSON.stringify(spell.damage || {}),
            healingJson: JSON.stringify(spell.healing || {}),
            savingThrowJson: JSON.stringify(spell.savingThrow || {}),
            areaOfEffectJson: JSON.stringify(spell.areaOfEffect || {}),
            attackRoll: !!spell.attackRoll,
          })
          .onConflictDoNothing();
      }
      console.log(`Seeded ${spellsList.length} spells.`);
    } catch (e) {
      console.error("Error seeding spells:", e);
    }
  }

  // 3. Seed Feats
  const featsFile = path.join(__dirname, "../data/reference/feats.json");
  if (fs.existsSync(featsFile)) {
    try {
      const rawFeats = fs.readFileSync(featsFile, "utf-8");
      const featsData = JSON.parse(rawFeats);
      const featsList = Array.isArray(featsData) ? featsData : featsData.feats || [];

      for (const feat of featsList) {
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
          })
          .onConflictDoNothing();
      }
      console.log(`Seeded ${featsList.length} feats.`);
    } catch (e) {
      console.error("Error seeding feats:", e);
    }
  }

  console.log("✅ Fully seeded the database from pre-parsed JSON files!");
}

seedAll().catch(console.error);
