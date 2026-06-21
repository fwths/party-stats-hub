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
    const itemsFluffMap = loadItemsFluffMap();
    const baseItemsFoundryMap = loadBaseItemsFoundryMap();
    const magicItemsFoundryMap = loadMagicItemsFoundryMap();

    const baseItems = readBaseItems();
    const weapons = selectAllowed(baseItems.filter((item) => item.weapon));
    const armors = selectAllowed(baseItems.filter((item) => item.armor));
    const magicItems = selectAllowed(readMagicItems());

    const weaponRows: any[] = [];
    for (const weapon of weapons) {
      const damageTypeCode = weapon.dmgType || "";
      const key = `${weapon.name.toLowerCase()}|${weapon.source.toLowerCase()}`;
      const fluff = itemsFluffMap.get(key);
      const foundry = baseItemsFoundryMap.get(key);

      weaponRows.push({
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
        source: weapon.source,
        page: (weapon as any).page || null,
        rawJson: JSON.stringify(weapon),
        fluffJson: fluff ? JSON.stringify(fluff) : null,
        foundryJson: foundry ? JSON.stringify(foundry) : null,
      });
    }

    const armorRows: any[] = [];
    for (const armor of armors) {
      const category = mapArmorCategory(armor.type);
      const key = `${armor.name.toLowerCase()}|${armor.source.toLowerCase()}`;
      const fluff = itemsFluffMap.get(key);
      const foundry = baseItemsFoundryMap.get(key);

      armorRows.push({
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
        source: armor.source,
        page: (armor as any).page || null,
        rawJson: JSON.stringify(armor),
        fluffJson: fluff ? JSON.stringify(fluff) : null,
        foundryJson: foundry ? JSON.stringify(foundry) : null,
      });
    }

    const magicItemRows: any[] = [];
    for (const item of magicItems) {
      const attunement = mapAttunement(item.reqAttune);
      const key = `${item.name.toLowerCase()}|${item.source.toLowerCase()}`;
      const fluff = itemsFluffMap.get(key);
      const foundry = magicItemsFoundryMap.get(key);

      magicItemRows.push({
        id: slugify(item.name),
        name: item.name,
        type: mapMagicItemType(item),
        rarity: titleCase(item.rarity || "Unknown"),
        requiresAttunement: attunement.requiresAttunement,
        attunementConditions: attunement.attunementConditions,
        description: renderEntries(item.entries),
        weight: item.weight || 0,
        chargesJson: JSON.stringify(item.charges || null),
        source: item.source,
        page: (item as any).page || null,
        rawJson: JSON.stringify(item),
        fluffJson: fluff ? JSON.stringify(fluff) : null,
        foundryJson: foundry ? JSON.stringify(foundry) : null,
      });
    }

    const BATCH_SIZE = 1000;
    if (weaponRows.length > 0) {
      for (let i = 0; i < weaponRows.length; i += BATCH_SIZE) {
        await db
          .insert(schema.weapons)
          .values(weaponRows.slice(i, i + BATCH_SIZE))
          .onConflictDoNothing();
      }
    }
    if (armorRows.length > 0) {
      for (let i = 0; i < armorRows.length; i += BATCH_SIZE) {
        await db
          .insert(schema.armor)
          .values(armorRows.slice(i, i + BATCH_SIZE))
          .onConflictDoNothing();
      }
    }
    if (magicItemRows.length > 0) {
      for (let i = 0; i < magicItemRows.length; i += BATCH_SIZE) {
        await db
          .insert(schema.magicItems)
          .values(magicItemRows.slice(i, i + BATCH_SIZE))
          .onConflictDoNothing();
      }
    }

    console.log(`Seeded ${weapons.length} weapons.`);
    console.log(`Seeded ${armors.length} armors.`);
    console.log(`Seeded ${magicItems.length} magic items.`);

    // Phase 2 helper seeding
    await seedItemPropertiesAndTypes(db);
    await seedMundaneGearAndMasteries(db, itemsFluffMap, baseItemsFoundryMap);
    await seedItemGroupsAndVariants(db);
    await seedLootAndTreasure(db);
    await seedItemCardReferences(db);
  } catch (e) {
    console.error("Error seeding equipment:", e);
    throw e;
  }
}

