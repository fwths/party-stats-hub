import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
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
  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-md transition-colors hover:border-accent/60">
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
          <a
            href={member.readonlyUrl}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-lg font-semibold text-accent hover:underline"
          >
            {member.name}
          </a>
          <p className="truncate text-xs text-muted-foreground">
            {member.race} · {member.classes}
          </p>
          {member.error ? (
            <p className="mt-1 text-xs text-destructive">{member.error}</p>
          ) : null}
        </div>
      </div>

      {!member.error && (
        <>
          <div className="mt-4">
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <span className="font-medium text-muted-foreground">HP</span>
              <span className="font-mono text-foreground">
                {member.hpCurrent} / {member.hpMax}
                {member.tempHp > 0 ? (
                  <span className="ml-1 text-accent">+{member.tempHp}</span>
                ) : null}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${hpPct}%` }}
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-1.5 text-center">
            <Stat label="AC" value={member.armorClass} />
            <Stat label="Init" value={fmt(member.initiative)} />
            <Stat label="Speed" value={`${member.speed}ft`} />
            <Stat label="Prof" value={fmt(member.proficiencyBonus)} />
          </div>

          <div className="mt-4 grid grid-cols-6 gap-1.5">
            {member.abilities.map((a) => (
              <div
                key={a.name}
                className="rounded border border-border bg-secondary/60 px-1 py-2 text-center"
              >
                <div className="text-[10px] font-semibold tracking-wider text-muted-foreground">
                  {a.name}
                </div>
                <div className="text-base font-bold text-foreground leading-tight">
                  {a.score}
                </div>
                <div className="text-[10px] font-mono text-accent">
                  {a.modifier >= 0 ? `+${a.modifier}` : a.modifier}
                </div>
              </div>
            ))}
          </div>


          {member.saves.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Saving Throws
              </div>
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
            </div>
          )}

          {(member.spellSlots.length > 0 || member.pactSlots.length > 0) && (
            <div className="mt-3">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Spell Slots
              </div>
              <div className="flex flex-wrap gap-1">
                {member.spellSlots.map((s) => (
                  <span
                    key={`s-${s.level}`}
                    className="rounded border border-border bg-secondary/60 px-1.5 py-0.5 text-[11px] font-mono text-foreground"
                    title={`Level ${s.level}: ${s.max - s.used}/${s.max} remaining`}
                  >
                    L{s.level}: {s.max - s.used}/{s.max}
                  </span>
                ))}
                {member.pactSlots.map((s) => (
                  <span
                    key={`p-${s.level}`}
                    className="rounded border border-accent/60 bg-accent/10 px-1.5 py-0.5 text-[11px] font-mono text-foreground"
                    title={`Pact (L${s.level}): ${s.max - s.used}/${s.max} remaining`}
                  >
                    Pact L{s.level}: {s.max - s.used}/{s.max}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(member.senses.length > 0 || member.passivePerception != null) && (
            <div className="mt-3">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Senses
              </div>
              <div className="flex flex-wrap gap-1">
                {member.passivePerception != null && (
                  <span className="rounded border border-border bg-secondary/60 px-1.5 py-0.5 text-[11px] text-foreground">
                    Passive Perception {member.passivePerception}
                  </span>
                )}
                {member.passiveInvestigation != null && (
                  <span className="rounded border border-border bg-secondary/60 px-1.5 py-0.5 text-[11px] text-foreground">
                    Passive Investigation {member.passiveInvestigation}
                  </span>
                )}
                {member.passiveInsight != null && (
                  <span className="rounded border border-border bg-secondary/60 px-1.5 py-0.5 text-[11px] text-foreground">
                    Passive Insight {member.passiveInsight}
                  </span>
                )}
                {member.senses.map((s) => (
                  <span
                    key={s.name}
                    className="rounded border border-border bg-secondary/60 px-1.5 py-0.5 text-[11px] text-foreground"
                  >
                    {s.name}{s.value != null ? ` ${s.value}ft` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {profSkills.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Skills
              </div>
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
            </div>
          )}
        </>
      )}
    </article>
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
