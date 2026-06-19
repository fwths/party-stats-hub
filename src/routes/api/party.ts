import { createFileRoute } from "@tanstack/react-router";
import { loadParty } from "@/lib/dndbeyond.server";

export const Route = createFileRoute("/api/party")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { isAuthenticated } = await import("@/lib/auth.server");
        if (!(await isAuthenticated(request.headers))) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const members = await loadParty();
        return new Response(JSON.stringify({ members, fetchedAt: new Date().toISOString() }), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=10",
          },
        });
      },
    },
  },
});
