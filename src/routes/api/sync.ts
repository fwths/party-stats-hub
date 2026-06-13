import { createFileRoute } from "@tanstack/react-router";
import { getAllKv, setKv, deleteKv } from "@/lib/db.server";

export const Route = createFileRoute("/api/sync")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { isAuthenticated } = await import("@/lib/auth.server");
          if (!(await isAuthenticated(request.headers))) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          const data = await getAllKv();
          return new Response(JSON.stringify(data), {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store, max-age=0",
            },
          });
        } catch (err: any) {
          console.error("Error fetching sync database data:", err);
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
      POST: async ({ request }) => {
        try {
          const { isAuthenticated } = await import("@/lib/auth.server");
          if (!(await isAuthenticated(request.headers))) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          const body = await request.json();

          // Handle batch syncs (e.g. initial migration or multiple modifications)
          if (body && Array.isArray(body.batch)) {
            for (const item of body.batch) {
              if (typeof item.key === "string") {
                // Ensure we only store relevant party data key prefixes to protect database integrity
                const isAllowedKey =
                  item.key.startsWith("party-stats:") ||
                  item.key === "mob.conditions.v1" ||
                  item.key === "mob.partyIds.v1";

                if (isAllowedKey) {
                  if (item.value === null) {
                    await deleteKv(item.key);
                  } else {
                    await setKv(item.key, item.value);
                  }
                }
              }
            }
            return new Response(JSON.stringify({ success: true, count: body.batch.length }), {
              headers: { "Content-Type": "application/json" },
            });
          }

          // Handle single sync
          const { key, value } = body;
          if (typeof key !== "string") {
            return new Response(JSON.stringify({ error: "Invalid key parameter" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const isAllowedKey =
            key.startsWith("party-stats:") ||
            key === "mob.conditions.v1" ||
            key === "mob.partyIds.v1";

          if (!isAllowedKey) {
            return new Response(JSON.stringify({ error: "Unauthorized key prefix" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          if (value === null) {
            await deleteKv(key);
          } else {
            await setKv(key, value);
          }

          return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          console.error("Error writing sync database data:", err);
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
