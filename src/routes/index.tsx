import { createFileRoute } from "@tanstack/react-router";
import { partyQueryOptions, getStoredIdsServer, readStoredIdsFromCookie } from "@/lib/party";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mother of Bob (MOB) — Party Stats" },
      {
        name: "description",
        content: "Live stats for the Mother of Bob (MOB) party, pulled from D&D Beyond.",
      },
      { property: "og:title", content: "Mother of Bob (MOB)" },
      { property: "og:description", content: "Live D&D party stats for MOB." },
    ],
  }),
  loader: async ({ context }) => {
    let ids: number[] | null = null;
    if (typeof window === "undefined") {
      ids = await getStoredIdsServer();
    } else {
      ids = readStoredIdsFromCookie();
    }
    await context.queryClient.prefetchQuery(partyQueryOptions(ids));
    return { ids };
  },
});
