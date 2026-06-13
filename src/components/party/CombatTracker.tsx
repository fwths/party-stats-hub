/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { PartyMember } from "@/lib/dndbeyond.functions";
import { MonsterStatBlock } from "./MonsterStatBlock";
import { getShortName } from "@/lib/utils";
import { getLocalHp } from "@/lib/party-modifiers";
import {
  Swords,
  Play,
  Square,
  ChevronRight,
  Plus,
  Minus,
  Skull,
  Sparkles,
  Eye,
  EyeOff,
  PlusCircle,
  XCircle,
  Shield,
  Heart,
  HelpCircle,
} from "lucide-react";
import { useRouter } from "@tanstack/react-router";

interface CombatTrackerProps {
  members: PartyMember[];
  activeCombatId?: string;
  onRoll?: (rollName: string, formula: string, resultText: string) => void;
  onEndCombatCallback?: () => void;
}

interface Combatant {
  id: string; // unique ID: e.g. "goblin-1" or character id (number as string)
  name: string;
  type: "player" | "monster";
  monsterIndex?: string; // e.g. "goblin" to load stats
  initiative: number | "";
  hpCurrent: number;
  hpMax: number;
  tempHp: number;
  conditions: string[];
}

interface CombatState {
  active: boolean;
  round: number;
  turnIndex: number;
  combatants: Combatant[];
}

const DND_CONDITIONS = [
  "Blinded",
  "Charmed",
  "Deafened",
  "Frightened",
  "Grappled",
  "Incapacitated",
  "Invisible",
  "Paralyzed",
  "Petrified",
  "Poisoned",
  "Prone",
  "Restrained",
  "Stunned",
  "Unconscious",
];

