import { useState, useEffect } from "react";
import { PartyMember } from "@/lib/dndbeyond.functions";
import { MonsterManual } from "./MonsterManual";
import { EncounterBuilder } from "./EncounterBuilder";
import { CombatTracker } from "./CombatTracker";
import { getLocalHp } from "@/lib/party-modifiers";
import {
  BookOpen,
  Swords,
  SwordsIcon,
  Dice5,
  Trash2,
  ChevronRight,
  ListFilter,
} from "lucide-react";

interface DMToolsProps {
  members: PartyMember[];
}

interface RollLogItem {
  id: string;
  timestamp: string;
  name: string;
  formula: string;
  resultText: string;
}

export function DMTools({ members }: DMToolsProps) {
  const [dmActiveTab, setDmActiveTab] = useState<"manual" | "builder" | "tracker">("builder");
  const [rollLog, setRollLog] = useState<RollLogItem[]>([]);
  const [showRollLog, setShowRollLog] = useState(false);
  const [isCombatActive, setIsCombatActive] = useState(false);

  // Check if combat is active on load
  useEffect(() => {
    try {
      const stored = localStorage.getItem("party-stats:combat-state");
      if (stored) {
        const parsed = JSON.parse(stored);
        setIsCombatActive(parsed.active ?? false);
      }
    } catch {
      void 0;
    }
  }, [dmActiveTab]);

  // Handle dice rolls
  const handleRoll = (rollName: string, formula: string, resultText: string) => {
    const newItem: RollLogItem = {
      id: `roll-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      name: rollName,
      formula,
      resultText,
    };
    setRollLog((prev) => [newItem, ...prev].slice(0, 50)); // Limit to 50 rolls
    setShowRollLog(true); // Automatically show log panel on new rolls
  };

  // Launch encounter combat
  const handleStartCombat = (encounter: any) => {
    const combatants: any[] = [];

    // 1. Add player combatants
    encounter.activePartyIds.forEach((pId: number) => {
      const member = members.find((m) => m.id === pId);
      if (member) {
        const hpInfo = getLocalHp(member.id, member.hpCurrent, member.tempHp, member.deathSaves);
        combatants.push({
          id: String(member.id),
          name: member.name,
          type: "player",
          initiative: "",
          hpCurrent: hpInfo.hpCurrent,
          hpMax: member.hpMax,
          tempHp: hpInfo.tempHp,
          conditions: [],
        });
      }
    });

    // 2. Add monster combatants (expanded by quantity)
    encounter.monsters.forEach((mon: any) => {
      let hpMax = 10;

      // Look up cached max HP if available
      const cached = localStorage.getItem(`party-stats:monster:${mon.index}`);
      if (cached) {
        try {
          const details = JSON.parse(cached);
          hpMax = details.hit_points ?? 10;
        } catch {
          void 0;
        }
      }

      for (let i = 1; i <= mon.quantity; i++) {
        const name = mon.quantity > 1 ? `${mon.name} ${i}` : mon.name;
        combatants.push({
          id: `${mon.index}-${i}-${Date.now()}-${Math.random()}`,
          name,
          type: "monster",
          monsterIndex: mon.index,
          initiative: "",
          hpCurrent: hpMax,
          hpMax,
          tempHp: 0,
          conditions: [],
        });
      }
    });

    // 3. Build state
    const state = {
      active: true,
      round: 1,
      turnIndex: 0,
      combatants,
    };

    localStorage.setItem("party-stats:combat-state", JSON.stringify(state));
    setIsCombatActive(true);
    setDmActiveTab("tracker");
  };

  const handleEndCombatCallback = () => {
    setIsCombatActive(false);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 relative select-none">
      {/* Main Panel Column */}
      <div className="flex-1 space-y-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-border/30 pb-3">
          <button
            onClick={() => setDmActiveTab("builder")}
            className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              dmActiveTab === "builder"
                ? "border border-amber-500/40 bg-amber-500/15 text-amber-500 shadow-sm"
                : "border border-transparent hover:border-border hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            <ListFilter size={12} />
            <span>Encounter Builder</span>
          </button>
          <button
            onClick={() => setDmActiveTab("manual")}
            className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              dmActiveTab === "manual"
                ? "border border-amber-500/40 bg-amber-500/15 text-amber-500 shadow-sm"
                : "border border-transparent hover:border-border hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen size={12} />
            <span>Monster Manual</span>
          </button>
          <button
            onClick={() => setDmActiveTab("tracker")}
            className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer relative ${
              dmActiveTab === "tracker"
                ? "border border-amber-500/40 bg-amber-500/15 text-amber-500 shadow-sm"
                : "border border-transparent hover:border-border hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Swords size={12} />
            <span>Combat Tracker</span>
            {isCombatActive && (
              <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 text-[8px] font-extrabold items-center justify-center text-white">
                  !
                </span>
              </span>
            )}
          </button>

          {/* Roll Log Button Toggle */}
          <button
            onClick={() => setShowRollLog(!showRollLog)}
            className={`ml-auto flex items-center gap-2 rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-all duration-200 cursor-pointer ${
              showRollLog
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-border/60 hover:border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Dice5 size={12} />
            <span>Roll Log ({rollLog.length})</span>
          </button>
        </div>

        {/* Tab Views */}
        <div className="transition-all duration-300">
          {dmActiveTab === "builder" && (
            <div className="animate-fade-in">
              <EncounterBuilder members={members} onStartCombat={handleStartCombat} />
            </div>
          )}

          {dmActiveTab === "manual" && (
            <div className="animate-fade-in">
              <MonsterManual onRoll={handleRoll} />
            </div>
          )}

          {dmActiveTab === "tracker" && (
            <div className="animate-fade-in">
              <CombatTracker
                members={members}
                onRoll={handleRoll}
                onEndCombatCallback={handleEndCombatCallback}
              />
            </div>
          )}
        </div>
      </div>

      {/* Floating Side Panel: Dice Roll Log */}
      {showRollLog && (
        <div className="w-full lg:w-72 border border-border bg-card/65 rounded-xl shadow-xl backdrop-blur-md p-4 max-h-[600px] overflow-y-auto shrink-0 animate-fade-in flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-border/40 pb-2 select-none">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent">
              <Dice5 size={14} className="animate-bounce" />
              <span>DM Dice Log</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRollLog([])}
                className="p-1 hover:bg-secondary text-muted-foreground hover:text-destructive rounded transition-colors cursor-pointer"
                title="Clear Roll Log"
              >
                <Trash2 size={12} />
              </button>
              <button
                onClick={() => setShowRollLog(false)}
                className="text-muted-foreground hover:text-foreground text-xs font-bold hover:bg-secondary rounded px-1.5 py-0.5 cursor-pointer"
              >
                Hide
              </button>
            </div>
          </div>

          {rollLog.length === 0 ? (
            <p className="text-[11px] text-muted-foreground text-center py-10 italic select-none">
              Click stats or attack buttons inside monster sheets to roll.
            </p>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {rollLog.map((roll) => (
                <div
                  key={roll.id}
                  className="text-xs bg-secondary/35 border border-border/30 rounded p-2 text-foreground font-medium select-text"
                >
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold mb-1 select-none">
                    <span className="truncate pr-2">{roll.name}</span>
                    <span className="font-mono">{roll.timestamp}</span>
                  </div>
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-[10px] text-muted-foreground/80 font-mono select-none">
                      {roll.formula}
                    </span>
                    <span
                      dangerouslySetInnerHTML={{ __html: roll.resultText }}
                      className="text-accent font-bold font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
export default DMTools;
