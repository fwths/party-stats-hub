import React, { useState, useEffect } from "react";
import { Plus, HeartCrack, AlertCircle, X } from "lucide-react";
import { CONDITION_BY_NAME } from "@/lib/constants";

export type LocalCondition = { name: string; rounds: number | null };

const CONDITIONS_KEY = "mob.conditions.v1";

function conditionIcon(name: string) {
  return CONDITION_BY_NAME.get(name.toLowerCase())?.Icon ?? AlertCircle;
}

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

export function useCharacterConditions(characterId: number) {
  const [all, setAll] = useState<Record<string, LocalCondition[]>>(() => readAllConditions());
  const key = String(characterId);
  const list = all[key] ?? [];

  const persist = (next: Record<string, LocalCondition[]>) => {
    setAll(next);
    try {
      localStorage.setItem(CONDITIONS_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn("Failed to save conditions to localStorage:", e);
    }
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
        .map((c) => (c.name === name && c.rounds != null ? { ...c, rounds: c.rounds + delta } : c))
        .filter((c) => c.rounds == null || c.rounds > 0),
    });
  };
  const clear = () => {
    persist({ ...all, [key]: [] });
  };

  return { list, add, remove, tick, clear };
}

export function ConditionChip({
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
      title={
        rounds != null ? `${name} — ${rounds} round${rounds === 1 ? "" : "s"} remaining` : name
      }
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
        <button onClick={onRemove} className="ml-0.5 rounded hover:text-foreground" title="Remove">
          <X size={10} />
        </button>
      )}
    </span>
  );
}

export function ConditionsPanel({
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
  const [rounds, setRounds] = useState<number | null>(10);
  const [effectTab, setEffectTab] = useState<"spells" | "conditions" | "cover">("spells");

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
          <ConditionChip name={`Exhaustion ${exhaustion}`} Icon={HeartCrack} intense />
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
            <div className="absolute left-0 top-6 z-50 w-64 rounded-lg border border-border/80 bg-popover/95 p-3 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-1 duration-150">
              {/* Category tabs */}
              <div className="flex gap-1 border-b border-border/30 pb-1.5 mb-2">
                {(["spells", "conditions", "cover"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setEffectTab(tab)}
                    className={`flex-1 text-[9px] font-bold uppercase py-0.5 rounded transition-all cursor-pointer ${
                      effectTab === tab
                        ? "bg-accent/15 text-accent border border-accent/30 font-extrabold"
                        : "text-muted-foreground hover:bg-secondary/40"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Categorized presets list */}
              <div className="max-h-28 overflow-y-auto mb-2.5 flex flex-wrap gap-1 pr-1 scrollbar-thin">
                {effectTab === "spells" &&
                  [
                    { name: "Bless", d: 10 },
                    { name: "Shield", d: 1 },
                    { name: "Haste", d: 10 },
                    { name: "Bane", d: 10 },
                    { name: "Slow", d: 10 },
                    { name: "Bladesong", d: 10 },
                    { name: "Longstrider", d: null },
                    { name: "Warding Bond", d: null },
                  ].map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => handleAdd(p.name, p.d)}
                      className="rounded border border-border/30 bg-secondary/35 hover:border-accent/40 hover:bg-secondary/60 text-[9px] text-foreground font-medium px-1.5 py-0.5 cursor-pointer transition-colors"
                    >
                      {p.name}
                    </button>
                  ))}

                {effectTab === "conditions" &&
                  [
                    "Blinded",
                    "Charmed",
                    "Deafened",
                    "Frightened",
                    "Grappled",
                    "Invisible",
                    "Paralyzed",
                    "Poisoned",
                    "Prone",
                    "Restrained",
                    "Stunned",
                    "Unconscious",
                  ].map((cond) => (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => handleAdd(cond, null)}
                      className="rounded border border-border/30 bg-secondary/35 hover:border-accent/40 hover:bg-secondary/60 text-[9px] text-foreground font-medium px-1.5 py-0.5 cursor-pointer transition-colors"
                    >
                      {cond}
                    </button>
                  ))}

                {effectTab === "cover" &&
                  ["Half Cover", "3/4 Cover"].map((cov) => (
                    <button
                      key={cov}
                      type="button"
                      onClick={() => handleAdd(cov, null)}
                      className="rounded border border-border/30 bg-secondary/35 hover:border-accent/40 hover:bg-secondary/60 text-[9px] text-foreground font-medium px-1.5 py-0.5 cursor-pointer transition-colors"
                    >
                      {cov}
                    </button>
                  ))}
              </div>

              {/* Custom Input controls */}
              <div className="border-t border-border/40 pt-2 flex flex-col gap-1.5">
                <input
                  type="text"
                  placeholder="Custom effect name..."
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full rounded border border-border bg-secondary/40 px-2 py-1 text-[10px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-accent"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdd(customName, rounds);
                  }}
                />

                {/* Duration select grid */}
                <div className="flex items-center justify-between text-[9px] text-muted-foreground uppercase select-none mt-0.5">
                  <span>Duration (Rounds)</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRounds(null)}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold border transition-colors cursor-pointer ${
                        rounds === null
                          ? "border-accent/40 bg-accent/10 text-accent"
                          : "border-border/30 bg-secondary/25 hover:border-accent/30"
                      }`}
                    >
                      No Limit
                    </button>
                    <input
                      type="number"
                      placeholder="∞"
                      value={rounds ?? ""}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setRounds(isNaN(val) ? null : val);
                      }}
                      className="w-10 rounded border border-border/50 bg-secondary/40 py-0.5 font-mono text-[9px] text-center text-foreground focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleAdd(customName, rounds)}
                  className="mt-1 w-full rounded bg-primary py-1 text-[9px] font-bold text-primary-foreground hover:bg-primary/90 cursor-pointer focus:outline-none transition-colors"
                >
                  Add Effect
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
