import * as fs from "fs";
import * as path from "path";

import { SOURCES, type SourceTier, BLOCKED_SOURCES } from "../lib/forge/source-constants";
export { SOURCES, type SourceTier, BLOCKED_SOURCES };

export const ENABLED_TIERS: import("../lib/forge/source-constants").SourceTier[] = [
  "core",
  "supplements",
  "settings",
];
export const EXCLUDED_SOURCES: string[] = [];
const EXCLUDED_SOURCE_GROUPS = new Set(["homecraft"]);
const GENERIC_SOURCES = new Set(["GENERIC"]);

let catalogSourcesCache: string[] | null = null;

const SOURCE_PRIORITY: Record<string, number> = {
  XPHB: 1000,
  XMM: 1000,
  XDMG: 1000,
  EFA: 900,
  FRAIF: 850,
  FRHOF: 850,
  RHW: 850,
  BGG: 700,
  BMT: 700,
  FTD: 700,
  MPP: 700,
  SATO: 700,
  MPMM: 650,
  TCE: 600,
  XGE: 600,
  ERLW: 500,
  EGW: 500,
  GGR: 500,
  MOT: 500,
  VRGR: 500,
  SCC: 500,
  SCAG: 400,
  VGM: 300,
  MTF: 300,
  AI: 250,
};

export function normalizeSource(source: string): string {
  return source.trim().toUpperCase();
}

export function getEnabledSources(): string[] {
  const excluded = new Set(EXCLUDED_SOURCES.map(normalizeSource));
  const blocked = new Set(BLOCKED_SOURCES.map(normalizeSource));
  const configured = ENABLED_TIERS.flatMap((tier) => SOURCES[tier]).filter(
    (source) => !excluded.has(normalizeSource(source)) && !blocked.has(normalizeSource(source)),
  );
  const catalog = getCatalogSources().filter(
    (source) => !excluded.has(normalizeSource(source)) && !blocked.has(normalizeSource(source)),
  );
  return [...new Set([...configured, ...catalog])];
}

export function isSourceAllowed(source: string | null | undefined): boolean {
  if (!source) return false;
  if (GENERIC_SOURCES.has(normalizeSource(source))) return true;
  const blocked = new Set(BLOCKED_SOURCES.map(normalizeSource));
  if (blocked.has(normalizeSource(source))) return false;

  const enabled = new Set(getEnabledSources().map(normalizeSource));
  return enabled.has(normalizeSource(source));
}

export function getSourcePriority(source: string | null | undefined, edition?: string): number {
  if (!source) return 0;
  const normalizedSource = normalizeSource(source);
  const editionBonus = edition === "one" ? 100 : 0;
  return (SOURCE_PRIORITY[normalizedSource] || 100) + editionBonus;
}

export function formatSourceConfigSummary(): string {
  return `Source tiers: ${ENABLED_TIERS.join(", ")} (${getEnabledSources().length} sources enabled)`;
}

function getCatalogSources(): string[] {
  if (catalogSourcesCache) return catalogSourcesCache;

  const sources = new Set<string>();
  for (const [fileName, key] of [
    ["books.json", "book"],
    ["adventures.json", "adventure"],
  ] as const) {
    const filePath = path.join(process.cwd(), "new data", fileName);
    if (!fs.existsSync(filePath)) continue;
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    for (const item of data[key] || []) {
      if (item.group && EXCLUDED_SOURCE_GROUPS.has(item.group)) continue;
      const source = item.source || item.id;
      if (source) sources.add(source);
    }
  }

  catalogSourcesCache = [...sources];
  return catalogSourcesCache;
}
