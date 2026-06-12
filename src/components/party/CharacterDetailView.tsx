import { useEffect, useRef, useState } from "react";
import {
  Award,
  BookOpen,
  Brain,
  Eye,
  Flame,
  Heart,
  Lock,
  Moon,
  Search,
  Shield,
  Sparkles,
  Star,
  Swords,
  Zap,
  LayoutGrid,
  Columns2,
  Columns3,
  Layers,
  Package,
  Plus,
  Minus,
  User,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  PartyMember,
  PreparedSpell,
  SpellSlotLevel,
  FeatureInfo,
  ActionInfo,
} from "@/lib/dndbeyond.functions";
import { SKILL_ABILITY } from "@/lib/constants";
import {
  ABILITY_DETAILS,
  ConditionsPanel,
  InventoryList,
  Section,
  Stat,
  getModifiedStats,
  useCharacterConditions,
} from "./CharacterCard";
import { getFullyModifiedStats } from "@/lib/party-modifiers";


const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

const DAMAGE_TYPE_THEMES: Record<string, { bg: string; text: string; border: string }> = {
  fire: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
  cold: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30" },
  lightning: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  thunder: { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/30" },
  acid: { bg: "bg-lime-500/10", text: "text-lime-400", border: "border-lime-500/30" },
  poison: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  radiant: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  necrotic: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
  force: { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/30" },
  psychic: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/30" },
  slashing: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20" },
  piercing: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20" },
  bludgeoning: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20" },
};

function parseHitDice(hitDiceStr: string) {
  if (!hitDiceStr || hitDiceStr === "—") return [];
  return hitDiceStr
    .split("+")
    .map((part) => {
      const m = part.trim().match(/(\d+)\/(\d+)d(\d+)/);
      if (m) {
        return {
          remaining: parseInt(m[1], 10),
          total: parseInt(m[2], 10),
          die: `d${m[3]}`,
        };
      }
      return null;
    })
    .filter(Boolean) as Array<{ remaining: number; total: number; die: string }>;
}

interface LocalHpData {
  hpCurrent: number;
  tempHp: number;
  spentHitDice: Record<string, number>;
  deathSaves?: {
    successes: number;
    failures: number;
    stabilized: boolean;
  };
}

function useLocalArmorModel(memberId: number, initialArmorModel: string | null) {
  const storageKey = `party-stats:armor-model:${memberId}`;
  const [armorModel, setArmorModel] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        return stored === "null" ? null : stored;
      }
    } catch (e) {
      console.warn("Failed to load armor model from localStorage:", e);
    }
    return initialArmorModel;
  });

  const updateArmorModel = (model: string | null) => {
    setArmorModel(model);
    try {
      if (model === null) {
        localStorage.setItem(storageKey, "null");
      } else {
        localStorage.setItem(storageKey, model);
      }
    } catch (e) {
      console.warn("Failed to save armor model to localStorage:", e);
    }
  };

  return [armorModel, updateArmorModel] as const;
}

function useLocalActiveInfusions(memberId: number, initialActiveInfusions: string[]) {
  const storageKey = `party-stats:active-infusions:${memberId}`;
  const [activeInfusions, setActiveInfusions] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : initialActiveInfusions;
    } catch (e) {
      console.warn("Failed to load active infusions from localStorage:", e);
      return initialActiveInfusions;
    }
  });

  const toggleInfusion = (name: string) => {
    setActiveInfusions((prev) => {
      const next = prev.includes(name)
        ? prev.filter((x) => x !== name)
        : [...prev, name];
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (e) {
        console.warn("Failed to save active infusions to localStorage:", e);
      }
      return next;
    });
  };

  return [activeInfusions, toggleInfusion, setActiveInfusions] as const;
}

const METAMAGIC_DICTIONARY: Record<string, string> = {
  "Careful Spell":
    "When you cast a spell that forces other creatures to make a saving throw, you can protect some of those creatures from the spell's full effects. Spend 1 Sorcery Point and choose a number of those creatures up to your Charisma modifier (minimum of one). A chosen creature automatically succeeds on its saving throw.",
  "Distant Spell":
    "When you cast a spell that has a range of 5 feet or greater, you can spend 1 Sorcery Point to double the range of the spell. When you cast a spell that has a range of touch, you can spend 1 Sorcery Point to make the range of the spell 30 feet.",
  "Empowered Spell":
    "When you roll damage for a spell, you can spend 1 Sorcery Point to reroll a number of the damage dice up to your Charisma modifier (minimum of one). You must use the new rolls.",
  "Extended Spell":
    "When you cast a spell that has a duration of 1 minute or longer, you can spend 1 Sorcery Point to double its duration, to a maximum duration of 24 hours.",
  "Heightened Spell":
    "When you cast a spell that forces a creature to make a saving throw to resist its effects, you can spend 3 Sorcery Points to give one target of the spell disadvantage on its first saving throw made against the spell.",
  "Quickened Spell":
    "When you cast a spell that has a casting time of 1 action, you can spend 2 Sorcery Points to change the casting time to 1 bonus action for this casting.",
  "Seeking Spell":
    "If you make an attack roll for a spell and miss, you can spend 2 Sorcery Points to reroll the d20, and you must use the new roll.",
  "Subtle Spell":
    "When you cast a spell, you can spend 1 Sorcery Point to cast it without any somatic or verbal components.",
  "Transmuted Spell":
    "When you cast a spell that deals a type of damage from the following list, you can spend 1 Sorcery Point to change that damage type to another one from the list: Acid, Cold, Fire, Lightning, Poison, Thunder.",
  "Twinned Spell":
    "When you cast a spell that targets only one creature and doesn't have a range of self, you can spend a number of Sorcery Points equal to the spell's level to target a second creature in range with the same spell (1 Sorcery Point if the spell is a cantrip).",
};

const RAGE_DICTIONARY: Record<string, string> = {
  Active: "Enter a standard Rage. You have Resistance to Bludgeoning, Piercing, and Slashing damage, Advantage on Strength checks and saving throws, and deal extra Rage damage on Strength-based attacks.",
  Bear: "While raging, you have Resistance to every damage type except Force, Necrotic, Psychic, and Radiant.",
  Eagle: "When you activate your Rage, you can take the Disengage and Dash actions as part of that Bonus Action. While active, you can take a Bonus Action to take both of those actions.",
  Wolf: "While raging, your allies have Advantage on melee attack rolls against any enemy of yours within 5 feet of you.",
  Elk: "While raging, your walking speed increases by 15 feet.",
  Tiger: "While raging, you can add 10 feet to your long jump distance and 3 feet to your high jump distance.",
};

const TOTEM_ASPECT_DICTIONARY: Record<string, string> = {
  Bear: "You gain proficiency in Athletics or Survival (or expertise). Your carrying capacity is doubled, and you have advantage on Strength checks to push, pull, lift, or break things.",
  Eagle:
    "You gain proficiency in Perception or Survival (or expertise). You can see up to 1 mile away without difficulty, and dim light doesn't impose disadvantage on Wisdom (Perception) checks.",
  Elk: "Whether mounted or on foot, your travel pace is doubled, as is the travel pace of up to ten companions while they're within 60 feet of you.",
  Tiger: "You gain proficiency in Athletics, Acrobatics, Stealth, or Survival (or expertise).",
  Wolf: "You gain proficiency in Insight or Survival (or expertise). You can track other creatures while traveling at a fast pace, and move stealthily while traveling at normal pace.",
  Owl: "You gain proficiency in Investigation or Perception (or expertise). You gain Darkvision with a range of 60 feet (or +60 feet if you already have it).",
  Panther: "You gain a climbing speed equal to your walking speed. You also gain proficiency in Acrobatics or Stealth (or expertise).",
  Salmon: "You gain a swimming speed equal to your walking speed and can breathe underwater. You also gain proficiency in Athletics or Survival (or expertise).",
};

const WEAPON_MASTERY_DICTIONARY: Record<string, string> = {
  "Battleaxe (Topple)":
    "If you hit a creature with this weapon, you can force it to make a Constitution saving throw (DC 8 + PB + ability modifier) or be knocked prone.",
  "Greataxe (Cleave)":
    "If you hit a creature with a melee attack, you can make a second attack against a different creature within 5 feet of the first target and in your reach. The second attack deals the weapon's base damage.",
  "Greatsword (Graze)":
    "If you miss a creature with an attack roll with this weapon, the target takes damage equal to the ability modifier you used for the attack roll.",
  "Halberd (Cleave)":
    "If you hit a creature with a melee attack, you can make a second attack against a different creature within 5 feet of the first target and in your reach. The second attack deals the weapon's base damage.",
  "Longsword (Sap)":
    "If you hit a creature with this weapon, the target has disadvantage on its next attack roll before the start of your next turn.",
  "Maul (Topple)":
    "If you hit a creature with this weapon, you can force it to make a Constitution saving throw (DC 8 + PB + ability modifier) or be knocked prone.",
  "Warhammer (Push)":
    "If you hit a creature with this weapon, you can push it up to 10 feet away from you.",
  "Shortsword (Vex)":
    "If you hit a creature with this weapon, you have advantage on your next attack roll against that creature before the end of your next turn.",
  "Rapier (Vex)":
    "If you hit a creature with this weapon, you have advantage on your next attack roll against that creature before the end of your next turn.",
  "Dagger (Nick)":
    "You can make the additional attack of Light weapon property as part of the Attack action instead of a Bonus Action.",
  "Scimitar (Nick)":
    "You can make the additional attack of Light weapon property as part of the Attack action instead of a Bonus Action.",
  "Longbow (Slow)":
    "If you hit a creature with this weapon, you can reduce its speed by 10 feet until the start of your next turn.",
  "Shortbow (Slow)":
    "If you hit a creature with this weapon, you can reduce its speed by 10 feet until the start of your next turn.",
  "Pistol (Vex)":
    "If you hit a creature with this weapon, you have advantage on your next attack roll against that creature before the end of your next turn.",
  "Musket (Slow)":
    "If you hit a creature with this weapon, you can reduce its speed by 10 feet until the start of your next turn.",
};

function useLocalTotemAspects(
  memberId: number,
  initialAspects: Array<{ name: string; description: string }>,
) {
  const storageKey = `party-stats:totem-aspects:${memberId}`;
  const [aspects, setAspects] = useState<Array<{ name: string; description: string }>>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        return stored === "null" ? [] : JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Failed to load totem aspects from localStorage:", e);
    }
    return initialAspects;
  });

  const updateAspects = (nextAspects: Array<{ name: string; description: string }>) => {
    setAspects(nextAspects);
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextAspects));
    } catch (e) {
      console.warn("Failed to save totem aspects to localStorage:", e);
    }
  };

  return [aspects, updateAspects] as const;
}

function useLocalRage(memberId: number) {
  const storageKey = `party-stats:rage:${memberId}`;
  const [rage, setRage] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        return stored;
      }
    } catch (e) {
      console.warn("Failed to load Rage state from localStorage:", e);
    }
    return "None";
  });

  const updateRage = (nextRage: string) => {
    setRage(nextRage);
    try {
      localStorage.setItem(storageKey, nextRage);
    } catch (e) {
      console.warn("Failed to save Rage state to localStorage:", e);
    }
  };

  return [rage, updateRage] as const;
}

function useLocalMetamagic(
  memberId: number,
  initialMetamagic: Array<{ name: string; description: string }>,
) {
  const storageKey = `party-stats:metamagic:${memberId}`;
  const [metamagic, setMetamagic] = useState<Array<{ name: string; description: string }>>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        return stored === "null" ? [] : JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Failed to load metamagic from localStorage:", e);
    }
    return initialMetamagic;
  });

  const updateMetamagic = (nextMetamagic: Array<{ name: string; description: string }>) => {
    setMetamagic(nextMetamagic);
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextMetamagic));
    } catch (e) {
      console.warn("Failed to save metamagic to localStorage:", e);
    }
  };

  return [metamagic, updateMetamagic] as const;
}

function useLocalWeaponMasteries(
  memberId: number,
  initialMasteries: Array<{ name: string; description: string }>,
) {
  const storageKey = `party-stats:weapon-masteries:${memberId}`;
  const [masteries, setMasteries] = useState<Array<{ name: string; description: string }>>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        return stored === "null" ? [] : JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Failed to load weapon masteries from localStorage:", e);
    }
    return initialMasteries;
  });

  const updateMasteries = (nextMasteries: Array<{ name: string; description: string }>) => {
    setMasteries(nextMasteries);
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextMasteries));
    } catch (e) {
      console.warn("Failed to save weapon masteries to localStorage:", e);
    }
  };

  return [masteries, updateMasteries] as const;
}

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  triggerClassName?: string;
  optionsWidth?: string;
  openUpward?: boolean;
  labelPrefix?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}

function CustomSelect({
  value,
  onChange,
  options,
  triggerClassName,
  optionsWidth = "w-36",
  openUpward = false,
  labelPrefix,
  onOpenChange,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1 cursor-pointer font-bold border-none outline-none focus:outline-none p-0 m-0 text-foreground select-none",
          triggerClassName,
        )}
      >
        {labelPrefix}
        <span>{value}</span>
        <ChevronDown
          size={10}
          className={cn("opacity-70 transition-transform duration-200", isOpen && "rotate-180")}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute left-0 origin-top-left rounded-md border border-border bg-popover shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-in fade-in duration-100 max-h-60 overflow-y-auto",
            openUpward
              ? "bottom-full mb-1.5 slide-in-from-bottom-1"
              : "mt-1 top-full slide-in-from-top-1",
            optionsWidth,
          )}
        >
          <div className="py-1">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-1.5 text-xs hover:bg-secondary/40 transition-colors focus:outline-none block truncate",
                  opt === value
                    ? "text-primary font-bold bg-secondary/25"
                    : "text-muted-foreground",
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function useLocalHpState(
  memberId: number,
  hpMax: number,
  hpCurrentInit: number,
  tempHpInit: number,
  hitDiceStr: string,
  deathSavesInit: { successes: number; failures: number; stabilized: boolean }
) {
  const storageKey = `party-stats:hp:${memberId}`;
  const [localData, setLocalData] = useState<LocalHpData>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          typeof parsed.hpCurrent === "number" &&
          typeof parsed.tempHp === "number" &&
          parsed.spentHitDice
        ) {
          return {
            ...parsed,
            deathSaves: parsed.deathSaves ?? deathSavesInit,
          };
        }
      }
    } catch (e) {
      console.warn("Failed to load HP data from localStorage:", e);
    }
    return {
      hpCurrent: hpCurrentInit,
      tempHp: tempHpInit,
      spentHitDice: {},
      deathSaves: deathSavesInit,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(localData));
    } catch (e) {
      console.warn("Failed to save HP data to localStorage:", e);
    }
  }, [localData, storageKey]);

  const damage = (amount: number) => {
    setLocalData((prev) => {
      let newTemp = prev.tempHp;
      let newHp = prev.hpCurrent;
      let newSuccesses = prev.deathSaves?.successes ?? 0;
      let newFailures = prev.deathSaves?.failures ?? 0;
      let newStabilized = prev.deathSaves?.stabilized ?? false;

      if (newTemp > 0) {
        if (amount <= newTemp) {
          newTemp -= amount;
          amount = 0;
        } else {
          amount -= newTemp;
          newTemp = 0;
        }
      }

      if (amount > 0) {
        if (newHp > 0) {
          newHp = Math.max(0, newHp - amount);
          if (newHp === 0) {
            newSuccesses = 0;
            newFailures = 0;
            newStabilized = false;
          }
        } else {
          newFailures = Math.min(3, newFailures + 1);
        }
      }

      return {
        ...prev,
        hpCurrent: newHp,
        tempHp: newTemp,
        deathSaves: {
          successes: newSuccesses,
          failures: newFailures,
          stabilized: newStabilized,
        },
      };
    });
  };

  const heal = (amount: number) => {
    setLocalData((prev) => {
      const newHp = Math.min(hpMax, prev.hpCurrent + amount);
      const newDeathSaves = newHp > 0
        ? { successes: 0, failures: 0, stabilized: false }
        : (prev.deathSaves ?? { successes: 0, failures: 0, stabilized: false });

      return {
        ...prev,
        hpCurrent: newHp,
        deathSaves: newDeathSaves,
      };
    });
  };

  const setTempHp = (amount: number) => {
    setLocalData((prev) => ({ ...prev, tempHp: Math.max(0, amount) }));
  };

  const setDeathSaveSuccesses = (val: number) => {
    setLocalData((prev) => ({
      ...prev,
      deathSaves: {
        successes: Math.min(3, Math.max(0, val)),
        failures: prev.deathSaves?.failures ?? 0,
        stabilized: val === 3 ? true : (prev.deathSaves?.stabilized ?? false),
      },
    }));
  };

  const setDeathSaveFailures = (val: number) => {
    setLocalData((prev) => ({
      ...prev,
      deathSaves: {
        successes: prev.deathSaves?.successes ?? 0,
        failures: Math.min(3, Math.max(0, val)),
        stabilized: prev.deathSaves?.stabilized ?? false,
      },
    }));
  };

  const setStabilized = (stabilized: boolean) => {
    setLocalData((prev) => ({
      ...prev,
      deathSaves: {
        successes: stabilized ? 3 : (prev.deathSaves?.successes ?? 0),
        failures: stabilized ? 0 : (prev.deathSaves?.failures ?? 0),
        stabilized,
      },
    }));
  };

  const spendHitDie = (die: string, count: number = 1) => {
    const pools = parseHitDice(hitDiceStr);
    const pool = pools.find((p) => p.die === die);
    if (!pool) return;

    setLocalData((prev) => {
      const spent = prev.spentHitDice[die] ?? 0;
      const amountToSpend = Math.min(count, pool.remaining - spent);
      if (amountToSpend <= 0) return prev;
      return {
        ...prev,
        spentHitDice: {
          ...prev.spentHitDice,
          [die]: spent + amountToSpend,
        },
      };
    });
  };

  const regainHitDie = (die: string, count: number = 1) => {
    setLocalData((prev) => {
      const spent = prev.spentHitDice[die] ?? 0;
      const amountToRegain = Math.min(count, spent);
      if (amountToRegain <= 0) return prev;
      return {
        ...prev,
        spentHitDice: {
          ...prev.spentHitDice,
          [die]: spent - amountToRegain,
        },
      };
    });
  };

  const shortRest = (healAmount: number = 0) => {
    setLocalData((prev) => ({
      ...prev,
      hpCurrent: Math.min(hpMax, prev.hpCurrent + healAmount),
    }));
  };

  const longRest = () => {
    setLocalData((prev) => {
      return {
        hpCurrent: hpMax,
        tempHp: 0,
        spentHitDice: {},
        deathSaves: { successes: 0, failures: 0, stabilized: false },
      };
    });
  };

  const reset = () => {
    setLocalData({
      hpCurrent: hpCurrentInit,
      tempHp: tempHpInit,
      spentHitDice: {},
      deathSaves: deathSavesInit,
    });
    localStorage.removeItem(storageKey);
  };

  return {
    hpCurrent: localData.hpCurrent,
    tempHp: localData.tempHp,
    spentHitDice: localData.spentHitDice,
    deathSaves: localData.deathSaves ?? deathSavesInit,
    damage,
    heal,
    setTempHp,
    setDeathSaveSuccesses,
    setDeathSaveFailures,
    setStabilized,
    spendHitDie,
    regainHitDie,
    shortRest,
    longRest,
    reset,
  };
}

interface LocalSlotsData {
  spellSlotsUsed: Record<number, number>;
  pactSlotsUsed: Record<number, number>;
}

