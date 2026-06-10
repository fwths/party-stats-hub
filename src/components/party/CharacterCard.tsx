import { useState, useEffect, useRef } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Eye, EyeOff, EarOff, Ghost, Hand, Ban, Snowflake, Mountain, FlaskConical, ArrowDown, Lock, Zap, Moon, Brain, Heart, Flame, HeartCrack, Skull, Sparkles, AlertCircle } from "lucide-react";
import { PartyMember, InventoryItem } from "@/lib/dndbeyond.functions";
import { CONDITION_BY_NAME } from "@/lib/constants";
import { X } from "lucide-react";

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group mt-3">
      <summary className="mb-1 flex cursor-pointer list-none items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-accent">
        <span>{title}</span>
        <span className="ml-2 transition-transform group-open:rotate-90">›</span>
      </summary>
      {children}
    </details>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-border/40 bg-secondary/30 px-1 py-2 transition-colors hover:border-accent/40 hover:bg-secondary/60">
      <div className="text-[10px] font-semibold tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="font-heading text-lg font-bold text-foreground leading-tight drop-shadow-sm">{value}</div>
    </div>
  );
}

function conditionIcon(name: string) {
  return CONDITION_BY_NAME.get(name.toLowerCase())?.Icon ?? AlertCircle;
}

type LocalCondition = { name: string; rounds: number | null };

const CONDITIONS_KEY = "mob.conditions.v1";

