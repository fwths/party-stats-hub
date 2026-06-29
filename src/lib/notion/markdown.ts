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

      let text = rt.plain_text || "";
      if (!text) return "";

      const match = text.match(/^(\s*)(.*?)(\s*)$/s);
      const leadingSpace = match ? match[1] : "";
      let coreText = match ? match[2] : text;
      const trailingSpace = match ? match[3] : "";

      if (coreText) {
        const ann = rt.annotations;
        if (ann) {
          if (ann.code) {
            coreText = `\`${coreText}\``;
          } else {
            if (ann.bold) coreText = `**${coreText}**`;
            if (ann.italic) coreText = `*${coreText}*`;
            if (ann.strikethrough) coreText = `~~${coreText}~~`;
            if (ann.underline) coreText = `<u>${coreText}</u>`;
          }
        }

        const url = rt.href || rt.text?.link?.url;
        if (url) {
          coreText = `[${coreText}](${url})`;
        }
      }

      return leadingSpace + coreText + trailingSpace;
    })
    .join("");
}

// Notion Block to Markdown Parser Helper
export function parseNotionBlocksToMarkdown(blocks: any[], depth = 0, contextPrefix = ""): string {
  let markdown = "";

  for (const block of blocks) {
    const type = block.type;
    const blockData = block[type];
    if (!blockData) continue;

    const textContent = blockData.rich_text ? extractRichTextContent(blockData.rich_text) : "";
    let blockMarkdown = "";

    const indent = "  ".repeat(depth);

    switch (type) {
      case "heading_1":
        blockMarkdown = `# ${textContent}\n\n`;
        break;
      case "heading_2":
        blockMarkdown = `## ${textContent}\n\n`;
        break;
      case "heading_3":
        blockMarkdown = `### ${textContent}\n\n`;
        break;
      case "bulleted_list_item":
        blockMarkdown = `${indent}- ${textContent}\n`;
        break;
      case "numbered_list_item":
        blockMarkdown = `${indent}1. ${textContent}\n`;
        break;
      case "to_do":
        const checked = blockData.checked ? "x" : " ";
        blockMarkdown = `${indent}- [${checked}] ${textContent}\n`;
        break;
      case "quote":
        blockMarkdown = `> ${textContent}\n\n`;
        break;
      case "toggle":
        blockMarkdown = `▼ **${textContent}**\n\n`;
        break;
      case "database_table":
        const dbTitle = blockData.title || "Database";
        const dbResults = blockData.results || [];

        blockMarkdown = `### 📊 ${dbTitle}\n\n`;

        if (dbResults.length === 0) {
          blockMarkdown += `*No entries found in this database.*\n\n`;
        } else {
          const firstEntry = dbResults[0];
          const properties = firstEntry.properties || {};

          const titleKey =
            Object.keys(properties).find((key) => properties[key].type === "title") || "Name";

          const rawColumnKeys = Object.keys(properties).filter((key) => key !== titleKey);
          const columnKeys = sortColumnKeys(rawColumnKeys, dbTitle);

          blockMarkdown += `| ${titleKey} | ${columnKeys.join(" | ")} |\n`;
          blockMarkdown += `| ${"--- | ".repeat(columnKeys.length + 1)}\n`;

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

            blockMarkdown += `| ${titleLink} | ${cellValues.join(" | ")} |\n`;
          }
          blockMarkdown += `\n`;
        }
        break;
      case "callout":
        const emoji = blockData.icon?.emoji || "ℹ️";
        blockMarkdown = `> [!CALLOUT] ${emoji} ${textContent}\n\n`;
        break;
      case "divider":
        blockMarkdown = `---\n\n`;
        break;
      case "child_page":
        blockMarkdown = `> [!SUBPAGE] [${blockData.title || "Subpage"}](pageId:${block.id})\n\n`;
        break;
      case "child_database":
        blockMarkdown = `> [!DATABASE] [${blockData.title || "Database"}](pageId:${block.id})\n\n`;
        break;
      case "image":
        const imageUrl =
          blockData.type === "external" ? blockData.external?.url : blockData.file?.url;
        if (imageUrl) {
          const caption = blockData.caption ? extractRichTextContent(blockData.caption) : "";
          blockMarkdown = `![${caption || "image"}](${imageUrl})\n\n`;
        }
        break;
      case "code":
        const lang = blockData.language || "plain text";
        blockMarkdown = `\`\`\`${lang}\n${textContent}\n\`\`\`\n\n`;
        break;
      case "paragraph":
        blockMarkdown = `${textContent}\n\n`;
        break;
      default:
        if (blockData.rich_text) {
          blockMarkdown = `${textContent}\n\n`;
        }
        break;
    }

    if (contextPrefix && blockMarkdown) {
      blockMarkdown = blockMarkdown
        .split("\n")
        .map((line) => (line.trim() !== "" ? contextPrefix + line : line))
        .join("\n");
    }

    markdown += blockMarkdown;

    if (block.children && block.children.length > 0) {
      let newDepth = depth;
      let newContextPrefix = contextPrefix;

      if (["bulleted_list_item", "numbered_list_item", "to_do"].includes(type)) {
        newDepth = depth + 1;
      } else if (type === "quote" || type === "callout") {
        newContextPrefix = contextPrefix + "> ";
      }

      const childrenMarkdown = parseNotionBlocksToMarkdown(
        block.children,
        newDepth,
        newContextPrefix,
      );
      if (childrenMarkdown) {
        // Ensure there is spacing between list children and next siblings
        markdown += childrenMarkdown + "\n";
      }
    }
  }

  return depth === 0 ? markdown.trim() : markdown;
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
