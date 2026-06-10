import { useSuspenseQuery } from "@tanstack/react-query";
import { partyQueryOptions } from "@/lib/party";
import { Skeleton } from "@/components/ui/skeleton";
import { CharacterCard } from "./CharacterCard";

export function PartyGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <article key={i} className="card-arcane relative overflow-hidden rounded-xl border border-border/40 p-4 shadow-lg">
          <div className="flex gap-3">
            <Skeleton className="h-16 w-16 rounded-md" />
            <div className="space-y-2 flex-1 pt-1">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex gap-1 mt-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          </div>
          <div className="mt-8 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-4" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>
          <div className="grid grid-cols-4 gap-1.5 mt-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          <div className="grid grid-cols-6 gap-1.5 mt-4">
            {Array.from({ length: 6 }).map((_, j) => (
              <Skeleton key={j} className="h-14 w-full" />
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

export function PartyGrid({ ids }: { ids: number[] }) {
  const { data } = useSuspenseQuery(partyQueryOptions(ids));
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.members.map((m) => (
        <CharacterCard key={m.id} member={m} />
      ))}
    </div>
  );
}