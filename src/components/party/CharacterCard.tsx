/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useRef } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Heart,
  Star,
  Lock,
  Shield,
  Zap,
  Flame,
  Sparkles,
  Eye,
  Search,
  Brain,
  Moon,
  Award,
  Swords,
  ChevronDown,
} from "lucide-react";
import { PartyMember } from "@/lib/dndbeyond.types";
import { SKILL_ABILITY } from "@/lib/constants";
import { Link } from "@tanstack/react-router";
import { getFullyModifiedStats } from "@/lib/party-modifiers";

// Modular sub-file imports and compatibility re-exports
import { ABILITY_DETAILS } from "./character-card/ability-details";
import { Section, Stat } from "./character-card/shared";
import { ConditionsPanel } from "./character-card/conditions";
import { type LocalCondition, useCharacterConditions } from "./character-card/condition-state";
import { getModifiedStats } from "./character-card/get-modified-stats";
import { InventoryList } from "./character-card/inventory-list";

export {
  ABILITY_DETAILS,
  Section,
  Stat,
  type LocalCondition,
  useCharacterConditions,
  ConditionsPanel,
  getModifiedStats,
  InventoryList,
};

export type CharacterCardControls = {
  canEdit: boolean;
  busy?: boolean;
  onDamage?: () => void;
  onHeal?: () => void;
  onOpenSheet?: () => void;
  sheetOpen?: boolean;
  onAddCondition?: (name: string) => void;
  onRemoveCondition?: (name: string) => void;
  onSpendResource?: (name: string) => void;
  onToggleInspiration?: () => void;
  onAdjustExhaustion?: (delta: -1 | 1) => void;
  onGrantTemporaryHp?: () => void;
  onDeathSave?: (result: "success" | "failure") => void;
  onStabilize?: () => void;
  onLongRest?: () => void;
};

