import { useState, useEffect, useRef } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Eye, EyeOff, EarOff, Ghost, Hand, Ban, Snowflake, Mountain, FlaskConical, ArrowDown, Lock, Zap, Moon, Brain, Heart, Flame, HeartCrack, Skull, Sparkles, AlertCircle, Swords, Shield, Search, Coins, Dumbbell, Package, Award, BookOpen, Compass, Crown, Star, Plus } from "lucide-react";
import { PartyMember, InventoryItem } from "@/lib/dndbeyond.functions";
import { CONDITION_BY_NAME, SKILL_ABILITY } from "@/lib/constants";
import { X } from "lucide-react";
import { Link } from "@tanstack/react-router";

const ABILITY_DETAILS: Record<
  string,
  {
    Icon: React.ComponentType<{ size?: number; className?: string }>;
    colorClass: string;
    borderClass: string;
    bgClass: string;
    glowClass: string;
    hoverGlowClass: string;
  }
> = {
  STR: {
    Icon: Dumbbell,
    colorClass: "text-accent/80",
    borderClass: "border-accent/15",
    bgClass: "bg-accent/5",
    glowClass: "shadow-accent/5",
    hoverGlowClass: "hover:shadow-accent/10 hover:border-accent/40",
  },
  DEX: {
    Icon: Zap,
    colorClass: "text-accent/80",
    borderClass: "border-accent/15",
    bgClass: "bg-accent/5",
    glowClass: "shadow-accent/5",
    hoverGlowClass: "hover:shadow-accent/10 hover:border-accent/40",
  },
  CON: {
    Icon: Heart,
    colorClass: "text-accent/80",
    borderClass: "border-accent/15",
    bgClass: "bg-accent/5",
    glowClass: "shadow-accent/5",
    hoverGlowClass: "hover:shadow-accent/10 hover:border-accent/40",
  },
  INT: {
    Icon: BookOpen,
    colorClass: "text-accent/80",
    borderClass: "border-accent/15",
    bgClass: "bg-accent/5",
    glowClass: "shadow-accent/5",
    hoverGlowClass: "hover:shadow-accent/10 hover:border-accent/40",
  },
  WIS: {
    Icon: Compass,
    colorClass: "text-accent/80",
    borderClass: "border-accent/15",
    bgClass: "bg-accent/5",
    glowClass: "shadow-accent/5",
    hoverGlowClass: "hover:shadow-accent/10 hover:border-accent/40",
  },
  CHA: {
    Icon: Crown,
    colorClass: "text-accent/80",
    borderClass: "border-accent/15",
    bgClass: "bg-accent/5",
    glowClass: "shadow-accent/5",
    hoverGlowClass: "hover:shadow-accent/10 hover:border-accent/40",
  },
};

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3.5 border-t border-border/45 pt-3">
      <details open={defaultOpen} className="group">
        <summary className="mb-1 flex cursor-pointer list-none items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-accent">
          <span>{title}</span>
          <span className="ml-2 transition-transform group-open:rotate-90">›</span>
        </summary>
        {children}
      </details>
    </div>
  );
}

function Stat({ 
  label, 
  value, 
  icon: Icon,
  iconClassName
}: { 
  label: string; 
  value: React.ReactNode; 
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  iconClassName?: string;
}) {
  return (
    <div className="group rounded-lg border border-border/40 bg-secondary/35 px-1.5 py-2 transition-all duration-300 hover:border-accent/40 hover:bg-secondary/60 relative overflow-hidden flex flex-col justify-between min-h-[58px] hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/5">
      <div className="flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground select-none">
        {Icon && (
          <Icon 
            size={8} 
            className={`shrink-0 transition-all duration-300 group-hover:scale-125 group-hover:rotate-12 ${iconClassName || "text-accent/85"}`} 
          />
        )}
        <span>{label}</span>
      </div>
      <div className="font-heading text-lg font-extrabold text-foreground leading-tight drop-shadow-sm mt-1">{value}</div>
    </div>
  );
}

function conditionIcon(name: string) {
  return CONDITION_BY_NAME.get(name.toLowerCase())?.Icon ?? AlertCircle;
}

type LocalCondition = { name: string; rounds: number | null };

const CONDITIONS_KEY = "mob.conditions.v1";

