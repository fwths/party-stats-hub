import { useSuspenseQuery } from "@tanstack/react-query";
import { partyQueryOptions } from "@/lib/party";
import { PartyMember } from "@/lib/dndbeyond.functions";
import { SKILL_ABILITY } from "@/lib/constants";
import { getFullyModifiedStats } from "@/lib/party-modifiers";
import {

  Eye,
  Search,
  Brain,
  Coins,
  Shield,
  Zap,
  Sparkles,
  Heart,
  ChevronDown,
  Dumbbell,
  BookOpen,
  Compass,
  Crown,
} from "lucide-react";

const ABILITY_FULL_NAME: Record<string, string> = {
  STR: "Strength",
  DEX: "Dexterity",
  CON: "Constitution",
  INT: "Intelligence",
  WIS: "Wisdom",
  CHA: "Charisma",
};

function getShortName(fullName: string): string {
  const matchQuote = fullName.match(/["']([^"']+)["']/);
  if (matchQuote && matchQuote[1]) {
    return matchQuote[1].trim();
  }
  const nameWithoutYear = fullName.replace(/^\d+\s+/, "");
  const firstWord = nameWithoutYear.split(/\s+/)[0];
  return firstWord || fullName;
}

export function PartyHighlights({ ids }: { ids: number[] }) {
  const { data } = useSuspenseQuery(partyQueryOptions(ids));
  const members = data.members.filter((m) => !m.error);
  if (members.length === 0) return null;

  const skillNames = Object.keys(SKILL_ABILITY);
  const bestBySkill = skillNames
    .map((name) => {
      let maxMod = -Infinity;
      let bestMembers: PartyMember[] = [];
      for (const m of members) {
        const s = m.skills.find((k) => k.name === name);
        if (!s) continue;
        if (s.modifier > maxMod) {
          maxMod = s.modifier;
          bestMembers = [m];
        } else if (s.modifier === maxMod) {
          bestMembers.push(m);
        }
      }
      return bestMembers.length > 0 ? { name, members: bestMembers, mod: maxMod } : null;
    })
    .filter((x): x is { name: string; members: PartyMember[]; mod: number } => !!x);

  // Find highest passive values
  const passiveHighlights = [
    { name: "Passive Perception", key: "passivePerception" },
    { name: "Passive Investigation", key: "passiveInvestigation" },
    { name: "Passive Insight", key: "passiveInsight" },
  ]
    .map((p) => {
      let maxVal = -Infinity;
      let bestMembers: PartyMember[] = [];
      for (const m of members) {
        const val = m[p.key as keyof PartyMember] as number;
        if (typeof val === "number") {
          if (val > maxVal) {
            maxVal = val;
            bestMembers = [m];
          } else if (val === maxVal) {
            bestMembers.push(m);
          }
        }
      }
      return bestMembers.length > 0
        ? { name: p.name, key: p.key, members: bestMembers, val: maxVal }
        : null;
    })
    .filter((x): x is { name: string; key: string; members: PartyMember[]; val: number } => !!x);

  // Find combat and wealth highlights
  let maxAc = -Infinity;
  let bestAcMembers: PartyMember[] = [];
  let maxInit = -Infinity;
  let bestInitMembers: PartyMember[] = [];
  let maxDc = -Infinity;
  let bestDcMembers: PartyMember[] = [];
  let totalGold = 0;

  for (const m of members) {
    const mods = getFullyModifiedStats(m);
    if (mods.ac > maxAc) {
      maxAc = mods.ac;
      bestAcMembers = [m];
    } else if (mods.ac === maxAc) {
      bestAcMembers.push(m);
    }

    if (m.initiative > maxInit) {
      maxInit = m.initiative;
      bestInitMembers = [m];
    } else if (m.initiative === maxInit) {
      bestInitMembers.push(m);
    }

    for (const sc of m.spellcasting ?? []) {
      if (sc.saveDc > maxDc) {
        maxDc = sc.saveDc;
        bestDcMembers = [m];
      } else if (sc.saveDc === maxDc) {
        if (!bestDcMembers.some((bm) => bm.id === m.id)) {
          bestDcMembers.push(m);
        }
      }
    }

    if (m.currencies) {
      totalGold +=
        (m.currencies.gp ?? 0) +
        (m.currencies.pp ?? 0) * 10 +
        (m.currencies.ep ?? 0) * 0.5 +
        (m.currencies.sp ?? 0) * 0.1 +
        (m.currencies.cp ?? 0) * 0.01;
    }
  }
  totalGold = Math.round(totalGold * 10) / 10;

  const bestAc = bestAcMembers.length > 0 ? { val: maxAc, members: bestAcMembers } : null;
  const bestInit = bestInitMembers.length > 0 ? { val: maxInit, members: bestInitMembers } : null;
  const bestDc = bestDcMembers.length > 0 ? { val: maxDc, members: bestDcMembers } : null;

  // Find Highest Core Ability Scores
  const abilityNames = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
  const bestByAbility = abilityNames.map((name) => {
    let maxVal = -Infinity;
    let bestMembers: PartyMember[] = [];
    for (const m of members) {
      const a = m.abilities.find((ab) => ab.name === name);
      if (!a) continue;
      if (a.score > maxVal) {
        maxVal = a.score;
        bestMembers = [m];
      } else if (a.score === maxVal) {
        bestMembers.push(m);
      }
    }
    return { name, members: bestMembers, score: maxVal };
  });

  // Find Highest Max HP
  let maxHp = -Infinity;
  let bestHpMembers: PartyMember[] = [];
  for (const m of members) {
    if (m.hpMax > maxHp) {
      maxHp = m.hpMax;
      bestHpMembers = [m];
    } else if (m.hpMax === maxHp) {
      bestHpMembers.push(m);
    }
  }
  const bestHp = bestHpMembers.length > 0 ? { val: maxHp, members: bestHpMembers } : null;

  return (
    <details className="group card-arcane card-arcane-hover mb-6 rounded-xl border border-border p-5 shadow-xl">
      <summary className="flex cursor-pointer list-none items-center justify-between text-[13px] font-bold uppercase tracking-widest text-accent/90 hover:text-accent select-none text-glow-accent">
        <span className="flex items-center gap-2.5">
          <Sparkles size={15} className="text-accent animate-pulse" />
          <span>Party Highlights</span>
        </span>
        <ChevronDown
          size={15}
          className="transition-transform duration-300 group-open:rotate-180 text-accent/80 group-hover:text-accent"
        />
      </summary>

      <div className="mt-5 space-y-6">
        {/* Passive Senses Highlights */}
        <div>
          <div className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">
            Passive Senses
          </div>
          <div className="flex flex-wrap justify-center gap-3.5 text-center text-xs">
            {passiveHighlights.map(({ name, key, members: bestM, val }) => {
              const Icon =
                key === "passivePerception" ? Eye : key === "passiveInvestigation" ? Search : Brain;
              return (
                <div
                  key={name}
                  className="relative overflow-hidden rounded-lg border border-accent/20 bg-accent/5 p-3 transition-all duration-300 hover:border-accent/40 hover:-translate-y-0.5 hover:shadow-md hover:shadow-accent/5 w-[calc(50%-7px)] sm:w-[calc(33.333%-10px)] max-w-[240px] min-w-[140px] flex-grow flex-shrink-0 flex flex-col items-center justify-center text-center"
                >
                  {/* Neon Glow Circle */}
                  <div className="absolute -right-3 -top-3 h-10 w-10 rounded-full bg-accent/8 blur-xl pointer-events-none" />
                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <Icon size={11} className="text-accent/80" />
                    <span>{name}</span>
                  </div>
                  <div className="font-heading text-2xl font-extrabold text-foreground leading-tight drop-shadow-sm mt-1.5">
                    {val}
                  </div>
                  <div
                    className="text-[11px] text-accent mt-1.5 font-semibold break-words leading-tight"
                    title={bestM.map((m) => m.name).join(", ")}
                  >
                    {bestM.map((m) => getShortName(m.name)).join(", ")}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Combat & Wealth Highlights */}
        <div>
          <div className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">
            Combat & Assets
          </div>
          <div className="flex flex-wrap justify-center gap-3.5 text-center text-xs">
            {/* AC */}
            {bestAc && (
              <div className="group/ac relative overflow-hidden rounded-lg border border-blue-500/25 bg-blue-500/5 p-3 transition-all duration-300 hover:border-blue-500/55 hover:-translate-y-0.5 hover:shadow-md hover:shadow-blue-500/10 w-[calc(50%-7px)] sm:w-[calc(33.333%-10px)] md:w-[calc(20%-11.2px)] max-w-[240px] min-w-[140px] flex-grow flex-shrink-0 flex flex-col items-center justify-center text-center">
                <div className="absolute -right-3 -top-3 h-10 w-10 rounded-full bg-blue-500/12 blur-xl pointer-events-none" />
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none">
                  <Shield
                    size={11}
                    className="text-blue-400 transition-all duration-300 group-hover/ac:scale-120 group-hover/ac:rotate-12"
                  />
                  <span>Highest AC</span>
                </div>
                <div className="font-heading text-2xl font-extrabold text-foreground leading-tight drop-shadow-sm mt-1.5">
                  {bestAc.val}
                </div>
                <div
                  className="text-[11px] text-accent mt-1.5 font-semibold break-words leading-tight"
                  title={bestAc.members.map((m) => m.name).join(", ")}
                >
                  {bestAc.members.map((m) => getShortName(m.name)).join(", ")}
                </div>
              </div>
            )}

            {/* Initiative */}
            {bestInit && (
              <div className="group/init relative overflow-hidden rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 transition-all duration-300 hover:border-amber-500/55 hover:-translate-y-0.5 hover:shadow-md hover:shadow-amber-500/10 w-[calc(50%-7px)] sm:w-[calc(33.333%-10px)] md:w-[calc(20%-11.2px)] max-w-[240px] min-w-[140px] flex-grow flex-shrink-0 flex flex-col items-center justify-center text-center">
                <div className="absolute -right-3 -top-3 h-10 w-10 rounded-full bg-amber-500/12 blur-xl pointer-events-none" />
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none">
                  <Zap
                    size={11}
                    className="text-amber-400 transition-all duration-300 group-hover/init:scale-120 group-hover/init:-rotate-12"
                  />
                  <span>Highest Initiative</span>
                </div>
                <div className="font-heading text-2xl font-extrabold text-foreground leading-tight drop-shadow-sm mt-1.5">
                  {bestInit.val >= 0 ? `+${bestInit.val}` : bestInit.val}
                </div>
                <div
                  className="text-[11px] text-accent mt-1.5 font-semibold break-words leading-tight"
                  title={bestInit.members.map((m) => m.name).join(", ")}
                >
                  {bestInit.members.map((m) => getShortName(m.name)).join(", ")}
                </div>
              </div>
            )}

            {/* Spell DC */}
            {bestDc && (
              <div className="group/dc relative overflow-hidden rounded-lg border border-purple-500/25 bg-purple-500/5 p-3 transition-all duration-300 hover:border-purple-500/55 hover:-translate-y-0.5 hover:shadow-md hover:shadow-purple-500/10 w-[calc(50%-7px)] sm:w-[calc(33.333%-10px)] md:w-[calc(20%-11.2px)] max-w-[240px] min-w-[140px] flex-grow flex-shrink-0 flex flex-col items-center justify-center text-center">
                <div className="absolute -right-3 -top-3 h-10 w-10 rounded-full bg-purple-500/12 blur-xl pointer-events-none" />
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none">
                  <Sparkles
                    size={11}
                    className="text-purple-400 transition-all duration-300 group-hover/dc:scale-120 group-hover/dc:animate-pulse"
                  />
                  <span>Highest Spell DC</span>
                </div>
                <div className="font-heading text-2xl font-extrabold text-foreground leading-tight drop-shadow-sm mt-1.5">
                  {bestDc.val}
                </div>
                <div
                  className="text-[11px] text-accent mt-1.5 font-semibold break-words leading-tight"
                  title={bestDc.members.map((m) => m.name).join(", ")}
                >
                  {bestDc.members.map((m) => getShortName(m.name)).join(", ")}
                </div>
              </div>
            )}

            {/* Max HP */}
            {bestHp && (
              <div className="group/hp relative overflow-hidden rounded-lg border border-rose-500/25 bg-rose-500/5 p-3 transition-all duration-300 hover:border-rose-500/55 hover:-translate-y-0.5 hover:shadow-md hover:shadow-rose-500/10 w-[calc(50%-7px)] sm:w-[calc(33.333%-10px)] md:w-[calc(20%-11.2px)] max-w-[240px] min-w-[140px] flex-grow flex-shrink-0 flex flex-col items-center justify-center text-center">
                <div className="absolute -right-3 -top-3 h-10 w-10 rounded-full bg-rose-500/12 blur-xl pointer-events-none" />
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none">
                  <Heart
                    size={11}
                    className="text-rose-400 transition-transform duration-300 group-hover/hp:animate-heartbeat"
                  />
                  <span>Highest Max HP</span>
                </div>
                <div className="font-heading text-2xl font-extrabold text-foreground leading-tight drop-shadow-sm mt-1.5">
                  {bestHp.val}
                </div>
                <div
                  className="text-[11px] text-accent mt-1.5 font-semibold break-words leading-tight"
                  title={bestHp.members.map((m) => m.name).join(", ")}
                >
                  {bestHp.members.map((m) => getShortName(m.name)).join(", ")}
                </div>
              </div>
            )}

            {/* Total Wealth */}
            <div className="group/wealth relative overflow-hidden rounded-lg border border-gold/25 bg-gold/5 p-3 transition-all duration-300 hover:border-gold/55 hover:-translate-y-0.5 hover:shadow-md hover:shadow-gold/10 w-[calc(50%-7px)] sm:w-[calc(33.333%-10px)] md:w-[calc(20%-11.2px)] max-w-[240px] min-w-[140px] flex-grow flex-shrink-0 flex flex-col items-center justify-center text-center">
              <div className="absolute -right-3 -top-3 h-10 w-10 rounded-full bg-gold/12 blur-xl pointer-events-none" />
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none">
                <Coins
                  size={11}
                  className="text-gold/90 transition-transform duration-300 group-hover/wealth:animate-jingle"
                />
                <span>Total Wealth</span>
              </div>
              <div className="font-heading text-xl font-extrabold text-gold leading-tight drop-shadow-sm mt-1.5">
                {totalGold.toLocaleString()} gp
              </div>
            </div>
          </div>
        </div>

        {/* Ability Highlights Section */}
        <div>
          <div className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">
            Highest Core Ability Scores
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3 md:grid-cols-6">
            {bestByAbility.map(({ name, members: bestM, score }) => {
              const details =
                name === "STR"
                  ? {
                      icon: Dumbbell,
                      colorClass: "text-rose-400 bg-rose-500/10",
                      borderClass: "border-border/30 hover:border-rose-500/40 hover:bg-rose-500/5",
                      glowClass: "bg-rose-500/5",
                    }
                  : name === "DEX"
                    ? {
                        icon: Zap,
                        colorClass: "text-emerald-400 bg-emerald-500/10",
                        borderClass:
                          "border-border/30 hover:border-emerald-500/40 hover:bg-emerald-500/5",
                        glowClass: "bg-emerald-500/5",
                      }
                    : name === "CON"
                      ? {
                          icon: Heart,
                          colorClass: "text-amber-500 bg-amber-500/10",
                          borderClass:
                            "border-border/30 hover:border-amber-500/40 hover:bg-amber-500/5",
                          glowClass: "bg-amber-500/5",
                        }
                      : name === "INT"
                        ? {
                            icon: BookOpen,
                            colorClass: "text-sky-400 bg-sky-500/10",
                            borderClass:
                              "border-border/30 hover:border-sky-500/40 hover:bg-sky-500/5",
                            glowClass: "bg-sky-500/5",
                          }
                        : name === "WIS"
                          ? {
                              icon: Compass,
                              colorClass: "text-teal-400 bg-teal-500/10",
                              borderClass:
                                "border-border/30 hover:border-teal-500/40 hover:bg-teal-500/5",
                              glowClass: "bg-teal-500/5",
                            }
                          : {
                              icon: Crown,
                              colorClass: "text-gold bg-gold/10",
                              borderClass: "border-border/30 hover:border-gold/55 hover:bg-gold/5",
                              glowClass: "bg-gold/8",
                            };
              const Icon = details.icon;
              const fullName = ABILITY_FULL_NAME[name] || name;
              return (
                <div
                  key={name}
                  className={`group relative overflow-hidden rounded-lg border bg-secondary/15 p-3 transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-between gap-3 min-h-[76px] ${details.borderClass}`}
                >
                  {/* Subtle layout glow */}
                  <div
                    className={`absolute -right-3 -bottom-3 h-10 w-10 rounded-full blur-lg pointer-events-none ${details.glowClass}`}
                  />
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded ${details.colorClass}`}
                    >
                      <Icon
                        size={15}
                        className="transition-transform duration-300 group-hover:scale-120 group-hover:rotate-6"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                        {fullName}
                      </div>
                      <div
                        className="text-xs font-bold text-accent mt-1.5 break-words leading-tight"
                        title={bestM.map((m) => m.name).join(", ")}
                      >
                        {bestM.map((m) => getShortName(m.name)).join(", ")}
                      </div>
                    </div>
                  </div>
                  <div className="font-heading text-xl font-extrabold text-gold leading-tight drop-shadow-sm shrink-0 pl-1">
                    {score}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Skill Highlights Section */}
        <div>
          <div className="mb-2.5 border-t border-border/20 pt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">
            Best at Each Skill
          </div>

          {/* Skill Highlights Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 md:grid-cols-4">
            {bestBySkill.map(({ name, members: bestM, mod }) => (
              <div
                key={name}
                className="flex items-center justify-between rounded-lg border border-border/30 bg-secondary/10 px-3 py-2 transition-all duration-200 hover:border-accent/40 hover:bg-secondary/35"
              >
                <div className="min-w-0 pr-1">
                  <div className="truncate text-xs font-semibold text-foreground">{name}</div>
                  <div
                    className="text-[10px] text-muted-foreground break-words leading-tight mt-1"
                    title={bestM.map((m) => m.name).join(", ")}
                  >
                    {bestM.map((m) => getShortName(m.name)).join(", ")}
                  </div>
                </div>
                <span className="font-mono text-accent font-semibold text-xs shrink-0">
                  {mod >= 0 ? `+${mod}` : mod}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </details>
  );
}
