import { Coins, Dumbbell, Sparkles, Package } from "lucide-react";
import { PartyMember, InventoryItem } from "@/lib/dndbeyond.functions";

function getItemRarityClass(rarity?: string) {
  const norm = rarity?.toLowerCase().replace(/\s+/g, "") || "";
  switch (norm) {
    case "artifact":
      return "border-ui-rose/50 bg-ui-rose/10 text-ui-rose shadow-[0_0_8px_color-mix(in_oklab,var(--color-ui-rose)_30%,transparent)] font-bold";
    case "legendary":
      return "border-gold/50 bg-gold/10 text-gold shadow-[0_0_8px_color-mix(in_oklab,var(--color-gold)_30%,transparent)] font-bold animate-pulse";
    case "veryrare":
      return "border-ui-fuchsia/50 bg-ui-fuchsia/10 text-ui-fuchsia shadow-[0_0_6px_color-mix(in_oklab,var(--color-ui-fuchsia)_25%,transparent)] font-semibold";
    case "rare":
      return "border-ui-violet/50 bg-ui-violet/10 text-ui-violet font-semibold";
    case "uncommon":
      return "border-ui-sky/40 bg-ui-sky/5 text-ui-sky";
    case "common":
      return "border-ui-emerald/30 bg-ui-emerald/5 text-ui-emerald";
    default:
      return "border-border/30 bg-secondary/20 text-foreground/90 hover:border-accent/30";
  }
}

function InventoryGroup({ label, items }: { label: string; items: InventoryItem[] }) {
  return (
    <div>
      <div className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/75">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it, idx) => {
          const rarityClass = getItemRarityClass(it.rarity || undefined);
          const styles = it.attuned
            ? `${rarityClass} ring-1 ring-gold/45 shadow-[0_0_10px_color-mix(in_oklab,var(--gold)_40%,transparent)]`
            : rarityClass;
          const title =
            `${it.name} — ${it.type}` +
            (it.rarity ? ` (${it.rarity})` : "") +
            (it.attuned ? " • attuned" : "") +
            (it.quantity > 1 ? ` ×${it.quantity}` : "");
          return (
            <span
              key={`${it.name}-${idx}`}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[9px] uppercase tracking-wider transition-all duration-200 hover:scale-105 select-none ${styles}`}
              title={title}
            >
              {it.attuned ? (
                <Sparkles size={8} className="text-gold/90 animate-pulse shrink-0" />
              ) : it.magic ? (
                <Sparkles size={8} className="text-accent/90 shrink-0" />
              ) : (
                <Package size={8} className="text-muted-foreground/90 shrink-0" />
              )}
              <span>{it.name}</span>
              {it.quantity > 1 && (
                <span className="ml-1 font-mono text-[8px] opacity-75">×{it.quantity}</span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function InventoryList({
  items,
  currencies,
  weightCarried,
  carryingCapacity,
}: {
  items: InventoryItem[];
  currencies: PartyMember["currencies"];
  weightCarried: number;
  carryingCapacity: number;
}) {
  const equipped = items.filter((i) => i.equipped);
  const magicCarried = items.filter((i) => !i.equipped && i.magic);
  const other = items.filter((i) => !i.equipped && !i.magic);
  const attunedCount = items.filter((i) => i.attuned).length;

  const coinTypes = [
    { key: "pp", label: "PP", color: "text-ui-teal bg-ui-teal/10 border-ui-teal/30" },
    { key: "gp", label: "GP", color: "text-gold bg-gold/10 border-gold/30" },
    { key: "ep", label: "EP", color: "text-ui-cyan bg-ui-cyan/10 border-ui-cyan/30" },
    { key: "sp", label: "SP", color: "text-muted-foreground bg-muted/30 border-border/50" },
    { key: "cp", label: "CP", color: "text-ui-orange bg-ui-orange/10 border-ui-orange/30" },
  ] as const;

  const activeCoins = coinTypes.filter((c) => (currencies?.[c.key] ?? 0) > 0);
  const displayedCoins = activeCoins.length > 0 ? activeCoins : [coinTypes[1]];

  const weightPct =
    carryingCapacity > 0 ? Math.min(100, (weightCarried / carryingCapacity) * 100) : 0;
  const weightColor =
    weightPct > 90 ? "bg-hp-critical" : weightPct > 75 ? "bg-hp-wounded" : "bg-primary";
  const weightGlow =
    weightPct > 90
      ? "shadow-[0_0_8px_color-mix(in_oklab,var(--hp-critical)_70%,transparent)] animate-pulse"
      : weightPct > 75
        ? "shadow-[0_0_8px_color-mix(in_oklab,var(--hp-wounded)_70%,transparent)]"
        : "shadow-[0_0_6px_color-mix(in_oklab,var(--primary)_70%,transparent)]";

  return (
    <div className="flex flex-col gap-3">
      {/* Wealth & Carrying Bar */}
      <div className="grid grid-cols-2 gap-2">
        <div className="group/wealth flex flex-wrap items-center gap-1.5 rounded-lg border border-border/40 bg-secondary/20 p-2 relative overflow-hidden">
          <div className="absolute -right-3 -top-3 h-10 w-10 rounded-full bg-gold/5 blur-lg pointer-events-none" />
          <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground select-none">
            <Coins
              size={10}
              className="text-gold/90 transition-transform duration-300 group-hover/wealth:animate-jingle"
            />
            <span>Wealth:</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {displayedCoins.map((c) => (
              <span
                key={c.key}
                className={`inline-flex items-center gap-0.5 rounded border px-1 py-0.5 text-[9px] font-mono font-bold ${c.color}`}
              >
                <span>{currencies?.[c.key] ?? 0}</span>
                <span className="text-[8px] uppercase font-semibold">{c.label}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-center gap-1 rounded-lg border border-border/40 bg-secondary/20 p-2 relative overflow-hidden">
          <div className="absolute -right-3 -top-3 h-10 w-10 rounded-full bg-primary/5 blur-lg pointer-events-none" />
          <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-muted-foreground select-none">
            <div className="flex items-center gap-1">
              <Dumbbell size={10} className="text-primary/95" />
              <span>Weight:</span>
            </div>
            <span className="font-mono text-foreground font-bold">
              {weightCarried.toFixed(1)} / {carryingCapacity} lbs
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary mt-1">
            <div
              className={`h-full ${weightColor} ${weightGlow} transition-all duration-500`}
              style={{ width: `${weightPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Attunement Tracker */}
      <div className="flex items-center justify-between rounded-lg border border-gold/30 bg-[color-mix(in_oklab,var(--gold)_8%,var(--secondary))] px-2.5 py-1.5 shadow-[0_0_8px_color-mix(in_oklab,var(--gold)_20%,transparent)] select-none">
        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-gold">
          <Sparkles size={10} className="text-gold/90 animate-pulse" />
          <span>Attunement Slots</span>
        </span>
        <span className="font-mono text-xs font-bold text-gold">{attunedCount} / 3</span>
      </div>

      {equipped.length > 0 && <InventoryGroup label="Equipped" items={equipped} />}
      {magicCarried.length > 0 && <InventoryGroup label="Magic Items" items={magicCarried} />}
      {other.length > 0 && <InventoryGroup label="Carried" items={other} />}
    </div>
  );
}
