import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import * as path from "path";
import * as fs from "fs";

// Locate the sqlite.db file at the root of the project
const dbPath = path.join(process.cwd(), "sqlite.db");
const sqlite = new Database(dbPath);
const db = drizzle(sqlite, { schema });

async function injectData() {
  console.log("Starting backgrounds, weapons, and armor injection...");

  const dataDir = path.join(process.cwd(), "src/data/reference");

  // 1. Inject Backgrounds
  console.log("Reading backgrounds.json...");
  const rawBackgrounds = fs.readFileSync(path.join(dataDir, "backgrounds.json"), "utf-8");
  const backgrounds = JSON.parse(rawBackgrounds);

  console.log(`Injecting ${backgrounds.length} backgrounds...`);
  for (const bg of backgrounds) {
    try {
      await db
        .insert(schema.backgrounds)
        .values({
          id: bg.id,
          name: bg.name,
          description: bg.description,
          abilityScoreIncreasesJson: JSON.stringify(bg.abilityScoreIncreases),
          skillProficienciesJson: JSON.stringify(bg.skillProficiencies),
          toolProficienciesJson: JSON.stringify(bg.toolProficiencies),
          startingEquipmentJson: JSON.stringify(bg.startingEquipment),
          originFeatId: bg.originFeatId || null,
          source: bg.source,
          page: bg.page || null,
        })
        .onConflictDoUpdate({
          target: schema.backgrounds.id,
          set: {
            name: bg.name,
            description: bg.description,
            abilityScoreIncreasesJson: JSON.stringify(bg.abilityScoreIncreases),
            skillProficienciesJson: JSON.stringify(bg.skillProficiencies),
            toolProficienciesJson: JSON.stringify(bg.toolProficiencies),
            startingEquipmentJson: JSON.stringify(bg.startingEquipment),
            originFeatId: bg.originFeatId || null,
            source: bg.source,
            page: bg.page || null,
          },
        });
    } catch (e) {
      console.error(`Failed to inject background: ${bg.name}`, e);
    }
  }

  // 2. Inject Weapons
  console.log("Reading weapons.json...");
  const rawWeapons = fs.readFileSync(path.join(dataDir, "weapons.json"), "utf-8");
  const weapons = JSON.parse(rawWeapons);

  console.log(`Injecting ${weapons.length} weapons...`);
  for (const w of weapons) {
    try {
      await db
        .insert(schema.weapons)
        .values({
          id: w.id,
          name: w.name,
          category: w.category,
          type: w.type,
          costGp: w.costGp,
          damageDice: w.damageDice,
          damageType: w.damageType,
          versatileDice: w.versatileDice,
          rangeNormal: w.rangeNormal,
          rangeLong: w.rangeLong,
          mastery: w.mastery,
          propertiesJson: w.propertiesJson,
          weight: w.weight,
        })
        .onConflictDoUpdate({
          target: schema.weapons.id,
          set: {
            name: w.name,
            category: w.category,
            type: w.type,
            costGp: w.costGp,
            damageDice: w.damageDice,
            damageType: w.damageType,
            versatileDice: w.versatileDice,
            rangeNormal: w.rangeNormal,
            rangeLong: w.rangeLong,
            mastery: w.mastery,
            propertiesJson: w.propertiesJson,
            weight: w.weight,
          },
        });
    } catch (e) {
      console.error(`Failed to inject weapon: ${w.name}`, e);
    }
  }

  // 3. Inject Armor
  console.log("Reading armor.json...");
  const rawArmor = fs.readFileSync(path.join(dataDir, "armor.json"), "utf-8");
  const armor = JSON.parse(rawArmor);

  console.log(`Injecting ${armor.length} armor...`);
  for (const arm of armor) {
    try {
      await db
        .insert(schema.armor)
        .values({
          id: arm.id,
          name: arm.name,
          category: arm.category,
          costGp: arm.costGp,
          acBase: arm.acBase,
          acModifier: arm.acModifier,
          acMaxModifier: arm.acMaxModifier,
          strengthRequirement: arm.strengthRequirement,
          stealthDisadvantage: arm.stealthDisadvantage,
          weight: arm.weight,
        })
        .onConflictDoUpdate({
          target: schema.armor.id,
          set: {
            name: arm.name,
            category: arm.category,
            costGp: arm.costGp,
            acBase: arm.acBase,
            acModifier: arm.acModifier,
            acMaxModifier: arm.acMaxModifier,
            strengthRequirement: arm.strengthRequirement,
            stealthDisadvantage: arm.stealthDisadvantage,
            weight: arm.weight,
          },
        });
    } catch (e) {
      console.error(`Failed to inject armor: ${arm.name}`, e);
    }
  }

  console.log("Injection complete!");

  // Verification count check
  const bgCount = sqlite.prepare("SELECT count(*) as count FROM backgrounds").get() as {
    count: number;
  };
  const wCount = sqlite.prepare("SELECT count(*) as count FROM weapons").get() as { count: number };
  const aCount = sqlite.prepare("SELECT count(*) as count FROM armor").get() as { count: number };

  console.log("\n--- Verification Table Counts ---");
  console.log(`backgrounds: ${bgCount.count}`);
  console.log(`weapons:     ${wCount.count}`);
  console.log(`armor:       ${aCount.count}`);

  if (bgCount.count > 0 && wCount.count > 0 && aCount.count > 0) {
    console.log("✅ Row counts verified non-zero!");
  } else {
    console.error("❌ Row counts verification FAILED: one or more tables are empty!");
  }
}

injectData().catch(console.error);
