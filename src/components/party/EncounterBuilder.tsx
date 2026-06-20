import { useState, useEffect } from "react";
import { PartyMember } from "@/lib/dndbeyond.types";
import { syncedLocalStorage as localStorage } from "@/lib/synced-storage";
import { Plus, Minus, Trash2, Swords, AlertTriangle } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";

interface EncounterBuilderProps {
  members: PartyMember[];
  onStartCombat: (encounter: any) => void;
}

interface EncounterMonster {
  index: string;
  name: string;
  quantity: number;
  xp: number;
  challenge_rating: number;
}

interface Encounter {
  id: string;
  name: string;
  monsters: EncounterMonster[];
  activePartyIds: number[];
}

const XP_THRESHOLDS: Record<
  number,
  { easy: number; medium: number; hard: number; deadly: number }
> = {
  1: { easy: 25, medium: 50, hard: 75, deadly: 100 },
  2: { easy: 50, medium: 100, hard: 150, deadly: 200 },
  3: { easy: 75, medium: 150, hard: 225, deadly: 400 },
  4: { easy: 125, medium: 250, hard: 375, deadly: 500 },
  5: { easy: 250, medium: 500, hard: 750, deadly: 1100 },
  6: { easy: 300, medium: 600, hard: 900, deadly: 1400 },
  7: { easy: 350, medium: 750, hard: 1100, deadly: 1700 },
  8: { easy: 450, medium: 900, hard: 1400, deadly: 2100 },
  9: { easy: 550, medium: 1100, hard: 1600, deadly: 2400 },
  10: { easy: 600, medium: 1200, hard: 1900, deadly: 2800 },
  11: { easy: 800, medium: 1600, hard: 2400, deadly: 3600 },
  12: { easy: 1000, medium: 2000, hard: 3000, deadly: 4500 },
  13: { easy: 1100, medium: 2200, hard: 3400, deadly: 5100 },
  14: { easy: 1250, medium: 2500, hard: 3800, deadly: 5700 },
  15: { easy: 1400, medium: 2800, hard: 4300, deadly: 6400 },
  16: { easy: 1600, medium: 3200, hard: 4800, deadly: 7200 },
  17: { easy: 2000, medium: 3900, hard: 5900, deadly: 8800 },
  18: { easy: 2100, medium: 4200, hard: 6300, deadly: 9500 },
  19: { easy: 2400, medium: 4900, hard: 7300, deadly: 10900 },
  20: { easy: 2800, medium: 5700, hard: 8500, deadly: 12700 },
};

