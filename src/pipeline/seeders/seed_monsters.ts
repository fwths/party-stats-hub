import * as fs from "fs";
import * as path from "path";
import * as schema from "../../db/schema";

// Simple PB calculator based on CR
function getProficiencyBonus(cr: number): number {
  if (cr <= 4) return 2;
  if (cr <= 8) return 3;
  if (cr <= 12) return 4;
  if (cr <= 16) return 5;
  if (cr <= 20) return 6;
  if (cr <= 24) return 7;
  if (cr <= 28) return 8;
  return 9;
}

export async function seedMonsters(db: any) {
  console.log("Seeding monsters from raw data...");

  const monstersFile = path.join(process.cwd(), "src/data/raw/monsters/monsters.json");
  if (fs.existsSync(monstersFile)) {
    try {
      const rawMonsters = fs.readFileSync(monstersFile, "utf-8");
      const monstersData = JSON.parse(rawMonsters);

      let count = 0;
      for (const m of monstersData) {
        // Robust Mapping
        const crValue = parseFloat(m.challenge_rating || m.cr || "0");
        const pbValue = getProficiencyBonus(crValue);

        const stats = {
          str: m.strength || 10,
          dex: m.dexterity || 10,
          con: m.constitution || 10,
          int: m.intelligence || 10,
          wis: m.wisdom || 10,
          cha: m.charisma || 10,
        };

        const saves = {
          str: m.strength_save,
          dex: m.dexterity_save,
          con: m.constitution_save,
          int: m.intelligence_save,
          wis: m.wisdom_save,
          cha: m.charisma_save,
        };

        const acArr = [{ value: m.armor_class, type: m.armor_desc || "natural armor" }];
        
        await db
          .insert(schema.monsters)
          .values({
            id: m.slug || m.name.toLowerCase().replace(/\s+/g, "-"),
            name: m.name,
            size: m.size || "Medium",
            type: m.type || "Humanoid",
            alignment: m.alignment || "Unaligned",
            acJson: JSON.stringify(acArr),
            hpJson: JSON.stringify({ average: m.hit_points, formula: m.hit_dice }),
            speedJson: JSON.stringify(m.speed || { walk: 30 }),
            statsJson: JSON.stringify(stats),
            savesJson: JSON.stringify(saves),
            skillsJson: JSON.stringify(m.skills || {}),
            resistancesJson: JSON.stringify(m.damage_resistances ? [m.damage_resistances] : []),
            immunitiesJson: JSON.stringify(m.damage_immunities ? [m.damage_immunities] : []),
            vulnerabilitiesJson: JSON.stringify(m.damage_vulnerabilities ? [m.damage_vulnerabilities] : []),
            conditionImmunitiesJson: JSON.stringify(m.condition_immunities ? [m.condition_immunities] : []),
            sensesJson: JSON.stringify([m.senses || "passive Perception 10"]),
            languagesJson: JSON.stringify([m.languages || "none"]),
            challengeRating: crValue,
            proficiencyBonus: pbValue,
            traitsJson: JSON.stringify(m.special_abilities || []),
            actionsJson: JSON.stringify(m.actions || []),
            bonusActionsJson: JSON.stringify(m.bonus_actions || []),
            reactionsJson: JSON.stringify(m.reactions || []),
            legendaryActionsJson: JSON.stringify(m.legendary_actions || []),
            mythicActionsJson: JSON.stringify(m.mythic_actions || []),
            lairActionsJson: JSON.stringify([]),
          })
          .onConflictDoUpdate({
            target: schema.monsters.id,
            set: {
              name: m.name,
              size: m.size || "Medium",
              type: m.type || "Humanoid",
              alignment: m.alignment || "Unaligned",
              acJson: JSON.stringify(acArr),
              hpJson: JSON.stringify({ average: m.hit_points, formula: m.hit_dice }),
              speedJson: JSON.stringify(m.speed || { walk: 30 }),
              statsJson: JSON.stringify(stats),
              savesJson: JSON.stringify(saves),
              skillsJson: JSON.stringify(m.skills || {}),
              resistancesJson: JSON.stringify(m.damage_resistances ? [m.damage_resistances] : []),
              immunitiesJson: JSON.stringify(m.damage_immunities ? [m.damage_immunities] : []),
              vulnerabilitiesJson: JSON.stringify(m.damage_vulnerabilities ? [m.damage_vulnerabilities] : []),
              conditionImmunitiesJson: JSON.stringify(m.condition_immunities ? [m.condition_immunities] : []),
              sensesJson: JSON.stringify([m.senses || "passive Perception 10"]),
              languagesJson: JSON.stringify([m.languages || "none"]),
              challengeRating: crValue,
              proficiencyBonus: pbValue,
              traitsJson: JSON.stringify(m.special_abilities || []),
              actionsJson: JSON.stringify(m.actions || []),
              bonusActionsJson: JSON.stringify(m.bonus_actions || []),
              reactionsJson: JSON.stringify(m.reactions || []),
              legendaryActionsJson: JSON.stringify(m.legendary_actions || []),
              mythicActionsJson: JSON.stringify(m.mythic_actions || []),
              lairActionsJson: JSON.stringify([]),
            },
          });
        count++;
      }
      console.log(`Seeded ${count} monsters perfectly.`);
    } catch (e) {
      console.error("Error seeding monsters:", e);
    }
  }
}
