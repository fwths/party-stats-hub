import { useSuspenseQuery } from "@tanstack/react-query";
import { partyQueryOptions } from "@/lib/party";
import { PartyMember } from "@/lib/dndbeyond.functions";

export function PartyVitals({ ids }: { ids: number[] }) {
  const { data } = useSuspenseQuery(partyQueryOptions(ids));
  const members = data.members.filter((m) => !m.error);
  if (members.length === 0) return null;

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
  const hpGlow = hpPct > 60 
    ? "shadow-[0_0_8px_color-mix(in_oklab,var(--hp-good)_70%,transparent)]" 
    : hpPct > 25 
    ? "shadow-[0_0_8px_color-mix(in_oklab,var(--hp-wounded)_70%,transparent)]" 
    : "shadow-[0_0_10px_color-mix(in_oklab,var(--hp-critical)_80%,transparent)] animate-pulse";

  return (
    <div className="card-arcane mb-4 rounded-lg border border-border p-4 shadow-lg">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-accent">Party Vitals Dashboard</h3>
        <div className="flex gap-4 text-xs font-mono text-muted-foreground">
          <span title="Average AC">🛡️ Avg AC: <strong className="text-foreground">{avgAc}</strong></span>
          <span title="Average Passive Perception">👁️ Avg Perception: <strong className="text-foreground">{avgPerception}</strong></span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Total Party HP Bar */}
        <div>
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Party Health Pool</span>
            <span className="font-mono text-foreground font-bold">
              {totalHpCurrent} / {totalHpMax} HP <span className="text-muted-foreground font-normal">({hpPct.toFixed(0)}%)</span>
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full ${hpBarColor} ${hpGlow} transition-all duration-500`}
              style={{ width: `${hpPct}%` }}
            />
          </div>
        </div>

        {/* Dynamic Status Lists */}
        {(inspirationList.length > 0 || downedList.length > 0 || conditionMap.size > 0) && (
          <div className="grid grid-cols-1 gap-3 border-t border-border/30 pt-3 sm:grid-cols-3 text-xs">
            {/* Downed / unconscious list */}
            {downedList.length > 0 ? (
              <div className="rounded border border-destructive/30 bg-destructive/5 p-2">
                <div className="font-bold text-destructive uppercase tracking-wider text-[9px] mb-1">💀 Downed Members</div>
                <div className="text-foreground font-semibold">{downedList.join(", ")}</div>
              </div>
            ) : (
              <div className="rounded border border-border/40 bg-secondary/10 p-2 text-center flex flex-col justify-center">
                <div className="font-bold text-hp-good uppercase tracking-wider text-[9px] mb-0.5">💖 All Standing</div>
                <div className="text-muted-foreground text-[10px]">No downed characters</div>
              </div>
            )}

            {/* Inspiration list */}
            {inspirationList.length > 0 && (
              <div className="rounded border border-gold/30 bg-[color-mix(in_oklab,var(--gold)_8%,var(--secondary))] p-2">
                <div className="font-bold text-gold uppercase tracking-wider text-[9px] mb-1">⭐ Has Inspiration</div>
                <div className="text-foreground font-semibold">{inspirationList.join(", ")}</div>
              </div>
            )}

            {/* Active Conditions summary */}
            {conditionMap.size > 0 && (
              <div className="rounded border border-border bg-secondary/30 p-2">
                <div className="font-bold text-muted-foreground uppercase tracking-wider text-[9px] mb-1">⚠️ Active Conditions</div>
                <div className="flex flex-col gap-0.5 font-medium">
                  {Array.from(conditionMap.entries()).map(([cond, names]) => (
                    <div key={cond} className="text-foreground">
                      <span className="text-destructive font-semibold">{cond}</span>: {names.join(", ")}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
