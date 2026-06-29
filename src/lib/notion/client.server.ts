import {
  parseMarkdownToNotionBlocks,
  parseNotionBlocksToMarkdown,
  resolveBlockChildrenRecursive,
  sortDatabaseResults,
  sortColumnKeys,
  getPropertyValueText,
  fetchBlockChildren,
  downloadAndLocalizeFile,
} from "./index";

export async function createNotionPage({
  token,
  parentId,
  parentType,
  title,
  markdown,
}: {
  token: string;
  parentId: string;
  parentType: "page" | "database" | "workspace";
  title: string;
  markdown: string;
}) {
  const blocks = parseMarkdownToNotionBlocks(markdown || "");
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
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || "Failed to create page in Notion.");
  }

  const pageData = await response.json();
  const pageId = pageData.id;

  let currentIdx = 100;
  while (currentIdx < blocks.length) {
    const nextBatch = blocks.slice(currentIdx, currentIdx + 100);
    const appendResponse = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        children: nextBatch,
      }),
    });
    if (!appendResponse.ok) {
      console.warn("Failed to append all blocks to Notion page:", await appendResponse.text());
      break;
    }
    currentIdx += 100;
  }

  return {
    success: true,
    url: pageData.url || `https://notion.so/${pageId.replace(/-/g, "")}`,
    id: pageId,
  };
}

async function fetchAndFormatDatabase(token: string, databaseId: string) {
  const dbResponse = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      page_size: 100,
    }),
  });

  if (!dbResponse.ok) return null;

  const dbData = await dbResponse.json();

  let dbTitle = "Database Entries";
  try {
    const dbInfoResponse = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
      },
    });
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
    const firstEntry = results[0];
    const properties = firstEntry.properties || {};
    const titleKey =
      Object.keys(properties).find((key) => properties[key].type === "title") || "Name";

    const rawColumnKeys = Object.keys(properties).filter((key) => key !== titleKey);
    const columnKeys = sortColumnKeys(rawColumnKeys, dbTitle);

    markdown += `| ${titleKey} | ${columnKeys.join(" | ")} |\n`;
    markdown += `| ${"--- | ".repeat(columnKeys.length + 1)}\n`;

    for (const entry of results) {
      const props = entry.properties || {};
      let title = "Untitled";
      const titleProp = props[titleKey];
      if (titleProp && titleProp.title && titleProp.title.length > 0) {
        title = titleProp.title.map((t: any) => t.plain_text).join("");
      }

      const titleLink = `[${title}](pageId:${entry.id})`;
      const cellValues = columnKeys.map((key: string) => getPropertyValueText(props[key]));
      markdown += `| ${titleLink} | ${cellValues.join(" | ")} |\n`;
    }
  }

  return { success: true, markdown };
}