function useLocalSpellSlots(
  memberId: number,
  initialSpellSlots: SpellSlotLevel[],
  initialPactSlots: SpellSlotLevel[],
) {
  const storageKey = `party-stats:slots:${memberId}`;
  const [localData, setLocalData] = useState<LocalSlotsData>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.spellSlotsUsed && parsed.pactSlotsUsed) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to load spell slots from localStorage:", e);
    }
    return { spellSlotsUsed: {}, pactSlotsUsed: {} };
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(localData));
    } catch (e) {
      console.warn("Failed to save spell slots to localStorage:", e);
    }
  }, [localData, storageKey]);

  const toggleSlot = (level: number, index: number, isPact: boolean) => {
    setLocalData((prev) => {
      const usedMap = { ...(isPact ? prev.pactSlotsUsed : prev.spellSlotsUsed) };
      const maxSlots =
        (isPact ? initialPactSlots : initialSpellSlots).find((s) => s.level === level)?.max ?? 0;
      const currentUsedOnServer =
        (isPact ? initialPactSlots : initialSpellSlots).find((s) => s.level === level)?.used ?? 0;

      const prevUsed = usedMap[level] ?? currentUsedOnServer;
      const available = maxSlots - prevUsed;
      let newUsed = prevUsed;
      if (index < available) {
        newUsed = Math.min(maxSlots, prevUsed + 1);
      } else {
        newUsed = Math.max(0, prevUsed - 1);
      }

      return {
        ...prev,
        [isPact ? "pactSlotsUsed" : "spellSlotsUsed"]: {
          ...usedMap,
          [level]: newUsed,
        },
      };
    });
  };

  const restSlots = (isLongRest: boolean) => {
    setLocalData((prev) => {
      const newSpellSlots = { ...prev.spellSlotsUsed };
      const newPactSlots = { ...prev.pactSlotsUsed };

      if (isLongRest) {
        initialSpellSlots.forEach((s) => {
          newSpellSlots[s.level] = 0;
        });
        initialPactSlots.forEach((s) => {
          newPactSlots[s.level] = 0;
        });
      } else {
        initialPactSlots.forEach((s) => {
          newPactSlots[s.level] = 0;
        });
      }

      return {
        spellSlotsUsed: newSpellSlots,
        pactSlotsUsed: newPactSlots,
      };
    });
  };

  const reset = () => {
    setLocalData({ spellSlotsUsed: {}, pactSlotsUsed: {} });
    localStorage.removeItem(storageKey);
  };

  const getEffectiveSlots = (slots: SpellSlotLevel[], isPact: boolean) => {
    return slots.map((s) => {
      const localUsed = (isPact ? localData.pactSlotsUsed : localData.spellSlotsUsed)[s.level];
      return {
        level: s.level,
        max: s.max,
        used: localUsed !== undefined ? localUsed : s.used,
      };
    });
  };

  return {
    spellSlots: getEffectiveSlots(initialSpellSlots, false),
    pactSlots: getEffectiveSlots(initialPactSlots, true),
    toggleSlot,
    restSlots,
    reset,
  };
}

function getActivationText(activation?: {
  activationTime: number | null;
  activationType: number;
}): string {
  if (!activation) return "";
  const type = activation.activationType;
  if (type === 1) return "Action";
  if (type === 3) return "Bonus Action";
  if (type === 4) return "Reaction";
  if (type === 6) return "Min";
  if (type === 7) return "Hr";
  return `Type ${type}`;
}

function getRangeText(range?: {
  origin: string;
  rangeValue: number | null;
  aoeType: string | null;
  aoeValue: number | null;
}): string {
  if (!range) return "";
  const origin = range.origin || "";
  const val = range.rangeValue ? `${range.rangeValue} ft` : "";
  const aoe = range.aoeType && range.aoeValue ? ` (${range.aoeValue}-foot ${range.aoeType})` : "";

  if (origin === "Ranged") {
    return val + aoe;
  }
  if (origin === "Self" && aoe) {
    return `Self${aoe}`;
  }
  if (val) {
    return `${origin} (${val})${aoe}`;
  }
  return origin + aoe;
}

function getDurationText(
  duration?: { durationType: string; durationInterval: number | null; durationUnit: string | null },
  concentration?: boolean,
): string {
  if (!duration) return "";
  let text = duration.durationType || "";
  if (duration.durationType === "Time" && duration.durationInterval && duration.durationUnit) {
    text = `${duration.durationInterval} ${duration.durationUnit}${duration.durationInterval > 1 ? "s" : ""}`;
  } else if (
    duration.durationType === "Concentration" &&
    duration.durationInterval &&
    duration.durationUnit
  ) {
    text = `Conc, up to ${duration.durationInterval} ${duration.durationUnit}${duration.durationInterval > 1 ? "s" : ""}`;
  }
  if (concentration && !text.toLowerCase().includes("conc")) {
    text = `Conc, ${text}`;
  }
  return text;
}

function getComponentsText(components?: number[], desc?: string): string {
  if (!components || components.length === 0) return "";
  const parts: string[] = [];
  if (components.includes(1)) parts.push("V");
  if (components.includes(2)) parts.push("S");
  if (components.includes(3)) parts.push("M");
  let text = parts.join(", ");
  if (desc && components.includes(3)) {
    text += ` (${desc})`;
  }
  return text;
}

interface LocalResourcesData {
  spent: Record<string, number>;
}

function useLocalResourcesState(memberId: number, initialActions: ActionInfo[]) {
  const storageKey = `party-stats:resources:${memberId}`;
  const [localData, setLocalData] = useState<LocalResourcesData>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.spent) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to load class resources from localStorage:", e);
    }
    return { spent: {} };
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(localData));
    } catch (e) {
      console.warn("Failed to save class resources to localStorage:", e);
    }
  }, [localData, storageKey]);

  const useResource = (name: string, max: number) => {
    setLocalData((prev) => {
      const currentSpent = prev.spent[name] ?? 0;
      if (currentSpent >= max) return prev;
      return {
        spent: {
          ...prev.spent,
          [name]: currentSpent + 1,
        },
      };
    });
  };

  const regainResource = (name: string) => {
    setLocalData((prev) => {
      const currentSpent = prev.spent[name] ?? 0;
      if (currentSpent <= 0) return prev;
      return {
        spent: {
          ...prev.spent,
          [name]: currentSpent - 1,
        },
      };
    });
  };

  const toggleResourceBubble = (name: string, index: number, max: number) => {
    setLocalData((prev) => {
      const currentSpent = prev.spent[name] ?? 0;
      const remaining = max - currentSpent;
      let newSpent = currentSpent;
      if (index < remaining) {
        newSpent = Math.min(max, currentSpent + 1);
      } else {
        newSpent = Math.max(0, currentSpent - 1);
      }
      return {
        spent: {
          ...prev.spent,
          [name]: newSpent,
        },
      };
    });
  };

  const restResources = (isLongRest: boolean) => {
    setLocalData((prev) => {
      const nextSpent = { ...prev.spent };
      initialActions.forEach((a) => {
        const u = a.uses;
        if (!u) return;
        const resetType = u.reset ? u.reset.toLowerCase() : "";
        const isShortRestResource =
          resetType.includes("short") || resetType === "rest" || resetType.includes("combat");
        const shouldReset = isLongRest || isShortRestResource;
        if (shouldReset) {
          nextSpent[a.name] = 0;
        }
      });
      return { spent: nextSpent };
    });
  };

  const reset = () => {
    setLocalData({ spent: {} });
    localStorage.removeItem(storageKey);
  };

  const getEffectiveResource = (a: ActionInfo) => {
    if (!a.uses) return a;
    const spent = localData.spent[a.name] ?? 0;
    const current = Math.max(0, a.uses.max - spent);
    return {
      ...a,
      uses: {
        ...a.uses,
        current,
        spent,
      },
    };
  };

  return {
    spent: localData.spent,
    useResource,
    regainResource,
    toggleResourceBubble,
    restResources,
    reset,
    getEffectiveResource,
  };
}

function Panel({
  title,
  icon: Icon,
  children,
  className = "",
  padding = "p-5",
}: {
  title?: React.ReactNode;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
  className?: string;
  padding?: string;
}) {
  return (
    <section
      className={`card-arcane card-arcane-hover rounded-xl border border-border/40 ${padding} shadow-lg ${className}`}
    >
      {title && (
        <div className={cn(
          "flex items-center gap-2 font-bold uppercase tracking-widest text-accent text-glow-accent border-b border-border/20 select-none",
          padding.includes("p-5") ? "mb-4.5 pb-3 text-xs" : "mb-2.5 pb-2 text-[10px]"
        )}>
          {Icon && <Icon size={13} className="text-accent animate-pulse" />}
          <span>{title}</span>
        </div>
      )}
      {children}
    </section>
  );
}

function DetailStat({
  label,
  value,
  icon: Icon,
  iconClassName,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  iconClassName?: string;
}) {
  return (
    <div className="group rounded-xl border border-border/40 bg-secondary/35 px-2.5 py-3 transition-all duration-300 hover:border-accent/40 hover:bg-secondary/60 relative overflow-hidden flex flex-col min-h-[72px] hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/5 text-center">
      <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none">
        {Icon && (
          <Icon
            size={11}
            className={cn("text-accent/80 shrink-0", iconClassName)}
          />
        )}
        <span>{label}</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center mt-1.5">
        <div className="font-heading text-2xl font-extrabold text-foreground leading-none">
          {value}
        </div>
      </div>
    </div>
  );
}

function DieSvg({
  die,
  className,
  active,
}: {
  die: string;
  className?: string;
  active?: boolean;
}) {
  const normDie = die.toLowerCase();
  
  // Outer colors and strokes
  const activeColor = "var(--accent)";
  const strokeColor = active ? activeColor : "currentColor";
  const strokeWidth = "1.5";
  const fillOpacity = active ? "0.15" : "0";
  const lineOpacity = active ? "0.8" : "0.3";

  let content = null;

  if (normDie === "d4") {
    content = (
      <>
        <polygon
          points="50,12 90,83 10,83"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill={active ? activeColor : "none"}
          fillOpacity={fillOpacity}
          strokeLinejoin="round"
        />
        <line x1="50" y1="58" x2="50" y2="12" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} strokeLinecap="round" />
        <line x1="50" y1="58" x2="90" y2="83" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} strokeLinecap="round" />
        <line x1="50" y1="58" x2="10" y2="83" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} strokeLinecap="round" />
        <text
          x="50"
          y="74"
          textAnchor="middle"
          fontSize="18"
          fontWeight="bold"
          fontFamily="monospace"
          fill={active ? activeColor : "currentColor"}
          opacity={active ? "1" : "0.5"}
        >
          4
        </text>
      </>
    );
  } else if (normDie === "d6") {
    content = (
      <>
        <polygon
          points="50,12 85,32 85,72 50,92 15,72 15,32"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill={active ? activeColor : "none"}
          fillOpacity={fillOpacity}
          strokeLinejoin="round"
        />
        <line x1="50" y1="52" x2="50" y2="12" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} strokeLinecap="round" />
        <line x1="50" y1="52" x2="85" y2="72" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} strokeLinecap="round" />
        <line x1="50" y1="52" x2="15" y2="72" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} strokeLinecap="round" />
        <line x1="15" y1="32" x2="50" y2="52" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} strokeLinecap="round" />
        <line x1="85" y1="32" x2="50" y2="52" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} strokeLinecap="round" />
        <text
          x="50"
          y="56"
          textAnchor="middle"
          fontSize="18"
          fontWeight="bold"
          fontFamily="monospace"
          fill={active ? activeColor : "currentColor"}
          opacity={active ? "1" : "0.5"}
        >
          6
        </text>
      </>
    );
  } else if (normDie === "d8") {
    content = (
      <>
        <polygon
          points="50,12 85,52 50,92 15,52"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill={active ? activeColor : "none"}
          fillOpacity={fillOpacity}
          strokeLinejoin="round"
        />
        <line x1="15" y1="52" x2="85" y2="52" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} strokeLinecap="round" />
        <line x1="50" y1="12" x2="50" y2="92" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} strokeLinecap="round" />
        <line x1="15" y1="52" x2="50" y2="35" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} />
        <line x1="85" y1="52" x2="50" y2="35" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} />
        <line x1="15" y1="52" x2="50" y2="69" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} />
        <line x1="85" y1="52" x2="50" y2="69" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} />
        <text
          x="50"
          y="56"
          textAnchor="middle"
          fontSize="18"
          fontWeight="bold"
          fontFamily="monospace"
          fill={active ? activeColor : "currentColor"}
          opacity={active ? "1" : "0.5"}
        >
          8
        </text>
      </>
    );
  } else if (normDie === "d10") {
    content = (
      <>
        <polygon
          points="50,10 85,38 85,62 50,90 15,62 15,38"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill={active ? activeColor : "none"}
          fillOpacity={fillOpacity}
          strokeLinejoin="round"
        />
        <line x1="50" y1="52" x2="50" y2="10" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} strokeLinecap="round" />
        <line x1="50" y1="52" x2="85" y2="38" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} strokeLinecap="round" />
        <line x1="50" y1="52" x2="85" y2="62" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} strokeLinecap="round" />
        <line x1="50" y1="52" x2="50" y2="90" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} strokeLinecap="round" />
        <line x1="50" y1="52" x2="15" y2="62" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} strokeLinecap="round" />
        <line x1="50" y1="52" x2="15" y2="38" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} strokeLinecap="round" />
        <text
          x="50"
          y="56"
          textAnchor="middle"
          fontSize="16"
          fontWeight="bold"
          fontFamily="monospace"
          fill={active ? activeColor : "currentColor"}
          opacity={active ? "1" : "0.5"}
        >
          10
        </text>
      </>
    );
  } else if (normDie === "d12") {
    content = (
      <>
        <polygon
          points="50,10 88,38 74,82 26,82 12,38"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill={active ? activeColor : "none"}
          fillOpacity={fillOpacity}
          strokeLinejoin="round"
        />
        <polygon
          points="50,42 68,55 61,76 39,76 32,55"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
          opacity={lineOpacity}
          strokeLinejoin="round"
        />
        <line x1="50" y1="10" x2="50" y2="42" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} strokeLinecap="round" />
        <line x1="88" y1="38" x2="68" y2="55" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} strokeLinecap="round" />
        <line x1="74" y1="82" x2="61" y2="76" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} strokeLinecap="round" />
        <line x1="26" y1="82" x2="39" y2="76" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} strokeLinecap="round" />
        <line x1="12" y1="38" x2="32" y2="55" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} strokeLinecap="round" />
        <text
          x="50"
          y="62"
          textAnchor="middle"
          fontSize="15"
          fontWeight="bold"
          fontFamily="monospace"
          fill={active ? activeColor : "currentColor"}
          opacity={active ? "1" : "0.5"}
        >
          12
        </text>
      </>
    );
  } else {
    content = (
      <>
        <polygon
          points="50,10 85,30 85,70 50,90 15,70 15,30"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill={active ? activeColor : "none"}
          fillOpacity={fillOpacity}
          strokeLinejoin="round"
        />
        <polygon
          points="32,37 68,37 50,68"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
          opacity={lineOpacity}
          strokeLinejoin="round"
        />
        <line x1="32" y1="37" x2="50" y2="10" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} strokeLinecap="round" />
        <line x1="32" y1="37" x2="15" y2="30" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} strokeLinecap="round" />
        <line x1="32" y1="37" x2="15" y2="70" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} strokeLinecap="round" />
        <line x1="68" y1="37" x2="50" y2="10" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} strokeLinecap="round" />
        <line x1="68" y1="37" x2="85" y2="30" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} strokeLinecap="round" />
        <line x1="68" y1="37" x2="85" y2="70" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} strokeLinecap="round" />
        <line x1="50" y1="68" x2="15" y2="70" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} strokeLinecap="round" />
        <line x1="50" y1="68" x2="50" y2="90" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} strokeLinecap="round" />
        <line x1="50" y1="68" x2="85" y2="70" stroke={strokeColor} strokeWidth={strokeWidth} opacity={lineOpacity} strokeLinecap="round" />
        <text
          x="50"
          y="53"
          textAnchor="middle"
          fontSize="14"
          fontWeight="bold"
          fontFamily="monospace"
          fill={active ? activeColor : "currentColor"}
          opacity={active ? "1" : "0.5"}
        >
          20
        </text>
      </>
    );
  }

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("w-full h-full select-none pointer-events-none transition-transform duration-300", className)}
    >
      {content}
    </svg>
  );
}

