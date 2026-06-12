import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/notion")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { parentId, parentType, title, markdown } = body;
          const token = body.token || "ntn_H95757101687isncEDbBEQfsUR9ddZxFMhpBNsjkarcajU";

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
        try {
          const url = new URL(request.url);
          const token =
            url.searchParams.get("token") || "ntn_H95757101687isncEDbBEQfsUR9ddZxFMhpBNsjkarcajU";
          const pageId = url.searchParams.get("pageId");
          const parentId = url.searchParams.get("parentId");
          const parentType = url.searchParams.get("parentType");

          if (!token) {
            return new Response(JSON.stringify({ error: "Missing token parameter." }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

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
                  const rawColumnKeys = Object.keys(properties).filter((key) => key !== titleKey);
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

                    const cellValues = columnKeys.map((key) => {
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

            const pageObjResponsePromise = fetch(`https://api.notion.com/v1/pages/${pageId}`, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
                "Notion-Version": "2022-06-28",
              },
            }).catch(() => null);

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
                { status: blocksResponse.status, headers: { "Content-Type": "application/json" } },
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
                  (block: any) => block.type === "child_page" || block.type === "child_database",
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
                  JSON.stringify({ error: errData.message || "Failed to query Notion database." }),
                  { status: queryResponse.status, headers: { "Content-Type": "application/json" } },
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
                if (!searchQuery && page.object === "page" && page.parent?.type === "database_id") {
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

          return new Response(JSON.stringify({ error: "Missing pageId or query parameters." }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message || "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});

// Notion Block to Markdown Parser Helper
function parseNotionBlocksToMarkdown(blocks: any[]): string {
  let markdown = "";

  for (const block of blocks) {
    const type = block.type;
    const blockData = block[type];
    if (!blockData) continue;

    const textContent = blockData.rich_text ? extractRichTextContent(blockData.rich_text) : "";

    switch (type) {
      case "heading_1":
        markdown += `# ${textContent}\n\n`;
        break;
      case "heading_2":
        markdown += `## ${textContent}\n\n`;
        break;
      case "heading_3":
        markdown += `### ${textContent}\n\n`;
        break;
      case "bulleted_list_item":
        markdown += `- ${textContent}\n`;
        break;
      case "numbered_list_item":
        markdown += `1. ${textContent}\n`;
        break;
      case "to_do":
        const checked = blockData.checked ? "x" : " ";
        markdown += `- [${checked}] ${textContent}\n`;
        break;
      case "quote":
        markdown += `> ${textContent}\n\n`;
        break;
      case "toggle":
        markdown += `▼ **${textContent}**\n\n`;
        break;
      case "database_table":
        const dbTitle = blockData.title || "Database";
        const dbResults = blockData.results || [];

        markdown += `### 📊 ${dbTitle}\n\n`;

        if (dbResults.length === 0) {
          markdown += `*No entries found in this database.*\n\n`;
        } else {
          const firstEntry = dbResults[0];
          const properties = firstEntry.properties || {};

          const titleKey =
            Object.keys(properties).find((key) => properties[key].type === "title") || "Name";

          const rawColumnKeys = Object.keys(properties).filter((key) => key !== titleKey);
          const columnKeys = sortColumnKeys(rawColumnKeys, dbTitle);

          markdown += `| ${titleKey} | ${columnKeys.join(" | ")} |\n`;
          markdown += `| ${"--- | ".repeat(columnKeys.length + 1)}\n`;

          for (const entry of dbResults) {
            const props = entry.properties || {};
            let title = "Untitled";
            const titleProp = props[titleKey];
            if (titleProp && titleProp.title && titleProp.title.length > 0) {
              title = titleProp.title.map((t: any) => t.plain_text).join("");
            }
            const titleLink = `[${title}](pageId:${entry.id})`;

            const cellValues = columnKeys.map((key) => {
              return getPropertyValueText(props[key]);
            });

            markdown += `| ${titleLink} | ${cellValues.join(" | ")} |\n`;
          }
          markdown += `\n`;
        }
        break;
      case "callout":
        const emoji = blockData.icon?.emoji || "ℹ️";
        markdown += `> [!CALLOUT] ${emoji} ${textContent}\n\n`;
        break;
      case "divider":
        markdown += `---\n\n`;
        break;
      case "child_page":
        markdown += `> [!SUBPAGE] [${blockData.title || "Subpage"}](pageId:${block.id})\n\n`;
        break;
      case "child_database":
        markdown += `> [!DATABASE] [${blockData.title || "Database"}](pageId:${block.id})\n\n`;
        break;
      case "image":
        const imageUrl =
          blockData.type === "external" ? blockData.external?.url : blockData.file?.url;
        if (imageUrl) {
          const caption = blockData.caption ? extractRichTextContent(blockData.caption) : "";
          markdown += `![${caption || "image"}](${imageUrl})\n\n`;
        }
        break;
      case "code":
        const lang = blockData.language || "plain text";
        markdown += `\`\`\`${lang}\n${textContent}\n\`\`\`\n\n`;
        break;
      case "paragraph":
        markdown += `${textContent}\n\n`;
        break;
      default:
        if (blockData.rich_text) {
          markdown += `${textContent}\n\n`;
        }
        break;
    }
  }

  return markdown.trim();
}

function extractRichTextContent(richText: any[]): string {
  if (!richText || !Array.isArray(richText)) return "";
  return richText
    .map((rt: any) => {
      if (rt.type === "mention" && rt.mention?.type === "page" && rt.mention.page?.id) {
        return `[${rt.plain_text || "Page"}](pageId:${rt.mention.page.id})`;
      }
      return rt.plain_text || "";
    })
    .join("");
}

// Basic Markdown to Notion Block Parser
function parseMarkdownToNotionBlocks(markdown: string): any[] {
  const blocks: any[] = [];
  const lines = markdown.split(/\r?\n/);

  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLanguage = "plain text";

  for (let line of lines) {
    const trimmed = line.trim();

    // Check code blocks
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        // Close code block
        blocks.push({
          object: "block",
          type: "code",
          code: {
            language: mapLanguageForNotion(codeLanguage),
            rich_text: [{ type: "text", text: { content: codeBuffer.join("\n") } }],
          },
        });
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        // Start code block
        inCodeBlock = true;
        const lang = trimmed.slice(3).trim();
        codeLanguage = lang || "plain text";
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Headings
    if (trimmed.startsWith("# ")) {
      blocks.push({
        object: "block",
        type: "heading_1",
        heading_1: {
          rich_text: [{ type: "text", text: { content: trimmed.slice(2) } }],
        },
      });
      continue;
    }
    if (trimmed.startsWith("## ")) {
      blocks.push({
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ type: "text", text: { content: trimmed.slice(3) } }],
        },
      });
      continue;
    }
    if (trimmed.startsWith("### ")) {
      blocks.push({
        object: "block",
        type: "heading_3",
        heading_3: {
          rich_text: [{ type: "text", text: { content: trimmed.slice(4) } }],
        },
      });
      continue;
    }

    // Bullet lists
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [{ type: "text", text: { content: trimmed.slice(2) } }],
        },
      });
      continue;
    }

    // Numbered lists
    if (/^\d+\.\s+/.test(trimmed)) {
      blocks.push({
        object: "block",
        type: "numbered_list_item",
        numbered_list_item: {
          rich_text: [{ type: "text", text: { content: trimmed.replace(/^\d+\.\s+/, "") } }],
        },
      });
      continue;
    }

    // Normal paragraph (supports spacer empty lines)
    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: trimmed ? [{ type: "text", text: { content: line } }] : [],
      },
    });
  }

  // Backup for unclosed code blocks
  if (inCodeBlock && codeBuffer.length > 0) {
    blocks.push({
      object: "block",
      type: "code",
      code: {
        language: mapLanguageForNotion(codeLanguage),
        rich_text: [{ type: "text", text: { content: codeBuffer.join("\n") } }],
      },
    });
  }

  return blocks;
}