export async function getNotionData(token: string, searchParams: URLSearchParams) {
  const pageId = searchParams.get("pageId");
  const parentId = searchParams.get("parentId");
  const parentType = searchParams.get("parentType");

  // Case 1: Fetch specific page content
  if (pageId) {
    const isDatabase = searchParams.get("isDatabase") === "true";

    if (isDatabase) {
      const res = await fetchAndFormatDatabase(token, pageId);
      if (res) return res;
    }

    const blocksPromise = fetchBlockChildren(token, pageId);

    const pageObjResponsePromise = fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
      },
    }).catch(() => null);

    const [rawBlocksResult, pageObjResponse] = await Promise.all([
      blocksPromise.catch(() => null),
      pageObjResponsePromise,
    ]);

    let rawBlocks = rawBlocksResult;
    if (!rawBlocks) {
      const dbResponse = await fetchAndFormatDatabase(token, pageId);
      if (dbResponse) return dbResponse;
      throw new Error("Failed to fetch content from Notion.");
    }

    if (rawBlocks.length === 0) {
      const dbResponse = await fetchAndFormatDatabase(token, pageId);
      if (dbResponse) return dbResponse;
    }

    let parentDb = null;
    let cover: string | null = null;
    let icon: { type: "emoji"; emoji: string } | { type: "file"; url: string } | null = null;

    if (pageObjResponse && pageObjResponse.ok) {
      try {
        const pageObj = await pageObjResponse.json();

        // 1. Resolve page cover
        if (pageObj.cover) {
          const coverUrl =
            pageObj.cover.type === "external"
              ? pageObj.cover.external?.url
              : pageObj.cover.file?.url;
          if (coverUrl) {
            cover = await downloadAndLocalizeFile(coverUrl, "cover", pageId);
          }
        }

        // 2. Resolve page icon
        if (pageObj.icon) {
          if (pageObj.icon.type === "emoji") {
            icon = { type: "emoji", emoji: pageObj.icon.emoji };
          } else {
            const iconUrl =
              pageObj.icon.type === "external"
                ? pageObj.icon.external?.url
                : pageObj.icon.file?.url;
            if (iconUrl) {
              const localIconUrl = await downloadAndLocalizeFile(iconUrl, "icon", pageId);
              if (localIconUrl) {
                icon = { type: "file", url: localIconUrl };
              }
            }
          }
        }

        if (pageObj.parent?.type === "database_id") {
          const parentDbId = pageObj.parent.database_id;
          const dbInfoResponse = await fetch(`https://api.notion.com/v1/databases/${parentDbId}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Notion-Version": "2022-06-28",
            },
          });
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

    return { success: true, markdown, parentDb, cover, icon };
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
      const childBlocks = await fetchBlockChildren(token, parentId);

      const pages = childBlocks
        .filter((block: any) => block.type === "child_page" || block.type === "child_database")
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

      return { success: true, pages };
    } else {
      // parentType === "database"
      const queryResponse = await fetch(`https://api.notion.com/v1/databases/${parentId}/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page_size: 100,
        }),
      });

      if (!queryResponse.ok) {
        const errData = await queryResponse.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to query Notion database.");
      }

      const queryData = await queryResponse.json();

      let dbTitle = "Database";
      try {
        const dbInfoResponse = await fetch(`https://api.notion.com/v1/databases/${parentId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Notion-Version": "2022-06-28",
          },
        });
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

      const pages = await Promise.all(
        sortedResults.map(async (page: any) => {
          let title = "Untitled";
          const titleProp =
            page.properties?.Name ||
            page.properties?.title ||
            Object.values(page.properties || {}).find((p: any) => p.type === "title");

          if (titleProp && titleProp.title && titleProp.title.length > 0) {
            title = titleProp.title.map((t: any) => t.plain_text).join("");
          }

          let cover = null;
          if (page.cover) {
            const coverUrl =
              page.cover.type === "external" ? page.cover.external?.url : page.cover.file?.url;
            if (coverUrl) {
              cover = await downloadAndLocalizeFile(coverUrl, "cover", page.id);
            }
          }

          let icon = null;
          if (page.icon) {
            if (page.icon.type === "emoji") {
              icon = { type: "emoji", emoji: page.icon.emoji };
            } else {
              const iconUrl =
                page.icon.type === "external" ? page.icon.external?.url : page.icon.file?.url;
              if (iconUrl) {
                const localIconUrl = await downloadAndLocalizeFile(iconUrl, "icon", page.id);
                if (localIconUrl) {
                  icon = { type: "file", url: localIconUrl };
                }
              }
            }
          }

          return {
            id: page.id,
            title,
            url: page.url,
            parent: page.parent,
            object: page.object || "page",
            createdAt: page.created_time,
            cover,
            icon,
          };
        }),
      );

      return { success: true, pages };
    }
  }

  // Case 3: Search whole workspace
  const searchQuery = searchParams.get("searchQuery");
  const workspaceSearch = searchParams.get("workspaceSearch") === "true";
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
        throw new Error(errData.message || "Failed to search Notion workspace.");
      }

      const searchData = await searchResponse.json();
      allResults.push(...(searchData.results || []));

      hasMore = searchData.has_more;
      startCursor = searchData.next_cursor || undefined;

      if (allResults.length >= 1000) {
        break;
      }
    }

    const pages = await Promise.all(
      allResults
        .filter((page: any) => {
          if (!searchQuery && page.object === "page" && page.parent?.type === "database_id") {
            return false;
          }
          return true;
        })
        .map(async (page: any) => {
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

          let cover = null;
          if (page.cover) {
            const coverUrl =
              page.cover.type === "external" ? page.cover.external?.url : page.cover.file?.url;
            if (coverUrl) {
              cover = await downloadAndLocalizeFile(coverUrl, "cover", page.id);
            }
          }

          let icon = null;
          if (page.icon) {
            if (page.icon.type === "emoji") {
              icon = { type: "emoji", emoji: page.icon.emoji };
            } else {
              const iconUrl =
                page.icon.type === "external" ? page.icon.external?.url : page.icon.file?.url;
              if (iconUrl) {
                const localIconUrl = await downloadAndLocalizeFile(iconUrl, "icon", page.id);
                if (localIconUrl) {
                  icon = { type: "file", url: localIconUrl };
                }
              }
            }
          }

          return {
            id: page.id,
            title,
            url: page.url,
            parent: page.parent,
            object: page.object,
            createdAt: page.last_edited_time || page.created_time,
            cover,
            icon,
          };
        }),
    );

    return { success: true, pages };
  }

  throw new Error("Missing pageId or query parameters.");
}
