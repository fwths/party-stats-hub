import * as fs from "fs";
import * as path from "path";
import * as schema from "../../db/schema";
import {
  ARMOR_TYPE_MAP,
  DAMAGE_TYPE_MAP,
  ITEM_TYPE_MAP,
  PROPERTY_MAP,
  codePart,
  renderEntries,
  slugify,
  titleCase,
} from "../5etools-utils";
import { getSourcePriority, isSourceAllowed } from "../source-config";

type BaseItem = {
  name: string;
  source: string;
  edition?: string;
  type?: string;
  value?: number;
  weight?: number;
  weapon?: boolean;
  armor?: boolean;
  weaponCategory?: string;
  property?: string[];
  mastery?: string[];
  dmg1?: string;
  dmg2?: string;
  dmgType?: string;
  range?: { normal?: number; long?: number };
  ac?: number;
  strength?: string | number;
  stealth?: boolean;
};

type MagicItem = {
  name: string;
  source: string;
  edition?: string;
  type?: string;
  rarity?: string;
  reqAttune?: boolean | string;
  entries?: unknown;
  weight?: number;
  charges?: unknown;
  wondrous?: boolean;
};

function readBaseItems(): BaseItem[] {
  const data = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "new data/items-base.json"), "utf-8"),
  );
  return data.baseitem || [];
}

function readMagicItems(): MagicItem[] {
  const data = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "new data/items.json"), "utf-8"),
  );
  return data.item || [];
}

