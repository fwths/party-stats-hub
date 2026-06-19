import { useState, useRef, useEffect } from "react";
import { PartyMember } from "@/lib/dndbeyond.types";
import { Swords, Play, Sparkles, ChevronDown, Check } from "lucide-react";

interface CustomSelectProps {
  value: string;
  onChange: (val: any) => void;
  options: Array<{ value: string; label: string }>;
}

function CustomSelect({ value, onChange, options }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full rounded border border-border/80 bg-secondary/40 hover:bg-secondary/60 hover:border-accent/40 px-3 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none transition-all duration-200 cursor-pointer select-none text-left h-[34px]"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : "Select..."}</span>
        <ChevronDown
          size={12}
          className={`text-muted-foreground/60 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded border border-border/90 bg-secondary/95 shadow-lg backdrop-blur-md animate-fade-in select-none">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between w-full px-3 py-2 text-xs text-left transition-colors duration-150 cursor-pointer hover:bg-accent/10 hover:text-accent ${
                  isSelected ? "bg-accent/15 text-accent font-semibold" : "text-foreground/90"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={11} className="text-accent" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface GroupDiceRollerProps {
  members: PartyMember[];
}

interface RollResult {
  charId: number;
  charName: string;
  avatarUrl: string | null;
  d20: number;
  mod: number;
  total: number;
  isNat20: boolean;
  isNat1: boolean;
}

export function GroupDiceRoller({ members }: GroupDiceRollerProps) {
  const activeMembers = members.filter((m) => !m.error);

  const [rollType, setRollType] = useState<"ability" | "save" | "skill">("ability");
  const [targetName, setTargetName] = useState<string>("DEX");
  const [results, setResults] = useState<RollResult[]>([]);
  const [rolling, setRolling] = useState(false);
  const [dcTarget, setDcTarget] = useState<number | "">("");

  // Lists for dropdown options
  const abilities = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
  const skills = [
    "Acrobatics",
    "Animal Handling",
    "Arcana",
    "Athletics",
    "Deception",
    "History",
    "Insight",
    "Intimidation",
    "Investigation",
    "Medicine",
    "Nature",
    "Perception",
    "Performance",
    "Persuasion",
    "Religion",
    "Sleight of Hand",
    "Stealth",
    "Survival",
  ].sort();

  // Reset target when type changes to match options
  const handleTypeChange = (type: "ability" | "save" | "skill") => {
    setRollType(type);
    if (type === "ability" || type === "save") {
      setTargetName("DEX");
    } else {
      setTargetName("Perception");
    }
  };

  const rollDice = () => {
    setRolling(true);
    setResults([]);

    setTimeout(() => {
      const nextResults: RollResult[] = activeMembers.map((m) => {
        let modifier = 0;

        if (rollType === "ability") {
          const ab = m.abilities.find((a) => a.name === targetName);
          modifier = ab ? ab.modifier : 0;
        } else if (rollType === "save") {
          const sv = m.saves.find((s) => s.ability === targetName);
          modifier = sv ? sv.modifier : 0;
        } else if (rollType === "skill") {
          const sk = m.skills.find((s) => s.name.toLowerCase() === targetName.toLowerCase());
          modifier = sk ? sk.modifier : 0;
        }

        const d20 = Math.floor(Math.random() * 20) + 1;
        return {
          charId: m.id,
          charName: m.name,
          avatarUrl: m.avatarUrl,
          d20,
          mod: modifier,
          total: d20 + modifier,
          isNat20: d20 === 20,
          isNat1: d20 === 1,
        };
      });

      // Sort descending by total score
      nextResults.sort((a, b) => b.total - a.total);
      setResults(nextResults);
      setRolling(false);
    }, 800); // Small delay for rolling feel
  };

  return (
    <div className="card-arcane rounded-xl border border-border p-5 shadow-xl transition-all duration-300">
      <div className="flex items-center gap-2.5 border-b border-border/40 pb-3 mb-4 select-none">
        <Swords size={16} className="text-accent" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-foreground bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
          Party Dice Roller
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 select-none">
            Roll Category
          </label>
          <CustomSelect
            value={rollType}
            onChange={(val) => handleTypeChange(val)}
            options={[
              { value: "ability", label: "Ability Check" },
              { value: "save", label: "Saving Throw" },
              { value: "skill", label: "Skill Check" },
            ]}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 select-none">
            Stat / Skill Target
          </label>
          <CustomSelect
            value={targetName}
            onChange={(val) => setTargetName(val)}
            options={
              rollType === "ability"
                ? abilities.map((a) => ({ value: a, label: `${a} Check` }))
                : rollType === "save"
                  ? abilities.map((a) => ({ value: a, label: `${a} Save` }))
                  : skills.map((s) => ({ value: s, label: s }))
            }
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 select-none">
            Target DC (Optional)
          </label>
          <input
            type="number"
            value={dcTarget}
            onChange={(e) => {
              const val = e.target.value;
              setDcTarget(val === "" ? "" : parseInt(val));
            }}
            placeholder="No DC"
            className="w-full rounded border border-border bg-secondary/60 px-3 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={rollDice}
            disabled={rolling}
            className="flex items-center justify-center gap-2 w-full rounded border border-accent bg-accent/10 hover:bg-accent/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent transition-all duration-200 cursor-pointer shadow-sm hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none"
          >
            {rolling ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                <span>Rolling...</span>
              </>
            ) : (
              <>
                <Play size={12} className="fill-accent" />
                <span>Roll Party</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results grid */}
      {results.length > 0 && (
        <div className="rounded-lg border border-border/40 bg-secondary/10 p-4 space-y-2.5">
          <div className="flex items-center justify-between border-b border-border/30 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 select-none">
            <span>Character</span>
            <div className="flex gap-8">
              {dcTarget !== "" && <span className="mr-4">Outcome</span>}
              <span>Roll + Mod</span>
              <span>Total</span>
            </div>
          </div>
          <div className="space-y-2">
            {results.map((r) => (
              <div
                key={r.charId}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition-all duration-300 ${
                  r.isNat20
                    ? "border-gold/30 bg-gold/5 shadow-[0_0_10px_rgba(212,175,55,0.15)]"
                    : r.isNat1
                      ? "border-destructive/30 bg-destructive/5 animate-pulse"
                      : "border-border/40 bg-secondary/20"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {r.avatarUrl ? (
                    <img
                      src={r.avatarUrl}
                      alt={r.charName}
                      className="h-6 w-6 rounded-full border border-border/60 object-cover"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-secondary border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                      ?
                    </div>
                  )}
                  <span className="font-semibold text-foreground">{r.charName}</span>
                </div>

                <div className="flex items-center gap-4">
                  {dcTarget !== "" && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border select-none ${
                        r.total >= dcTarget
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : "bg-destructive/10 border-destructive/30 text-destructive"
                      }`}
                    >
                      {r.total >= dcTarget ? "Success" : "Failure"}
                    </span>
                  )}

                  <div className="flex items-center gap-8 select-all">
                    <span className="font-mono text-muted-foreground min-w-[70px] text-right">
                      {r.isNat20 ? (
                        <span className="text-gold font-bold flex items-center justify-end gap-1">
                          <Sparkles size={11} className="text-gold animate-bounce" />
                          Nat 20
                        </span>
                      ) : r.isNat1 ? (
                        <span className="text-destructive font-bold">Nat 1</span>
                      ) : (
                        r.d20
                      )}{" "}
                      + {r.mod >= 0 ? r.mod : `(${r.mod})`}
                    </span>
                    <span
                      className={`font-mono font-bold text-sm min-w-[20px] text-right ${
                        r.isNat20
                          ? "text-gold drop-shadow-[0_0_6px_var(--gold)]"
                          : r.isNat1
                            ? "text-destructive"
                            : "text-foreground"
                      }`}
                    >
                      {r.total}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
