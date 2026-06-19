import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import * as schema from "../../db/schema";
import { slugify } from "../5etools-utils";

type SourceMeta = {
  id: string;
  source: string;
  name: string;
  group?: string;
  published?: string;
  kind: "book" | "adventure";
  raw: unknown;
};

type FilterResult = {
  value: unknown;
  hasOfficialContent: boolean;
};

const HOMEBREW_SOURCE_CODES = new Set(["HB", "HOMEBREW"]);
const HOMEBREW_GROUPS = new Set(["homecraft"]);
const METADATA_KEYS = new Set(["_meta", "_copy", "_mod", "_versions", "_preserve"]);
const ENTRY_BATCH_SIZE = 100;

function normalizeSource(source: unknown): string {
  return String(source || "")
    .trim()
    .toUpperCase();
}

function readJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function sourceKey(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function isRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function buildSourceCatalog(): Map<string, SourceMeta> {
  const catalog = new Map<string, SourceMeta>();
  const add = (item: any, kind: "book" | "adventure") => {
    const source = item.source || item.id;
    if (!source) return;
    const meta: SourceMeta = {
      id: item.id || source,
      source,
      name: item.name || source,
      group: item.group,
      published: item.published,
      kind,
      raw: item,
    };
    catalog.set(sourceKey(source), meta);
    catalog.set(sourceKey(item.id), meta);
  };

  const booksPath = path.join(process.cwd(), "new data/books.json");
  const adventuresPath = path.join(process.cwd(), "new data/adventures.json");
  for (const item of readJson(booksPath).book || []) add(item, "book");
  for (const item of readJson(adventuresPath).adventure || []) add(item, "adventure");
  return catalog;
}

function isOfficialSource(meta: SourceMeta | undefined, source: unknown): boolean {
  const normalized = normalizeSource(source);
  if (!normalized) return false;
  if (HOMEBREW_SOURCE_CODES.has(normalized)) return false;
  if (normalized.startsWith("UA")) return false;
  if (meta?.group && HOMEBREW_GROUPS.has(meta.group)) return false;
  return !!meta;
}

function walkJsonFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkJsonFiles(filePath);
    return entry.name.endsWith(".json") ? [filePath] : [];
  });
}

function inferSourceFromFile(filePath: string, catalog: Map<string, SourceMeta>) {
  const parsed = path.parse(filePath);
  const stem = parsed.name
    .replace(/^book-/i, "")
    .replace(/^adventure-/i, "")
    .replace(/^bestiary-/i, "")
    .replace(/^spells-/i, "")
    .replace(/^class-/i, "")
    .replace(/^foundry-/i, "")
    .replace(/^fluff-/i, "");
  return catalog.get(sourceKey(stem));
}

function metaFromEntry(
  entry: Record<string, any>,
  fallbackMeta: SourceMeta | undefined,
  catalog: Map<string, SourceMeta>,
) {
  if (entry.source) return catalog.get(sourceKey(entry.source));
  return fallbackMeta;
}

function entryName(entry: Record<string, any>, entityType: string, indexPath: string) {
  return entry.name || entry.caption || entry.id || `${entityType} ${indexPath}`;
}

function entrySearchText(
  entry: Record<string, any>,
  entityType: string,
  name: string,
  source: string,
) {
  return [entityType, name, source, JSON.stringify(entry)]
    .filter(Boolean)
    .join("\n")
    .slice(0, 20000);
}

function entryId(
  entityType: string,
  source: string,
  name: string,
  filePath: string,
  indexPath: string,
) {
  const hash = crypto
    .createHash("sha1")
    .update(`${filePath}:${entityType}:${source}:${name}:${indexPath}`)
    .digest("hex")
    .slice(0, 10);
  return slugify(`${entityType}-${source}-${name}-${hash}`);
}

function fileId(relativePath: string, source: string | null) {
  return slugify(`file-${source || "mixed"}-${relativePath}`);
}

function shouldIndexEntry(entry: Record<string, any>, entityType: string, parentIsArray: boolean) {
  if (entityType.startsWith("_")) return false;
  if (entry.source) return true;
  if (parentIsArray && (entry.name || entry.caption || entry.id)) return true;
  return !!(
    entry.name &&
    (entry.entries || entry.entry || entry.items || entry.rows || entry.type)
  );
}