function selectAllowed<T extends { name: string; source: string }>(items: T[]): T[] {
  const selected = new Map<string, T>();

  for (const item of items) {
    if (!isSourceAllowed(item.source)) continue;
    const key = item.name.toLowerCase();
    const existing = selected.get(key);
    const existingPriority = existing
      ? getSourcePriority(existing.source, (existing as { edition?: string }).edition)
      : -1;
    const priority = getSourcePriority(item.source, (item as { edition?: string }).edition);
    if (!existing || priority > existingPriority) selected.set(key, item);
  }

  return [...selected.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function copperToGp(value: number | undefined): number {
  return Math.round((value || 0) / 100);
}

function mapWeaponType(type: string | undefined): string {
  const code = codePart(type);
  return code === "R" ? "Ranged" : "Melee";
}

function mapProperties(properties: string[] | undefined): string[] {
  return (properties || []).map((property) => {
    const code = codePart(property);
    return PROPERTY_MAP[code] || titleCase(code);
  });
}

function mapMastery(mastery: string[] | undefined): string | null {
  const first = mastery?.[0];
  return first ? codePart(first) : null;
}

function mapArmorCategory(type: string | undefined): string {
  const code = codePart(type);
  return ARMOR_TYPE_MAP[code] || titleCase(code || "Armor");
}

function mapMagicItemType(item: MagicItem): string {
  if (item.wondrous) return "Wondrous Item";
  const code = codePart(item.type);
  return ITEM_TYPE_MAP[code] || titleCase(code || "Magic Item");
}

function mapAttunement(reqAttune: MagicItem["reqAttune"]) {
  if (!reqAttune) return { requiresAttunement: false, attunementConditions: null };
  if (typeof reqAttune === "string") {
    return { requiresAttunement: true, attunementConditions: renderEntries(reqAttune) };
  }
  return { requiresAttunement: true, attunementConditions: null };
}

export async function seedEquipment(db: any) {
  console.log("Seeding equipment and magic items from 5etools data...");

  try {
    const baseItems = readBaseItems();
    const weapons = selectAllowed(baseItems.filter((item) => item.weapon));
    const armors = selectAllowed(baseItems.filter((item) => item.armor));
    const magicItems = selectAllowed(readMagicItems());

    for (const weapon of weapons) {
      const damageTypeCode = weapon.dmgType || "";
      await db
        .insert(schema.weapons)
        .values({
          id: slugify(weapon.name),
          name: weapon.name,
          category: titleCase(weapon.weaponCategory || "Simple"),
          type: mapWeaponType(weapon.type),
          costGp: copperToGp(weapon.value),
          damageDice: weapon.dmg1 || "1d4",
          damageType: DAMAGE_TYPE_MAP[damageTypeCode] || titleCase(damageTypeCode || "Bludgeoning"),
          versatileDice: weapon.dmg2 || null,
          rangeNormal: weapon.range?.normal || null,
          rangeLong: weapon.range?.long || null,
          mastery: mapMastery(weapon.mastery),
          propertiesJson: JSON.stringify(mapProperties(weapon.property)),
          weight: weapon.weight || 0,
        })
        .onConflictDoUpdate({
          target: schema.weapons.id,
          set: {
            name: weapon.name,
            category: titleCase(weapon.weaponCategory || "Simple"),
            type: mapWeaponType(weapon.type),
            costGp: copperToGp(weapon.value),
            damageDice: weapon.dmg1 || "1d4",
            damageType:
              DAMAGE_TYPE_MAP[damageTypeCode] || titleCase(damageTypeCode || "Bludgeoning"),
            versatileDice: weapon.dmg2 || null,
            rangeNormal: weapon.range?.normal || null,
            rangeLong: weapon.range?.long || null,
            mastery: mapMastery(weapon.mastery),
            propertiesJson: JSON.stringify(mapProperties(weapon.property)),
            weight: weapon.weight || 0,
          },
        });
    }

    for (const armor of armors) {
      const category = mapArmorCategory(armor.type);
      await db
        .insert(schema.armor)
        .values({
          id: slugify(armor.name),
          name: armor.name,
          category,
          costGp: copperToGp(armor.value),
          acBase: armor.ac || (category === "Shield" ? 2 : 10),
          acModifier: category === "Shield" || category === "Heavy" ? null : "Dex",
          acMaxModifier: category === "Medium" ? 2 : null,
          strengthRequirement: armor.strength ? Number(armor.strength) : null,
          stealthDisadvantage: !!armor.stealth,
          weight: armor.weight || 0,
        })
        .onConflictDoUpdate({
          target: schema.armor.id,
          set: {
            name: armor.name,
            category,
            costGp: copperToGp(armor.value),
            acBase: armor.ac || (category === "Shield" ? 2 : 10),
            acModifier: category === "Shield" || category === "Heavy" ? null : "Dex",
            acMaxModifier: category === "Medium" ? 2 : null,
            strengthRequirement: armor.strength ? Number(armor.strength) : null,
            stealthDisadvantage: !!armor.stealth,
            weight: armor.weight || 0,
          },
        });
    }

    for (const item of magicItems) {
      const attunement = mapAttunement(item.reqAttune);
      await db
        .insert(schema.magicItems)
        .values({
          id: slugify(item.name),
          name: item.name,
          type: mapMagicItemType(item),
          rarity: titleCase(item.rarity || "Unknown"),
          requiresAttunement: attunement.requiresAttunement,
          attunementConditions: attunement.attunementConditions,
          description: renderEntries(item.entries),
          weight: item.weight || 0,
          chargesJson: JSON.stringify(item.charges || null),
        })
        .onConflictDoUpdate({
          target: schema.magicItems.id,
          set: {
            name: item.name,
            type: mapMagicItemType(item),
            rarity: titleCase(item.rarity || "Unknown"),
            requiresAttunement: attunement.requiresAttunement,
            attunementConditions: attunement.attunementConditions,
            description: renderEntries(item.entries),
            weight: item.weight || 0,
            chargesJson: JSON.stringify(item.charges || null),
          },
        });
    }

    console.log(`Seeded ${weapons.length} weapons.`);
    console.log(`Seeded ${armors.length} armors.`);
    console.log(`Seeded ${magicItems.length} magic items.`);
  } catch (e) {
    console.error("Error seeding equipment:", e);
    throw e;
  }
}
