import { useState, useEffect, useMemo } from "react";
import {
  Dumbbell,
  Coins,
  Sparkles,
  Search,
  RefreshCw,
  Plus,
  Sword,
  Shield,
  Shirt,
  FlaskConical,
  Scroll,
  Gem,
  Wand,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useModalHistorySync } from "@/hooks/useModalHistorySync";
import { PartyMember } from "@/lib/dndbeyond.functions";
import { Panel } from "../CharacterDetailView";

export interface ItemPreset {
  name: string;
  type: string;
  rarity: string;
  weight: number;
  cost: number;
  damage?: string;
  armorClass?: number;
  description?: string;
}

const DND_ITEM_PRESETS: ItemPreset[] = [
  // Weapons
  {
    name: "Dagger",
    type: "Weapon",
    rarity: "Mundane",
    weight: 1,
    cost: 2,
    damage: "1d4 piercing",
    description: "Finesse, light, thrown (range 20/60)",
  },
  {
    name: "Shortsword",
    type: "Weapon",
    rarity: "Mundane",
    weight: 2,
    cost: 10,
    damage: "1d6 piercing",
    description: "Finesse, light",
  },
  {
    name: "Rapier",
    type: "Weapon",
    rarity: "Mundane",
    weight: 2,
    cost: 25,
    damage: "1d8 piercing",
    description: "Finesse",
  },
  {
    name: "Longsword",
    type: "Weapon",
    rarity: "Mundane",
    weight: 3,
    cost: 15,
    damage: "1d8 slashing",
    description: "Versatile (1d10)",
  },
  {
    name: "Greatsword",
    type: "Weapon",
    rarity: "Mundane",
    weight: 6,
    cost: 50,
    damage: "2d6 slashing",
    description: "Heavy, two-handed",
  },
  {
    name: "Shortbow",
    type: "Weapon",
    rarity: "Mundane",
    weight: 2,
    cost: 25,
    damage: "1d6 piercing",
    description: "Ammunition (range 80/320), two-handed",
  },
  {
    name: "Longbow",
    type: "Weapon",
    rarity: "Mundane",
    weight: 2,
    cost: 50,
    damage: "1d8 piercing",
    description: "Ammunition (range 150/600), heavy, two-handed",
  },

  // Armor & Shield
  {
    name: "Shield",
    type: "Shield",
    rarity: "Mundane",
    weight: 6,
    cost: 10,
    armorClass: 2,
    description: "A shield made from wood or metal. Calculates +2 AC bonus.",
  },
  {
    name: "Leather Armor",
    type: "Light Armor",
    rarity: "Mundane",
    weight: 10,
    cost: 10,
    armorClass: 11,
    description: "Base AC 11 + Dex modifier.",
  },
  {
    name: "Studded Leather Armor",
    type: "Light Armor",
    rarity: "Mundane",
    weight: 13,
    cost: 45,
    armorClass: 12,
    description: "Base AC 12 + Dex modifier.",
  },
  {
    name: "Hide Armor",
    type: "Medium Armor",
    rarity: "Mundane",
    weight: 12,
    cost: 10,
    armorClass: 12,
    description: "Base AC 12 + Dex modifier (max 2).",
  },
  {
    name: "Scale Mail",
    type: "Medium Armor",
    rarity: "Mundane",
    weight: 45,
    cost: 50,
    armorClass: 14,
    description: "Base AC 14 + Dex modifier (max 2). Disadvantage on Stealth.",
  },
  {
    name: "Breastplate",
    type: "Medium Armor",
    rarity: "Mundane",
    weight: 20,
    cost: 400,
    armorClass: 14,
    description: "Base AC 14 + Dex modifier (max 2).",
  },
  {
    name: "Half Plate Armor",
    type: "Medium Armor",
    rarity: "Mundane",
    weight: 40,
    cost: 750,
    armorClass: 15,
    description: "Base AC 15 + Dex modifier (max 2). Disadvantage on Stealth.",
  },
  {
    name: "Chain Mail",
    type: "Heavy Armor",
    rarity: "Mundane",
    weight: 55,
    cost: 75,
    armorClass: 16,
    description: "Base AC 16. Requires STR 13. Disadvantage on Stealth.",
  },
  {
    name: "Plate Armor",
    type: "Heavy Armor",
    rarity: "Mundane",
    weight: 65,
    cost: 1500,
    armorClass: 18,
    description: "Base AC 18. Requires STR 15. Disadvantage on Stealth.",
  },

  // Potions & Scrolls
  {
    name: "Potion of Healing",
    type: "Potion",
    rarity: "Common",
    weight: 0.5,
    cost: 50,
    description: "Regain 2d4 + 2 hit points.",
  },
  {
    name: "Potion of Greater Healing",
    type: "Potion",
    rarity: "Uncommon",
    weight: 0.5,
    cost: 150,
    description: "Regain 4d4 + 4 hit points.",
  },
  {
    name: "Potion of Superior Healing",
    type: "Potion",
    rarity: "Rare",
    weight: 0.5,
    cost: 450,
    description: "Regain 8d4 + 8 hit points.",
  },
  {
    name: "Scroll of Protection",
    type: "Scroll",
    rarity: "Rare",
    weight: 0.1,
    cost: 100,
    description: "A spell scroll containing protection magic.",
  },

  // Magic Items
  {
    name: "Ring of Protection",
    type: "Ring",
    rarity: "Rare",
    weight: 0,
    cost: 200,
    armorClass: 1,
    description: "You gain a +1 bonus to AC and saving throws while wearing this ring.",
  },
  {
    name: "Cloak of Protection",
    type: "Wondrous Item",
    rarity: "Uncommon",
    weight: 3,
    cost: 150,
    armorClass: 1,
    description: "You gain a +1 bonus to AC and saving throws while wearing this cloak.",
  },
  {
    name: "Bag of Holding",
    type: "Wondrous Item",
    rarity: "Uncommon",
    weight: 15,
    cost: 250,
    description: "This bag has an interior space considerably larger than its outside dimensions.",
  },
];

interface InventoryPanelProps {
  member: PartyMember;
  allMembers: PartyMember[];
  localInventory: any[];
  toggleLocalItemEquipped: (itemName: string) => void;
  toggleLocalItemAttuned: (itemName: string) => void;
  deleteLocalCustomItem: (itemName: string) => void;
  addLocalCustomItem: (newItem: any) => void;
  displayCarryingCapacity: number;
  infusionsPanel?: React.ReactNode;
}

