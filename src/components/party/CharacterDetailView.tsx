import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { syncedLocalStorage as syncedStorage } from "@/lib/synced-storage";
import {
  Award,
  BookOpen,
  Brain,
  Flame,
  Heart,
  Lock,
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
  User,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useModalHistorySync } from "@/hooks/useModalHistorySync";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/toast";
import { PartyMember, PreparedSpell } from "@/lib/dndbeyond.types";
import { ConditionsPanel, InventoryList, useCharacterConditions } from "./CharacterCard";
import { getFullyModifiedStats } from "@/lib/party-modifiers";
import SpellbookPanel from "./character-detail/SpellbookPanel";
import InventoryPanel from "./character-detail/InventoryPanel";
import { RestConsole } from "./character-detail/RestConsole";
import { RestModals } from "./character-detail/RestModals";
import {
  useLocalRage,
  useLocalMetamagic,
  useLocalWeaponMasteries,
  useLocalHpState,
  useLocalSpellSlots,
  useLocalResourcesState,
  useLocalInventoryState,
  useLocalArmorModel,
  useLocalActiveInfusions,
  useLocalTotemAspects,
} from "./character-detail/hooks";
import { METAMAGIC_DICTIONARY, TOTEM_ASPECT_DICTIONARY } from "./character-detail/watermark-data";
import { AttacksPanel, ResourcesPanel, WeaponMasteriesPanel } from "./character-detail/CombatPanel";
import {
  AbilityScoresPanel,
  SavingThrowsPanel,
  SensesPanel,
  SkillsSectionPanel,
  DefensesPanel,
  ProficienciesPanel,
} from "./character-detail/SkillsPanel";
import { FeaturesPanel } from "./character-detail/FeaturesPanel";
import { CompanionsPanel } from "./character-detail/CompanionsPanel";
import { BioPanel } from "./character-detail/BioPanel";

const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

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

