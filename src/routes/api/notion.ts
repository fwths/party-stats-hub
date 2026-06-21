import { createFileRoute } from "@tanstack/react-router";
import { createNotionPage, getNotionData } from "@/lib/notion/client.server";
import { getKv, setKv } from "@/lib/db.server";

async function requireAuthenticated(request: Request): Promise<Response | null> {
  const { isAuthenticated } = await import("@/lib/auth.server");
  if (await isAuthenticated(request.headers)) return null;
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/notion")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const unauthorized = await requireAuthenticated(request);
          if (unauthorized) return unauthorized;

          const body = await request.json();
          const { parentId, parentType, title, markdown } = body;
          let token =
            request.headers.get("Authorization")?.replace("Bearer ", "") || body.token || "";
          if (!token || token === "default") {
            token = process.env.NOTION_TOKEN || process.env.NOTION_API_KEY || "";
          }

          if (!token || !parentId || !title) {
            return new Response(
              JSON.stringify({ error: "Missing required fields: token, parentId, or title." }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const result = await createNotionPage({ token, parentId, parentType, title, markdown });
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message || "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
      GET: async ({ request }) => {
        const unauthorized = await requireAuthenticated(request);
        if (unauthorized) return unauthorized;

        const url = new URL(request.url);
        let token = request.headers.get("Authorization")?.replace("Bearer ", "") || "";
        if (!token || token === "default") {
          token = process.env.NOTION_TOKEN || process.env.NOTION_API_KEY || "";
        }
        const pageId = url.searchParams.get("pageId");
        const parentId = url.searchParams.get("parentId");
        const parentType = url.searchParams.get("parentType");

        // Generate cache key based on query parameters
        let cacheKey = "notion:";
        if (pageId) {
          const isDatabase = url.searchParams.get("isDatabase") === "true";
          cacheKey += `page:${pageId}:${isDatabase}`;
        } else if (
          parentId &&
          parentId !== "workspace" &&
          parentId !== "undefined" &&
          parentId !== "null" &&
          parentId.trim() !== ""
        ) {
          cacheKey += `parent:${parentId}:${parentType}`;
        } else {
          const searchQuery = url.searchParams.get("searchQuery") || "";
          const workspaceSearch = url.searchParams.get("workspaceSearch") === "true";
          cacheKey += `search:${workspaceSearch}:${searchQuery}`;
        }

        const getCachedResponse = async () => {
          try {
            const cachedData = await getKv(cacheKey);
            if (cachedData) {
              const parsed = JSON.parse(cachedData);
              return new Response(JSON.stringify({ ...parsed, success: true, fromCache: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              });
            }
          } catch (err) {
            console.warn("Failed to read from cache:", err);
          }
          return null;
        };

        if (!token) {
          const cached = await getCachedResponse();
          if (cached) return cached;
          return new Response(JSON.stringify({ error: "Missing token parameter." }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const result = await getNotionData(token, url.searchParams);
          const bodyText = JSON.stringify(result);
          await setKv(cacheKey, bodyText).catch((err) =>
            console.warn("Failed to write to cache:", err),
          );

          return new Response(bodyText, {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          const cached = await getCachedResponse();
          if (cached) {
            console.info(`Notion fetch failed (${e.message}), serving from cache.`);
            return cached;
          }
          return new Response(JSON.stringify({ error: e.message || "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
