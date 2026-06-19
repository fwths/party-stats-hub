import { SenseInfo } from "../dndbeyond.types";

export function computeSenses(modifiers: any[], customSenses: any[]): SenseInfo[] {
  const map = new Map<string, number | null>();
  for (const m of modifiers) {
    if (m?.type === "set-base" || m?.type === "sense" || m?.type === "set") {
      const name = m?.friendlySubtypeName;
      const val = typeof m?.value === "number" ? m.value : null;
      if (
        name &&
        (m?.subType?.includes("darkvision") ||
          m?.subType?.includes("vision") ||
          m?.subType?.includes("sight") ||
          m?.subType?.includes("sense"))
      ) {
        const prev = map.get(name);
        if (prev == null || (val != null && val > (prev ?? 0))) map.set(name, val);
      }
    }
  }
  for (const c of customSenses ?? []) {
    if (c?.name) map.set(c.name, typeof c.distance === "number" ? c.distance : null);
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}
