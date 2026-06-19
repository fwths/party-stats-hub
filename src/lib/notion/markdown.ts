import { sortColumnKeys, getPropertyValueText } from "./utils";

// Map standard code block languages to Notion accepted languages
export function mapLanguageForNotion(lang: string): string {
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

export function extractRichTextContent(richText: any[]): string {
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

// Notion Block to Markdown Parser Helper
export function parseNotionBlocksToMarkdown(blocks: any[]): string {
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

// Basic Markdown to Notion Block Parser
export function parseMarkdownToNotionBlocks(markdown: string): any[] {
  const blocks: any[] = [];
  const lines = markdown.split(/\r?\n/);

  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLanguage = "plain text";

  for (const line of lines) {
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
