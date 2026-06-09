import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useEffect, useRef, useState } from "react";
import { getParty, type PartyMember } from "@/lib/dndbeyond.functions";

const partyQueryOptions = queryOptions({
  queryKey: ["party"],
  queryFn: () => getParty(),
  staleTime: 15_000,
  refetchInterval: 30_000,
  refetchOnWindowFocus: true,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mother of Bob (MOB) — Party Stats" },
      { name: "description", content: "Live stats for the Mother of Bob (MOB) party, pulled from D&D Beyond." },
      { property: "og:title", content: "Mother of Bob (MOB)" },
      { property: "og:description", content: "Live D&D party stats for MOB." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(partyQueryOptions),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <header className="mb-6 flex items-baseline justify-between gap-3 border-b border-border pb-3">
          <h1 className="text-2xl font-semibold tracking-wide text-accent">
            Mother of Bob <span className="text-muted-foreground">(MOB)</span>
          </h1>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <a className="underline hover:text-accent" href="/api/party">JSON</a>
            <Suspense fallback={null}>
              <RefreshButton />
            </Suspense>
          </div>
        </header>
        <Suspense fallback={<p className="text-muted-foreground">Summoning heroes…</p>}>
          <PartyGrid />
        </Suspense>
      </div>
    </main>
  );
}

function RefreshButton() {
  const qc = useQueryClient();
  const { data, isFetching } = useSuspenseQuery(partyQueryOptions);
  const fetchedAt = new Date(data.fetchedAt);
  return (
    <button
      onClick={() => qc.invalidateQueries({ queryKey: ["party"] })}
      disabled={isFetching}
      className="rounded border border-border bg-secondary/60 px-2 py-1 text-foreground hover:border-accent/60 disabled:opacity-50"
      title={`Last fetched ${fetchedAt.toLocaleTimeString()}`}
    >
      {isFetching ? "Refreshing…" : "↻ Refresh"}
    </button>
  );
}

function PartyGrid() {
  const { data } = useSuspenseQuery(partyQueryOptions);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.members.map((m) => (
        <CharacterCard key={m.id} member={m} />
      ))}
    </div>
  );
}

function CharacterCard({ member }: { member: PartyMember }) {
  const hpPct = member.hpMax > 0 ? Math.min(100, (member.hpCurrent / member.hpMax) * 100) : 0;
  const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
  const profSkills = member.skills.filter((s) => s.proficiency !== "none");
  const hpColor =
    hpPct > 60 ? "bg-hp-good" : hpPct > 25 ? "bg-hp-wounded" : "bg-hp-critical";
  const hpGlow =
    hpPct > 60
      ? "shadow-[0_0_8px_color-mix(in_oklab,var(--hp-good)_70%,transparent)]"
      : hpPct > 25
      ? "shadow-[0_0_8px_color-mix(in_oklab,var(--hp-wounded)_70%,transparent)]"
      : "shadow-[0_0_10px_color-mix(in_oklab,var(--hp-critical)_80%,transparent)] animate-pulse";

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
    <article className="card-arcane relative overflow-hidden rounded-lg border border-border p-4 shadow-md transition-colors hover:border-accent/60">
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
              className="block truncate text-lg font-semibold text-accent hover:underline"
            >
              {member.name}
            </a>
            {member.inspiration && (
              <span
                title="Inspiration"
                className="text-gold drop-shadow-[0_0_6px_color-mix(in_oklab,var(--gold)_80%,transparent)] animate-pulse"
              >
                ★
              </span>
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
          {member.conditions.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {member.conditions.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-destructive/60 bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive shadow-[0_0_6px_color-mix(in_oklab,var(--destructive)_60%,transparent)]"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
          {member.exhaustion > 0 && (
            <div className="mt-1">
              <span className="rounded-full border border-destructive bg-destructive/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive shadow-[0_0_8px_color-mix(in_oklab,var(--destructive)_70%,transparent)]">
                Exhaustion {member.exhaustion}
              </span>
            </div>
          )}
          {member.error ? (
            <p className="mt-1 text-xs text-destructive">{member.error}</p>
          ) : null}
        </div>
      </div>

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
                className={`h-full transition-all ${hpColor} ${hpGlow}`}
                style={{ width: `${hpPct}%` }}
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
                  className={`rounded border px-1 py-2 text-center transition-colors ${
                    elite
                      ? "border-gold/70 bg-[color-mix(in_oklab,var(--gold)_12%,var(--secondary))] shadow-[0_0_8px_color-mix(in_oklab,var(--gold)_45%,transparent)]"
                      : "border-border bg-secondary/60"
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
                    className={`text-base font-bold leading-tight ${
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

          {(member.spellSlots.length > 0 || member.pactSlots.length > 0) && (
            <Section title="Spell Slots">
              <div className="flex flex-col gap-1.5">
                {member.spellSlots.map((s) => {
                  const available = s.max - s.used;
                  return (
                    <div key={`s-${s.level}`} className="flex items-center gap-2">
                      <span className="min-w-[2.5rem] text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                        Level {s.level}
                      </span>
                      <div
                        className="flex flex-wrap gap-1"
                        title={`Level ${s.level}: ${available}/${s.max} remaining`}
                      >
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
                      <div
                        className="flex flex-wrap gap-1"
                        title={`Pact (L${s.level}): ${available}/${s.max} remaining`}
                      >
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
                      <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                        {available}/{s.max}
                      </span>
                    </div>
                  );
                })}
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

          {profSkills.length > 0 && (
            <Section title="Skills">
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                {profSkills.map((s) => (
                  <div key={s.key} className="flex items-baseline justify-between">
                    <span className="truncate text-foreground">
                      {s.proficiency === "expertise" ? "★ " : s.proficiency === "half" ? "◐ " : "● "}
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
                    <span
                      key={`${d.type}-${d.damageType}`}
                      className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${styles}`}
                      title={`${d.type}: ${d.damageType}`}
                    >
                      <span className="opacity-70 mr-1">{mark}</span>
                      {d.damageType}
                    </span>
                  );
                })}
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


        </>
      )}
    </article>
  );
}

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
    <div className="rounded border border-border bg-secondary/60 px-1 py-2">
      <div className="text-[10px] font-semibold tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-sm font-bold text-foreground leading-tight">{value}</div>
    </div>
  );
}
