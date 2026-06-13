import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Suspense, useEffect, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CharacterDetailView } from "@/components/party/CharacterDetailView";
import { PartyGridSkeleton } from "@/components/party/PartyGrid";
import {
  partyQueryOptions,
  readStoredIds,
  getStoredIdsServer,
  readStoredIdsFromCookie,
} from "@/lib/party";
import { PARTY_CHARACTER_IDS } from "@/lib/party-config";
import { ThemeSelector } from "@/components/party/ThemeSelector";

function ErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <main className="min-h-screen p-8 text-foreground">
      <h1 className="text-2xl font-bold mb-2">Failed to load character</h1>
      <p className="text-muted-foreground mb-4">{error.message}</p>
      <button
        onClick={() => {
          router.invalidate();
          reset();
        }}
        className="rounded border border-border bg-secondary/60 px-3 py-1.5 hover:border-accent/60"
      >
        Retry
      </button>
    </main>
  );
}

export const Route = createFileRoute("/character/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Character ${params.id} — Mother of Bob` },
      { name: "description", content: "Detailed character sheet view." },
    ],
  }),
  loader: async ({ params, context }) => {
    let ids: number[] | null = null;
    if (typeof window === "undefined") {
      ids = await getStoredIdsServer();
    } else {
      ids = readStoredIdsFromCookie();
    }
    const charId = Number(params.id);
    const resolvedIds = ids ?? PARTY_CHARACTER_IDS;
    const effectiveIds = resolvedIds.includes(charId) ? resolvedIds : [...resolvedIds, charId];

    await context.queryClient.ensureQueryData(partyQueryOptions(effectiveIds));
    return { ids };
  },
  component: CharacterDetail,
  errorComponent: ErrorFallback,
  notFoundComponent: () => (
    <main className="min-h-screen p-8 text-foreground">
      <h1 className="text-2xl font-bold mb-2">Character not found</h1>
      <Link to="/" className="underline text-accent">
        Back to party
      </Link>
    </main>
  ),
});

function CharacterDetail() {
  const { id } = Route.useParams();
  return (
    <main className="min-h-screen text-foreground animate-fade-in">
      <div className="bg-particles" />
      <div className="bg-particles-2" />
      <TooltipProvider delayDuration={100}>
        <div className="mx-auto max-w-6xl px-4 py-6 relative z-10">
          <header className="mb-6 flex items-center justify-between border-b border-border/50 pb-4">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent"
            >
              <ArrowLeft size={14} /> Back to party
            </Link>
            <div className="flex items-center gap-2">
              <div id="character-header-actions" className="flex items-center" />
              <ThemeSelector />
            </div>
          </header>
          <Suspense fallback={<PartyGridSkeleton />}>
            <CharacterDetailInner />
          </Suspense>
        </div>
      </TooltipProvider>
    </main>
  );
}

function CharacterDetailInner() {
  const { id } = Route.useParams();
  const charId = Number(id);

  // Resolve party ids from loader on first render, fallback to localStorage/defaults.
  const { ids: initialIds } = Route.useLoaderData() as { ids?: number[] | null };
  const [ids, setIds] = useState<number[]>(initialIds ?? PARTY_CHARACTER_IDS);
  useEffect(() => {
    const stored = readStoredIds();
    if (stored) setIds(stored);
  }, []);

  const effectiveIds = ids.includes(charId) ? ids : [...ids, charId];
  const { data } = useSuspenseQuery(partyQueryOptions(effectiveIds));
  const member = data.members.find((m) => m.id === charId);

  if (!member) {
    return (
      <div className="rounded-lg border border-border/50 bg-secondary/20 p-6 text-center">
        <h2 className="text-lg font-bold">Character not found</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          No character with id {charId} is in the current party.
        </p>
      </div>
    );
  }

  return <CharacterDetailView member={member} allMembers={data.members} />;
}
