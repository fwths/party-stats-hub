import { useState, useEffect } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { partyQueryOptions } from "@/lib/party";
import { CONDITION_BY_NAME } from "@/lib/constants";
import { Shield, Eye, Heart, Star, AlertCircle, Skull, ChevronDown } from "lucide-react";

export function PartyVitals({ ids }: { ids: number[] }) {
  const { data } = useSuspenseQuery(partyQueryOptions(ids));
  const members = data.members.filter((m) => !m.error);
  if (members.length === 0) return null;

  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("mob.vitals.open");
      return stored !== "false";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("mob.vitals.open", String(isOpen));
    } catch {}
  }, [isOpen]);

  let totalHpCurrent = 0;
  let totalHpMax = 0;
  let totalAc = 0;
  let totalPerception = 0;
  const inspirationList: string[] = [];
  const downedList: string[] = [];
  const conditionMap = new Map<string, string[]>(); // condition -> list of members

  for (const m of members) {
    totalHpCurrent += m.hpCurrent + m.tempHp;
    totalHpMax += m.hpMax;
    totalAc += m.armorClass;
    totalPerception += m.passivePerception;

    if (m.inspiration) inspirationList.push(m.name);
    if (m.hpCurrent <= 0) downedList.push(m.name);

    for (const c of m.conditions) {
      const name = c.charAt(0).toUpperCase() + c.slice(1).toLowerCase();
      if (!conditionMap.has(name)) conditionMap.set(name, []);
      conditionMap.get(name)!.push(m.name);
    }
  }

  const avgAc = (totalAc / members.length).toFixed(1);
  const avgPerception = (totalPerception / members.length).toFixed(1);
  const hpPct = totalHpMax > 0 ? Math.min(100, (totalHpCurrent / totalHpMax) * 100) : 0;

  const hpBarColor = hpPct > 60 ? "bg-hp-good" : hpPct > 25 ? "bg-hp-wounded" : "bg-hp-critical";
  const hpGlow =
    hpPct > 60
      ? "shadow-[0_0_8px_color-mix(in_oklab,var(--hp-good)_70%,transparent)]"
      : hpPct > 25
        ? "shadow-[0_0_8px_color-mix(in_oklab,var(--hp-wounded)_70%,transparent)]"
        : "shadow-[0_0_10px_color-mix(in_oklab,var(--hp-critical)_80%,transparent)] animate-pulse";

  return (
    <div className="card-arcane mb-6 rounded-xl border border-border p-4.5 shadow-xl transition-all duration-300 hover:border-accent/40">
      {/* Title & Average Stats Header */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 ${isOpen ? "border-b border-border/30 pb-3 mb-4" : ""}`}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity cursor-pointer select-none"
          title={isOpen ? "Collapse dashboard" : "Expand dashboard"}
        >
          <Heart
            size={16}
            className={`text-rose-500 fill-rose-500/10 ${hpPct <= 25 ? "animate-heartbeat" : ""}`}
          />
          <h3 className="font-heading text-sm font-extrabold uppercase tracking-wider text-accent flex items-center gap-1.5">
            <span>Party Vitals</span>
            <ChevronDown
              size={14}
              className={`transition-transform duration-300 ${isOpen ? "" : "-rotate-90"} text-accent/70`}
            />
          </h3>
        </button>

        <div className="flex flex-wrap gap-2 text-xs select-none">
          {/* Average AC Capsule */}
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 font-semibold text-primary transition-all duration-200 hover:bg-primary/10"
            title="Average Armor Class"
          >
            <Shield size={12} className="text-primary/95 shrink-0" />
            <span>
              Avg AC: <strong className="text-foreground font-mono">{avgAc}</strong>
            </span>
          </span>

          {/* Average Perception Capsule */}
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/5 px-2.5 py-1 font-semibold text-accent transition-all duration-200 hover:bg-accent/10"
            title="Average Passive Perception"
          >
            <Eye size={12} className="text-accent/95 shrink-0" />
            <span>
              Avg Perception: <strong className="text-foreground font-mono">{avgPerception}</strong>
            </span>
          </span>
        </div>
      </div>

      {isOpen && (
        <div className="space-y-5 animate-in fade-in slide-in-from-top-1 duration-300">
          {/* Total Party HP Bar */}
          <div>
            <div className="mb-1.5 flex items-baseline justify-between text-xs">
              <span className="font-bold text-muted-foreground uppercase tracking-wider text-[10px] select-none">
                Collective Party Health Pool
              </span>
              <span className="font-mono text-foreground font-bold text-[13px]">
                {totalHpCurrent} / {totalHpMax} HP{" "}
                <span className="text-muted-foreground/80 font-normal text-xs">
                  ({hpPct.toFixed(0)}%)
                </span>
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-secondary/60 border border-border/20 p-[1px]">
              <div
                className={`h-full rounded-full ${hpBarColor} ${hpGlow} transition-all duration-500`}
                style={{ width: `${hpPct}%` }}
              />
            </div>
          </div>

          {/* Dynamic Status Lists Grid */}
          <div className="grid grid-cols-1 gap-3.5 border-t border-border/20 pt-4.5 sm:grid-cols-3 text-xs">
            {/* Downed / unconscious list */}
            {downedList.length > 0 ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 shadow-sm hover:bg-destructive/8 transition-colors duration-200">
                <div className="flex items-center gap-1.5 font-bold text-destructive uppercase tracking-wider text-[10px] mb-1.5">
                  <Skull size={13} className="animate-pulse shrink-0" />
                  <span>💀 Downed Members</span>
                </div>
                <div className="text-foreground font-extrabold text-sm drop-shadow-sm">
                  {downedList.join(", ")}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-hp-good/25 bg-hp-good/5 p-3 text-center flex flex-col justify-center items-center hover:bg-hp-good/8 transition-colors duration-200 min-h-[72px]">
                <div className="flex items-center gap-1.5 font-bold text-hp-good uppercase tracking-wider text-[10px] mb-0.5">
                  <Heart size={12} className="text-hp-good fill-hp-good/10 shrink-0" />
                  <span>All Standing</span>
                </div>
                <div className="text-muted-foreground text-[10px]">No downed characters</div>
              </div>
            )}

            {/* Inspiration list */}
            {inspirationList.length > 0 ? (
              <div className="rounded-xl border border-gold/40 bg-[color-mix(in_oklab,var(--gold)_8%,var(--secondary))] p-3 shadow-sm hover:bg-[color-mix(in_oklab,var(--gold)_12%,var(--secondary))] transition-colors duration-200">
                <div className="flex items-center gap-1.5 font-bold text-gold uppercase tracking-wider text-[10px] mb-1.5">
                  <Star
                    size={12}
                    className="text-gold fill-gold drop-shadow-[0_0_4px_rgba(255,215,0,0.5)] animate-pulse shrink-0"
                  />
                  <span>⭐ Has Inspiration</span>
                </div>
                <div className="text-foreground font-extrabold text-sm drop-shadow-sm">
                  {inspirationList.join(", ")}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border/30 bg-secondary/15 p-3 text-center flex flex-col justify-center items-center hover:bg-secondary/25 transition-colors duration-200 min-h-[72px] select-none">
                <div className="font-bold text-muted-foreground/60 uppercase tracking-wider text-[10px] mb-0.5">
                  Inspiration
                </div>
                <div className="text-muted-foreground/50 text-[10px]">No inspiration active</div>
              </div>
            )}

            {/* Active Conditions summary */}
            {conditionMap.size > 0 ? (
              <div className="rounded-xl border border-accent/25 bg-accent/5 p-3 shadow-sm hover:bg-accent/8 transition-colors duration-200">
                <div className="flex items-center gap-1.5 font-bold text-accent uppercase tracking-wider text-[10px] mb-2 border-b border-accent/15 pb-1">
                  <AlertCircle size={12} className="shrink-0" />
                  <span>⚠️ Active Conditions</span>
                </div>
                <div className="flex flex-col gap-1.5 font-medium max-h-[120px] overflow-y-auto pr-1">
                  {Array.from(conditionMap.entries()).map(([cond, names]) => {
                    const Icon = CONDITION_BY_NAME.get(cond.toLowerCase())?.Icon ?? AlertCircle;
                    return (
                      <div
                        key={cond}
                        className="flex items-center justify-between text-[11px] gap-2"
                      >
                        <span className="inline-flex items-center gap-1 rounded bg-accent/15 border border-accent/20 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-accent shrink-0">
                          <Icon size={9} className="shrink-0" />
                          <span>{cond}</span>
                        </span>
                        <span
                          className="text-foreground font-bold text-right truncate"
                          title={names.join(", ")}
                        >
                          {names.join(", ")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border/30 bg-secondary/15 p-3 text-center flex flex-col justify-center items-center hover:bg-secondary/25 transition-colors duration-200 min-h-[72px] select-none">
                <div className="font-bold text-muted-foreground/60 uppercase tracking-wider text-[10px] mb-0.5">
                  Conditions
                </div>
                <div className="text-muted-foreground/50 text-[10px]">No active status effects</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