function filterOfficialJson(
  value: unknown,
  fileMeta: SourceMeta | undefined,
  inheritedMeta: SourceMeta | undefined,
  catalog: Map<string, SourceMeta>,
): FilterResult {
  if (Array.isArray(value)) {
    const items: unknown[] = [];
    let hasOfficialContent = false;
    for (const item of value) {
      const result = filterOfficialJson(item, fileMeta, inheritedMeta, catalog);
      if (result.hasOfficialContent) {
        items.push(result.value);
        hasOfficialContent = true;
      }
    }
    return { value: items, hasOfficialContent };
  }

  if (!isRecord(value)) {
    return {
      value,
      hasOfficialContent: !!inheritedMeta && isOfficialSource(inheritedMeta, inheritedMeta.source),
    };
  }

  const hasExplicitSource = value.source !== undefined && value.source !== null;
  const explicitMeta = hasExplicitSource ? catalog.get(sourceKey(value.source)) : undefined;
  const currentMeta = hasExplicitSource ? explicitMeta : inheritedMeta || fileMeta;
  const currentIsOfficial =
    !!currentMeta &&
    isOfficialSource(currentMeta, hasExplicitSource ? value.source : currentMeta.source);

  if (value.source && !currentIsOfficial) {
    return { value: undefined, hasOfficialContent: false };
  }

  const filtered: Record<string, unknown> = {};
  let hasOfficialChild = false;

  for (const [key, child] of Object.entries(value)) {
    if (METADATA_KEYS.has(key)) continue;
    const childResult = filterOfficialJson(child, fileMeta, currentMeta, catalog);
    if (childResult.hasOfficialContent) {
      filtered[key] = childResult.value;
      hasOfficialChild = true;
    } else if (currentIsOfficial && !isRecord(child) && !Array.isArray(child)) {
      filtered[key] = child;
    }
  }

  const hasOfficialContent = currentIsOfficial || hasOfficialChild;
  if (!hasOfficialContent) return { value: undefined, hasOfficialContent: false };

  for (const key of METADATA_KEYS) {
    if (key in value) filtered[key] = value[key];
  }

  return { value: filtered, hasOfficialContent };
}

function collectEntries(
  value: unknown,
  entityType: string,
  relativePath: string,
  indexPath: string,
  fileMeta: SourceMeta | undefined,
  inheritedMeta: SourceMeta | undefined,
  catalog: Map<string, SourceMeta>,
  rows: any[],
  parentIsArray = false,
) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collectEntries(
        item,
        entityType,
        relativePath,
        `${indexPath}.${index}`,
        fileMeta,
        inheritedMeta,
        catalog,
        rows,
        true,
      );
    });
    return;
  }

  if (!isRecord(value)) return;

  const currentMeta = metaFromEntry(value, inheritedMeta || fileMeta, catalog);
  const source = value.source || currentMeta?.source;
  const official = isOfficialSource(currentMeta, source);

  if (official && shouldIndexEntry(value, entityType, parentIsArray)) {
    const name = entryName(value, entityType, indexPath);
    rows.push({
      id: entryId(entityType, source, name, relativePath, indexPath),
      entityType,
      name,
      source,
      sourceGroup: currentMeta?.group || null,
      sourceFile: relativePath,
      page: typeof value.page === "number" ? value.page : null,
      official: true,
      rawJson: JSON.stringify(value),
      fluffJson: null,
      foundryJson: null,
      searchText: entrySearchText(value, entityType, name, source),
    });
  }

  for (const [key, child] of Object.entries(value)) {
    if (key.startsWith("_")) continue;
    collectEntries(
      child,
      key,
      relativePath,
      `${indexPath}.${key}`,
      fileMeta,
      official ? currentMeta : inheritedMeta,
      catalog,
      rows,
    );
  }
}

export async function seedCompendiumRaw(db: any) {
  console.log("Seeding lossless 5etools compendium entries...");

  const catalog = buildSourceCatalog();
  const sourceRows: any[] = [];
  for (const meta of new Map([...catalog.values()].map((item) => [item.source, item])).values()) {
    if (!isOfficialSource(meta, meta.source)) continue;
    sourceRows.push({
      id: slugify(`${meta.kind}-${meta.source}`),
      code: meta.source,
      name: meta.name,
      group: meta.group || null,
      kind: meta.kind,
      published: meta.published || null,
      rawJson: JSON.stringify(meta.raw),
    });
  }
  if (sourceRows.length)
    await db.insert(schema.contentSources).values(sourceRows).onConflictDoNothing();

  const fileRows: any[] = [];
  const entryRows: any[] = [];
  for (const filePath of walkJsonFiles(path.join(process.cwd(), "new data"))) {
    const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
    let json: any;
    try {
      json = readJson(filePath);
    } catch {
      continue;
    }

    const fileMeta = inferSourceFromFile(filePath, catalog);
    const filtered = filterOfficialJson(json, fileMeta, undefined, catalog);
    if (!filtered.hasOfficialContent) continue;

    const source = fileMeta && isOfficialSource(fileMeta, fileMeta.source) ? fileMeta.source : null;
    fileRows.push({
      id: fileId(relativePath, source),
      sourceFile: relativePath,
      source,
      sourceGroup: fileMeta?.group || null,
      official: true,
      rawJson: JSON.stringify(filtered.value),
    });

    for (const [entityType, value] of Object.entries(json)) {
      collectEntries(
        value,
        entityType,
        relativePath,
        entityType,
        fileMeta,
        undefined,
        catalog,
        entryRows,
      );
    }
  }

  if (fileRows.length) {
    await db.insert(schema.compendiumFiles).values(fileRows).onConflictDoNothing();
  }

  for (let i = 0; i < entryRows.length; i += ENTRY_BATCH_SIZE) {
    await db
      .insert(schema.compendiumEntries)
      .values(entryRows.slice(i, i + ENTRY_BATCH_SIZE))
      .onConflictDoNothing();
  }

  console.log(`Seeded ${sourceRows.length} content sources.`);
  console.log(`Seeded ${fileRows.length} filtered raw compendium files.`);
  console.log(`Seeded ${entryRows.length} searchable raw compendium entries.`);
}
