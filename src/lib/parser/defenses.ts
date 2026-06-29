import { DefenseInfo } from "../dndbeyond.types";
import { titleCase } from "./creatures";

export function computeDefenses(modifiers: any[]): DefenseInfo[] {
  const damageTypes = new Set([
    "acid",
    "bludgeoning",
    "cold",
    "fire",
    "force",
    "lightning",
    "necrotic",
    "piercing",
    "poison",
    "psychic",
    "radiant",
    "slashing",
    "thunder",
  ]);
  const seen = new Set<string>();
  const out: DefenseInfo[] = [];
  for (const m of modifiers) {
    let type: DefenseInfo["type"] | null = null;
    if (m?.type === "resistance") type = "resistance";
    else if (m?.type === "immunity") {
      const subtype = String(m?.friendlySubtypeName || m?.subType || "")
        .trim()
        .toLowerCase()
        .replace(/-/g, " ");
      type = damageTypes.has(subtype) ? "immunity" : "condition_immunity";
    } else if (m?.type === "vulnerability") type = "vulnerability";
    if (!type) continue;
    const raw = m?.friendlySubtypeName || m?.subType || "";
    if (!raw) continue;
    const damageType = titleCase(String(raw));
    const key = `${type}:${damageType.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ type, damageType });
  }
  return out;
}