export function CharacterDetailView({ member }: { member: PartyMember }) {
  const [activeLayout, setActiveLayout] = useState<"classic" | "sticky" | "tabbed" | "widescreen">(() => {
    try {
      const stored = localStorage.getItem("party-stats:detail-layout");
      if (stored === "classic" || stored === "sticky" || stored === "tabbed" || stored === "widescreen") {
        return stored;
      }
    } catch {}
    return "tabbed";
  });
  const [activeTab, setActiveTab] = useState<
    "combat" | "spells" | "skills" | "features" | "gear" | "bio" | "companions"
  >("skills");
  const [bulkCounts, setBulkCounts] = useState<Record<string, number>>({});
  const [hpInputVal, setHpInputVal] = useState("");
  const [tempHpInputVal, setTempHpInputVal] = useState("");
  const [showHpControl, setShowHpControl] = useState(false);
  const [restModal, setRestModal] = useState<{ type: "short" | "long" } | null>(null);
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const [shortRestHealInput, setShortRestHealInput] = useState("0");
  const [shortRestDiceSpend, setShortRestDiceSpend] = useState<Record<string, number>>({});
  const [spellSearch, setSpellSearch] = useState("");
  const [spellLevelFilter, setSpellLevelFilter] = useState<number | "all">("all");
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [featureSearch, setFeatureSearch] = useState("");
  const [featureFilter, setFeatureFilter] = useState<"all" | "class" | "race" | "feat">("all");
  const [isAspectSelectOpen, setIsAspectSelectOpen] = useState(false);
  const [isRageSelectOpen, setIsRageSelectOpen] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const {
    list: localConditions,
    add: addLocalCondition,
    remove: removeLocalCondition,
    tick: tickLocalCondition,
    clear: clearLocalConditions,
  } = useCharacterConditions(member.id);

  const isArmorer =
    member.subclasses.some((s) => s.toLowerCase().includes("armorer")) ||
    member.activeArmorModel !== null;

  const isBarbarian =
    member.classes.toLowerCase().includes("barbarian") ||
    (member.totemAspects && member.totemAspects.length > 0);

  const localHp = useLocalHpState(
    member.id,
    member.hpMax,
    member.hpCurrent,
    member.tempHp,
    member.hitDice,
    member.deathSaves,
  );

  const [localArmorModel, setLocalArmorModel] = useLocalArmorModel(
    member.id,
    member.activeArmorModel,
  );

  const [localTotemAspects, setLocalTotemAspects] = useLocalTotemAspects(
    member.id,
    member.totemAspects || [],
  );

  const [localRage, setLocalRage] = useLocalRage(member.id);

  const rageOptions = (() => {
    const hasRageOfTheWilds = (member.features ?? []).some((f) => f.name === "Rage of the Wilds");
    if (hasRageOfTheWilds) {
      return ["None", "Bear", "Eagle", "Wolf"];
    }
    return ["None", "Bear", "Eagle", "Elk", "Tiger", "Wolf"];
  })();

  const [localMetamagic, setLocalMetamagic] = useLocalMetamagic(member.id, member.metamagic || []);

  const [localWeaponMasteries, setLocalWeaponMasteries] = useLocalWeaponMasteries(
    member.id,
    member.weaponMasteries || [],
  );

  const [localActiveInfusions, toggleLocalActiveInfusion, setLocalActiveInfusions] = useLocalActiveInfusions(
    member.id,
    member.activeInfusions || [],
  );

  useEffect(() => {
    if (member.activeInfusions) {
      setLocalActiveInfusions(member.activeInfusions);
      try {
        const storageKey = `party-stats:active-infusions:${member.id}`;
        localStorage.setItem(storageKey, JSON.stringify(member.activeInfusions));
      } catch (e) {
        console.warn(e);
      }
    }
  }, [member.activeInfusions, member.id, setLocalActiveInfusions]);

  const artificerLevel = (() => {
    const match = member.classes.match(/Artificer\s+(\d+)/i);
    return match ? parseInt(match[1], 10) : 0;
  })();

  const maxActiveInfusions = (() => {
    if (artificerLevel >= 18) return 6;
    if (artificerLevel >= 15) return 5;
    if (artificerLevel >= 11) return 4;
    if (artificerLevel >= 6) return 3;
    if (artificerLevel >= 2) return 2;
    return 0;
  })();

  const localSlots = useLocalSpellSlots(member.id, member.spellSlots, member.pactSlots);

  const displayActions = (() => {
    let list = [...(member.actions ?? [])];
    list = list.filter(
      (a) =>
        !a.name.toLowerCase().includes("defensive field") &&
        !a.name.toLowerCase().includes("dampening field"),
    );
    if (isArmorer) {
      if (localArmorModel === "Guardian") {
        list.push({
          name: "Defensive Field",
          source: "class",
          description: "As a bonus action, you can gain temporary hit points equal to your level. You can use this a number of times equal to your proficiency bonus per long rest.",
          activation: {
            activationTime: 1,
            activationType: 3, // Bonus Action
          },
          uses: {
            current: member.proficiencyBonus,
            max: member.proficiencyBonus,
            reset: "long rest",
          },
        });
      } else if (localArmorModel === "Infiltrator") {
        list.push({
          name: "Dampening Field (Stealth Advantage)",
          source: "class",
          description: "You have advantage on Dexterity (Stealth) checks. If you wear heavy armor, that armor doesn't impose disadvantage on your Dexterity (Stealth) checks.",
        });
      }
    }
    return list;
  })();

  const displayAttacks = (() => {
    let list = [...(member.attacks ?? [])];
    list = list.filter(
      (a) =>
        !a.name.toLowerCase().includes("thunder gauntlet") &&
        !a.name.toLowerCase().includes("lightning launcher"),
    );
    if (isArmorer) {
      const intMod = member.abilities.find((a) => a.name === "INT")?.modifier ?? 0;
      const pb = member.proficiencyBonus;
      if (localArmorModel === "Guardian") {
        list.push({
          name: "Thunder Gauntlets (Guardian)",
          attackBonus: intMod + pb,
          damage: `1d8 + ${intMod}`,
          damageType: "Thunder",
          properties: ["Melee", "Simple", "Guardian Armor"],
          isWeapon: true,
        });
      } else if (localArmorModel === "Infiltrator") {
        list.push({
          name: "Lightning Launcher (Infiltrator)",
          attackBonus: intMod + pb,
          damage: `1d6 + ${intMod}`,
          damageType: "Lightning",
          properties: ["Ranged (90/300)", "Simple", "Infiltrator Armor", "Once on turn +1d6"],
          isWeapon: true,
        });
      }
    }

    // Map Weapon Masteries onto weapon attacks
    if (localWeaponMasteries && localWeaponMasteries.length > 0) {
      list = list.map((a) => {
        if (!a.isWeapon) return a;

        // Find matching weapon mastery
        const matchingMastery = localWeaponMasteries.find((m) => {
          const idx = m.name.indexOf(" (");
          if (idx === -1) return false;
          const weaponName = m.name.substring(0, idx).toLowerCase();
          return a.name.toLowerCase().includes(weaponName);
        });

        if (matchingMastery) {
          const idx = matchingMastery.name.indexOf(" (");
          const masteryProp = matchingMastery.name.substring(
            idx + 2,
            matchingMastery.name.length - 1,
          );
          const currentProps = a.properties ?? [];
          if (!currentProps.includes(masteryProp)) {
            return {
              ...a,
              properties: [...currentProps, masteryProp],
            };
          }
        }
        return a;
      });
    }

    // Add dynamic Rage damage bonus
    if (isBarbarian && localRage !== "None") {
      const barbarianLvl = (() => {
        const match = member.classes.match(/Barbarian\s+(\d+)/i);
        return match ? parseInt(match[1], 10) : member.level;
      })();
      const rageDamageBonus = barbarianLvl >= 16 ? 4 : barbarianLvl >= 9 ? 3 : 2;

      list = list.map((a) => {
        const isMelee = a.properties?.some((p) => p.toLowerCase() === "melee") || a.name.toLowerCase().includes("unarmed") || a.name.toLowerCase().includes("strike");
        if (isMelee && a.damage) {
          return {
            ...a,
            damage: `${a.damage} + ${rageDamageBonus}`,
            properties: [...(a.properties ?? []), `+${rageDamageBonus} Rage dmg`],
          };
        }
        return a;
      });
    }

    return list;
  })();

  const localResources = useLocalResourcesState(
    member.id,
    displayActions.filter((a) => a.source === "class" && a.uses),
  );

  const mods = getFullyModifiedStats(member);
  const {
    ac,
    speed,
    acNotes,
    speedNotes,
    senses: displaySenses,
    carryingCapacity: displayCarryingCapacity,
    specialSpeeds: displaySpecialSpeeds,
    hitDice: displayHitDice,
    defenses: displayDefenses,
  } = mods;

  const hpPct = member.hpMax > 0 ? Math.min(100, (localHp.hpCurrent / member.hpMax) * 100) : 0;
  const hpColor = hpPct > 60 ? "bg-hp-good" : hpPct > 25 ? "bg-hp-wounded" : "bg-hp-critical";
  const hpGlow =
    hpPct > 60
      ? "shadow-[0_0_10px_color-mix(in_oklab,var(--hp-good)_70%,transparent)]"
      : hpPct > 25
        ? "shadow-[0_0_10px_color-mix(in_oklab,var(--hp-wounded)_70%,transparent)]"
        : "shadow-[0_0_14px_color-mix(in_oklab,var(--hp-critical)_80%,transparent)] animate-pulse";

  const [animHpPct, setAnimHpPct] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimHpPct(hpPct), 50);
    return () => clearTimeout(t);
  }, [hpPct]);

  const prevHpRef = useRef<number>(localHp.hpCurrent);
  const [delta, setDelta] = useState<{ value: number; key: number } | null>(null);
  useEffect(() => {
    const prev = prevHpRef.current;
    if (prev !== localHp.hpCurrent) {
      const diff = localHp.hpCurrent - prev;
      if (diff !== 0) setDelta({ value: diff, key: Date.now() });
      prevHpRef.current = localHp.hpCurrent;
    }
  }, [localHp.hpCurrent]);

  const classChips = member.classes
    .split(/\s*\/\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

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

  const hasFeralInstinct =
    member.features?.some((f) => f.name.toLowerCase().includes("feral instinct")) ?? false;
  const hasDangerSense =
    member.features?.some((f) => f.name.toLowerCase().includes("danger sense")) ?? false;

  const initEffects = (() => {
    const list: Array<{ type: "adv" | "dis"; text: string }> = [];
    if (hasFeralInstinct) {
      list.push({ type: "adv", text: "Feral Instinct: Advantage on Initiative checks." });
    }
    const allFeatures = [...(member.features ?? []), ...(member.feats ?? [])];
    for (const f of allFeatures) {
      const descLower = (f.description ?? "").toLowerCase();
      if (descLower.includes("advantage on initiative")) {
        if (!hasFeralInstinct || !f.name.toLowerCase().includes("feral instinct")) {
          list.push({ type: "adv", text: `${f.name}: Advantage on Initiative checks.` });
        }
      }
    }
    return list;
  })();

  const hasInitAdv = initEffects.some((e) => e.type === "adv");
  const hasInitDis = initEffects.some((e) => e.type === "dis");

  const initBadges = (() => {
    const badges = [];
    if (hasInitAdv) {
      badges.push({ type: "adv" as const, label: "Adv" });
    }
    if (hasInitDis) {
      badges.push({ type: "dis" as const, label: "Dis" });
    }
    return badges;
  })();

  // Dynamically detect saving throw advantages/disadvantages from features
  const saveEffects = (() => {
    const effects: Record<
      string,
      Array<{ type: "adv" | "dis"; label: string; text: string; source: string }>
    > = {
      STR: [],
      DEX: [],
      CON: [],
      INT: [],
      WIS: [],
      CHA: [],
    };

    const allFeatures = [...(member.features ?? []), ...(member.feats ?? [])];

    for (const f of allFeatures) {
      const descLower = (f.description ?? "").toLowerCase();

      // Check for specific saving throw advantages
      const abilities = [
        "Strength",
        "Dexterity",
        "Constitution",
        "Intelligence",
        "Wisdom",
        "Charisma",
      ];
      const abls = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

      abilities.forEach((ability, idx) => {
        const abl = abls[idx];
        const regexStr = new RegExp(
          `advantage on\\s+(?:[\\w\\s]+)?${ability.toLowerCase()}\\s+saving\\s+throw`,
          "i",
        );
        const match = descLower.match(regexStr);
        if (match) {
          effects[abl].push({
            type: "adv",
            label: "Adv",
            text: `${f.name}: Advantage on ${ability} saving throws.`,
            source: f.name,
          });
        }
      });

      // Check for situational saving throw advantages/disadvantages
      if (
        descLower.includes("advantage on saving throws") ||
        descLower.includes("advantage on all saving throws")
      ) {
        const hasIntel = descLower.includes("intelligence");
        const hasWis = descLower.includes("wisdom");
        const hasChar = descLower.includes("charisma");
        const hasStren = descLower.includes("strength");
        const hasDext = descLower.includes("dexterity");
        const hasConst = descLower.includes("constitution");

        if (hasIntel || hasWis || hasChar || hasStren || hasDext || hasConst) {
          if (hasStren)
            effects.STR.push({
              type: "adv",
              label: "Adv*",
              text: `${f.name}: Situational advantage on Strength saving throws.`,
              source: f.name,
            });
          if (hasDext)
            effects.DEX.push({
              type: "adv",
              label: "Adv*",
              text: `${f.name}: Situational advantage on Dexterity saving throws.`,
              source: f.name,
            });
          if (hasConst)
            effects.CON.push({
              type: "adv",
              label: "Adv*",
              text: `${f.name}: Situational advantage on Constitution saving throws.`,
              source: f.name,
            });
          if (hasIntel)
            effects.INT.push({
              type: "adv",
              label: "Adv*",
              text: `${f.name}: Situational advantage on Intelligence saving throws.`,
              source: f.name,
            });
          if (hasWis)
            effects.WIS.push({
              type: "adv",
              label: "Adv*",
              text: `${f.name}: Situational advantage on Wisdom saving throws.`,
              source: f.name,
            });
          if (hasChar)
            effects.CHA.push({
              type: "adv",
              label: "Adv*",
              text: `${f.name}: Situational advantage on Charisma saving throws.`,
              source: f.name,
            });
        } else {
          const cleanText =
            f.description
              .replace(/<[^>]*>/g, "")
              .trim()
              .substring(0, 150) + "...";
          abls.forEach((abl) => {
            effects[abl].push({
              type: "adv",
              label: "Adv*",
              text: `${f.name}: ${cleanText}`,
              source: f.name,
            });
          });
        }
      }

      if (
        descLower.includes("saving throws") &&
        (descLower.includes("avoid or end the charmed") ||
          descLower.includes("against being charmed"))
      ) {
        effects.WIS.push({
          type: "adv",
          label: "Adv*",
          text: `${f.name}: Advantage on saving throws to avoid or end the Charmed condition.`,
          source: f.name,
        });
      }
      if (
        descLower.includes("saving throws") &&
        (descLower.includes("against poison") || descLower.includes("poisoned"))
      ) {
        effects.CON.push({
          type: "adv",
          label: "Adv*",
          text: `${f.name}: Advantage on saving throws against poison.`,
          source: f.name,
        });
      }
    }

    if (isBarbarian && hasDangerSense) {
      const alreadyHasDangerSense = effects.DEX.some((e) =>
        e.source.toLowerCase().includes("danger sense"),
      );
      if (!alreadyHasDangerSense) {
        effects.DEX.push({
          type: "adv",
          label: "Adv",
          text: "Danger Sense: Advantage on Dexterity saving throws against effects you can see.",
          source: "Danger Sense",
        });
      }
    }

    if (isBarbarian && localRage !== "None") {
      effects.STR.push({
        type: "adv",
        label: "Adv",
        text: "Rage: Advantage on Strength saving throws.",
        source: "Rage",
      });
    }

    return effects;
  })();

  // Dynamically detect skill advantages/disadvantages from features
  const skillEffects = (() => {
    const effects: Record<
      string,
      Array<{ type: "adv" | "dis"; label: string; text: string; source: string }>
    > = {};

    const allFeatures = [...(member.features ?? []), ...(member.feats ?? [])];

    for (const f of allFeatures) {
      const descLower = (f.description ?? "").toLowerCase();

      displaySkills.forEach((s) => {
        const skillName = s.name.toLowerCase();
        const regexStr = new RegExp(
          `advantage on\\s+(?:[\\w\\s\\(\\)]+)?${skillName}\\s+checks`,
          "i",
        );
        if (descLower.match(regexStr)) {
          if (!effects[s.key]) effects[s.key] = [];
          effects[s.key].push({
            type: "adv",
            label: "Adv",
            text: `${f.name}: Advantage on ${s.name} checks.`,
            source: f.name,
          });
        }
      });
    }

    if (isArmorer && localArmorModel === "Infiltrator") {
      if (!effects.stealth) effects.stealth = [];
      effects.stealth.push({
        type: "adv",
        label: "Adv",
        text: "Infiltrator Armor (Dampening Field): Advantage on Stealth checks.",
        source: "Infiltrator Armor",
      });
    }

    const hasHeavyArmor = member.inventory.some(
      (item) =>
        item.equipped &&
        item.type.toLowerCase().includes("armor") &&
        (item.name.toLowerCase().includes("plate") ||
          item.name.toLowerCase().includes("chain mail") ||
          item.name.toLowerCase().includes("splint") ||
          item.name.toLowerCase().includes("scale mail") ||
          item.name.toLowerCase().includes("ring mail") ||
          item.name.toLowerCase().includes("half plate")),
    );
    if (hasHeavyArmor) {
      if (!effects.stealth) effects.stealth = [];
      effects.stealth.push({
        type: "dis",
        label: "Dis",
        text: "Equipped Heavy/Medium Armor: Disadvantage on Stealth checks.",
        source: "Equipped Armor",
      });
    }

    if (isBarbarian && localTotemAspects[0]?.name === "Bear") {
      if (!effects.athletics) effects.athletics = [];
      effects.athletics.push({
        type: "adv",
        label: "Adv",
        text: "Bear Totem Aspect: Advantage on Strength (Athletics) checks to push, pull, lift, or break things.",
        source: "Bear Totem Aspect",
      });
    }

    if (isBarbarian && localTotemAspects[0]?.name === "Eagle") {
      if (!effects.perception) effects.perception = [];
      effects.perception.push({
        type: "adv",
        label: "Adv",
        text: "Eagle Totem Aspect: Dim light doesn't impose disadvantage on Perception checks.",
        source: "Eagle Totem Aspect",
      });
    }

    if (isBarbarian && localRage !== "None") {
      if (!effects.athletics) effects.athletics = [];
      effects.athletics.push({
        type: "adv",
        label: "Adv",
        text: "Rage: Advantage on Strength checks.",
        source: "Rage",
      });
    }

    return effects;
  })();

  // === HERO ===
  const getAvatarRingClass = (pct: number) => {
    if (pct <= 25)
      return "ring-4 ring-destructive/80 shadow-[0_0_20px_var(--hp-critical)] animate-pulse";
    if (pct <= 60) return "ring-4 ring-amber-500/60 shadow-[0_0_16px_rgba(245,158,11,0.4)]";
    return "ring-4 ring-primary/50 shadow-[0_0_16px_rgba(109,40,217,0.35)] border-glow-primary";
  };
  const avatarRing = getAvatarRingClass(hpPct);

  const heroContent = (
    <div className="flex flex-col items-start gap-5 md:flex-row">
      {member.avatarUrl ? (
        <a
          href={member.readonlyUrl}
          target="_blank"
          rel="noreferrer"
          className={`block h-32 w-32 flex-shrink-0 rounded-[28%] overflow-hidden transition-all duration-300 hover:scale-105 ${avatarRing}`}
        >
          <img
            src={member.avatarUrl}
            alt={member.name}
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-110"
          />
        </a>
      ) : (
        <div
          className={`h-32 w-32 flex-shrink-0 rounded-[28%] border border-border bg-muted ${avatarRing}`}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <a
            href={member.readonlyUrl}
            target="_blank"
            rel="noreferrer"
            className="font-heading text-3xl font-extrabold text-gradient-arcane text-glow-accent hover:underline"
          >
            {member.name}
          </a>
          {member.inspiration && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help shrink-0">
                  <Star
                    size={18}
                    className="text-gold fill-gold drop-shadow-[0_0_8px_color-mix(in_oklab,var(--gold)_80%,transparent)] animate-pulse"
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent>Inspiration</TooltipContent>
            </Tooltip>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {member.race}
          {member.background ? (
            <span className="text-muted-foreground/70"> • {member.background}</span>
          ) : null}
          {member.alignment ? (
            <span className="text-muted-foreground/70"> • {member.alignment}</span>
          ) : null}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {classChips.map((c) => (
            <span
              key={c}
              className="rounded border border-accent/40 bg-accent/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-accent"
            >
              {c}
            </span>
          ))}
          {member.subclasses.map((sc) => (
            <span
              key={sc}
              className="rounded border border-border bg-secondary/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {sc}
            </span>
          ))}
          {isBarbarian && (() => {
            const isTotemBarbarian = member.subclasses.some(
              (s) => s.toLowerCase().includes("wild heart") || s.toLowerCase().includes("totem")
            );
            if (!isTotemBarbarian) return null;

            const aspectOptions = (() => {
              const hasAspectOfTheWilds = (member.features ?? []).some((f) => f.name === "Aspect of the Wilds");
              if (hasAspectOfTheWilds) {
                return ["Owl", "Panther", "Salmon"];
              }
              return ["Bear", "Eagle", "Elk", "Tiger", "Wolf"];
            })();

            return (
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {/* Totem Aspect Dropdown */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="inline-block">
                      <CustomSelect
                        value={localTotemAspects[0]?.name || "None"}
                        onChange={(val) => {
                          if (val === "None") {
                            setLocalTotemAspects([]);
                          } else {
                            setLocalTotemAspects([
                              {
                                name: val,
                                description: TOTEM_ASPECT_DICTIONARY[val] || "",
                              },
                            ]);
                          }
                        }}
                        options={aspectOptions}
                        triggerClassName="inline-flex items-center gap-1 cursor-pointer rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary select-none hover:bg-primary/20 transition-colors"
                        labelPrefix={<span>🐾 Aspect:&nbsp;</span>}
                        openUpward={true}
                        onOpenChange={setIsAspectSelectOpen}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    className={cn("max-w-[280px] text-xs", isAspectSelectOpen && "hidden")}
                  >
                    {TOTEM_ASPECT_DICTIONARY[localTotemAspects[0]?.name] ||
                      localTotemAspects[0]?.description ||
                      "Choose a Totem Aspect to see its description."}
                  </TooltipContent>
                </Tooltip>
              </div>
            );
          })()}
        </div>
        {/* Armor Model */}
        {isArmorer && (
          <div className="mt-2.5 flex flex-wrap gap-1.5 text-xs">
            <CustomSelect
              value={localArmorModel || "None"}
              onChange={(val) => {
                setLocalArmorModel(val === "None" ? null : val);
              }}
              options={["None", "Dreadnaught", "Guardian", "Infiltrator"]}
              triggerClassName="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary select-none hover:border-primary/50 transition-colors text-foreground"
              labelPrefix={
                <span className="flex items-center gap-1.5 text-primary">
                  <Shield size={12} className="text-primary animate-pulse" />
                  <span>Armor Model:&nbsp;</span>
                </span>
              }
              openUpward={true}
            />
          </div>
        )}
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
          <p className="mt-2 text-xs text-destructive">{member.error}</p>
        )}
      </div>
    </div>
  );

  const hero = (
    <section className="card-arcane relative rounded-xl border border-border/40 p-5 shadow-lg">
      {heroContent}
    </section>
  );

  if (member.error && member.error.includes("403")) {
    return (
      <div className="flex flex-col gap-4">
        {hero}
        <Panel>
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <Lock className="mb-2 h-10 w-10 text-muted-foreground/50" />
            <h3 className="font-heading text-xl font-bold text-foreground">Private Character</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This character sheet is set to private. Go to D&amp;D Beyond and set its privacy to{" "}
              <strong>Public</strong> to view stats here.
            </p>
          </div>
        </Panel>
      </div>
    );
  }

  if (member.error) {
    return (
      <div className="flex flex-col gap-4">
        {hero}
        <Panel>
          <p className="text-sm text-destructive">{member.error}</p>
        </Panel>
      </div>
    );
  }

  // === VITALS BAR ===
  const vitalsContent = (
    <div className="flex flex-col gap-4">
      {/* HP block */}
      <div>
        <div className="mb-1.5 flex items-baseline justify-between text-sm">
          <span className="flex items-center gap-1.5 font-medium text-muted-foreground select-none">
            <Heart
              size={14}
              className="text-rose-500 drop-shadow-[0_0_4px_rgba(244,63,94,0.5)]"
            />
            <span>Hit Points</span>
            {displayHitDice && displayHitDice !== "—" && (
              <span className="ml-1 font-mono text-[10px] text-muted-foreground/75">
                ({displayHitDice})
              </span>
            )}
          </span>
          <span className="relative font-mono text-lg font-bold text-foreground flex items-center gap-1 select-none">
            <span
              onClick={() => {
                setShowHpControl(!showHpControl);
                setTempHpInputVal(String(localHp.tempHp));
              }}
              className="cursor-pointer hover:text-accent hover:underline flex items-baseline gap-0.5"
              title="Open HP Control Center"
            >
              <span>{localHp.hpCurrent}</span>
              <span className="text-muted-foreground text-xs font-normal mx-0.5">/</span>
              <span>{member.hpMax}</span>
              {localHp.tempHp > 0 && (
                <span className="text-xs text-accent ml-1 font-semibold">+{localHp.tempHp}</span>
              )}
            </span>

            {showHpControl && (
              <div className="absolute right-0 top-7 z-50 flex flex-col gap-3 rounded-xl border border-border/80 bg-popover/95 p-3.5 shadow-2xl min-w-[240px] backdrop-blur-md animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="flex items-center justify-between border-b border-border/30 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">HP Control Center</span>
                  <button
                    type="button"
                    onClick={() => setShowHpControl(false)}
                    className="text-muted-foreground hover:text-foreground text-xs cursor-pointer focus:outline-none"
                  >
                    ✕
                  </button>
                </div>

                {/* HP / Temp HP Adjust */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={hpInputVal}
                      onChange={(e) => setHpInputVal(e.target.value)}
                      placeholder="Amount"
                      className="w-20 rounded border border-border bg-secondary/40 px-2 py-1 text-xs font-mono text-foreground focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const amt = parseInt(hpInputVal, 10);
                        if (!isNaN(amt)) localHp.damage(amt);
                        setHpInputVal("");
                      }}
                      className="flex-1 rounded bg-destructive/15 border border-destructive/30 hover:border-destructive/60 hover:bg-destructive/25 px-2 py-1 text-[10px] font-bold text-destructive cursor-pointer focus:outline-none transition-colors"
                    >
                      Damage
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const amt = parseInt(hpInputVal, 10);
                        if (!isNaN(amt)) localHp.heal(amt);
                        setHpInputVal("");
                      }}
                      className="flex-1 rounded bg-hp-good/15 border border-hp-good/30 hover:border-hp-good/60 hover:bg-hp-good/25 px-2 py-1 text-[10px] font-bold text-hp-good cursor-pointer focus:outline-none transition-colors"
                    >
                      Heal
                    </button>
                  </div>

                  {/* Quick HP Steps */}
                  <div className="grid grid-cols-6 gap-1 mt-0.5">
                    <button
                      type="button"
                      onClick={() => localHp.damage(10)}
                      className="rounded border border-border/40 bg-secondary/30 text-[9px] font-mono hover:bg-secondary/60 text-destructive font-bold py-0.5 cursor-pointer focus:outline-none"
                    >
                      -10
                    </button>
                    <button
                      type="button"
                      onClick={() => localHp.damage(5)}
                      className="rounded border border-border/40 bg-secondary/30 text-[9px] font-mono hover:bg-secondary/60 text-destructive font-bold py-0.5 cursor-pointer focus:outline-none"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      onClick={() => localHp.damage(1)}
                      className="rounded border border-border/40 bg-secondary/30 text-[9px] font-mono hover:bg-secondary/60 text-destructive font-bold py-0.5 cursor-pointer focus:outline-none"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => localHp.heal(1)}
                      className="rounded border border-border/40 bg-secondary/30 text-[9px] font-mono hover:bg-secondary/60 text-hp-good font-bold py-0.5 cursor-pointer focus:outline-none"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => localHp.heal(5)}
                      className="rounded border border-border/40 bg-secondary/30 text-[9px] font-mono hover:bg-secondary/60 text-hp-good font-bold py-0.5 cursor-pointer focus:outline-none"
                    >
                      +5
                    </button>
                    <button
                      type="button"
                      onClick={() => localHp.heal(10)}
                      className="rounded border border-border/40 bg-secondary/30 text-[9px] font-mono hover:bg-secondary/60 text-hp-good font-bold py-0.5 cursor-pointer focus:outline-none"
                    >
                      +10
                    </button>
                  </div>
                </div>

                {/* Temporary HP Section */}
                <div className="border-t border-border/30 pt-2.5 flex flex-col gap-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80 select-none">Temporary HP</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={tempHpInputVal}
                      onChange={(e) => setTempHpInputVal(e.target.value)}
                      placeholder="Temp HP"
                      className="w-20 rounded border border-border bg-secondary/40 px-2 py-1 text-xs font-mono text-foreground focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const amt = parseInt(tempHpInputVal, 10);
                        localHp.setTempHp(isNaN(amt) ? 0 : amt);
                      }}
                      className="flex-1 rounded border border-accent/30 bg-accent/5 hover:border-accent/60 hover:bg-accent/15 px-2 py-1 text-[10px] font-bold text-accent cursor-pointer focus:outline-none transition-colors"
                    >
                      Set Temp
                    </button>
                    {localHp.tempHp > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          localHp.setTempHp(0);
                          setTempHpInputVal("0");
                        }}
                        className="rounded border border-border/40 bg-secondary/30 hover:bg-secondary/60 px-2 py-1 text-[9px] text-muted-foreground cursor-pointer focus:outline-none"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Utility shortcuts */}
                <div className="border-t border-border/30 pt-2 flex justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      localHp.heal(member.hpMax);
                    }}
                    className="flex-1 rounded border border-hp-good/40 bg-hp-good/5 hover:bg-hp-good/15 hover:border-hp-good text-hp-good text-[10px] py-1 transition-colors font-bold cursor-pointer focus:outline-none text-center"
                  >
                    Fully Heal
                  </button>
                </div>
              </div>
            )}
            {delta && (
              <span
                key={delta.key}
                className={`absolute -top-4 right-0 text-sm font-bold ${
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
        <div className="h-3 overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full animate-fill-bar ${hpColor} ${hpGlow}`}
            style={{ width: `${animHpPct}%` }}
          />
        </div>

        {localHp.hpCurrent <= 0 && (
          <div className="mt-3 rounded border border-destructive/60 bg-destructive/10 px-3 py-2.5 flex flex-col gap-2 relative">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider select-none">
              <span className="text-destructive font-bold">
                {localHp.deathSaves.stabilized ? "Stabilized 💖" : "Death Saving Throws"}
              </span>
              <button
                type="button"
                onClick={() => {
                  localHp.setStabilized(!localHp.deathSaves.stabilized);
                }}
                className={`rounded border text-[9px] font-bold px-2 py-0.5 transition-all cursor-pointer focus:outline-none ${
                  localHp.deathSaves.stabilized
                    ? "border-hp-good bg-hp-good/20 text-hp-good"
                    : "border-border/40 bg-secondary/30 text-muted-foreground hover:border-hp-good hover:text-hp-good"
                }`}
              >
                {localHp.deathSaves.stabilized ? "Revoke Stability" : "Stabilize"}
              </button>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground select-none">Successes</span>
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => {
                    const active = i < localHp.deathSaves.successes;
                    return (
                      <button
                        key={`s-${i}`}
                        type="button"
                        onClick={() => {
                          const newVal = i + 1;
                          localHp.setDeathSaveSuccesses(localHp.deathSaves.successes === newVal ? i : newVal);
                        }}
                        className={`h-3.5 w-3.5 rotate-45 border transition-all duration-200 cursor-pointer focus:outline-none hover:scale-110 active:scale-90 ${
                          active
                            ? "border-hp-good bg-hp-good shadow-[0_0_8px_color-mix(in_oklab,var(--hp-good)_70%,transparent)]"
                            : "border-border/60 bg-transparent hover:border-hp-good"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground select-none">Failures</span>
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => {
                    const active = i < localHp.deathSaves.failures;
                    return (
                      <button
                        key={`f-${i}`}
                        type="button"
                        onClick={() => {
                          const newVal = i + 1;
                          localHp.setDeathSaveFailures(localHp.deathSaves.failures === newVal ? i : newVal);
                        }}
                        className={`h-3.5 w-3.5 rotate-45 border transition-all duration-200 cursor-pointer focus:outline-none hover:scale-110 active:scale-90 ${
                          active
                            ? "border-destructive bg-destructive shadow-[0_0_8px_color-mix(in_oklab,var(--destructive)_70%,transparent)]"
                            : "border-border/60 bg-transparent hover:border-destructive"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Core stats */}
      <div className="grid grid-cols-4 gap-1.5 text-center">
        <DetailStat
          label="AC"
          icon={Shield}
          iconClassName="text-primary/90 drop-shadow-[0_0_3px_color-mix(in_oklab,var(--primary)_45%,transparent)]"
          value={
            ac !== member.armorClass ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help font-bold text-gold drop-shadow-[0_0_6px_color-mix(in_oklab,var(--gold)_60%,transparent)] animate-pulse">
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
        <DetailStat
          label="Initiative"
          icon={Zap}
          iconClassName="text-primary/90 drop-shadow-[0_0_3px_color-mix(in_oklab,var(--primary)_45%,transparent)]"
          value={
            initBadges.length > 0 ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help flex items-center justify-center gap-1">
                    {fmt(member.initiative)}
                    {initBadges.map((badge, bIdx) => (
                      <span
                        key={bIdx}
                        className={cn(
                          "shrink-0 text-[8px] px-1 rounded font-bold uppercase tracking-wider scale-90 select-none border",
                          badge.type === "adv"
                            ? "bg-emerald-500/25 text-emerald-400 border-emerald-500/35 animate-pulse"
                            : "bg-rose-500/25 text-rose-400 border-rose-500/35",
                        )}
                      >
                        {badge.label}
                      </span>
                    ))}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="text-xs max-w-[200px] whitespace-pre-line">
                  {initEffects.map((e) => e.text).join("\n")}
                </TooltipContent>
              </Tooltip>
            ) : (
              fmt(member.initiative)
            )
          }
        />
        <DetailStat
          label="Speed"
          icon={Flame}
          iconClassName="text-primary/90 drop-shadow-[0_0_3px_color-mix(in_oklab,var(--primary)_45%,transparent)]"
          value={
            <div className="flex flex-col items-center">
              <span className="font-heading text-2xl font-extrabold text-foreground leading-none">
                {speed !== member.speed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help font-bold text-accent">{speed}ft</span>
                    </TooltipTrigger>
                    <TooltipContent>{speedNotes.join(", ")}</TooltipContent>
                  </Tooltip>
                ) : (
                  `${speed}ft`
                )}
              </span>
              {displaySpecialSpeeds && displaySpecialSpeeds.length > 0 && (
                <span className="text-[7.5px] font-mono font-bold text-muted-foreground uppercase leading-none mt-1 select-none whitespace-nowrap">
                  {displaySpecialSpeeds.map((s) => `${s.type.slice(0, 4)}:${s.value}`).join(" ")}
                </span>
              )}
            </div>
          }
        />
        <DetailStat label="Prof" value={fmt(member.proficiencyBonus)} />
      </div>
    </div>
  );

  const vitals = (
    <Panel>
      {vitalsContent}
    </Panel>
  );

  // === ABILITY SCORES ===
  const abilityScores = (
    <Panel title="Ability Scores" icon={BookOpen}>
      <div className="grid grid-cols-6 gap-1.5">
        {member.abilities.map((a) => {
          const elite = a.score >= 16;
          const details = ABILITY_DETAILS[a.name];
          const Icon = details?.Icon;
          const hoverGlow = details?.hoverGlowClass || "hover:border-accent/40";
          return (
            <div
              key={a.name}
              className={`group rounded-lg border px-1 py-2 text-center transition-all duration-300 hover:scale-105 hover:shadow-md ${
                elite
                  ? "border-gold/50 bg-[color-mix(in_oklab,var(--gold)_8%,var(--secondary))] shadow-[0_0_8px_color-mix(in_oklab,var(--gold)_30%,transparent)] text-gold"
                  : "border-border/30 bg-secondary/20 text-foreground"
              } ${hoverGlow}`}
            >
              <div
                className={`flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider select-none ${
                  elite ? "text-gold" : "text-muted-foreground"
                }`}
              >
                {Icon && (
                  <Icon
                    size={9}
                    className={`shrink-0 ${elite ? "text-gold" : details?.colorClass || "text-accent/80"}`}
                  />
                )}
                <span>{a.name}</span>
              </div>
              <div
                className={`font-heading text-2xl font-bold leading-tight ${elite ? "text-gold" : "text-foreground"}`}
              >
                {a.score}
              </div>
              <div className="mt-0.5 font-mono text-xs font-semibold text-muted-foreground/80">
                {a.modifier >= 0 ? `+${a.modifier}` : a.modifier}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );

  // === SAVING THROWS ===
  const savingThrows = member.saves.length > 0 && (
    <Panel title="Saving Throws" icon={Shield}>
      <div className="grid grid-cols-6 gap-1">
        {member.saves.map((s) => {
          const details = ABILITY_DETAILS[s.ability];
          const Icon = details?.Icon;
          const isProf = s.proficiency !== "none";
          const hoverGlow = details?.hoverGlowClass || "hover:border-accent/30";

          const sEffects = saveEffects[s.ability] ?? [];
          const hasAdv = sEffects.some((e) => e.type === "adv");
          const hasDis = sEffects.some((e) => e.type === "dis");

          const isConflict = hasAdv && hasDis;
          const badgesToRender: Array<{ type: "adv" | "dis" | "conflict"; label: string }> = [];
          if (isConflict) {
            const advSit = sEffects.filter((e) => e.type === "adv").some((e) => e.label.includes("*"));
            const disSit = sEffects.filter((e) => e.type === "dis").some((e) => e.label.includes("*"));
            badgesToRender.push({
              type: "conflict" as const,
              label: `${advSit ? "Adv*" : "Adv"}|${disSit ? "Dis*" : "Dis"}`,
            });
          } else if (hasAdv) {
            const isSituational = sEffects
              .filter((e) => e.type === "adv")
              .some((e) => e.label.includes("*"));
            badgesToRender.push({
              type: "adv" as const,
              label: isSituational ? "Adv*" : "Adv",
            });
          } else if (hasDis) {
            const isSituational = sEffects
              .filter((e) => e.type === "dis")
              .some((e) => e.label.includes("*"));
            badgesToRender.push({
              type: "dis" as const,
              label: isSituational ? "Dis*" : "Dis",
            });
          }

          const saveCard = (
            <div
              className={`group rounded-lg border px-1 py-1.5 text-center transition-all duration-200 hover:scale-105 h-full flex flex-col justify-between ${
                isProf
                  ? "border-accent/50 bg-accent/10 shadow-[0_0_6px_color-mix(in_oklab,var(--accent)_25%,transparent)]"
                  : "border-border/30 bg-secondary/20"
              } ${hoverGlow}`}
            >
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none">
                {Icon && (
                  <Icon
                    size={8}
                    className={`shrink-0 ${isProf ? "text-accent" : details?.colorClass || "text-muted-foreground/45"}`}
                  />
                )}
                <span>{s.ability}</span>
                {s.proficiency === "expertise" && <span className="text-gold">★</span>}
                {s.proficiency === "proficient" && (
                  <span className="text-accent text-[8px]">●</span>
                )}
              </div>
              <div className="mt-0.5 font-mono text-sm font-bold text-foreground flex items-center justify-center gap-1 flex-wrap">
                {fmt(s.modifier)}
                {badgesToRender.map((badge, bIdx) => (
                  <span
                    key={bIdx}
                    className={cn(
                      "shrink-0 text-[8px] px-1 rounded font-bold uppercase tracking-wider scale-90 select-none border",
                      badge.type === "conflict"
                        ? "bg-gradient-to-r from-emerald-500/25 to-rose-500/25 border-amber-500/40 text-amber-300"
                        : badge.type === "adv"
                          ? "bg-emerald-500/25 text-emerald-400 border-emerald-500/35"
                          : "bg-rose-500/25 text-rose-400 border-rose-500/35",
                    )}
                  >
                    {badge.type === "conflict" ? (
                      <>
                        <span className="text-emerald-400">{badge.label.split("|")[0]}</span>
                        <span className="text-muted-foreground/60 mx-px">|</span>
                        <span className="text-rose-400">{badge.label.split("|")[1]}</span>
                      </>
                    ) : badge.label}
                  </span>
                ))}
              </div>
            </div>
          );

          return sEffects.length > 0 ? (
            <Tooltip key={s.ability}>
              <TooltipTrigger asChild>
                <div className="cursor-help">{saveCard}</div>
              </TooltipTrigger>
              <TooltipContent className="text-xs max-w-[200px] whitespace-pre-line">
                {sEffects.map((e) => e.text).join("\n")}
              </TooltipContent>
            </Tooltip>
          ) : (
            <div key={s.ability}>{saveCard}</div>
          );
        })}
      </div>
    </Panel>
  );

  // === SKILLS ===
  const skills = displaySkills.length > 0 && (
    <Panel title="Skills" icon={Star}>
      <div className="grid grid-cols-1 gap-x-3 gap-y-0.5 text-xs md:grid-cols-2">
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

          const sEffects = skillEffects[s.key] ?? [];
          const hasAdv = sEffects.some((e) => e.type === "adv");
          const hasDis = sEffects.some((e) => e.type === "dis");

          const isConflict = hasAdv && hasDis;
          const badgesToRender: Array<{ type: "adv" | "dis" | "conflict"; label: string }> = [];
          if (isConflict) {
            const advSit = sEffects.filter((e) => e.type === "adv").some((e) => e.label.includes("*"));
            const disSit = sEffects.filter((e) => e.type === "dis").some((e) => e.label.includes("*"));
            badgesToRender.push({
              type: "conflict" as const,
              label: `${advSit ? "Adv*" : "Adv"}|${disSit ? "Dis*" : "Dis"}`,
            });
          } else if (hasAdv) {
            const isSituational = sEffects
              .filter((e) => e.type === "adv")
              .some((e) => e.label.includes("*"));
            badgesToRender.push({
              type: "adv" as const,
              label: isSituational ? "Adv*" : "Adv",
            });
          } else if (hasDis) {
            const isSituational = sEffects
              .filter((e) => e.type === "dis")
              .some((e) => e.label.includes("*"));
            badgesToRender.push({
              type: "dis" as const,
              label: isSituational ? "Dis*" : "Dis",
            });
          }

          const skillRow = (
            <div
              className={`group/skill flex items-center justify-between rounded px-1 -mx-1 py-0.5 transition-colors hover:bg-secondary/15 ${
                isProf ? "" : "opacity-60"
              }`}
            >
              <span className={`flex min-w-0 items-center gap-1.5 truncate ${nameColor}`}>
                {Icon && <Icon size={9} className={`shrink-0 ${iconColor}`} />}
                <span className="truncate">{s.name}</span>
                {badgesToRender.map((badge, bIdx) => (
                  <span
                    key={bIdx}
                    className={cn(
                      "shrink-0 text-[8px] px-1 rounded font-bold uppercase tracking-wider scale-90 select-none border",
                      badge.type === "conflict"
                        ? "bg-gradient-to-r from-emerald-500/25 to-rose-500/25 border-amber-500/40 text-amber-300"
                        : badge.type === "adv"
                          ? "bg-emerald-500/25 text-emerald-400 border-emerald-500/35"
                          : "bg-rose-500/25 text-rose-400 border-rose-500/35",
                    )}
                  >
                    {badge.type === "conflict" ? (
                      <>
                        <span className="text-emerald-400">{badge.label.split("|")[0]}</span>
                        <span className="text-muted-foreground/60 mx-px">|</span>
                        <span className="text-rose-400">{badge.label.split("|")[1]}</span>
                      </>
                    ) : badge.label}
                  </span>
                ))}
                {isExpert && <span className="shrink-0 text-[8px] text-gold">★</span>}
                {isHalf && <span className="shrink-0 text-[8px] text-accent/70">◐</span>}
              </span>
              <span
                className={`shrink-0 pl-1 font-mono text-xs ${
                  isExpert
                    ? "text-gold font-bold"
                    : isProf
                      ? "text-accent font-semibold"
                      : "text-muted-foreground/60"
                }`}
              >
                {fmt(s.modifier)}
              </span>
            </div>
          );

          return sEffects.length > 0 ? (
            <Tooltip key={s.key}>
              <TooltipTrigger asChild>
                <div className="cursor-help">{skillRow}</div>
              </TooltipTrigger>
              <TooltipContent className="text-xs max-w-[220px] whitespace-pre-line">
                {sEffects.map((e) => e.text).join("\n")}
              </TooltipContent>
            </Tooltip>
          ) : (
            <div key={s.key}>{skillRow}</div>
          );
        })}
      </div>
    </Panel>
  );

  // === SENSES ===
  const senses = (displaySenses.length > 0 || member.passivePerception != null) && (
    <Panel title="Senses" icon={Eye}>
      <div className="flex flex-col gap-1.5">
        {[
          { label: "Passive Perception", value: member.passivePerception, icon: Eye },
          { label: "Passive Investigation", value: member.passiveInvestigation, icon: Search },
          { label: "Passive Insight", value: member.passiveInsight, icon: Brain },
        ]
          .filter((p) => p.value != null)
          .map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.label}
                className="flex items-center justify-between rounded-lg border border-border/30 bg-secondary/20 px-2.5 py-1.5"
              >
                <div className="flex items-center gap-2 select-none">
                  <Icon size={10} className="shrink-0 text-accent/80" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {p.label}
                  </span>
                </div>
                <span className="flex h-6 w-6 items-center justify-center rounded border border-accent/40 bg-accent/10 font-mono text-xs font-bold text-foreground">
                  {p.value}
                </span>
              </div>
            );
          })}
        {displaySenses.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {displaySenses.map((s) => {
              const isDarkvision = s.name.toLowerCase().includes("darkvision");
              const SenseIcon = isDarkvision ? Moon : Eye;
              return (
                <span
                  key={s.name}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary select-none"
                >
                  <SenseIcon size={10} className="text-primary/90" />
                  <span>
                    {s.name}
                    {s.value != null ? ` ${s.value}ft` : ""}
                  </span>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </Panel>
  );

  // === DEFENSES ===

  const defenses = displayDefenses.length > 0 && (
    <Panel title="Defenses" icon={Shield}>
      <div className="flex flex-wrap gap-1">
        {displayDefenses.map((d) => {
          const styles =
            d.type === "immunity"
              ? "border-gold/60 bg-[color-mix(in_oklab,var(--gold)_12%,var(--secondary))] text-gold"
              : d.type === "vulnerability"
                ? "border-destructive/60 bg-destructive/15 text-destructive"
                : "border-accent/50 bg-accent/10 text-accent";
          const mark =
            d.type === "immunity"
              ? "Immunity"
              : d.type === "vulnerability"
                ? "Vulnerability"
                : "Resistance";
          return (
            <Tooltip key={`${d.type}-${d.damageType}`}>
              <TooltipTrigger asChild>
                <span
                  className={`cursor-help rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${styles}`}
                >
                  <span className="mr-1 opacity-70">{mark}</span>
                  {d.damageType}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {d.type}: {d.damageType}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </Panel>
  );

  // === LANGUAGES & PROFICIENCIES ===
  const hasProficiencies =
    member.languages.length > 0 ||
    member.tools.length > 0 ||
    (member.armorProficiencies && member.armorProficiencies.length > 0) ||
    (member.weaponProficiencies && member.weaponProficiencies.length > 0);

  const proficiencies = hasProficiencies && (
    <Panel title="Proficiencies & Languages" icon={BookOpen}>
      <div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-2.5 text-xs">
        {member.armorProficiencies && member.armorProficiencies.length > 0 && (
          <>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none pt-0.5">
              Armor
            </span>
            <span className="text-foreground/95 leading-normal">
              {member.armorProficiencies.join(", ")}
            </span>
          </>
        )}
        {member.weaponProficiencies && member.weaponProficiencies.length > 0 && (
          <>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none pt-0.5">
              Weapons
            </span>
            <span className="text-foreground/95 leading-normal">
              {member.weaponProficiencies.join(", ")}
            </span>
          </>
        )}
        {member.tools.length > 0 && (
          <>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none pt-0.5">
              Tools
            </span>
            <span className="text-foreground/95 leading-normal font-medium">
              {member.tools.join(", ")}
            </span>
          </>
        )}
        {member.languages.length > 0 && (
          <>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none pt-0.5">
              Languages
            </span>
            <span className="text-foreground/95 leading-normal">{member.languages.join(", ")}</span>
          </>
        )}
      </div>
    </Panel>
  );

  // === ATTACKS & ACTIONS ===
  const allSpells = [...(member.cantrips ?? []), ...(member.preparedSpells ?? [])];

  const spellBonusActions = allSpells
    .filter((s) => s.activation?.activationType === 3)
    .map((s) => ({
      name: s.name,
      source: s.level === 0 ? "Cantrip" : `Lvl ${s.level} Spell`,
      activation: s.activation,
      description: s.description,
    }));

  const reactionSpells = allSpells
    .filter((s) => s.activation?.activationType === 4)
    .map((s) => ({
      name: s.name,
      source: s.level === 0 ? "Cantrip" : `Lvl ${s.level} Spell`,
      activation: s.activation,
      description: s.description,
    }));

  const reactionActions = displayActions.filter(
    (act) =>
      !displayAttacks.some((atk) => atk.name.toLowerCase() === act.name.toLowerCase()) &&
      act.activation?.activationType === 4
  );

  const allReactions = [
    ...reactionSpells,
    ...reactionActions,
  ];

  const attacks = (displayAttacks.length > 0 || spellBonusActions.length > 0 || allReactions.length > 0) && (() => {
    const renderActionRow = (act: any, keyId: string) => {
      const actText = getActivationText(act.activation);
      return (
        <div
          key={keyId}
          onClick={() => toggleExpand(`act-${keyId}`)}
          className="group/act relative cursor-pointer overflow-hidden rounded-xl border border-border/40 bg-gradient-to-r from-secondary/20 to-secondary/5 p-3 transition-all duration-300 hover:border-accent/30 hover:bg-secondary/25"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="shrink-0 text-[8.5px] font-bold uppercase tracking-wider text-muted-foreground/80 bg-secondary/80 px-1.5 py-0.5 rounded border border-border/10">
                {act.source}
              </span>
              <span className="font-heading text-xs font-bold text-foreground truncate group-hover/act:text-accent transition-colors">
                {act.name}
              </span>
            </div>
            {actText && (
              <span className="shrink-0 rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[8.5px] uppercase tracking-wider text-primary font-semibold">
                ⚡ {actText}
              </span>
            )}
          </div>
          {act.uses && (
            <div className="mt-1 text-[9px] font-semibold text-accent font-mono">
              Uses: {act.uses.current} / {act.uses.max} (resets on {act.uses.reset})
            </div>
          )}
          {expandedItems[`act-${keyId}`] && act.description && (
            <div
              className="mt-2.5 text-[10px] leading-relaxed text-muted-foreground/90 border-t border-border/10 pt-2"
              dangerouslySetInnerHTML={{ __html: act.description }}
            />
          )}
        </div>
      );
    };

    return (
      <Panel title="Attacks & Actions" icon={Swords}>
        <div className="flex flex-col gap-3.5">
          {displayAttacks.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none mb-1 pl-1">
                Attacks
              </div>
              {displayAttacks.map((atk, idx) => {
                const dmgTypeLower = atk.damageType?.toLowerCase() || "";
                const dmgTheme = DAMAGE_TYPE_THEMES[dmgTypeLower] || {
                  bg: "bg-secondary/40",
                  text: "text-foreground/90",
                  border: "border-border/40",
                };
                return (
                  <div
                    key={`${atk.name}-${idx}`}
                    className="group/atk relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-r from-secondary/30 to-secondary/10 p-3.5 transition-all duration-300 hover:scale-[1.01] hover:border-accent/40 hover:bg-secondary/40"
                  >
                    {/* Highlight Left Border indicator */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent/60 opacity-0 group-hover/atk:opacity-100 transition-opacity" />

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-secondary/60 text-accent group-hover/atk:text-glow-accent transition-colors">
                          <Swords size={16} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-heading text-sm font-bold text-foreground truncate group-hover/atk:text-accent transition-colors">
                            {atk.name}
                          </span>
                          {atk.properties && atk.properties.length > 0 && (
                            <span className="mt-1 text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground/85">
                              {atk.properties.join(" • ")}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3.5 font-mono">
                        {/* To Hit Badge */}
                        {atk.attackBonus != null && (
                          <div className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs">
                            <span className="text-primary font-bold text-[13px] drop-shadow-[0_0_2px_var(--primary)]">
                              {atk.attackBonus >= 0 ? `+${atk.attackBonus}` : atk.attackBonus}
                            </span>
                            <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-muted-foreground/85">
                              to hit
                            </span>
                          </div>
                        )}

                        {/* Damage Block */}
                        {atk.damage && (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center rounded-lg border border-border/50 bg-secondary/80 px-2.5 py-1 text-xs">
                              <span className="font-bold text-foreground text-[13px]">{atk.damage}</span>
                            </div>
                            {atk.damageType && (
                              <span
                                className={`rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${dmgTheme.bg} ${dmgTheme.text} ${dmgTheme.border}`}
                              >
                                {atk.damageType}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {spellBonusActions.length > 0 && (
            <div className="flex flex-col gap-2">
              {displayAttacks.length > 0 && <div className="border-t border-border/10 my-1.5" />}
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none mb-1 pl-1">
                Bonus Actions
              </div>
              {spellBonusActions.map((act, idx) => renderActionRow(act, `bonus-${idx}`))}
            </div>
          )}

          {allReactions.length > 0 && (
            <div className="flex flex-col gap-2">
              {(displayAttacks.length > 0 || spellBonusActions.length > 0) && <div className="border-t border-border/10 my-1.5" />}
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none mb-1 pl-1">
                Reactions
              </div>
              {allReactions.map((act, idx) => renderActionRow(act, `reaction-${idx}`))}
            </div>
          )}
        </div>
      </Panel>
    );
  })();

  // === SPELLCASTING ===
  const spellcastingPanel = (member.spellcasting?.length > 0 ||
    member.spellSlots.length > 0 ||
    member.pactSlots.length > 0) && (
    <Panel title="Spellcasting" icon={Sparkles}>
      <div className="flex flex-col gap-3">
        {member.spellcasting?.map((sc) => {
          const abilityMod = member.abilities.find((a) => a.name === sc.ability)?.modifier ?? 0;
          return (
            <div
              key={sc.className}
              className="relative overflow-hidden rounded-xl border border-accent/25 bg-gradient-to-br from-accent/5 to-secondary/30 p-3 shadow-md"
            >
              <div className="mb-3 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-accent select-none">
                <Sparkles size={11} className="animate-pulse text-accent/80" />
                <span>
                  {sc.className} ({sc.ability})
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 divide-x divide-border/20 text-center">
                <div>
                  <div className="font-heading text-xl font-extrabold leading-tight text-foreground">
                    {fmt(abilityMod)}
                  </div>
                  <div className="mt-1 text-[8px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    Modifier
                  </div>
                </div>
                <div className="pl-1">
                  <div className="font-heading text-xl font-extrabold leading-tight text-foreground">
                    {fmt(sc.attackBonus)}
                  </div>
                  <div className="mt-1 text-[8px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    Spell Attack
                  </div>
                </div>
                <div className="pl-1">
                  <div className="font-heading text-xl font-extrabold leading-tight text-gold">
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
        {(localSlots.spellSlots.length > 0 || localSlots.pactSlots.length > 0) && (
          <div className="flex flex-col gap-1.5 border-t border-border/30 pt-2">
            {localSlots.spellSlots.map((s) => {
              const available = s.max - s.used;
              return (
                <div key={`s-${s.level}`} className="flex items-center gap-2">
                  <span className="min-w-[3rem] font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground select-none">
                    Level {s.level}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from({ length: s.max }).map((_, i) => {
                          const filled = i < available;
                          return (
                            <span
                              key={i}
                              onClick={() => localSlots.toggleSlot(s.level, i, false)}
                              className={`mana-slot ${filled ? "mana-slot-filled" : ""}`}
                            />
                          );
                        })}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      Level {s.level}: {available}/{s.max} remaining (Click to toggle)
                    </TooltipContent>
                  </Tooltip>
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground select-none">
                    {available}/{s.max}
                  </span>
                </div>
              );
            })}
            {localSlots.pactSlots.map((s) => {
              const available = s.max - s.used;
              return (
                <div key={`p-${s.level}`} className="flex items-center gap-2">
                  <span className="min-w-[3rem] font-mono text-[10px] font-semibold uppercase tracking-wider text-accent select-none">
                    Pact {s.level}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from({ length: s.max }).map((_, i) => {
                          const filled = i < available;
                          return (
                            <span
                              key={i}
                              onClick={() => localSlots.toggleSlot(s.level, i, true)}
                              className={`pact-slot ${filled ? "pact-slot-filled" : ""}`}
                            />
                          );
                        })}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      Pact {s.level}: {available}/{s.max} remaining (Click to toggle)
                    </TooltipContent>
                  </Tooltip>
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground select-none">
                    {available}/{s.max}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Panel>
  );

  // === CANTRIPS & PREPARED ===
  const spellLists = (member.cantrips.length > 0 || member.preparedSpells.length > 0) && (
    <Panel title="Spells Known" icon={Sparkles}>
      <div className="flex flex-col gap-2">
        {member.cantrips.length > 0 && (
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Cantrips
            </div>
            <div className="flex flex-wrap gap-1">
              {member.cantrips.map((c) => (
                <Tooltip key={c.name}>
                  <TooltipTrigger asChild>
                    <span className="cursor-help rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent">
                      {c.name}
                    </span>
                  </TooltipTrigger>
                  {c.description && (
                    <TooltipContent className="max-w-[280px] text-xs">
                      {c.description.replace(/<[^>]*>/g, "")}
                    </TooltipContent>
                  )}
                </Tooltip>
              ))}
            </div>
          </div>
        )}
        {member.preparedSpells.length > 0 && (
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Prepared Spells
            </div>
            <div className="flex flex-wrap gap-1">
              {member.preparedSpells.map((s) => (
                <Tooltip key={s.name}>
                  <TooltipTrigger asChild>
                    <span className="cursor-help rounded border border-border bg-secondary/50 px-1.5 py-0.5 text-[10px] text-foreground">
                      <span className="mr-1 font-mono text-[9px] text-accent">L{s.level}</span>
                      {s.name}
                    </span>
                  </TooltipTrigger>
                  {s.description && (
                    <TooltipContent className="max-w-[280px] text-xs">
                      {s.description.replace(/<[^>]*>/g, "")}
                    </TooltipContent>
                  )}
                </Tooltip>
              ))}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );

  // === EXPANDED SPELLBOOK (for tabbed view) ===
  const spellsByLevel: Record<number, PreparedSpell[]> = {};
  member.preparedSpells.forEach((s) => {
    if (!spellsByLevel[s.level]) {
      spellsByLevel[s.level] = [];
    }
    spellsByLevel[s.level].push(s);
  });

  const levels = Object.keys(spellsByLevel)
    .map(Number)
    .sort((a, b) => a - b);

  const filteredCantrips = member.cantrips.filter((c) =>
    c.name.toLowerCase().includes(spellSearch.toLowerCase()),
  );

  const filteredLeveledSpells: Record<number, PreparedSpell[]> = {};
  member.preparedSpells.forEach((s) => {
    if (!s.name.toLowerCase().includes(spellSearch.toLowerCase())) return;
    if (spellLevelFilter !== "all" && s.level !== spellLevelFilter) return;
    if (!filteredLeveledSpells[s.level]) {
      filteredLeveledSpells[s.level] = [];
    }
    filteredLeveledSpells[s.level].push(s);
  });

  const filteredLevels = Object.keys(filteredLeveledSpells)
    .map(Number)
    .sort((a, b) => a - b);

  const renderSlotsInline = (s: SpellSlotLevel, isPact = false) => {
    const available = s.max - s.used;
    return (
      <div className="flex items-center gap-1.5 select-none">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex cursor-pointer flex-wrap gap-1.5">
              {Array.from({ length: s.max }).map((_, i) => {
                const filled = i < available;
                if (isPact) {
                  return (
                    <span
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        localSlots.toggleSlot(s.level, i, true);
                      }}
                      className={`pact-slot ${filled ? "pact-slot-filled" : ""}`}
                    />
                  );
                } else {
                  return (
                    <span
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        localSlots.toggleSlot(s.level, i, false);
                      }}
                      className={`mana-slot ${filled ? "mana-slot-filled" : ""}`}
                    />
                  );
                }
              })}
            </div>
          </TooltipTrigger>
          <TooltipContent className="text-xs">
            {isPact ? "Pact" : "Level"} {s.level} Slots: {available} / {s.max} remaining (Click to
            toggle)
          </TooltipContent>
        </Tooltip>
        <span className="font-mono text-[9px] text-muted-foreground">
          ({available}/{s.max})
        </span>
      </div>
    );
  };

  const expandedSpellbook = (member.cantrips.length > 0 || member.preparedSpells.length > 0) && (() => {
    const spellLevelOptions = [
      "All Levels",
      ...(member.cantrips.length > 0 ? ["Cantrips"] : []),
      ...levels.map((lvl) => {
        const suffix = lvl === 1 ? "st" : lvl === 2 ? "nd" : lvl === 3 ? "rd" : "th";
        return `${lvl}${suffix} Level`;
      })
    ];

    const currentLevelLabel = (() => {
      if (spellLevelFilter === "all") return "All Levels";
      if (spellLevelFilter === 0) return "Cantrips";
      const lvl = Number(spellLevelFilter);
      const suffix = lvl === 1 ? "st" : lvl === 2 ? "nd" : lvl === 3 ? "rd" : "th";
      return `${lvl}${suffix} Level`;
    })();

    const handleSpellLevelChange = (label: string) => {
      if (label === "All Levels") {
        setSpellLevelFilter("all");
      } else if (label === "Cantrips") {
        setSpellLevelFilter(0);
      } else {
        const match = label.match(/^(\d+)/);
        if (match) {
          setSpellLevelFilter(parseInt(match[1], 10));
        }
      }
    };

    return (
      <Panel title="Spellbook" icon={Sparkles}>
        <div className="flex flex-col gap-4">
          {/* Spellbook Search & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/20 pb-3 mb-1">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search spells..."
                value={spellSearch}
                onChange={(e) => setSpellSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-secondary/35 pl-8 pr-4 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Level:
              </span>
              <CustomSelect
                value={currentLevelLabel}
                onChange={handleSpellLevelChange}
                options={spellLevelOptions}
                triggerClassName="inline-flex items-center gap-1.5 cursor-pointer rounded border border-border bg-secondary/35 px-2.5 py-1 text-xs text-foreground hover:bg-secondary/50 focus:outline-none"
                optionsWidth="w-32"
              />
            </div>
          </div>

        {/* Cantrips Section */}
        {member.cantrips.length > 0 &&
          (spellLevelFilter === "all" || spellLevelFilter === 0) &&
          (() => {
            const list = filteredCantrips;
            if (list.length === 0) return null;
            return (
              <div className="rounded-lg border border-border/30 bg-secondary/10 p-3">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-accent select-none">
                  Cantrips
                </h4>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 items-start">
                  {list.map((c) => {
                    const isExpanded = !!expandedItems[`spell-${c.name}`];
                    return (
                      <div
                        key={c.name}
                        className="flex flex-col rounded-md border border-accent/20 bg-accent/5 transition-all duration-200"
                      >
                        <button
                          onClick={() => toggleExpand(`spell-${c.name}`)}
                          className="w-full text-left cursor-pointer flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs text-foreground hover:bg-accent/10 focus:outline-none"
                        >
                          <span className="flex items-center gap-2 font-medium">
                            <Sparkles size={10} className="text-accent shrink-0" />
                            <span>{c.name}</span>
                          </span>
                          <span className="text-[9px] text-muted-foreground font-mono">
                            {isExpanded ? "▲ LESS" : "▼ DETAILS"}
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="px-2.5 pb-2 border-t border-accent/10 pt-2 flex flex-col gap-2">
                            {/* Spell Badges */}
                            <div className="flex flex-wrap gap-1">
                              {c.school && (
                                <span className="rounded bg-secondary border border-border/30 px-1 py-0.5 text-[8px] uppercase tracking-wider text-muted-foreground">
                                  {c.school}
                                </span>
                              )}
                              {c.activation && (
                                <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-primary">
                                  ⚡ {getActivationText(c.activation)}
                                </span>
                              )}
                              {c.range && (
                                <span className="rounded bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-teal-400">
                                  🎯 {getRangeText(c.range)}
                                </span>
                              )}
                              {c.duration && (
                                <span className="rounded bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-amber-400">
                                  🕒 {getDurationText(c.duration, c.concentration)}
                                </span>
                              )}
                              {c.components && (
                                <span
                                  className="rounded bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-purple-400"
                                  title={c.componentsDescription}
                                >
                                  📜 {getComponentsText(c.components)}
                                </span>
                              )}
                              {c.ritual && (
                                <span className="rounded bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-sky-400 font-bold">
                                  Ritual
                                </span>
                              )}
                            </div>
                            {c.description && (
                              <div
                                className="text-[10px] leading-relaxed text-muted-foreground/90 max-h-[160px] overflow-y-auto pr-1"
                                dangerouslySetInnerHTML={{ __html: c.description }}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

        {/* Leveled Spells grouped by Level */}
        {levels
          .filter((lvl) => spellLevelFilter === "all" || spellLevelFilter === lvl)
          .map((lvl) => {
            const list = filteredLeveledSpells[lvl] || [];
            if (list.length === 0) return null;
            const suffix = lvl === 1 ? "st" : lvl === 2 ? "nd" : lvl === 3 ? "rd" : "th";
            const slot = localSlots.spellSlots.find((s) => s.level === lvl);
            const pact = localSlots.pactSlots.find((s) => s.level === lvl);
            return (
              <div key={lvl} className="rounded-lg border border-border/30 bg-secondary/15 p-3">
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-border/10 pb-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/90 select-none">
                    {lvl}
                    {suffix} Level
                  </h4>
                  {slot && renderSlotsInline(slot, false)}
                  {pact && renderSlotsInline(pact, true)}
                </div>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 items-start">
                  {list.map((spell) => {
                    const isExpanded = !!expandedItems[`spell-${spell.name}`];
                    return (
                      <div
                        key={spell.name}
                        className="flex flex-col rounded-md border border-border/50 bg-secondary/45 transition-all duration-200"
                      >
                        <button
                          onClick={() => toggleExpand(`spell-${spell.name}`)}
                          className="w-full text-left cursor-pointer flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs text-foreground hover:bg-secondary/60 focus:outline-none"
                        >
                          <span className="flex items-center gap-2 font-medium">
                            <BookOpen size={10} className="text-muted-foreground shrink-0" />
                            <span>{spell.name}</span>
                          </span>
                          <span className="text-[9px] text-muted-foreground font-mono">
                            {isExpanded ? "▲ LESS" : "▼ DETAILS"}
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="px-2.5 pb-2 border-t border-border/15 pt-2 flex flex-col gap-2">
                            {/* Spell Badges */}
                            <div className="flex flex-wrap gap-1">
                              {spell.school && (
                                <span className="rounded bg-secondary border border-border/30 px-1 py-0.5 text-[8px] uppercase tracking-wider text-muted-foreground">
                                  {spell.school}
                                </span>
                              )}
                              {spell.activation && (
                                <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-primary">
                                  ⚡ {getActivationText(spell.activation)}
                                </span>
                              )}
                              {spell.range && (
                                <span className="rounded bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-teal-400">
                                  🎯 {getRangeText(spell.range)}
                                </span>
                              )}
                              {spell.duration && (
                                <span className="rounded bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-amber-400">
                                  🕒 {getDurationText(spell.duration, spell.concentration)}
                                </span>
                              )}
                              {spell.components && (
                                <span
                                  className="rounded bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-purple-400"
                                  title={spell.componentsDescription}
                                >
                                  📜 {getComponentsText(spell.components)}
                                </span>
                              )}
                              {spell.ritual && (
                                <span className="rounded bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-sky-400 font-bold">
                                  Ritual
                                </span>
                              )}
                            </div>
                            {spell.description && (
                              <div
                                className="text-[10px] leading-relaxed text-muted-foreground/90 max-h-[160px] overflow-y-auto pr-1"
                                dangerouslySetInnerHTML={{ __html: spell.description }}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    );
  })();

  const trackedResources = displayActions
    .filter((a) => a.source === "class" && a.uses)
    .map((a) => localResources.getEffectiveResource(a));
  const untrackedResources = displayActions.filter(
    (a) => a.source === "class" && !a.uses && a.name === "Charge Magic Item",
  );
  const getResourceSortValue = (a: any) => {
    const type = a.activation?.activationType;
    if (type === 1) return 1; // Action
    if (type === 3) return 2; // Bonus Action
    if (type === 4) return 3; // Reaction
    return 4; // Other / None
  };
  const resourceActions = [...trackedResources, ...untrackedResources].sort((a, b) => {
    const sortA = getResourceSortValue(a);
    const sortB = getResourceSortValue(b);
    if (sortA !== sortB) return sortA - sortB;
    return a.name.localeCompare(b.name);
  });
  const resourcesPanel = resourceActions.length > 0 && (
    <Panel title="Class Resources" icon={Zap}>
      <div className="flex flex-col gap-2.5">
        {resourceActions.map((a) => {
          const u = a.uses;
          if (!u) {
            return (
              <div
                key={`${a.source}-${a.name}`}
                onClick={() => toggleExpand(`res-${a.name}`)}
                className="group/res flex flex-col gap-2 cursor-pointer rounded-xl border border-border/40 bg-gradient-to-r from-secondary/20 to-transparent p-3.5 transition-all duration-300 hover:border-accent/40"
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col min-w-0">
                    <span className="font-heading text-xs font-bold text-foreground truncate group-hover/res:text-accent transition-colors">
                      {a.name}
                    </span>
                  </div>
                  {a.activation && (
                    <span className="shrink-0 rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[8.5px] uppercase tracking-wider text-primary font-semibold select-none">
                      ⚡ {getActivationText(a.activation)}
                    </span>
                  )}
                </div>
                {expandedItems[`res-${a.name}`] && a.description && (
                  <div
                    className="text-[10px] leading-relaxed text-muted-foreground/90 mt-1 border-t border-border/10 pt-1.5"
                    dangerouslySetInnerHTML={{ __html: a.description }}
                  />
                )}
              </div>
            );
          }
          const out = u.current <= 0;
          const ratio = u.max > 0 ? u.current / u.max : 0;
          const isSmallMax = u.max <= 8;
          const isRageResource =
            a.name.toLowerCase() === "rage" ||
            a.name.toLowerCase() === "rages" ||
            a.name.toLowerCase() === "rage (enter)" ||
            a.name.toLowerCase().startsWith("rage (");
          const displayName = isRageResource ? "Rage" : a.name;
          return (
            <div
              key={`${a.source}-${a.name}`}
              onClick={() => toggleExpand(`res-${a.name}`)}
              className="group/res flex flex-col gap-2.5 cursor-pointer rounded-xl border border-border/40 bg-gradient-to-r from-secondary/20 to-transparent p-3.5 transition-all duration-300 hover:border-accent/40"
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col min-w-0">
                  <span className="font-heading text-xs font-bold text-foreground truncate group-hover/res:text-accent transition-colors">
                    {displayName}
                  </span>
                  {u.reset && (
                    <span className="flex items-center gap-1 text-[9px] font-semibold text-muted-foreground/80 uppercase tracking-wider mt-0.5 select-none">
                      🕒 Resets on {u.reset}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {isRageResource && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="inline-block" onClick={(e) => e.stopPropagation()}>
                          <CustomSelect
                            value={localRage}
                            onChange={setLocalRage}
                            options={rageOptions}
                            triggerClassName={cn(
                              "inline-flex items-center gap-1 cursor-pointer rounded border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider select-none transition-colors",
                              localRage !== "None"
                                ? "border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20"
                                : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary/60"
                            )}
                            labelPrefix={<span>🔥 Rage:&nbsp;</span>}
                            openUpward={true}
                            onOpenChange={setIsRageSelectOpen}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent
                        className={cn("max-w-[280px] text-xs", isRageSelectOpen && "hidden")}
                      >
                        {RAGE_DICTIONARY[localRage] || "Select a Rage state to apply benefits."}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <div className="flex items-baseline gap-0.5 select-none font-semibold">
                    <span
                      className={`font-mono text-sm font-extrabold ${out ? "text-destructive" : "text-accent"}`}
                    >
                      {u.current}
                    </span>
                    <span className="text-muted-foreground/50 text-[10px] font-mono">/</span>
                    <span className="font-mono text-xs text-muted-foreground">{u.max}</span>
                  </div>
                </div>
              </div>

              {isSmallMax ? (
                <div className="mt-1.5 flex items-center justify-between gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: u.max }).map((_, i) => {
                      const active = i < u.current;
                      return (
                        <span
                          key={i}
                          onClick={() => localResources.toggleResourceBubble(a.name, i, u.max)}
                          className={`h-3 w-3 rounded-full cursor-pointer border transition-all duration-200 hover:scale-120 ${
                            active
                              ? "border-accent bg-accent shadow-[0_0_8px_var(--accent)] hover:bg-accent/85"
                              : "border-accent/40 bg-transparent hover:bg-accent/20"
                          }`}
                          title={
                            active
                              ? "Active use bubble (Click to spend)"
                              : "Spent use bubble (Click to restore)"
                          }
                        />
                      );
                    })}
                  </div>
                  {a.activation && (
                    <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-primary font-semibold select-none">
                      ⚡ {getActivationText(a.activation)}
                    </span>
                  )}
                </div>
              ) : (
                <div className="mt-1.5 flex items-center justify-between gap-3" onClick={(e) => e.stopPropagation()}>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary/50 border border-border/10 p-[1.5px] flex items-center">
                    <div
                      className="h-full rounded-full bg-accent shadow-[0_0_8px_var(--accent)] transition-all duration-500"
                      style={{ width: `${ratio * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => localResources.useResource(a.name, u.max)}
                      disabled={u.current <= 0}
                      className="rounded-lg border border-accent/30 bg-accent/5 px-2.5 py-1 text-[9.5px] font-bold text-accent hover:bg-accent/15 disabled:opacity-30 cursor-pointer focus:outline-none transition-all"
                    >
                      Use
                    </button>
                    <button
                      onClick={() => localResources.regainResource(a.name)}
                      disabled={(localResources.spent[a.name] ?? 0) <= 0}
                      className="rounded-lg border border-border/50 bg-secondary/35 px-2.5 py-1 text-[9.5px] font-semibold text-muted-foreground hover:border-accent/40 hover:text-accent hover:bg-secondary/60 disabled:opacity-30 cursor-pointer focus:outline-none transition-all"
                    >
                      Regain
                    </button>
                    {a.activation && (
                      <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-primary font-semibold select-none ml-1">
                        ⚡ {getActivationText(a.activation)}
                      </span>
                    )}
                  </div>
                </div>
              )}



              {expandedItems[`res-${a.name}`] && a.description && (
                <div
                  className="text-[10px] leading-relaxed text-muted-foreground/90 mt-2 border-t border-border/10 pt-1.5"
                  dangerouslySetInnerHTML={{ __html: a.description }}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );

  // === COMPANIONS & SUMMONS ===
  const companionsPanel = member.creatures && member.creatures.length > 0 && (
    <Panel title="Companions & Summons" icon={Brain}>
      <div className="flex flex-col gap-4">
        {member.creatures.map((c) => {
          const def = c.definition;
          const getMod = (val: number) => {
            const m = Math.floor((val - 10) / 2);
            return m >= 0 ? `+${m}` : `${m}`;
          };
          const statNames = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
          return (
            <div
              key={c.id}
              className="flex flex-col gap-3 rounded-xl border border-border/40 bg-gradient-to-br from-secondary/15 to-transparent p-4 transition-all duration-300 hover:border-accent/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {def.avatarUrl ? (
                    <img
                      src={def.avatarUrl}
                      alt={def.name}
                      className="h-12 w-12 rounded-lg object-cover border border-border"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground text-[10px] font-bold uppercase select-none">
                      🐾
                    </div>
                  )}
                  <div>
                    <h4 className="font-heading text-sm font-extrabold text-foreground">{c.name || def.name}</h4>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-0.5 select-none">
                      {def.armorClassDescription
                        ? `${def.armorClass} AC ${def.armorClassDescription}`
                        : `${def.armorClass} AC`}
                    </p>
                  </div>
                </div>
                <div className="text-right select-none">
                  <div className="text-xs font-bold text-foreground">
                    HP: {def.averageHitPoints - c.removedHitPoints} / {def.averageHitPoints}
                  </div>
                  {def.hitPointDice && (
                    <span className="text-[9px] text-muted-foreground font-mono">
                      ({def.hitPointDice.diceString})
                    </span>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-6 gap-1 bg-secondary/35 rounded-lg p-2 text-center border border-border/10 select-none">
                {def.stats.map((s, idx) => (
                  <div key={s.statId}>
                    <div className="text-[9px] font-bold text-muted-foreground uppercase">
                      {statNames[idx] || `S${s.statId}`}
                    </div>
                    <div className="text-sm font-extrabold text-foreground mt-0.5">
                      {s.value}
                    </div>
                    <div className="text-[10px] text-muted-foreground/80 font-mono mt-0.5 font-semibold">
                      {getMod(s.value)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Senses and Speeds */}
              <div className="flex flex-wrap gap-1.5 text-[9.5px] select-none">
                {def.movements.map((mv) => (
                  <span
                    key={mv.movementId}
                    className="rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-primary font-semibold uppercase tracking-wide"
                  >
                    🚶 {mv.speed} ft.
                  </span>
                ))}
                {def.passivePerception && (
                  <span className="rounded-md bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 text-teal-400 font-semibold uppercase tracking-wide">
                    👁️ Passive Perception: {def.passivePerception}
                  </span>
                )}
              </div>

              {/* Saving Throws & Skills */}
              {((def.savingThrows && def.savingThrows.length > 0) || (def.skills && def.skills.length > 0)) && (
                <div className="flex flex-col gap-1.5 text-[11px] bg-secondary/20 rounded-lg p-2.5 border border-border/10 select-none">
                  {def.savingThrows && def.savingThrows.length > 0 && (
                    <div className="flex flex-wrap gap-x-2 gap-y-1 items-center">
                      <span className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wide">Saves:</span>
                      {def.savingThrows.map((st) => (
                        <span key={st.name} className="font-semibold text-foreground/95 bg-secondary/40 px-1.5 py-0.5 rounded border border-border/10">
                          {st.name} {st.value >= 0 ? `+${st.value}` : st.value}
                        </span>
                      ))}
                    </div>
                  )}
                  {def.skills && def.skills.length > 0 && (
                    <div className="flex flex-wrap gap-x-2 gap-y-1 items-center">
                      <span className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wide">Skills:</span>
                      {def.skills.map((sk) => (
                        <span key={sk.name} className="font-semibold text-foreground/95 bg-secondary/40 px-1.5 py-0.5 rounded border border-border/10">
                          {sk.name} {sk.value >= 0 ? `+${sk.value}` : sk.value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Descriptions & Actions */}
              <div className="flex flex-col gap-3.5 border-t border-border/10 pt-3 text-xs leading-relaxed text-muted-foreground/95">
                {def.specialTraitsDescription && (
                  <div>
                    <h5 className="text-[9.5px] font-bold uppercase text-foreground/80 tracking-wider mb-1 select-none">
                      Special Traits
                    </h5>
                    <div
                      dangerouslySetInnerHTML={{ __html: def.specialTraitsDescription }}
                      className="space-y-1 text-muted-foreground/90 pl-1"
                    />
                  </div>
                )}
                {def.actionsDescription && (
                  <div>
                    <h5 className="text-[9.5px] font-bold uppercase text-foreground/80 tracking-wider mb-1 select-none">
                      Actions
                    </h5>
                    <div
                      dangerouslySetInnerHTML={{ __html: def.actionsDescription }}
                      className="space-y-1 text-muted-foreground/90 pl-1"
                    />
                  </div>
                )}
                {def.reactionsDescription && (
                  <div>
                    <h5 className="text-[9.5px] font-bold uppercase text-foreground/80 tracking-wider mb-1 select-none">
                      Reactions
                    </h5>
                    <div
                      dangerouslySetInnerHTML={{ __html: def.reactionsDescription }}
                      className="space-y-1 text-muted-foreground/90 pl-1"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );

  // === INVENTORY ===
  const inventoryPanel = member.inventory.length > 0 && (
    <Panel title="Inventory" icon={Award}>
      <InventoryList
        items={member.inventory}
        currencies={member.currencies}
        weightCarried={member.weightCarried}
        carryingCapacity={displayCarryingCapacity}
      />
    </Panel>
  );

  // === ARTIFICER INFUSIONS ===
  const infusionsPanel = member.infusions && member.infusions.length > 0 && (
    <Panel
      title={
        <div className="flex items-center justify-between w-full">
          <span>Artificer Infusions</span>
          {artificerLevel > 0 && (
            <span className="text-[10px] lowercase font-normal text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded-full select-none normal-case tracking-normal">
              {localActiveInfusions.length} / {maxActiveInfusions} active
            </span>
          )}
        </div>
      }
      icon={Sparkles}
    >
      <div className="flex flex-col gap-2">
        <p className="text-[11px] text-muted-foreground mb-1.5 select-none">
          Click an infusion to toggle it as active/inactive.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {member.infusions.map((inf) => {
            const isActive = localActiveInfusions.includes(inf.name);
            return (
              <div
                key={inf.name}
                onClick={() => toggleLocalActiveInfusion(inf.name)}
                className={cn(
                  "flex flex-col gap-1.5 rounded-lg border p-2.5 transition-all duration-200 cursor-pointer select-none",
                  isActive
                    ? "border-primary bg-primary/5 shadow-[0_0_8px_color-mix(in_oklab,var(--primary)_15%,transparent)]"
                    : "border-border bg-secondary/15 hover:border-accent/40 hover:bg-secondary/25"
                )}
              >
                <div className="flex items-center justify-between gap-1.5 text-xs font-semibold select-none">
                  <span className="flex items-center gap-1.5 text-accent">
                    <span>🔧</span>
                    <span>{inf.name}</span>
                  </span>
                  {isActive && (
                    <span className="text-[9px] font-bold text-primary uppercase tracking-wider bg-primary/15 px-1.5 py-0.5 rounded animate-pulse">
                      Active
                    </span>
                  )}
                </div>
                {inf.description && (
                  <div
                    className="text-[10px] text-muted-foreground leading-normal"
                    dangerouslySetInnerHTML={{ __html: inf.description }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );

  // === SORCERER METAMAGIC ===
  const isSorcerer =
    member.classes.toLowerCase().includes("sorcerer") ||
    (member.metamagic && member.metamagic.length > 0);

  const sorcererLevel = member.classes
    .split("/")
    .map((c) => c.trim())
    .find((c) => c.toLowerCase().startsWith("sorcerer"))
    ?.match(/\d+/)?.[0];
  const sorcererLvlNum = sorcererLevel ? parseInt(sorcererLevel, 10) : member.level;

  const maxMetamagicCount =
    sorcererLvlNum >= 17 ? 4 : sorcererLvlNum >= 10 ? 3 : sorcererLvlNum >= 3 ? 2 : 0;

  const metamagicPanel = isSorcerer && maxMetamagicCount > 0 && (
    <Panel title="Metamagic Options" icon={Sparkles}>
      <div className="flex flex-col gap-2">
        <p className="text-[11px] text-muted-foreground mb-1 select-none">
          Select and modify your chosen Metamagic options:
        </p>
        <div className="flex flex-col gap-3">
          {Array.from({ length: maxMetamagicCount }).map((_, slotIdx) => {
            const currentOptionName = localMetamagic[slotIdx]?.name || "None";
            return (
              <div
                key={slotIdx}
                className="flex flex-col gap-1.5 p-3 rounded-lg border border-border bg-secondary/15"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                    Option {slotIdx + 1}
                  </span>
                  <CustomSelect
                    value={currentOptionName}
                    onChange={(val) => {
                      const nextMetamagic = [...localMetamagic];
                      if (val === "None") {
                        nextMetamagic.splice(slotIdx, 1);
                      } else {
                        const newOption = {
                          name: val,
                          description: METAMAGIC_DICTIONARY[val] || "",
                        };
                        if (slotIdx < nextMetamagic.length) {
                          nextMetamagic[slotIdx] = newOption;
                        } else {
                          nextMetamagic.push(newOption);
                        }
                      }
                      setLocalMetamagic(nextMetamagic.filter(Boolean));
                    }}
                    options={["None", ...Object.keys(METAMAGIC_DICTIONARY)]}
                    triggerClassName="text-accent text-xs font-heading font-extrabold border border-border/30 rounded px-1.5 py-0.5 hover:border-accent/40"
                    optionsWidth="w-48"
                  />
                </div>
                {currentOptionName !== "None" && METAMAGIC_DICTIONARY[currentOptionName] && (
                  <p className="text-[10.5px] leading-relaxed text-muted-foreground/90 border-t border-border/10 pt-2 mt-1">
                    {METAMAGIC_DICTIONARY[currentOptionName]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );

  // === WEAPON MASTERIES ===
  const weaponMasteriesPanel = localWeaponMasteries && localWeaponMasteries.length > 0 && (
    <Panel title="Weapon Masteries" icon={Swords}>
      <div className="flex flex-col gap-2">
        <p className="text-[11px] text-muted-foreground mb-1 select-none">
          Select and modify your chosen Weapon Mastery properties:
        </p>
        <div className="flex flex-col gap-3">
          {Array.from({ length: localWeaponMasteries.length }).map((_, slotIdx) => {
            const currentOptionName = localWeaponMasteries[slotIdx]?.name || "None";
            return (
              <div
                key={slotIdx}
                className="flex flex-col gap-1.5 p-3 rounded-lg border border-border bg-secondary/15"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                    Weapon {slotIdx + 1}
                  </span>
                  <CustomSelect
                    value={currentOptionName}
                    onChange={(val) => {
                      const nextMasteries = [...localWeaponMasteries];
                      if (val === "None") {
                        nextMasteries.splice(slotIdx, 1);
                      } else {
                        const newOption = {
                          name: val,
                          description: WEAPON_MASTERY_DICTIONARY[val] || "",
                        };
                        if (slotIdx < nextMasteries.length) {
                          nextMasteries[slotIdx] = newOption;
                        } else {
                          nextMasteries.push(newOption);
                        }
                      }
                      setLocalWeaponMasteries(nextMasteries.filter(Boolean));
                    }}
                    options={["None", ...Object.keys(WEAPON_MASTERY_DICTIONARY)]}
                    triggerClassName="text-accent text-xs font-heading font-extrabold border border-border/30 rounded px-1.5 py-0.5 hover:border-accent/40"
                    optionsWidth="w-56"
                  />
                </div>
                {currentOptionName !== "None" && WEAPON_MASTERY_DICTIONARY[currentOptionName] && (
                  <p className="text-[10.5px] leading-relaxed text-muted-foreground/90 border-t border-border/10 pt-2 mt-1">
                    {WEAPON_MASTERY_DICTIONARY[currentOptionName]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );

  // === FEATURES & TRAITS ===
  const armorerFeature =
    isArmorer && localArmorModel
      ? [
          {
            name: `Armor Model: ${localArmorModel}`,
            description:
              localArmorModel === "Guardian"
                ? "<strong>Thunder Gauntlets:</strong> Your armored fists each count as a simple melee weapon while you aren't holding anything in them, dealing 1d8 thunder damage. A creature hit has disadvantage on attack rolls against targets other than you.<br/><br/><strong>Defensive Field:</strong> As a bonus action, you can gain temporary hit points equal to your level. You can use this a number of times equal to your proficiency bonus per long rest."
                : "<strong>Lightning Launcher:</strong> A gemlike node appears on one of your armored fists or chest. It counts as a simple ranged weapon, range 90/300, dealing 1d6 lightning damage. Once on each of your turns when you hit, you can deal an extra 1d6 lightning damage.<br/><br/><strong>Powered Steps:</strong> Your walking speed increases by 5 feet.<br/><br/><strong>Dampening Field:</strong> You have advantage on Dexterity (Stealth) checks.",
            source: "class" as const,
            sourceName: "Artificer",
            level: undefined,
            isUnlocked: true,
          },
        ]
      : [];

  const barbarianFeature =
    isBarbarian &&
    localTotemAspects &&
    localTotemAspects.length > 0 &&
    localTotemAspects[0].name !== "None"
      ? [
          {
            name: `Totem Aspect: ${localTotemAspects[0].name}`,
            description:
              localTotemAspects[0].description ||
              TOTEM_ASPECT_DICTIONARY[localTotemAspects[0].name] ||
              "",
            source: "class" as const,
            sourceName: "Barbarian",
            level: undefined,
            isUnlocked: true,
          },
        ]
      : [];

  const metamagicFeatures =
    localMetamagic && localMetamagic.length > 0
      ? localMetamagic
          .filter((m) => m.name && m.name !== "None")
          .map((m) => ({
            name: `Metamagic: ${m.name}`,
            description: m.description || METAMAGIC_DICTIONARY[m.name] || "",
            source: "class" as const,
            sourceName: "Sorcerer",
            level: undefined,
            isUnlocked: true,
          }))
      : [];

  const weaponMasteryFeatures =
    localWeaponMasteries && localWeaponMasteries.length > 0
      ? localWeaponMasteries
          .filter((w) => w.name && w.name !== "None")
          .map((w) => ({
            name: `Weapon Mastery: ${w.name}`,
            description: w.description || WEAPON_MASTERY_DICTIONARY[w.name] || "",
            source: "class" as const,
            sourceName: "Martial",
            level: undefined,
            isUnlocked: true,
          }))
      : [];

  const combinedFeatures = [
    ...armorerFeature,
    ...barbarianFeature,
    ...metamagicFeatures,
    ...weaponMasteryFeatures,
    ...(member.feats ?? []).map((f) => ({
      name: f.name,
      description: f.description,
      source: "feat" as const,
      sourceName: "Feat" + (f.choices && f.choices.length > 0 ? ` (${f.choices.join(", ")})` : ""),
      level: undefined,
      isUnlocked: true,
    })),
    ...(member.features ?? []).map((f) => ({
      name: f.name,
      description: f.description,
      source: f.source,
      sourceName: f.sourceName,
      level: f.level,
      isUnlocked: f.isUnlocked !== false,
    })),
  ];

  const filteredFeatures = combinedFeatures.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(featureSearch.toLowerCase()) ||
      f.description.toLowerCase().includes(featureSearch.toLowerCase());
    const matchesFilter = featureFilter === "all" || f.source === featureFilter;
    return matchesSearch && matchesFilter;
  });

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    filteredFeatures.forEach((f, idx) => {
      next[`feat-${f.name}-${idx}`] = true;
    });
    setExpandedItems(next);
  };

  const collapseAll = () => {
    setExpandedItems({});
  };

  const renderFeatureSection = (
    title: string,
    items: typeof combinedFeatures,
    icon: React.ComponentType<{ size?: number; className?: string }>,
    accentColor: string,
  ) => {
    if (items.length === 0) return null;
    const SectionIcon = icon;
    return (
      <div className="flex flex-col gap-3">
        <h4 className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground/90 select-none border-b border-border/10 pb-2 mt-2">
          <SectionIcon size={12} className={accentColor} />
          <span>{title}</span>
          <span className="ml-1 rounded-full bg-secondary/80 px-2 py-0.5 font-mono text-[9px] text-muted-foreground font-semibold">
            {items.length}
          </span>
        </h4>
        <div className="grid gap-2.5 sm:grid-cols-1 md:grid-cols-2 items-start">
          {items.map((f, idx) => {
            const isExpanded = !!expandedItems[`feat-${f.name}-${idx}`];
            const isLocked = f.isUnlocked === false;
            // Strip HTML to get a clean preview string
            const cleanDesc = f.description ? f.description.replace(/<[^>]*>/g, "") : "";
            const previewText = cleanDesc.slice(0, 110) + (cleanDesc.length > 110 ? "..." : "");

            return (
              <div
                key={`${f.name}-${idx}`}
                className={`flex flex-col rounded-xl border transition-all duration-300 ${
                  isLocked
                    ? "opacity-50 border-border/20 bg-secondary/5"
                    : isExpanded
                      ? "border-accent/40 bg-secondary/25 font-medium"
                      : "border-border/40 bg-secondary/15 hover:border-accent/30 hover:scale-[1.002]"
                }`}
              >
                <div
                  onClick={() => toggleExpand(`feat-${f.name}-${idx}`)}
                  className="flex w-full cursor-pointer items-start justify-between gap-3 p-3.5 text-left text-xs focus:outline-none select-none"
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isLocked && <Lock size={11} className="text-muted-foreground/60 shrink-0" />}
                      <span
                        className={`font-heading font-extrabold transition-colors ${
                          isLocked
                            ? "text-muted-foreground/80"
                            : "text-foreground group-hover:text-accent"
                        }`}
                      >
                        {f.name}
                      </span>
                      {f.source === "class" && (
                        <span className="shrink-0 rounded bg-accent/10 border border-accent/25 px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-wider text-accent">
                          {isLocked ? "Locked • " : ""}
                          {f.sourceName} {f.level !== undefined ? `• Lvl ${f.level}` : ""}
                        </span>
                      )}
                      {f.source === "race" && (
                        <span className="shrink-0 rounded bg-primary/10 border border-primary/25 px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-wider text-primary">
                          {isLocked ? "Locked • " : ""}
                          {f.sourceName}
                        </span>
                      )}
                      {f.source === "feat" && (
                        <span className="shrink-0 rounded bg-gold/10 border border-gold/25 px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-wider text-gold text-glow-gold">
                          {isLocked ? "Locked • " : ""}
                          {f.sourceName}
                        </span>
                      )}
                      {f.source !== "class" &&
                        f.source !== "race" &&
                        f.source !== "feat" &&
                        f.sourceName && (
                          <span className="shrink-0 rounded bg-secondary/30 border border-border/45 px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-wider text-muted-foreground">
                            {isLocked ? "Locked • " : ""}
                            {f.sourceName}
                          </span>
                        )}
                    </div>
                    {!isExpanded && previewText && (
                      <span className="mt-1.5 text-[10.5px] leading-relaxed text-muted-foreground/80 line-clamp-1">
                        {previewText}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 self-center">
                    <span className="font-mono text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                      {isExpanded ? "Close" : "Open"}
                    </span>
                    <span
                      className={`text-muted-foreground/60 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                    >
                      ▼
                    </span>
                  </div>
                </div>
                {isExpanded && f.description && (
                  <div
                    className="px-4 pb-4 text-[11px] leading-relaxed text-muted-foreground/90 border-t border-border/10 pt-3 max-h-[240px] overflow-y-auto pr-1"
                    dangerouslySetInnerHTML={{ __html: f.description }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const classFeatures = filteredFeatures.filter((f) => f.source === "class");
  const racialTraits = filteredFeatures.filter((f) => f.source === "race");
  const feats = filteredFeatures.filter((f) => f.source === "feat");

  const allCount = combinedFeatures.length;
  const classCount = combinedFeatures.filter((f) => f.source === "class").length;
  const raceCount = combinedFeatures.filter((f) => f.source === "race").length;
  const featCount = combinedFeatures.filter((f) => f.source === "feat").length;

  const featuresPanel = combinedFeatures.length > 0 && (
    <Panel title="Features & Traits" icon={Award}>
      <div className="flex flex-col gap-4">
        {/* Search & Bulk Toggles */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/10 pb-3">
          <input
            type="text"
            placeholder="Search features..."
            value={featureSearch}
            onChange={(e) => setFeatureSearch(e.target.value)}
            className="rounded-lg border border-border bg-secondary/35 px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40 w-full sm:max-w-xs"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="rounded-md bg-secondary/20 px-2.5 py-1 text-[10.5px] font-semibold text-muted-foreground hover:bg-secondary/40 hover:text-foreground transition-all border border-border/30"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="rounded-md bg-secondary/20 px-2.5 py-1 text-[10.5px] font-semibold text-muted-foreground hover:bg-secondary/40 hover:text-foreground transition-all border border-border/30"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border/10 pb-3">
          <button
            onClick={() => setFeatureFilter("all")}
            className={`rounded-full px-3 py-1 text-[10.5px] font-semibold transition-all select-none border ${
              featureFilter === "all"
                ? "bg-accent/15 border-accent/40 text-accent font-extrabold shadow-[0_0_8px_rgba(168,85,247,0.2)]"
                : "bg-secondary/10 border-border/20 text-muted-foreground hover:bg-secondary/20 hover:text-foreground"
            }`}
          >
            All <span className="ml-1 text-[9.5px] opacity-75">({allCount})</span>
          </button>
          <button
            onClick={() => setFeatureFilter("class")}
            className={`rounded-full px-3 py-1 text-[10.5px] font-semibold transition-all select-none border ${
              featureFilter === "class"
                ? "bg-accent/15 border-accent/40 text-accent font-extrabold shadow-[0_0_8px_rgba(168,85,247,0.2)]"
                : "bg-secondary/10 border-border/20 text-muted-foreground hover:bg-secondary/20 hover:text-foreground"
            }`}
          >
            Class Features <span className="ml-1 text-[9.5px] opacity-75">({classCount})</span>
          </button>
          <button
            onClick={() => setFeatureFilter("race")}
            className={`rounded-full px-3 py-1 text-[10.5px] font-semibold transition-all select-none border ${
              featureFilter === "race"
                ? "bg-primary/15 border-primary/40 text-primary font-extrabold shadow-[0_0_8px_rgba(20,184,166,0.2)]"
                : "bg-secondary/10 border-border/20 text-muted-foreground hover:bg-secondary/20 hover:text-foreground"
            }`}
          >
            Racial Traits <span className="ml-1 text-[9.5px] opacity-75">({raceCount})</span>
          </button>
          <button
            onClick={() => setFeatureFilter("feat")}
            className={`rounded-full px-3 py-1 text-[10.5px] font-semibold transition-all select-none border ${
              featureFilter === "feat"
                ? "bg-gold/15 border-gold/40 text-gold font-extrabold shadow-[0_0_8px_rgba(234,179,8,0.2)]"
                : "bg-secondary/10 border-border/20 text-muted-foreground hover:bg-secondary/20 hover:text-foreground"
            }`}
          >
            Feats & Talents <span className="ml-1 text-[9.5px] opacity-75">({featCount})</span>
          </button>
        </div>

        {/* Features Subsections */}
        {filteredFeatures.length > 0 ? (
          <div className="flex flex-col gap-5">
            {renderFeatureSection("Class Features", classFeatures, BookOpen, "text-accent")}
            {renderFeatureSection("Racial Traits", racialTraits, User, "text-primary")}
            {renderFeatureSection("Feats & Talents", feats, Award, "text-gold")}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-muted-foreground select-none">
            No features found matching criteria.
          </div>
        )}
      </div>
    </Panel>
  );

  // === BIO PANEL ===
  const bioPanel = (() => {
    const chars = member.characteristics;
    const hasPhysicalDetails =
      chars?.gender || chars?.age || chars?.height || chars?.weight || chars?.eyes || chars?.skin || chars?.hair;

    const physicalDetails = [
      { label: "Gender", value: chars?.gender },
      { label: "Age", value: chars?.age },
      { label: "Height", value: chars?.height },
      { label: "Weight", value: chars?.weight },
      { label: "Eyes", value: chars?.eyes },
      { label: "Skin", value: chars?.skin },
      { label: "Hair", value: chars?.hair },
    ].filter((d) => d.value);

    return (
      <Panel title="Biography & Backstory" icon={User}>
        <div className="flex flex-col gap-4 text-xs">
          {/* Physical Details Grid */}
          {hasPhysicalDetails && (
            <div className="rounded-lg border border-border/40 bg-secondary/10 p-3">
              <h4 className="mb-2.5 font-bold uppercase tracking-wider text-accent select-none">
                Physical Characteristics
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {physicalDetails.map((detail) => (
                  <div
                    key={detail.label}
                    className="rounded-md border border-border/30 bg-secondary/25 p-2 text-center"
                  >
                    <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground select-none">
                      {detail.label}
                    </div>
                    <div className="mt-0.5 text-xs font-semibold text-foreground truncate" title={detail.value}>
                      {detail.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Appearance Description */}
          {chars?.appearance && (
            <div className="rounded-lg border border-border/40 bg-secondary/10 p-3">
              <h4 className="mb-2 font-bold uppercase tracking-wider text-accent select-none">
                Appearance Details
              </h4>
              <p className="leading-relaxed text-muted-foreground whitespace-pre-line">
                {chars.appearance}
              </p>
            </div>
          )}

          {/* Backstory */}
          {chars?.backstory && (
            <div className="rounded-lg border border-border/40 bg-secondary/10 p-3">
              <h4 className="mb-2 font-bold uppercase tracking-wider text-accent select-none">
                Backstory
              </h4>
              <p className="leading-relaxed text-muted-foreground whitespace-pre-line">
                {chars.backstory}
              </p>
            </div>
          )}

          {/* Personality, Ideals, Bonds, Flaws */}
          <div className="grid gap-3 md:grid-cols-2">
            {chars?.personalityTraits && (
              <div className="rounded-lg border border-border/40 bg-secondary/10 p-3">
                <h4 className="mb-2 font-bold uppercase tracking-wider text-accent select-none">
                  Personality Traits
                </h4>
                <p className="leading-relaxed text-muted-foreground whitespace-pre-line">
                  {chars.personalityTraits}
                </p>
              </div>
            )}
            {chars?.ideals && (
              <div className="rounded-lg border border-border/40 bg-secondary/10 p-3">
                <h4 className="mb-2 font-bold uppercase tracking-wider text-accent select-none">
                  Ideals
                </h4>
                <p className="leading-relaxed text-muted-foreground whitespace-pre-line">
                  {chars.ideals}
                </p>
              </div>
            )}
            {chars?.bonds && (
              <div className="rounded-lg border border-border/40 bg-secondary/10 p-3">
                <h4 className="mb-2 font-bold uppercase tracking-wider text-accent select-none">
                  Bonds
                </h4>
                <p className="leading-relaxed text-muted-foreground whitespace-pre-line">
                  {chars.bonds}
                </p>
              </div>
            )}
            {chars?.flaws && (
              <div className="rounded-lg border border-border/40 bg-secondary/10 p-3">
                <h4 className="mb-2 font-bold uppercase tracking-wider text-accent select-none">
                  Flaws
                </h4>
                <p className="leading-relaxed text-muted-foreground whitespace-pre-line">
                  {chars.flaws}
                </p>
              </div>
            )}
          </div>

          {/* Allies, Enemies, Organizations, Other Notes */}
          <div className="grid gap-3 md:grid-cols-2">
            {chars?.organizations && (
              <div className="rounded-lg border border-border/40 bg-secondary/10 p-3">
                <h4 className="mb-2 font-bold uppercase tracking-wider text-accent select-none">
                  Organizations
                </h4>
                <p className="leading-relaxed text-muted-foreground whitespace-pre-line">
                  {chars.organizations}
                </p>
              </div>
            )}
            {chars?.allies && (
              <div className="rounded-lg border border-border/40 bg-secondary/10 p-3">
                <h4 className="mb-2 font-bold uppercase tracking-wider text-accent select-none">
                  Allies
                </h4>
                <p className="leading-relaxed text-muted-foreground whitespace-pre-line">
                  {chars.allies}
                </p>
              </div>
            )}
            {chars?.enemies && (
              <div className="rounded-lg border border-border/40 bg-secondary/10 p-3">
                <h4 className="mb-2 font-bold uppercase tracking-wider text-accent select-none">
                  Enemies
                </h4>
                <p className="leading-relaxed text-muted-foreground whitespace-pre-line">
                  {chars.enemies}
                </p>
              </div>
            )}
            {chars?.otherNotes && (
              <div className="rounded-lg border border-border/40 bg-secondary/10 p-3">
                <h4 className="mb-2 font-bold uppercase tracking-wider text-accent select-none">
                  Other Notes
                </h4>
                <p className="leading-relaxed text-muted-foreground whitespace-pre-line">
                  {chars.otherNotes}
                </p>
              </div>
            )}
          </div>
        </div>
      </Panel>
    );
  })();

  // === LAYOUT SWITCHER ===
  const layoutSwitcher = (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/40 bg-secondary/15 p-2.5 backdrop-blur-md">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none pl-1">
        Sheet Layout
      </span>
      <div className="flex flex-wrap gap-1">
        {(
          [
            { id: "tabbed", label: "Interactive Tabs", icon: Layers },
            { id: "classic", label: "Classic", icon: LayoutGrid },
            { id: "sticky", label: "Sticky Sidebar", icon: Columns2 },
            { id: "widescreen", label: "Widescreen", icon: Columns3 },
          ] as const
        ).map((opt) => {
          const ActiveIcon = opt.icon;
          const isActive = activeLayout === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => {
                setActiveLayout(opt.id);
                try {
                  localStorage.setItem("party-stats:detail-layout", opt.id);
                } catch {}
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
                isActive
                  ? "border-accent bg-accent/15 text-accent shadow-[0_0_10px_color-mix(in_oklab,var(--accent)_35%,transparent)]"
                  : "border-border/30 bg-secondary/35 text-muted-foreground hover:border-accent/40 hover:text-accent hover:bg-secondary/60"
              }`}
            >
              <ActiveIcon size={12} className={isActive ? "animate-pulse" : ""} />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  // === TAB NAVIGATION FOR TABBED VIEW ===
  const hasSpellcasting =
    member.spellcasting?.length > 0 ||
    member.cantrips.length > 0 ||
    member.preparedSpells.length > 0;

  const tabs = [
    { id: "skills", label: "Skills & Stats", icon: BookOpen },
    { id: "combat", label: "Combat & Actions", icon: Swords },
    ...(hasSpellcasting ? [{ id: "spells", label: "Spellbook", icon: Sparkles }] : []),
    { id: "features", label: "Features & Traits", icon: Award },
    ...(member.creatures && member.creatures.length > 0 ? [{ id: "companions", label: "Companions", icon: Brain }] : []),
    { id: "gear", label: "Inventory", icon: Package },
    { id: "bio", label: "Bio & Appearance", icon: User },
  ];

  const tabNavigation = activeLayout === "tabbed" && (
    <div className="flex flex-wrap gap-1.5 border-b border-border/20 pb-3">
      {tabs.map((tab) => {
        const TabIcon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() =>
              setActiveTab(tab.id as any)
            }
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer focus:outline-none ${
              isActive
                ? "border-accent bg-accent/10 text-accent font-bold shadow-[0_0_12px_color-mix(in_oklab,var(--accent)_25%,transparent)]"
                : "border-border/30 bg-secondary/25 text-muted-foreground hover:border-accent/40 hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <TabIcon
              size={12}
              className={isActive ? "text-accent animate-pulse" : "text-muted-foreground"}
            />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );

  const hitDiceConsole = (() => {
    const pools = parseHitDice(member.hitDice);
    if (pools.length === 0) return null;
    return (
      <Panel title="Hit Dice Tracker" icon={Heart} padding="p-3.5 py-3">
        <div className="flex flex-col gap-2">
          {pools.map((pool) => {
            const spent = localHp.spentHitDice[pool.die] ?? 0;
            const remaining = pool.remaining - spent;
            const pct = pool.total > 0 ? (remaining / pool.total) * 100 : 0;
            const barColor = pct > 50 ? "bg-hp-good" : pct > 20 ? "bg-hp-wounded" : "bg-hp-critical";
            const q = bulkCounts[pool.die] ?? 1;

            return (
              <div
                key={pool.die}
                className="group/hd relative overflow-hidden rounded-lg border border-border/40 bg-secondary/10 p-2 transition-all duration-200 hover:border-accent/40 hover:bg-secondary/20"
              >
                <div className="flex flex-col gap-2">
                  {/* Header Row */}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 font-bold uppercase tracking-wider text-muted-foreground select-none">
                      <span className="w-4 h-4 text-accent/80 inline-block"><DieSvg die="d20" active={true} /></span>
                      <span>{pool.die} Pool</span>
                    </span>
                    <span className="font-mono font-bold text-muted-foreground">
                      <strong className="text-foreground">{remaining}</strong> / {pool.total} Remaining
                    </span>
                  </div>

                  {/* Visual Dice Slot Grid */}
                  <div className="flex flex-wrap gap-1 py-0.5">
                    {Array.from({ length: pool.total }).map((_, i) => {
                      const active = i < remaining;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            if (active) {
                              localHp.spendHitDie(pool.die, 1);
                            } else {
                              localHp.regainHitDie(pool.die, 1);
                            }
                          }}
                          className="h-8 w-8 flex items-center justify-center transition-all duration-200 cursor-pointer focus:outline-none hover:scale-105 active:scale-95"
                          title={active ? `Click to spend 1 ${pool.die}` : `Click to regain 1 ${pool.die}`}
                        >
                          <DieSvg die={pool.die} active={active} />
                        </button>
                      );
                    })}
                  </div>

                  {/* Progress Line */}
                  <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full ${barColor} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    );
  })();

  const sessionControls = (
    <Panel title="Session Rest" icon={Moon} padding="p-3.5 py-3">
      <div className="flex flex-wrap gap-1.5 items-center">
        <button
          onClick={() => {
            setShortRestHealInput("0");
            setShortRestDiceSpend({});
            setRestModal({ type: "short" });
          }}
          className="flex-1 min-w-[90px] rounded-lg border border-border bg-secondary/35 px-2.5 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground hover:border-accent hover:text-accent hover:bg-secondary/60 cursor-pointer focus:outline-none flex items-center justify-center gap-1"
        >
          ⏰ Short
        </button>
        <button
          onClick={() => {
            setRestModal({ type: "long" });
          }}
          className="flex-1 min-w-[90px] rounded-lg border border-border bg-secondary/35 px-2.5 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground hover:border-accent hover:text-accent hover:bg-secondary/60 cursor-pointer focus:outline-none flex items-center justify-center gap-1"
        >
          💤 Long
        </button>
        <button
          onClick={() => {
            setShowSyncConfirm(true);
          }}
          className="flex-1 min-w-[90px] inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-secondary/35 px-2.5 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground hover:border-destructive hover:text-destructive hover:bg-secondary/60 cursor-pointer focus:outline-none"
        >
          <RefreshCw size={11} /> Sync DDB
        </button>
      </div>
    </Panel>
  );

  // Define layout structures
  let content = null;

  if (activeLayout === "classic") {
    content = (
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-4">
          {abilityScores}
          {savingThrows}
          {senses}
          {skills}
          {defenses}
          {proficiencies}
        </div>
        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-4">
          {attacks}
          {weaponMasteriesPanel}
          {spellcastingPanel}
          {metamagicPanel}
          {spellLists}
          {resourcesPanel}
          {inventoryPanel}
          {infusionsPanel}
          {featuresPanel}
          {companionsPanel}
        </div>
      </div>
    );
  } else if (activeLayout === "sticky") {
    content = (
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        {/* LEFT COLUMN - STICKY */}
        <div className="lg:sticky lg:top-4 flex flex-col gap-4 self-start">
          {abilityScores}
          {savingThrows}
          {senses}
          {defenses}
        </div>
        {/* RIGHT COLUMN - SCROLLING */}
        <div className="flex flex-col gap-4">
          {attacks}
          {weaponMasteriesPanel}
          {spellcastingPanel}
          {metamagicPanel}
          {spellLists}
          {resourcesPanel}
          {skills}
          {inventoryPanel}
          {infusionsPanel}
          {featuresPanel}
          {companionsPanel}
          {proficiencies}
        </div>
      </div>
    );
  } else if (activeLayout === "widescreen") {
    content = (
      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr_1.1fr]">
        {/* COLUMN 1: CORE STATS, SAVES & SKILLS */}
        <div className="flex flex-col gap-4">
          {abilityScores}
          {savingThrows}
          {senses}
          {defenses}
          {skills}
          {proficiencies}
        </div>
        {/* COLUMN 2: COMBAT & GEAR */}
        <div className="flex flex-col gap-4">
          {attacks}
          {weaponMasteriesPanel}
          {resourcesPanel}
          {inventoryPanel}
          {infusionsPanel}
        </div>
        {/* COLUMN 3: MAGIC, FEATURES & COMPANIONS */}
        <div className="flex flex-col gap-4">
          {spellcastingPanel}
          {metamagicPanel}
          {spellLists}
          {featuresPanel}
          {companionsPanel}
        </div>
      </div>
    );
  } else if (activeLayout === "tabbed") {
    content = (
      <div className="flex flex-col gap-4">
        {tabNavigation}
        <div className="min-h-[300px]">
          {activeTab === "combat" && (
            <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
              <div className="flex flex-col gap-4">{attacks}</div>
              <div className="flex flex-col gap-4">
                {resourcesPanel}
                {weaponMasteriesPanel}
              </div>
            </div>
          )}
          {activeTab === "spells" && (
            <div className="flex flex-col gap-4">
              {spellcastingPanel && expandedSpellbook ? (
                <div className="grid gap-4 lg:grid-cols-[1.2fr_2.8fr]">
                  <div className="flex flex-col gap-4">
                    {spellcastingPanel}
                    {metamagicPanel}
                  </div>
                  <div>{expandedSpellbook}</div>
                </div>
              ) : spellcastingPanel ? (
                <div className="flex flex-col gap-4">
                  {spellcastingPanel}
                  {metamagicPanel}
                </div>
              ) : expandedSpellbook ? (
                <div className="grid gap-4 lg:grid-cols-[1.2fr_2.8fr]">
                  <div className="flex flex-col gap-4">{metamagicPanel}</div>
                  <div>{expandedSpellbook}</div>
                </div>
              ) : metamagicPanel ? (
                <div>{metamagicPanel}</div>
              ) : (
                <Panel>
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No spellcasting capabilities.
                  </p>
                </Panel>
              )}
            </div>
          )}
          {activeTab === "skills" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                {abilityScores}
                {savingThrows}
                {senses}
              </div>
              <div className="flex flex-col gap-4">
                {skills}
                {defenses}
                {proficiencies}
              </div>
            </div>
          )}
          {activeTab === "features" && (
            <div className="flex flex-col gap-4">
              {featuresPanel || (
                <Panel>
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No features trained.
                  </p>
                </Panel>
              )}
            </div>
          )}
          {activeTab === "companions" && (
            <div className="flex flex-col gap-4">
              {companionsPanel || (
                <Panel>
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No companions active.
                  </p>
                </Panel>
              )}
            </div>
          )}
          {activeTab === "gear" && (
            <div className="flex flex-col gap-4">
              {inventoryPanel}
              {infusionsPanel}
              {!inventoryPanel && !infusionsPanel && (
                <Panel>
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No items in inventory.
                  </p>
                </Panel>
              )}
            </div>
          )}
          {activeTab === "bio" && (
            <div>
              {bioPanel || (
                <Panel>
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No biography traits found.
                  </p>
                </Panel>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 relative">
      <section className="card-arcane relative rounded-xl border border-border/40 p-5 shadow-lg">
        <div className="grid gap-6 md:grid-cols-[1.3fr_1fr] items-start">
          <div className="w-full">
            {heroContent}
          </div>
          <div className="w-full border-t border-border/10 pt-5 md:border-t-0 md:pt-0 md:border-l md:border-border/10 md:pl-6">
            {vitalsContent}
          </div>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-2 items-start">
        <div className="flex flex-col gap-3">
          {sessionControls}
          {layoutSwitcher}
        </div>
        <div>
          {hitDiceConsole}
        </div>
      </div>
      {content}

      {/* SHORT REST MODAL */}
      {restModal?.type === "short" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-popover p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="font-heading text-lg font-bold text-foreground mb-1.5 flex items-center gap-2">
              ⏰ Take a Short Rest
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Restores pact magic spell slots and resets matching class resources. You can also roll
              hit dice to heal.
            </p>
            {(() => {
              const pools = parseHitDice(member.hitDice);
              const availablePools = pools.filter(p => (p.remaining - (localHp.spentHitDice[p.die] ?? 0)) > 0);
              if (availablePools.length === 0) return null;
              return (
                <div className="mb-4 rounded-lg border border-border/40 bg-secondary/10 p-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Spend Hit Dice for Healing
                  </label>
                  <div className="flex flex-col gap-2.5">
                    {availablePools.map((pool) => {
                      const remaining = pool.remaining - (localHp.spentHitDice[pool.die] ?? 0);
                      const chosen = shortRestDiceSpend[pool.die] ?? 0;
                      return (
                        <div key={pool.die} className="flex items-center justify-between text-xs">
                          <span className="font-mono text-muted-foreground">
                            {pool.die} ({remaining} remaining)
                          </span>
                          <div className="flex items-center rounded border border-border/40 bg-secondary/20 p-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setShortRestDiceSpend(prev => ({
                                  ...prev,
                                  [pool.die]: Math.max(0, (prev[pool.die] ?? 0) - 1)
                                }));
                              }}
                              disabled={chosen <= 0}
                              className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 cursor-pointer focus:outline-none"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="w-6 text-center font-mono text-[11px] font-bold select-none">{chosen}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setShortRestDiceSpend(prev => ({
                                  ...prev,
                                  [pool.die]: Math.min(remaining, (prev[pool.die] ?? 0) + 1)
                                }));
                              }}
                              disabled={chosen >= remaining}
                              className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 cursor-pointer focus:outline-none"
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            <div className="mb-4">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Hit Points Regained
              </label>
              <input
                type="number"
                value={shortRestHealInput}
                onChange={(e) => setShortRestHealInput(e.target.value)}
                placeholder="0"
                className="w-full rounded border border-border bg-secondary px-3 py-2 text-sm font-mono text-foreground focus:outline-none"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRestModal(null)}
                className="rounded border border-border bg-transparent px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const healAmt = parseInt(shortRestHealInput, 10) || 0;
                  localHp.shortRest(healAmt);
                  
                  // Consume selected hit dice
                  Object.entries(shortRestDiceSpend).forEach(([die, count]) => {
                    if (count > 0) {
                      localHp.spendHitDie(die, count);
                    }
                  });

                  localSlots.restSlots(false);
                  localResources.restResources(false);
                  setRestModal(null);
                }}
                className="rounded bg-accent px-4 py-1.5 text-xs font-bold text-accent-foreground hover:bg-accent/90 cursor-pointer"
              >
                Apply Rest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LONG REST MODAL */}
      {restModal?.type === "long" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-popover p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="font-heading text-lg font-bold text-foreground mb-1.5 flex items-center gap-2">
              💤 Take a Long Rest
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Are you sure you want to take a Long Rest? This will fully restore Hit Points, regain
              half of spent hit dice, reset all spell slots, and reset long-rest class resources.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRestModal(null)}
                className="rounded border border-border bg-transparent px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  localHp.longRest();
                  localSlots.restSlots(true);
                  localResources.restResources(true);
                  setRestModal(null);
                }}
                className="rounded bg-accent px-4 py-1.5 text-xs font-bold text-accent-foreground hover:bg-accent/90 cursor-pointer"
              >
                Confirm Long Rest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SYNC/RESET CONFIRMATION MODAL */}
      {showSyncConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-popover p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="font-heading text-lg font-bold text-foreground mb-1.5 flex items-center gap-2">
              🔄 Sync with D&D Beyond
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              This will discard all local overrides (HP modifications, spent spell slots, used class
              resources, conditions) and fetch the latest values directly from the server.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSyncConfirm(false)}
                className="rounded border border-border bg-transparent px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  localHp.reset();
                  localSlots.reset();
                  localResources.reset();
                  setLocalArmorModel(member.activeArmorModel);
                  setLocalTotemAspects(member.totemAspects || []);
                  setLocalMetamagic(member.metamagic || []);
                  setLocalWeaponMasteries(member.weaponMasteries || []);
                  setLocalActiveInfusions(member.activeInfusions || []);
                  setLocalRage("None");
                  clearLocalConditions();
                  setShowSyncConfirm(false);
                }}
                className="rounded bg-destructive px-4 py-1.5 text-xs font-bold text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
              >
                Sync & Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
