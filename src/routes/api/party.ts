import { createFileRoute } from "@tanstack/react-router";
import { loadParty } from "@/lib/dndbeyond.functions";

export const Route = createFileRoute("/api/party")({
  server: {
    handlers: {
      GET: async () => {
        const members = await loadParty();
        return new Response(JSON.stringify({ members, fetchedAt: new Date().toISOString() }), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=10",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