// Map standard code block languages to Notion accepted languages
function mapLanguageForNotion(lang: string): string {
  const l = lang.toLowerCase();
  const allowed = [
    "abap",
    "arduino",
    "bash",
    "basic",
    "c",
    "clojure",
    "coffeescript",
    "c++",
    "c#",
    "css",
    "dart",
    "diff",
    "docker",
    "elixir",
    "elm",
    "erlang",
    "flow",
    "fortran",
    "f#",
    "gherkin",
    "glsl",
    "go",
    "graphql",
    "groovy",
    "haskell",
    "html",
    "java",
    "javascript",
    "json",
    "julia",
    "kotlin",
    "latex",
    "less",
    "lisp",
    "livescript",
    "lua",
    "makefile",
    "markdown",
    "markup",
    "matlab",
    "mermaid",
    "nix",
    "objective-c",
    "ocaml",
    "pascal",
    "perl",
    "php",
    "plain text",
    "powershell",
    "prolog",
    "protobuf",
    "python",
    "r",
    "reason",
    "ruby",
    "rust",
    "sass",
    "scala",
    "scheme",
    "scss",
    "shell",
    "sql",
    "swift",
    "typescript",
    "vb.net",
    "verilog",
    "vhdl",
    "visual basic",
    "webassembly",
    "xml",
    "yaml",
  ];
  if (allowed.includes(l)) return l;
  if (l === "js") return "javascript";
  if (l === "ts") return "typescript";
  if (l === "py") return "python";
  if (l === "rb") return "ruby";
  if (l === "sh") return "shell";
  return "plain text";
}