export function CharacterCard({
  member,
  controls,
}: {
  member: PartyMember;
  controls?: CharacterCardControls;
}) {
  const {
    list: localConditions,
    add: addLocalCondition,
    remove: removeLocalCondition,
    tick: tickLocalCondition,
  } = useCharacterConditions(member.id);

  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsExpanded(false);
    }
  }, []);

  const mods = getFullyModifiedStats(member);
  const {
    ac,
    speed,
    acNotes,
    speedNotes,
    hpCurrent,
    tempHp,
    spellSlots,
    pactSlots,
    actions,
    carryingCapacity,
    senses,
    deathSaves,
    hitDice,
    defenses,
  } = mods;

  const hpPct = mods.hpMax > 0 ? Math.min(100, (hpCurrent / mods.hpMax) * 100) : 0;
  const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
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
  const hpColor = hpPct > 60 ? "bg-hp-good" : hpPct > 25 ? "bg-hp-wounded" : "bg-hp-critical";
  const hpGlow =
    hpPct > 60
      ? "shadow-[0_0_8px_color-mix(in_oklab,var(--hp-good)_70%,transparent)]"
      : hpPct > 25
        ? "shadow-[0_0_8px_color-mix(in_oklab,var(--hp-wounded)_70%,transparent)]"
        : "shadow-[0_0_10px_color-mix(in_oklab,var(--hp-critical)_80%,transparent)] animate-pulse";

  const [animHpPct, setAnimHpPct] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimHpPct(hpPct), 50);
    return () => clearTimeout(t);
  }, [hpPct]);

  // HP change indicator
  const prevHpRef = useRef<number>(hpCurrent);
  const [delta, setDelta] = useState<{ value: number; key: number } | null>(null);
  useEffect(() => {
    const prev = prevHpRef.current;
    if (prev !== hpCurrent) {
      const diff = hpCurrent - prev;
      if (diff !== 0) setDelta({ value: diff, key: Date.now() });
      prevHpRef.current = hpCurrent;
    }
  }, [hpCurrent]);

  // Split classes string "Wizard 5 / Cleric 2" into chips
  const classChips = member.classes
    .split(/\s*\/\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  const getAvatarRingClass = (pct: number) => {
    if (pct <= 25)
      return "ring-2 ring-hp-critical/80 shadow-[0_0_12px_color-mix(in_oklab,var(--color-hp-critical)_50%,transparent)]";
    if (pct <= 60)
      return "ring-2 ring-hp-wounded/60 shadow-[0_0_10px_color-mix(in_oklab,var(--color-hp-wounded)_35%,transparent)]";
    return "ring-2 ring-hp-good/50 shadow-[0_0_10px_color-mix(in_oklab,var(--color-hp-good)_30%,transparent)]";
  };
  const avatarRing = getAvatarRingClass(hpPct);

  return (
    <article className="card-arcane card-arcane-hover group relative overflow-hidden rounded-xl border border-border/40 p-4 shadow-lg">
      <div className="flex items-start gap-3">
        {controls && member.avatarUrl ? (
          <button
            type="button"
            onClick={controls.onOpenSheet}
            className={`block h-16 w-16 flex-shrink-0 overflow-hidden rounded-[28%] transition-all duration-300 hover:scale-105 ${avatarRing}`}
            title="Open character sheet"
          >
            <img
              src={member.avatarUrl}
              alt={member.name}
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-110"
            />
          </button>
        ) : member.avatarUrl ? (
          <Link
            to="/character/$id"
            params={{ id: String(member.id) }}
            className={`block h-16 w-16 flex-shrink-0 rounded-[28%] overflow-hidden transition-all duration-300 hover:scale-105 ${avatarRing}`}
            title="View character details"
          >
            <img
              src={member.avatarUrl}
              alt={member.name}
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-110"
            />
          </Link>
        ) : controls ? (
          <button
            type="button"
            onClick={controls.onOpenSheet}
            className={`h-16 w-16 flex-shrink-0 rounded-[28%] border border-border bg-muted hover:border-accent ${avatarRing}`}
            title="Open character sheet"
          />
        ) : (
          <Link
            to="/character/$id"
            params={{ id: String(member.id) }}
            className={`h-16 w-16 flex-shrink-0 rounded-[28%] border border-border bg-muted hover:border-accent ${avatarRing}`}
            title="View character details"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {controls ? (
              <button
                type="button"
                onClick={controls.onOpenSheet}
                className="font-heading block truncate text-left text-xl font-bold text-foreground drop-shadow-sm transition-colors hover:text-accent hover:underline"
              >
                {member.name}
              </button>
            ) : (
              <a
                href={member.readonlyUrl}
                target="_blank"
                rel="noreferrer"
                className="font-heading block truncate text-xl font-bold text-foreground drop-shadow-sm transition-colors group-hover:text-accent hover:underline"
              >
                {member.name}
              </a>
            )}
            {(mods.inspiration || controls?.canEdit) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    disabled={!controls?.canEdit || controls.busy}
                    onClick={controls?.onToggleInspiration}
                    className="shrink-0 disabled:cursor-default"
                  >
                    <Star
                      size={12}
                      className={
                        mods.inspiration
                          ? "fill-gold text-gold drop-shadow-[0_0_6px_color-mix(in_oklab,var(--gold)_80%,transparent)] animate-pulse"
                          : "text-muted-foreground/50 hover:text-gold"
                      }
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {controls?.canEdit
                    ? mods.inspiration
                      ? "Clear Inspiration"
                      : "Grant Inspiration"
                    : "Inspiration"}
                </TooltipContent>
              </Tooltip>
            )}
            {(member as any).isNative && (
              <span
                className="shrink-0 rounded border border-ui-emerald/40 bg-ui-emerald/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ui-emerald select-none"
                title="Built natively in Party Stats Hub"
              >
                Native
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-auto shrink-0 p-1 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer"
              aria-label={isExpanded ? "Collapse details" : "Expand details"}
            >
              <ChevronDown
                size={16}
                className={`transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
              />
            </button>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {member.race}
            {member.background ? (
              <span className="text-muted-foreground/70"> • {member.background}</span>
            ) : null}
            {member.alignment ? (
              <span className="text-muted-foreground/70"> • {member.alignment}</span>
            ) : null}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {classChips.map((c) => (
              <span
                key={c}
                className="rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent"
              >
                {c}
              </span>
            ))}
            {member.subclasses.map((sc) => (
              <span
                key={sc}
                className="rounded border border-border bg-secondary/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground"
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
            managed={
              controls
                ? {
                    canEdit: controls.canEdit,
                    onAdd: (name) => controls.onAddCondition?.(name),
                    onRemove: (name) => controls.onRemoveCondition?.(name),
                    onAdjustExhaustion: (delta) => controls.onAdjustExhaustion?.(delta),
                  }
                : undefined
            }
          />
          {member.error && !member.error.includes("403") && (
            <p className="mt-1 text-xs text-destructive">{member.error}</p>
          )}
        </div>
      </div>

      {member.error && member.error.includes("403") && (
        <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-border/50 bg-secondary/20 p-6 text-center">
          <Lock className="mb-2 h-8 w-8 text-muted-foreground/50" />
          <h3 className="font-heading text-lg font-bold text-foreground">Private Character</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            This character sheet is set to private. Go to D&amp;D Beyond and set its privacy to{" "}
            <strong>Public</strong> to view stats here.
          </p>
        </div>
      )}

      {!member.error && (
        <>
          <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent mt-4 mb-3.5" />
          <div className="relative">
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <span className="flex items-center gap-1 font-medium text-muted-foreground group/hp select-none">
                <Heart
                  size={11}
                  className="text-ui-rose drop-shadow-[0_0_3px_color-mix(in_oklab,var(--color-ui-rose)_40%,transparent)] transition-transform duration-300 group-hover/hp:animate-heartbeat"
                />
                <span>HP</span>
                {hitDice && hitDice !== "—" && (
                  <span className="ml-1 font-mono text-[9px] text-muted-foreground/75">
                    ({hitDice})
                  </span>
                )}
              </span>
              <span className="font-mono text-foreground relative">
                {hpCurrent} / {member.hpMax}
                {tempHp > 0 ? <span className="ml-1 text-accent">+{tempHp}</span> : null}
                {delta && (
                  <span
                    key={delta.key}
                    className={`absolute -top-3 right-0 text-xs font-bold ${
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
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full animate-fill-bar ${hpColor} ${hpGlow}`}
                style={{ width: `${animHpPct}%` }}
              />
            </div>
            {controls && (
              <div className="mt-2 space-y-1.5">
                <div className="flex gap-1.5">
                  {controls.canEdit && (
                    <>
                      <button
                        type="button"
                        disabled={controls.busy}
                        onClick={controls.onDamage}
                        className="flex-1 rounded border border-border/50 bg-secondary/30 px-2 py-1 text-[10px] font-bold text-foreground transition-colors hover:border-hp-critical/60 hover:text-hp-critical disabled:opacity-50"
                      >
                        −1 HP
                      </button>
                      <button
                        type="button"
                        disabled={controls.busy}
                        onClick={controls.onHeal}
                        className="flex-1 rounded border border-border/50 bg-secondary/30 px-2 py-1 text-[10px] font-bold text-foreground transition-colors hover:border-hp-good/60 hover:text-hp-good disabled:opacity-50"
                      >
                        +1 HP
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={controls.onOpenSheet}
                    className="flex-1 rounded border border-accent/40 bg-accent/10 px-2 py-1 text-[10px] font-bold text-accent transition-colors hover:bg-accent/20"
                  >
                    {controls.sheetOpen ? "Close Sheet" : "Open Sheet"}
                  </button>
                </div>
                {controls.canEdit && (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={controls.busy}
                      onClick={controls.onGrantTemporaryHp}
                      className="flex-1 rounded border border-border/50 bg-secondary/30 px-2 py-1 text-[9px] font-bold text-muted-foreground hover:border-accent/50 hover:text-accent disabled:opacity-50"
                    >
                      Temp 5
                    </button>
                    <button
                      type="button"
                      disabled={controls.busy}
                      onClick={controls.onLongRest}
                      className="flex-1 rounded border border-border/50 bg-secondary/30 px-2 py-1 text-[9px] font-bold text-muted-foreground hover:border-accent/50 hover:text-accent disabled:opacity-50"
                    >
                      Long Rest
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {hpCurrent <= 0 && (
            <div className="mt-3 rounded border border-destructive/60 bg-destructive/10 px-2 py-2">
              <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider">
                <span className="text-destructive">
                  {deathSaves.stabilized ? "Stabilized" : "Death Saves"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">Success</span>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={`s-${i}`}
                      className={`h-3 w-3 rotate-45 border ${
                        i < deathSaves.successes
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
                        i < deathSaves.failures
                          ? "border-destructive bg-destructive shadow-[0_0_6px_color-mix(in_oklab,var(--destructive)_70%,transparent)]"
                          : "border-border bg-transparent"
                      }`}
                    />
                  ))}
                </div>
              </div>
              {controls?.canEdit && !deathSaves.stabilized && (
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    disabled={controls.busy}
                    onClick={() => controls.onDeathSave?.("success")}
                    className="rounded border border-hp-good/40 bg-hp-good/10 py-1 text-[9px] font-bold text-hp-good disabled:opacity-50"
                  >
                    Success
                  </button>
                  <button
                    type="button"
                    disabled={controls.busy}
                    onClick={() => controls.onDeathSave?.("failure")}
                    className="rounded border border-destructive/40 bg-destructive/10 py-1 text-[9px] font-bold text-destructive disabled:opacity-50"
                  >
                    Failure
                  </button>
                  <button
                    type="button"
                    disabled={controls.busy}
                    onClick={controls.onStabilize}
                    className="rounded border border-accent/40 bg-accent/10 py-1 text-[9px] font-bold text-accent disabled:opacity-50"
                  >
                    Stabilize
                  </button>
                </div>
              )}
            </div>
          )}

          {isExpanded && (
            <div className="animate-in fade-in duration-200">
              <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent mt-4 mb-3.5" />
              <div className="grid grid-cols-4 2xl:grid-cols-2 gap-1.5 text-center">
                <Stat
                  label="AC"
                  icon={Shield}
                  iconClassName="text-primary/90 drop-shadow-[0_0_3px_color-mix(in_oklab,var(--primary)_45%,transparent)]"
                  value={
                    ac !== member.armorClass ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-gold font-bold drop-shadow-[0_0_6px_color-mix(in_oklab,var(--gold)_60%,transparent)] cursor-help animate-pulse">
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
                          <span className="text-accent font-bold cursor-help">{speed}ft</span>
                        </TooltipTrigger>
                        <TooltipContent>{speedNotes.join(", ")}</TooltipContent>
                      </Tooltip>
                    ) : (
                      `${speed}ft`
                    )
                  }
                />
                <Stat label="Proficiency" value={fmt(member.proficiencyBonus)} />
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent mt-4 mb-3.5" />
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {member.abilities.map((a) => {
                  const elite = a.score >= 16;
                  const details = ABILITY_DETAILS[a.name];
                  const Icon = details?.Icon;
                  const hoverGlow = details?.hoverGlowClass || "hover:border-accent/40";
                  return (
                    <div
                      key={a.name}
                      className={`group rounded-lg border px-1 py-1.5 text-center transition-all duration-300 hover:scale-105 hover:shadow-md ${
                        elite
                          ? "border-gold/50 bg-[color-mix(in_oklab,var(--gold)_8%,var(--secondary))] shadow-[0_0_8px_color-mix(in_oklab,var(--gold)_30%,transparent)] text-gold"
                          : "border-border/30 bg-secondary/20 text-foreground"
                      } ${hoverGlow}`}
                    >
                      <div
                        className={`text-[9.5px] font-bold tracking-wider uppercase flex items-center justify-center gap-1 select-none ${
                          elite ? "text-gold" : "text-muted-foreground"
                        }`}
                      >
                        {Icon && (
                          <Icon
                            size={7.5}
                            className={`shrink-0 transition-transform duration-300 group-hover:scale-125 ${
                              elite ? "text-gold" : details?.colorClass || "text-accent/80"
                            }`}
                          />
                        )}
                        <span>{a.name}</span>
                      </div>
                      <div
                        className={`font-heading text-lg font-bold leading-tight drop-shadow-sm ${
                          elite ? "text-gold" : "text-foreground"
                        }`}
                      >
                        {a.score}
                      </div>
                      <div className="text-[10px] font-mono font-semibold text-muted-foreground/80 mt-0.5">
                        {a.modifier >= 0 ? `+${a.modifier}` : a.modifier}
                      </div>
                    </div>
                  );
                })}
              </div>

              {member.saves.length > 0 && (
                <Section title="Saving Throws">
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {member.saves.map((s) => {
                      const details = ABILITY_DETAILS[s.ability];
                      const Icon = details?.Icon;
                      const isProf = s.proficiency !== "none";
                      const hoverGlow = details?.hoverGlowClass || "hover:border-accent/30";
                      return (
                        <div
                          key={s.ability}
                          className={`group rounded-lg border px-1 py-1 text-center transition-all duration-200 hover:scale-105 ${
                            isProf
                              ? "border-accent/50 bg-accent/10 shadow-[0_0_6px_color-mix(in_oklab,var(--accent)_25%,transparent)]"
                              : "border-border/30 bg-secondary/20"
                          } ${hoverGlow}`}
                        >
                          <div className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1 select-none">
                            {Icon && (
                              <Icon
                                size={7}
                                className={`shrink-0 transition-transform duration-300 group-hover:scale-120 ${
                                  isProf
                                    ? "text-accent"
                                    : details?.colorClass || "text-muted-foreground/45"
                                }`}
                              />
                            )}
                            <span>{s.ability}</span>
                            {s.proficiency === "expertise" && (
                              <span className="text-gold" title="Expertise">
                                ★
                              </span>
                            )}
                            {s.proficiency === "proficient" && (
                              <span className="text-accent text-[8px]" title="Proficient">
                                ●
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-mono font-bold text-foreground mt-0.5">
                            {fmt(s.modifier)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}
              {(member.spellcasting?.length > 0 ||
                spellSlots.length > 0 ||
                pactSlots.length > 0) && (
                <Section title="Spellcasting">
                  <div className="flex flex-col gap-3">
                    {member.spellcasting && member.spellcasting.length > 0 && (
                      <div className="flex flex-col gap-3">
                        {member.spellcasting.map((sc) => {
                          const abilityMod =
                            member.abilities.find((a) => a.name === sc.ability)?.modifier ?? 0;
                          return (
                            <div
                              key={sc.className}
                              className="relative overflow-hidden rounded-xl border border-accent/25 bg-gradient-to-br from-accent/5 to-secondary/30 p-3 shadow-md"
                            >
                              <div className="absolute -right-3 -top-3 h-10 w-10 rounded-full bg-accent/8 blur-xl pointer-events-none" />
                              <div className="mb-3 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-accent select-none">
                                <Sparkles size={11} className="text-accent/80 animate-pulse" />
                                <span>
                                  {sc.className} ({sc.ability})
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-center divide-x divide-border/20">
                                <div>
                                  <div className="font-heading text-xl font-extrabold text-foreground leading-tight drop-shadow-sm">
                                    {fmt(abilityMod)}
                                  </div>
                                  <div className="mt-1 text-[8px] font-bold uppercase tracking-wider text-muted-foreground/80">
                                    Modifier
                                  </div>
                                </div>
                                <div className="pl-1">
                                  <div className="font-heading text-xl font-extrabold text-foreground leading-tight drop-shadow-sm">
                                    {fmt(sc.attackBonus)}
                                  </div>
                                  <div className="mt-1 text-[8px] font-bold uppercase tracking-wider text-muted-foreground/80">
                                    Spell Attack
                                  </div>
                                </div>
                                <div className="pl-1">
                                  <div className="font-heading text-xl font-extrabold text-gold leading-tight drop-shadow-sm">
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
                      </div>
                    )}
                    {(spellSlots.length > 0 || pactSlots.length > 0) && (
                      <div className="flex flex-col gap-1.5 border-t border-border/30 pt-2">
                        {spellSlots.map((s) => {
                          const available = s.max - s.used;
                          return (
                            <div key={`s-${s.level}`} className="flex items-center gap-2">
                              <span className="min-w-[2.5rem] text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                                Level {s.level}
                              </span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex flex-wrap gap-1.5 cursor-help">
                                    {Array.from({ length: s.max }).map((_, i) => {
                                      const filled = i < available;
                                      return (
                                        <span
                                          key={i}
                                          className={`mana-slot ${filled ? "mana-slot-filled" : ""}`}
                                        />
                                      );
                                    })}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Level {s.level}: {available}/{s.max} remaining
                                </TooltipContent>
                              </Tooltip>
                              <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                                {available}/{s.max}
                              </span>
                            </div>
                          );
                        })}
                        {pactSlots.map((s) => {
                          const available = s.max - s.used;
                          return (
                            <div key={`p-${s.level}`} className="flex items-center gap-2">
                              <span className="min-w-[2.5rem] text-[10px] font-mono font-semibold uppercase tracking-wider text-accent">
                                Pact {s.level}
                              </span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex flex-wrap gap-1.5 cursor-help">
                                    {Array.from({ length: s.max }).map((_, i) => {
                                      const filled = i < available;
                                      return (
                                        <span
                                          key={i}
                                          className={`pact-slot ${filled ? "pact-slot-filled" : ""}`}
                                        />
                                      );
                                    })}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Pact (L{s.level}): {available}/{s.max} remaining
                                </TooltipContent>
                              </Tooltip>
                              <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                                {available}/{s.max}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </Section>
              )}

              {/* Combat Actions & Spells Section */}
              {(member.attacks.length > 0 ||
                member.cantrips.length > 0 ||
                member.preparedSpells.length > 0) && (
                <Section
                  title={
                    <span className="flex items-center gap-1.5 font-semibold text-accent/90">
                      <Swords size={12} className="text-accent" />
                      <span>Combat & Spells</span>
                    </span>
                  }
                  defaultOpen={false}
                >
                  <div className="flex flex-col gap-3">
                    {/* Attacks List */}
                    {member.attacks.length > 0 && (
                      <div>
                        <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                          Attacks & Actions
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {member.attacks.map((atk, idx) => (
                            <div
                              key={`${atk.name}-${idx}`}
                              className="flex items-center justify-between rounded border border-border bg-secondary/40 px-2 py-1 text-xs transition-colors hover:border-accent/40 hover:bg-secondary/60"
                            >
                              <div className="flex flex-col">
                                <span className="font-semibold text-foreground">{atk.name}</span>
                                {atk.properties && atk.properties.length > 0 && (
                                  <span className="text-[9px] text-muted-foreground mt-0.5">
                                    {atk.properties.join(", ")}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 font-mono">
                                <span className="text-accent font-semibold">
                                  {atk.attackBonus >= 0 ? `+${atk.attackBonus}` : atk.attackBonus}
                                </span>
                                <span className="text-muted-foreground text-[10px]">to hit</span>
                                <span className="text-foreground font-semibold">{atk.damage}</span>
                                <span className="text-muted-foreground text-[10px]">
                                  {atk.damageType}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Spells List */}
                    {(member.cantrips.length > 0 || member.preparedSpells.length > 0) && (
                      <div className="border-t border-border/30 pt-2 flex flex-col gap-2">
                        {member.cantrips.length > 0 && (
                          <div>
                            <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
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
                            <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                              Prepared Spells
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {member.preparedSpells.map((s) => (
                                <Tooltip key={s.name}>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help rounded border border-border bg-secondary/50 px-1.5 py-0.5 text-[10px] text-foreground">
                                      <span className="text-accent mr-1 font-mono text-[9px]">
                                        L{s.level}
                                      </span>
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
                    )}
                  </div>
                </Section>
              )}

              {(senses.length > 0 || member.passivePerception != null) && (
                <Section title="Senses">
                  <div className="flex flex-col gap-1.5">
                    {[
                      { label: "Passive Perception", value: member.passivePerception, icon: Eye },
                      {
                        label: "Passive Investigation",
                        value: member.passiveInvestigation,
                        icon: Search,
                      },
                      { label: "Passive Insight", value: member.passiveInsight, icon: Brain },
                    ]
                      .filter((p) => p.value != null)
                      .map((p) => {
                        const Icon = p.icon;
                        return (
                          <div
                            key={p.label}
                            className="flex items-center justify-between rounded-lg border border-border/30 bg-secondary/20 px-2.5 py-1.5 transition-colors hover:border-accent/40"
                          >
                            <div className="flex items-center gap-2 select-none">
                              <Icon size={9.5} className="shrink-0 text-accent/80" />
                              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                                {p.label}
                              </span>
                            </div>
                            <span className="flex h-6 w-6 items-center justify-center rounded border border-accent/40 bg-accent/10 text-xs font-mono font-bold text-foreground shadow-[0_0_6px_color-mix(in_oklab,var(--accent)_20%,transparent)]">
                              {p.value}
                            </span>
                          </div>
                        );
                      })}
                    {senses.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                        {senses.map((s) => {
                          const isDarkvision = s.name.toLowerCase().includes("darkvision");
                          const SenseIcon = isDarkvision ? Moon : Eye;
                          return (
                            <span
                              key={s.name}
                              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 text-[9px] font-bold text-primary uppercase tracking-wider select-none"
                            >
                              <ThemeIcon size={10} className="text-primary/90" as={SenseIcon} />
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
                </Section>
              )}

              {displaySkills.length > 0 && (
                <Section title="Skills" defaultOpen={false}>
                  <div className="grid grid-cols-2 2xl:grid-cols-1 gap-x-3 gap-y-0.5 text-xs">
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
                          className={`group/skill flex items-center justify-between transition-colors py-0.5 hover:bg-secondary/15 rounded px-1 -mx-1 ${isProf ? "" : "opacity-60"}`}
                        >
                          <span
                            className={`truncate flex items-center gap-1.5 min-w-0 ${nameColor}`}
                          >
                            {Icon && (
                              <Icon
                                size={8}
                                className={`shrink-0 transition-transform duration-300 group-hover/skill:scale-120 group-hover/skill:rotate-6 ${iconColor}`}
                              />
                            )}
                            <span className="truncate">{s.name}</span>
                            {isExpert && (
                              <span className="text-gold text-[7px] shrink-0" title="Expertise">
                                ★
                              </span>
                            )}
                            {isHalf && (
                              <span
                                className="text-accent/70 text-[7px] shrink-0"
                                title="Half Proficient"
                              >
                                ◐
                              </span>
                            )}
                          </span>
                          <span
                            className={`font-mono text-xs shrink-0 pl-1 ${isExpert ? "text-gold font-bold" : isProf ? "text-accent font-semibold" : "text-muted-foreground/60"}`}
                          >
                            {fmt(s.modifier)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}

              {defenses.length > 0 && (
                <Section title="Defenses">
                  <div className="flex flex-wrap gap-1">
                    {defenses.map((d) => {
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
                              className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider cursor-help ${styles}`}
                            >
                              <span className="opacity-70 mr-1">{mark}</span>
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
                </Section>
              )}

              {(member.languages.length > 0 || member.tools.length > 0) && (
                <Section title="Proficiencies">
                  <div className="flex flex-col gap-2">
                    {member.languages.length > 0 && (
                      <div>
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground mr-2">
                          Languages
                        </span>
                        <span className="text-xs text-foreground">
                          {member.languages.join(", ")}
                        </span>
                      </div>
                    )}
                    {member.tools.length > 0 && (
                      <div>
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground mr-2">
                          Tools
                        </span>
                        <span className="text-xs text-foreground">{member.tools.join(", ")}</span>
                      </div>
                    )}
                  </div>
                </Section>
              )}

              {actions?.filter((a) => a.source === "class" && a.uses).length ? (
                <Section title="Resources">
                  <div className="flex flex-col gap-2">
                    {[...actions]
                      .filter((a) => a.source === "class" && a.uses)
                      .sort((a, b) => {
                        const getResourceSortValue = (act: any) => {
                          const type = act.activation?.activationType;
                          if (type === 1) return 1; // Action
                          if (type === 3) return 2; // Bonus Action
                          if (type === 4) return 3; // Reaction
                          return 4; // Other
                        };
                        const sortA = getResourceSortValue(a);
                        const sortB = getResourceSortValue(b);
                        if (sortA !== sortB) return sortA - sortB;
                        return a.name.localeCompare(b.name);
                      })
                      .map((a) => {
                        const u = a.uses!;
                        const out = u.current <= 0;
                        const ratio = u.max > 0 ? u.current / u.max : 0;
                        const isSmallMax = u.max <= 6;

                        return (
                          <button
                            type="button"
                            key={`${a.source}-${a.name}`}
                            disabled={!controls?.canEdit || out || controls.busy}
                            onClick={() => controls?.onSpendResource?.(a.name)}
                            className="flex w-full flex-col gap-1.5 rounded-lg border border-border/30 bg-secondary/20 p-2.5 text-left transition-all duration-200 hover:border-accent/40 disabled:cursor-default"
                            title={
                              controls?.canEdit
                                ? `Spend 1 · Resets on ${u.reset}`
                                : `Resets on ${u.reset}`
                            }
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
                              <div className="flex gap-1 mt-0.5">
                                {Array.from({ length: u.max }).map((_, i) => {
                                  const active = i < u.current;
                                  return (
                                    <span
                                      key={i}
                                      className={`h-2 w-2 rounded-full transition-all duration-300 ${
                                        active
                                          ? "bg-accent shadow-[0_0_5px_color-mix(in_oklab,var(--accent)_60%,transparent)]"
                                          : "border border-accent/40 bg-transparent"
                                      }`}
                                    />
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="h-1 w-full overflow-hidden rounded-full bg-secondary mt-0.5">
                                <div
                                  className="h-full bg-accent shadow-[0_0_5px_color-mix(in_oklab,var(--accent)_60%,transparent)] transition-all duration-500"
                                  style={{ width: `${ratio * 100}%` }}
                                />
                              </div>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </Section>
              ) : null}

              {member.inventory.length > 0 && (
                <Section title="Inventory" defaultOpen={false}>
                  <InventoryList
                    items={member.inventory}
                    currencies={member.currencies}
                    weightCarried={member.weightCarried}
                    carryingCapacity={carryingCapacity}
                    attunementCapacity={member.attunementCapacity}
                  />
                </Section>
              )}

              {member.feats && member.feats.length > 0 && (
                <Section title="Feats" defaultOpen={false}>
                  <div className="flex flex-wrap gap-1.5">
                    {member.feats.map((f) => (
                      <Tooltip key={f.name}>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/30 bg-secondary/20 px-2.5 py-0.5 text-[9px] font-bold text-foreground/90 uppercase tracking-wider transition-all duration-200 hover:border-accent/40 hover:scale-105 hover:bg-secondary/35 select-none cursor-help">
                            <Award size={9} className="text-accent/80 shrink-0" />
                            <span>
                              {f.name}
                              {f.choices && f.choices.length > 0
                                ? ` (${f.choices.join(", ")})`
                                : ""}
                            </span>
                          </span>
                        </TooltipTrigger>
                        {f.description && (
                          <TooltipContent className="max-w-[240px] text-xs">
                            {f.description.replace(/<[^>]*>/g, "")}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          )}
        </>
      )}
    </article>
  );
}

// Local helper component to type-safely render dynamic icons
function ThemeIcon({ as: Icon, ...props }: any) {
  return <Icon {...props} />;
}
