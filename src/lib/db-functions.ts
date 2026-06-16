import { createServerFn } from "@tanstack/react-start";

// Cached snapshot for edge runtime fallback
let snapshotCache: Record<string, any[]> | null = null;

async function getSnapshot(): Promise<Record<string, any[]>> {
  if (snapshotCache) return snapshotCache;
  try {
    const data = await import("../data/db-snapshot.json");
    snapshotCache = data.default || data;
    return snapshotCache!;
  } catch {
    return {};
  }
}

async function queryTable(tableName: string, schemaKey: string) {
  try {
    const { db } = await import("./drizzle.server");
    const schema = await import("../db/schema");
    const table = (schema as any)[schemaKey];
    if (table) return await db.select().from(table);
  } catch {
    // better-sqlite3 not available (edge runtime) — use JSON snapshot
  }
  const snapshot = await getSnapshot();
  return snapshot[tableName] || [];
}

export const getClassesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("classes", "classes");
});

export const getSpellsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("spells", "spells");
});

export const getFeatsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("feats", "feats");
});

export const getSpeciesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("species", "species");
});

export const getSubclassesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("subclasses", "subclasses");
});

export const getMonstersFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("monsters", "monsters");
});

export const getMagicItemsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("magic_items", "magicItems");
});

export const getWeaponsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("weapons", "weapons");
});

export const getArmorFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("armor", "armor");
});
