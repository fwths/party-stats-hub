import * as fs from "fs";
import * as path from "path";
import * as schema from "../../db/schema";
import { z } from "zod";

export async function seedClasses(db: any) {
  console.log("Seeding classes and subclasses from raw data...");

  const classesDir = path.join(process.cwd(), "src/data/raw/classes");
  if (fs.existsSync(classesDir)) {
    const classFiles = fs.readdirSync(classesDir).filter((f) => f.endsWith(".json"));
    for (const file of classFiles) {
      try {
        const rawData = fs.readFileSync(path.join(classesDir, file), "utf-8");
        const data = JSON.parse(rawData);

        // Map class data
        const classId = data.id || file.replace(".json", "");
        await db
          .insert(schema.classes)
          .values({
            id: classId,
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
              data.weaponMastery || data.optionsProgression || {}
            ),
          })
          .onConflictDoUpdate({
            target: schema.classes.id,
            set: {
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
                data.weaponMastery || data.optionsProgression || {}
              ),
            },
          });

        console.log(`Seeded class: ${data.name || file}`);
      } catch (e) {
        console.error(`Error seeding class file ${file}:`, e);
      }
    }
  }

  // Seed Subclasses
  const subclassesFile = path.join(process.cwd(), "src/data/raw/subclasses/subclasses.json");
  if (fs.existsSync(subclassesFile)) {
    try {
      const rawSub = fs.readFileSync(subclassesFile, "utf-8");
      const subData = JSON.parse(rawSub);
      for (const sub of subData) {
        const classId = sub.parentClass?.toLowerCase().replace(/\s+/g, "-") || "unknown";
        await db
          .insert(schema.subclasses)
          .values({
            id: sub.id || sub.name.toLowerCase().replace(/\s+/g, "-"),
            classId: classId,
            name: sub.name,
            description: sub.description || "",
            levelChosen: sub.levelChosen || 3,
            alwaysPreparedSpellsJson: JSON.stringify(sub.alwaysPreparedSpells || []),
            expandedSpellListJson: JSON.stringify(sub.expandedSpellList || []),
            spellcastingJson: JSON.stringify(sub.spellcasting || {}),
          })
          .onConflictDoUpdate({
            target: schema.subclasses.id,
            set: {
              classId: classId,
              name: sub.name,
              description: sub.description || "",
              levelChosen: sub.levelChosen || 3,
              alwaysPreparedSpellsJson: JSON.stringify(sub.alwaysPreparedSpells || []),
              expandedSpellListJson: JSON.stringify(sub.expandedSpellList || []),
              spellcastingJson: JSON.stringify(sub.spellcasting || {}),
            },
          });
      }
      console.log(`Seeded ${subData.length} subclasses.`);
    } catch (e) {
      console.error(`Error seeding subclasses:`, e);
    }
  }
}
