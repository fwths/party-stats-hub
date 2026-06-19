import { useState, useEffect } from "react";
import { syncedLocalStorage as localStorage } from "@/lib/synced-storage";
import { Search, Plus, Minus, ChevronDown, ChevronUp, Loader2, BookOpen } from "lucide-react";
import { MonsterStatBlock } from "./MonsterStatBlock";

interface MonsterManualProps {
  onRoll?: (rollName: string, formula: string, resultText: string) => void;
  onMonsterAddedToEncounter?: () => void;
}

interface MonsterIndexItem {
  index: string;
  name: string;
  url: string;
}

export function MonsterManual({ onRoll, onMonsterAddedToEncounter }: MonsterManualProps) {
  const [search, setSearch] = useState("");
  const [crFilter, setCrFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  const [monsters, setMonsters] = useState<MonsterIndexItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Cache of fetched monster details
  const [expandedMonsterIndex, setExpandedMonsterIndex] = useState<string | null>(null);
  const [expandedMonsterData, setExpandedMonsterData] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Encounter assignment state
  const [encounters, setEncounters] = useState<any[]>([]);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string>("");
  const [quantityToAdd, setQuantityToAdd] = useState(1);
  const [showAddMenuIndex, setShowAddMenuIndex] = useState<string | null>(null);

  // Challenge Ratings list
  const crOptions = [
    "All",
    "0",
    "1/8",
    "1/4",
    "1/2",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
    "13",
    "14",
    "15",
    "16",
    "17",
    "18",
    "19",
    "20",
    "21",
    "22",
    "23",
    "24",
    "30",
  ];

  // Monster Types list
  const typeOptions = [
    "All",
    "Aberration",
    "Beast",
    "Celestial",
    "Construct",
    "Dragon",
    "Elemental",
    "Fey",
    "Fiend",
    "Giant",
    "Humanoid",
    "Monstrosity",
    "Ooze",
    "Plant",
    "Undead",
  ];

  // Load encounters list from local storage
  const loadEncounters = () => {
    try {
      const stored = localStorage.getItem("party-stats:encounters");
      if (stored) {
        const parsed = JSON.parse(stored);
        setEncounters(parsed);
        if (parsed.length > 0) {
          setSelectedEncounterId(parsed[0].id);
        }
      }
    } catch (e) {
      console.warn("Failed to load encounters:", e);
    }
  };

  useEffect(() => {
    loadEncounters();
  }, []);

  // Fetch index list with filters
  useEffect(() => {
    const fetchMonsters = async () => {
      setLoading(true);
      setError("");
      try {
        let url = "https://www.dnd5eapi.co/api/monsters";
        const params = new URLSearchParams();

        if (crFilter !== "All") {
          // The API expects standard string for CR like "1/4" or "2"
          params.append("challenge_rating", crFilter);
        }
        if (typeFilter !== "All") {
          params.append("type", typeFilter.toLowerCase());
        }

        if (params.toString()) {
          url += "?" + params.toString();
        }

        // Try to check local storage cache first if filters are empty
        const cacheKey = `party-stats:monsters-index:${crFilter}:${typeFilter}`;
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
          setMonsters(JSON.parse(cached));
          setLoading(false);
          return;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();

        if (data.results) {
          setMonsters(data.results);
          // Cache results
          localStorage.setItem(cacheKey, JSON.stringify(data.results));
        } else {
          setMonsters([]);
        }
      } catch (err: any) {
        console.error(err);
        setError("Failed to fetch monsters. If you are offline, check your internet connection.");
        // Try fallback to any cached index
        const cachedFallback = localStorage.getItem("party-stats:monsters-index:All:All");
        if (cachedFallback) {
          setMonsters(JSON.parse(cachedFallback));
          setError("Offline mode: showing cached monster list.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMonsters();
  }, [crFilter, typeFilter]);

  // Load detailed monster block
  const handleToggleMonster = async (index: string) => {
    if (expandedMonsterIndex === index) {
      setExpandedMonsterIndex(null);
      setExpandedMonsterData(null);
      return;
    }

    setExpandedMonsterIndex(index);
    setExpandedMonsterData(null);
    setLoadingDetails(true);

    try {
      // Check localStorage cache first
      const cacheKey = `party-stats:monster:${index}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setExpandedMonsterData(JSON.parse(cached));
        setLoadingDetails(false);
        return;
      }

      const res = await fetch(`https://www.dnd5eapi.co/api/monsters/${index}`);
      if (!res.ok) throw new Error("Failed to load details");
      const details = await res.json();

      setExpandedMonsterData(details);
      // Cache details in localStorage
      localStorage.setItem(cacheKey, JSON.stringify(details));
    } catch (err) {
      console.error(err);
      setError("Failed to load monster details.");
    } finally {
      setLoadingDetails(false);
    }
  };

  // Add monster to selected encounter
  const handleAddToEncounter = (monsterItem: MonsterIndexItem) => {
    if (!selectedEncounterId) {
      alert("Please create an encounter first in the Encounter Builder.");
      return;
    }

    try {
      const stored = localStorage.getItem("party-stats:encounters");
      const currentEncounters = stored ? JSON.parse(stored) : [];

      const encounterIdx = currentEncounters.findIndex((e: any) => e.id === selectedEncounterId);
      if (encounterIdx === -1) return;

      const encounter = currentEncounters[encounterIdx];

      // Get monster details to find XP
      let monsterXp = 0;
      let monsterCr = 0;
      const cacheKey = `party-stats:monster:${monsterItem.index}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const details = JSON.parse(cached);
        monsterXp = details.xp ?? 0;
        monsterCr = details.challenge_rating ?? 0;
      } else if (expandedMonsterIndex === monsterItem.index && expandedMonsterData) {
        monsterXp = expandedMonsterData.xp ?? 0;
        monsterCr = expandedMonsterData.challenge_rating ?? 0;
      }

      // Check if monster already in encounter
      const monsterIdx = encounter.monsters.findIndex((m: any) => m.index === monsterItem.index);
      if (monsterIdx !== -1) {
        encounter.monsters[monsterIdx].quantity += quantityToAdd;
      } else {
        encounter.monsters.push({
          index: monsterItem.index,
          name: monsterItem.name,
          quantity: quantityToAdd,
          xp: monsterXp || getFallbackXpForCr(monsterCr),
          challenge_rating: monsterCr,
        });
      }

      currentEncounters[encounterIdx] = encounter;
      localStorage.setItem("party-stats:encounters", JSON.stringify(currentEncounters));

      // Reset state and trigger callback
      setShowAddMenuIndex(null);
      setQuantityToAdd(1);

      if (onMonsterAddedToEncounter) {
        onMonsterAddedToEncounter();
      }

      // Briefly notify user
      alert(`Added ${quantityToAdd}x ${monsterItem.name} to "${encounter.name}"`);
    } catch (e) {
      console.error(e);
      alert("Failed to add monster to encounter.");
    }
  };

  // Fallback XP calculator
  const getFallbackXpForCr = (cr: number): number => {
    const xpTable: Record<string, number> = {
      "0": 10,
      "0.125": 25,
      "0.25": 50,
      "0.5": 100,
      "1": 200,
      "2": 450,
      "3": 700,
      "4": 1100,
      "5": 1800,
      "6": 2300,
      "7": 2900,
      "8": 3900,
      "9": 5000,
      "10": 5900,
      "11": 7200,
      "12": 8400,
      "13": 10000,
      "14": 11500,
      "15": 13000,
      "16": 15000,
      "17": 18000,
      "18": 20000,
      "19": 22000,
      "20": 25000,
      "21": 33000,
      "22": 41000,
      "23": 50000,
      "24": 62000,
      "30": 155000,
    };
    return xpTable[String(cr)] ?? 0;
  };

  // Filter list by search query locally
  const filteredMonsters = monsters.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4 select-none">
      <div className="card-arcane rounded-xl border border-border p-4 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={16} className="text-accent" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Monster Manual Database
          </h2>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Name Search */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-muted-foreground/60">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Search monster by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded border border-border bg-secondary/40 pl-8 pr-3 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none transition-all"
            />
          </div>

          {/* CR Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              CR:
            </label>
            <select
              value={crFilter}
              onChange={(e) => setCrFilter(e.target.value)}
              className="w-full rounded border border-border bg-secondary/40 px-2 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none cursor-pointer"
            >
              {crOptions.map((cr) => (
                <option key={cr} value={cr} className="bg-background">
                  {cr === "All" ? "All Challenge Ratings" : `CR ${cr}`}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Type:
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full rounded border border-border bg-secondary/40 px-2 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none cursor-pointer"
            >
              {typeOptions.map((type) => (
                <option key={type} value={type} className="bg-background">
                  {type === "All" ? "All Creature Types" : type}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mt-3 text-xs bg-destructive/10 border border-destructive/30 rounded p-2 text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Monster List Container */}
      <div className="card-arcane rounded-xl border border-border p-4 shadow-xl max-h-[600px] overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground text-xs">
            <Loader2 className="animate-spin text-accent" size={24} />
            <span>Retrieving monster list from SRD API...</span>
          </div>
        ) : filteredMonsters.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-xs">
            No monsters match your query. Try adjusting your search filters.
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {filteredMonsters.map((monster) => {
              const isExpanded = expandedMonsterIndex === monster.index;
              const isAddMenuOpen = showAddMenuIndex === monster.index;

              return (
                <div key={monster.index} className="py-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                    {/* Monster Header */}
                    <button
                      onClick={() => handleToggleMonster(monster.index)}
                      className="flex items-center justify-between flex-1 text-left font-semibold text-sm hover:text-accent cursor-pointer group"
                    >
                      <span className="group-hover:translate-x-0.5 transition-transform">
                        {monster.name}
                      </span>
                      {isExpanded ? (
                        <ChevronUp size={14} className="text-muted-foreground" />
                      ) : (
                        <ChevronDown size={14} className="text-muted-foreground" />
                      )}
                    </button>

                    {/* Quick Add Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {encounters.length > 0 ? (
                        <div className="relative">
                          {isAddMenuOpen ? (
                            <div className="absolute right-0 bottom-full mb-1.5 z-20 flex flex-col items-end gap-1 bg-secondary/95 border border-border rounded-lg p-2.5 shadow-lg min-w-[200px] backdrop-blur-md">
                              <label className="text-[10px] uppercase font-bold text-muted-foreground">
                                Select Encounter
                              </label>
                              <select
                                value={selectedEncounterId}
                                onChange={(e) => setSelectedEncounterId(e.target.value)}
                                className="w-full text-xs rounded border border-border bg-background px-1.5 py-1 text-foreground"
                              >
                                {encounters.map((enc) => (
                                  <option key={enc.id} value={enc.id}>
                                    {enc.name}
                                  </option>
                                ))}
                              </select>

                              <div className="flex items-center justify-between w-full mt-2 gap-2">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground">
                                  Qty:
                                </span>
                                <div className="flex items-center gap-1 border border-border rounded bg-background">
                                  <button
                                    onClick={() => setQuantityToAdd(Math.max(1, quantityToAdd - 1))}
                                    className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                                  >
                                    <Minus size={10} />
                                  </button>
                                  <span className="text-xs px-1 text-center min-w-[15px] font-semibold">
                                    {quantityToAdd}
                                  </span>
                                  <button
                                    onClick={() => setQuantityToAdd(quantityToAdd + 1)}
                                    className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                                  >
                                    <Plus size={10} />
                                  </button>
                                </div>
                              </div>

                              <div className="flex gap-1.5 w-full mt-2.5">
                                <button
                                  onClick={() => setShowAddMenuIndex(null)}
                                  className="w-1/2 rounded border border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-secondary/40 cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleAddToEncounter(monster)}
                                  className="w-1/2 rounded bg-accent/20 border border-accent/40 text-accent font-semibold px-2 py-1 text-[10px] hover:bg-accent/30 cursor-pointer"
                                >
                                  Confirm
                                </button>
                              </div>
                            </div>
                          ) : null}
                          <button
                            onClick={() => {
                              setShowAddMenuIndex(isAddMenuOpen ? null : monster.index);
                              setQuantityToAdd(1);
                              loadEncounters();
                            }}
                            className="rounded border border-border hover:border-accent/40 hover:bg-accent/5 text-xs text-foreground font-semibold px-2 py-1 cursor-pointer select-none active:scale-95 transition-all"
                          >
                            + Add to Encounter
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">
                          Create an encounter to add monsters
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="mt-2.5 pl-2 select-text border-l border-accent/20 animate-fade-in">
                      {loadingDetails ? (
                        <div className="flex items-center gap-2 py-6 text-muted-foreground text-xs justify-center">
                          <Loader2 className="animate-spin text-accent" size={16} />
                          <span>Parsing creature stat block...</span>
                        </div>
                      ) : expandedMonsterData ? (
                        <MonsterStatBlock monster={expandedMonsterData} onRoll={onRoll} />
                      ) : (
                        <div className="text-xs text-destructive py-2">
                          Error loading monster details.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
