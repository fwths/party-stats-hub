import * as fs from "fs";
import * as path from "path";
import * as schema from "../../db/schema";
import { WeaponSchema } from "../zodSchemas";
import { z } from "zod";

export async function seedEquipment(db: any) {
  console.log("Seeding equipment and magic items from raw data...");
  const itemsDir = path.join(process.cwd(), "src/data/raw/items");

  // 1. Weapons
  const weaponsFile = path.join(itemsDir, "weapons.json");
  if (fs.existsSync(weaponsFile)) {
    try {
      const raw = fs.readFileSync(weaponsFile, "utf-8");
      const weapons = JSON.parse(raw);
      for (const w of weapons) {
        const mappedWeapon = {
          ...w,
          id: w.id || w.name.toLowerCase().replace(/\s+/g, "-"),
          damage: w.damage || { dice: "1d4", type: "bludgeoning" },
          properties: w.properties || [],
        };
        // Validation
        const parsed = WeaponSchema.safeParse(mappedWeapon);
        if (!parsed.success) {
          console.error(`Validation failed for Weapon ${w.name}:`, parsed.error.message);
          continue;
        }

        const validWeapon = parsed.data;

        await db
          .insert(schema.weapons)
          .values({
            id: validWeapon.id,
            name: validWeapon.name,
            category: validWeapon.category,
            type: validWeapon.type,
            costGp: validWeapon.costGp,
            damageDice: validWeapon.damage.dice,
            damageType: validWeapon.damage.type,
            versatileDice: validWeapon.damage.versatileDice || null,
            rangeNormal: validWeapon.range?.normal || null,
            rangeLong: validWeapon.range?.long || null,
            mastery: validWeapon.mastery || null,
            propertiesJson: JSON.stringify(validWeapon.properties || []),
            weight: validWeapon.weight,
          })
          .onConflictDoUpdate({
            target: schema.weapons.id,
            set: {
              name: validWeapon.name,
              category: validWeapon.category,
              type: validWeapon.type,
              costGp: validWeapon.costGp,
              damageDice: validWeapon.damage.dice,
              damageType: validWeapon.damage.type,
              versatileDice: validWeapon.damage.versatileDice || null,
              rangeNormal: validWeapon.range?.normal || null,
              rangeLong: validWeapon.range?.long || null,
              mastery: validWeapon.mastery || null,
              propertiesJson: JSON.stringify(validWeapon.properties || []),
              weight: validWeapon.weight,
            },
          });
      }
      console.log(`Seeded ${weapons.length} weapons.`);
    } catch (e) {
      console.error("Error seeding weapons:", e);
    }
  }

  // 2. Armor
  const armorFile = path.join(itemsDir, "armor.json");
  if (fs.existsSync(armorFile)) {
    try {
      const raw = fs.readFileSync(armorFile, "utf-8");
      const armors = JSON.parse(raw);
      for (const a of armors) {
        await db
          .insert(schema.armor)
          .values({
            id: a.id,
            name: a.name,
            category: a.category,
            costGp: a.costGp,
            acBase: a.acBase,
            acModifier: a.acModifier || null,
            acMaxModifier: a.acMaxModifier || null,
            strengthRequirement: a.strengthRequirement || null,
            stealthDisadvantage: !!a.stealthDisadvantage,
            weight: a.weight,
          })
          .onConflictDoUpdate({
            target: schema.armor.id,
            set: {
              name: a.name,
              category: a.category,
              costGp: a.costGp,
              acBase: a.acBase,
              acModifier: a.acModifier || null,
              acMaxModifier: a.acMaxModifier || null,
              strengthRequirement: a.strengthRequirement || null,
              stealthDisadvantage: !!a.stealthDisadvantage,
              weight: a.weight,
            },
          });
      }
      console.log(`Seeded ${armors.length} armors.`);
    } catch (e) {
      console.error("Error seeding armor:", e);
    }
  }

  // 3. Magic Items
  const magicItemsFile = path.join(itemsDir, "magicitems.json");
  if (fs.existsSync(magicItemsFile)) {
    try {
      const raw = fs.readFileSync(magicItemsFile, "utf-8");
      const items = JSON.parse(raw);
      
      const itemList = Array.isArray(items) ? items : items.items || [];
      for (const mi of itemList) {
        await db
          .insert(schema.magicItems)
          .values({
            id: mi.id || mi.name.toLowerCase().replace(/\s+/g, "-"),
            name: mi.name,
            type: mi.type || "Wondrous Item",
            rarity: mi.rarity || "Uncommon",
            requiresAttunement: !!mi.requiresAttunement,
            attunementConditions: mi.attunementConditions || null,
            description: mi.description || "",
            weight: mi.weight || 0,
            chargesJson: JSON.stringify(mi.charges || null),
          })
          .onConflictDoUpdate({
            target: schema.magicItems.id,
            set: {
              name: mi.name,
              type: mi.type || "Wondrous Item",
              rarity: mi.rarity || "Uncommon",
              requiresAttunement: !!mi.requiresAttunement,
              attunementConditions: mi.attunementConditions || null,
              description: mi.description || "",
              weight: mi.weight || 0,
              chargesJson: JSON.stringify(mi.charges || null),
            },
          });
      }
      console.log(`Seeded ${itemList.length} magic items.`);
    } catch (e) {
      console.error("Error seeding magic items:", e);
    }
  }
}