async function seedItemCardReferences(db: any) {
  console.log("Seeding item card references...");
  const filePath = path.join(process.cwd(), "new data/makecards.json");
  if (!fs.existsSync(filePath)) {
    console.log("Seeded 0 item card references.");
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const rows = [
    ...(data.reducedItemProperty || []).map((item: any) => ({ ...item, kind: "property" })),
    ...(data.reducedItemType || []).map((item: any) => ({ ...item, kind: "type" })),
  ].filter((item: any) => isSourceAllowed(item.source));

  const insertRows = rows.map((item) => {
    const id = slugify(`item-card-${item.kind}-${item.abbreviation}-${item.source}`);
    return {
      id,
      abbreviation: item.abbreviation,
      source: item.source,
      kind: item.kind,
      name: item.name || null,
      description: renderEntries(item.entries || []),
      rawJson: JSON.stringify(item),
    };
  });

  const BATCH_SIZE = 1000;
  for (let i = 0; i < insertRows.length; i += BATCH_SIZE) {
    await db
      .insert(schema.itemCardReferences)
      .values(insertRows.slice(i, i + BATCH_SIZE))
      .onConflictDoNothing();
  }
  console.log(`Seeded ${rows.length} item card references.`);
}

async function seedItemPropertiesAndTypes(db: any) {
  console.log("Seeding item properties and types...");
  const data = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "new data/items-base.json"), "utf-8"),
  );

  const properties = data.itemProperty || [];
  const allowedProps = properties.filter((p: any) => isSourceAllowed(p.source));
  const propRows = allowedProps.map((prop: any) => {
    const abbreviation = prop.abbreviation;
    const name = prop.name || prop.entries?.[0]?.name || abbreviation;
    return {
      abbreviation,
      name,
      source: prop.source,
      page: prop.page || null,
      description: renderEntries(prop.entries || []),
      rawJson: JSON.stringify(prop),
    };
  });

  const BATCH_SIZE = 1000;
  for (let i = 0; i < propRows.length; i += BATCH_SIZE) {
    await db
      .insert(schema.itemProperties)
      .values(propRows.slice(i, i + BATCH_SIZE))
      .onConflictDoNothing();
  }
  console.log(`Seeded ${allowedProps.length} item properties.`);

  const types = data.itemType || [];
  const allowedTypes = types.filter((t: any) => isSourceAllowed(t.source));
  const typeRows = allowedTypes.map((type: any) => {
    const abbreviation = type.abbreviation;
    return {
      abbreviation,
      name: type.name,
      source: type.source,
      page: type.page || null,
      rawJson: JSON.stringify(type),
    };
  });

  for (let i = 0; i < typeRows.length; i += BATCH_SIZE) {
    await db
      .insert(schema.itemTypes)
      .values(typeRows.slice(i, i + BATCH_SIZE))
      .onConflictDoNothing();
  }
  console.log(`Seeded ${allowedTypes.length} item types.`);

  const typeEntries = data.itemTypeAdditionalEntries || [];
  const allowedTypeEntries = typeEntries.filter((entry: any) => isSourceAllowed(entry.source));
  const entryRows = allowedTypeEntries.map((entry: any) => {
    const id = slugify(`${entry.name}-${entry.appliesTo}-${entry.source}`);
    return {
      id,
      name: entry.name,
      source: entry.source,
      page: entry.page || null,
      appliesTo: entry.appliesTo,
      description: renderEntries(entry.entries || []),
      rawJson: JSON.stringify(entry),
    };
  });

  for (let i = 0; i < entryRows.length; i += BATCH_SIZE) {
    await db
      .insert(schema.itemTypeAdditionalEntries)
      .values(entryRows.slice(i, i + BATCH_SIZE))
      .onConflictDoNothing();
  }
  console.log(`Seeded ${allowedTypeEntries.length} item type additional entries.`);
}