export function CombatTracker({ members, onRoll, onEndCombatCallback }: CombatTrackerProps) {
  const router = useRouter();
  const activeMembers = members.filter((m) => !m.error);

  const [combatState, setCombatState] = useState<CombatState>({
    active: false,
    round: 1,
    turnIndex: 0,
    combatants: [],
  });

  // Track expanded monster stat block indices
  const [expandedMonsterIndex, setExpandedMonsterIndex] = useState<string | null>(null);
  const [expandedMonsterData, setExpandedMonsterData] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Condition dropdown state
  const [openConditionMenuId, setOpenConditionMenuId] = useState<string | null>(null);

  // Custom damage/heal input state
  const [hpChangeValue, setHpChangeValue] = useState<Record<string, string>>({});

  // Sync state with local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("party-stats:combat-state");
      if (stored) {
        const parsed = JSON.parse(stored) as CombatState;

        // Dynamic Player HP updates.
        // We sync the players' current HP from global local HP overrides
        if (parsed.active && parsed.combatants) {
          const updated = parsed.combatants.map((c) => {
            if (c.type === "player") {
              const charId = parseInt(c.id, 10);
              const member = activeMembers.find((m) => m.id === charId);
              if (member) {
                // Read local HP override from localStorage (via utility helper)
                const hpInfo = getLocalHp(
                  member.id,
                  member.hpCurrent,
                  member.tempHp,
                  member.deathSaves,
                );
                return {
                  ...c,
                  hpCurrent: hpInfo.hpCurrent,
                  tempHp: hpInfo.tempHp,
                  hpMax: member.hpMax,
                };
              }
            }
            return c;
          });
          setCombatState({ ...parsed, combatants: updated });
        } else {
          setCombatState(parsed);
        }
      }
    } catch (e) {
      console.warn("Failed to load combat state:", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members]);

  const saveCombatState = (state: CombatState) => {
    setCombatState(state);
    localStorage.setItem("party-stats:combat-state", JSON.stringify(state));
  };

  // End combat
  const handleEndCombat = () => {
    if (
      !window.confirm(
        "Are you sure you want to end this combat? All initiatives and monster tracking will be lost.",
      )
    ) {
      return;
    }
    const emptyState: CombatState = {
      active: false,
      round: 1,
      turnIndex: 0,
      combatants: [],
    };
    saveCombatState(emptyState);
    if (onEndCombatCallback) {
      onEndCombatCallback();
    }
    router.invalidate();
  };

  // Roll initiative for all monsters
  const handleRollMonstersInitiative = () => {
    const updated = combatState.combatants.map((c) => {
      if (c.type === "monster" && c.initiative === "") {
        // Look up dexterity modifier
        let dexMod = 0;
        const cached = localStorage.getItem(`party-stats:monster:${c.monsterIndex}`);
        if (cached) {
          try {
            const details = JSON.parse(cached);
            dexMod = Math.floor(((details.dexterity ?? 10) - 10) / 2);
          } catch {
            void 0;
          }
        }

        const d20 = Math.floor(Math.random() * 20) + 1;
        const init = d20 + dexMod;

        if (onRoll) {
          onRoll(
            `${c.name} Initiative`,
            `1d20${dexMod >= 0 ? "+" : ""}${dexMod}`,
            `Rolled: [${d20}] ${dexMod >= 0 ? "+" : ""}${dexMod} = **${init}**`,
          );
        }

        return { ...c, initiative: init };
      }
      return c;
    });

    saveCombatState({ ...combatState, combatants: updated });
  };

  // Sort combatants by initiative
  const handleSortInitiative = () => {
    const sorted = [...combatState.combatants].sort((a, b) => {
      const initA = typeof a.initiative === "number" ? a.initiative : -99;
      const initB = typeof b.initiative === "number" ? b.initiative : -99;
      return initB - initA;
    });
    saveCombatState({ ...combatState, combatants: sorted, turnIndex: 0 });
  };

  // Next Turn
  const handleNextTurn = () => {
    if (combatState.combatants.length === 0) return;

    let nextIndex = combatState.turnIndex + 1;
    let nextRound = combatState.round;

    if (nextIndex >= combatState.combatants.length) {
      nextIndex = 0;
      nextRound += 1;
    }

    saveCombatState({
      ...combatState,
      turnIndex: nextIndex,
      round: nextRound,
    });
  };

  // Update a single combatant's HP
  const handleUpdateHp = (combatantId: string, amount: number) => {
    const target = combatState.combatants.find((c) => c.id === combatantId);
    if (!target) return;

    let newHp = target.hpCurrent;
    let newTemp = target.tempHp;

    if (amount < 0) {
      // Damage calculation (applies to temp HP first)
      const dmg = Math.abs(amount);
      if (newTemp >= dmg) {
        newTemp -= dmg;
      } else {
        const remainingDmg = dmg - newTemp;
        newTemp = 0;
        newHp = Math.max(0, newHp - remainingDmg);
      }
    } else {
      // Healing
      newHp = Math.min(target.hpMax, newHp + amount);
    }

    // Sync back
    if (target.type === "player") {
      const charId = parseInt(target.id, 10);
      const member = activeMembers.find((m) => m.id === charId);
      if (member) {
        // Save player HP overrides globally in localStorage
        const storageKey = `party-stats:hp:${member.id}`;
        const stored = localStorage.getItem(storageKey);
        let hpData = {
          hpCurrent: member.hpCurrent,
          tempHp: member.tempHp,
          spentHitDice: {},
          deathSaves: { successes: 0, failures: 0, stabilized: false },
        };
        if (stored) {
          try {
            hpData = JSON.parse(stored);
          } catch {
            void 0;
          }
        }
        hpData.hpCurrent = newHp;
        hpData.tempHp = newTemp;
        localStorage.setItem(storageKey, JSON.stringify(hpData));
        router.invalidate();
      }
    }

    const updated = combatState.combatants.map((c) => {
      if (c.id === combatantId) {
        return { ...c, hpCurrent: newHp, tempHp: newTemp };
      }
      return c;
    });

    saveCombatState({ ...combatState, combatants: updated });
  };

  // Handle custom input Damage/Heal
  const applyCustomHpChange = (combatantId: string, type: "damage" | "heal") => {
    const valStr = hpChangeValue[combatantId] || "";
    const amount = parseInt(valStr, 10);
    if (isNaN(amount) || amount <= 0) return;

    const change = type === "damage" ? -amount : amount;
    handleUpdateHp(combatantId, change);

    // Clear input
    setHpChangeValue({
      ...hpChangeValue,
      [combatantId]: "",
    });
  };

  // Modify manual initiative inputs
  const handleInitiativeChange = (combatantId: string, value: string) => {
    const parsed = parseInt(value, 10);
    const initVal: number | "" = value === "" ? "" : isNaN(parsed) ? "" : parsed;

    const updated = combatState.combatants.map((c) => {
      if (c.id === combatantId) {
        return { ...c, initiative: initVal };
      }
      return c;
    });

    saveCombatState({ ...combatState, combatants: updated });
  };

  // Add condition to a combatant
  const handleAddCondition = (combatantId: string, conditionName: string) => {
    const updated = combatState.combatants.map((c) => {
      if (c.id === combatantId) {
        const conds = c.conditions || [];
        if (!conds.includes(conditionName)) {
          return { ...c, conditions: [...conds, conditionName] };
        }
      }
      return c;
    });

    saveCombatState({ ...combatState, combatants: updated });
    setOpenConditionMenuId(null);
  };

  // Remove condition from a combatant
  const handleRemoveCondition = (combatantId: string, conditionName: string) => {
    const updated = combatState.combatants.map((c) => {
      if (c.id === combatantId) {
        return {
          ...c,
          conditions: (c.conditions || []).filter((cond) => cond !== conditionName),
        };
      }
      return c;
    });

    saveCombatState({ ...combatState, combatants: updated });
  };

  // Toggle monster stat block inline
  const handleToggleStatBlock = async (monsterIndex: string) => {
    if (expandedMonsterIndex === monsterIndex) {
      setExpandedMonsterIndex(null);
      setExpandedMonsterData(null);
      return;
    }

    setExpandedMonsterIndex(monsterIndex);
    setExpandedMonsterData(null);
    setLoadingDetails(true);

    try {
      const cacheKey = `party-stats:monster:${monsterIndex}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setExpandedMonsterData(JSON.parse(cached));
      } else {
        // Fetch details from API
        const res = await fetch(`https://www.dnd5eapi.co/api/monsters/${monsterIndex}`);
        if (res.ok) {
          const details = await res.json();
          setExpandedMonsterData(details);
          localStorage.setItem(cacheKey, JSON.stringify(details));
        }
      }
    } catch (e) {
      console.warn("Failed to fetch monster details:", e);
    } finally {
      setLoadingDetails(false);
    }
  };

  if (!combatState.active) {
    return (
      <div className="card-arcane rounded-xl border border-border p-8 shadow-xl text-center select-none">
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <div className="p-3 bg-secondary/50 rounded-full border border-border/80 text-muted-foreground/60">
            <Swords size={32} />
          </div>
          <div>
            <h3 className="font-heading text-base font-bold text-foreground">
              Combat Tracker Inactive
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Ready an encounter inside the <b>Encounter Builder</b> tab and click{" "}
              <b>Start Combat</b> to initialize the initiative tracker.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const activeTurnCombatant = combatState.combatants[combatState.turnIndex];

  return (
    <div className="space-y-4 select-none">
      {/* Control panel header */}
      <div className="card-arcane rounded-xl border border-border p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Round:
            </span>
            <span className="text-xl font-extrabold font-mono text-accent">
              {combatState.round}
            </span>
          </div>
          <div className="h-6 w-px bg-border/40" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Active Turn:
            </span>
            {activeTurnCombatant ? (
              <span
                className={`text-sm font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${
                  activeTurnCombatant.type === "player"
                    ? "bg-accent/10 border-accent/30 text-accent"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                }`}
              >
                {activeTurnCombatant.name}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">No combatants sorted</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleRollMonstersInitiative}
            className="rounded border border-amber-500/30 hover:border-amber-500/60 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-semibold px-2.5 py-1 text-xs cursor-pointer select-none active:scale-95 transition-all"
          >
            Roll Monsters Init
          </button>
          <button
            onClick={handleSortInitiative}
            className="rounded border border-border bg-secondary hover:bg-secondary/80 text-foreground font-semibold px-2.5 py-1 text-xs cursor-pointer select-none active:scale-95 transition-all"
          >
            Sort Initiative
          </button>
          <button
            onClick={handleNextTurn}
            className="inline-flex items-center gap-1 rounded bg-accent hover:bg-accent/90 border border-accent/20 text-xs font-bold uppercase tracking-wider text-accent-foreground px-3.5 py-1 cursor-pointer select-none active:scale-95 transition-all shadow-md shadow-accent/10"
          >
            <span>Next Turn</span>
            <ChevronRight size={13} />
          </button>
          <button
            onClick={handleEndCombat}
            className="inline-flex items-center gap-1 rounded border border-destructive/30 hover:border-destructive hover:bg-destructive/10 text-xs font-semibold text-destructive px-2.5 py-1 cursor-pointer select-none active:scale-95 transition-all"
          >
            <Square size={10} />
            <span>End Combat</span>
          </button>
        </div>
      </div>

      {/* Combatant cards list */}
      <div className="space-y-2.5">
        {combatState.combatants.map((c, idx) => {
          const isActiveTurn = combatState.turnIndex === idx;
          const isMonster = c.type === "monster";
          const isDead = c.hpCurrent === 0;

          // Find avatar if player
          let playerAvatar = null;
          if (c.type === "player") {
            const charId = parseInt(c.id, 10);
            const member = activeMembers.find((m) => m.id === charId);
            playerAvatar = member?.avatarUrl ?? null;
          }

          return (
            <div key={c.id} className="space-y-1.5">
              <div
                className={`card-arcane rounded-xl border p-3.5 shadow-md transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none ${
                  isActiveTurn
                    ? "border-accent bg-accent/5 ring-1 ring-accent/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]"
                    : isDead
                      ? "border-destructive/30 bg-destructive/5 opacity-60"
                      : "border-border/40 hover:border-border/80 bg-zinc-950/20"
                }`}
              >
                {/* Initiative, Avatar, Name */}
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  {/* Active Indicator */}
                  <div className="w-1.5 flex items-center justify-center">
                    {isActiveTurn && (
                      <div className="w-1.5 h-1.5 rounded-full bg-accent animate-ping absolute" />
                    )}
                    {isActiveTurn && <div className="w-1.5 h-1.5 rounded-full bg-accent" />}
                  </div>

                  {/* Initiative Input */}
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground/60 leading-none mb-1 font-mono">
                      Init
                    </span>
                    <input
                      type="text"
                      value={c.initiative}
                      onChange={(e) => handleInitiativeChange(c.id, e.target.value)}
                      placeholder="—"
                      className="w-10 text-center rounded border border-border/70 bg-secondary/50 py-0.5 text-xs font-bold text-foreground focus:border-accent focus:outline-none"
                    />
                  </div>

                  {/* Avatar / Icon */}
                  {c.type === "player" ? (
                    playerAvatar ? (
                      <img
                        src={playerAvatar}
                        alt={c.name}
                        className="w-8 h-8 rounded-full object-cover bg-secondary border border-border"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
                        <span className="font-bold text-xs uppercase">{c.name.slice(0, 2)}</span>
                      </div>
                    )
                  ) : (
                    <div
                      className={`w-8 h-8 rounded-full border flex items-center justify-center ${isDead ? "bg-destructive/20 border-destructive/40 text-destructive" : "bg-amber-500/10 border-amber-500/30 text-amber-400"}`}
                    >
                      <Skull size={14} />
                    </div>
                  )}

                  {/* Name and Type */}
                  <div className="truncate flex-1">
                    <h3
                      className={`text-sm font-bold truncate ${isActiveTurn ? "text-accent" : "text-foreground"}`}
                    >
                      {c.name}
                    </h3>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold mt-0.5">
                      {isMonster ? "Monster" : "Player"}
                    </p>
                  </div>
                </div>

                {/* HP Tracker */}
                <div className="flex items-center gap-3 self-start md:self-auto min-w-[280px]">
                  <div className="flex flex-col flex-1">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">
                        Health
                      </span>
                      <span className="text-xs font-bold font-mono">
                        {c.hpCurrent} / {c.hpMax}
                        {c.tempHp > 0 && (
                          <span className="text-accent text-[10px] font-semibold ml-1">
                            +{c.tempHp} THP
                          </span>
                        )}
                      </span>
                    </div>
                    {/* HP bar */}
                    <div className="w-full h-1.5 bg-secondary border border-border/30 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isDead
                            ? "bg-zinc-600"
                            : c.hpCurrent <= c.hpMax / 5
                              ? "bg-rose-600"
                              : c.hpCurrent <= c.hpMax / 2
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(100, (c.hpCurrent / c.hpMax) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Health Override Modifiers */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="text"
                      placeholder="Val"
                      value={hpChangeValue[c.id] || ""}
                      onChange={(e) =>
                        setHpChangeValue({ ...hpChangeValue, [c.id]: e.target.value })
                      }
                      className="w-8 text-center rounded border border-border/70 bg-secondary/50 py-0.5 text-xs text-foreground focus:border-accent focus:outline-none h-[26px]"
                    />
                    <button
                      onClick={() => applyCustomHpChange(c.id, "damage")}
                      className="rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 p-1 hover:bg-rose-500/20 active:scale-95 transition-all text-xs font-semibold px-2 cursor-pointer h-[26px]"
                      title="Damage"
                    >
                      Dmg
                    </button>
                    <button
                      onClick={() => applyCustomHpChange(c.id, "heal")}
                      className="rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-1 hover:bg-emerald-500/20 active:scale-95 transition-all text-xs font-semibold px-2 cursor-pointer h-[26px]"
                      title="Heal"
                    >
                      Heal
                    </button>
                  </div>
                </div>

                {/* Status Conditions & Stat Block Toggles */}
                <div className="flex items-center gap-3 self-start md:self-auto shrink-0 select-none">
                  {/* Conditions List */}
                  <div className="flex flex-wrap items-center gap-1.5 max-w-[150px]">
                    {c.conditions?.map((cond) => (
                      <button
                        key={cond}
                        onClick={() => handleRemoveCondition(c.id, cond)}
                        className="inline-flex items-center gap-0.5 rounded-full bg-accent/20 border border-accent/40 text-[9px] font-bold text-accent px-2 py-0.5 cursor-pointer hover:bg-destructive/10 hover:border-destructive hover:text-destructive transition-all group"
                        title="Click to remove condition"
                      >
                        <span>{cond}</span>
                        <XCircle size={8} className="opacity-60 group-hover:opacity-100" />
                      </button>
                    ))}

                    {/* Add Condition Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() =>
                          setOpenConditionMenuId(openConditionMenuId === c.id ? null : c.id)
                        }
                        className="rounded-full bg-secondary border border-border text-[9px] font-bold text-muted-foreground px-2 py-0.5 hover:border-accent hover:text-accent cursor-pointer flex items-center gap-0.5"
                      >
                        <PlusCircle size={8} />
                        <span>Condition</span>
                      </button>

                      {openConditionMenuId === c.id && (
                        <div className="absolute right-0 bottom-full mb-1 z-30 max-h-40 overflow-y-auto rounded border border-border bg-secondary shadow-lg min-w-[130px] p-1 font-semibold text-xs backdrop-blur-md">
                          {DND_CONDITIONS.map((cond) => (
                            <button
                              key={cond}
                              onClick={() => handleAddCondition(c.id, cond)}
                              className="w-full text-left rounded hover:bg-accent/15 hover:text-accent px-2 py-1 cursor-pointer select-none text-[11px]"
                            >
                              {cond}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Toggle Stat Block (Monsters only) */}
                  {isMonster && (
                    <button
                      onClick={() => handleToggleStatBlock(c.monsterIndex!)}
                      className="p-1.5 rounded border border-border hover:border-accent/40 hover:bg-secondary text-muted-foreground hover:text-accent cursor-pointer transition-all shrink-0"
                      title={
                        expandedMonsterIndex === c.monsterIndex
                          ? "Hide Stat Block"
                          : "Show Stat Block"
                      }
                    >
                      {expandedMonsterIndex === c.monsterIndex ? (
                        <EyeOff size={13} />
                      ) : (
                        <Eye size={13} />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Stat Block expansion (Monsters only) */}
              {isMonster && expandedMonsterIndex === c.monsterIndex && (
                <div className="pl-6 select-text border-l border-amber-600/30 animate-fade-in">
                  {loadingDetails ? (
                    <div className="text-xs text-muted-foreground py-6 text-center">
                      Loading stat block details...
                    </div>
                  ) : expandedMonsterData ? (
                    <MonsterStatBlock monster={expandedMonsterData} onRoll={onRoll} compact />
                  ) : (
                    <div className="text-xs text-destructive py-2 text-center">
                      Error loading stat block.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