export function EncounterBuilder({ members, onStartCombat }: EncounterBuilderProps) {
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const activeMembers = members.filter((m) => !m.error);

  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string>("");
  const [newEncounterName, setNewEncounterName] = useState("");

  // Load encounters from local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("party-stats:encounters");
      if (stored) {
        const parsed = JSON.parse(stored);
        setEncounters(parsed);
        if (parsed.length > 0) {
          setSelectedEncounterId(parsed[0].id);
        }
      } else {
        // Seed default encounter
        const defaultEnc: Encounter = {
          id: `enc-${Date.now()}`,
          name: "Goblin Skirmish",
          monsters: [
            { index: "goblin", name: "Goblin", quantity: 3, xp: 50, challenge_rating: 0.25 },
          ],
          activePartyIds: activeMembers.map((m) => m.id),
        };
        setEncounters([defaultEnc]);
        setSelectedEncounterId(defaultEnc.id);
        localStorage.setItem("party-stats:encounters", JSON.stringify([defaultEnc]));
      }
    } catch (e) {
      console.warn("Failed to load encounters:", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveEncountersList = (list: Encounter[]) => {
    setEncounters(list);
    localStorage.setItem("party-stats:encounters", JSON.stringify(list));
  };

  // Create new encounter
  const handleCreateEncounter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEncounterName.trim()) return;

    const newEnc: Encounter = {
      id: `enc-${Date.now()}`,
      name: newEncounterName.trim(),
      monsters: [],
      activePartyIds: activeMembers.map((m) => m.id),
    };

    const updated = [...encounters, newEnc];
    saveEncountersList(updated);
    setSelectedEncounterId(newEnc.id);
    setNewEncounterName("");
  };

  // Delete current encounter
  const handleDeleteEncounter = async () => {
    if (!selectedEncounterId) return;
    const confirmed = await confirm({
      title: "Delete Encounter",
      message: "Are you sure you want to delete this encounter?",
      variant: "destructive",
      confirmText: "Delete",
    });
    if (!confirmed) return;

    const updated = encounters.filter((e) => e.id !== selectedEncounterId);
    saveEncountersList(updated);
    if (updated.length > 0) {
      setSelectedEncounterId(updated[0].id);
    } else {
      setSelectedEncounterId("");
    }
    toast.success("Encounter deleted.", "Encounter Removed");
  };

  // Active encounter object
  const activeEncounter = encounters.find((e) => e.id === selectedEncounterId);

  // Update active encounter
  const updateActiveEncounter = (updatedEnc: Encounter) => {
    const updated = encounters.map((e) => (e.id === selectedEncounterId ? updatedEnc : e));
    saveEncountersList(updated);
  };

  // Adjust monster quantity
  const handleUpdateMonsterQty = (monsterIndex: string, change: number) => {
    if (!activeEncounter) return;

    const updatedMonsters = activeEncounter.monsters
      .map((m) => {
        if (m.index === monsterIndex) {
          const qty = Math.max(0, m.quantity + change);
          return { ...m, quantity: qty };
        }
        return m;
      })
      .filter((m) => m.quantity > 0);

    updateActiveEncounter({
      ...activeEncounter,
      monsters: updatedMonsters,
    });
  };

  // Remove monster completely
  const handleRemoveMonster = (monsterIndex: string) => {
    if (!activeEncounter) return;

    updateActiveEncounter({
      ...activeEncounter,
      monsters: activeEncounter.monsters.filter((m) => m.index !== monsterIndex),
    });
  };

  // Toggle party member in encounter
  const handleTogglePartyMember = (id: number) => {
    if (!activeEncounter) return;

    const activeIds = activeEncounter.activePartyIds || [];
    const updatedIds = activeIds.includes(id)
      ? activeIds.filter((pId) => pId !== id)
      : [...activeIds, id];

    updateActiveEncounter({
      ...activeEncounter,
      activePartyIds: updatedIds,
    });
  };

  // Calculate difficulty thresholds for active party
  const calculatePartyThresholds = () => {
    if (!activeEncounter) return { easy: 0, medium: 0, hard: 0, deadly: 0 };

    let easy = 0;
    let medium = 0;
    let hard = 0;
    let deadly = 0;

    const partyIds = activeEncounter.activePartyIds || [];
    activeMembers.forEach((m) => {
      if (partyIds.includes(m.id)) {
        const lvl = m.level || 1;
        const thresh = XP_THRESHOLDS[lvl] || XP_THRESHOLDS[1];
        easy += thresh.easy;
        medium += thresh.medium;
        hard += thresh.hard;
        deadly += thresh.deadly;
      }
    });

    return { easy, medium, hard, deadly };
  };

  // Get encounter multiplier based on monster count and party size
  const getEncounterMultiplier = (monsterCount: number, partySize: number) => {
    if (monsterCount === 0) return 0;

    const multipliers = [1, 1.5, 2, 2.5, 3, 4];
    let index = 0;

    if (monsterCount === 1) index = 0;
    else if (monsterCount === 2) index = 1;
    else if (monsterCount >= 3 && monsterCount <= 6) index = 2;
    else if (monsterCount >= 7 && monsterCount <= 10) index = 3;
    else if (monsterCount >= 11 && monsterCount <= 14) index = 4;
    else index = 5;

    // RAW Party Size adjustments
    if (partySize < 3) {
      index = Math.min(5, index + 1); // Increase multiplier
    } else if (partySize >= 6) {
      index = Math.max(0, index - 1); // Decrease multiplier
    }

    return multipliers[index];
  };

  // Calculate encounter metrics
  const getEncounterStats = () => {
    if (!activeEncounter) {
      return {
        totalMonsters: 0,
        totalBaseXp: 0,
        multiplier: 0,
        adjustedXp: 0,
        difficulty: "Trivial",
      };
    }

    const partySize = activeEncounter.activePartyIds?.length ?? 0;
    let totalMonsters = 0;
    let totalBaseXp = 0;

    activeEncounter.monsters.forEach((m) => {
      totalMonsters += m.quantity;
      totalBaseXp += m.xp * m.quantity;
    });

    const multiplier = getEncounterMultiplier(totalMonsters, partySize);
    const adjustedXp = Math.floor(totalBaseXp * multiplier);

    // Evaluate difficulty
    const thresholds = calculatePartyThresholds();
    let difficulty = "Trivial";
    if (partySize > 0 && totalMonsters > 0) {
      if (adjustedXp >= thresholds.deadly) difficulty = "Deadly";
      else if (adjustedXp >= thresholds.hard) difficulty = "Hard";
      else if (adjustedXp >= thresholds.medium) difficulty = "Medium";
      else if (adjustedXp >= thresholds.easy) difficulty = "Easy";
    }

    return {
      totalMonsters,
      totalBaseXp,
      multiplier,
      adjustedXp,
      difficulty,
    };
  };

  const stats = getEncounterStats();
  const thresholds = calculatePartyThresholds();
  const partySize = activeEncounter?.activePartyIds?.length ?? 0;

  // Render difficulty badge
  const getDifficultyBadge = (difficulty: string) => {
    const classes: Record<string, string> = {
      Trivial: "bg-zinc-500/10 border-zinc-500/30 text-zinc-400",
      Easy: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
      Medium: "bg-amber-500/10 border-amber-500/30 text-amber-400",
      Hard: "bg-orange-500/10 border-orange-500/30 text-orange-400",
      Deadly: "bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse font-extrabold",
    };
    return (
      <span
        className={`px-2.5 py-0.5 rounded border text-xs font-bold uppercase tracking-wider ${classes[difficulty]}`}
      >
        {difficulty}
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 select-none">
      {/* Left Column: List and Creation */}
      <div className="space-y-4 lg:col-span-1">
        <div className="card-arcane rounded-xl border border-border p-4 shadow-xl">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-3">
            Encounter Manager
          </h2>

          <form onSubmit={handleCreateEncounter} className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Encounter Name..."
              value={newEncounterName}
              onChange={(e) => setNewEncounterName(e.target.value)}
              className="flex-1 rounded border border-border bg-secondary/40 px-3 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!newEncounterName.trim()}
              className="rounded bg-accent/20 border border-accent/40 text-accent font-semibold px-3 py-1.5 text-xs hover:bg-accent/30 cursor-pointer disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              Create
            </button>
          </form>

          {encounters.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No encounters saved.</p>
          ) : (
            <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
              {encounters.map((enc) => (
                <button
                  key={enc.id}
                  onClick={() => setSelectedEncounterId(enc.id)}
                  className={`w-full text-left rounded px-3 py-2 text-xs transition-colors cursor-pointer select-none flex items-center justify-between ${
                    selectedEncounterId === enc.id
                      ? "bg-accent/15 text-accent font-semibold border border-accent/20"
                      : "hover:bg-secondary/40 text-foreground border border-transparent"
                  }`}
                >
                  <span className="truncate pr-2">{enc.name}</span>
                  <span className="text-[10px] bg-secondary/80 text-muted-foreground px-1.5 py-0.5 rounded font-mono">
                    {enc.monsters.reduce((acc, m) => acc + m.quantity, 0)}m
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active Party Members Selection */}
        {activeEncounter && (
          <div className="card-arcane rounded-xl border border-border p-4 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
              Include Party Members ({partySize})
            </h3>
            <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
              {activeMembers.map((m) => {
                const isActive = activeEncounter.activePartyIds?.includes(m.id) ?? false;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleTogglePartyMember(m.id)}
                    className={`flex items-center gap-2.5 w-full rounded border px-2.5 py-1.5 text-left text-xs transition-all cursor-pointer select-none ${
                      isActive
                        ? "border-accent/40 bg-accent/5 text-foreground font-semibold"
                        : "border-border/30 hover:border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isActive}
                      readOnly
                      className="accent-accent pointer-events-none"
                    />
                    {m.avatarUrl && (
                      <img
                        src={m.avatarUrl}
                        alt={m.name}
                        className="w-5 h-5 rounded-full object-cover bg-secondary/40 border border-border"
                      />
                    )}
                    <div className="flex-1 truncate">
                      <p className="truncate font-semibold leading-none">{m.name}</p>
                      <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                        Lvl {m.level} {m.classes}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Middle and Right Columns: Details, Monsters List, Difficulty */}
      <div className="lg:col-span-2 space-y-4">
        {activeEncounter ? (
          <div className="card-arcane rounded-xl border border-border p-5 shadow-xl space-y-5">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/30 pb-4">
              <div>
                <h1 className="font-heading text-lg font-bold text-foreground">
                  {activeEncounter.name}
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  Configure monster quantities, review difficulty threshold, and run combat.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleDeleteEncounter}
                  className="inline-flex items-center gap-1.5 rounded border border-destructive/30 hover:border-destructive hover:bg-destructive/10 text-xs font-semibold text-destructive px-3 py-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
                <button
                  onClick={() => onStartCombat(activeEncounter)}
                  disabled={stats.totalMonsters === 0 || partySize === 0}
                  className="inline-flex items-center gap-1.5 rounded bg-accent hover:bg-accent/90 border border-accent/20 text-xs font-bold uppercase tracking-wider text-accent-foreground px-4 py-1.5 cursor-pointer disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all shadow-md shadow-accent/10"
                >
                  <Swords size={13} />
                  <span>Start Combat</span>
                </button>
              </div>
            </div>

            {/* Difficulty Metrics Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-secondary/15 p-4 rounded-xl border border-border/40">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Difficulty Rating
                  </span>
                  {getDifficultyBadge(stats.difficulty)}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Total Monsters:</span>
                    <span className="text-foreground font-bold">{stats.totalMonsters}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Total Base XP:</span>
                    <span className="text-foreground font-bold">
                      {stats.totalBaseXp.toLocaleString()} XP
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">
                      Group Size Multiplier:
                    </span>
                    <span className="text-accent font-bold">x{stats.multiplier}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-t border-border/30 pt-1.5">
                    <span className="text-foreground font-bold uppercase">Adjusted XP:</span>
                    <span className="text-accent font-bold text-sm">
                      {stats.adjustedXp.toLocaleString()} XP
                    </span>
                  </div>
                </div>
              </div>

              {/* Thresholds Table */}
              <div className="space-y-2 border-t md:border-t-0 md:border-l border-border/30 pt-3 md:pt-0 md:pl-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Party XP Thresholds
                </span>
                {partySize === 0 ? (
                  <div className="flex items-center gap-1.5 text-xs text-amber-500 bg-amber-500/5 border border-amber-500/20 rounded p-2 mt-1">
                    <AlertTriangle size={14} />
                    <span>Select at least one active party member to calculate limits.</span>
                  </div>
                ) : (
                  <div className="space-y-1 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-400 font-bold uppercase">Easy:</span>
                      <span className="text-foreground">{thresholds.easy.toLocaleString()} XP</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-amber-400 font-bold uppercase">Medium:</span>
                      <span className="text-foreground">
                        {thresholds.medium.toLocaleString()} XP
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-orange-400 font-bold uppercase">Hard:</span>
                      <span className="text-foreground">{thresholds.hard.toLocaleString()} XP</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-rose-400 font-bold uppercase">Deadly:</span>
                      <span className="text-foreground">
                        {thresholds.deadly.toLocaleString()} XP
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Monsters List */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/30 pb-1.5">
                Encounter Monsters ({activeEncounter.monsters.length})
              </h2>

              {activeEncounter.monsters.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 border border-dashed border-border/40 rounded-xl bg-secondary/10">
                  <p className="text-xs text-muted-foreground text-center">
                    No monsters added to this encounter.
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 text-center">
                    Browse the <b>Monster Manual</b> tab to add creatures.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/20 max-h-[350px] overflow-y-auto pr-1">
                  {activeEncounter.monsters.map((m) => (
                    <div key={m.index} className="py-2.5 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-foreground">{m.name}</h4>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground font-semibold">
                          <span>
                            CR{" "}
                            {m.challenge_rating >= 0.125 && m.challenge_rating < 1
                              ? m.challenge_rating === 0.5
                                ? "1/2"
                                : m.challenge_rating === 0.25
                                  ? "1/4"
                                  : "1/8"
                              : m.challenge_rating}
                          </span>
                          <span>•</span>
                          <span>{m.xp} XP each</span>
                          <span>•</span>
                          <span className="text-accent font-bold">
                            {(m.xp * m.quantity).toLocaleString()} XP total
                          </span>
                        </div>
                      </div>

                      {/* Qty Adjustment */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-border rounded bg-secondary/40">
                          <button
                            onClick={() => handleUpdateMonsterQty(m.index, -1)}
                            className="p-1 hover:bg-secondary/60 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="text-xs font-semibold px-2 text-center min-w-[20px]">
                            {m.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateMonsterQty(m.index, 1)}
                            className="p-1 hover:bg-secondary/60 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                        <button
                          onClick={() => handleRemoveMonster(m.index)}
                          className="p-1.5 rounded border border-transparent hover:border-destructive/20 hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer active:scale-95 transition-all"
                          title="Remove Monster"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card-arcane rounded-xl border border-border p-8 shadow-xl text-center">
            <p className="text-sm text-muted-foreground font-semibold">
              No active encounter selected.
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Select or create an encounter in the sidebar to begin building.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
