import { DefenseInfo } from "../dndbeyond.types";
import { titleCase } from "./creatures";

export function computeDefenses(modifiers: any[]): DefenseInfo[] {
  const seen = new Set<string>();
  const out: DefenseInfo[] = [];
  for (const m of modifiers) {
    let type: DefenseInfo["type"] | null = null;
    if (m?.type === "resistance") type = "resistance";
    else if (m?.type === "immunity") type = "immunity";
    else if (m?.type === "vulnerability") type = "vulnerability";
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