function readAllConditions(): Record<string, LocalCondition[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CONDITIONS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function useCharacterConditions(characterId: number) {
  const [all, setAll] = useState<Record<string, LocalCondition[]>>(() => readAllConditions());
  const key = String(characterId);
  const list = all[key] ?? [];

  const persist = (next: Record<string, LocalCondition[]>) => {
    setAll(next);
    try {
      localStorage.setItem(CONDITIONS_KEY, JSON.stringify(next));
    } catch {}
  };

  const add = (name: string, rounds: number | null) => {
    const exists = list.some((c) => c.name.toLowerCase() === name.toLowerCase());
    if (exists) return;
    persist({ ...all, [key]: [...list, { name, rounds }] });
  };
  const remove = (name: string) => {
    persist({ ...all, [key]: list.filter((c) => c.name !== name) });
  };
  const tick = (name: string, delta: number) => {
    persist({
      ...all,
      [key]: list
        .map((c) =>
          c.name === name && c.rounds != null
            ? { ...c, rounds: c.rounds + delta }
            : c,
        )
        .filter((c) => c.rounds == null || c.rounds > 0),
    });
  };

  return { list, add, remove, tick };
}

function ConditionChip({
  name,
  Icon,
  rounds,
  intense,
  readOnly,
  onTick,
  onRemove,
}: {
  name: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  rounds?: number | null;
  intense?: boolean;
  readOnly?: boolean;
  onTick?: () => void;
  onRemove?: () => void;
}) {
  const base = intense
    ? "border-destructive bg-destructive/25 text-destructive shadow-[0_0_8px_color-mix(in_oklab,var(--destructive)_70%,transparent)]"
    : readOnly
    ? "border-border bg-secondary/60 text-muted-foreground"
    : "border-destructive/60 bg-destructive/15 text-destructive shadow-[0_0_6px_color-mix(in_oklab,var(--destructive)_55%,transparent)]";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${base}`}
      title={rounds != null ? `${name} — ${rounds} round${rounds === 1 ? "" : "s"} remaining` : name}
    >
      <Icon size={10} />
      <span>{name}</span>
      {rounds != null && (
        <button
          onClick={onTick}
          disabled={!onTick}
          className="ml-0.5 rounded bg-destructive/30 px-1 font-mono text-[10px] text-destructive hover:bg-destructive/50 disabled:cursor-default disabled:opacity-60"
          title="Click to advance one round"
        >
          {rounds}r
        </button>
      )}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 rounded hover:text-foreground"
          title="Remove"
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
}


function ConditionsPanel({
  characterId,
  remoteConditions,
  exhaustion,
}: {
  characterId: number;
  remoteConditions: string[];
  exhaustion: number;
}) {
  void characterId;
  if (remoteConditions.length === 0 && exhaustion <= 0) return null;
  return (
    <div className="mt-1.5">
      <div className="flex flex-wrap items-center gap-1">
        {exhaustion > 0 && (
          <ConditionChip
            name={`Exhaustion ${exhaustion}`}
            Icon={HeartCrack}
            intense
          />
        )}
        {remoteConditions.map((c) => {
          const Icon = conditionIcon(c);
          return <ConditionChip key={`r-${c}`} name={c} Icon={Icon} readOnly />;
        })}
      </div>
    </div>
  );
}

function InventoryGroup({ label, items }: { label: string; items: InventoryItem[] }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="flex flex-wrap gap-1">
        {items.map((it, idx) => {
          const styles = it.attuned
            ? "border-gold/70 bg-[color-mix(in_oklab,var(--gold)_14%,var(--secondary))] text-gold shadow-[0_0_6px_color-mix(in_oklab,var(--gold)_45%,transparent)]"
            : it.magic
            ? "border-accent/60 bg-accent/10 text-accent"
            : "border-border bg-secondary/60 text-foreground";
          const title =
            `${it.name} — ${it.type}` +
            (it.rarity ? ` (${it.rarity})` : "") +
            (it.attuned ? " • attuned" : "") +
            (it.quantity > 1 ? ` ×${it.quantity}` : "");
          return (
            <span
              key={`${it.name}-${idx}`}
              className={`rounded border px-1.5 py-0.5 text-[10px] ${styles}`}
              title={title}
            >
              {it.attuned ? "✦ " : ""}
              {it.name}
              {it.quantity > 1 ? ` ×${it.quantity}` : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function InventoryList({ items }: { items: InventoryItem[] }) {
  const equipped = items.filter((i) => i.equipped);
  const magicCarried = items.filter((i) => !i.equipped && i.magic);
  const other = items.filter((i) => !i.equipped && !i.magic);
  return (
    <div className="flex flex-col gap-2">
      {equipped.length > 0 && (
        <InventoryGroup label="Equipped" items={equipped} />
      )}
      {magicCarried.length > 0 && (
        <InventoryGroup label="Magic Items" items={magicCarried} />
      )}
      {other.length > 0 && (
        <InventoryGroup label="Carried" items={other} />
      )}
    </div>
  );
}

export function CharacterCard({ member }: { member: PartyMember }) {
  const hpPct = member.hpMax > 0 ? Math.min(100, (member.hpCurrent / member.hpMax) * 100) : 0;
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
  const hpColor =
    hpPct > 60 ? "bg-hp-good" : hpPct > 25 ? "bg-hp-wounded" : "bg-hp-critical";
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

  // Split classes string "Wizard 5 / Cleric 2" into chips
  const classChips = member.classes
    .split(/\s*\/\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <article className="card-arcane group relative overflow-hidden rounded-xl border border-border/40 p-4 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-2xl hover:shadow-primary/20">
      <div className="flex items-start gap-3">
        {member.avatarUrl ? (
          <img
            src={member.avatarUrl}
            alt={member.name}
            className="h-16 w-16 flex-shrink-0 rounded-md border border-border object-cover"
          />
        ) : (
          <div className="h-16 w-16 flex-shrink-0 rounded-md border border-border bg-muted" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <a
              href={member.readonlyUrl}
              target="_blank"
              rel="noreferrer"
              className="font-heading block truncate text-xl font-bold text-foreground drop-shadow-sm transition-colors group-hover:text-accent hover:underline"
            >
              {member.name}
            </a>
            {member.inspiration && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-gold drop-shadow-[0_0_6px_color-mix(in_oklab,var(--gold)_80%,transparent)] animate-pulse cursor-help">
                    ★
                  </span>
                </TooltipTrigger>
                <TooltipContent>Inspiration</TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {member.race}
            {member.background ? (
              <span className="text-muted-foreground/70"> • {member.background}</span>
            ) : null}
          </p>
          {classChips.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {classChips.map((c) => (
                <span
                  key={c}
                  className="rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
          {member.subclasses.length > 0 && (
            <p className="mt-1 truncate text-[10px] uppercase tracking-wider text-muted-foreground">
              {member.subclasses.join(" • ")}
            </p>
          )}
          <ConditionsPanel
            characterId={member.id}
            remoteConditions={member.conditions}
            exhaustion={member.exhaustion}
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
            This character sheet is set to private. Go to D&amp;D Beyond and set its privacy to <strong>Public</strong> to view stats here.
          </p>
        </div>
      )}

      {!member.error && (
        <>
          <div className="mt-4 relative">
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <span className="font-medium text-muted-foreground">HP</span>
              <span className="font-mono text-foreground relative">
                {member.hpCurrent} / {member.hpMax}
                {member.tempHp > 0 ? (
                  <span className="ml-1 text-accent">+{member.tempHp}</span>
                ) : null}
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

          <div className="mt-4 grid grid-cols-4 gap-1.5 text-center">
            <Stat label="AC" value={member.armorClass} />
            <Stat label="Initiative" value={fmt(member.initiative)} />
            <Stat label="Speed" value={`${member.speed}ft`} />
            <Stat label="Proficiency" value={fmt(member.proficiencyBonus)} />
          </div>

          <div className="mt-4 grid grid-cols-6 gap-1.5">
            {member.abilities.map((a) => {
              const elite = a.score >= 16;
              return (
                <div
                  key={a.name}
                  className={`rounded border px-1 py-2 text-center transition-all duration-300 hover:scale-105 ${
                    elite
                      ? "border-gold/60 bg-[color-mix(in_oklab,var(--gold)_12%,var(--secondary))] shadow-[0_0_12px_color-mix(in_oklab,var(--gold)_45%,transparent)]"
                      : "border-border/40 bg-secondary/30 hover:border-accent/40 hover:bg-secondary/60"
                  }`}
                >
                  <div
                    className={`text-[10px] font-semibold tracking-wider ${
                      elite ? "text-gold" : "text-muted-foreground"
                    }`}
                  >
                    {a.name}
                  </div>
                  <div
                    className={`font-heading text-lg font-bold leading-tight drop-shadow-sm ${
                      elite ? "text-gold" : "text-foreground"
                    }`}
                  >
                    {a.score}
                  </div>
                  <div className="text-[10px] font-mono text-accent">
                    {a.modifier >= 0 ? `+${a.modifier}` : a.modifier}
                  </div>
                </div>
              );
            })}
          </div>


          {member.saves.length > 0 && (
            <Section title="Saving Throws">
              <div className="grid grid-cols-6 gap-1">
                {member.saves.map((s) => {
                  const marker =
                    s.proficiency === "expertise" ? "★" : s.proficiency === "proficient" ? "●" : "";
                  return (
                    <div
                      key={s.ability}
                      className={`rounded border px-1 py-1 text-center ${
                        s.proficiency !== "none"
                          ? "border-accent/60 bg-accent/10"
                          : "border-border bg-secondary/60"
                      }`}
                    >
                      <div className="text-[9px] font-semibold tracking-wider text-muted-foreground">
                        {s.ability}
                        {marker && <span className="ml-0.5 text-accent">{marker}</span>}
                      </div>
                      <div className="text-xs font-mono text-foreground">{fmt(s.modifier)}</div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}
          {(member.spellcasting?.length > 0 || member.spellSlots.length > 0 || member.pactSlots.length > 0) && (
            <Section title="Spellcasting">
              <div className="flex flex-col gap-3">
                {member.spellcasting && member.spellcasting.length > 0 && (
                  <div className="flex flex-col gap-3">
                    {member.spellcasting.map((sc) => {
                      const abilityMod = member.abilities.find((a) => a.name === sc.ability)?.modifier ?? 0;
                      return (
                        <div key={sc.className} className="rounded-lg border border-border/40 bg-secondary/20 p-3">
                          <div className="mb-3 text-center text-[10px] font-semibold uppercase tracking-wider text-accent/90">
                            {sc.className} ({sc.ability})
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <div className="font-heading text-xl font-bold text-foreground leading-tight drop-shadow-sm">
                                {fmt(abilityMod)}
                              </div>
                              <div className="mt-1 text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
                                Modifier
                              </div>
                            </div>
                            <div>
                              <div className="font-heading text-xl font-bold text-foreground leading-tight drop-shadow-sm">
                                {fmt(sc.attackBonus)}
                              </div>
                              <div className="mt-1 text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
                                Spell Attack
                              </div>
                            </div>
                            <div>
                              <div className="font-heading text-xl font-bold text-foreground leading-tight drop-shadow-sm">
                                {sc.saveDc}
                              </div>
                              <div className="mt-1 text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
                                Save DC
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {(member.spellSlots.length > 0 || member.pactSlots.length > 0) && (
                  <div className="flex flex-col gap-1.5 border-t border-border/30 pt-2">
                    {member.spellSlots.map((s) => {
                      const available = s.max - s.used;
                      return (
                        <div key={`s-${s.level}`} className="flex items-center gap-2">
                          <span className="min-w-[2.5rem] text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                            Level {s.level}
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex flex-wrap gap-1 cursor-help">
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
                            <TooltipContent>Level {s.level}: {available}/{s.max} remaining</TooltipContent>
                          </Tooltip>
                          <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                            {available}/{s.max}
                          </span>
                        </div>
                      );
                    })}
                    {member.pactSlots.map((s) => {
                      const available = s.max - s.used;
                      return (
                        <div key={`p-${s.level}`} className="flex items-center gap-2">
                          <span className="min-w-[2.5rem] text-[10px] font-mono font-semibold uppercase tracking-wider text-accent">
                            Pact {s.level}
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex flex-wrap gap-1 cursor-help">
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
                            </TooltipTrigger>
                            <TooltipContent>Pact (L{s.level}): {available}/{s.max} remaining</TooltipContent>
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

          {(member.senses.length > 0 || member.passivePerception != null) && (
            <Section title="Senses">
              <div className="flex flex-col gap-1">
                {[
                  { label: "Passive Perception", value: member.passivePerception },
                  { label: "Passive Investigation", value: member.passiveInvestigation },
                  { label: "Passive Insight", value: member.passiveInsight },
                ].filter((p) => p.value != null).map((p) => (
                  <div
                    key={p.label}
                    className="flex items-center gap-2 rounded border border-border bg-secondary/40 px-2 py-1"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded border border-accent/50 bg-accent/10 text-xs font-mono font-semibold text-foreground">
                      {p.value}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {p.label}
                    </span>
                  </div>
                ))}
                {member.senses.length > 0 && (
                  <div className="mt-1 text-center text-xs text-muted-foreground">
                    {member.senses.map((s) => `${s.name}${s.value != null ? ` ${s.value} ft.` : ""}`).join(" • ")}
                  </div>
                )}
              </div>
            </Section>
          )}

          {displaySkills.length > 0 && (
            <Section title="Skills">
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                {displaySkills.map((s) => (
                  <div key={s.key} className={`flex items-baseline justify-between ${s.proficiency === "none" ? "opacity-60" : ""}`}>
                    <span className="truncate text-foreground">
                      {s.proficiency === "expertise" ? "★ " : s.proficiency === "half" ? "◐ " : s.proficiency === "proficient" ? "● " : "○ "}
                      {s.name}
                    </span>
                    <span className="font-mono text-accent">{fmt(s.modifier)}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {member.defenses.length > 0 && (
            <Section title="Defenses">
              <div className="flex flex-wrap gap-1">
                {member.defenses.map((d) => {
                  const styles =
                    d.type === "immunity"
                      ? "border-gold/60 bg-[color-mix(in_oklab,var(--gold)_12%,var(--secondary))] text-gold"
                      : d.type === "vulnerability"
                      ? "border-destructive/60 bg-destructive/15 text-destructive"
                      : "border-accent/50 bg-accent/10 text-accent";
                  const mark =
                    d.type === "immunity" ? "Immunity" : d.type === "vulnerability" ? "Vulnerability" : "Resistance";
                  return (
                    <Tooltip key={`${d.type}-${d.damageType}`}>
                      <TooltipTrigger asChild>
                        <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider cursor-help ${styles}`}>
                          <span className="opacity-70 mr-1">{mark}</span>
                          {d.damageType}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{d.type}: {d.damageType}</TooltipContent>
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
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground mr-2">Languages</span>
                    <span className="text-xs text-foreground">{member.languages.join(", ")}</span>
                  </div>
                )}
                {member.tools.length > 0 && (
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground mr-2">Tools</span>
                    <span className="text-xs text-foreground">{member.tools.join(", ")}</span>
                  </div>
                )}
              </div>
            </Section>
          )}

          {member.actions?.filter((a) => a.source === "class" && a.uses).length ? (
            <Section title="Resources">
              <div className="flex flex-col gap-1">
                {member.actions
                  .filter((a) => a.source === "class" && a.uses)
                  .map((a) => {
                    const u = a.uses!;
                    const out = u.current <= 0;
                    return (
                      <div
                        key={`${a.source}-${a.name}`}
                        className="flex items-center justify-between gap-2 rounded border border-border bg-secondary/40 px-2 py-1 text-xs"
                        title={`Resets on ${u.reset}`}
                      >
                        <span className="truncate text-foreground">{a.name}</span>
                        <span
                          className={`font-mono ${
                            out ? "text-destructive" : "text-accent"
                          }`}
                        >
                          {u.current}/{u.max}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </Section>
          ) : null}

          {member.inventory.length > 0 && (
            <Section title="Inventory" defaultOpen={false}>
              <InventoryList items={member.inventory} />
            </Section>
          )}

        </>
      )}
    </article>
  );
}