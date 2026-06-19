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

export const getBackgroundsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("backgrounds", "backgrounds");
});

export const getSpeciesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("species", "species");
});

export const getSubclassesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("subclasses", "subclasses");
});

export const getClassSpellsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("class_spells", "classSpells");
});

export const getClassFeaturesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("class_features", "classFeatures");
});

export const getContentSourcesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("content_sources", "contentSources");
});

export const getCompendiumEntriesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("compendium_entries", "compendiumEntries");
});

export const searchCompendiumEntriesFromDb = createServerFn({ method: "GET" }).handler(
  async ({
    data,
  }: {
    data?: { query?: string; entityType?: string; source?: string; limit?: number };
  }) => {
    const query = data?.query?.trim().toLowerCase() || "";
    const entityType = data?.entityType?.trim();
    const source = data?.source?.trim();
    const limit = Math.min(Math.max(data?.limit || 200, 1), 500);

    try {
      const { db } = await import("./drizzle.server");
      const schema = await import("../db/schema");
      const { and, eq, like, or, sql } = await import("drizzle-orm");
      const filters = [];
      if (query) {
        const pattern = `%${query}%`;
        filters.push(
          or(
            like(sql`lower(${schema.compendiumEntries.name})`, pattern),
            like(sql`lower(${schema.compendiumEntries.searchText})`, pattern),
          ),
        );
      }
      if (entityType) filters.push(eq(schema.compendiumEntries.entityType, entityType));
      if (source) filters.push(eq(schema.compendiumEntries.source, source));

      return await db
        .select()
        .from(schema.compendiumEntries)
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(schema.compendiumEntries.name)
        .limit(limit);
    } catch {
      const snapshot = await getSnapshot();
      return (snapshot.compendium_entries || [])
        .filter((entry: any) => {
          if (entityType && entry.entityType !== entityType) return false;
          if (source && entry.source !== source) return false;
          if (!query) return true;
          return `${entry.name || ""}\n${entry.searchText || ""}`.toLowerCase().includes(query);
        })
        .slice(0, limit);
    }
  },
);

export const getCompendiumSearchMetaFromDb = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { db } = await import("./drizzle.server");
    const schema = await import("../db/schema");
    const { asc, count } = await import("drizzle-orm");

    const entityTypes = await db
      .select({
        entityType: schema.compendiumEntries.entityType,
        count: count(),
      })
      .from(schema.compendiumEntries)
      .groupBy(schema.compendiumEntries.entityType)
      .orderBy(asc(schema.compendiumEntries.entityType));

    const sources = await db
      .select({
        source: schema.compendiumEntries.source,
        count: count(),
      })
      .from(schema.compendiumEntries)
      .groupBy(schema.compendiumEntries.source)
      .orderBy(asc(schema.compendiumEntries.source));

    return { entityTypes, sources };
  } catch {
    return { entityTypes: [], sources: [] };
  }
});

export const getCompendiumFilesFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("compendium_files", "compendiumFiles");
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