async function seedMundaneGearAndMasteries(
  db: any,
  fluffMap: Map<string, any>,
  foundryMap: Map<string, any>,
) {
  console.log("Seeding mundane gear and weapon masteries...");
  const data = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "new data/items-base.json"), "utf-8"),
  );

  const baseItems = data.baseitem || [];
  const mundane = baseItems.filter(
    (item: any) => !item.weapon && !item.armor && isSourceAllowed(item.source),
  );
  const mundaneRows = mundane.map((item: any) => {
    const id = slugify(item.name);
    const desc = renderEntries(item.entries || item.additionalEntries || []);
    const key = `${item.name.toLowerCase()}|${item.source.toLowerCase()}`;
    const fluff = fluffMap.get(key);
    const foundry = foundryMap.get(key);

    return {
      id,
      name: item.name,
      source: item.source,
      page: item.page || null,
      type: item.type || null,
      costGp: copperToGp(item.value),
      weight: item.weight || null,
      description: desc,
      rawJson: JSON.stringify(item),
      fluffJson: fluff ? JSON.stringify(fluff) : null,
      foundryJson: foundry ? JSON.stringify(foundry) : null,
    };
  });

  const BATCH_SIZE = 1000;
  for (let i = 0; i < mundaneRows.length; i += BATCH_SIZE) {
    await db
      .insert(schema.mundaneGear)
      .values(mundaneRows.slice(i, i + BATCH_SIZE))
      .onConflictDoNothing();
  }
  console.log(`Seeded ${mundane.length} mundane gear items.`);

  const masteries = data.itemMastery || [];
  const allowedMasteries = masteries.filter((m: any) => isSourceAllowed(m.source));
  const masteryRows = allowedMasteries.map((mastery: any) => {
    const id = slugify(mastery.name);
    const desc = renderEntries(mastery.entries || []);
    return {
      id,
      name: mastery.name,
      source: mastery.source,
      page: mastery.page || null,
      description: desc,
      rawJson: JSON.stringify(mastery),
    };
  });

  for (let i = 0; i < masteryRows.length; i += BATCH_SIZE) {
    await db
      .insert(schema.weaponMasteries)
      .values(masteryRows.slice(i, i + BATCH_SIZE))
      .onConflictDoNothing();
  }
  console.log(`Seeded ${allowedMasteries.length} weapon masteries.`);
}

async function seedItemGroupsAndVariants(db: any) {
  console.log("Seeding item groups and magic variants...");
  const itemsData = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "new data/items.json"), "utf-8"),
  );
  const groups = itemsData.itemGroup || [];
  const allowedGroups = groups.filter((g: any) => isSourceAllowed(g.source));
  const groupRows = allowedGroups.map((group: any) => {
    const id = slugify(group.name);
    const desc = renderEntries(group.entries || []);
    return {
      id,
      name: group.name,
      source: group.source,
      page: group.page || null,
      itemsJson: JSON.stringify(group.items || []),
      description: desc,
      rawJson: JSON.stringify(group),
    };
  });

  const BATCH_SIZE = 1000;
  for (let i = 0; i < groupRows.length; i += BATCH_SIZE) {
    await db
      .insert(schema.itemGroups)
      .values(groupRows.slice(i, i + BATCH_SIZE))
      .onConflictDoNothing();
  }
  console.log(`Seeded ${allowedGroups.length} item groups.`);

  const variantsData = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "new data/magicvariants.json"), "utf-8"),
  );
  const variants = variantsData.magicvariant || [];
  const allowedVariants = variants.filter((v: any) =>
    isSourceAllowed(v.inherits?.source || v.source || "DMG"),
  );
  const variantRows = allowedVariants.map((variant: any) => {
    const src = variant.inherits?.source || variant.source || "DMG";
    const pg = variant.inherits?.page || variant.page || null;
    const id = slugify(variant.name + "-" + src);
    const desc = renderEntries(variant.entries || variant.inherits?.entries || []);
    return {
      id,
      name: variant.name,
      source: src,
      page: pg,
      requiresJson: JSON.stringify(variant.requires || []),
      inheritsJson: JSON.stringify(variant.inherits || {}),
      description: desc,
      rawJson: JSON.stringify(variant),
    };
  });

  for (let i = 0; i < variantRows.length; i += BATCH_SIZE) {
    await db
      .insert(schema.magicVariants)
      .values(variantRows.slice(i, i + BATCH_SIZE))
      .onConflictDoNothing();
  }
  console.log(`Seeded ${allowedVariants.length} magic variants.`);
}

