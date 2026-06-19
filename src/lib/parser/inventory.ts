import { InventoryItem } from "../dndbeyond.types";
import { RARITY_ORDER } from "./constants";

export function computeCarryingCapacity(strengthScore: number, modifiers: any[]): number {
  const capacity = strengthScore * 15;
  let multiplier = 1;
  let bonus = 0;
  for (const m of modifiers) {
    if (m?.subType === "carrying-capacity") {
      if (m.type === "bonus" && typeof m.value === "number") {
        bonus += m.value;
      }
      if (m.type === "multiplier" && typeof m.value === "number") {
        multiplier *= m.value;
      }
    } else if (m?.subType === "carrying-capacity-multiplier") {
      if (typeof m.value === "number") {
        multiplier *= m.value;
      }
    }
  }
  return (capacity + bonus) * multiplier;
}

export function computeWeightCarried(inventory: any[]): number {
  let total = 0;
  for (const item of inventory ?? []) {
    const weight = item?.definition?.weight ?? 0;
    const qty = item?.quantity ?? 1;
    total += weight * qty;
  }
  return Number(total.toFixed(1));
}

export function computeInventory(data: any): InventoryItem[] {
  const inv: any[] = data?.inventory ?? [];
  const out: InventoryItem[] = [];
  for (const i of inv) {
    const def = i?.definition ?? {};
    const name: string = def.name;
    if (!name) continue;
    const type: string = def.type ?? def.filterType ?? "Item";
    const rarity: string | null = def.rarity ?? null;
    const magic = !!def.magic || (!!rarity && rarity !== "Common" && rarity !== "Mundane");
    out.push({
      name,
      type,
      rarity,
      magic,
      equipped: !!i.equipped,
      attuned: !!i.isAttuned,
      quantity: i.quantity ?? 1,
      weight: typeof def.weight === "number" ? def.weight : undefined,
      description: def.description ?? def.snippet ?? undefined,
      snippet: def.snippet ?? undefined,
      cost: typeof def.cost === "number" ? def.cost : undefined,
      damage: def.damage ? def.damage.diceString : undefined,
      properties: Array.isArray(def.properties)
        ? def.properties.map((p: any) => p.name)
        : undefined,
      armorClass: typeof def.armorClass === "number" ? def.armorClass : undefined,
      armorTypeId: typeof def.armorTypeId === "number" ? def.armorTypeId : undefined,
    });
  }
  // Sort: attuned > equipped magic > equipped > other magic > rest; within: by rarity desc, then name
  out.sort((a, b) => {
    const rank = (x: InventoryItem) =>
      x.attuned ? 0 : x.equipped && x.magic ? 1 : x.equipped ? 2 : x.magic ? 3 : 4;
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    const rIdx = (x: InventoryItem) => (x.rarity ? RARITY_ORDER.indexOf(x.rarity) : -1);
    const ria = rIdx(a);
    const rib = rIdx(b);
    if (ria !== rib) return rib - ria;
    return a.name.localeCompare(b.name);
  });
  return out;
}
