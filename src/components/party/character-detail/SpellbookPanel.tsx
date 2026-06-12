import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  LayoutGrid,
  Columns2,
  Search,
  BookOpen,
  Shield,
  Layers,
  Eye,
  Heart,
  Flame,
  Moon,
  Skull,
  RefreshCw,
  Clock,
  Target,
  Scroll,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PartyMember, PreparedSpell, SpellSlotLevel } from "@/lib/dndbeyond.functions";
import { Panel, CustomSelect } from "../CharacterDetailView";

const SCHOOL_THEMES: Record<
  string,
  {
    color: string;
    bg: string;
    text: string;
    border: string;
    glow: string;
    icon: any;
  }
> = {
  abjuration: {
    color: "cyan",
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
    glow: "shadow-cyan-500/20",
    icon: Shield,
  },
  conjuration: {
    color: "orange",
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    border: "border-orange-500/30",
    glow: "shadow-orange-500/20",
    icon: Layers,
  },
  divination: {
    color: "indigo",
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    border: "border-indigo-500/30",
    glow: "shadow-indigo-500/20",
    icon: Eye,
  },
  enchantment: {
    color: "pink",
    bg: "bg-pink-500/10",
    text: "text-pink-400",
    border: "border-pink-500/30",
    glow: "shadow-pink-500/20",
    icon: Heart,
  },
  evocation: {
    color: "red",
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/30",
    glow: "shadow-red-500/20",
    icon: Flame,
  },
  illusion: {
    color: "purple",
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/30",
    glow: "shadow-purple-500/20",
    icon: Moon,
  },
  necromancy: {
    color: "emerald",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    glow: "shadow-emerald-500/20",
    icon: Skull,
  },
  transmutation: {
    color: "amber",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
    glow: "shadow-amber-500/20",
    icon: RefreshCw,
  },
};

const METAMAGIC_DICTIONARY: Record<string, string> = {
  "Careful Spell":
    "When you cast a spell that forces other creatures to make a saving throw, you can protect some of those creatures from the spell's full effects. Spend 1 Sorcery Point and choose a number of those creatures up to your Charisma modifier (minimum of one). A chosen creature automatically succeeds on its saving throw.",
  "Distant Spell":
    "When you cast a spell that has a range of 5 feet or greater, you can spend 1 Sorcery Point to double the range of the spell. When you cast a spell that has a range of touch, you can spend 1 Sorcery Point to make the range of the spell 30 feet.",
  "Empowered Spell":
    "When you roll damage for a spell, you can spend 1 Sorcery Point to reroll a number of the damage dice up to your Charisma modifier (minimum of one). You must use the new rolls. You can use Empowered Spell even if you have already used a different Metamagic option during the casting of the spell.",
  "Extended Spell":
    "When you cast a spell that has a duration of 1 minute or longer, you can spend 1 Sorcery Point to double its duration, to a maximum duration of 24 hours.",
  "Heightened Spell":
    "When you cast a spell that forces a creature to make a saving throw to resist its effects, you can spend 3 Sorcery Points to give one target of the spell disadvantage on its first saving throw made against the spell.",
  "Quickened Spell":
    "When you cast a spell that has a casting time of 1 action, you can spend 2 Sorcery Points to change the casting time to 1 bonus action for this casting.",
  "Subtle Spell":
    "When you cast a spell, you can spend 1 Sorcery Point to cast it without any somatic or verbal components.",
  "Transmuted Spell":
    "When you cast a spell that deals a type of damage from the following list, you can spend 1 Sorcery Point to change that damage type to one of the other listed types: acid, cold, fire, lightning, poison, thunder.",
  "Twinned Spell":
    "When you cast a spell that targets only one creature and doesn't have a range of self, you can spend a number of Sorcery Points equal to the spell's level to target a second creature in range with the same spell (1 Sorcery Point if the spell is a cantrip).",
  "Seeking Spell":
    "If you make an attack roll for a spell and miss, you can spend 2 Sorcery Points to reroll the d20. You must use the new roll. You can use Seeking Spell even if you have already used a different Metamagic option during the casting of the spell.",
};

const getSchoolTheme = (schoolName?: string) => {
  const normalized = schoolName?.toLowerCase() || "";
  return (
    SCHOOL_THEMES[normalized] || {
      color: "slate",
      bg: "bg-slate-500/10",
      text: "text-slate-400",
      border: "border-slate-500/20",
      glow: "shadow-slate-500/10",
      icon: BookOpen,
    }
  );
};