async function seedLootAndTreasure(db: any) {
  console.log("Seeding loot and treasure tables...");
  const lootData = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "new data/loot.json"), "utf-8"),
  );

  const lootRows: any[] = [];
  let gemCount = 0;
  const gems = lootData.gems || [];
  for (const gemTable of gems) {
    if (!isSourceAllowed(gemTable.source || "DMG")) continue;
    const id = slugify(gemTable.name);
    lootRows.push({
      id,
      name: gemTable.name,
      source: gemTable.source || "DMG",
      page: gemTable.page || null,
      type: "gems",
      value: gemTable.type || null,
      tableJson: JSON.stringify(gemTable.table || []),
      rawJson: JSON.stringify(gemTable),
    });
    gemCount++;
  }

  let artCount = 0;
  const artObjects = lootData.artObjects || [];
  for (const artTable of artObjects) {
    if (!isSourceAllowed(artTable.source || "DMG")) continue;
    const id = slugify(artTable.name);
    lootRows.push({
      id,
      name: artTable.name,
      source: artTable.source || "DMG",
      page: artTable.page || null,
      type: "artObjects",
      value: artTable.type || null,
      tableJson: JSON.stringify(artTable.table || []),
      rawJson: JSON.stringify(artTable),
    });
    artCount++;
  }

  let magicCount = 0;
  const magicItems = lootData.magicItems || [];
  for (const magicTable of magicItems) {
    if (!isSourceAllowed(magicTable.source || "DMG")) continue;
    const id = slugify(magicTable.name);
    lootRows.push({
      id,
      name: magicTable.name,
      source: magicTable.source || "DMG",
      page: magicTable.page || null,
      type: "magicItems",
      value: null,
      tableJson: JSON.stringify(magicTable.table || []),
      rawJson: JSON.stringify(magicTable),
    });
    magicCount++;
  }

  let hasDragonMundane = false;
  const dragonMundane = lootData.dragonMundaneItems || [];
  if (dragonMundane.length > 0) {
    const id = "dragon-mundane-items";
    lootRows.push({
      id,
      name: "Dragon Mundane Items",
      source: "FTD",
      page: 72,
      type: "dragonMundaneItems",
      value: null,
      tableJson: JSON.stringify(dragonMundane),
      rawJson: JSON.stringify({
        name: "Dragon Mundane Items",
        source: "FTD",
        table: dragonMundane,
      }),
    });
    hasDragonMundane = true;
  }

  const BATCH_SIZE = 1000;
  for (let i = 0; i < lootRows.length; i += BATCH_SIZE) {
    await db
      .insert(schema.lootTables)
      .values(lootRows.slice(i, i + BATCH_SIZE))
      .onConflictDoNothing();
  }

  console.log(
    `Seeded loot tables: ${gemCount} gems, ${artCount} art objects, ${magicCount} magic items tables${hasDragonMundane ? ", 1 dragon mundane table" : ""}.`,
  );

  const treasureRows: any[] = [];
  let indCount = 0;
  const individual = lootData.individual || [];
  for (const indTable of individual) {
    if (!isSourceAllowed(indTable.source || "DMG")) continue;
    const id = slugify(`individual-${indTable.name}-${indTable.source || "DMG"}`);
    treasureRows.push({
      id,
      name: indTable.name,
      source: indTable.source || "DMG",
      page: indTable.page || null,
      kind: "individual",
      crMin: indTable.crMin || null,
      crMax: indTable.crMax || null,
      coinsJson: JSON.stringify(indTable.coins || {}),
      tableJson: JSON.stringify(indTable.table || []),
      rawJson: JSON.stringify(indTable),
    });
    indCount++;
  }

  let hoardCount = 0;
  const hoard = lootData.hoard || [];
  for (const hTable of hoard) {
    if (!isSourceAllowed(hTable.source || "DMG")) continue;
    const id = slugify(`hoard-${hTable.name}-${hTable.source || "DMG"}`);
    treasureRows.push({
      id,
      name: hTable.name,
      source: hTable.source || "DMG",
      page: hTable.page || null,
      kind: "hoard",
      crMin: hTable.crMin || null,
      crMax: hTable.crMax || null,
      coinsJson: JSON.stringify(hTable.coins || {}),
      tableJson: JSON.stringify(hTable.table || []),
      rawJson: JSON.stringify(hTable),
    });
    hoardCount++;
  }

  let dragonCount = 0;
  const dragon = lootData.dragon || [];
  for (const dTable of dragon) {
    if (!isSourceAllowed(dTable.source || "FTD")) continue;
    const id = slugify(`dragon-${dTable.name}-${dTable.source || "FTD"}`);
    treasureRows.push({
      id,
      name: dTable.name,
      source: dTable.source || "FTD",
      page: dTable.page || null,
      kind: "dragon",
      crMin: null,
      crMax: null,
      coinsJson: JSON.stringify(dTable.coins || {}),
      tableJson: JSON.stringify(dTable.table || []),
      rawJson: JSON.stringify(dTable),
    });
    dragonCount++;
  }

  for (let i = 0; i < treasureRows.length; i += BATCH_SIZE) {
    await db
      .insert(schema.treasureTables)
      .values(treasureRows.slice(i, i + BATCH_SIZE))
      .onConflictDoNothing();
  }

  console.log(
    `Seeded treasure tables: ${indCount} individual, ${hoardCount} hoard, ${dragonCount} dragon hoard.`,
  );
}

