import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/notion")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { token, parentId, parentType, title, markdown } = body;

          if (!token || !parentId || !title) {
            return new Response(
              JSON.stringify({ error: "Missing required fields: token, parentId, or title." }),
              { status: 400, headers: { "Content-Type": "application/json" } }
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
              "Authorization": `Bearer ${token}`,
              "Notion-Version": "2022-06-28",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              parent,
              properties,
              children: firstBatch.length > 0 ? firstBatch : [
                {
                  object: "block",
                  type: "paragraph",
                  paragraph: { rich_text: [] }
                }
              ],
            }),
          });

          if (!response.ok) {
            const errData = await response.json();
            return new Response(
              JSON.stringify({ error: errData.message || "Failed to create page in Notion." }),
              { status: response.status, headers: { "Content-Type": "application/json" } }
            );
          }

          const pageData = await response.json();
          const pageId = pageData.id;

          // 2. Append any remaining blocks in chunks of 100
          let currentIdx = 100;
          while (currentIdx < blocks.length) {
            const nextBatch = blocks.slice(currentIdx, currentIdx + 100);
            const appendResponse = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
              method: "PATCH",
              headers: {
                "Authorization": `Bearer ${token}`,
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

          return new Response(
            JSON.stringify({ success: true, url: pageData.url || `https://notion.so/${pageId.replace(/-/g, "")}`, id: pageId }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );

        } catch (e: any) {
          return new Response(
            JSON.stringify({ error: e.message || "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const token = url.searchParams.get("token");
          const pageId = url.searchParams.get("pageId");
          const parentId = url.searchParams.get("parentId");

          if (!token) {
            return new Response(JSON.stringify({ error: "Missing token parameter." }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Case 1: Fetch content of a specific page and convert to markdown
          if (pageId) {
            const blocksResponse = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
              method: "GET",
              headers: {
                "Authorization": `Bearer ${token}`,
                "Notion-Version": "2022-06-28",
              },
            });

            if (!blocksResponse.ok) {
              const errData = await blocksResponse.json();
              return new Response(
                JSON.stringify({ error: errData.message || "Failed to fetch page blocks from Notion." }),
                { status: blocksResponse.status, headers: { "Content-Type": "application/json" } }
              );
            }

            const blocksData = await blocksResponse.json();
            const markdown = parseNotionBlocksToMarkdown(blocksData.results || []);

            return new Response(JSON.stringify({ success: true, markdown }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Case 2: Query database entries
          if (parentId) {
            const queryResponse = await fetch(`https://api.notion.com/v1/databases/${parentId}/query`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${token}`,
                "Notion-Version": "2022-06-28",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                sorts: [
                  {
                    timestamp: "created_time",
                    direction: "descending",
                  },
                ],
                page_size: 15,
              }),
            });

            if (!queryResponse.ok) {
              const errData = await queryResponse.json();
              return new Response(
                JSON.stringify({ error: errData.message || "Failed to query Notion database." }),
                { status: queryResponse.status, headers: { "Content-Type": "application/json" } }
              );
            }

            const queryData = await queryResponse.json();

            const pages = (queryData.results || []).map((page: any) => {
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
                createdAt: page.created_time,
              };
            });

            return new Response(JSON.stringify({ success: true, pages }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          return new Response(JSON.stringify({ error: "Missing pageId or parentId parameter." }), {
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

    const textContent = extractRichTextContent(blockData.rich_text);

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
  return richText.map((rt: any) => rt.plain_text || "").join("");
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
    "abap", "arduino", "bash", "basic", "c", "clojure", "coffeescript", "c++", "c#", "css", "dart", "diff",
    "docker", "elixir", "elm", "erlang", "flow", "fortran", "f#", "gherkin", "glsl", "go", "graphql",
    "groovy", "haskell", "html", "java", "javascript", "json", "julia", "kotlin", "latex", "less", "lisp",
    "livescript", "lua", "makefile", "markdown", "markup", "matlab", "mermaid", "nix", "objective-c",
    "ocaml", "pascal", "perl", "php", "plain text", "powershell", "prolog", "protobuf", "python", "r",
    "reason", "ruby", "rust", "sass", "scala", "scheme", "scss", "shell", "sql", "swift", "typescript",
    "vb.net", "verilog", "vhdl", "visual basic", "webassembly", "xml", "yaml"
  ];
  if (allowed.includes(l)) return l;
  if (l === "js") return "javascript";
  if (l === "ts") return "typescript";
  if (l === "py") return "python";
  if (l === "rb") return "ruby";
  if (l === "sh") return "shell";
  return "plain text";
}