function MagicalSealWatermark({ school }: { school?: string }) {
  const normalized = school?.toLowerCase() || "";

  const renderGeometry = () => {
    switch (normalized) {
      case "abjuration":
        return (
          <>
            <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle
              cx="100"
              cy="100"
              r="70"
              stroke="currentColor"
              strokeWidth="0.5"
              fill="none"
              strokeDasharray="3 3"
            />
            <polygon
              points="100,20 180,60 180,140 100,180 20,140 20,60"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <polygon
              points="100,35 160,65 160,135 100,165 40,135 40,65"
              stroke="currentColor"
              strokeWidth="0.75"
              fill="none"
              strokeDasharray="5 2"
            />
            <circle cx="100" cy="100" r="25" stroke="currentColor" strokeWidth="1" fill="none" />
            <path
              d="M 100 10 L 100 190 M 10 100 L 190 100"
              stroke="currentColor"
              strokeWidth="0.5"
              opacity="0.5"
            />
          </>
        );
      case "evocation":
        return (
          <>
            <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="0.5" fill="none" />
            <polygon
              points="100,15 173,142 27,142"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <polygon
              points="100,185 27,58 173,58"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <line
              x1="100"
              y1="10"
              x2="100"
              y2="190"
              stroke="currentColor"
              strokeWidth="0.75"
              strokeDasharray="4 4"
            />
            <line
              x1="10"
              y1="100"
              x2="190"
              y2="100"
              stroke="currentColor"
              strokeWidth="0.75"
              strokeDasharray="4 4"
            />
            <line x1="36" y1="36" x2="164" y2="164" stroke="currentColor" strokeWidth="0.75" />
            <line x1="164" y1="36" x2="36" y2="164" stroke="currentColor" strokeWidth="0.75" />
            <circle cx="100" cy="100" r="30" stroke="currentColor" strokeWidth="1" fill="none" />
          </>
        );
      case "divination":
        return (
          <>
            <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle
              cx="100"
              cy="100"
              r="85"
              stroke="currentColor"
              strokeWidth="0.5"
              fill="none"
              strokeDasharray="10 5 2 5"
            />
            <circle cx="100" cy="100" r="65" stroke="currentColor" strokeWidth="0.75" fill="none" />
            <circle
              cx="100"
              cy="100"
              r="45"
              stroke="currentColor"
              strokeWidth="0.5"
              fill="none"
              strokeDasharray="2 2"
            />
            <path
              d="M 50 100 Q 100 60 150 100 Q 100 140 50 100 Z"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <circle cx="100" cy="100" r="20" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <circle cx="100" cy="100" r="8" fill="currentColor" />
            <path
              d="M 100 10 L 100 45 M 100 155 L 100 190 M 10 100 L 45 100 M 155 100 L 190 100"
              stroke="currentColor"
              strokeWidth="1"
            />
          </>
        );
      case "enchantment":
        return (
          <>
            <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle cx="100" cy="100" r="75" stroke="currentColor" strokeWidth="0.5" fill="none" />
            <path
              d="M 100 20 C 140 20, 180 60, 180 100 C 180 140, 140 180, 100 180 C 60 180, 20 140, 20 100 C 20 60, 60 20, 100 20 Z"
              stroke="currentColor"
              strokeWidth="0.75"
              fill="none"
              transform="rotate(15 100 100)"
            />
            <path
              d="M 100 20 C 140 20, 180 60, 180 100 C 180 140, 140 180, 100 180 C 60 180, 20 140, 20 100 C 20 60, 60 20, 100 20 Z"
              stroke="currentColor"
              strokeWidth="0.75"
              fill="none"
              transform="rotate(45 100 100)"
            />
            <path
              d="M 100 20 C 140 20, 180 60, 180 100 C 180 140, 140 180, 100 180 C 60 180, 20 140, 20 100 C 20 60, 60 20, 100 20 Z"
              stroke="currentColor"
              strokeWidth="0.75"
              fill="none"
              transform="rotate(75 100 100)"
            />
            <circle
              cx="100"
              cy="100"
              r="35"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
              strokeDasharray="3 1"
            />
            <circle cx="100" cy="100" r="15" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </>
        );
      case "illusion":
        return (
          <>
            <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle
              cx="100"
              cy="100"
              r="82"
              stroke="currentColor"
              strokeWidth="0.5"
              fill="none"
              strokeDasharray="15 3 3 3"
            />
            <path
              d="M 80 40 A 60 60 0 0 0 80 160 A 50 50 0 0 1 80 40"
              stroke="currentColor"
              strokeWidth="1.25"
              fill="none"
            />
            <path
              d="M 120 40 A 60 60 0 0 1 120 160 A 50 50 0 0 0 120 40"
              stroke="currentColor"
              strokeWidth="1.25"
              fill="none"
            />
            <circle cx="100" cy="100" r="40" stroke="currentColor" strokeWidth="0.75" fill="none" />
            <circle
              cx="100"
              cy="100"
              r="20"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeDasharray="2 4"
            />
            <polygon
              points="100,60 110,80 130,80 115,95 120,115 100,105 80,115 85,95 70,80 90,80"
              stroke="currentColor"
              strokeWidth="0.75"
              fill="none"
            />
          </>
        );
      case "necromancy":
        return (
          <>
            <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1.25" fill="none" />
            <circle
              cx="100"
              cy="100"
              r="75"
              stroke="currentColor"
              strokeWidth="0.5"
              fill="none"
              strokeDasharray="1 5"
            />
            <polygon
              points="100,25 165,138 35,138"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
            />
            <polygon
              points="100,175 35,62 165,62"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
            />
            <circle cx="100" cy="25" r="4" fill="currentColor" />
            <circle cx="165" cy="138" r="4" fill="currentColor" />
            <circle cx="35" cy="138" r="4" fill="currentColor" />
            <circle cx="100" cy="175" r="4" fill="currentColor" />
            <circle cx="35" cy="62" r="4" fill="currentColor" />
            <circle cx="165" cy="62" r="4" fill="currentColor" />
            <path
              d="M 100 55 L 135 120 L 65 120 Z"
              stroke="currentColor"
              strokeWidth="0.75"
              fill="none"
            />
            <circle cx="100" cy="100" r="15" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </>
        );
      case "transmutation":
        return (
          <>
            <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle cx="100" cy="100" r="78" stroke="currentColor" strokeWidth="0.5" fill="none" />
            {Array.from({ length: 12 }).map((_, i) => (
              <path
                key={i}
                d="M 95 10 L 105 10 L 103 22 L 97 22 Z"
                stroke="currentColor"
                strokeWidth="1"
                fill="none"
                transform={`rotate(${i * 30} 100 100)`}
              />
            ))}
            <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="0.75" fill="none" />
            <path
              d="M 75 100 C 75 85, 90 85, 100 100 C 110 115, 125 115, 125 100 C 125 85, 110 85, 100 100 C 90 115, 75 115, 75 100 Z"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <circle cx="100" cy="100" r="10" stroke="currentColor" strokeWidth="0.5" fill="none" />
          </>
        );
      case "conjuration":
      default:
        return (
          <>
            <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle
              cx="100"
              cy="100"
              r="85"
              stroke="currentColor"
              strokeWidth="0.5"
              fill="none"
              strokeDasharray="4 4"
            />
            <circle cx="100" cy="100" r="70" stroke="currentColor" strokeWidth="0.75" fill="none" />
            <polygon
              points="100,20 120,80 180,100 120,120 100,180 80,120 20,100 80,80"
              stroke="currentColor"
              strokeWidth="1.25"
              fill="none"
            />
            <polygon
              points="100,20 120,80 180,100 120,120 100,180 80,120 20,100 80,80"
              stroke="currentColor"
              strokeWidth="0.5"
              fill="none"
              transform="rotate(45 100 100)"
            />
            <circle cx="100" cy="100" r="30" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle
              cx="100"
              cy="100"
              r="15"
              stroke="currentColor"
              strokeWidth="0.5"
              fill="none"
              strokeDasharray="1 1"
            />
          </>
        );
    }
  };

  const theme = getSchoolTheme(school);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none opacity-[0.05] dark:opacity-[0.07] z-0">
      <svg
        width="380"
        height="380"
        viewBox="0 0 200 200"
        className={`w-[380px] h-[380px] ${theme.text} animate-[spin_60s_linear_infinite]`}
      >
        {renderGeometry()}
      </svg>
    </div>
  );
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

interface SpellbookPanelProps {
  member: PartyMember;
  localPrepOverride: Record<string, boolean>;
  setLocalPrepOverride: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  localInventory: any[];
  localMetamagic: Array<{ name: string; description: string }>;
  displayActions: any[];
  localResources: any;
  localSlots: any;
  localInnateSorcery: boolean;
  localStarryForm: string;
  localMantleOfMajesty: boolean;
  castingSpellState: { active: boolean; spellName: string | null; slotLevel?: number } | null;
  setCastingSpellState: React.Dispatch<
    React.SetStateAction<{ active: boolean; spellName: string | null; slotLevel?: number } | null>
  >;
  selectedMetamagicName: string | null;
  setSelectedMetamagicName: React.Dispatch<React.SetStateAction<string | null>>;
  handleCastSpell: (spell: PreparedSpell, isPact: boolean, slotLevel: number) => void;
  getMetamagicCost: (name: string, spellLevel: number) => number;
  getCastSlotOptions: (spellLevel: number) => Array<{ level: number; max: number; used: number; isPact: boolean }>;
  parseComponentCost: (desc?: string) => { cost: number; item: string } | null;
}

