import { PartyMember } from "@/lib/dndbeyond.types";
import { syncedLocalStorage as localStorage } from "@/lib/synced-storage";
import { Heart, ShieldAlert, Activity, Wand2, Hourglass, Tent } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getShortName } from "@/lib/utils";
import { getFullyModifiedStats } from "@/lib/party-modifiers";
import { useRouter } from "@tanstack/react-router";
import { parseHitDice } from "./character-detail/hooks";
import { useConfirm } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";

interface CombatDashboardProps {
  members: PartyMember[];
}

export function CombatDashboard({ members }: CombatDashboardProps) {
  const router = useRouter();
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const modifiedMembers = members.map(getFullyModifiedStats);
  const activeMembers = modifiedMembers.filter((m) => !m.error);

  if (activeMembers.length === 0) return null;

  const handleShortRest = async () => {
    const confirmed = await confirm({
      title: "Short Rest",
      message: "Are you sure you want to perform a Short Rest for the entire party?\n\nThis clears death saves, resets Warlock pact slots, and resets short-rest class resources.",
      variant: "warning",
      confirmText: "Short Rest",
    });
    if (!confirmed) return;

    activeMembers.forEach((member) => {
      // 1. Clear death saves
      const hpKey = `party-stats:hp:${member.id}`;
      const storedHp = localStorage.getItem(hpKey);
      let hpData = {
        hpCurrent: member.hpCurrent,
        tempHp: member.tempHp,
        spentHitDice: {} as Record<string, number>,
        deathSaves: { successes: 0, failures: 0, stabilized: false },
      };
      if (storedHp) {
        try {
          const parsed = JSON.parse(storedHp);
          hpData = {
            ...parsed,
            deathSaves: { successes: 0, failures: 0, stabilized: false },
          };
        } catch {}
      }
      localStorage.setItem(hpKey, JSON.stringify(hpData));

      // 2. Reset Pact Slots
      const slotsKey = `party-stats:slots:${member.id}`;
      const storedSlots = localStorage.getItem(slotsKey);
      let slotsData = {
        spellSlotsUsed: {} as Record<number, number>,
        pactSlotsUsed: {} as Record<number, number>,
      };
      if (storedSlots) {
        try {
          slotsData = JSON.parse(storedSlots);
        } catch {}
      }
      member.pactSlots?.forEach((s) => {
        slotsData.pactSlotsUsed[s.level] = 0;
      });
      localStorage.setItem(slotsKey, JSON.stringify(slotsData));

      // 3. Reset short-rest class resources
      const resKey = `party-stats:resources:${member.id}`;
      const storedRes = localStorage.getItem(resKey);
      let resData = { spent: {} as Record<string, number> };
      if (storedRes) {
        try {
          resData = JSON.parse(storedRes);
        } catch {}
      }
      member.actions?.forEach((a) => {
        if (a.uses && a.uses.reset) {
          const resetType = a.uses.reset.toLowerCase();
          if (resetType.includes("short") || resetType === "rest" || resetType.includes("combat")) {
            resData.spent[a.name] = 0;
          }
        }
      });
      localStorage.setItem(resKey, JSON.stringify(resData));

      // 4. Reset Rage
      localStorage.removeItem(`party-stats:rage:${member.id}`);
    });

    toast.success("Short Rest complete for all party members.", "Rest Completed");
    router.invalidate();
  };

  const handleLongRest = async () => {
    const confirmed = await confirm({
      title: "Long Rest",
      message: "Are you sure you want to perform a Long Rest for the entire party?\n\nThis restores all characters to max HP and full hit dice, resets all spell/pact slots and resources, clears death saves, and removes custom conditions.",
      variant: "warning",
      confirmText: "Long Rest",
    });
    if (!confirmed) return;

    activeMembers.forEach((member) => {
      // 1. Clear all local HP overrides, restoring characters to max HP, tempHp: 0, spentHitDice, and clear death saves
      const hpKey = `party-stats:hp:${member.id}`;
      const pools = parseHitDice(member.hitDice);
      const spentHitDice: Record<string, number> = {};
      pools.forEach((pool) => {
        spentHitDice[pool.die] = pool.remaining - pool.total;
      });

      const hpData = {
        hpCurrent: member.hpMax,
        tempHp: 0,
        spentHitDice,
        deathSaves: { successes: 0, failures: 0, stabilized: false },
      };
      localStorage.setItem(hpKey, JSON.stringify(hpData));

      // 2. Reset all spell/pact slots
      const slotsKey = `party-stats:slots:${member.id}`;
      const spellSlotsUsed: Record<number, number> = {};
      member.spellSlots?.forEach((s) => {
        spellSlotsUsed[s.level] = 0;
      });
      const pactSlotsUsed: Record<number, number> = {};
      member.pactSlots?.forEach((s) => {
        pactSlotsUsed[s.level] = 0;
      });
      localStorage.setItem(slotsKey, JSON.stringify({ spellSlotsUsed, pactSlotsUsed }));

      // 3. Reset resources
      localStorage.removeItem(`party-stats:resources:${member.id}`);

      // 4. Reset Rage
      localStorage.removeItem(`party-stats:rage:${member.id}`);
    });

    // 5. Remove custom conditions
    localStorage.removeItem("mob.conditions.v1");

    toast.success("Long Rest complete. All characters fully restored.", "Rest Completed");
    router.invalidate();
  };

  // 1. HP Alerts (0 HP or Bloodied < 50% HP)
  const deadMembers = activeMembers.filter((m) => m.hpCurrent === 0);
  const bloodiedMembers = activeMembers.filter(
    (m) => m.hpCurrent > 0 && m.hpCurrent <= m.hpMax / 2,
  );

  // 2. Aggregate Active Conditions (both remote and local)
  const conditionList: Array<{
    charName: string;
    charId: number;
    conditionName: string;
  }> = [];

  activeMembers.forEach((m) => {
    // remote conditions
    m.conditions?.forEach((cond) => {
      conditionList.push({
        charName: m.name,
        charId: m.id,
        conditionName: cond,
      });
    });
    // exhaustion
    if (m.exhaustion > 0) {
      conditionList.push({
        charName: m.name,
        charId: m.id,
        conditionName: `Exhaustion (Level ${m.exhaustion})`,
      });
    }
  });

  // 3. Spell slot monitoring
  const spellcasters = activeMembers.filter(
    (m) => m.spellSlots?.some((s) => s.max > 0) || m.pactSlots?.some((s) => s.max > 0),
  );

  return (
    <div className="card-arcane mb-6 rounded-xl border border-border p-5 shadow-xl transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3 mb-4 select-none">
        <div className="flex items-center gap-2.5">
          <Activity size={16} className="text-ui-rose animate-pulse" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-foreground bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Combat Status Overview
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShortRest}
            className="flex items-center gap-1.5 rounded-lg bg-ui-amber/10 hover:bg-ui-amber/20 border border-ui-amber/30 hover:border-ui-amber/50 px-2.5 py-1 text-xs font-semibold text-ui-amber transition-all duration-200 cursor-pointer shadow-[0_0_8px_rgba(245,158,11,0.05)] hover:shadow-[0_0_12px_rgba(245,158,11,0.15)]"
          >
            <Hourglass size={12} />
            <span>Short Rest</span>
          </button>
          <button
            onClick={handleLongRest}
            className="flex items-center gap-1.5 rounded-lg bg-ui-emerald/10 hover:bg-ui-emerald/20 border border-ui-emerald/30 hover:border-ui-emerald/50 px-2.5 py-1 text-xs font-semibold text-ui-emerald transition-all duration-200 cursor-pointer shadow-[0_0_8px_rgba(16,185,129,0.05)] hover:shadow-[0_0_12px_rgba(16,185,129,0.15)]"
          >
            <Tent size={12} />
            <span>Long Rest</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* HP alerts column */}
        <div className="rounded-lg bg-secondary/15 border border-border/30 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-ui-rose select-none">
              <Heart size={13} className="text-ui-rose" />
              <span>Health Warnings</span>
            </div>

            {deadMembers.length === 0 && bloodiedMembers.length === 0 ? (
              <p className="text-xs text-muted-foreground italic select-none">
                All party members are healthy.
              </p>
            ) : (
              <div className="space-y-2.5">
                {deadMembers.map((m) => (
                  <div
                    key={`dead-${m.id}`}
                    className="flex items-center justify-between rounded border border-destructive/50 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive animate-pulse"
                  >
                    <span className="font-bold">{getShortName(m.name)}</span>
                    <span className="text-[10px] uppercase font-extrabold tracking-wider bg-destructive/20 border border-destructive/30 px-1.5 py-0.5 rounded">
                      Unconscious (0 HP)
                    </span>
                  </div>
                ))}
                {bloodiedMembers.map((m) => (
                  <div
                    key={`bloodied-${m.id}`}
                    className="flex items-center justify-between rounded border border-ui-amber/35 bg-ui-amber/5 px-2.5 py-1.5 text-xs text-ui-amber"
                  >
                    <span className="font-semibold">{getShortName(m.name)}</span>
                    <span className="text-[9px] font-mono select-all">
                      Bloodied ({m.hpCurrent}/{m.hpMax} HP)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active status conditions column */}
        <div className="rounded-lg bg-secondary/15 border border-border/30 p-4">
          <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-ui-sky select-none">
            <ShieldAlert size={13} className="text-ui-sky" />
            <span>Active Conditions</span>
          </div>

          {conditionList.length === 0 ? (
            <p className="text-xs text-muted-foreground italic select-none">
              No active status conditions.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {conditionList.map((c, i) => (
                <Tooltip key={`${c.charId}-${c.conditionName}-${i}`}>
                  <TooltipTrigger asChild>
                    <span className="inline-flex cursor-help items-center gap-1.5 rounded-full border border-ui-sky/25 bg-ui-sky/10 px-2.5 py-1 text-xs text-ui-sky font-medium select-all shadow-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-ui-sky animate-ping" />
                      <span>{c.conditionName}</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Afflicted: <strong className="text-foreground">{c.charName}</strong>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          )}
        </div>

        {/* Spell slot tracking column */}
        <div className="rounded-lg bg-secondary/15 border border-border/30 p-4">
          <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-gold select-none">
            <Wand2 size={13} className="text-gold" />
            <span>Spell Slot Usage</span>
          </div>

          {spellcasters.length === 0 ? (
            <p className="text-xs text-muted-foreground italic select-none">
              No spellcasters in the party.
            </p>
          ) : (
            <div className="space-y-3 max-h-[140px] overflow-y-auto pr-1">
              {spellcasters.map((m) => {
                const totalSlotsMax = [...(m.spellSlots ?? []), ...(m.pactSlots ?? [])].reduce(
                  (sum, s) => sum + s.max,
                  0,
                );
                const totalSlotsUsed = [...(m.spellSlots ?? []), ...(m.pactSlots ?? [])].reduce(
                  (sum, s) => sum + s.used,
                  0,
                );
                const pctUsed = totalSlotsMax > 0 ? (totalSlotsUsed / totalSlotsMax) * 100 : 0;

                return (
                  <div key={`caster-${m.id}`} className="text-xs">
                    <div className="flex items-center justify-between font-medium text-foreground mb-1 select-none">
                      <span>{getShortName(m.name)}</span>
                      <span className="font-mono text-muted-foreground text-[10px]">
                        Slots used: {totalSlotsUsed} / {totalSlotsMax}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-gold via-yellow-400 to-amber-500 shadow-[0_0_8px_var(--gold)]"
                        style={{ width: `${Math.max(0, 100 - pctUsed)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
