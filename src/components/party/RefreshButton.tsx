import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { partyQueryOptions } from "@/lib/party";

export function RefreshButton({ ids }: { ids: number[] }) {
  const qc = useQueryClient();
  const { data, isFetching } = useSuspenseQuery(partyQueryOptions(ids));
  const fetchedAt = new Date(data.fetchedAt);
  return (
    <button
      onClick={() => qc.invalidateQueries({ queryKey: ["party", ids] })}
      disabled={isFetching}
      className="rounded border border-border bg-secondary/60 px-2 py-1 text-foreground hover:border-accent/60 disabled:opacity-50"
      title={`Last fetched ${fetchedAt.toLocaleTimeString()}`}
    >
      {isFetching ? "Refreshing…" : "↻ Refresh"}
    </button>
  );
}