async function resolveBlockChildrenRecursive(token: string, blocks: any[]): Promise<any[]> {
  const resolved: any[] = [];
  const containerTypes = ["column_list", "column", "toggle", "synced_block"];

  for (const block of blocks) {
    if (block.type === "child_database") {
      try {
        const dbResponse = await fetch(`https://api.notion.com/v1/databases/${block.id}/query`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ page_size: 100 }),
        });
        if (dbResponse.ok) {
          const dbData = await dbResponse.json();
          const dbTitle = block.child_database.title || "Database";
          const sortedResults = sortDatabaseResults(dbData.results || [], dbTitle);
          resolved.push({
            object: "block",
            type: "database_table",
            database_table: {
              title: dbTitle,
              results: sortedResults,
            },
          });
          continue;
        }
      } catch (e) {
        console.warn("Failed to fetch inline database block query:", block.id, e);
      }
    }

    resolved.push(block);

    if (block.has_children && containerTypes.includes(block.type)) {
      try {
        const response = await fetch(`https://api.notion.com/v1/blocks/${block.id}/children`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Notion-Version": "2022-06-28",
          },
        });
        if (response.ok) {
          const data = await response.json();
          const children = data.results || [];
          const resolvedChildren = await resolveBlockChildrenRecursive(token, children);
          resolved.push(...resolvedChildren);
        }
      } catch (e) {
        console.warn("Failed to resolve sub-blocks of block ID:", block.id, e);
      }
    }
  }

  return resolved;
}

function getPropertyValueText(prop: any): string {
  if (!prop) return "";

  // Failsafe fallback for simple strings or numbers
  if (typeof prop === "string") return prop;
  if (typeof prop === "number") return String(prop);
  if (typeof prop === "boolean") return prop ? "Yes" : "No";

  if (Array.isArray(prop)) {
    return prop
      .map((item) => getPropertyValueText(item))
      .filter(Boolean)
      .join(", ");
  }

  const type = prop.type;
  if (!type) {
    if (prop.plain_text !== undefined) return prop.plain_text;
    if (prop.name !== undefined) return prop.name;
    if (prop.string !== undefined) return prop.string;
    if (prop.number !== undefined) return String(prop.number);
    const values = Object.values(prop);
    if (values.length === 1) return getPropertyValueText(values[0]);
    return "";
  }

  const val = prop[type];
  if (val === undefined || val === null) return "";

  switch (type) {
    case "title":
    case "rich_text":
      // Check if it has page mentions. If so, format them as markdown links and join them with commas
      const hasMentions = (val || []).some(
        (t: any) => t.type === "mention" && t.mention?.type === "page",
      );
      if (hasMentions) {
        return (val || [])
          .map((t: any) => {
            if (t.type === "mention" && t.mention?.type === "page" && t.mention.page?.id) {
              return `[${t.plain_text || "Page"}](pageId:${t.mention.page.id})`;
            }
            const trimmed = (t.plain_text || "").trim();
            if (trimmed === "" || trimmed === ",") return "";
            return trimmed;
          })
          .filter(Boolean)
          .join(", ");
      }
      return (val || []).map((t: any) => t.plain_text || "").join("");
    case "select":
      return val?.name || "";
    case "multi_select":
      return (val || []).map((s: any) => s.name || "").join(", ");
    case "status":
      return val?.name || "";
    case "date":
      return val?.start || "";
    case "number":
      return String(val);
    case "checkbox":
      return val ? "Yes" : "No";
    case "url":
      return val || "";
    case "email":
      return val || "";
    case "phone_number":
      return val || "";
    case "people":
      return (val || []).map((p: any) => p.name || "").join(", ");
    case "relation":
      // Map relation objects. If they contain titles/names, format them, otherwise return empty so they are filtered out
      return (val || [])
        .map((r: any) => {
          if (r.title && Array.isArray(r.title)) {
            return r.title.map((t: any) => t.plain_text || "").join("");
          }
          if (r.plain_text) return r.plain_text;
          return getPropertyValueText(r); // Try to resolve relation fields recursively
        })
        .filter(Boolean)
        .join(", ");
    case "rollup":
      // Rollups can be arrays, strings, numbers, or dates. Format them dynamically.
      if (val && val.type === "array" && Array.isArray(val.array)) {
        return val.array
          .map((item: any) => getPropertyValueText(item))
          .filter(Boolean)
          .join(", ");
      }
      if (val && val.type === "number") return String(val.number);
      if (val && val.type === "string") return val.string || "";
      if (val && val.type === "date") return val.date?.start || "";
      return getPropertyValueText(val); // Fallback to parsing the rollup value object recursively
    default:
      return "";
  }
}

