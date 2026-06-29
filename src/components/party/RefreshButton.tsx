import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { partyQueryOptions } from "@/lib/party";
import { getParty } from "@/lib/dndbeyond.functions";

export function RefreshButton({ ids, className }: { ids: number[]; className?: string }) {
  const qc = useQueryClient();
  const { data, isFetching } = useSuspenseQuery(partyQueryOptions(ids));
  const fetchedAt = new Date(data.fetchedAt);
  return (
    <button
      onClick={() => {
        getParty({ data: { ids, force: true } }).finally(() => {
          qc.invalidateQueries({ queryKey: ["party", ids] });
        });
      }}
      disabled={isFetching}
      className={
        className ||
        "rounded border border-border bg-secondary/60 px-2 py-1 text-foreground hover:border-accent/60 disabled:opacity-50"
      }
      title={`Last fetched ${fetchedAt.toLocaleTimeString()}`}
    >
      {isFetching ? "Refreshing…" : "↻ Refresh"}
    </button>
  );
}
