import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { getParty, type PartyMember } from "@/lib/dndbeyond.functions";

const partyQueryOptions = queryOptions({
  queryKey: ["party"],
  queryFn: () => getParty(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Party Stats" },
      { name: "description", content: "Live D&D party stats pulled from D&D Beyond." },
      { property: "og:title", content: "Party Stats" },
      { property: "og:description", content: "Live D&D party stats pulled from D&D Beyond." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(partyQueryOptions),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <header className="mb-6 flex items-baseline justify-between border-b border-border pb-3">
          <h1 className="text-2xl font-semibold tracking-wide text-accent">
            The Party
          </h1>
          <p className="text-xs text-muted-foreground">
            Live from D&amp;D Beyond ·{" "}
            <a className="underline hover:text-accent" href="/api/party">JSON</a>
          </p>
        </header>
        <Suspense fallback={<p className="text-muted-foreground">Summoning heroes…</p>}>
          <PartyGrid />
        </Suspense>
      </div>
    </main>
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

          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Passive Perception</span>
            <span className="font-mono text-foreground">{member.passivePerception}</span>
          </div>
        </>
      )}
    </article>
  );
}
