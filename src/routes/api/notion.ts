import { createFileRoute } from "@tanstack/react-router";
import {
  parseMarkdownToNotionBlocks,
  parseNotionBlocksToMarkdown,
  resolveBlockChildrenRecursive,
  sortDatabaseResults,
  sortColumnKeys,
  getPropertyValueText,
} from "@/lib/notion";
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
          let token = body.token || "";
          if (!token || token === "default") {
            token = process.env.NOTION_TOKEN || process.env.NOTION_API_KEY || "";
          }

          if (!token || !parentId || !title) {
            return new Response(
              JSON.stringify({ error: "Missing required fields: token, parentId, or title." }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          // Parse markdown content into structured Notion blocks
          const blocks = parseMarkdownToNotionBlocks(markdown || "");

          // Set parent context based on parentType
          const parent = parentType === "page" ? { page_id: parentId } : { database_id: parentId };
          const titleKey = parentType === "page" ? "title" : "Name";

          const properties = {
            [titleKey]: {
              title: [
                {
                  text: {
                    content: title,
                  },
                },
              ],
            },
          };

          // 1. Create page with the first batch of blocks (up to 100 blocks is Notion's limit)
          const firstBatch = blocks.slice(0, 100);

          const response = await fetch("https://api.notion.com/v1/pages", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Notion-Version": "2022-06-28",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              parent,
              properties,
              children:
                firstBatch.length > 0
                  ? firstBatch
                  : [
                      {
                        object: "block",
                        type: "paragraph",
                        paragraph: { rich_text: [] },
                      },
                    ],
            }),
          });

          if (!response.ok) {
            const errData = await response.json();
            return new Response(
              JSON.stringify({ error: errData.message || "Failed to create page in Notion." }),
              { status: response.status, headers: { "Content-Type": "application/json" } },
            );
          }

          const pageData = await response.json();
          const pageId = pageData.id;

          // 2. Append any remaining blocks in chunks of 100
          let currentIdx = 100;
          while (currentIdx < blocks.length) {
            const nextBatch = blocks.slice(currentIdx, currentIdx + 100);
            const appendResponse = await fetch(
              `https://api.notion.com/v1/blocks/${pageId}/children`,
              {
                method: "PATCH",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Notion-Version": "2022-06-28",
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  children: nextBatch,
                }),
              },
            );
            if (!appendResponse.ok) {
              console.warn(
                "Failed to append all blocks to Notion page:",
                await appendResponse.text(),
              );
              break;
            }
            currentIdx += 100;
          }

          return new Response(
            JSON.stringify({
              success: true,
              url: pageData.url || `https://notion.so/${pageId.replace(/-/g, "")}`,
              id: pageId,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
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
        let token = url.searchParams.get("token") || "";
        if (!token || token === "default") {
          token = process.env.NOTION_TOKEN || process.env.NOTION_API_KEY || "";
        }
        const pageId = url.searchParams.get("pageId");
        const parentId = url.searchParams.get("parentId");
        const parentType = url.searchParams.get("parentType");

        // Generate cache key based on query parameters (excluding token)
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

        const executeAndCache = async () => {
          try {
            const response = await (async () => {
              try {
                // Case 1: Fetch content of a specific page and convert to markdown
                if (pageId) {
                  const isDatabase = url.searchParams.get("isDatabase") === "true";

                  // Helper to execute database query and format as markdown table
                  const fetchAndFormatDatabase = async () => {
                    const dbResponse = await fetch(
                      `https://api.notion.com/v1/databases/${pageId}/query`,
                      {
                        method: "POST",
                        headers: {
                          Authorization: `Bearer ${token}`,
                          "Notion-Version": "2022-06-28",
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          page_size: 100,
                        }),
                      },
                    );

                    if (dbResponse.ok) {
                      const dbData = await dbResponse.json();

                      // Retrieve database details to get its name/title
                      let dbTitle = "Database Entries";
                      try {
                        const dbInfoResponse = await fetch(
                          `https://api.notion.com/v1/databases/${pageId}`,
                          {
                            method: "GET",
                            headers: {
                              Authorization: `Bearer ${token}`,
                              "Notion-Version": "2022-06-28",
                            },
                          },
                        );
                        if (dbInfoResponse.ok) {
                          const dbInfo = await dbInfoResponse.json();
                          if (dbInfo.title && dbInfo.title.length > 0) {
                            dbTitle = dbInfo.title.map((t: any) => t.plain_text).join("");
                          }
                        }
                      } catch (err) {
                        console.warn("Failed to fetch database title:", err);
                      }

                      const results = sortDatabaseResults(dbData.results || [], dbTitle);
                      let markdown = "";

                      if (results.length === 0) {
                        markdown = `# Database Entries\n\n*No entries found in this database.*\n`;
                      } else {
                        // Extract property column names
                        const firstEntry = results[0];
                        const properties = firstEntry.properties || {};

                        // Find the title key
                        const titleKey =
                          Object.keys(properties).find((key) => properties[key].type === "title") ||
                          "Name";

                        // Collect other column keys, excluding only the title key, sorted by preferred order
                        const rawColumnKeys = Object.keys(properties).filter(
                          (key) => key !== titleKey,
                        );
                        const columnKeys = sortColumnKeys(rawColumnKeys, dbTitle);

                        // Create table headers
                        markdown += `| ${titleKey} | ${columnKeys.join(" | ")} |\n`;
                        markdown += `| ${"--- | ".repeat(columnKeys.length + 1)}\n`;

                        // Create rows
                        for (const entry of results) {
                          const props = entry.properties || {};

                          let title = "Untitled";
                          const titleProp = props[titleKey];
                          if (titleProp && titleProp.title && titleProp.title.length > 0) {
                            title = titleProp.title.map((t: any) => t.plain_text).join("");
                          }

                          // Clickable subpage button formatting in table cells
                          const titleLink = `[${title}](pageId:${entry.id})`;

                          const cellValues = columnKeys.map((key: string) => {
                            return getPropertyValueText(props[key]);
                          });

                          markdown += `| ${titleLink} | ${cellValues.join(" | ")} |\n`;
                        }
                      }

                      return new Response(JSON.stringify({ success: true, markdown }), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                      });
                    }
                    return null;
                  };

                  if (isDatabase) {
                    const response = await fetchAndFormatDatabase();
                    if (response) return response;
                  }

                  // Fetch blocks and page object in parallel to check for a parent database
                  const blocksResponsePromise = fetch(
                    `https://api.notion.com/v1/blocks/${pageId}/children`,
                    {
                      method: "GET",
                      headers: {
                        Authorization: `Bearer ${token}`,
                        "Notion-Version": "2022-06-28",
                      },
                    },
                  );

                  const pageObjResponsePromise = fetch(
                    `https://api.notion.com/v1/pages/${pageId}`,
                    {
                      method: "GET",
                      headers: {
                        Authorization: `Bearer ${token}`,
                        "Notion-Version": "2022-06-28",
                      },
                    },
                  ).catch(() => null);

                  const [blocksResponse, pageObjResponse] = await Promise.all([
                    blocksResponsePromise,
                    pageObjResponsePromise,
                  ]);

                  if (!blocksResponse.ok) {
                    const dbResponse = await fetchAndFormatDatabase();
                    if (dbResponse) return dbResponse;

                    const errData = await blocksResponse.json().catch(() => ({}));
                    return new Response(
                      JSON.stringify({
                        error: errData.message || "Failed to fetch content from Notion.",
                      }),
                      {
                        status: blocksResponse.status,
                        headers: { "Content-Type": "application/json" },
                      },
                    );
                  }

                  const blocksData = await blocksResponse.json();
                  const rawBlocks = blocksData.results || [];

                  // Failsafe: Notion can return 200 OK with 0 results for databases in blocks API
                  if (rawBlocks.length === 0) {
                    const dbResponse = await fetchAndFormatDatabase();
                    if (dbResponse) return dbResponse;
                  }

                  // Resolve parent database details if the page has a database parent
                  let parentDb = null;
                  if (pageObjResponse && pageObjResponse.ok) {
                    try {
                      const pageObj = await pageObjResponse.json();
                      if (pageObj.parent?.type === "database_id") {
                        const parentDbId = pageObj.parent.database_id;
                        const dbInfoResponse = await fetch(
                          `https://api.notion.com/v1/databases/${parentDbId}`,
                          {
                            method: "GET",
                            headers: {
                              Authorization: `Bearer ${token}`,
                              "Notion-Version": "2022-06-28",
                            },
                          },
                        );
                        if (dbInfoResponse.ok) {
                          const dbInfo = await dbInfoResponse.json();
                          let dbTitle = "Database";
                          if (dbInfo.title && dbInfo.title.length > 0) {
                            dbTitle = dbInfo.title.map((t: any) => t.plain_text).join("");
                          }
                          parentDb = {
                            id: parentDbId,
                            title: dbTitle,
                          };
                        }
                      }
                    } catch (err) {
                      console.warn("Failed to parse parent database details:", err);
                    }
                  }

                  const resolvedBlocks = await resolveBlockChildrenRecursive(token, rawBlocks);
                  const markdown = parseNotionBlocksToMarkdown(resolvedBlocks);

                  return new Response(JSON.stringify({ success: true, markdown, parentDb }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                  });
                }

                // Case 2: Query database entries or page child blocks
                if (
                  parentId &&
                  parentId !== "workspace" &&
                  parentId !== "undefined" &&
                  parentId !== "null" &&
                  parentId.trim() !== ""
                ) {
                  if (parentType === "page") {
                    const blocksResponse = await fetch(
                      `https://api.notion.com/v1/blocks/${parentId}/children`,
                      {
                        method: "GET",
                        headers: {
                          Authorization: `Bearer ${token}`,
                          "Notion-Version": "2022-06-28",
                        },
                      },
                    );

                    if (!blocksResponse.ok) {
                      const errData = await blocksResponse.json().catch(() => ({}));
                      return new Response(
                        JSON.stringify({
                          error: errData.message || "Failed to fetch page blocks from Notion.",
                        }),
                        {
                          status: blocksResponse.status,
                          headers: { "Content-Type": "application/json" },
                        },
                      );
                    }

                    const blocksData = await blocksResponse.json();
                    const childBlocks = blocksData.results || [];

                    // Filter blocks of type child_page and child_database to show in sidebar
                    const pages = childBlocks
                      .filter(
                        (block: any) =>
                          block.type === "child_page" || block.type === "child_database",
                      )
                      .map((block: any) => {
                        const type = block.type;
                        const title = block[type]?.title || "Untitled";
                        return {
                          id: block.id,
                          title,
                          url: `https://notion.so/${block.id.replace(/-/g, "")}`,
                          parent: { type: "page_id", page_id: parentId },
                          object: type === "child_database" ? "database" : "page",
                          createdAt: block.created_time,
                        };
                      });

                    return new Response(JSON.stringify({ success: true, pages }), {
                      status: 200,
                      headers: { "Content-Type": "application/json" },
                    });
                  } else {
                    // parentType === "database"
                    const queryResponse = await fetch(
                      `https://api.notion.com/v1/databases/${parentId}/query`,
                      {
                        method: "POST",
                        headers: {
                          Authorization: `Bearer ${token}`,
                          "Notion-Version": "2022-06-28",
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          page_size: 100,
                        }),
                      },
                    );

                    if (!queryResponse.ok) {
                      const errData = await queryResponse.json();
                      return new Response(
                        JSON.stringify({
                          error: errData.message || "Failed to query Notion database.",
                        }),
                        {
                          status: queryResponse.status,
                          headers: { "Content-Type": "application/json" },
                        },
                      );
                    }

                    const queryData = await queryResponse.json();

                    // Retrieve database details to get its name/title
                    let dbTitle = "Database";
                    try {
                      const dbInfoResponse = await fetch(
                        `https://api.notion.com/v1/databases/${parentId}`,
                        {
                          method: "GET",
                          headers: {
                            Authorization: `Bearer ${token}`,
                            "Notion-Version": "2022-06-28",
                          },
                        },
                      );
                      if (dbInfoResponse.ok) {
                        const dbInfo = await dbInfoResponse.json();
                        if (dbInfo.title && dbInfo.title.length > 0) {
                          dbTitle = dbInfo.title.map((t: any) => t.plain_text).join("");
                        }
                      }
                    } catch (err) {
                      console.warn("Failed to fetch database title:", err);
                    }

                    const sortedResults = sortDatabaseResults(queryData.results || [], dbTitle);

                    const pages = sortedResults.map((page: any) => {
                      let title = "Untitled";
                      const titleProp =
                        page.properties?.Name ||
                        page.properties?.title ||
                        Object.values(page.properties || {}).find((p: any) => p.type === "title");

                      if (titleProp && titleProp.title && titleProp.title.length > 0) {
                        title = titleProp.title.map((t: any) => t.plain_text).join("");
                      }

                      return {
                        id: page.id,
                        title,
                        url: page.url,
                        parent: page.parent,
                        object: page.object || "page",
                        createdAt: page.created_time,
                      };
                    });

                    return new Response(JSON.stringify({ success: true, pages }), {
                      status: 200,
                      headers: { "Content-Type": "application/json" },
                    });
                  }
                }

                // Case 3: Search whole workspace
                const searchQuery = url.searchParams.get("searchQuery");
                const workspaceSearch = url.searchParams.get("workspaceSearch") === "true";
                const hasNoParent =
                  !parentId ||
                  parentId === "workspace" ||
                  parentId === "undefined" ||
                  parentId === "null" ||
                  parentId.trim() === "";

                if (workspaceSearch || hasNoParent || searchQuery !== null) {
                  let hasMore = true;
                  let startCursor: string | undefined = undefined;
                  const allResults: any[] = [];

                  while (hasMore) {
                    const searchBody: any = {
                      sort: {
                        direction: "descending",
                        timestamp: "last_edited_time",
                      },
                      page_size: 100,
                    };

                    if (searchQuery && searchQuery.trim() !== "") {
                      searchBody.query = searchQuery;
                    }
                    if (startCursor) {
                      searchBody.start_cursor = startCursor;
                    }

                    const searchResponse = await fetch("https://api.notion.com/v1/search", {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${token}`,
                        "Notion-Version": "2022-06-28",
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify(searchBody),
                    });

                    if (!searchResponse.ok) {
                      const errData = await searchResponse.json().catch(() => ({}));
                      return new Response(
                        JSON.stringify({
                          error: errData.message || "Failed to search Notion workspace.",
                        }),
                        {
                          status: searchResponse.status,
                          headers: { "Content-Type": "application/json" },
                        },
                      );
                    }

                    const searchData = await searchResponse.json();
                    allResults.push(...(searchData.results || []));

                    hasMore = searchData.has_more;
                    startCursor = searchData.next_cursor || undefined;

                    // Safety limit to prevent extremely long waits (1000 pages limit)
                    if (allResults.length >= 1000) {
                      break;
                    }
                  }

                  const pages = allResults
                    .filter((page: any) => {
                      // Exclude pages that are entries inside a database to prevent sidebar clutter,
                      // but include them if the user is actively searching (searchQuery is present).
                      if (
                        !searchQuery &&
                        page.object === "page" &&
                        page.parent?.type === "database_id"
                      ) {
                        return false;
                      }
                      return true;
                    })
                    .map((page: any) => {
                      let title = "Untitled";
                      if (page.object === "database") {
                        if (page.title && page.title.length > 0) {
                          title = page.title.map((t: any) => t.plain_text).join("");
                        }
                      } else {
                        const titleProp =
                          page.properties?.Name ||
                          page.properties?.title ||
                          Object.values(page.properties || {}).find((p: any) => p.type === "title");

                        if (titleProp && titleProp.title && titleProp.title.length > 0) {
                          title = titleProp.title.map((t: any) => t.plain_text).join("");
                        }
                      }

                      return {
                        id: page.id,
                        title,
                        url: page.url,
                        parent: page.parent,
                        object: page.object,
                        createdAt: page.last_edited_time || page.created_time,
                      };
                    });

                  return new Response(JSON.stringify({ success: true, pages }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                  });
                }

                return new Response(
                  JSON.stringify({ error: "Missing pageId or query parameters." }),
                  {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                  },
                );
              } catch (e: any) {
                return new Response(
                  JSON.stringify({ error: e.message || "Internal server error" }),
                  {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                  },
                );
              }
            })();

            if (response.ok) {
              const bodyText = await response.clone().text();
              try {
                const parsed = JSON.parse(bodyText);
                if (parsed.success) {
                  await setKv(cacheKey, bodyText);
                }
              } catch (cacheErr) {
                console.warn("Failed to parse or write response to cache:", cacheErr);
              }
              return response;
            } else {
              const cached = await getCachedResponse();
              if (cached) {
                console.info(`Notion API returned status ${response.status}, serving from cache.`);
                return cached;
              }
              return response;
            }
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
        };

        return await executeAndCache();
      },
    },
  },
});
