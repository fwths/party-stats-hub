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
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-8 flex items-baseline justify-between gap-3 pb-4 relative">
          <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
          <h1 className="font-display text-2xl font-bold tracking-wide text-accent drop-shadow-[0_0_12px_color-mix(in_oklab,var(--accent)_50%,transparent)]">
            Mother of Bob <span className="text-muted-foreground font-sans font-normal">(MOB)</span>
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
    <article className="card-arcane relative overflow-hidden rounded-3xl border border-accent/20 p-5 shadow-[0_0_40px_color-mix(in_oklab,var(--accent)_15%,transparent)] transition-all hover:border-accent/50 hover:shadow-[0_0_50px_color-mix(in_oklab,var(--accent)_25%,transparent)]">
      {/* Top aura */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-accent/10 to-transparent" />
      {/* Bottom decorative trim */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

      <div className="relative flex items-center gap-4">
        <div className="relative flex-shrink-0">
          {member.avatarUrl ? (
            <img
              src={member.avatarUrl}
              alt={member.name}
              className="h-20 w-20 rounded-2xl border-2 border-accent/40 object-cover shadow-[0_0_15px_color-mix(in_oklab,var(--accent)_40%,transparent)]"
            />
          ) : (
            <div className="h-20 w-20 rounded-2xl border-2 border-accent/40 bg-muted shadow-[0_0_15px_color-mix(in_oklab,var(--accent)_40%,transparent)]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <a
            href={member.readonlyUrl}
            target="_blank"
            rel="noreferrer"
            className="font-display block truncate text-xl font-bold leading-tight tracking-wide text-foreground hover:text-accent"
          >
            {member.name}
          </a>
          <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-accent/80">
            {member.race}
          </p>
          {classChips.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {classChips.map((c) => (
                <span
                  key={c}
                  className="rounded border border-accent/40 bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent"
                >
                  {c}
                </span>
              ))}
            </div>
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
          {member.error ? (
            <p className="mt-1 text-xs text-destructive">{member.error}</p>
          ) : null}
        </div>
      </div>

      {!member.error && (
        <>
          <div className="relative mt-5">
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-accent/80">Hit Points</span>
              <span className="relative font-mono text-sm">
                <span className="font-bold text-primary tabular-nums">{member.hpCurrent}</span>
                <span className="text-muted-foreground"> / {member.hpMax}</span>
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
            <div className="h-2.5 overflow-hidden rounded-full border border-accent/20 bg-secondary/60 p-[2px]">
              <div
                className={`h-full rounded-full transition-all ${hpColor} ${hpGlow}`}
                style={{ width: `${hpPct}%` }}
              />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2 text-center">
            <Stat label="AC" value={member.armorClass} />
            <Stat label="Initiative" value={fmt(member.initiative)} />
            <Stat label="Speed" value={`${member.speed}ft`} />
            <Stat label="Proficiency" value={fmt(member.proficiencyBonus)} />
          </div>

          <div className="mt-5 grid grid-cols-6 gap-1.5">
            {member.abilities.map((a) => {
              const elite = a.score >= 16;
              return (
                <div
                  key={a.name}
                  className={`relative overflow-hidden rounded-lg border px-1 py-2 text-center transition-colors ${
                    elite
                      ? "border-gold/60 bg-[color-mix(in_oklab,var(--gold)_10%,var(--card))] shadow-[0_0_12px_color-mix(in_oklab,var(--gold)_30%,transparent)]"
                      : "border-accent/15 bg-black/30"
                  }`}
                >
                  {elite && (
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
                  )}
                  <div
                    className={`text-[9px] font-bold uppercase tracking-wider ${
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
                  <div className={`text-[10px] font-mono ${elite ? "text-gold/80" : "text-accent"}`}>
                    {a.modifier >= 0 ? `+${a.modifier}` : a.modifier}
                  </div>
                </div>
              );
            })}
          </div>


          {member.saves.length > 0 && (
            <div className="mt-5">
              <h3 className="section-heading">Saving Throws</h3>
              <div className="grid grid-cols-6 gap-1">
                {member.saves.map((s) => {
                  const marker =
                    s.proficiency === "expertise" ? "★" : s.proficiency === "proficient" ? "●" : "";
                  return (
                    <div
                      key={s.ability}
                      className={`rounded-md border px-1 py-1 text-center ${
                        s.proficiency !== "none"
                          ? "border-accent/60 bg-accent/10"
                          : "border-accent/15 bg-black/30"
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
            </div>
          )}

          {(member.spellSlots.length > 0 || member.pactSlots.length > 0) && (
            <div className="mt-5">
              <h3 className="section-heading">Spell Slots</h3>
              <div className="flex flex-col gap-1.5">
                {member.spellSlots.map((s) => {
                  const available = s.max - s.used;
                  return (
                    <div key={`s-${s.level}`} className="flex items-center gap-2">
                      <span className="w-6 text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                        L{s.level}
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
                      <span className="w-6 text-[10px] font-mono font-semibold uppercase tracking-wider text-accent">
                        P{s.level}
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
            </div>
          )}

          {(member.senses.length > 0 || member.passivePerception != null) && (
            <div className="mt-5">
              <h3 className="section-heading">Senses</h3>
              <div className="flex flex-col gap-1">
                {[
                  { label: "Passive Perception", value: member.passivePerception },
                  { label: "Passive Investigation", value: member.passiveInvestigation },
                  { label: "Passive Insight", value: member.passiveInsight },
                ].filter((p) => p.value != null).map((p) => (
                  <div
                    key={p.label}
                    className="flex items-center gap-2 rounded-md border border-accent/15 bg-black/30 px-2 py-1.5"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded border border-primary/40 bg-primary/10 text-xs font-mono font-bold text-primary">
                      {p.value}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {p.label}
                    </span>
                  </div>
                ))}
                {member.senses.length > 0 && (
                  <div className="mt-1 text-center text-[10px] italic text-muted-foreground">
                    {member.senses.map((s) => `${s.name}${s.value != null ? ` ${s.value} ft.` : ""}`).join(" • ")}
                  </div>
                )}
              </div>
            </div>
          )}

          {profSkills.length > 0 && (
            <div className="mt-5">
              <h3 className="section-heading">Masteries</h3>
              <div className="flex flex-wrap gap-1.5">
                {profSkills.map((s) => {
                  const mark = s.proficiency === "expertise" ? "★" : s.proficiency === "half" ? "◐" : "●";
                  return (
                    <span
                      key={s.key}
                      className="inline-flex items-center gap-1.5 rounded-md border border-primary/25 bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary"
                    >
                      <span className="text-primary/80">{mark}</span>
                      <span>{s.name}</span>
                      <span className="text-primary/70 font-mono">{fmt(s.modifier)}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-accent/20 bg-black/40 px-1 py-2.5 ring-1 ring-inset ring-accent/5">
      <div className="text-[9px] font-bold uppercase tracking-wider text-accent/70">
        {label}
      </div>
      <div className="text-base font-bold text-foreground leading-tight">{value}</div>
    </div>
  );
}
