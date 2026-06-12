import { useState } from "react";
import { PartyMember, InventoryItem } from "@/lib/dndbeyond.functions";
import { Package, Coins, Star, Shield, Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getShortName } from "@/lib/utils";

interface SharedInventoryProps {
  members: PartyMember[];
}

export function SharedInventory({ members }: SharedInventoryProps) {
  const activeMembers = members.filter((m) => !m.error);
  const [searchTerm, setSearchTerm] = useState("");

  if (activeMembers.length === 0) return null;

  // 1. Sum up all currencies
  const totalCurrencies = {
    pp: 0,
    gp: 0,
    ep: 0,
    sp: 0,
    cp: 0,
  };

  activeMembers.forEach((m) => {
    if (m.currencies) {
      totalCurrencies.pp += m.currencies.pp ?? 0;
      totalCurrencies.gp += m.currencies.gp ?? 0;
      totalCurrencies.ep += m.currencies.ep ?? 0;
      totalCurrencies.sp += m.currencies.sp ?? 0;
      totalCurrencies.cp += m.currencies.cp ?? 0;
    }
  });

  const totalGPEquivalent =
    totalCurrencies.gp +
    totalCurrencies.pp * 10 +
    totalCurrencies.ep * 0.5 +
    totalCurrencies.sp * 0.1 +
    totalCurrencies.cp * 0.01;

  // 2. Aggregate all magic items
  interface AggregatedMagicItem extends InventoryItem {
    ownerName: string;
    ownerId: number;
  }

  const magicItems: AggregatedMagicItem[] = [];

  activeMembers.forEach((m) => {
    m.inventory?.forEach((item) => {
      if (item.magic) {
        magicItems.push({
          ...item,
          ownerName: m.name,
          ownerId: m.id,
        });
      }
    });
  });

  // Sort magic items by rarity
  const RARITY_ORDER = ["Legendary", "Very Rare", "Rare", "Uncommon", "Common", "Mundane", null];
  magicItems.sort((a, b) => {
    const aIndex = RARITY_ORDER.indexOf(a.rarity);
    const bIndex = RARITY_ORDER.indexOf(b.rarity);
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
  });

  // Filter items by search term
  const filteredMagicItems = magicItems.filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(term) ||
      (item.type && item.type.toLowerCase().includes(term)) ||
      (item.ownerName && item.ownerName.toLowerCase().includes(term)) ||
      (item.rarity && item.rarity.toLowerCase().includes(term))
    );
  });

  // Get attunement counts per character
  const attunementData = activeMembers.map((m) => {
    const attunedItems = m.inventory?.filter((item) => item.magic && item.attuned) ?? [];
    return {
      charName: m.name,
      charId: m.id,
      count: attunedItems.length,
      items: attunedItems,
    };
  });

  const getRarityBadgeColor = (rarity: string | null) => {
    switch (rarity?.toLowerCase()) {
      case "legendary":
        return "border-orange-500/30 bg-orange-500/10 text-orange-400";
      case "very rare":
        return "border-purple-500/30 bg-purple-500/10 text-purple-400";
      case "rare":
        return "border-blue-500/30 bg-blue-500/10 text-blue-400";
      case "uncommon":
        return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
      default:
        return "border-border bg-secondary/50 text-muted-foreground";
    }
  };

  return (
    <div className="card-arcane rounded-xl border border-border p-5 shadow-xl transition-all duration-300">
      <div className="flex items-center gap-2.5 border-b border-border/40 pb-3 mb-4 select-none">
        <Package size={16} className="text-accent" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-foreground bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
          Shared Bags & Attunement Tracker
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Currencies (4 cols) */}
        <div className="lg:col-span-4 rounded-lg bg-secondary/15 border border-border/30 p-4 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-500 select-none">
            <Coins size={13} className="text-amber-500" />
            <span>Unified Party Currency</span>
          </div>

          <div className="text-center bg-secondary/35 border border-border/30 rounded-lg py-3 select-all">
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Total GP Value</div>
            <div className="font-heading text-2xl font-extrabold text-gold tracking-tight drop-shadow-sm mt-0.5">
              {Math.round(totalGPEquivalent * 100) / 100} gp
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1.5 text-center text-xs select-all">
            <div className="rounded border border-border bg-secondary/25 px-1 py-2">
              <span className="block text-[8px] font-bold uppercase tracking-wider text-muted-foreground mb-1">PP</span>
              <span className="font-mono font-bold text-foreground">{totalCurrencies.pp}</span>
            </div>
            <div className="rounded border border-border bg-secondary/25 px-1 py-2">
              <span className="block text-[8px] font-bold uppercase tracking-wider text-muted-foreground mb-1">GP</span>
              <span className="font-mono font-bold text-gold">{totalCurrencies.gp}</span>
            </div>
            <div className="rounded border border-border bg-secondary/25 px-1 py-2">
              <span className="block text-[8px] font-bold uppercase tracking-wider text-muted-foreground mb-1">EP</span>
              <span className="font-mono font-bold text-foreground/85">{totalCurrencies.ep}</span>
            </div>
            <div className="rounded border border-border bg-secondary/25 px-1 py-2">
              <span className="block text-[8px] font-bold uppercase tracking-wider text-muted-foreground mb-1">SP</span>
              <span className="font-mono font-bold text-foreground/75">{totalCurrencies.sp}</span>
            </div>
            <div className="rounded border border-border bg-secondary/25 px-1 py-2">
              <span className="block text-[8px] font-bold uppercase tracking-wider text-muted-foreground mb-1">CP</span>
              <span className="font-mono font-bold text-amber-600">{totalCurrencies.cp}</span>
            </div>
          </div>

          {/* Attunement Tracker */}
          <div className="border-t border-border/30 pt-3.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent select-none">
              <Star size={13} className="text-accent" />
              <span>Attunement Status</span>
            </div>

            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
              {attunementData.map((a) => (
                <div key={a.charId} className="text-xs">
                  <div className="flex items-center justify-between font-semibold mb-1">
                    <span className="text-foreground">{getShortName(a.charName)}</span>
                    <span
                      className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${
                        a.count >= 3
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-400 font-bold"
                          : "border-border bg-secondary/40 text-muted-foreground"
                      }`}
                    >
                      {a.count} / 3
                    </span>
                  </div>
                  {a.items.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {a.items.map((item, idx) => (
                        <span
                          key={idx}
                          className="text-[9px] bg-secondary/30 border border-border/40 text-muted-foreground px-1.5 py-0.5 rounded"
                        >
                          {item.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Magic Items List (8 cols) */}
        <div className="lg:col-span-8 rounded-lg bg-secondary/15 border border-border/30 p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/20 pb-2.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary select-none">
              <Shield size={13} className="text-primary" />
              <span>Shared Magic Items ({filteredMagicItems.length})</span>
            </div>

            {/* Live Search Filter */}
            <div className="relative w-full sm:max-w-[200px]">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
              <input
                type="text"
                placeholder="Search bags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded border border-border/40 bg-secondary/40 pl-7 pr-2.5 py-1 text-xs text-foreground placeholder-muted-foreground/65 focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2">
            {filteredMagicItems.length === 0 ? (
              <p className="text-xs text-muted-foreground italic select-none">
                {searchTerm ? "No matching items found." : "No magic items found in character inventories."}
              </p>
            ) : (
              filteredMagicItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border/40 bg-secondary/20 px-3 py-2 text-xs gap-2"
                >
                  <div>
                    <div className="font-semibold text-foreground flex items-center gap-1.5 select-all">
                      <span>{item.name}</span>
                      {item.quantity > 1 && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          (x{item.quantity})
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 select-none">
                      {item.type} • Held by: <span className="font-medium text-foreground">{getShortName(item.ownerName)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 select-none">
                    {item.rarity && (
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${getRarityBadgeColor(
                          item.rarity
                        )}`}
                      >
                        {item.rarity}
                      </span>
                    )}
                    {item.attuned && (
                      <span className="rounded border border-gold/30 bg-gold/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-gold">
                        Attuned
                      </span>
                    )}
                    {item.equipped && !item.attuned && (
                      <span className="rounded border border-border bg-secondary/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Equipped
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
