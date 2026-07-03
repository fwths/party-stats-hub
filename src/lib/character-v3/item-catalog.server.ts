import { sqlite } from "../drizzle.server";
import type { CatalogItemRecord } from "./item-catalog";

export type CatalogItemKind = CatalogItemRecord["kind"];

export function searchItemCatalog(query: string, limit = 30) {
  const pattern = `%${query.trim()}%`;
  const perTable = Math.max(1, Math.min(50, limit));
  const weapons = sqlite.prepare(
    "SELECT id, name, source, category AS type, NULL AS rarity FROM weapons WHERE name LIKE ? ORDER BY name LIMIT ?",
  ).all(pattern, perTable) as Array<Record<string, unknown>>;
  const armor = sqlite.prepare(
    "SELECT id, name, source, category AS type, NULL AS rarity FROM armor WHERE name LIKE ? ORDER BY name LIMIT ?",
  ).all(pattern, perTable) as Array<Record<string, unknown>>;
  const magic = sqlite.prepare(
    "SELECT id, name, source, type, rarity FROM magic_items WHERE name LIKE ? ORDER BY name LIMIT ?",
  ).all(pattern, perTable) as Array<Record<string, unknown>>;
  return [
    ...weapons.map((row) => ({ ...row, kind: "weapon" as const })),
    ...armor.map((row) => ({ ...row, kind: "armor" as const })),
    ...magic.map((row) => ({ ...row, kind: "magic-item" as const })),
  ]
    .filter((row) => typeof row.source === "string" && row.source.length > 0)
    .sort((left, right) => String(left.name).localeCompare(String(right.name)))
    .slice(0, perTable);
}

export function loadItemCatalogRecord(kind: CatalogItemKind, id: string): CatalogItemRecord | null {
  if (kind === "weapon") {
    const row = sqlite.prepare("SELECT * FROM weapons WHERE id = ?").get(id) as any;
    if (!row?.source) return null;
    return {
      kind, id: row.id, name: row.name, source: row.source, category: row.category, type: row.type,
      costGp: row.cost_gp, damageDice: row.damage_dice, damageType: row.damage_type,
      properties: JSON.parse(row.properties_json || "[]"), weight: row.weight,
    };
  }
  if (kind === "armor") {
    const row = sqlite.prepare("SELECT * FROM armor WHERE id = ?").get(id) as any;
    if (!row?.source) return null;
    return {
      kind, id: row.id, name: row.name, source: row.source, category: row.category,
      costGp: row.cost_gp, armorClass: row.ac_base, weight: row.weight,
    };
  }
  const row = sqlite.prepare("SELECT * FROM magic_items WHERE id = ?").get(id) as any;
  if (!row?.source) return null;
  return {
    kind, id: row.id, name: row.name, source: row.source, type: row.type,
    rarity: row.rarity, description: row.description, weight: row.weight,
    requiresAttunement: Boolean(row.requires_attunement),
    attunementConditions: row.attunement_conditions ?? null,
  };
}