function loadItemsFluffMap(): Map<string, any> {
  const map = new Map<string, any>();
  const filepath = path.join(process.cwd(), "new data/fluff-items.json");
  if (fs.existsSync(filepath)) {
    const data = JSON.parse(fs.readFileSync(filepath, "utf-8"));
    const list = data.itemFluff || [];
    for (const item of list) {
      const key = `${item.name.toLowerCase()}|${item.source.toLowerCase()}`;
      map.set(key, item);
    }
  }
  return map;
}

function loadBaseItemsFoundryMap(): Map<string, any> {
  const map = new Map<string, any>();
  const filepath = path.join(process.cwd(), "new data/foundry-items.json");
  if (fs.existsSync(filepath)) {
    const data = JSON.parse(fs.readFileSync(filepath, "utf-8"));
    const list = data.baseitem || [];
    for (const item of list) {
      const key = `${item.name.toLowerCase()}|${item.source.toLowerCase()}`;
      map.set(key, item);
    }
  }
  return map;
}

function loadMagicItemsFoundryMap(): Map<string, any> {
  const map = new Map<string, any>();
  const filepath = path.join(process.cwd(), "new data/foundry-items.json");
  if (fs.existsSync(filepath)) {
    const data = JSON.parse(fs.readFileSync(filepath, "utf-8"));
    const list = data.item || [];
    for (const item of list) {
      const key = `${item.name.toLowerCase()}|${item.source.toLowerCase()}`;
      map.set(key, item);
    }
  }
  return map;
}