export function CustomSelect({
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

export function Panel({
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
        <div
          className={cn(
            "flex items-center gap-2 font-bold uppercase tracking-widest text-accent text-glow-accent border-b border-border/20 select-none",
            padding.includes("p-5") ? "mb-4.5 pb-3 text-xs" : "mb-2.5 pb-2 text-[10px]",
          )}
        >
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
        {Icon && <Icon size={11} className={cn("text-accent/80 shrink-0", iconClassName)} />}
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

export function CharacterDetailView({
  member,
  allMembers = [],
}: {
  member: PartyMember;
  allMembers?: PartyMember[];
}) {
  const { toast } = useToast();
  const [activeLayout, setActiveLayout] = useState<"classic" | "sticky" | "tabbed" | "widescreen">(
    () => {
      try {
        const stored = syncedStorage.getItem("party-stats:detail-layout");
        if (
          stored === "classic" ||
          stored === "sticky" ||
          stored === "tabbed" ||
          stored === "widescreen"
        ) {
          return stored;
        }
      } catch {}
      return "tabbed";
    },
  );
  const [activeTab, setActiveTab] = useState<
    "combat" | "spells" | "skills" | "features" | "gear" | "bio" | "companions"
  >("skills");
  const [hpInputVal, setHpInputVal] = useState("");
  const [tempHpInputVal, setTempHpInputVal] = useState("");
  const [showHpControl, setShowHpControl] = useState(false);
  const [restModal, setRestModal] = useState<{ type: "short" | "long" } | null>(null);
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const [isClientMounted, setIsClientMounted] = useState(false);
  useEffect(() => {
    setIsClientMounted(true);
  }, []);
  const [shortRestHealInput, setShortRestHealInput] = useState("0");
  const [shortRestDiceSpend, setShortRestDiceSpend] = useState<Record<string, number>>({});
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [castingSpellState, setCastingSpellState] = useState<{
    active: boolean;
    spellName: string | null;
    slotLevel?: number;
  } | null>(null);

  const [selectedMetamagicName, setSelectedMetamagicName] = useState<string | null>(null);
  const [localPrepOverride, setLocalPrepOverride] = useState<Record<string, boolean>>(() => {
    try {
      const stored = syncedStorage.getItem(`party-stats:prep-override:${member.id}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      syncedStorage.setItem(
        `party-stats:prep-override:${member.id}`,
        JSON.stringify(localPrepOverride),
      );
    } catch {}
  }, [localPrepOverride, member.id]);

  const [localInnateSorcery, setLocalInnateSorcery] = useState<boolean>(() => {
    try {
      const stored = syncedStorage.getItem(`party-stats:innate-sorcery:${member.id}`);
      return stored === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      syncedStorage.setItem(`party-stats:innate-sorcery:${member.id}`, String(localInnateSorcery));
    } catch {}
  }, [localInnateSorcery, member.id]);

  const [localStarryForm, setLocalStarryForm] = useState<"None" | "Archer" | "Chalice" | "Dragon">(
    (() => {
      try {
        const stored = syncedStorage.getItem(`party-stats:starry-form:${member.id}`);
        if (stored === "Archer" || stored === "Chalice" || stored === "Dragon") return stored;
      } catch {}
      return "None";
    })(),
  );

  useEffect(() => {
    try {
      syncedStorage.setItem(`party-stats:starry-form:${member.id}`, localStarryForm);
    } catch {}
  }, [localStarryForm, member.id]);

  const [localMantleOfMajesty, setLocalMantleOfMajesty] = useState<boolean>(() => {
    try {
      const stored = syncedStorage.getItem(`party-stats:mantle-majesty:${member.id}`);
      return stored === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      syncedStorage.setItem(
        `party-stats:mantle-majesty:${member.id}`,
        String(localMantleOfMajesty),
      );
    } catch {}
  }, [localMantleOfMajesty, member.id]);

  const [isMantleInspirationOpen, setIsMantleInspirationOpen] = useState(false);

  useModalHistorySync(
    !!restModal,
    (open) => {
      if (!open) setRestModal(null);
    },
    "isRestModalOpen",
  );
  useModalHistorySync(showSyncConfirm, setShowSyncConfirm, "isSyncConfirmOpen");

  const [
    localInventory,
    toggleLocalItemEquipped,
    toggleLocalItemAttuned,
    setAllInvOverrides,
    addLocalCustomItem,
    deleteLocalCustomItem,
    setLocalCustomItems,
  ] = useLocalInventoryState(member.id, member.inventory || []);

  const [isAspectSelectOpen, setIsAspectSelectOpen] = useState(false);

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

  const isStarsDruid =
    member.classes.toLowerCase().includes("druid") &&
    (member.subclasses.some((s) => s.toLowerCase().includes("stars")) ||
      (member.features ?? []).some((f) => f.name.toLowerCase().includes("starry form")));

  const isGlamourBard =
    member.classes.toLowerCase().includes("bard") &&
    member.subclasses.some((s) => s.toLowerCase().includes("glamour"));

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

  const [localMetamagic, setLocalMetamagic] = useLocalMetamagic(member.id, member.metamagic || []);

  const [localWeaponMasteries, setLocalWeaponMasteries] = useLocalWeaponMasteries(
    member.id,
    member.weaponMasteries || [],
  );

  const [localActiveInfusions, toggleLocalActiveInfusion, setLocalActiveInfusions] =
    useLocalActiveInfusions(member.id, member.activeInfusions || []);

  useEffect(() => {
    if (member.activeInfusions) {
      setLocalActiveInfusions(member.activeInfusions);
      try {
        const storageKey = `party-stats:active-infusions:${member.id}`;
        syncedStorage.setItem(storageKey, JSON.stringify(member.activeInfusions));
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

  const parseComponentCost = (desc?: string): { cost: number; item: string } | null => {
    if (!desc) return null;
    const match = desc.match(/worth\s+(?:at\s+least\s+)?([\d,]+)\s*(?:gp|gold)/i);
    if (match) {
      const cost = parseInt(match[1].replace(/,/g, ""), 10);
      let item = "Material Component";
      const descLower = desc.toLowerCase();
      if (descLower.includes("diamond")) {
        item = "Diamond";
      } else if (descLower.includes("incense")) {
        item = "Incense";
      } else if (descLower.includes("ruby")) {
        item = "Ruby";
      } else if (descLower.includes("pearl")) {
        item = "Pearl";
      } else if (descLower.includes("jade")) {
        item = "Jade";
      } else if (descLower.includes("crystal")) {
        item = "Crystal";
      }
      return { cost, item };
    }
    return null;
  };

  const getMetamagicCost = (name: string, spellLevel: number): number => {
    const norm = name.toLowerCase();
    if (norm.includes("quickened") || norm.includes("seeking")) return 2;
    if (norm.includes("heightened")) return 3;
    if (norm.includes("twinned")) return Math.max(1, spellLevel);
    return 1;
  };

  const handleCastSpell = (spell: PreparedSpell, isPact: boolean, slotLevel: number) => {
    const targetSlots = isPact ? localSlots.pactSlots : localSlots.spellSlots;
    const slot = targetSlots.find((s) => s.level === slotLevel);
    if (!slot) return;
    const available = slot.max - slot.used;
    if (available <= 0) return;

    localSlots.toggleSlot(slotLevel, 0, isPact);

    // Deduct Metamagic Sorcery Points if selected
    if (selectedMetamagicName && selectedMetamagicName !== "None") {
      const spAction = displayActions.find((a) => a.name.toLowerCase().includes("sorcery points"));
      if (spAction && spAction.uses) {
        const cost = getMetamagicCost(selectedMetamagicName, spell.level);
        const maxSP = spAction.uses.max;
        const currentSpent = localResources.spent[spAction.name] ?? 0;
        const availableSP = Math.max(0, maxSP - currentSpent);
        if (availableSP >= cost) {
          localResources.useResourceAmount(spAction.name, cost, maxSP);
        }
      }
    }

    setCastingSpellState({
      active: true,
      spellName: spell.name,
      slotLevel,
    });

    if (spell.concentration) {
      addLocalCondition("Concentration", null);
    }

    setSelectedMetamagicName(null);

    setTimeout(() => {
      setCastingSpellState(null);
    }, 1200);
  };

  const getCastSlotOptions = (spellLevel: number) => {
    const options: Array<{ level: number; max: number; used: number; isPact: boolean }> = [];

    localSlots.pactSlots.forEach((p) => {
      const available = p.max - p.used;
      if (p.level >= spellLevel && available > 0) {
        options.push({ level: p.level, max: p.max, used: p.used, isPact: true });
      }
    });

    localSlots.spellSlots.forEach((s) => {
      const available = s.max - s.used;
      if (s.level >= spellLevel && available > 0) {
        options.push({ level: s.level, max: s.max, used: s.used, isPact: false });
      }
    });

    return options;
  };

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
          description:
            "As a bonus action, you can gain temporary hit points equal to your level. You can use this a number of times equal to your proficiency bonus per long rest.",
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
          description:
            "You have advantage on Dexterity (Stealth) checks. If you wear heavy armor, that armor doesn't impose disadvantage on your Dexterity (Stealth) checks.",
        });
      }
    }
    return list;
  })();

  const localResources = useLocalResourcesState(
    member.id,
    displayActions.filter((a) => a.source === "class" && a.uses),
  );
  const innateSorcerySpent = localResources.spent["Innate Sorcery"] ?? 0;

  // Synchronize Innate Sorcery resource bubble changes to localInnateSorcery state
  const prevInnateSorcerySpentRef = useRef<number>(innateSorcerySpent);
  useEffect(() => {
    const currentSpent = innateSorcerySpent;
    const prevSpent = prevInnateSorcerySpentRef.current;
    prevInnateSorcerySpentRef.current = currentSpent;

    if (currentSpent > prevSpent) {
      // If resource was spent (bubble filled), turn on Innate Sorcery benefits
      setLocalInnateSorcery(true);
    } else if (currentSpent === 0 && prevSpent > 0) {
      // If spent count was reset to 0 (e.g. rest or manual clear), turn off Innate Sorcery
      setLocalInnateSorcery(false);
    }
  }, [innateSorcerySpent]);

  const mods = getFullyModifiedStats(member);
  const {
    ac,
    speed,
    acNotes,
    speedNotes,
    carryingCapacity: displayCarryingCapacity,
    specialSpeeds: displaySpecialSpeeds,
    hitDice: displayHitDice,
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

  let displaySkills = [...member.skills].sort((a, b) => {
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

  // Apply Gloves of Thievery +5 bonus to Sleight of Hand check (checking for double counting remote DDB active infusions)
  const isArtificer = member.classes.toLowerCase().includes("artificer");
  if (isArtificer) {
    const remoteActive = member.activeInfusions || [];
    const remoteGloves = remoteActive.includes("Gloves of Thievery");
    const localGloves = localActiveInfusions.includes("Gloves of Thievery");
    const glovesDiff = (localGloves ? 5 : 0) - (remoteGloves ? 5 : 0);

    if (glovesDiff !== 0) {
      displaySkills = displaySkills.map((s) => {
        if (s.name === "Sleight of Hand") {
          return {
            ...s,
            modifier: s.modifier + glovesDiff,
          };
        }
        return s;
      });
    }
  }

  const hasFeralInstinct =
    member.features?.some((f) => f.name.toLowerCase().includes("feral instinct")) ?? false;

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

  // === HERO ===
  const getAvatarRingClass = (pct: number) => {
    if (pct <= 25)
      return "ring-4 ring-hp-critical/80 shadow-[0_0_20px_color-mix(in_oklab,var(--color-hp-critical)_80%,transparent)] animate-pulse";
    if (pct <= 60)
      return "ring-4 ring-hp-wounded/60 shadow-[0_0_16px_color-mix(in_oklab,var(--color-hp-wounded)_40%,transparent)]";
    return "ring-4 ring-hp-good/50 shadow-[0_0_16px_color-mix(in_oklab,var(--color-hp-good)_35%,transparent)]";
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
          {isBarbarian &&
            (() => {
              const isTotemBarbarian = member.subclasses.some(
                (s) => s.toLowerCase().includes("wild heart") || s.toLowerCase().includes("totem"),
              );
              if (!isTotemBarbarian) return null;

              const aspectOptions = (() => {
                const hasAspectOfTheWilds = (member.features ?? []).some(
                  (f) => f.name === "Aspect of the Wilds",
                );
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
              className="text-ui-rose drop-shadow-[0_0_4px_color-mix(in_oklab,var(--color-ui-rose)_50%,transparent)]"
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
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    HP Control Center
                  </span>
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
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80 select-none">
                    Temporary HP
                  </span>
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
                          localHp.setDeathSaveSuccesses(
                            localHp.deathSaves.successes === newVal ? i : newVal,
                          );
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
                          localHp.setDeathSaveFailures(
                            localHp.deathSaves.failures === newVal ? i : newVal,
                          );
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
                            ? "bg-ui-emerald/25 text-ui-emerald border-ui-emerald/35 animate-pulse"
                            : "bg-ui-rose/25 text-ui-rose border-ui-rose/35",
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

  // === SPELLCASTING ===
  const spellcastingPanel = (member.spellcasting?.length > 0 ||
    member.spellSlots.length > 0 ||
    member.pactSlots.length > 0) && (
    <Panel title="Spellcasting" icon={Sparkles}>
      <div className="flex flex-col gap-3">
        {member.classes.toLowerCase().includes("sorcerer") && (
          <div className="p-2.5 rounded-xl border border-accent/30 bg-accent/5 flex items-center justify-between gap-3 text-xs select-none">
            <div className="flex items-center gap-2">
              <span className="text-base shrink-0 animate-pulse">✨</span>
              <div>
                <span className="font-heading font-extrabold text-foreground block">
                  Innate Sorcery
                </span>
                <span className="text-[9px] text-muted-foreground leading-normal">
                  DC +1, Advantage on Spell Attack rolls
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                const nextActive = !localInnateSorcery;
                setLocalInnateSorcery(nextActive);
                if (nextActive) {
                  // Find the max uses of Innate Sorcery dynamically
                  const isAction = displayActions.find((a) => a.name === "Innate Sorcery");
                  const maxUses = isAction?.uses?.max ?? 2;
                  const currentSpent = localResources.spent["Innate Sorcery"] ?? 0;
                  if (currentSpent < maxUses) {
                    localResources.useResource("Innate Sorcery", maxUses);
                  }
                }
              }}
              className={`px-3 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer shadow-sm
                ${
                  localInnateSorcery
                    ? "bg-accent border-accent text-accent-foreground shadow-accent/20 animate-pulse"
                    : "bg-secondary/45 border-border hover:border-accent/40 text-muted-foreground hover:text-foreground"
                }`}
            >
              {localInnateSorcery ? "Active" : "Inactive"}
            </button>
          </div>
        )}

        {member.classes.toLowerCase().includes("sorcerer") &&
          (() => {
            const spAction = displayActions.find((a) =>
              a.name.toLowerCase().includes("sorcery points"),
            );
            if (!spAction) return null;
            const maxSP = spAction.uses?.max ?? 0;
            const currentSpentSP = localResources.spent[spAction.name] ?? 0;
            const currentSP = Math.max(0, maxSP - currentSpentSP);
            const maxCastingLevel = Math.max(...localSlots.spellSlots.map((s) => s.level), 0);

            const spToSlotCosts = [0, 2, 3, 5, 6, 7];
            const slotToSpYields = [0, 1, 2, 3, 4, 5];

            return (
              <div className="p-2.5 rounded-xl border border-accent/25 bg-secondary/15 flex flex-col gap-2.5 text-xs select-none">
                <div className="flex items-center justify-between border-b border-border/10 pb-1.5">
                  <span className="font-heading font-extrabold text-foreground">
                    Flexible Casting
                  </span>
                  <span className="font-mono text-[10px] text-accent font-semibold">
                    {currentSP} / {maxSP} Sorcery Points
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 divide-x divide-border/10">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      Create Slots (SP → Slot)
                    </span>
                    <div className="flex flex-col gap-1">
                      {[1, 2, 3, 4, 5]
                        .filter((lvl) => lvl <= maxCastingLevel)
                        .map((lvl) => {
                          const cost = spToSlotCosts[lvl];
                          const canAfford = currentSP >= cost;
                          return (
                            <button
                              key={`create-${lvl}`}
                              disabled={!canAfford}
                              onClick={() => {
                                localResources.useResourceAmount(spAction.name, cost, maxSP);
                                localSlots.changeSlotUsed(lvl, -1, false);
                              }}
                              className="w-full py-1 px-1.5 bg-accent/5 hover:bg-accent/15 disabled:opacity-40 disabled:pointer-events-none text-[9.5px] border border-accent/20 rounded font-bold text-accent transition-all flex justify-between cursor-pointer"
                            >
                              <span>Level {lvl} Slot</span>
                              <span className="font-mono opacity-80">-{cost} SP</span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 pl-3">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      Reclaim SP (Slot → SP)
                    </span>
                    <div className="flex flex-col gap-1">
                      {[1, 2, 3, 4, 5]
                        .filter((lvl) => lvl <= maxCastingLevel)
                        .map((lvl) => {
                          const yieldSP = slotToSpYields[lvl];
                          const slot = localSlots.spellSlots.find((s) => s.level === lvl);
                          const hasSlot = slot && slot.max - slot.used > 0;
                          const canGain = currentSP < maxSP;
                          return (
                            <button
                              key={`reclaim-${lvl}`}
                              disabled={!hasSlot || !canGain}
                              onClick={() => {
                                localSlots.changeSlotUsed(lvl, 1, false);
                                localResources.useResourceAmount(spAction.name, -yieldSP, maxSP);
                              }}
                              className="w-full py-1 px-1.5 bg-primary/5 hover:bg-primary/15 disabled:opacity-40 disabled:pointer-events-none text-[9.5px] border border-primary/20 rounded font-bold text-primary transition-all flex justify-between cursor-pointer"
                            >
                              <span>Level {lvl} Slot</span>
                              <span className="font-mono opacity-80">+{yieldSP} SP</span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

        {isStarsDruid &&
          (() => {
            const wsAction = displayActions.find((a) =>
              a.name.toLowerCase().includes("wild shape"),
            );
            const maxWS = wsAction?.uses?.max ?? 2;
            const currentSpentWS = wsAction ? (localResources.spent[wsAction.name] ?? 0) : 0;
            const currentWS = wsAction ? Math.max(0, maxWS - currentSpentWS) : 0;

            return (
              <div className="p-2.5 rounded-xl border border-accent/25 bg-secondary/15 flex flex-col gap-2 text-xs select-none">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-heading font-extrabold text-foreground block">
                      Starry Form
                    </span>
                    <span className="text-[9px] text-muted-foreground leading-normal">
                      Archer (BA Attack), Chalice (Extra Heal), Dragon (Min 10 Checks)
                    </span>
                  </div>
                  {wsAction && (
                    <span className="font-mono text-[9px] text-accent font-semibold">
                      {currentWS} / {maxWS} Wild Shapes
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  {(["None", "Archer", "Chalice", "Dragon"] as const).map((form) => {
                    const isActive = localStarryForm === form;
                    const needsWS = form !== "None" && !isActive;
                    const canActivate = !needsWS || currentWS > 0;
                    return (
                      <button
                        key={form}
                        disabled={!canActivate && !isActive}
                        onClick={() => {
                          if (isActive) {
                            setLocalStarryForm("None");
                          } else {
                            setLocalStarryForm(form);
                            if (needsWS && wsAction) {
                              localResources.useResource(wsAction.name, maxWS);
                            }
                          }
                        }}
                        className={`flex-1 py-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed
                        ${
                          isActive
                            ? "bg-accent border-accent text-accent-foreground shadow-sm shadow-accent/25 animate-pulse"
                            : "bg-secondary/45 border-border hover:border-accent/40 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {form === "None" ? "Dismiss" : form}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

        {isGlamourBard &&
          (() => {
            const biAction = displayActions.find((a) =>
              a.name.toLowerCase().includes("bardic inspiration"),
            );
            const maxBI = biAction?.uses?.max ?? 4;
            const currentSpentBI = biAction ? (localResources.spent[biAction.name] ?? 0) : 0;
            const currentBI = biAction ? Math.max(0, maxBI - currentSpentBI) : 0;

            const momAction = displayActions.find((a) =>
              a.name.toLowerCase().includes("mantle of majesty"),
            );
            const maxMoM = momAction?.uses?.max ?? 1;
            const currentSpentMoM = momAction ? (localResources.spent[momAction.name] ?? 0) : 0;
            const currentMoM = momAction ? Math.max(0, maxMoM - currentSpentMoM) : 0;

            return (
              <div className="p-2.5 rounded-xl border border-accent/25 bg-secondary/15 flex flex-col gap-2.5 text-xs select-none">
                <div className="flex items-center justify-between border-b border-border/10 pb-1.5">
                  <span className="font-heading font-extrabold text-foreground">
                    Glamour Mantles
                  </span>
                  {biAction && (
                    <span className="font-mono text-[9px] text-accent font-semibold">
                      {currentBI} / {maxBI} Inspiration
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {/* Mantle of Inspiration */}
                  <div className="flex flex-col gap-1.5">
                    <button
                      disabled={currentBI <= 0 && !isMantleInspirationOpen}
                      onClick={() => setIsMantleInspirationOpen(!isMantleInspirationOpen)}
                      className={`w-full py-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5
                      ${
                        isMantleInspirationOpen
                          ? "bg-accent/15 border-accent text-accent"
                          : "bg-secondary/45 border-border hover:border-accent/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>🎭 Mantle of Inspiration</span>
                      <span className="text-[8.5px] font-normal opacity-80">
                        (Cost: 1 Inspiration)
                      </span>
                    </button>
                    {isMantleInspirationOpen && (
                      <div className="p-2 bg-secondary/30 border border-border/40 rounded-lg flex flex-col gap-1.5 animate-fade-in">
                        <span className="text-[9px] font-semibold text-muted-foreground">
                          Apply 5 Temp HP to members in range:
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {["Willow Alatáriel", "Echo", "Dresana Silvakias", "Qemuel"].map(
                            (name) => {
                              const idMap: Record<string, number> = {
                                "Willow Alatáriel": 131296315,
                                Echo: 132900149,
                                "Dresana Silvakias": 132940690,
                                Qemuel: 97349530,
                              };
                              const otherId = idMap[name];
                              if (!otherId) return null;
                              return (
                                <button
                                  key={name}
                                  onClick={() => {
                                    try {
                                      const storageKey = `party-stats:hp:${otherId}`;
                                      const stored = syncedStorage.getItem(storageKey);
                                      const data = stored ? JSON.parse(stored) : {};
                                      data.tempHp = Math.max(data.tempHp || 0, 5);
                                      syncedStorage.setItem(storageKey, JSON.stringify(data));

                                      if (biAction) {
                                        localResources.useResource(biAction.name, maxBI);
                                      }

                                      setIsMantleInspirationOpen(false);
                                      toast.success(`Applied 5 temporary HP to ${name}!`, "Mantle of Inspiration");
                                    } catch {}
                                  }}
                                  className="py-1 px-1.5 border border-border/60 bg-secondary/50 hover:bg-accent hover:text-accent-foreground hover:border-accent rounded text-[9.5px] font-bold text-muted-foreground transition-all cursor-pointer text-left truncate"
                                >
                                  + {name.split(" ")[0]}
                                </button>
                              );
                            },
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mantle of Majesty */}
                  {momAction && (
                    <div className="flex items-center justify-between gap-3 border-t border-border/10 pt-2 mt-0.5">
                      <div>
                        <span className="font-heading font-extrabold text-foreground block">
                          Mantle of Majesty
                        </span>
                        <span className="text-[8.5px] text-muted-foreground">
                          Command as BA for free
                        </span>
                      </div>
                      <button
                        disabled={currentMoM <= 0 && !localMantleOfMajesty}
                        onClick={() => {
                          const next = !localMantleOfMajesty;
                          setLocalMantleOfMajesty(next);
                          if (next && momAction) {
                            localResources.useResource(momAction.name, maxMoM);
                          }
                        }}
                        className={`px-3 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer shadow-sm
                        ${
                          localMantleOfMajesty
                            ? "bg-accent border-accent text-accent-foreground shadow-accent/20 animate-pulse"
                            : "bg-secondary/45 border-border hover:border-accent/40 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {localMantleOfMajesty ? "Active" : "Inactive"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        {member.spellcasting?.map((sc) => {
          const abilityMod = member.abilities.find((a) => a.name === sc.ability)?.modifier ?? 0;
          const isSorc = sc.className.toLowerCase() === "sorcerer";
          const displayDc = isSorc && localInnateSorcery ? sc.saveDc + 1 : sc.saveDc;
          const displayAttackBonus = sc.attackBonus;
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
                <div className="pl-1 relative">
                  <div className="font-heading text-xl font-extrabold leading-tight text-foreground flex items-center justify-center gap-1">
                    {fmt(displayAttackBonus)}
                    {isSorc && localInnateSorcery && (
                      <span className="text-[8.5px] font-sans font-bold uppercase tracking-wider text-accent border border-accent/30 bg-accent/10 px-1 rounded animate-pulse select-none">
                        Adv
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[8px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    Spell Attack
                  </div>
                </div>
                <div className="pl-1">
                  <div
                    className={`font-heading text-xl font-extrabold leading-tight ${isSorc && localInnateSorcery ? "text-accent text-glow-accent scale-105" : "text-gold"} transition-all duration-300`}
                  >
                    {displayDc}
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

  const expandedSpellbook = (member.cantrips.length > 0 || member.allSpells.length > 0) && (
    <SpellbookPanel
      member={member}
      localPrepOverride={localPrepOverride}
      setLocalPrepOverride={setLocalPrepOverride}
      localInventory={localInventory}
      localMetamagic={localMetamagic}
      displayActions={displayActions}
      localResources={localResources}
      localSlots={localSlots}
      localInnateSorcery={localInnateSorcery}
      localStarryForm={localStarryForm}
      localMantleOfMajesty={localMantleOfMajesty}
      castingSpellState={castingSpellState}
      setCastingSpellState={setCastingSpellState}
      selectedMetamagicName={selectedMetamagicName}
      setSelectedMetamagicName={setSelectedMetamagicName}
      handleCastSpell={handleCastSpell}
      getMetamagicCost={getMetamagicCost}
      getCastSlotOptions={getCastSlotOptions}
      parseComponentCost={parseComponentCost}
    />
  );

  // === COMPANIONS & SUMMONS ===

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
                    : "border-border bg-secondary/15 hover:border-accent/40 hover:bg-secondary/25",
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

  const hasFeatures =
    (member.features && member.features.length > 0) ||
    member.subclasses.some((s) => s.toLowerCase().includes("armorer")) ||
    member.activeArmorModel !== null ||
    member.classes.toLowerCase().includes("barbarian") ||
    (member.totemAspects && member.totemAspects.length > 0) ||
    (member.metamagic && member.metamagic.length > 0) ||
    (member.weaponMasteries && member.weaponMasteries.length > 0) ||
    (member.feats && member.feats.length > 0);

  const featuresPanel = hasFeatures && (
    <Panel title="Features & Traits" icon={Award}>
      <FeaturesPanel
        member={member}
        localTotemAspects={localTotemAspects}
        localMetamagic={localMetamagic}
        localWeaponMasteries={localWeaponMasteries}
        expandedItems={expandedItems}
        toggleExpand={toggleExpand}
        setExpandedItems={setExpandedItems}
      />
    </Panel>
  );

  const bioPanel = <BioPanel member={member} />;

  const abilityScores = <AbilityScoresPanel member={member} />;
  const savingThrows = <SavingThrowsPanel member={member} localRage={localRage} />;
  const senses = <SensesPanel member={member} />;
  const skills = (
    <SkillsSectionPanel
      member={member}
      localActiveInfusions={localActiveInfusions}
      localInventory={localInventory}
      localTotemAspects={localTotemAspects}
      localRage={localRage}
    />
  );
  const defenses = <DefensesPanel member={member} />;
  const proficiencies = <ProficienciesPanel member={member} />;

  const attacks = (
    <AttacksPanel
      member={member}
      localWeaponMasteries={localWeaponMasteries}
      localRage={localRage}
      expandedItems={expandedItems}
      toggleExpand={toggleExpand}
    />
  );
  const resourcesPanel = (
    <ResourcesPanel
      member={member}
      localRage={localRage}
      setLocalRage={setLocalRage}
      localResources={localResources}
      expandedItems={expandedItems}
      toggleExpand={toggleExpand}
    />
  );
  const weaponMasteriesPanel = (
    <WeaponMasteriesPanel
      localWeaponMasteries={localWeaponMasteries}
      setLocalWeaponMasteries={setLocalWeaponMasteries}
    />
  );

  const companionsPanel = member.creatures && member.creatures.length > 0 && (
    <CompanionsPanel member={member} />
  );

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
                  syncedStorage.setItem("party-stats:detail-layout", opt.id);
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
    ...(member.creatures && member.creatures.length > 0
      ? [{ id: "companions", label: "Companions", icon: Brain }]
      : []),
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
            onClick={() => setActiveTab(tab.id as any)}
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

  const restAndHitDiceConsole = (
    <RestConsole
      member={member}
      localHp={localHp}
      setShortRestHealInput={setShortRestHealInput}
      setShortRestDiceSpend={setShortRestDiceSpend}
      setRestModal={setRestModal}
    />
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
            <InventoryPanel
              member={member}
              allMembers={allMembers}
              localInventory={localInventory}
              toggleLocalItemEquipped={toggleLocalItemEquipped}
              toggleLocalItemAttuned={toggleLocalItemAttuned}
              deleteLocalCustomItem={deleteLocalCustomItem}
              addLocalCustomItem={addLocalCustomItem}
              displayCarryingCapacity={displayCarryingCapacity}
              infusionsPanel={infusionsPanel}
            />
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
      {isClientMounted && document.getElementById("character-header-actions")
        ? createPortal(
            <button
              onClick={() => setShowSyncConfirm(true)}
              className="rounded-lg border border-border/50 bg-secondary/35 px-2.5 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground hover:border-accent hover:text-accent hover:bg-secondary/60 cursor-pointer focus:outline-none flex items-center gap-1.5 transition-all duration-200"
              title="Reset local changes and sync with D&D Beyond"
            >
              <RefreshCw size={12} />
              <span className="hidden sm:inline">Sync DDB</span>
            </button>,
            document.getElementById("character-header-actions")!,
          )
        : null}
      <section className="card-arcane relative rounded-xl border border-border/40 p-5 shadow-lg">
        <div className="grid gap-6 md:grid-cols-[1.3fr_1fr] items-start">
          <div className="w-full">{heroContent}</div>
          <div className="w-full border-t border-border/10 pt-5 md:border-t-0 md:pt-0 md:border-l md:border-border/10 md:pl-6">
            {vitalsContent}
          </div>
        </div>
      </section>
      <div>
        {restAndHitDiceConsole}
        {/* Layout switcher is hidden per user request */}
        {false && layoutSwitcher}
      </div>
      {content}

      <RestModals
        restModal={restModal}
        onClose={() => setRestModal(null)}
        member={member}
        localHp={localHp}
        localSlots={localSlots}
        localResources={localResources}
        shortRestDiceSpend={shortRestDiceSpend}
        setShortRestDiceSpend={setShortRestDiceSpend}
        shortRestHealInput={shortRestHealInput}
        setShortRestHealInput={setShortRestHealInput}
        setLocalInnateSorcery={setLocalInnateSorcery}
        setLocalStarryForm={setLocalStarryForm}
        setLocalMantleOfMajesty={setLocalMantleOfMajesty}
      />

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
                  setLocalInnateSorcery(false);
                  setLocalStarryForm("None");
                  setLocalMantleOfMajesty(false);
                  setLocalArmorModel(member.activeArmorModel);
                  setLocalTotemAspects(member.totemAspects || []);
                  setLocalMetamagic(member.metamagic || []);
                  setLocalWeaponMasteries(member.weaponMasteries || []);
                  setLocalActiveInfusions(member.activeInfusions || []);
                  setLocalRage("None");
                  try {
                    syncedStorage.removeItem(`party-stats:item-overrides:${member.id}`);
                    syncedStorage.removeItem(`party-stats:custom-items:${member.id}`);
                  } catch {}
                  setAllInvOverrides({});
                  setLocalCustomItems([]);
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