export default function SpellbookPanel({
  member,
  localPrepOverride,
  setLocalPrepOverride,
  localInventory,
  localMetamagic,
  displayActions,
  localResources,
  localSlots,
  localInnateSorcery,
  localStarryForm,
  localMantleOfMajesty,
  castingSpellState,
  setCastingSpellState,
  selectedMetamagicName,
  setSelectedMetamagicName,
  handleCastSpell,
  getMetamagicCost,
  getCastSlotOptions,
  parseComponentCost,
}: SpellbookPanelProps) {
  // Local UI filters/view modes
  const [spellSearch, setSpellSearch] = useState("");
  const [spellLevelFilter, setSpellLevelFilter] = useState<number | "all">("all");
  const [spellSchoolFilter, setSpellSchoolFilter] = useState<string>("all");
  const [spellActivationFilter, setSpellActivationFilter] = useState<string>("all");
  const [spellConcentrationFilter, setSpellConcentrationFilter] = useState<boolean>(false);
  const [spellRitualFilter, setSpellRitualFilter] = useState<boolean>(false);
  const [onlyPreparedFilter, setOnlyPreparedFilter] = useState<boolean>(false);
  const [spellbookViewMode, setSpellbookViewMode] = useState<"codex" | "grid">("codex");
  const [selectedSpellName, setSelectedSpellName] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const isStarsDruid = useMemo(() => {
    return (
      member.classes.toLowerCase().includes("druid") &&
      (member.features?.some((f) => f.name.toLowerCase().includes("starry form")) || false)
    );
  }, [member]);

  const isGlamourBard = useMemo(() => {
    return (
      member.classes.toLowerCase().includes("bard") &&
      (member.features?.some((f) => f.name.toLowerCase().includes("mantle of majesty")) || false)
    );
  }, [member]);

  const toggleExpand = (key: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const getIsPrepared = (s: PreparedSpell) => {
    if (s.alwaysPrepared || s.level === 0) return true;
    return localPrepOverride[s.name] !== undefined ? localPrepOverride[s.name] : !!s.prepared;
  };

  const filteredCantrips = useMemo(() => {
    return member.cantrips.filter((c) => {
      if (spellSearch && !c.name.toLowerCase().includes(spellSearch.toLowerCase())) return false;
      if (spellLevelFilter !== "all" && spellLevelFilter !== 0) return false;
      if (spellSchoolFilter !== "all" && c.school?.toLowerCase() !== spellSchoolFilter) return false;
      if (spellActivationFilter !== "all") {
        const actText = getActivationText(c.activation).toLowerCase();
        if (spellActivationFilter === "action" && actText !== "action") return false;
        if (spellActivationFilter === "bonus" && actText !== "bonus action") return false;
        if (spellActivationFilter === "reaction" && actText !== "reaction") return false;
        if (spellActivationFilter === "other" && ["action", "bonus action", "reaction"].includes(actText))
          return false;
      }
      if (spellConcentrationFilter && !c.concentration) return false;
      if (spellRitualFilter && !c.ritual) return false;
      return true;
    });
  }, [
    member.cantrips,
    spellSearch,
    spellLevelFilter,
    spellSchoolFilter,
    spellActivationFilter,
    spellConcentrationFilter,
    spellRitualFilter,
  ]);

  const filteredLeveledSpells = useMemo(() => {
    const spells: Record<number, PreparedSpell[]> = {};
    member.allSpells.forEach((s) => {
      const isPrepared = getIsPrepared(s);
      if (onlyPreparedFilter && !isPrepared) return;

      if (spellSearch && !s.name.toLowerCase().includes(spellSearch.toLowerCase())) return;
      if (spellLevelFilter !== "all" && s.level !== spellLevelFilter) return;
      if (spellSchoolFilter !== "all" && s.school?.toLowerCase() !== spellSchoolFilter) return;
      if (spellActivationFilter !== "all") {
        const actText = getActivationText(s.activation).toLowerCase();
        if (spellActivationFilter === "action" && actText !== "action") return;
        if (spellActivationFilter === "bonus" && actText !== "bonus action") return;
        if (spellActivationFilter === "reaction" && actText !== "reaction") return;
        if (spellActivationFilter === "other" && ["action", "bonus action", "reaction"].includes(actText))
          return;
      }
      if (spellConcentrationFilter && !s.concentration) return;
      if (spellRitualFilter && !s.ritual) return;

      if (!spells[s.level]) {
        spells[s.level] = [];
      }
      spells[s.level].push(s);
    });
    return spells;
  }, [
    member.allSpells,
    spellSearch,
    spellLevelFilter,
    spellSchoolFilter,
    spellActivationFilter,
    spellConcentrationFilter,
    spellRitualFilter,
    onlyPreparedFilter,
    localPrepOverride,
  ]);

  const filteredLevels = useMemo(() => {
    return Object.keys(filteredLeveledSpells)
      .map(Number)
      .sort((a, b) => a - b);
  }, [filteredLeveledSpells]);

  const allFilteredSpells = useMemo(() => {
    return [...filteredCantrips, ...Object.values(filteredLeveledSpells).flat()];
  }, [filteredCantrips, filteredLeveledSpells]);

  const selectedSpell = useMemo(() => {
    return allFilteredSpells.find((s) => s.name === selectedSpellName) || null;
  }, [allFilteredSpells, selectedSpellName]);

  const spellsByLevel = useMemo(() => {
    const levelMap: Record<number, PreparedSpell[]> = {};
    member.allSpells.forEach((s) => {
      if (!levelMap[s.level]) {
        levelMap[s.level] = [];
      }
      levelMap[s.level].push(s);
    });
    return levelMap;
  }, [member.allSpells]);

  const allLevels = useMemo(() => {
    return Object.keys(spellsByLevel)
      .map(Number)
      .sort((a, b) => a - b);
  }, [spellsByLevel]);

  const spellLevelOptions = useMemo(() => {
    return [
      "All Levels",
      ...(member.cantrips.length > 0 ? ["Cantrips"] : []),
      ...allLevels.map((lvl) => {
        const suffix = lvl === 1 ? "st" : lvl === 2 ? "nd" : lvl === 3 ? "rd" : "th";
        return `${lvl}${suffix} Level`;
      }),
    ];
  }, [member.cantrips, allLevels]);

  const currentLevelLabel = useMemo(() => {
    if (spellLevelFilter === "all") return "All Levels";
    if (spellLevelFilter === 0) return "Cantrips";
    const lvl = Number(spellLevelFilter);
    const suffix = lvl === 1 ? "st" : lvl === 2 ? "nd" : lvl === 3 ? "rd" : "th";
    return `${lvl}${suffix} Level`;
  }, [spellLevelFilter]);

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

  const spellSchoolOptions = [
    "All Schools",
    "Abjuration",
    "Conjuration",
    "Divination",
    "Enchantment",
    "Evocation",
    "Illusion",
    "Necromancy",
    "Transmutation",
  ];

  const currentSchoolLabel =
    spellSchoolFilter === "all"
      ? "All Schools"
      : spellSchoolFilter.charAt(0).toUpperCase() + spellSchoolFilter.slice(1);

  const handleSpellSchoolChange = (label: string) => {
    if (label === "All Schools") {
      setSpellSchoolFilter("all");
    } else {
      setSpellSchoolFilter(label.toLowerCase());
    }
  };

  const spellActivationOptions = [
    "All Casting Times",
    "Action",
    "Bonus Action",
    "Reaction",
    "Other",
  ];

  const currentActivationLabel =
    spellActivationFilter === "all"
      ? "All Casting Times"
      : spellActivationFilter === "bonus"
        ? "Bonus Action"
        : spellActivationFilter.charAt(0).toUpperCase() + spellActivationFilter.slice(1);

  const handleSpellActivationChange = (label: string) => {
    if (label === "All Casting Times") {
      setSpellActivationFilter("all");
    } else if (label === "Bonus Action") {
      setSpellActivationFilter("bonus");
    } else {
      setSpellActivationFilter(label.toLowerCase());
    }
  };

  const hasAnyActiveFilters =
    spellSearch ||
    spellLevelFilter !== "all" ||
    spellSchoolFilter !== "all" ||
    spellActivationFilter !== "all" ||
    spellConcentrationFilter ||
    spellRitualFilter ||
    onlyPreparedFilter;

  const clearAllFilters = () => {
    setSpellSearch("");
    setSpellLevelFilter("all");
    setSpellSchoolFilter("all");
    setSpellActivationFilter("all");
    setSpellConcentrationFilter(false);
    setSpellRitualFilter(false);
    setOnlyPreparedFilter(false);
  };

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
            {isPact ? "Pact" : "Level"} {s.level} Slots: {available} / {s.max} remaining (Click to toggle)
          </TooltipContent>
        </Tooltip>
        <span className="font-mono text-[9px] text-muted-foreground">
          ({available}/{s.max})
        </span>
      </div>
    );
  };

  const renderCodexDetail = (spell: PreparedSpell) => {
    const isCantrip = spell.level === 0;
    const schoolTheme = getSchoolTheme(spell.school);
    const SchoolIcon = schoolTheme.icon;
    const isCasting = castingSpellState?.active && castingSpellState.spellName === spell.name;

    const actText = getActivationText(spell.activation);
    const rangeText = getRangeText(spell.range);
    const durationText = getDurationText(spell.duration, spell.concentration);
    const compText = getComponentsText(spell.components, spell.componentsDescription);

    const castOptions = isCantrip ? [] : getCastSlotOptions(spell.level);

    const costlyComponent =
      parseComponentCost(spell.componentsDescription) || parseComponentCost(spell.description);
    const matchingInventoryItem = costlyComponent
      ? localInventory.find((i) => i.name.toLowerCase().includes(costlyComponent.item.toLowerCase()))
      : null;

    const isSorcerer = member.classes.toLowerCase().includes("sorcerer");
    const metamagicOptions = localMetamagic || [];
    const spAction = displayActions.find((a) => a.name.toLowerCase().includes("sorcery points"));
    const spEffective = spAction ? localResources.getEffectiveResource(spAction) : null;
    const currentSP = spEffective?.uses?.current ?? 0;

    const isSpellPrepared = getIsPrepared(spell);
    const sorcDC = (() => {
      const sc = member.spellcasting?.find((s) => s.className.toLowerCase() === "sorcerer");
      return sc ? sc.saveDc + (localInnateSorcery ? 1 : 0) : null;
    })();

    return (
      <div className="flex flex-col h-full relative">
        <MagicalSealWatermark school={spell.school} />
        {isCasting && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md flex flex-col items-center justify-center z-50 animate-[fade-in_0.2s_ease-out] rounded-xl">
            <div className="relative flex items-center justify-center mb-4">
              <div className="absolute w-28 h-28 border border-accent/40 rounded-full border-dashed animate-[spin_12s_linear_infinite]" />
              <div className="absolute w-24 h-24 border-2 border-accent/20 rounded-full animate-[spin_8s_linear_infinite] [animation-direction:reverse]" />
              <div className="absolute w-20 h-20 border border-gold/40 rounded-full border-double animate-pulse" />
              <div className="absolute w-36 h-36 border border-accent/10 rounded-full animate-ping opacity-20" />
              <Sparkles className="text-gold w-8 h-8 animate-bounce" />
            </div>
            <div className="text-center px-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent animate-pulse block mb-1">
                Casting Incantation
              </span>
              <h3 className="text-lg font-heading font-extrabold text-foreground tracking-wide mb-1">
                {spell.name}
              </h3>
              <span className="text-[9px] font-mono text-muted-foreground/90 bg-secondary/50 px-2 py-0.5 rounded border border-border/30">
                {castingSpellState?.slotLevel
                  ? `Used Level ${castingSpellState.slotLevel} Slot`
                  : "Channeled Cantrip"}
              </span>
            </div>
          </div>
        )}

        <div className="p-4 border-b border-border/20 bg-[#16151c]/90 backdrop-blur-xs flex items-start justify-between gap-3 shrink-0 z-10">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-heading font-extrabold text-foreground tracking-wide flex items-center gap-2">
              <SchoolIcon className={`w-5 h-5 ${schoolTheme.text} shrink-0`} />
              <span className="truncate">{spell.name}</span>
            </h3>
            <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[8px] uppercase tracking-wider font-bold ${schoolTheme.bg} ${schoolTheme.text} ${schoolTheme.border}`}
              >
                <SchoolIcon className="w-2.5 h-2.5" />
                {spell.school}
              </span>
              {spell.ritual && (
                <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-bold">
                  Ritual
                </span>
              )}
              {spell.concentration && (
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-bold">
                  Concentration
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="inline-block px-2.5 py-1 rounded bg-accent/10 border border-accent/20 font-mono text-xs text-accent font-bold">
              {isCantrip ? "Cantrip" : `Level ${spell.level}`}
            </span>
            <button
              onClick={() => setSelectedSpellName(null)}
              className="px-2 py-1 text-[10px] font-bold rounded border border-border bg-secondary/20 hover:bg-secondary/40 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              title="Deselect Spell"
            >
              ✕ Close
            </button>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-border/10 bg-[#16151c]/50 backdrop-blur-xs shrink-0 z-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2 rounded border border-border/20 bg-secondary/20">
              <div className="text-muted-foreground flex items-center justify-center gap-1 text-[8px] uppercase tracking-wider font-bold mb-1">
                <Clock className="w-3.5 h-3.5 text-accent/80" /> Casting Time
              </div>
              <div className="text-[10px] font-bold text-foreground truncate" title={actText}>
                {actText || "—"}
              </div>
            </div>
            <div className="p-2 rounded border border-border/20 bg-secondary/20">
              <div className="text-muted-foreground flex items-center justify-center gap-1 text-[8px] uppercase tracking-wider font-bold mb-1">
                <Target className="w-3.5 h-3.5 text-accent/80" /> Range
              </div>
              <div className="text-[10px] font-bold text-foreground truncate" title={rangeText}>
                {rangeText || "—"}
              </div>
            </div>
            <div className="p-2 rounded border border-border/20 bg-secondary/20">
              <div className="text-muted-foreground flex items-center justify-center gap-1 text-[8px] uppercase tracking-wider font-bold mb-1">
                <Clock className="w-3.5 h-3.5 text-accent/80" /> Duration
              </div>
              <div className="text-[10px] font-bold text-foreground truncate" title={durationText}>
                {durationText || "—"}
              </div>
            </div>
            <div className="p-2 rounded border border-border/20 bg-secondary/20">
              <div className="text-muted-foreground flex items-center justify-center gap-1 text-[8px] uppercase tracking-wider font-bold mb-1">
                <Scroll className="w-3.5 h-3.5 text-accent/80" /> Components
              </div>
              <div className="text-[10px] font-bold text-foreground truncate" title={compText}>
                {compText || "—"}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar z-10 relative">
          {/* Innate Sorcery active banner */}
          {isSorcerer && localInnateSorcery && (
            <div className="mb-4 rounded-lg border border-accent/30 bg-accent/5 p-2.5 flex items-center gap-2 text-[10px] text-accent leading-normal animate-pulse">
              <span className="text-xs">✨</span>
              <span>
                <strong>Innate Sorcery Active:</strong> +1 Spell Save DC (DC {sorcDC}) & Advantage on Sorcerer Spell Attacks.
              </span>
            </div>
          )}

          {/* Starry Form active banner */}
          {isStarsDruid && localStarryForm !== "None" && (
            <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-2.5 flex items-center gap-2 text-[10px] text-primary leading-normal animate-pulse">
              <span className="text-xs">🌌</span>
              <span>
                <strong>Starry Form ({localStarryForm}) Active:</strong>{" "}
                {localStarryForm === "Archer" && "Luminous Archer attack is available under Actions (1d8+WIS Radiant, BA)."}
                {localStarryForm === "Chalice" && "When casting a healing spell, a creature within 30 ft regains an extra 1d8+WIS HP."}
                {localStarryForm === "Dragon" && "Guaranteed minimum d20 roll of 10 on Intelligence/Wisdom checks and Concentration saves."}
              </span>
            </div>
          )}

          {/* Mantle of Majesty active banner */}
          {isGlamourBard && localMantleOfMajesty && (
            <div className="mb-4 rounded-lg border border-accent/30 bg-accent/5 p-2.5 flex items-center gap-2 text-[10px] text-accent leading-normal animate-pulse">
              <span className="text-xs">👑</span>
              <span>
                <strong>Mantle of Majesty Active:</strong> Cast Command as a Bonus Action for free! Command shortcut added to Actions.
              </span>
            </div>
          )}

          {!isSpellPrepared && spell.level > 0 && (
            <div className="mb-4 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 flex items-center justify-between gap-3 text-[10.5px] text-amber-400">
              <div className="flex items-center gap-2">
                <span className="text-sm shrink-0">⚠️</span>
                <div>
                  <span className="font-bold block uppercase tracking-wide text-[8px] opacity-75 mb-0.5">
                    Spell Unprepared
                  </span>
                  <span>{spell.name} is not currently prepared.</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setLocalPrepOverride((prev) => ({
                    ...prev,
                    [spell.name]: true,
                  }));
                }}
                className="px-2 py-1 text-[9.5px] font-bold rounded border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 cursor-pointer transition-all shrink-0"
              >
                Prepare Now
              </button>
            </div>
          )}

          {costlyComponent && (
            <div
              className={`mb-4 rounded-lg border p-3 flex items-start gap-2 text-[10.5px] leading-normal
              ${
                matchingInventoryItem && matchingInventoryItem.quantity > 0
                  ? "bg-teal-500/5 border-teal-500/20 text-teal-400"
                  : "bg-red-500/5 border-red-500/20 text-red-400"
              }`}
            >
              <span className="text-sm shrink-0">
                {matchingInventoryItem && matchingInventoryItem.quantity > 0 ? "✔️" : "⚠️"}
              </span>
              <div className="flex-1">
                <span className="font-bold block uppercase tracking-wide text-[8px] opacity-75 mb-0.5">
                  Costly Component Check
                </span>
                {matchingInventoryItem && matchingInventoryItem.quantity > 0 ? (
                  <span>
                    {member.name} has{" "}
                    <strong>
                      {matchingInventoryItem.quantity}x {matchingInventoryItem.name}
                    </strong>{" "}
                    in inventory (worth {costlyComponent.cost} gp).
                  </span>
                ) : (
                  <span>
                    Missing required component: <strong>{costlyComponent.item} worth {costlyComponent.cost} gp</strong>. Not found in live inventory!
                  </span>
                )}
              </div>
            </div>
          )}

          {spell.description ? (
            <div
              className="text-xs leading-relaxed text-muted-foreground/90 font-sans prose prose-invert max-w-none 
              prose-p:my-2 prose-ul:list-disc prose-ul:pl-4 prose-ol:list-decimal prose-ol:pl-4 
              prose-strong:text-foreground prose-strong:font-bold"
              dangerouslySetInnerHTML={{ __html: spell.description }}
            />
          ) : (
            <div className="text-muted-foreground text-xs italic py-4 text-center">
              No spell description available.
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border/20 bg-[#16151c]/95 backdrop-blur-xs shrink-0 flex flex-col gap-2.5 z-10">
          {isSorcerer && metamagicOptions.length > 0 && spAction && spell.level > 0 && (
            <div className="border-b border-border/15 pb-3.5 mb-1">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Sorcerer Metamagic</span>
                <span className="text-[9px] text-accent font-semibold font-mono">
                  {currentSP} / {spEffective?.uses?.max} SP Available
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {metamagicOptions.map((mm) => {
                  const cost = getMetamagicCost(mm.name, spell.level);
                  const isSelected = selectedMetamagicName === mm.name;
                  const canAfford = currentSP >= cost;
                  const mmDesc = METAMAGIC_DICTIONARY[mm.name] || mm.description;

                  return (
                    <Tooltip key={mm.name}>
                      <TooltipTrigger asChild>
                        <button
                          disabled={!canAfford && !isSelected}
                          onClick={() => {
                            setSelectedMetamagicName(isSelected ? null : mm.name);
                          }}
                          className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed
                            ${
                              isSelected
                                ? "bg-accent/15 border-accent text-accent font-bold shadow-md shadow-accent/5"
                                : "bg-secondary/35 border-border/60 text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                            }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-accent" : "bg-muted-foreground/40"}`}
                          />
                          <span>{mm.name}</span>
                          <span className="text-[8.5px] opacity-75 font-mono">({cost} SP)</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[280px] text-xs">
                        {mmDesc}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
              {selectedMetamagicName && (
                <div className="text-[9.5px] text-muted-foreground leading-relaxed bg-accent/5 border border-accent/20 rounded-lg p-2.5 animate-fade-in">
                  <span className="font-bold text-accent block mb-0.5">
                    Active Modifier: {selectedMetamagicName}
                  </span>
                  {METAMAGIC_DICTIONARY[selectedMetamagicName]}
                </div>
              )}
            </div>
          )}

          {isCantrip ? (
            <button
              onClick={() => handleCastSpell(spell, false, 0)}
              className="w-full relative overflow-hidden group py-2.5 rounded-lg bg-gradient-to-r from-accent to-purple-600 text-xs font-bold text-white shadow-md hover:shadow-accent/20 hover:from-accent/90 hover:to-purple-500 transition-all active:scale-[0.98] cursor-pointer"
            >
              <span className="flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 animate-pulse text-gold" />
                Cast Cantrip
              </span>
            </button>
          ) : (
            <div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Channel Spell Slots</span>
                <span className="text-[9px] text-accent font-normal normal-case">
                  Select a slot to expend
                </span>
              </div>
              {castOptions.length === 0 ? (
                <div className="text-center py-2.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-[10px] font-bold flex items-center justify-center gap-1.5">
                  <span>⚠️ Out of spell slots at Level {spell.level} or above.</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {castOptions.map((opt) => {
                    const optAvailable = opt.max - opt.used;
                    const metamagicSufficient = selectedMetamagicName
                      ? currentSP >= getMetamagicCost(selectedMetamagicName, spell.level)
                      : true;

                    return (
                      <button
                        key={`${opt.isPact ? "pact" : "spell"}-${opt.level}`}
                        disabled={!metamagicSufficient}
                        onClick={() => handleCastSpell(spell, opt.isPact, opt.level)}
                        className={`flex-1 min-w-[90px] py-1.5 px-2 rounded-lg border text-[10.5px] font-bold transition-all hover:scale-[1.03] active:scale-[0.98] flex flex-col items-center justify-center gap-0.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed
                        ${
                          opt.isPact
                            ? "bg-accent/5 border-accent/40 text-accent hover:bg-accent/10 hover:border-accent"
                            : "bg-primary/5 border-primary/40 text-primary hover:bg-primary/10 hover:border-primary"
                        }`}
                      >
                        <span>Cast as L{opt.level}</span>
                        <span className="text-[8px] font-normal opacity-85">
                          {optAvailable} / {opt.max} left {opt.isPact && "(Pact)"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Panel
      title={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5 select-none">
            <Sparkles className="text-accent w-4 h-4" />
            <span>Spellbook</span>
          </div>
          <div className="flex items-center gap-2">
            {hasAnyActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="px-2 py-0.5 rounded border border-border bg-secondary/35 text-[9px] font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/60 cursor-pointer"
              >
                Clear Filters
              </button>
            )}
            <div className="flex items-center rounded border border-border bg-secondary/20 p-0.5">
              <button
                onClick={() => setSpellbookViewMode("codex")}
                className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                  spellbookViewMode === "codex"
                    ? "bg-accent text-accent-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Codex View"
              >
                <Columns2 size={12} />
              </button>
              <button
                onClick={() => setSpellbookViewMode("grid")}
                className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                  spellbookViewMode === "grid"
                    ? "bg-accent text-accent-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Grid View"
              >
                <LayoutGrid size={12} />
              </button>
            </div>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 border-b border-border/20 pb-3 mb-1">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search spells by name..."
                value={spellSearch}
                onChange={(e) => setSpellSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-secondary/35 pl-8 pr-4 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CustomSelect
                value={currentLevelLabel}
                onChange={handleSpellLevelChange}
                options={spellLevelOptions}
                triggerClassName="inline-flex items-center gap-1.5 cursor-pointer rounded border border-border bg-secondary/35 px-2.5 py-1.5 text-xs text-foreground hover:bg-secondary/50 focus:outline-none shrink-0"
                optionsWidth="w-32"
              />
              <CustomSelect
                value={currentSchoolLabel}
                onChange={handleSpellSchoolChange}
                options={spellSchoolOptions}
                triggerClassName="inline-flex items-center gap-1.5 cursor-pointer rounded border border-border bg-secondary/35 px-2.5 py-1.5 text-xs text-foreground hover:bg-secondary/50 focus:outline-none shrink-0"
                optionsWidth="w-36"
              />
              <CustomSelect
                value={currentActivationLabel}
                onChange={handleSpellActivationChange}
                options={spellActivationOptions}
                triggerClassName="inline-flex items-center gap-1.5 cursor-pointer rounded border border-border bg-secondary/35 px-2.5 py-1.5 text-xs text-foreground hover:bg-secondary/50 focus:outline-none shrink-0"
                optionsWidth="w-40"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 items-center mt-1 select-none font-sans">
            <button
              onClick={() => setOnlyPreparedFilter(!onlyPreparedFilter)}
              className={`px-2 py-0.5 rounded border text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer
              ${
                onlyPreparedFilter
                  ? "bg-teal-500/10 border-teal-500/40 text-teal-400"
                  : "bg-secondary/20 border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              📖 Prepared Only
            </button>
            <button
              onClick={() => setSpellConcentrationFilter(!spellConcentrationFilter)}
              className={`px-2 py-0.5 rounded border text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer
              ${
                spellConcentrationFilter
                  ? "bg-amber-500/10 border-amber-500/40 text-amber-400"
                  : "bg-secondary/20 border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              🕒 Concentration
            </button>
            <button
              onClick={() => setSpellRitualFilter(!spellRitualFilter)}
              className={`px-2 py-0.5 rounded border text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer
              ${
                spellRitualFilter
                  ? "bg-sky-500/10 border-sky-500/40 text-sky-400"
                  : "bg-secondary/20 border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              📜 Ritual
            </button>
          </div>
        </div>

        {spellbookViewMode === "codex" ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1.8fr] gap-4">
            <div className="flex flex-col gap-3 max-h-[580px] overflow-y-auto pr-1 border-r border-border/10 lg:pr-3">
              {filteredCantrips.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between border-b border-border/10 pb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                      Cantrips
                    </span>
                    <span className="font-mono text-[9px] text-muted-foreground">
                      ({filteredCantrips.length})
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {filteredCantrips.map((c) => {
                      const schoolTheme = getSchoolTheme(c.school);
                      const SchoolIcon = schoolTheme.icon;
                      const isSelected = selectedSpellName === c.name;
                      const actText = getActivationText(c.activation);
                      return (
                        <div
                          key={c.name}
                          onClick={() => setSelectedSpellName(c.name)}
                          className={`flex items-center justify-between gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all hover:bg-secondary/35
                          ${
                            isSelected
                              ? "bg-accent/10 border-accent/80 text-foreground shadow-md shadow-accent/5 font-medium"
                              : "bg-secondary/15 border-border/50 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <div
                              className={`w-1 h-3 rounded-full ${isSelected ? "bg-accent" : "bg-muted-foreground/30"}`}
                            />
                            <SchoolIcon
                              className={`w-3.5 h-3.5 shrink-0 ${isSelected ? schoolTheme.text : "text-muted-foreground/60"}`}
                            />
                            <span className="truncate">{c.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 text-[8px] font-mono select-none">
                            {c.concentration && (
                              <span className="text-amber-400" title="Concentration">
                                C
                              </span>
                            )}
                            {c.ritual && (
                              <span className="text-sky-400" title="Ritual">
                                R
                              </span>
                            )}
                            <span className="bg-secondary px-1 py-0.5 rounded text-[8px] text-muted-foreground font-sans font-semibold">
                              {actText === "Action"
                                ? "1A"
                                : actText === "Bonus Action"
                                  ? "1BA"
                                  : actText === "Reaction"
                                    ? "1R"
                                    : "Oth"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {filteredLevels.map((lvl) => {
                const list = filteredLeveledSpells[lvl] || [];
                if (list.length === 0) return null;
                const suffix = lvl === 1 ? "st" : lvl === 2 ? "nd" : lvl === 3 ? "rd" : "th";
                const slot = localSlots.spellSlots.find((s: any) => s.level === lvl);
                const pact = localSlots.pactSlots.find((s: any) => s.level === lvl);
                return (
                  <div key={lvl} className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between border-b border-border/10 pb-1 gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/95">
                        {lvl}
                        {suffix} Level Spells
                      </span>
                      <div className="flex items-center gap-2">
                        {slot && renderSlotsInline(slot, false)}
                        {pact && renderSlotsInline(pact, true)}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {list.map((spell) => {
                        const schoolTheme = getSchoolTheme(spell.school);
                        const SchoolIcon = schoolTheme.icon;
                        const isSelected = selectedSpellName === spell.name;
                        const actText = getActivationText(spell.activation);
                        const isSpellPrepared = getIsPrepared(spell);
                        const isAlways = !!spell.alwaysPrepared;

                        return (
                          <div
                            key={spell.name}
                            onClick={() => setSelectedSpellName(spell.name)}
                            className={`flex items-center justify-between gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all hover:bg-secondary/35
                            ${
                              isSelected
                                ? "bg-accent/10 border-accent/80 text-foreground shadow-md shadow-accent/5 font-medium"
                                : "bg-secondary/15 border-border/50 text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <div
                                className={`w-1 h-3 rounded-full ${isSelected ? "bg-accent" : "bg-muted-foreground/30"}`}
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isAlways) {
                                    setLocalPrepOverride((prev) => ({
                                      ...prev,
                                      [spell.name]: !isSpellPrepared,
                                    }));
                                  }
                                }}
                                className="p-1 rounded transition-colors hover:bg-secondary/80 focus:outline-none cursor-pointer shrink-0"
                                title={
                                  isAlways
                                    ? "Always Prepared"
                                    : isSpellPrepared
                                      ? "Unprepare Spell"
                                      : "Prepare Spell"
                                }
                              >
                                {isAlways ? (
                                  <BookOpen className="w-3.5 h-3.5 text-gold animate-pulse" />
                                ) : isSpellPrepared ? (
                                  <BookOpen className="w-3.5 h-3.5 text-teal-400" />
                                ) : (
                                  <BookOpen className="w-3.5 h-3.5 text-muted-foreground/30 hover:text-muted-foreground" />
                                )}
                              </button>
                              <SchoolIcon
                                className={`w-3.5 h-3.5 shrink-0 ${isSelected ? schoolTheme.text : "text-muted-foreground/60"}`}
                              />
                              <span
                                className={`truncate ${isSpellPrepared ? "text-foreground font-semibold" : "text-muted-foreground/50 italic font-normal"}`}
                              >
                                {spell.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 text-[8px] font-mono select-none">
                              {spell.concentration && (
                                <span className="text-amber-400" title="Concentration">
                                  C
                                </span>
                              )}
                              {spell.ritual && (
                                <span className="text-sky-400" title="Ritual">
                                  R
                                </span>
                              )}
                              <span className="bg-secondary px-1 py-0.5 rounded text-[8px] text-muted-foreground font-sans font-semibold">
                                {actText === "Action"
                                  ? "1A"
                                  : actText === "Bonus Action"
                                    ? "1BA"
                                    : actText === "Reaction"
                                      ? "1R"
                                      : "Oth"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {filteredCantrips.length === 0 && filteredLevels.length === 0 && (
                <div className="text-center py-8 text-xs text-muted-foreground italic">
                  No spells match these filters.
                </div>
              )}
            </div>

            <div className="hidden lg:flex flex-col border border-border/30 bg-secondary/15 rounded-xl min-h-[480px] h-[580px] overflow-hidden shadow-inner relative">
              {selectedSpell ? (
                renderCodexDetail(selectedSpell)
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground/70 select-none">
                  <div className="relative flex items-center justify-center w-24 h-24 mb-4 opacity-50">
                    <div className="absolute inset-0 border border-muted-foreground/20 rounded-full border-dashed animate-[spin_20s_linear_infinite]" />
                    <div className="absolute w-20 h-20 border border-muted-foreground/15 rounded-full animate-[spin_10s_linear_infinite] [animation-direction:reverse]" />
                    <BookOpen size={28} className="text-muted-foreground animate-pulse" />
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/80 mb-1">
                    Consult the Codex
                  </h4>
                  <p className="text-[10px] leading-relaxed max-w-[200px] text-muted-foreground/80 font-sans">
                    Select a spell from the directory to prepare your incantation and channel spell slots.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredCantrips.length > 0 && (
              <div className="rounded-lg border border-border/30 bg-secondary/10 p-3">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-accent select-none">
                  Cantrips
                </h4>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 items-start">
                  {filteredCantrips.map((c) => {
                    const isExpanded = !!expandedItems[`spell-${c.name}`];
                    const schoolTheme = getSchoolTheme(c.school);
                    const SchoolIcon = schoolTheme.icon;
                    const isCasting = castingSpellState?.active && castingSpellState.spellName === c.name;

                    return (
                      <div
                        key={c.name}
                        className={`flex flex-col rounded-md border transition-all duration-200 relative overflow-hidden
                        ${isExpanded ? "border-accent/40 bg-accent/5" : "border-border/50 bg-secondary/45"}`}
                      >
                        {isCasting && (
                          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center z-10 animate-fade-in">
                            <Sparkles className="text-gold w-4 h-4 animate-bounce mb-1" />
                            <span className="text-[8px] font-bold text-accent uppercase tracking-wider animate-pulse">
                              Casting Cantrip
                            </span>
                          </div>
                        )}

                        <button
                          onClick={() => toggleExpand(`spell-${c.name}`)}
                          className="w-full text-left cursor-pointer flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs text-foreground hover:bg-secondary/30 focus:outline-none"
                        >
                          <span className="flex items-center gap-2 font-medium">
                            <SchoolIcon size={11} className={`${schoolTheme.text} shrink-0`} />
                            <span>{c.name}</span>
                          </span>
                          <span className="text-[8px] text-muted-foreground font-mono">
                            {isExpanded ? "▲ LESS" : "▼ DETAILS"}
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="px-2.5 pb-2 border-t border-border/10 pt-2 flex flex-col gap-2">
                            <div className="flex flex-wrap gap-1">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider ${schoolTheme.bg} ${schoolTheme.text} ${schoolTheme.border}`}
                              >
                                {c.school}
                              </span>
                              {c.activation && (
                                <span className="rounded bg-primary/10 border border-primary/20 px-1 py-0.5 text-[7px] uppercase tracking-wider text-primary font-bold">
                                  ⚡ {getActivationText(c.activation)}
                                </span>
                              )}
                              {c.range && (
                                <span className="rounded bg-teal-500/10 border border-teal-500/20 px-1 py-0.5 text-[7px] uppercase tracking-wider text-teal-400 font-bold">
                                  🎯 {getRangeText(c.range)}
                                </span>
                              )}
                              {c.duration && (
                                <span className="rounded bg-amber-500/10 border border-amber-500/20 px-1 py-0.5 text-[7px] uppercase tracking-wider text-amber-400 font-bold">
                                  🕒 {getDurationText(c.duration, c.concentration)}
                                </span>
                              )}
                            </div>
                            {c.description && (
                              <div
                                className="text-[10px] leading-relaxed text-muted-foreground/90 max-h-[140px] overflow-y-auto pr-1 font-sans border-t border-border/5 pt-1.5 prose prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: c.description }}
                              />
                            )}
                            <button
                              onClick={() => handleCastSpell(c, false, 0)}
                              className="w-full mt-1.5 py-1 rounded bg-gradient-to-r from-accent to-purple-600 text-[9px] font-bold text-white shadow hover:from-accent/90 hover:to-purple-500 transition-all cursor-pointer"
                            >
                              Cast Cantrip
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredLevels.map((lvl) => {
              const list = filteredLeveledSpells[lvl] || [];
              if (list.length === 0) return null;
              const suffix = lvl === 1 ? "st" : lvl === 2 ? "nd" : lvl === 3 ? "rd" : "th";
              const slot = localSlots.spellSlots.find((s: any) => s.level === lvl);
              const pact = localSlots.pactSlots.find((s: any) => s.level === lvl);

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
                      const schoolTheme = getSchoolTheme(spell.school);
                      const SchoolIcon = schoolTheme.icon;
                      const isCasting = castingSpellState?.active && castingSpellState.spellName === spell.name;
                      const castOptions = getCastSlotOptions(spell.level);
                      const isSpellPrepared = getIsPrepared(spell);
                      const isAlways = !!spell.alwaysPrepared;

                      const costlyComponent =
                        parseComponentCost(spell.componentsDescription) || parseComponentCost(spell.description);
                      const matchingInventoryItem = costlyComponent
                        ? localInventory.find((i) => i.name.toLowerCase().includes(costlyComponent.item.toLowerCase()))
                        : null;

                      const isSorcerer = member.classes.toLowerCase().includes("sorcerer");
                      const metamagicOptions = localMetamagic || [];
                      const spAction = displayActions.find((a) => a.name.toLowerCase().includes("sorcery points"));
                      const spEffective = spAction ? localResources.getEffectiveResource(spAction) : null;
                      const currentSP = spEffective?.uses?.current ?? 0;
                      const sorcDC = (() => {
                        const sc = member.spellcasting?.find((s) => s.className.toLowerCase() === "sorcerer");
                        return sc ? sc.saveDc + (localInnateSorcery ? 1 : 0) : null;
                      })();

                      return (
                        <div
                          key={spell.name}
                          className={`flex flex-col rounded-md border transition-all duration-200 relative overflow-hidden
                          ${isExpanded ? "border-accent/40 bg-accent/5" : "border-border/50 bg-secondary/45"}`}
                        >
                          {isCasting && (
                            <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center z-10 animate-fade-in">
                              <Sparkles className="text-gold w-4 h-4 animate-bounce mb-1" />
                              <span className="text-[8px] font-bold text-accent uppercase tracking-wider animate-pulse">
                                Casting L{castingSpellState?.slotLevel}
                              </span>
                            </div>
                          )}

                          <div className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs text-foreground hover:bg-secondary/35 focus:outline-none">
                            <span className="flex items-center gap-2 font-medium truncate min-w-0">
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isAlways) {
                                    setLocalPrepOverride((prev) => ({
                                      ...prev,
                                      [spell.name]: !isSpellPrepared,
                                    }));
                                  }
                                }}
                                className="p-1 rounded transition-colors hover:bg-secondary/60 cursor-pointer shrink-0"
                                title={
                                  isAlways
                                    ? "Always Prepared"
                                    : isSpellPrepared
                                      ? "Unprepare Spell"
                                      : "Prepare Spell"
                                }
                              >
                                {isAlways ? (
                                  <BookOpen className="w-3.5 h-3.5 text-gold animate-pulse" />
                                ) : isSpellPrepared ? (
                                  <BookOpen className="w-3.5 h-3.5 text-teal-400" />
                                ) : (
                                  <BookOpen className="w-3.5 h-3.5 text-muted-foreground/30 hover:text-muted-foreground" />
                                )}
                              </span>
                              <SchoolIcon size={11} className={`${schoolTheme.text} shrink-0`} />
                              <span
                                onClick={() => toggleExpand(`spell-${spell.name}`)}
                                className={`cursor-pointer truncate hover:text-accent transition-colors ${isSpellPrepared ? "text-foreground font-semibold" : "text-muted-foreground/50 italic font-normal"}`}
                              >
                                {spell.name}
                              </span>
                            </span>
                            <button
                              onClick={() => toggleExpand(`spell-${spell.name}`)}
                              className="text-[8px] text-muted-foreground font-mono focus:outline-none shrink-0"
                            >
                              {isExpanded ? "▲ LESS" : "▼ DETAILS"}
                            </button>
                          </div>
                          {isExpanded && (
                            <div className="px-2.5 pb-2 border-t border-border/10 pt-2 flex flex-col gap-2">
                              <div className="flex flex-wrap gap-1">
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider ${schoolTheme.bg} ${schoolTheme.text} ${schoolTheme.border}`}
                                >
                                  {spell.school}
                                </span>
                                {spell.activation && (
                                  <span className="rounded bg-primary/10 border border-primary/20 px-1 py-0.5 text-[7px] uppercase tracking-wider text-primary font-bold">
                                    ⚡ {getActivationText(spell.activation)}
                                  </span>
                                )}
                                {spell.range && (
                                  <span className="rounded bg-teal-500/10 border border-teal-500/20 px-1 py-0.5 text-[7px] uppercase tracking-wider text-teal-400 font-bold">
                                    🎯 {getRangeText(spell.range)}
                                  </span>
                                )}
                                {spell.duration && (
                                  <span className="rounded bg-amber-500/10 border border-amber-500/20 px-1 py-0.5 text-[7px] uppercase tracking-wider text-amber-400 font-bold">
                                    🕒 {getDurationText(spell.duration, spell.concentration)}
                                  </span>
                                )}
                              </div>

                              {isSorcerer && localInnateSorcery && (
                                <div className="rounded-lg border border-accent/30 bg-accent/5 p-2 flex items-center gap-1.5 text-[9px] text-accent leading-normal animate-pulse">
                                  <span>✨</span>
                                  <span>
                                    <strong>Innate Sorcery Active:</strong> DC +1 (DC {sorcDC}) & Advantage on Attacks
                                  </span>
                                </div>
                              )}

                              {isStarsDruid && localStarryForm !== "None" && (
                                <div className="rounded-lg border border-primary/30 bg-primary/5 p-2 flex items-center gap-1.5 text-[9px] text-primary leading-normal animate-pulse">
                                  <span>🌌</span>
                                  <span>
                                    <strong>Starry Form ({localStarryForm}) Active:</strong>{" "}
                                    {localStarryForm === "Archer" && "Archer attack added to Actions."}
                                    {localStarryForm === "Chalice" && "Extra 1d8+WIS heal."}
                                    {localStarryForm === "Dragon" && "Min 10 on Int/Wis/Concentration check."}
                                  </span>
                                </div>
                              )}

                              {isGlamourBard && localMantleOfMajesty && (
                                <div className="rounded-lg border border-accent/30 bg-accent/5 p-2 flex items-center gap-1.5 text-[9px] text-accent leading-normal animate-pulse">
                                  <span>👑</span>
                                  <span>
                                    <strong>Mantle of Majesty Active:</strong> Command free BA cast.
                                  </span>
                                </div>
                              )}

                              {!isSpellPrepared && (
                                <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-2 flex items-center justify-between gap-2 text-[9.5px] text-amber-400">
                                  <span>⚠️ Not prepared.</span>
                                  <button
                                    onClick={() =>
                                      setLocalPrepOverride((prev) => ({
                                        ...prev,
                                        [spell.name]: true,
                                      }))
                                    }
                                    className="px-1.5 py-0.5 text-[8.5px] font-bold rounded border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 cursor-pointer"
                                  >
                                    Prepare
                                  </button>
                                </div>
                              )}

                              {costlyComponent && (
                                <div
                                  className={`rounded-lg border p-2 text-[9.5px] leading-normal
                                  ${
                                    matchingInventoryItem && matchingInventoryItem.quantity > 0
                                      ? "bg-teal-500/5 border-teal-500/20 text-teal-400"
                                      : "bg-red-500/5 border-red-500/20 text-red-400"
                                  }`}
                                >
                                  {matchingInventoryItem && matchingInventoryItem.quantity > 0 ? (
                                    <span>
                                      ✔️ Live inventory: {matchingInventoryItem.quantity}x {matchingInventoryItem.name}
                                    </span>
                                  ) : (
                                    <span>
                                      ⚠️ Missing component: {costlyComponent.item} ({costlyComponent.cost} gp)
                                    </span>
                                  )}
                                </div>
                              )}

                              {spell.description && (
                                <div
                                  className="text-[10px] leading-relaxed text-muted-foreground/90 max-h-[140px] overflow-y-auto pr-1 font-sans border-t border-border/5 pt-1.5 prose prose-invert max-w-none"
                                  dangerouslySetInnerHTML={{ __html: spell.description }}
                                />
                              )}

                              {isSorcerer && metamagicOptions.length > 0 && spAction && (
                                <div className="mt-2 border-t border-border/10 pt-2 flex flex-col gap-1">
                                  <span className="text-[8.5px] font-bold text-muted-foreground uppercase tracking-wider">
                                    Metamagic Modifier ({currentSP} SP left):
                                  </span>
                                  <div className="flex flex-wrap gap-1 mt-0.5">
                                    {metamagicOptions.map((mm) => {
                                      const cost = getMetamagicCost(mm.name, spell.level);
                                      const isSelected = selectedMetamagicName === mm.name;
                                      const canAfford = currentSP >= cost;
                                      return (
                                        <button
                                          key={mm.name}
                                          disabled={!canAfford && !isSelected}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedMetamagicName(isSelected ? null : mm.name);
                                          }}
                                          className={`px-1.5 py-0.5 rounded border text-[8.5px] font-semibold transition-all cursor-pointer disabled:opacity-40
                                            ${
                                              isSelected
                                                ? "bg-accent/15 border-accent text-accent font-bold"
                                                : "bg-secondary/35 border-border/60 text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                                            }`}
                                          title={METAMAGIC_DICTIONARY[mm.name]}
                                        >
                                          {mm.name} ({cost})
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              <div className="mt-2 border-t border-border/10 pt-2 flex flex-col gap-1.5">
                                {castOptions.length === 0 ? (
                                  <span className="text-[8.5px] font-bold text-red-400 text-center py-1 rounded bg-red-500/5">
                                    Out of spell slots
                                  </span>
                                ) : (
                                  <div className="flex gap-1.5 select-none">
                                    {castOptions.map((opt) => {
                                      const metamagicSufficient = selectedMetamagicName
                                        ? currentSP >= getMetamagicCost(selectedMetamagicName, spell.level)
                                        : true;

                                      return (
                                        <button
                                          key={`${opt.isPact ? "p" : "s"}-${opt.level}`}
                                          disabled={!metamagicSufficient}
                                          onClick={() => handleCastSpell(spell, opt.isPact, opt.level)}
                                          className={`flex-1 py-1 rounded text-[8px] font-bold transition-all hover:scale-[1.03] text-center cursor-pointer border disabled:opacity-40 disabled:cursor-not-allowed
                                          ${
                                            opt.isPact
                                              ? "bg-accent/5 border-accent/30 text-accent hover:bg-accent/15"
                                              : "bg-primary/5 border-primary/30 text-primary hover:bg-primary/15"
                                          }`}
                                          title={`Cast using Level ${opt.level} Slot`}
                                        >
                                          L{opt.level} {opt.isPact && "Pact"} ({opt.max - opt.used} left)
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {filteredCantrips.length === 0 && filteredLevels.length === 0 && (
              <div className="text-center py-12 text-sm text-muted-foreground italic border border-dashed border-border/20 rounded-xl bg-secondary/5">
                No spells found matching those filters.
              </div>
            )}
          </div>
        )}

        {selectedSpell &&
          spellbookViewMode === "codex" &&
          typeof window !== "undefined" &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              onClick={() => setSelectedSpellName(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[150] flex justify-end lg:hidden animate-fade-in"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-[#100f14]/95 border-l border-border/50 h-full flex flex-col shadow-2xl animate-slide-in-right relative"
              >
                <div className="flex-1 overflow-y-auto animate-fade-in relative z-10">
                  {renderCodexDetail(selectedSpell)}
                </div>
              </div>
            </div>,
            document.body,
          )}
      </div>
    </Panel>
  );
}