export default function InventoryPanel({
  member,
  allMembers,
  localInventory,
  toggleLocalItemEquipped,
  toggleLocalItemAttuned,
  deleteLocalCustomItem,
  addLocalCustomItem,
  displayCarryingCapacity,
  infusionsPanel,
}: InventoryPanelProps) {
  // Local state for search/filters
  const [invSearchTerm, setInvSearchTerm] = useState("");
  const [invCategory, setInvCategory] = useState("all");
  const [selectedInvItem, setSelectedInvItem] = useState<any | null>(null);

  // Add Item Modal states
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  useModalHistorySync(showAddItemModal, setShowAddItemModal, "isInventoryAddItemModalOpen");
  const [newItemName, setNewItemName] = useState("");
  const [newItemType, setNewItemType] = useState("Gear");
  const [newItemRarity, setNewItemRarity] = useState("Mundane");
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemWeight, setNewItemWeight] = useState(0);
  const [newItemCost, setNewItemCost] = useState(0);
  const [newItemDamage, setNewItemDamage] = useState("");
  const [newItemAc, setNewItemAc] = useState<number | "">("");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [presetSearchTerm, setPresetSearchTerm] = useState("");

  // D&D Beyond SRD API cache states
  const [dndApiItems, setDndApiItems] = useState<any[]>([]);
  const [isLoadingApiItems, setIsLoadingApiItems] = useState(false);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);

  useEffect(() => {
    if (dndApiItems.length > 0) return;

    async function fetchAllItems() {
      setIsLoadingApiItems(true);
      try {
        const [eqRes, miRes] = await Promise.all([
          fetch("https://www.dnd5eapi.co/api/2014/equipment").then((r) => r.json()),
          fetch("https://www.dnd5eapi.co/api/2014/magic-items").then((r) => r.json()),
        ]);

        const eqList = (eqRes.results || []).map((i: { name: string; index: string }) => ({
          name: i.name,
          index: i.index,
          category: "equipment" as const,
        }));

        const miList = (miRes.results || []).map((i: { name: string; index: string }) => ({
          name: i.name,
          index: i.index,
          category: "magic-items" as const,
        }));

        setDndApiItems([...eqList, ...miList].sort((a, b) => a.name.localeCompare(b.name)));
      } catch (e) {
        console.error("Failed to load D&D SRD items list:", e);
      } finally {
        setIsLoadingApiItems(false);
      }
    }

    fetchAllItems();
  }, [dndApiItems.length]);

  const allAvailableItems = useMemo(() => {
    const candidates = new Map<
      string,
      {
        name: string;
        type: string;
        rarity: string | null;
        weight: number;
        cost: number;
        damage?: string;
        armorClass?: number;
        description?: string;
        source: string;
        apiIndex?: string;
        apiCategory?: "equipment" | "magic-items";
      }
    >();

    // 1. Add presets
    for (const p of DND_ITEM_PRESETS) {
      candidates.set(p.name.toLowerCase(), {
        name: p.name,
        type: p.type,
        rarity: p.rarity,
        weight: p.weight,
        cost: p.cost,
        damage: p.damage,
        armorClass: p.armorClass,
        description: p.description,
        source: "Preset",
      });
    }

    // 2. Add party items
    for (const m of allMembers) {
      if (!m.inventory) continue;
      for (const item of m.inventory) {
        if (!item.name) continue;
        const key = item.name.toLowerCase();
        if (!candidates.has(key)) {
          candidates.set(key, {
            name: item.name,
            type: item.type,
            rarity: item.rarity,
            weight: item.weight ?? 0,
            cost: item.cost ?? 0,
            damage: item.damage,
            armorClass: item.armorClass,
            description: item.description ?? item.snippet,
            source: `${m.name}'s Bag`,
          });
        }
      }
    }

    // 3. Add D&D API items
    for (const item of dndApiItems) {
      const key = item.name.toLowerCase();
      if (!candidates.has(key)) {
        candidates.set(key, {
          name: item.name,
          type: item.category === "magic-items" ? "Magic Item" : "Equipment",
          rarity: null,
          weight: 0,
          cost: 0,
          source: "D&D Database",
          apiIndex: item.index,
          apiCategory: item.category,
        });
      }
    }

    return Array.from(candidates.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allMembers, dndApiItems]);

  const filteredPresets = useMemo(() => {
    if (!presetSearchTerm.trim()) return [];
    const term = presetSearchTerm.toLowerCase();
    return allAvailableItems
      .filter(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          item.type.toLowerCase().includes(term) ||
          (item.description && item.description.toLowerCase().includes(term)),
      )
      .slice(0, 15);
  }, [presetSearchTerm, allAvailableItems]);

  const quickAddSuggestions = useMemo(() => {
    if (!invSearchTerm.trim() || invSearchTerm.length < 2) return [];
    const term = invSearchTerm.toLowerCase();
    return allAvailableItems
      .filter(
        (item) =>
          (item.source === "Preset" || item.source === "D&D Database") &&
          (item.name.toLowerCase().includes(term) || item.type.toLowerCase().includes(term)),
      )
      .slice(0, 5);
  }, [invSearchTerm, allAvailableItems]);

  const getRarityTheme = (rarity?: string | null) => {
    const norm = rarity?.toLowerCase().replace(/\s+/g, "") || "";
    switch (norm) {
      case "artifact":
        return {
          border: "border-rose-500/50 hover:border-rose-400",
          bg: "bg-rose-500/5",
          text: "text-rose-300",
          glow: "shadow-[0_0_15px_rgba(244,63,94,0.15)]",
          badge: "bg-rose-500/15 text-rose-400 border-rose-500/30",
          gradient: "from-rose-500/10 via-rose-500/5 to-transparent",
        };
      case "legendary":
        return {
          border: "border-gold/50 hover:border-gold",
          bg: "bg-gold/5",
          text: "text-gold",
          glow: "shadow-[0_0_15px_color-mix(in_oklab,var(--gold)_15%,transparent)]",
          badge: "bg-gold/15 text-gold border-gold/30",
          gradient: "from-gold/10 via-gold/5 to-transparent",
        };
      case "veryrare":
        return {
          border: "border-fuchsia-500/50 hover:border-fuchsia-400",
          bg: "bg-fuchsia-500/5",
          text: "text-fuchsia-300",
          glow: "shadow-[0_0_12px_rgba(217,70,239,0.12)]",
          badge: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30",
          gradient: "from-fuchsia-500/10 via-fuchsia-500/5 to-transparent",
        };
      case "rare":
        return {
          border: "border-violet-500/40 hover:border-violet-400",
          bg: "bg-violet-500/5",
          text: "text-violet-300",
          glow: "shadow-[0_0_10px_rgba(139,92,246,0.1)]",
          badge: "bg-violet-500/15 text-violet-400 border-violet-500/30",
          gradient: "from-violet-500/10 via-violet-500/5 to-transparent",
        };
      case "uncommon":
        return {
          border: "border-sky-500/30 hover:border-sky-400",
          bg: "bg-sky-500/5",
          text: "text-sky-300",
          glow: "",
          badge: "bg-sky-500/10 text-sky-400 border-sky-500/20",
          gradient: "from-sky-500/5 via-sky-500/0 to-transparent",
        };
      case "common":
        return {
          border: "border-emerald-500/20 hover:border-emerald-400",
          bg: "bg-emerald-500/5",
          text: "text-emerald-400",
          glow: "",
          badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          gradient: "from-emerald-500/5 via-emerald-500/0 to-transparent",
        };
      default:
        return {
          border: "border-border/40 hover:border-border",
          bg: "bg-secondary/10",
          text: "text-foreground",
          glow: "",
          badge: "bg-secondary/40 text-muted-foreground border-border/20",
          gradient: "from-secondary/5 via-transparent to-transparent",
        };
    }
  };

  const groupedInventory = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groupedMap = new Map<string, any>();
    localInventory.forEach((item) => {
      const key = item.name.toLowerCase().trim();
      const existing = groupedMap.get(key);
      if (existing) {
        existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
        if (item.equipped) existing.equipped = true;
        if (item.attuned) existing.attuned = true;
      } else {
        groupedMap.set(key, { ...item, quantity: item.quantity || 1 });
      }
    });
    return Array.from(groupedMap.values());
  }, [localInventory]);

  const filteredInventory = groupedInventory.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(invSearchTerm.toLowerCase()) ||
      (item.type && item.type.toLowerCase().includes(invSearchTerm.toLowerCase())) ||
      (item.rarity && item.rarity.toLowerCase().includes(invSearchTerm.toLowerCase())) ||
      (item.description && item.description.toLowerCase().includes(invSearchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    const t = item.type.toLowerCase();
    const isWeapon = t.includes("weapon") || !!item.damage;
    const isArmor =
      t.includes("armor") || t.includes("shield") || typeof item.armorClass === "number";
    const isMagic =
      item.magic || (item.rarity && item.rarity !== "Common" && item.rarity !== "Mundane");
    const isConsumable =
      t.includes("potion") || t.includes("scroll") || t.includes("elixir") || t.includes("wand");

    if (invCategory === "weapons") return isWeapon;
    if (invCategory === "armor") return isArmor;
    if (invCategory === "magic") return isMagic;
    if (invCategory === "consumables") return isConsumable;
    if (invCategory === "other") return !isWeapon && !isArmor && !isConsumable;

    return true;
  });

  const inventorySections = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sections: { title: string; items: any[] }[] = [
      { title: "⚔️ Weapons", items: [] },
      { title: "🛡️ Armor & Shields", items: [] },
      { title: "✨ Magic Items", items: [] },
      { title: "🧪 Consumables", items: [] },
      { title: "🎒 Adventuring Gear & Other", items: [] },
    ];

    filteredInventory.forEach((item) => {
      const t = (item.type || "").toLowerCase();
      const isWeapon = t.includes("weapon") || !!item.damage;
      const isArmor =
        t.includes("armor") || t.includes("shield") || typeof item.armorClass === "number";
      const isMagic =
        item.magic || (item.rarity && item.rarity !== "Common" && item.rarity !== "Mundane");
      const isConsumable =
        t.includes("potion") || t.includes("scroll") || t.includes("elixir") || t.includes("wand");

      if (isWeapon) {
        sections[0].items.push(item);
      } else if (isArmor) {
        sections[1].items.push(item);
      } else if (isConsumable) {
        sections[3].items.push(item);
      } else if (isMagic) {
        sections[2].items.push(item);
      } else {
        sections[4].items.push(item);
      }
    });

    return sections.filter((s) => s.items.length > 0);
  }, [filteredInventory]);

  return (
    <div className="flex flex-col gap-5">
      {/* Carrying Load, Coin Pouch, and Attunement Tracker */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <div className="flex flex-col justify-center gap-1.5 rounded-xl border border-border/40 bg-secondary/10 p-3.5 relative overflow-hidden">
          <div className="absolute -right-3 -top-3 h-10 w-10 rounded-full bg-primary/5 blur-lg pointer-events-none" />
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none">
            <div className="flex items-center gap-1.5">
              <Dumbbell size={12} className="text-primary" />
              <span>Carrying Load</span>
            </div>
            <span className="font-mono text-foreground font-bold">
              {member.weightCarried.toFixed(1)} / {displayCarryingCapacity} lbs
            </span>
          </div>
          {(() => {
            const weightPct =
              displayCarryingCapacity > 0
                ? Math.min(100, (member.weightCarried / displayCarryingCapacity) * 100)
                : 0;
            const weightColor =
              weightPct > 90 ? "bg-hp-critical" : weightPct > 75 ? "bg-hp-wounded" : "bg-primary";
            const weightGlow =
              weightPct > 90
                ? "shadow-[0_0_8px_color-mix(in_oklab,var(--hp-critical)_70%,transparent)] animate-pulse"
                : weightPct > 75
                  ? "shadow-[0_0_8px_color-mix(in_oklab,var(--hp-wounded)_70%,transparent)]"
                  : "shadow-[0_0_6px_color-mix(in_oklab,var(--primary)_70%,transparent)]";
            return (
              <div className="h-2 overflow-hidden rounded-full bg-secondary mt-1.5">
                <div
                  className={`h-full ${weightColor} ${weightGlow} transition-all duration-500`}
                  style={{ width: `${weightPct}%` }}
                />
              </div>
            );
          })()}
        </div>

        <div className="flex flex-col justify-center gap-1.5 rounded-xl border border-border/40 bg-secondary/10 p-3.5 relative overflow-hidden">
          <div className="absolute -right-3 -top-3 h-10 w-10 rounded-full bg-gold/5 blur-lg pointer-events-none" />
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none">
            <Coins size={12} className="text-gold" />
            <span>Coin Pouch</span>
          </div>
          <div className="flex items-center justify-between gap-1.5 mt-1 font-mono text-[11px] font-bold select-all">
            <div
              className="flex flex-col items-center flex-1 bg-secondary/25 border border-border/20 rounded py-0.5"
              title="Platinum"
            >
              <span className="text-sky-300 text-[8px] font-extrabold uppercase tracking-wider mb-0.5 select-none">
                PP
              </span>
              <span className="text-sky-100">{member.currencies?.pp ?? 0}</span>
            </div>
            <div
              className="flex flex-col items-center flex-1 bg-secondary/25 border border-border/20 rounded py-0.5"
              title="Gold"
            >
              <span className="text-gold text-[8px] font-extrabold uppercase tracking-wider mb-0.5 select-none">
                GP
              </span>
              <span className="text-gold">{member.currencies?.gp ?? 0}</span>
            </div>
            <div
              className="flex flex-col items-center flex-1 bg-secondary/25 border border-border/20 rounded py-0.5"
              title="Electrum"
            >
              <span className="text-teal-300 text-[8px] font-extrabold uppercase tracking-wider mb-0.5 select-none">
                EP
              </span>
              <span className="text-teal-100">{member.currencies?.ep ?? 0}</span>
            </div>
            <div
              className="flex flex-col items-center flex-1 bg-secondary/25 border border-border/20 rounded py-0.5"
              title="Silver"
            >
              <span className="text-slate-300 text-[8px] font-extrabold uppercase tracking-wider mb-0.5 select-none">
                SP
              </span>
              <span className="text-slate-100">{member.currencies?.sp ?? 0}</span>
            </div>
            <div
              className="flex flex-col items-center flex-1 bg-secondary/25 border border-border/20 rounded py-0.5"
              title="Copper"
            >
              <span className="text-amber-600 text-[8px] font-extrabold uppercase tracking-wider mb-0.5 select-none">
                CP
              </span>
              <span className="text-amber-500">{member.currencies?.cp ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-gold/30 bg-[color-mix(in_oklab,var(--gold)_8%,var(--secondary))] px-4 py-3.5 shadow-[0_0_10px_color-mix(in_oklab,var(--gold)_15%,transparent)] select-none">
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gold">
              <Sparkles size={12} className="text-gold animate-pulse" />
              <span>Attunement Slots</span>
            </span>
            <span className="text-[10px] text-muted-foreground">Magic item slots filled</span>
          </div>
          <div className="flex items-center gap-2">
            {(() => {
              const attunedCount =
                localInventory.filter((i) => i.equipped && i.attuned).length ?? 0;
              return [1, 2, 3].map((slotIdx) => {
                const isFilled = slotIdx <= attunedCount;
                return (
                  <div
                    key={slotIdx}
                    className={cn(
                      "h-5 w-5 rounded-full border flex items-center justify-center text-[9px] font-bold transition-all duration-300",
                      isFilled
                        ? "border-gold bg-gold/15 text-gold shadow-[0_0_8px_color-mix(in_oklab,var(--gold)_40%,transparent)]"
                        : "border-border bg-secondary/30 text-muted-foreground/45",
                    )}
                  >
                    {isFilled ? "✦" : slotIdx}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* Main gear area */}
      {localInventory.length === 0 ? (
        <Panel>
          <p className="py-8 text-center text-sm text-muted-foreground">No items in inventory.</p>
        </Panel>
      ) : (
        <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 rounded-xl border border-border/40 bg-secondary/10 p-3">
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="text"
                    value={invSearchTerm}
                    onChange={(e) => setInvSearchTerm(e.target.value)}
                    placeholder="Search inventory or type standard items to Quick Add..."
                    className="w-full rounded-lg border border-border bg-secondary/20 py-2 pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none transition-colors"
                  />
                  {isFetchingDetail ? (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <RefreshCw size={12} className="animate-spin text-accent" />
                    </div>
                  ) : (
                    invSearchTerm && (
                      <button
                        onClick={() => setInvSearchTerm("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Clear
                      </button>
                    )
                  )}

                  {quickAddSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1.5 z-[110] max-h-60 overflow-y-auto rounded-lg border border-border bg-popover p-1.5 shadow-2xl animate-in fade-in duration-100">
                      <div className="text-[9px] font-bold text-muted-foreground px-2 py-1 uppercase tracking-wider flex justify-between items-center select-none">
                        <span>✨ Quick Add to Inventory</span>
                        {isFetchingDetail && (
                          <RefreshCw size={10} className="animate-spin text-accent" />
                        )}
                      </div>
                      {quickAddSuggestions.map((item) => (
                        <button
                          key={`${item.name}-${item.source}`}
                          type="button"
                          onClick={async () => {
                            let itemToAdd: any = null;
                            if (item.apiIndex && item.apiCategory) {
                              setIsFetchingDetail(true);
                              try {
                                const res = await fetch(
                                  `https://www.dnd5eapi.co/api/2014/${item.apiCategory}/${item.apiIndex}`,
                                );
                                if (res.ok) {
                                  const detail = await res.json();

                                  let baseType = "Gear";
                                  if (item.apiCategory === "magic-items") {
                                    baseType = "Wondrous Item";
                                    const categoryName = (
                                      detail.equipment_category?.name || ""
                                    ).toLowerCase();
                                    if (categoryName.includes("ring")) baseType = "Ring";
                                    else if (categoryName.includes("scroll")) baseType = "Scroll";
                                    else if (categoryName.includes("potion")) baseType = "Potion";
                                    else if (categoryName.includes("shield")) baseType = "Shield";
                                    else if (categoryName.includes("weapon")) baseType = "Weapon";
                                  } else {
                                    const categoryName = (
                                      detail.equipment_category?.name || ""
                                    ).toLowerCase();
                                    if (categoryName.includes("weapon")) {
                                      baseType = "Weapon";
                                    } else if (categoryName.includes("armor")) {
                                      const armorCat = (detail.armor_category || "").toLowerCase();
                                      if (armorCat.includes("light")) baseType = "Light Armor";
                                      else if (armorCat.includes("medium"))
                                        baseType = "Medium Armor";
                                      else if (armorCat.includes("heavy")) baseType = "Heavy Armor";
                                      else if (armorCat.includes("shield")) baseType = "Shield";
                                    } else if (categoryName.includes("potion")) {
                                      baseType = "Potion";
                                    } else if (categoryName.includes("ring")) {
                                      baseType = "Ring";
                                    } else if (categoryName.includes("scroll")) {
                                      baseType = "Scroll";
                                    }
                                  }

                                  let calculatedCost = 0;
                                  if (detail.cost) {
                                    const qty = detail.cost.quantity || 0;
                                    const unit = (detail.cost.unit || "gp").toLowerCase();
                                    if (unit === "gp") calculatedCost = qty;
                                    else if (unit === "sp") calculatedCost = qty / 10;
                                    else if (unit === "cp") calculatedCost = qty / 100;
                                    else if (unit === "ep") calculatedCost = qty / 2;
                                    else if (unit === "pp") calculatedCost = qty * 10;
                                  }

                                  let armorTypeId: number | undefined;
                                  if (baseType === "Shield") armorTypeId = 4;
                                  else if (baseType === "Light Armor") armorTypeId = 1;
                                  else if (baseType === "Medium Armor") armorTypeId = 2;
                                  else if (baseType === "Heavy Armor") armorTypeId = 3;

                                  itemToAdd = {
                                    name: detail.name || item.name,
                                    type: baseType,
                                    rarity: detail.rarity?.name || "Mundane",
                                    magic:
                                      detail.rarity?.name !== "Mundane" &&
                                      detail.rarity?.name !== "Common",
                                    equipped: false,
                                    attuned: false,
                                    quantity: 1,
                                    weight: detail.weight || 0,
                                    cost: calculatedCost,
                                    damage: detail.damage?.damage_dice || undefined,
                                    armorClass:
                                      detail.armor_class?.base !== undefined
                                        ? detail.armor_class.base
                                        : undefined,
                                    armorTypeId,
                                    description: Array.isArray(detail.desc)
                                      ? detail.desc.join("\n")
                                      : detail.desc || undefined,
                                    isLocalCustom: true,
                                  };
                                }
                              } catch (e) {
                                console.error("Failed to fetch D&D item details:", e);
                              } finally {
                                setIsFetchingDetail(false);
                              }
                            } else {
                              let armorTypeId: number | undefined;
                              if (item.type === "Shield") armorTypeId = 4;
                              else if (item.type === "Light Armor") armorTypeId = 1;
                              else if (item.type === "Medium Armor") armorTypeId = 2;
                              else if (item.type === "Heavy Armor") armorTypeId = 3;

                              itemToAdd = {
                                name: item.name,
                                type: item.type,
                                rarity: item.rarity || "Mundane",
                                magic: item.rarity !== "Mundane" && item.rarity !== "Common",
                                equipped: false,
                                attuned: false,
                                quantity: 1,
                                weight: item.weight,
                                cost: item.cost,
                                damage: item.damage || undefined,
                                armorClass:
                                  item.armorClass !== undefined ? item.armorClass : undefined,
                                armorTypeId,
                                description: item.description || undefined,
                                isLocalCustom: true,
                              };
                            }

                            if (itemToAdd) {
                              addLocalCustomItem(itemToAdd);
                              setInvSearchTerm("");
                            }
                          }}
                          className="w-full text-left px-2 py-1.5 rounded hover:bg-secondary flex items-center justify-between transition-colors cursor-pointer select-none"
                        >
                          <div>
                            <div className="font-bold text-foreground text-xs">{item.name}</div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <span>{item.type}</span>
                              {item.rarity && item.rarity !== "Mundane" && (
                                <>
                                  <span>•</span>
                                  <span className="text-accent">{item.rarity}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <span className="text-[9px] font-bold text-accent px-2 py-0.5 rounded border border-accent/20 bg-accent/5 shrink-0 select-none">
                            + Quick Add
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setNewItemName("");
                    setNewItemType("Gear");
                    setNewItemRarity("Mundane");
                    setNewItemQty(1);
                    setNewItemWeight(0);
                    setNewItemCost(0);
                    setNewItemDamage("");
                    setNewItemAc("");
                    setNewItemDesc("");
                    setShowAddItemModal(true);
                  }}
                  className="rounded-lg bg-accent/15 border border-accent/30 hover:bg-accent/25 text-accent font-bold px-3 py-2 text-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer focus:outline-none select-none"
                >
                  <Plus size={13} />
                  <span>Add Item</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-1 mt-1">
                {[
                  { id: "all", label: "🎒 All" },
                  { id: "weapons", label: "⚔️ Weapons" },
                  { id: "armor", label: "🛡️ Armor" },
                  { id: "magic", label: "✨ Magic" },
                  { id: "consumables", label: "🧪 Potions" },
                  { id: "other", label: "📦 Gear" },
                ].map((cat) => {
                  const isActive = invCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setInvCategory(cat.id)}
                      className={cn(
                        "rounded px-2.5 py-1 text-[10px] font-semibold transition-all duration-200 cursor-pointer select-none",
                        isActive
                          ? "bg-accent text-accent-foreground shadow-sm"
                          : "bg-secondary/35 text-muted-foreground border border-border/30 hover:bg-secondary/60 hover:text-foreground",
                      )}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-border/40 bg-secondary/5 p-3 min-h-[350px] max-h-[550px] overflow-y-auto custom-scrollbar">
              {(() => {
                if (filteredInventory.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-12 text-center select-none">
                      <span className="text-xl">🔍</span>
                      <p className="text-xs font-semibold text-muted-foreground mt-2">
                        No items found matching filters
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="space-y-5">
                    {inventorySections.map((sec) => (
                      <div key={sec.title} className="space-y-2">
                        <h4 className="text-[10px] font-bold text-accent uppercase tracking-wider pl-1.5 select-none flex items-center gap-1.5 border-b border-border/10 pb-1.5">
                          <span>{sec.title}</span>
                          <span className="text-muted-foreground font-mono font-medium">
                            ({sec.items.length})
                          </span>
                        </h4>
                        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                          {sec.items.map((item, idx) => {
                            const theme = getRarityTheme(item.rarity);
                            const isSelected =
                              selectedInvItem?.name === item.name &&
                              selectedInvItem?.equipped === item.equipped;
                            return (
                              <div
                                key={`${item.name}-${idx}`}
                                onClick={() => setSelectedInvItem(item)}
                                className={cn(
                                  "flex items-center gap-3 rounded-lg border p-2.5 transition-all duration-200 cursor-pointer relative overflow-hidden group select-none",
                                  theme.bg,
                                  isSelected
                                    ? "border-gold shadow-[0_0_10px_color-mix(in_oklab,var(--gold)_20%,transparent)] bg-[color-mix(in_oklab,var(--gold)_6%,var(--secondary))]"
                                    : `${theme.border} hover:scale-[1.01] hover:bg-secondary/30`,
                                )}
                              >
                                <div
                                  className={`absolute -right-6 -bottom-6 h-12 w-12 rounded-full bg-gradient-to-br ${theme.gradient} blur-md pointer-events-none group-hover:scale-125 transition-transform duration-500`}
                                />

                                <div
                                  className={cn(
                                    "h-8 w-8 rounded border flex items-center justify-center shrink-0",
                                    isSelected ? "border-gold/40 bg-gold/10" : theme.badge,
                                  )}
                                >
                                  {(() => {
                                    const t = item.type.toLowerCase();
                                    const iconSize = 14;
                                    const iconClass = cn(
                                      item.attuned
                                        ? "text-gold"
                                        : item.magic
                                          ? "text-accent"
                                          : "text-muted-foreground/80",
                                    );

                                    if (t.includes("weapon") || item.damage) {
                                      return <Sword size={iconSize} className={iconClass} />;
                                    }
                                    if (t.includes("shield")) {
                                      return <Shield size={iconSize} className={iconClass} />;
                                    }
                                    if (t.includes("armor")) {
                                      return <Shirt size={iconSize} className={iconClass} />;
                                    }
                                    if (t.includes("potion") || t.includes("elixir")) {
                                      return <FlaskConical size={iconSize} className={iconClass} />;
                                    }
                                    if (t.includes("scroll")) {
                                      return <Scroll size={iconSize} className={iconClass} />;
                                    }
                                    if (
                                      t.includes("ring") ||
                                      t.includes("jewelry") ||
                                      t.includes("amulet") ||
                                      t.includes("cloak")
                                    ) {
                                      return <Gem size={iconSize} className={iconClass} />;
                                    }
                                    if (
                                      t.includes("wand") ||
                                      t.includes("staff") ||
                                      t.includes("rod")
                                    ) {
                                      return <Wand size={iconSize} className={iconClass} />;
                                    }
                                    return <Package size={iconSize} className={iconClass} />;
                                  })()}
                                </div>

                                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                  <span className="text-xs font-bold text-foreground truncate group-hover:text-accent transition-colors">
                                    {item.name}
                                  </span>
                                  <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground tracking-wide font-medium uppercase truncate">
                                    <span>{item.type}</span>
                                    {item.rarity &&
                                      item.rarity !== "Mundane" &&
                                      item.rarity !== "Common" && (
                                        <>
                                          <span>•</span>
                                          <span className={theme.text}>{item.rarity}</span>
                                        </>
                                      )}
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-1.5 shrink-0 select-none">
                                  {item.quantity > 1 && (
                                    <span className="font-mono text-[9px] font-bold text-muted-foreground bg-secondary/70 border border-border/30 rounded px-1">
                                      ×{item.quantity}
                                    </span>
                                  )}
                                  <div className="flex items-center gap-1">
                                    {item.equipped && (
                                      <span className="text-[8px] font-bold text-teal-400 bg-teal-500/10 border border-teal-500/25 rounded px-1 uppercase tracking-wider">
                                        EQ
                                      </span>
                                    )}
                                    {item.attuned && (
                                      <span className="text-[8px] font-bold text-gold bg-gold/10 border border-gold/25 rounded px-1 uppercase tracking-wider">
                                        AT
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="flex flex-col gap-3 md:sticky md:top-4 self-start w-full">
            {selectedInvItem ? (
              (() => {
                const activeInvItem =
                  groupedInventory.find(
                    (item) =>
                      item.name === selectedInvItem.name &&
                      item.equipped === selectedInvItem.equipped,
                  ) || selectedInvItem;
                const theme = getRarityTheme(activeInvItem.rarity);

                const handleToggleEquip = () => {
                  toggleLocalItemEquipped(activeInvItem.name);
                  setSelectedInvItem({
                    ...activeInvItem,
                    equipped: !activeInvItem.equipped,
                  });
                };

                const handleToggleAttune = () => {
                  toggleLocalItemAttuned(activeInvItem.name);
                  setSelectedInvItem({
                    ...activeInvItem,
                    attuned: !activeInvItem.attuned,
                  });
                };

                return (
                  <div
                    className={cn(
                      "rounded-xl border bg-secondary/15 p-4 relative overflow-hidden transition-all duration-300",
                      theme.border,
                      theme.glow,
                    )}
                  >
                    <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-gold/5 blur-xl pointer-events-none select-none" />

                    <div className="border-b border-border/40 pb-3 mb-4 select-none">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-[9px] font-bold uppercase tracking-wider border rounded px-1.5 py-0.5",
                            theme.badge,
                          )}
                        >
                          {activeInvItem.rarity ? activeInvItem.rarity : "Mundane"}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary/45 border border-border/20 rounded px-1.5 py-0.5">
                          {activeInvItem.type}
                        </span>
                      </div>
                      <h3 className="font-heading text-base font-bold text-foreground mt-2 select-all leading-tight">
                        {activeInvItem.name}
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-4 text-[10px] select-all">
                      <div className="rounded border border-border/40 bg-secondary/25 p-2 flex flex-col justify-center gap-0.5">
                        <span className="text-muted-foreground uppercase font-bold tracking-wider text-[8px]">
                          Weight
                        </span>
                        <span className="font-mono text-foreground font-bold">
                          {activeInvItem.weight
                            ? `${(activeInvItem.weight * activeInvItem.quantity).toFixed(1)} lbs`
                            : "—"}
                        </span>
                      </div>
                      <div className="rounded border border-border/40 bg-secondary/25 p-2 flex flex-col justify-center gap-0.5">
                        <span className="text-muted-foreground uppercase font-bold tracking-wider text-[8px]">
                          Value
                        </span>
                        <span className="font-mono text-gold font-bold">
                          {activeInvItem.cost ? `${activeInvItem.cost} gp` : "—"}
                        </span>
                      </div>
                      <div className="rounded border border-border/40 bg-secondary/25 p-2 flex flex-col justify-center gap-0.5">
                        <span className="text-muted-foreground uppercase font-bold tracking-wider text-[8px]">
                          Equipped
                        </span>
                        <span
                          className={
                            activeInvItem.equipped
                              ? "text-teal-400 font-bold"
                              : "text-muted-foreground"
                          }
                        >
                          {activeInvItem.equipped ? "Yes" : "No"}
                        </span>
                      </div>
                      <div className="rounded border border-border/40 bg-secondary/25 p-2 flex flex-col justify-center gap-0.5">
                        <span className="text-muted-foreground uppercase font-bold tracking-wider text-[8px]">
                          Attuned
                        </span>
                        <span
                          className={
                            activeInvItem.attuned ? "text-gold font-bold" : "text-muted-foreground"
                          }
                        >
                          {activeInvItem.attuned ? "Yes ✦" : "No"}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={handleToggleEquip}
                        className={cn(
                          "flex-1 rounded-lg border px-3 py-2 text-xs font-bold transition-all duration-200 cursor-pointer select-none text-center",
                          activeInvItem.equipped
                            ? "bg-teal-500/10 border-teal-500/30 text-teal-400 hover:bg-teal-500/20"
                            : "bg-secondary/35 border-border/30 text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                        )}
                      >
                        {activeInvItem.equipped ? "🛡️ Unequip" : "🛡️ Equip"}
                      </button>
                      <button
                        onClick={handleToggleAttune}
                        className={cn(
                          "flex-1 rounded-lg border px-3 py-2 text-xs font-bold transition-all duration-200 cursor-pointer select-none text-center",
                          activeInvItem.attuned
                            ? "bg-gold/15 border-gold/30 text-gold hover:bg-gold/25 shadow-[0_0_8px_rgba(212,175,55,0.1)]"
                            : "bg-secondary/35 border-border/30 text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                        )}
                      >
                        {activeInvItem.attuned ? "✦ Unattune" : "✦ Attune"}
                      </button>
                      {activeInvItem.isLocalCustom && (
                        <button
                          onClick={() => {
                            deleteLocalCustomItem(activeInvItem.name);
                            setSelectedInvItem(null);
                          }}
                          className="rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 font-bold px-3 py-2 text-xs transition-all cursor-pointer focus:outline-none select-none text-center shrink-0"
                          title="Delete Custom Item"
                        >
                          🗑️
                        </button>
                      )}
                    </div>

                    {(() => {
                      const isWeapon =
                        activeInvItem.damage ||
                        (activeInvItem.properties && activeInvItem.properties.length > 0);
                      const isArmor = typeof activeInvItem.armorClass === "number";
                      if (!isWeapon && !isArmor) return null;
                      return (
                        <div className="rounded-xl border border-border/40 bg-secondary/10 p-3 mb-4 select-all">
                          <span className="block text-[8px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                            Attributes
                          </span>
                          <div className="flex flex-col gap-1.5 text-[10px]">
                            {activeInvItem.damage && (
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Damage:</span>
                                <span className="font-mono text-accent font-bold">
                                  {activeInvItem.damage}
                                </span>
                              </div>
                            )}
                            {typeof activeInvItem.armorClass === "number" && (
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Armor Class (AC):</span>
                                <span className="font-mono text-teal-400 font-bold">
                                  +{activeInvItem.armorClass}
                                </span>
                              </div>
                            )}
                            {activeInvItem.properties && activeInvItem.properties.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {activeInvItem.properties.map((p: string) => (
                                  <span
                                    key={p}
                                    className="rounded bg-secondary border border-border/30 px-1.5 py-0.5 text-[8px] font-bold text-foreground/80 tracking-wide uppercase"
                                  >
                                    {p}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="text-[11px] leading-relaxed select-all">
                      <span className="block text-[8px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 select-none">
                        Lore & Magic Description
                      </span>
                      <div
                        className="bg-secondary/20 border border-border/30 rounded-lg p-3 max-h-[200px] overflow-y-auto custom-scrollbar leading-normal text-muted-foreground/90 prose-arcanum"
                        dangerouslySetInnerHTML={{
                          __html:
                            activeInvItem.description || "No description available for this item.",
                        }}
                      />
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="rounded-xl border border-dashed border-border/50 bg-secondary/5 p-8 text-center flex flex-col items-center justify-center min-h-[300px] select-none">
                <span className="text-3xl opacity-40">🔮</span>
                <h4 className="font-heading text-sm font-bold text-foreground mt-3 leading-snug">
                  Gear Inspector
                </h4>
                <p className="text-[11px] text-muted-foreground max-w-[200px] mt-1 leading-normal">
                  Select any gear item from the inventory grid to inspect its properties and lore.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {infusionsPanel}

      {/* Add Custom Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-background p-5 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-border/40 pb-2.5 mb-4 select-none">
              <h3 className="font-heading text-sm font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
                <span>🎒 Add Custom Item</span>
              </h3>
              <button
                onClick={() => setShowAddItemModal(false)}
                className="rounded-lg p-1 hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none text-xs"
              >
                ✕
              </button>
            </div>

            <div className="relative mb-3 shrink-0">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                value={presetSearchTerm}
                onChange={(e) => setPresetSearchTerm(e.target.value)}
                placeholder="Search presets or standard D&D items..."
                className="w-full rounded-lg border border-border bg-secondary/25 py-1.5 pl-8.5 pr-8 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none transition-colors"
              />
              {presetSearchTerm && (
                <button
                  type="button"
                  onClick={() => setPresetSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {filteredPresets.length > 0 && (
              <div className="absolute left-5 right-5 mt-[78px] z-[130] max-h-56 overflow-y-auto rounded-lg border border-border bg-popover p-1.5 shadow-2xl animate-in fade-in duration-100">
                <div className="text-[9px] font-bold text-muted-foreground px-2 py-1 uppercase tracking-wider">
                  Matches ({filteredPresets.length})
                </div>
                {filteredPresets.map((item) => (
                  <button
                    key={`${item.name}-${item.source}`}
                    type="button"
                    onClick={async () => {
                      if (item.apiIndex && item.apiCategory) {
                        setIsFetchingDetail(true);
                        try {
                          const res = await fetch(
                            `https://www.dnd5eapi.co/api/2014/${item.apiCategory}/${item.apiIndex}`,
                          );
                          if (res.ok) {
                            const detail = await res.json();
                            setNewItemName(detail.name || item.name);

                            // Type resolver
                            let baseType = "Gear";
                            if (item.apiCategory === "magic-items") {
                              baseType = "Wondrous Item";
                              const categoryName = (
                                detail.equipment_category?.name || ""
                              ).toLowerCase();
                              if (categoryName.includes("ring")) baseType = "Ring";
                              else if (categoryName.includes("scroll")) baseType = "Scroll";
                              else if (categoryName.includes("potion")) baseType = "Potion";
                              else if (categoryName.includes("shield")) baseType = "Shield";
                              else if (categoryName.includes("weapon")) baseType = "Weapon";
                            } else {
                              const categoryName = (
                                detail.equipment_category?.name || ""
                              ).toLowerCase();
                              if (categoryName.includes("weapon")) {
                                baseType = "Weapon";
                              } else if (categoryName.includes("armor")) {
                                const armorCat = (detail.armor_category || "").toLowerCase();
                                if (armorCat.includes("light")) baseType = "Light Armor";
                                else if (armorCat.includes("medium")) baseType = "Medium Armor";
                                else if (armorCat.includes("heavy")) baseType = "Heavy Armor";
                                else if (armorCat.includes("shield")) baseType = "Shield";
                              } else if (categoryName.includes("potion")) {
                                baseType = "Potion";
                              } else if (categoryName.includes("ring")) {
                                baseType = "Ring";
                              } else if (categoryName.includes("scroll")) {
                                baseType = "Scroll";
                              }
                            }

                            setNewItemType(baseType);
                            setNewItemRarity(detail.rarity?.name || "Mundane");
                            setNewItemQty(1);
                            setNewItemWeight(detail.weight || 0);

                            let calculatedCost = 0;
                            if (detail.cost) {
                              const qty = detail.cost.quantity || 0;
                              const unit = (detail.cost.unit || "gp").toLowerCase();
                              if (unit === "gp") calculatedCost = qty;
                              else if (unit === "sp") calculatedCost = qty / 10;
                              else if (unit === "cp") calculatedCost = qty / 100;
                              else if (unit === "ep") calculatedCost = qty / 2;
                              else if (unit === "pp") calculatedCost = qty * 10;
                            }
                            setNewItemCost(calculatedCost);
                            setNewItemDamage(detail.damage?.damage_dice || "");
                            setNewItemAc(
                              detail.armor_class?.base !== undefined ? detail.armor_class.base : "",
                            );
                            setNewItemDesc(
                              Array.isArray(detail.desc)
                                ? detail.desc.join("\n")
                                : detail.desc || "",
                            );
                          }
                        } catch (e) {
                          console.error("Failed to load SRD item details:", e);
                        } finally {
                          setIsFetchingDetail(false);
                        }
                      } else {
                        setNewItemName(item.name);
                        setNewItemType(item.type);
                        setNewItemRarity(item.rarity || "Mundane");
                        setNewItemQty(1);
                        setNewItemWeight(item.weight);
                        setNewItemCost(item.cost);
                        setNewItemDamage(item.damage || "");
                        setNewItemAc(item.armorClass || "");
                        setNewItemDesc(item.description || "");
                      }
                      setPresetSearchTerm("");
                    }}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-secondary flex items-center justify-between transition-colors cursor-pointer select-none"
                  >
                    <div>
                      <div className="font-bold text-foreground text-xs">{item.name}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                        <span>{item.type}</span>
                        {item.rarity && item.rarity !== "Mundane" && (
                          <>
                            <span>•</span>
                            <span className="text-accent">{item.rarity}</span>
                          </>
                        )}
                        <span>•</span>
                        <span className="text-[9px] italic text-muted-foreground/60">
                          {item.source}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newItemName.trim()) return;

                let armorTypeId: number | undefined;
                if (newItemType === "Shield") armorTypeId = 4;
                else if (newItemType === "Light Armor") armorTypeId = 1;
                else if (newItemType === "Medium Armor") armorTypeId = 2;
                else if (newItemType === "Heavy Armor") armorTypeId = 3;

                const customItem = {
                  name: newItemName,
                  type: newItemType,
                  rarity: newItemRarity,
                  magic: newItemRarity !== "Mundane" && newItemRarity !== "Common",
                  equipped: false,
                  attuned: false,
                  quantity: newItemQty,
                  weight: newItemWeight,
                  cost: newItemCost,
                  damage: newItemDamage || undefined,
                  armorClass: typeof newItemAc === "number" ? newItemAc : undefined,
                  armorTypeId,
                  description: newItemDesc || undefined,
                  isLocalCustom: true,
                };

                addLocalCustomItem(customItem);
                setShowAddItemModal(false);
              }}
              className="flex-1 overflow-y-auto pr-1.5 flex flex-col gap-3.5 custom-scrollbar text-xs"
            >
              <div className="grid grid-cols-2 gap-3.5 select-none">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-muted-foreground uppercase tracking-wider text-[9px]">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="e.g. Ring of Fire Resistance"
                    className="rounded-lg border border-border bg-secondary/15 p-2 text-foreground focus:border-accent focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-muted-foreground uppercase tracking-wider text-[9px]">
                    Item Type
                  </label>
                  <select
                    value={newItemType}
                    onChange={(e) => setNewItemType(e.target.value)}
                    className="rounded-lg border border-border bg-background p-2 text-foreground focus:border-accent focus:outline-none transition-colors"
                  >
                    {[
                      "Weapon",
                      "Shield",
                      "Light Armor",
                      "Medium Armor",
                      "Heavy Armor",
                      "Potion",
                      "Scroll",
                      "Ring",
                      "Wondrous Item",
                      "Amulet",
                      "Cloak",
                      "Wand",
                      "Staff",
                      "Rod",
                      "Gear",
                    ].map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 select-none">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-muted-foreground uppercase tracking-wider text-[9px]">
                    Rarity
                  </label>
                  <select
                    value={newItemRarity}
                    onChange={(e) => setNewItemRarity(e.target.value)}
                    className="rounded-lg border border-border bg-background p-2 text-foreground focus:border-accent focus:outline-none transition-colors"
                  >
                    {[
                      "Mundane",
                      "Common",
                      "Uncommon",
                      "Rare",
                      "Very Rare",
                      "Legendary",
                      "Artifact",
                    ].map((rar) => (
                      <option key={rar} value={rar}>
                        {rar}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-muted-foreground uppercase tracking-wider text-[9px]">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(parseInt(e.target.value, 10) || 1)}
                    className="rounded-lg border border-border bg-secondary/15 p-2 text-foreground focus:border-accent focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-muted-foreground uppercase tracking-wider text-[9px]">
                    Weight (lbs, each)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min={0}
                    value={newItemWeight}
                    onChange={(e) => setNewItemWeight(parseFloat(e.target.value) || 0)}
                    className="rounded-lg border border-border bg-secondary/15 p-2 text-foreground focus:border-accent focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 select-none">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-muted-foreground uppercase tracking-wider text-[9px]">
                    Value (gp, each)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newItemCost}
                    onChange={(e) => setNewItemCost(parseFloat(e.target.value) || 0)}
                    className="rounded-lg border border-border bg-secondary/15 p-2 text-foreground focus:border-accent focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-muted-foreground uppercase tracking-wider text-[9px]">
                    Weapon Damage
                  </label>
                  <input
                    type="text"
                    value={newItemDamage}
                    onChange={(e) => setNewItemDamage(e.target.value)}
                    placeholder="e.g. 1d6 fire"
                    disabled={newItemType !== "Weapon"}
                    className="rounded-lg border border-border bg-secondary/15 p-2 text-foreground focus:border-accent focus:outline-none transition-colors disabled:opacity-40"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-muted-foreground uppercase tracking-wider text-[9px]">
                    Armor Class (AC)
                  </label>
                  <input
                    type="number"
                    value={newItemAc}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setNewItemAc(isNaN(val) ? "" : val);
                    }}
                    placeholder="e.g. 2"
                    disabled={
                      newItemType !== "Shield" &&
                      newItemType !== "Light Armor" &&
                      newItemType !== "Medium Armor" &&
                      newItemType !== "Heavy Armor"
                    }
                    className="rounded-lg border border-border bg-secondary/15 p-2 text-foreground focus:border-accent focus:outline-none transition-colors disabled:opacity-40"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-muted-foreground uppercase tracking-wider text-[9px] select-none">
                  Description / Lore Notes
                </label>
                <textarea
                  rows={4}
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  placeholder="Enter any magical properties or detailed description..."
                  className="rounded-lg border border-border bg-secondary/15 p-2 text-foreground focus:border-accent focus:outline-none transition-colors resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-3.5 mt-2 shrink-0 select-none">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="rounded-lg bg-secondary/40 border border-border/40 hover:bg-secondary/70 text-muted-foreground hover:text-foreground font-bold px-4 py-2 text-xs transition-all cursor-pointer focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isFetchingDetail}
                  className="rounded-lg bg-accent text-accent-foreground font-bold px-4 py-2 text-xs transition-all hover:bg-accent-hover disabled:opacity-50 cursor-pointer focus:outline-none"
                >
                  Add to Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
