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
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PartyMember, PreparedSpell, SpellSlotLevel } from "@/lib/dndbeyond.functions";
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

const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

function Panel({
  title,
  icon: Icon,
  children,
  className = "",
}: {
  title?: React.ReactNode;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`card-arcane rounded-xl border border-border/40 p-4 shadow-lg ${className}`}
    >
      {title && (
        <div className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-accent/90">
          {Icon && <Icon size={12} className="text-accent" />}
          <span>{title}</span>
        </div>
      )}
      {children}
    </section>
  );
}

export function CharacterDetailView({ member }: { member: PartyMember }) {
  const [activeLayout, setActiveLayout] = useState<"classic" | "sticky" | "tabbed" | "widescreen">(
    "classic",
  );
  const [activeTab, setActiveTab] = useState<"combat" | "spells" | "skills" | "gear" | "feats">(
    "combat",
  );

  const {
    list: localConditions,
    add: addLocalCondition,
    remove: removeLocalCondition,
    tick: tickLocalCondition,
  } = useCharacterConditions(member.id);

  const { ac, speed, acNotes, speedNotes } = getModifiedStats(member, localConditions);

  const hpPct = member.hpMax > 0 ? Math.min(100, (member.hpCurrent / member.hpMax) * 100) : 0;
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

  const prevHpRef = useRef<number>(member.hpCurrent);
  const [delta, setDelta] = useState<{ value: number; key: number } | null>(null);
  useEffect(() => {
    const prev = prevHpRef.current;
    if (prev !== member.hpCurrent) {
      const diff = member.hpCurrent - prev;
      if (diff !== 0) setDelta({ value: diff, key: Date.now() });
      prevHpRef.current = member.hpCurrent;
    }
  }, [member.hpCurrent]);

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

  // === HERO ===
  const hero = (
    <section className="card-arcane relative overflow-hidden rounded-xl border border-border/40 p-5 shadow-lg">
      <div className="flex flex-col items-start gap-5 md:flex-row">
        {member.avatarUrl ? (
          <a
            href={member.readonlyUrl}
            target="_blank"
            rel="noreferrer"
            className="block h-32 w-32 flex-shrink-0 overflow-hidden rounded-lg border border-border shadow-lg transition-all duration-200 hover:border-accent hover:shadow-[0_0_18px_color-mix(in_oklab,var(--accent)_45%,transparent)]"
          >
            <img
              src={member.avatarUrl}
              alt={member.name}
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-110"
            />
          </a>
        ) : (
          <div className="h-32 w-32 flex-shrink-0 rounded-lg border border-border bg-muted" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <a
              href={member.readonlyUrl}
              target="_blank"
              rel="noreferrer"
              className="font-heading text-3xl font-bold text-foreground drop-shadow-sm hover:text-accent hover:underline"
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
          </div>
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
  const vitals = (
    <Panel>
      <div className="grid gap-4 md:grid-cols-[1.6fr_1fr]">
        {/* HP block */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span className="flex items-center gap-1.5 font-medium text-muted-foreground select-none">
              <Heart
                size={14}
                className="text-rose-500 drop-shadow-[0_0_4px_rgba(244,63,94,0.5)]"
              />
              <span>Hit Points</span>
              {member.hitDice && member.hitDice !== "—" && (
                <span className="ml-1 font-mono text-[10px] text-muted-foreground/75">
                  ({member.hitDice})
                </span>
              )}
            </span>
            <span className="relative font-mono text-lg font-bold text-foreground">
              {member.hpCurrent} / {member.hpMax}
              {member.tempHp > 0 ? (
                <span className="ml-1 text-accent">+{member.tempHp}</span>
              ) : null}
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

          {member.hpCurrent <= 0 && (
            <div className="mt-3 rounded border border-destructive/60 bg-destructive/10 px-2 py-2">
              <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider">
                <span className="text-destructive">
                  {member.deathSaves.stabilized ? "Stabilized" : "Death Saves"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">Success</span>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={`s-${i}`}
                      className={`h-3 w-3 rotate-45 border ${
                        i < member.deathSaves.successes
                          ? "border-hp-good bg-hp-good shadow-[0_0_6px_color-mix(in_oklab,var(--hp-good)_70%,transparent)]"
                          : "border-border bg-transparent"
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">Fail</span>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={`f-${i}`}
                      className={`h-3 w-3 rotate-45 border ${
                        i < member.deathSaves.failures
                          ? "border-destructive bg-destructive shadow-[0_0_6px_color-mix(in_oklab,var(--destructive)_70%,transparent)]"
                          : "border-border bg-transparent"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Core stats */}
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <Stat
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
          <Stat
            label="Initiative"
            icon={Zap}
            iconClassName="text-primary/90 drop-shadow-[0_0_3px_color-mix(in_oklab,var(--primary)_45%,transparent)]"
            value={fmt(member.initiative)}
          />
          <Stat
            label="Speed"
            icon={Flame}
            iconClassName="text-primary/90 drop-shadow-[0_0_3px_color-mix(in_oklab,var(--primary)_45%,transparent)]"
            value={
              speed !== member.speed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help font-bold text-accent">{speed}ft</span>
                  </TooltipTrigger>
                  <TooltipContent>{speedNotes.join(", ")}</TooltipContent>
                </Tooltip>
              ) : (
                `${speed}ft`
              )
            }
          />
          <Stat label="Prof" value={fmt(member.proficiencyBonus)} />
        </div>
      </div>
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
          return (
            <div
              key={s.ability}
              className={`group rounded-lg border px-1 py-1.5 text-center transition-all duration-200 hover:scale-105 ${
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
              <div className="mt-0.5 font-mono text-sm font-bold text-foreground">
                {fmt(s.modifier)}
              </div>
            </div>
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

          return (
            <div
              key={s.key}
              className={`group/skill flex items-center justify-between rounded px-1 -mx-1 py-0.5 transition-colors hover:bg-secondary/15 ${
                isProf ? "" : "opacity-60"
              }`}
            >
              <span className={`flex min-w-0 items-center gap-1.5 truncate ${nameColor}`}>
                {Icon && <Icon size={9} className={`shrink-0 ${iconColor}`} />}
                <span className="truncate">{s.name}</span>
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
        })}
      </div>
    </Panel>
  );

  // === SENSES ===
  const senses = (member.senses.length > 0 || member.passivePerception != null) && (
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
        {member.senses.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {member.senses.map((s) => {
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
  const defenses = member.defenses.length > 0 && (
    <Panel title="Defenses" icon={Shield}>
      <div className="flex flex-wrap gap-1">
        {member.defenses.map((d) => {
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

  // === LANGUAGES & TOOLS ===
  const proficiencies = (member.languages.length > 0 || member.tools.length > 0) && (
    <Panel title="Languages & Tools" icon={BookOpen}>
      <div className="flex flex-col gap-2">
        {member.languages.length > 0 && (
          <div>
            <span className="mr-2 text-[10px] font-semibold uppercase text-muted-foreground">
              Languages
            </span>
            <span className="text-sm text-foreground">{member.languages.join(", ")}</span>
          </div>
        )}
        {member.tools.length > 0 && (
          <div>
            <span className="mr-2 text-[10px] font-semibold uppercase text-muted-foreground">
              Tools
            </span>
            <span className="text-sm text-foreground">{member.tools.join(", ")}</span>
          </div>
        )}
      </div>
    </Panel>
  );

  // === ATTACKS ===
  const attacks = member.attacks.length > 0 && (
    <Panel title="Attacks & Actions" icon={Swords}>
      <div className="flex flex-col gap-1.5">
        {member.attacks.map((atk, idx) => (
          <div
            key={`${atk.name}-${idx}`}
            className="flex items-center justify-between rounded border border-border bg-secondary/40 px-2 py-1.5 text-xs transition-colors hover:border-accent/40 hover:bg-secondary/60"
          >
            <div className="flex flex-col">
              <span className="font-semibold text-foreground">{atk.name}</span>
              {atk.properties && atk.properties.length > 0 && (
                <span className="mt-0.5 text-[9px] text-muted-foreground">
                  {atk.properties.join(", ")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="font-semibold text-accent">
                {atk.attackBonus >= 0 ? `+${atk.attackBonus}` : atk.attackBonus}
              </span>
              <span className="text-[10px] text-muted-foreground">to hit</span>
              <span className="font-semibold text-foreground">{atk.damage}</span>
              <span className="text-[10px] text-muted-foreground">{atk.damageType}</span>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );

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
        {(member.spellSlots.length > 0 || member.pactSlots.length > 0) && (
          <div className="flex flex-col gap-1.5 border-t border-border/30 pt-2">
            {member.spellSlots.map((s) => {
              const available = s.max - s.used;
              return (
                <div key={`s-${s.level}`} className="flex items-center gap-2">
                  <span className="min-w-[3rem] font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Level {s.level}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex cursor-help flex-wrap gap-1">
                        {Array.from({ length: s.max }).map((_, i) => {
                          const filled = i < available;
                          return (
                            <span
                              key={i}
                              className={
                                filled
                                  ? "h-3 w-3 rounded-full bg-primary shadow-[0_0_6px_color-mix(in_oklab,var(--primary)_70%,transparent)] ring-1 ring-primary/60"
                                  : "h-3 w-3 rounded-full border border-accent/70 bg-transparent shadow-[0_0_5px_color-mix(in_oklab,var(--accent)_50%,transparent)]"
                              }
                            />
                          );
                        })}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      Level {s.level}: {available}/{s.max} remaining
                    </TooltipContent>
                  </Tooltip>
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                    {available}/{s.max}
                  </span>
                </div>
              );
            })}
            {member.pactSlots.map((s) => {
              const available = s.max - s.used;
              return (
                <div key={`p-${s.level}`} className="flex items-center gap-2">
                  <span className="min-w-[3rem] font-mono text-[10px] font-semibold uppercase tracking-wider text-accent">
                    Pact {s.level}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {Array.from({ length: s.max }).map((_, i) => {
                      const filled = i < available;
                      return (
                        <span
                          key={i}
                          className={
                            filled
                              ? "h-3 w-3 rotate-45 bg-primary shadow-[0_0_6px_color-mix(in_oklab,var(--primary)_70%,transparent)] ring-1 ring-accent/70"
                              : "h-3 w-3 rotate-45 border border-accent/70 bg-transparent shadow-[0_0_5px_color-mix(in_oklab,var(--accent)_50%,transparent)]"
                          }
                        />
                      );
                    })}
                  </div>
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">
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

  const renderSlotsInline = (s: SpellSlotLevel, isPact = false) => {
    const available = s.max - s.used;
    return (
      <div className="flex items-center gap-1.5 select-none">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex cursor-help flex-wrap gap-1">
              {Array.from({ length: s.max }).map((_, i) => {
                const filled = i < available;
                if (isPact) {
                  return (
                    <span
                      key={i}
                      className={
                        filled
                          ? "h-2.5 w-2.5 rotate-45 bg-primary shadow-[0_0_5px_color-mix(in_oklab,var(--primary)_70%,transparent)] ring-1 ring-accent/70"
                          : "h-2.5 w-2.5 rotate-45 border border-accent/70 bg-transparent shadow-[0_0_4px_color-mix(in_oklab,var(--accent)_50%,transparent)]"
                      }
                    />
                  );
                } else {
                  return (
                    <span
                      key={i}
                      className={
                        filled
                          ? "h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_5px_color-mix(in_oklab,var(--primary)_70%,transparent)] ring-1 ring-primary/60"
                          : "h-2.5 w-2.5 rounded-full border border-accent/70 bg-transparent shadow-[0_0_4px_color-mix(in_oklab,var(--accent)_45%,transparent)]"
                      }
                    />
                  );
                }
              })}
            </div>
          </TooltipTrigger>
          <TooltipContent className="text-xs">
            {isPact ? "Pact" : "Level"} {s.level} Slots: {available} / {s.max} remaining
          </TooltipContent>
        </Tooltip>
        <span className="font-mono text-[9px] text-muted-foreground">
          ({available}/{s.max})
        </span>
      </div>
    );
  };

  const expandedSpellbook = (member.cantrips.length > 0 || member.preparedSpells.length > 0) && (
    <Panel title="Spellbook" icon={Sparkles}>
      <div className="flex flex-col gap-4">
        {/* Cantrips Section */}
        {member.cantrips.length > 0 && (
          <div className="rounded-lg border border-border/30 bg-secondary/10 p-3">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-accent select-none">
              Cantrips
            </h4>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {member.cantrips.map((c) => (
                <Tooltip key={c.name}>
                  <TooltipTrigger asChild>
                    <div className="cursor-help flex items-center gap-2 rounded-md border border-accent/20 bg-accent/5 px-2.5 py-1.5 text-xs text-foreground transition-all duration-200 hover:border-accent/40 hover:bg-accent/10">
                      <Sparkles size={10} className="text-accent shrink-0" />
                      <span>{c.name}</span>
                    </div>
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

        {/* Leveled Spells grouped by Level */}
        {levels.map((lvl) => {
          const list = spellsByLevel[lvl];
          const suffix = lvl === 1 ? "st" : lvl === 2 ? "nd" : lvl === 3 ? "rd" : "th";
          const slot = member.spellSlots.find((s) => s.level === lvl);
          const pact = member.pactSlots.find((s) => s.level === lvl);
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
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {list.map((spell) => (
                  <Tooltip key={spell.name}>
                    <TooltipTrigger asChild>
                      <div className="cursor-help flex items-center gap-2 rounded-md border border-border/50 bg-secondary/45 px-2.5 py-1.5 text-xs text-foreground transition-all duration-200 hover:border-accent/30 hover:bg-secondary/60">
                        <BookOpen size={10} className="text-muted-foreground shrink-0" />
                        <span>{spell.name}</span>
                      </div>
                    </TooltipTrigger>
                    {spell.description && (
                      <TooltipContent className="max-w-[280px] text-xs">
                        {spell.description.replace(/<[^>]*>/g, "")}
                      </TooltipContent>
                    )}
                  </Tooltip>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );

  // === RESOURCES ===
  const resourceActions = member.actions?.filter((a) => a.source === "class" && a.uses) ?? [];
  const resourcesPanel = resourceActions.length > 0 && (
    <Panel title="Class Resources" icon={Zap}>
      <div className="flex flex-col gap-2">
        {resourceActions.map((a) => {
          const u = a.uses!;
          const out = u.current <= 0;
          const ratio = u.max > 0 ? u.current / u.max : 0;
          const isSmallMax = u.max <= 6;
          return (
            <div
              key={`${a.source}-${a.name}`}
              className="flex flex-col gap-1.5 rounded-lg border border-border/30 bg-secondary/20 p-2.5"
              title={`Resets on ${u.reset}`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span>{a.name}</span>
                <span
                  className={`font-mono text-[10px] ${out ? "text-destructive" : "text-accent"}`}
                >
                  {u.current} / {u.max}
                </span>
              </div>
              {isSmallMax ? (
                <div className="mt-0.5 flex gap-1">
                  {Array.from({ length: u.max }).map((_, i) => {
                    const active = i < u.current;
                    return (
                      <span
                        key={i}
                        className={`h-2 w-2 rounded-full ${
                          active
                            ? "bg-accent shadow-[0_0_5px_color-mix(in_oklab,var(--accent)_60%,transparent)]"
                            : "border border-accent/40 bg-transparent"
                        }`}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-accent shadow-[0_0_5px_color-mix(in_oklab,var(--accent)_60%,transparent)]"
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
              )}
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
        carryingCapacity={member.carryingCapacity}
      />
    </Panel>
  );

  // === FEATS ===
  const featsPanel = member.feats && member.feats.length > 0 && (
    <Panel title="Feats" icon={Award}>
      <div className="flex flex-wrap gap-1.5">
        {member.feats.map((f) => (
          <Tooltip key={f.name}>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help select-none items-center gap-1.5 rounded-full border border-border/30 bg-secondary/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground/90 transition-all duration-200 hover:scale-105 hover:border-accent/40 hover:bg-secondary/35">
                <Award size={10} className="shrink-0 text-accent/80" />
                <span>
                  {f.name}
                  {f.choices && f.choices.length > 0 ? ` (${f.choices.join(", ")})` : ""}
                </span>
              </span>
            </TooltipTrigger>
            {f.description && (
              <TooltipContent className="max-w-[280px] text-xs">
                {f.description.replace(/<[^>]*>/g, "")}
              </TooltipContent>
            )}
          </Tooltip>
        ))}
      </div>
    </Panel>
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
            { id: "classic", label: "Classic", icon: LayoutGrid },
            { id: "sticky", label: "Sticky Sidebar", icon: Columns2 },
            { id: "tabbed", label: "Tabbed", icon: Layers },
            { id: "widescreen", label: "Widescreen", icon: Columns3 },
          ] as const
        ).map((opt) => {
          const ActiveIcon = opt.icon;
          const isActive = activeLayout === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setActiveLayout(opt.id)}
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
  const tabNavigation = activeLayout === "tabbed" && (
    <div className="flex flex-wrap gap-1 border-b border-border/30 pb-2">
      {(
        [
          { id: "combat", label: "Combat & Actions", icon: Swords },
          { id: "spells", label: "Spellbook", icon: Sparkles },
          { id: "skills", label: "Skills & Stats", icon: BookOpen },
          { id: "gear", label: "Inventory", icon: Package },
          { id: "feats", label: "Feats", icon: Award },
        ] as const
      ).map((tab) => {
        const TabIcon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-all duration-150 cursor-pointer ${
              isActive
                ? "border-accent text-accent font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <TabIcon size={12} className={isActive ? "text-accent" : "text-muted-foreground"} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
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
          {spellcastingPanel}
          {spellLists}
          {resourcesPanel}
          {inventoryPanel}
          {featsPanel}
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
          {spellcastingPanel}
          {spellLists}
          {resourcesPanel}
          {skills}
          {inventoryPanel}
          {featsPanel}
          {proficiencies}
        </div>
      </div>
    );
  } else if (activeLayout === "widescreen") {
    content = (
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1.3fr_1.1fr]">
        {/* COLUMN 1: CORE STATS & SAVES */}
        <div className="flex flex-col gap-4">
          {abilityScores}
          {savingThrows}
          {senses}
          {defenses}
          {proficiencies}
        </div>
        {/* COLUMN 2: COMBAT & SPELLS */}
        <div className="flex flex-col gap-4">
          {attacks}
          {spellcastingPanel}
          {spellLists}
          {resourcesPanel}
        </div>
        {/* COLUMN 3: SKILLS, INVENTORY, FEATS */}
        <div className="flex flex-col gap-4">
          {skills}
          {inventoryPanel}
          {featsPanel}
        </div>
      </div>
    );
  } else if (activeLayout === "tabbed") {
    content = (
      <div className="flex flex-col gap-4">
        {tabNavigation}
        <div className="min-h-[300px]">
          {activeTab === "combat" && (
            <div className="flex flex-col gap-4">
              {attacks}
              {resourcesPanel}
            </div>
          )}
          {activeTab === "spells" && (
            <div className="flex flex-col gap-4">
              {spellcastingPanel && expandedSpellbook ? (
                <div className="grid gap-4 lg:grid-cols-[1.2fr_2.8fr]">
                  <div className="flex flex-col gap-4">{spellcastingPanel}</div>
                  <div>{expandedSpellbook}</div>
                </div>
              ) : spellcastingPanel ? (
                <div>{spellcastingPanel}</div>
              ) : expandedSpellbook ? (
                <div>{expandedSpellbook}</div>
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
          {activeTab === "gear" && (
            <div>
              {inventoryPanel || (
                <Panel>
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No items in inventory.
                  </p>
                </Panel>
              )}
            </div>
          )}
          {activeTab === "feats" && (
            <div>
              {featsPanel || (
                <Panel>
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No feats trained.
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
    <div className="flex flex-col gap-4">
      {hero}
      {vitals}
      {layoutSwitcher}
      {content}
    </div>
  );
}
