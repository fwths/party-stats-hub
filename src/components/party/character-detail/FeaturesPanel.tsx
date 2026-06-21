import { useState } from "react";
import { Award, BookOpen, User, Lock } from "lucide-react";
import { PartyMember } from "@/lib/dndbeyond.types";
import {
  METAMAGIC_DICTIONARY,
  TOTEM_ASPECT_DICTIONARY,
  WEAPON_MASTERY_DICTIONARY,
} from "./watermark-data";

export function FeaturesPanel({
  member,
  localTotemAspects,
  localMetamagic,
  localWeaponMasteries,
  expandedItems,
  toggleExpand,
  setExpandedItems,
}: {
  member: PartyMember;
  localTotemAspects: any[];
  localMetamagic: any[];
  localWeaponMasteries: any[];
  expandedItems: Record<string, boolean>;
  toggleExpand: (key: string) => void;
  setExpandedItems: (
    val: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>),
  ) => void;
}) {
  const [featureSearch, setFeatureSearch] = useState("");
  const [featureFilter, setFeatureFilter] = useState<"all" | "class" | "race" | "feat">("all");

  const isArmorer =
    member.subclasses.some((s) => s.toLowerCase().includes("armorer")) ||
    member.activeArmorModel !== null;

  const isBarbarian =
    member.classes.toLowerCase().includes("barbarian") ||
    (member.totemAspects && member.totemAspects.length > 0);

  const localArmorModel = member.activeArmorModel;

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

  const classFeatures = filteredFeatures.filter((f) => f.source === "class");
  const racialTraits = filteredFeatures.filter((f) => f.source === "race");
  const feats = filteredFeatures.filter((f) => f.source === "feat");

  const allCount = combinedFeatures.length;
  const classCount = combinedFeatures.filter((f) => f.source === "class").length;
  const raceCount = combinedFeatures.filter((f) => f.source === "race").length;
  const featCount = combinedFeatures.filter((f) => f.source === "feat").length;

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

  return (
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
      <div className="flex overflow-x-auto scrollbar-none gap-1.5 border-b border-border/10 pb-3 select-none flex-nowrap -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
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
  );
}