function readAllConditions(): Record<string, LocalCondition[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CONDITIONS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function useCharacterConditions(characterId: number) {
  const [all, setAll] = useState<Record<string, LocalCondition[]>>(() => readAllConditions());
  const key = String(characterId);
  const list = all[key] ?? [];

  const persist = (next: Record<string, LocalCondition[]>) => {
    setAll(next);
    try {
      localStorage.setItem(CONDITIONS_KEY, JSON.stringify(next));
    } catch {}
  };

  const add = (name: string, rounds: number | null) => {
    const exists = list.some((c) => c.name.toLowerCase() === name.toLowerCase());
    if (exists) return;
    persist({ ...all, [key]: [...list, { name, rounds }] });
  };
  const remove = (name: string) => {
    persist({ ...all, [key]: list.filter((c) => c.name !== name) });
  };
  const tick = (name: string, delta: number) => {
    persist({
      ...all,
      [key]: list
        .map((c) =>
          c.name === name && c.rounds != null
            ? { ...c, rounds: c.rounds + delta }
            : c,
        )
        .filter((c) => c.rounds == null || c.rounds > 0),
    });
  };

  return { list, add, remove, tick };
}

function ConditionChip({
  name,
  Icon,
  rounds,
  intense,
  readOnly,
  onTick,
  onRemove,
}: {
  name: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  rounds?: number | null;
  intense?: boolean;
  readOnly?: boolean;
  onTick?: () => void;
  onRemove?: () => void;
}) {
  const base = intense
    ? "border-destructive bg-destructive/25 text-destructive shadow-[0_0_8px_color-mix(in_oklab,var(--destructive)_70%,transparent)]"
    : readOnly
    ? "border-border bg-secondary/60 text-muted-foreground"
    : "border-destructive/60 bg-destructive/15 text-destructive shadow-[0_0_6px_color-mix(in_oklab,var(--destructive)_55%,transparent)]";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${base}`}
      title={rounds != null ? `${name} — ${rounds} round${rounds === 1 ? "" : "s"} remaining` : name}
    >
      <Icon size={10} />
      <span>{name}</span>
      {rounds != null && (
        <button
          onClick={onTick}
          disabled={!onTick}
          className="ml-0.5 rounded bg-destructive/30 px-1 font-mono text-[10px] text-destructive hover:bg-destructive/50 disabled:cursor-default disabled:opacity-60"
          title="Click to advance one round"
        >
          {rounds}r
        </button>
      )}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 rounded hover:text-foreground"
          title="Remove"
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
}


function getModifiedStats(member: PartyMember, localConditions: LocalCondition[]) {
  let ac = member.armorClass;
  let speed = member.speed;
  const acNotes: string[] = [];
  const speedNotes: string[] = [];

  // Combine remote and local conditions for checks
  const allConditions = [
    ...member.conditions.map(c => c.toLowerCase()),
    ...localConditions.map(c => c.name.toLowerCase())
  ];

  // 1. Check Exhaustion
  if (member.exhaustion >= 5) {
    speed = 0;
    speedNotes.push("Speed 0 from Exhaustion 5");
  } else if (member.exhaustion >= 2) {
    speed = Math.floor(speed / 2);
    speedNotes.push("Speed halved from Exhaustion");
  }

  // 2. Check Restraining Conditions (Speed becomes 0)
  const zeroSpeedConditions = ["grappled", "restrained", "paralyzed", "petrified", "stunned", "unconscious"];
  const activeZeroSpeed = zeroSpeedConditions.filter(c => allConditions.includes(c));
  if (activeZeroSpeed.length > 0) {
    speed = 0;
    speedNotes.push(`Speed 0 from ${activeZeroSpeed.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(", ")}`);
  }

  // 3. Check Shield Spell (+5 AC)
  if (allConditions.includes("shield")) {
    ac += 5;
    acNotes.push("+5 from Shield spell");
  }

  // 4. Check Haste Spell (+2 AC, double Speed)
  if (allConditions.includes("haste")) {
    ac += 2;
    acNotes.push("+2 from Haste spell");
    speed = speed * 2;
    speedNotes.push("Speed doubled from Haste spell");
  }

  // 5. Check Slow Spell (-2 AC, half Speed)
  if (allConditions.includes("slow")) {
    ac = Math.max(0, ac - 2);
    acNotes.push("-2 from Slow spell");
    speed = Math.floor(speed / 2);
    speedNotes.push("Speed halved from Slow spell");
  }

  return { ac, speed, acNotes, speedNotes };
}

function ConditionsPanel({
  characterId,
  remoteConditions,
  exhaustion,
  localConditions,
  onAddLocal,
  onRemoveLocal,
  onTickLocal,
}: {
  characterId: number;
  remoteConditions: string[];
  exhaustion: number;
  localConditions: LocalCondition[];
  onAddLocal: (name: string, rounds: number | null) => void;
  onRemoveLocal: (name: string) => void;
  onTickLocal: (name: string, delta: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [rounds, setRounds] = useState<number>(10);

  const presets = ["Bless", "Shield", "Haste", "Bane", "Slow", "Stunned", "Poisoned"];

  const handleAdd = (name: string, r: number | null) => {
    if (!name.trim()) return;
    onAddLocal(name.trim(), r);
    setCustomName("");
    setIsOpen(false);
  };

  return (
    <div className="mt-1.5 flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1">
        {exhaustion > 0 && (
          <ConditionChip
            name={`Exhaustion ${exhaustion}`}
            Icon={HeartCrack}
            intense
          />
        )}
        {remoteConditions.map((c) => {
          const Icon = conditionIcon(c);
          return <ConditionChip key={`r-${c}`} name={c} Icon={Icon} readOnly />;
        })}
        {localConditions.map((c) => {
          const Icon = conditionIcon(c.name);
          return (
            <ConditionChip
              key={`l-${c.name}`}
              name={c.name}
              Icon={Icon}
              rounds={c.rounds}
              onTick={() => onTickLocal(c.name, -1)}
              onRemove={() => onRemoveLocal(c.name)}
            />
          );
        })}
        
        {/* Add Buff Button */}
        <div className="relative inline-block">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex h-5 items-center gap-1 rounded-full border border-dashed border-border/60 bg-transparent px-2 text-[9px] font-medium uppercase tracking-wider text-muted-foreground transition-all duration-200 hover:border-accent/60 hover:text-accent hover:bg-accent/5 cursor-pointer"
          >
            <Plus size={8} className="shrink-0" />
            <span>Add Effect</span>
          </button>
          
          {isOpen && (
            <div className="absolute left-0 top-6 z-50 w-48 rounded-md border border-border bg-popover p-2 shadow-lg">
              <div className="mb-1.5 text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
                Quick Presets
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {presets.map((p) => (
                  <button
                    key={p}
                    onClick={() => handleAdd(p, p === "Shield" ? 1 : 10)}
                    className="rounded bg-secondary/80 px-1 py-0.5 text-[9px] text-foreground hover:bg-secondary"
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="border-t border-border/40 pt-1.5">
                <input
                  type="text"
                  placeholder="Custom name..."
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full rounded border border-border bg-secondary/40 px-1.5 py-0.5 text-[10px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-accent"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdd(customName, rounds);
                  }}
                />
                <div className="mt-1 flex items-center justify-between gap-1">
                  <span className="text-[8px] uppercase tracking-wider text-muted-foreground">Duration (Rounds)</span>
                  <input
                    type="number"
                    value={rounds}
                    onChange={(e) => setRounds(parseInt(e.target.value) || 1)}
                    className="w-12 rounded border border-border bg-secondary/40 px-1 py-0.5 font-mono text-[9px] text-center text-foreground focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => handleAdd(customName, rounds)}
                  className="mt-2 w-full rounded bg-primary py-0.5 text-[9px] font-bold text-primary-foreground hover:bg-primary/90"
                >
                  Add Custom
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InventoryGroup({ label, items }: { label: string; items: InventoryItem[] }) {
  return (
    <div>
      <div className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/75">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it, idx) => {
          const styles = it.attuned
            ? "border-gold/50 bg-[color-mix(in_oklab,var(--gold)_8%,var(--secondary))] text-gold shadow-[0_0_8px_color-mix(in_oklab,var(--gold)_30%,transparent)] font-bold"
            : it.magic
            ? "border-accent/50 bg-accent/10 text-accent font-semibold"
            : "border-border/30 bg-secondary/20 hover:border-accent/30 text-foreground/90";
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

function InventoryList({
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
    { key: "pp", label: "PP", color: "text-teal-400 bg-teal-500/10 border-teal-500/30" },
    { key: "gp", label: "GP", color: "text-gold bg-gold/10 border-gold/30" },
    { key: "ep", label: "EP", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" },
    { key: "sp", label: "SP", color: "text-slate-300 bg-slate-400/10 border-slate-400/30" },
    { key: "cp", label: "CP", color: "text-amber-600 bg-amber-700/10 border-amber-700/30" },
  ] as const;
  
  const activeCoins = coinTypes.filter(c => currencies[c.key] > 0);
  if (activeCoins.length === 0) {
    activeCoins.push({ key: "gp", label: "GP", color: "text-gold bg-gold/10 border-gold/30" });
  }

  const weightPct = carryingCapacity > 0 ? Math.min(100, (weightCarried / carryingCapacity) * 100) : 0;
  const weightColor = weightPct > 90 ? "bg-hp-critical" : weightPct > 75 ? "bg-hp-wounded" : "bg-primary";
  const weightGlow = weightPct > 90 
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
            <Coins size={10} className="text-gold/90 transition-transform duration-300 group-hover/wealth:animate-jingle" />
            <span>Wealth:</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {activeCoins.map((c) => (
              <span
                key={c.key}
                className={`inline-flex items-center gap-0.5 rounded border px-1 py-0.5 text-[9px] font-mono font-bold ${c.color}`}
              >
                <span>{currencies[c.key]}</span>
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
        <span className="font-mono text-xs font-bold text-gold">
          {attunedCount} / 3
        </span>
      </div>

      {equipped.length > 0 && (
        <InventoryGroup label="Equipped" items={equipped} />
      )}
      {magicCarried.length > 0 && (
        <InventoryGroup label="Magic Items" items={magicCarried} />
      )}
      {other.length > 0 && (
        <InventoryGroup label="Carried" items={other} />
      )}
    </div>
  );
}

export function CharacterCard({ member }: { member: PartyMember }) {
  const {
    list: localConditions,
    add: addLocalCondition,
    remove: removeLocalCondition,
    tick: tickLocalCondition,
  } = useCharacterConditions(member.id);

  const { ac, speed, acNotes, speedNotes } = getModifiedStats(member, localConditions);

  const hpPct = member.hpMax > 0 ? Math.min(100, (member.hpCurrent / member.hpMax) * 100) : 0;
  const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
  const displaySkills = [...member.skills].sort((a, b) => {
    const profRank = (p: string) => {
      if (p === "expertise") return 3;
      if (p === "proficient") return 2;
      if (p === "half") return 1;
      return 0;
    };
    const diff = profRank(b.proficiency) - profRank(a.proficiency);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });
  const hpColor =
    hpPct > 60 ? "bg-hp-good" : hpPct > 25 ? "bg-hp-wounded" : "bg-hp-critical";
  const hpGlow =
    hpPct > 60
      ? "shadow-[0_0_8px_color-mix(in_oklab,var(--hp-good)_70%,transparent)]"
      : hpPct > 25
      ? "shadow-[0_0_8px_color-mix(in_oklab,var(--hp-wounded)_70%,transparent)]"
      : "shadow-[0_0_10px_color-mix(in_oklab,var(--hp-critical)_80%,transparent)] animate-pulse";

  const [animHpPct, setAnimHpPct] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimHpPct(hpPct), 50);
    return () => clearTimeout(t);
  }, [hpPct]);

  // HP change indicator
  const prevHpRef = useRef<number>(member.hpCurrent);
  const [delta, setDelta] = useState<{ value: number; key: number } | null>(null);
  useEffect(() => {
    const prev = prevHpRef.current;
    if (prev !== member.hpCurrent) {
      const diff = member.hpCurrent - prev;
      if (diff !== 0) setDelta({ value: diff, key: Date.now() });
      prevHpRef.current = member.hpCurrent;
    }
  }, [member.hpCurrent]);

  // Split classes string "Wizard 5 / Cleric 2" into chips
  const classChips = member.classes
    .split(/\s*\/\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <article className="card-arcane group relative overflow-hidden rounded-xl border border-border/40 p-4 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-2xl hover:shadow-primary/20">
      <div className="flex items-start gap-3">
        {member.avatarUrl ? (
          <Link
            to="/character/$id"
            params={{ id: String(member.id) }}
            className="block h-16 w-16 flex-shrink-0 rounded-md border border-border overflow-hidden transition-all duration-200 hover:border-accent hover:shadow-[0_0_10px_color-mix(in_oklab,var(--accent)_40%,transparent)]"
            title="View character details"
          >
            <img
              src={member.avatarUrl}
              alt={member.name}
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-110"
            />
          </Link>
        ) : (
          <Link
            to="/character/$id"
            params={{ id: String(member.id) }}
            className="h-16 w-16 flex-shrink-0 rounded-md border border-border bg-muted hover:border-accent"
            title="View character details"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <a
              href={member.readonlyUrl}
              target="_blank"
              rel="noreferrer"
              className="font-heading block truncate text-xl font-bold text-foreground drop-shadow-sm transition-colors group-hover:text-accent hover:underline"
            >
              {member.name}
            </a>
            {member.inspiration && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help shrink-0">
                    <Star 
                      size={12} 
                      className="text-gold fill-gold drop-shadow-[0_0_6px_color-mix(in_oklab,var(--gold)_80%,transparent)] animate-pulse" 
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent>Inspiration</TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {member.race}
            {member.background ? (
              <span className="text-muted-foreground/70"> • {member.background}</span>
            ) : null}
            {member.alignment ? (
              <span className="text-muted-foreground/70"> • {member.alignment}</span>
            ) : null}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {classChips.map((c) => (
              <span
                key={c}
                className="rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent"
              >
                {c}
              </span>
            ))}
            {member.subclasses.map((sc) => (
              <span
                key={sc}
                className="rounded border border-border bg-secondary/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {sc}
              </span>
            ))}
          </div>
          <ConditionsPanel
            characterId={member.id}
            remoteConditions={member.conditions}
            exhaustion={member.exhaustion}
            localConditions={localConditions}
            onAddLocal={addLocalCondition}
            onRemoveLocal={removeLocalCondition}
            onTickLocal={tickLocalCondition}
          />
          {member.error && !member.error.includes("403") && (
            <p className="mt-1 text-xs text-destructive">{member.error}</p>
          )}
        </div>
      </div>

      {member.error && member.error.includes("403") && (
        <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-border/50 bg-secondary/20 p-6 text-center">
          <Lock className="mb-2 h-8 w-8 text-muted-foreground/50" />
          <h3 className="font-heading text-lg font-bold text-foreground">Private Character</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            This character sheet is set to private. Go to D&amp;D Beyond and set its privacy to <strong>Public</strong> to view stats here.
          </p>
        </div>
      )}

      {!member.error && (
        <>
          <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent mt-4 mb-3.5" />
          <div className="relative">
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <span className="flex items-center gap-1 font-medium text-muted-foreground group/hp select-none">
                <Heart size={11} className="text-rose-500 drop-shadow-[0_0_3px_rgba(244,63,94,0.4)] transition-transform duration-300 group-hover/hp:animate-heartbeat" />
                <span>HP</span>
                {member.hitDice && member.hitDice !== "—" && (
                  <span className="ml-1 font-mono text-[9px] text-muted-foreground/75">
                    ({member.hitDice})
                  </span>
                )}
              </span>
              <span className="font-mono text-foreground relative">
                {member.hpCurrent} / {member.hpMax}
                {member.tempHp > 0 ? (
                  <span className="ml-1 text-accent">+{member.tempHp}</span>
                ) : null}
                {delta && (
                  <span
                    key={delta.key}
                    className={`absolute -top-3 right-0 text-xs font-bold ${
                      delta.value < 0
                        ? "text-hp-critical hp-delta-damage"
                        : "text-hp-good hp-delta-heal"
                    }`}
                  >
                    {delta.value > 0 ? `+${delta.value}` : delta.value}
                  </span>
                )}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full animate-fill-bar ${hpColor} ${hpGlow}`}
                style={{ width: `${animHpPct}%` }}
              />
            </div>
          </div>

          {member.hpCurrent <= 0 && (
            <div className="mt-3 rounded border border-destructive/60 bg-destructive/10 px-2 py-2">
              <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider">
                <span className="text-destructive">
                  {member.deathSaves.stabilized ? "Stabilized" : "Death Saves"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">Success</span>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={`s-${i}`}
                      className={`h-3 w-3 rotate-45 border ${
                        i < member.deathSaves.successes
                          ? "border-hp-good bg-hp-good shadow-[0_0_6px_color-mix(in_oklab,var(--hp-good)_70%,transparent)]"
                          : "border-border bg-transparent"
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">Fail</span>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={`f-${i}`}
                      className={`h-3 w-3 rotate-45 border ${
                        i < member.deathSaves.failures
                          ? "border-destructive bg-destructive shadow-[0_0_6px_color-mix(in_oklab,var(--destructive)_70%,transparent)]"
                          : "border-border bg-transparent"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent mt-4 mb-3.5" />
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <Stat
              label="AC"
              icon={Shield}
              iconClassName="text-primary/90 drop-shadow-[0_0_3px_color-mix(in_oklab,var(--primary)_45%,transparent)]"
              value={
                ac !== member.armorClass ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-gold font-bold drop-shadow-[0_0_6px_color-mix(in_oklab,var(--gold)_60%,transparent)] cursor-help animate-pulse">
                        {ac}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{acNotes.join(", ")}</TooltipContent>
                  </Tooltip>
                ) : (
                  ac
                )
              }
            />
            <Stat 
              label="Initiative" 
              icon={Zap} 
              iconClassName="text-primary/90 drop-shadow-[0_0_3px_color-mix(in_oklab,var(--primary)_45%,transparent)]"
              value={fmt(member.initiative)} 
            />
            <Stat
              label="Speed"
              icon={Flame}
              iconClassName="text-primary/90 drop-shadow-[0_0_3px_color-mix(in_oklab,var(--primary)_45%,transparent)]"
              value={
                speed !== member.speed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-accent font-bold cursor-help">
                        {speed}ft
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{speedNotes.join(", ")}</TooltipContent>
                  </Tooltip>
                ) : (
                  `${speed}ft`
                )
              }
            />
            <Stat 
              label="Proficiency" 
              value={fmt(member.proficiencyBonus)} 
            />
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent mt-4 mb-3.5" />
          <div className="grid grid-cols-6 gap-1.5">
            {member.abilities.map((a) => {
              const elite = a.score >= 16;
              const details = ABILITY_DETAILS[a.name];
              const Icon = details?.Icon;
              const hoverGlow = details?.hoverGlowClass || "hover:border-accent/40";
              return (
                <div
                  key={a.name}
                  className={`group rounded-lg border px-1 py-1.5 text-center transition-all duration-300 hover:scale-105 hover:shadow-md ${
                    elite
                      ? "border-gold/50 bg-[color-mix(in_oklab,var(--gold)_8%,var(--secondary))] shadow-[0_0_8px_color-mix(in_oklab,var(--gold)_30%,transparent)] text-gold"
                      : "border-border/30 bg-secondary/20 text-foreground"
                  } ${hoverGlow}`}
                >
                  <div
                    className={`text-[9.5px] font-bold tracking-wider uppercase flex items-center justify-center gap-1 select-none ${
                      elite ? "text-gold" : "text-muted-foreground"
                    }`}
                  >
                    {Icon && (
                      <Icon 
                        size={7.5} 
                        className={`shrink-0 transition-transform duration-300 group-hover:scale-120 ${
                          elite ? "text-gold" : details?.colorClass || "text-accent/80"
                        }`} 
                      />
                    )}
                    <span>{a.name}</span>
                  </div>
                  <div
                    className={`font-heading text-lg font-bold leading-tight drop-shadow-sm ${
                      elite ? "text-gold" : "text-foreground"
                    }`}
                  >
                    {a.score}
                  </div>
                  <div className="text-[10px] font-mono font-semibold text-muted-foreground/80 mt-0.5">
                    {a.modifier >= 0 ? `+${a.modifier}` : a.modifier}
                  </div>
                </div>
              );
            })}
          </div>


          {member.saves.length > 0 && (
            <Section title="Saving Throws">
              <div className="grid grid-cols-6 gap-1">
                {member.saves.map((s) => {
                  const details = ABILITY_DETAILS[s.ability];
                  const Icon = details?.Icon;
                  const isProf = s.proficiency !== "none";
                  const hoverGlow = details?.hoverGlowClass || "hover:border-accent/30";
                  return (
                    <div
                      key={s.ability}
                      className={`group rounded-lg border px-1 py-1 text-center transition-all duration-200 hover:scale-105 ${
                        isProf
                          ? "border-accent/50 bg-accent/10 shadow-[0_0_6px_color-mix(in_oklab,var(--accent)_25%,transparent)]"
                          : "border-border/30 bg-secondary/20"
                      } ${hoverGlow}`}
                    >
                      <div className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1 select-none">
                        {Icon && (
                          <Icon 
                            size={7} 
                            className={`shrink-0 transition-transform duration-300 group-hover:scale-120 ${
                              isProf ? "text-accent" : details?.colorClass || "text-muted-foreground/45"
                            }`} 
                          />
                        )}
                        <span>{s.ability}</span>
                        {s.proficiency === "expertise" && <span className="text-gold" title="Expertise">★</span>}
                        {s.proficiency === "proficient" && <span className="text-accent text-[8px]" title="Proficient">●</span>}
                      </div>
                      <div className="text-xs font-mono font-bold text-foreground mt-0.5">{fmt(s.modifier)}</div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}
          {(member.spellcasting?.length > 0 || member.spellSlots.length > 0 || member.pactSlots.length > 0) && (
            <Section title="Spellcasting">
              <div className="flex flex-col gap-3">
                {member.spellcasting && member.spellcasting.length > 0 && (
                  <div className="flex flex-col gap-3">
                    {member.spellcasting.map((sc) => {
                      const abilityMod = member.abilities.find((a) => a.name === sc.ability)?.modifier ?? 0;
                      return (
                        <div key={sc.className} className="relative overflow-hidden rounded-xl border border-accent/25 bg-gradient-to-br from-accent/5 to-secondary/30 p-3 shadow-md">
                          <div className="absolute -right-3 -top-3 h-10 w-10 rounded-full bg-accent/8 blur-xl pointer-events-none" />
                          <div className="mb-3 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-accent select-none">
                            <Sparkles size={11} className="text-accent/80 animate-pulse" />
                            <span>{sc.className} ({sc.ability})</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center divide-x divide-border/20">
                            <div>
                              <div className="font-heading text-xl font-extrabold text-foreground leading-tight drop-shadow-sm">
                                {fmt(abilityMod)}
                              </div>
                              <div className="mt-1 text-[8px] font-bold uppercase tracking-wider text-muted-foreground/80">
                                Modifier
                              </div>
                            </div>
                            <div className="pl-1">
                              <div className="font-heading text-xl font-extrabold text-foreground leading-tight drop-shadow-sm">
                                {fmt(sc.attackBonus)}
                              </div>
                              <div className="mt-1 text-[8px] font-bold uppercase tracking-wider text-muted-foreground/80">
                                Spell Attack
                              </div>
                            </div>
                            <div className="pl-1">
                              <div className="font-heading text-xl font-extrabold text-gold leading-tight drop-shadow-sm">
                                {sc.saveDc}
                              </div>
                              <div className="mt-1 text-[8px] font-bold uppercase tracking-wider text-muted-foreground/80">
                                Save DC
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {(member.spellSlots.length > 0 || member.pactSlots.length > 0) && (
                  <div className="flex flex-col gap-1.5 border-t border-border/30 pt-2">
                    {member.spellSlots.map((s) => {
                      const available = s.max - s.used;
                      return (
                        <div key={`s-${s.level}`} className="flex items-center gap-2">
                          <span className="min-w-[2.5rem] text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                            Level {s.level}
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex flex-wrap gap-1 cursor-help">
                                {Array.from({ length: s.max }).map((_, i) => {
                                  const filled = i < available;
                                  return (
                                    <span
                                      key={i}
                                      className={
                                        filled
                                          ? "h-3 w-3 rounded-full bg-primary shadow-[0_0_6px_color-mix(in_oklab,var(--primary)_70%,transparent)] ring-1 ring-primary/60"
                                          : "h-3 w-3 rounded-full border border-accent/70 bg-transparent shadow-[0_0_5px_color-mix(in_oklab,var(--accent)_50%,transparent)]"
                                      }
                                    />
                                  );
                                })}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>Level {s.level}: {available}/{s.max} remaining</TooltipContent>
                          </Tooltip>
                          <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                            {available}/{s.max}
                          </span>
                        </div>
                      );
                    })}
                    {member.pactSlots.map((s) => {
                      const available = s.max - s.used;
                      return (
                        <div key={`p-${s.level}`} className="flex items-center gap-2">
                          <span className="min-w-[2.5rem] text-[10px] font-mono font-semibold uppercase tracking-wider text-accent">
                            Pact {s.level}
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex flex-wrap gap-1 cursor-help">
                                {Array.from({ length: s.max }).map((_, i) => {
                                  const filled = i < available;
                                  return (
                                    <span
                                      key={i}
                                      className={
                                        filled
                                          ? "h-3 w-3 rotate-45 bg-primary shadow-[0_0_6px_color-mix(in_oklab,var(--primary)_70%,transparent)] ring-1 ring-accent/70"
                                          : "h-3 w-3 rotate-45 border border-accent/70 bg-transparent shadow-[0_0_5px_color-mix(in_oklab,var(--accent)_50%,transparent)]"
                                      }
                                    />
                                  );
                                })}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>Pact (L{s.level}): {available}/{s.max} remaining</TooltipContent>
                          </Tooltip>
                          <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                            {available}/{s.max}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Combat Actions & Spells Section */}
          {(member.attacks.length > 0 || member.cantrips.length > 0 || member.preparedSpells.length > 0) && (
            <Section
              title={
                <span className="flex items-center gap-1.5 font-semibold text-accent/90">
                  <Swords size={12} className="text-accent" />
                  <span>Combat & Spells</span>
                </span>
              }
              defaultOpen={true}
            >
              <div className="flex flex-col gap-3">
                {/* Attacks List */}
                {member.attacks.length > 0 && (
                  <div>
                    <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      Attacks & Actions
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {member.attacks.map((atk, idx) => (
                        <div
                          key={`${atk.name}-${idx}`}
                          className="flex items-center justify-between rounded border border-border bg-secondary/40 px-2 py-1 text-xs transition-colors hover:border-accent/40 hover:bg-secondary/60"
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">{atk.name}</span>
                            {atk.properties && atk.properties.length > 0 && (
                              <span className="text-[9px] text-muted-foreground mt-0.5">
                                {atk.properties.join(", ")}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-accent font-semibold">
                              {atk.attackBonus >= 0 ? `+${atk.attackBonus}` : atk.attackBonus}
                            </span>
                            <span className="text-muted-foreground text-[10px]">to hit</span>
                            <span className="text-foreground font-semibold">
                              {atk.damage}
                            </span>
                            <span className="text-muted-foreground text-[10px]">
                              {atk.damageType}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Spells List */}
                {(member.cantrips.length > 0 || member.preparedSpells.length > 0) && (
                  <div className="border-t border-border/30 pt-2 flex flex-col gap-2">
                    {member.cantrips.length > 0 && (
                      <div>
                        <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                          Cantrips
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {member.cantrips.map((c) => (
                            <span
                              key={c}
                              className="rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {member.preparedSpells.length > 0 && (
                      <div>
                        <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                          Prepared Spells
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {member.preparedSpells.map((s) => (
                            <span
                              key={s.name}
                              className="rounded border border-border bg-secondary/50 px-1.5 py-0.5 text-[10px] text-foreground"
                            >
                              <span className="text-accent mr-1 font-mono text-[9px]">L{s.level}</span>
                              {s.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Section>
          )}

          {(member.senses.length > 0 || member.passivePerception != null) && (
            <Section title="Senses">
              <div className="flex flex-col gap-1.5">
                {[
                  { label: "Passive Perception", value: member.passivePerception, icon: Eye },
                  { label: "Passive Investigation", value: member.passiveInvestigation, icon: Search },
                  { label: "Passive Insight", value: member.passiveInsight, icon: Brain },
                ].filter((p) => p.value != null).map((p) => {
                  const Icon = p.icon;
                  return (
                    <div
                      key={p.label}
                      className="flex items-center justify-between rounded-lg border border-border/30 bg-secondary/20 px-2.5 py-1.5 transition-colors hover:border-accent/40"
                    >
                      <div className="flex items-center gap-2 select-none">
                        <Icon size={9.5} className="shrink-0 text-accent/80" />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                          {p.label}
                        </span>
                      </div>
                      <span className="flex h-6 w-6 items-center justify-center rounded border border-accent/40 bg-accent/10 text-xs font-mono font-bold text-foreground shadow-[0_0_6px_color-mix(in_oklab,var(--accent)_20%,transparent)]">
                        {p.value}
                      </span>
                    </div>
                  );
                })}
                {member.senses.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                    {member.senses.map((s) => {
                      const isDarkvision = s.name.toLowerCase().includes("darkvision");
                      const SenseIcon = isDarkvision ? Moon : Eye;
                      return (
                        <span 
                          key={s.name} 
                          className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 text-[9px] font-bold text-primary uppercase tracking-wider select-none"
                        >
                          <SenseIcon size={10} className="text-primary/90" />
                          <span>{s.name}{s.value != null ? ` ${s.value}ft` : ""}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </Section>
          )}

          {displaySkills.length > 0 && (
            <Section title="Skills">
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                {displaySkills.map((s) => {
                  const abilityAbl = SKILL_ABILITY[s.name] || "STR";
                  const details = ABILITY_DETAILS[abilityAbl];
                  const Icon = details?.Icon;
                  const isProf = s.proficiency !== "none";
                  const isExpert = s.proficiency === "expertise";
                  const isHalf = s.proficiency === "half";

                  const iconColor = isExpert
                    ? "text-gold drop-shadow-[0_0_3px_color-mix(in_oklab,var(--gold)_55%,transparent)]"
                    : isProf
                    ? "text-accent/80"
                    : "text-muted-foreground/25";

                  const nameColor = isExpert 
                    ? "text-gold font-semibold" 
                    : isProf 
                    ? "text-foreground font-medium" 
                    : "text-muted-foreground";

                  return (
                    <div 
                      key={s.key} 
                      className={`group/skill flex items-center justify-between transition-colors py-0.5 hover:bg-secondary/15 rounded px-1 -mx-1 ${isProf ? "" : "opacity-60"}`}
                    >
                      <span className={`truncate flex items-center gap-1.5 min-w-0 ${nameColor}`}>
                        {Icon && (
                          <Icon 
                            size={8} 
                            className={`shrink-0 transition-transform duration-300 group-hover/skill:scale-120 group-hover/skill:rotate-6 ${iconColor}`} 
                          />
                        )}
                        <span className="truncate">{s.name}</span>
                        {isExpert && <span className="text-gold text-[7px] shrink-0" title="Expertise">★</span>}
                        {isHalf && <span className="text-accent/70 text-[7px] shrink-0" title="Half Proficient">◐</span>}
                      </span>
                      <span className={`font-mono text-xs shrink-0 pl-1 ${isExpert ? "text-gold font-bold" : isProf ? "text-accent font-semibold" : "text-muted-foreground/60"}`}>
                        {fmt(s.modifier)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {member.defenses.length > 0 && (
            <Section title="Defenses">
              <div className="flex flex-wrap gap-1">
                {member.defenses.map((d) => {
                  const styles =
                    d.type === "immunity"
                      ? "border-gold/60 bg-[color-mix(in_oklab,var(--gold)_12%,var(--secondary))] text-gold"
                      : d.type === "vulnerability"
                      ? "border-destructive/60 bg-destructive/15 text-destructive"
                      : "border-accent/50 bg-accent/10 text-accent";
                  const mark =
                    d.type === "immunity" ? "Immunity" : d.type === "vulnerability" ? "Vulnerability" : "Resistance";
                  return (
                    <Tooltip key={`${d.type}-${d.damageType}`}>
                      <TooltipTrigger asChild>
                        <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider cursor-help ${styles}`}>
                          <span className="opacity-70 mr-1">{mark}</span>
                          {d.damageType}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{d.type}: {d.damageType}</TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </Section>
          )}

          {(member.languages.length > 0 || member.tools.length > 0) && (
            <Section title="Proficiencies">
              <div className="flex flex-col gap-2">
                {member.languages.length > 0 && (
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground mr-2">Languages</span>
                    <span className="text-xs text-foreground">{member.languages.join(", ")}</span>
                  </div>
                )}
                {member.tools.length > 0 && (
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground mr-2">Tools</span>
                    <span className="text-xs text-foreground">{member.tools.join(", ")}</span>
                  </div>
                )}
              </div>
            </Section>
          )}

          {member.actions?.filter((a) => a.source === "class" && a.uses).length ? (
            <Section title="Resources">
              <div className="flex flex-col gap-2">
                {member.actions
                  .filter((a) => a.source === "class" && a.uses)
                  .map((a) => {
                    const u = a.uses!;
                    const out = u.current <= 0;
                    const ratio = u.max > 0 ? u.current / u.max : 0;
                    const isSmallMax = u.max <= 6;
                    
                    return (
                      <div
                        key={`${a.source}-${a.name}`}
                        className="flex flex-col gap-1.5 rounded-lg border border-border/30 bg-secondary/20 p-2.5 transition-all duration-200 hover:border-accent/40"
                        title={`Resets on ${u.reset}`}
                      >
                        <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                          <span>{a.name}</span>
                          <span className={`font-mono text-[10px] ${out ? "text-destructive" : "text-accent"}`}>
                            {u.current} / {u.max}
                          </span>
                        </div>
                        
                        {isSmallMax ? (
                          <div className="flex gap-1 mt-0.5">
                            {Array.from({ length: u.max }).map((_, i) => {
                              const active = i < u.current;
                              return (
                                <span
                                  key={i}
                                  className={`h-2 w-2 rounded-full transition-all duration-300 ${
                                    active 
                                      ? "bg-accent shadow-[0_0_5px_color-mix(in_oklab,var(--accent)_60%,transparent)]" 
                                      : "border border-accent/40 bg-transparent"
                                  }`}
                                />
                              );
                            })}
                          </div>
                        ) : (
                          <div className="h-1 w-full overflow-hidden rounded-full bg-secondary mt-0.5">
                            <div 
                              className="h-full bg-accent shadow-[0_0_5px_color-mix(in_oklab,var(--accent)_60%,transparent)] transition-all duration-500"
                              style={{ width: `${ratio * 100}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </Section>
          ) : null}

          {member.inventory.length > 0 && (
            <Section title="Inventory" defaultOpen={false}>
              <InventoryList
                items={member.inventory}
                currencies={member.currencies}
                weightCarried={member.weightCarried}
                carryingCapacity={member.carryingCapacity}
              />
            </Section>
          )}

          {member.feats && member.feats.length > 0 && (
            <Section title="Feats" defaultOpen={false}>
              <div className="flex flex-wrap gap-1.5">
                {member.feats.map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/30 bg-secondary/20 px-2.5 py-0.5 text-[9px] font-bold text-foreground/90 uppercase tracking-wider transition-all duration-200 hover:border-accent/40 hover:scale-105 hover:bg-secondary/35 select-none"
                  >
                    <Award size={9} className="text-accent/80 shrink-0" />
                    <span>{f}</span>
                  </span>
                ))}
              </div>
            </Section>
          )}

        </>
      )}
    </article>
  );
}