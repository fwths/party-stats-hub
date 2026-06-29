import { Star, Shield, Eye, Search, Brain, Moon, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PartyMember } from "@/lib/dndbeyond.types";
import { SKILL_ABILITY } from "@/lib/constants";
import { ABILITY_DETAILS } from "../CharacterCard";
import { getFullyModifiedStats } from "@/lib/party-modifiers";
import { Panel } from "../CharacterDetailView";

const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export function AbilityScoresPanel({ member }: { member: PartyMember }) {
  return (
    <Panel title="Ability Scores" icon={BookOpen}>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
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
}

export function SavingThrowsPanel({
  member,
  localRage,
}: {
  member: PartyMember;
  localRage: string;
}) {
  const isBarbarian =
    member.classes.toLowerCase().includes("barbarian") ||
    (member.totemAspects && member.totemAspects.length > 0);

  const hasDangerSense =
    member.features?.some(
      (f) => f.isUnlocked !== false && f.name.toLowerCase().includes("danger sense"),
    ) ?? false;

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

    const allFeatures = [
      ...(member.features ?? []).filter((feature) => feature.isUnlocked !== false),
      ...(member.feats ?? []),
    ];

    for (const f of allFeatures) {
      const descLower = (f.description ?? "").toLowerCase();

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
          `advantage on\\s+(?:[\\w\\s\\?]+)?${ability.toLowerCase()}\\s+saving\\s+throw`,
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

  if (member.saves.length === 0) return null;

  return (
    <Panel title="Saving Throws" icon={Shield}>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
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
            const advSit = sEffects
              .filter((e) => e.type === "adv")
              .some((e) => e.label.includes("*"));
            const disSit = sEffects
              .filter((e) => e.type === "dis")
              .some((e) => e.label.includes("*"));
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
                        ? "bg-gradient-to-r from-ui-emerald/25 to-ui-rose/25 border-ui-amber/40 text-ui-amber"
                        : badge.type === "adv"
                          ? "bg-ui-emerald/25 text-ui-emerald border-ui-emerald/35"
                          : "bg-ui-rose/25 text-ui-rose border-ui-rose/35",
                    )}
                  >
                    {badge.type === "conflict" ? (
                      <>
                        <span className="text-ui-emerald">{badge.label.split("|")[0]}</span>
                        <span className="text-muted-foreground/60 mx-px">|</span>
                        <span className="text-ui-rose">{badge.label.split("|")[1]}</span>
                      </>
                    ) : (
                      badge.label
                    )}
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
}

export function SensesPanel({ member }: { member: PartyMember }) {
  const mods = getFullyModifiedStats(member);
  const displaySenses = mods.senses || [];

  if (displaySenses.length === 0 && member.passivePerception == null) return null;

  return (
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
}

export function SkillsSectionPanel({
  member,
  localActiveInfusions,
  localInventory,
  localTotemAspects,
  localRage,
}: {
  member: PartyMember;
  localActiveInfusions: string[];
  localInventory: any[];
  localTotemAspects: any[];
  localRage: string;
}) {
  const isBarbarian =
    member.classes.toLowerCase().includes("barbarian") ||
    (member.totemAspects && member.totemAspects.length > 0);

  const isArmorer =
    member.subclasses.some((s) => s.toLowerCase().includes("armorer")) ||
    member.activeArmorModel !== null;

  const localArmorModel = member.activeArmorModel;

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

  const skillEffects = (() => {
    const effects: Record<
      string,
      Array<{ type: "adv" | "dis"; label: string; text: string; source: string }>
    > = {};

    const allFeatures = [
      ...(member.features ?? []).filter((feature) => feature.isUnlocked !== false),
      ...(member.feats ?? []),
    ];

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

    const hasHeavyArmor = localInventory.some(
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

  if (displaySkills.length === 0) return null;

  return (
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
            const advSit = sEffects
              .filter((e) => e.type === "adv")
              .some((e) => e.label.includes("*"));
            const disSit = sEffects
              .filter((e) => e.type === "dis")
              .some((e) => e.label.includes("*"));
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
                        ? "bg-gradient-to-r from-ui-emerald/25 to-ui-rose/25 border-ui-amber/40 text-ui-amber"
                        : badge.type === "adv"
                          ? "bg-ui-emerald/25 text-ui-emerald border-ui-emerald/35"
                          : "bg-ui-rose/25 text-ui-rose border-ui-rose/35",
                    )}
                  >
                    {badge.type === "conflict" ? (
                      <>
                        <span className="text-ui-emerald">{badge.label.split("|")[0]}</span>
                        <span className="text-muted-foreground/60 mx-px">|</span>
                        <span className="text-ui-rose">{badge.label.split("|")[1]}</span>
                      </>
                    ) : (
                      badge.label
                    )}
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
}

export function DefensesPanel({ member }: { member: PartyMember }) {
  const mods = getFullyModifiedStats(member);
  const displayDefenses = mods.defenses || [];

  if (displayDefenses.length === 0) return null;

  return (
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
}

export function ProficienciesPanel({ member }: { member: PartyMember }) {
  const hasProficiencies =
    member.languages.length > 0 ||
    member.tools.length > 0 ||
    (member.armorProficiencies && member.armorProficiencies.length > 0) ||
    (member.weaponProficiencies && member.weaponProficiencies.length > 0);

  if (!hasProficiencies) return null;

  return (
    <Panel title="Proficiencies & Languages" icon={BookOpen}>
      <div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-2.5 text-xs">
        {member.armorProficiencies && member.armorProficiencies.length > 0 && (
          <>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none pt-0.5">
              Armor
            </span>
            <span className="text-foreground/95 leading-normal font-medium">
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
}

export function SkillsPanel({
  member,
  localActiveInfusions,
  localInventory,
  localTotemAspects,
  localRage,
}: {
  member: PartyMember;
  localActiveInfusions: string[];
  localInventory: any[];
  localTotemAspects: any[];
  localRage: string;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <AbilityScoresPanel member={member} />
        <SavingThrowsPanel member={member} localRage={localRage} />
        <SensesPanel member={member} />
      </div>
      <div className="flex flex-col gap-4">
        <SkillsSectionPanel
          member={member}
          localActiveInfusions={localActiveInfusions}
          localInventory={localInventory}
          localTotemAspects={localTotemAspects}
          localRage={localRage}
        />
        <DefensesPanel member={member} />
        <ProficienciesPanel member={member} />
      </div>
    </div>
  );
}