// Dynamically sort database entries depending on properties and title context (matching Notion's UI sorting logic)
function sortDatabaseResults(results: any[], databaseTitle: string): any[] {
  if (!results || results.length <= 1) return results;

  const firstEntry = results[0];
  const properties = firstEntry.properties || {};
  const titleLower = databaseTitle.toLowerCase();

  // NPC Database Exception: Sort by Session property
  if (titleLower.includes("npc")) {
    const sessionKey = Object.keys(properties).find((key) => {
      const name = key.toLowerCase();
      return name === "session" || name.includes("session");
    });

    if (sessionKey) {
      const getSessionVal = (prop: any) => {
        if (!prop) return "";
        const t = prop.type;
        const val = prop[t];
        if (val === undefined || val === null) return "";

        if (t === "number") return val;
        if (t === "select") return val.name || "";
        if (t === "rich_text" || t === "title") {
          return (val || []).map((x: any) => x.plain_text || "").join("");
        }
        if (t === "date") return val.start || "";
        return getPropertyValueText(prop);
      };

      return [...results].sort((a, b) => {
        const valA = getSessionVal(a.properties?.[sessionKey]);
        const valB = getSessionVal(b.properties?.[sessionKey]);

        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB) && valA !== "" && valB !== "") {
          return numA - numB;
        }

        return String(valA).localeCompare(String(valB), undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });
    }

    // Fallback for NPCs: sort by creation time (ascending)
    return [...results].sort((a, b) => {
      const dateA = new Date(a.created_time).getTime();
      const dateB = new Date(b.created_time).getTime();
      return dateA - dateB;
    });
  }

  // General default: sort every database alphabetically by its title/name column
  const titleKey = Object.keys(properties).find((key) => properties[key].type === "title");

  if (titleKey) {
    return [...results].sort((a, b) => {
      const propA = a.properties?.[titleKey];
      const propB = b.properties?.[titleKey];
      const textA = (propA?.title || [])
        .map((t: any) => t.plain_text || "")
        .join("")
        .toLowerCase();
      const textB = (propB?.title || [])
        .map((t: any) => t.plain_text || "")
        .join("")
        .toLowerCase();
      return textA.localeCompare(textB);
    });
  }

  return results;
}

const PREFERRED_COLUMN_ORDERS: Record<string, string[]> = {
  npc: [
    "Tags",
    "Species",
    "Location",
    "Affiliation",
    "Occupation/Role",
    "Relationship",
    "Status",
    "Session",
  ],
  organization: ["Relation", "Region", "Type", "Alignment", "Leader(s)", "Status"],
  location: ["Category", "Parent Location", "Status", "Notes/History"],
  deit: ["Type", "Alignment / Nature", "Plane / Origin", "Associated Groups"],
  item: ["Type", "Owned/Used By", "Associated Organization", "Rarity / Power Level"],
  "mother of bob": [
    "Species",
    "Class(es)",
    "Subclass(es)",
    "Status",
    "Notable Allies/Relationships",
    "Organization/Group",
  ],
  mob: [
    "Species",
    "Class(es)",
    "Subclass(es)",
    "Status",
    "Notable Allies/Relationships",
    "Organization/Group",
  ],
};

function sortColumnKeys(columnKeys: string[], dbTitle: string): string[] {
  const titleLower = dbTitle.toLowerCase();
  const matchKey = Object.keys(PREFERRED_COLUMN_ORDERS).find((key) => titleLower.includes(key));

  if (!matchKey) return columnKeys;

  const preferredOrder = PREFERRED_COLUMN_ORDERS[matchKey];

  return [...columnKeys].sort((a, b) => {
    const idxA = preferredOrder.findIndex((col) => col.toLowerCase() === a.toLowerCase());
    const idxB = preferredOrder.findIndex((col) => col.toLowerCase() === b.toLowerCase());

    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
}
