import * as fs from "fs";
import * as path from "path";
import { MarkdownBlock, MarkdownDocument, BlockType } from "./types";

export class MarkdownEngine {
  private documents: MarkdownDocument[] = [];

  constructor() {}

  public loadFile(filePath: string, sourceBookName: string) {
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      return;
    }
    const content = fs.readFileSync(filePath, "utf8");
    const blocks = this.parseHierarchical(content);
    this.documents.push({ sourceBook: sourceBookName, blocks });
  }

  public getDocuments() {
    return this.documents;
  }

  // Find all headings across all loaded books matching a regex
  public findAllHeadings(regex: RegExp): Array<{ book: string; block: MarkdownBlock }> {
    const results: Array<{ book: string; block: MarkdownBlock }> = [];
    for (const doc of this.documents) {
      this.walk(doc.blocks, (block) => {
        if (block.type === "heading" && regex.test(block.text)) {
          results.push({ book: doc.sourceBook, block });
        }
      });
    }
    return results;
  }

  // Walk the AST
  private walk(blocks: MarkdownBlock[], callback: (block: MarkdownBlock) => void) {
    for (const b of blocks) {
      callback(b);
      if (b.children && b.children.length > 0) {
        this.walk(b.children, callback);
      }
    }
  }

  private parseHierarchical(content: string): MarkdownBlock[] {
    const lines = content.split(/\r?\n/);
    const rootBlocks: MarkdownBlock[] = [];
    const stack: MarkdownBlock[] = []; // Stack to keep track of current heading hierarchy

    let currentBlock: MarkdownBlock | null = null;
    let tableBuffer: string[] = [];
    let listBuffer: string[] = [];
    let quoteBuffer: string[] = [];

    const flushTable = () => {
      if (tableBuffer.length === 0) return;
      const rows = tableBuffer.map((row) => {
        const cells = row.split("|").map((c) => c.trim());
        // Clean up outer empty splits from leading/trailing |
        if (cells.length > 0 && cells[0] === "") cells.shift();
        if (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
        return cells;
      });
      // Remove separator row (e.g. |---|---|)
      const cleanRows = rows.filter((row) => !row.every((cell) => /^[-:]+$/.test(cell)));

      const tableBlock: MarkdownBlock = {
        type: "table",
        text: "Table",
        rows: cleanRows,
        children: [],
      };
      addBlockToTree(tableBlock);
      tableBuffer = [];
    };

    const flushList = () => {
      if (listBuffer.length === 0) return;
      const listBlock: MarkdownBlock = {
        type: "list",
        text: "List",
        items: [...listBuffer],
        children: [],
      };
      addBlockToTree(listBlock);
      listBuffer = [];
    };

    const flushQuote = () => {
      if (quoteBuffer.length === 0) return;
      const quoteBlock: MarkdownBlock = {
        type: "quote",
        text: quoteBuffer.join(" "),
        children: [],
      };
      addBlockToTree(quoteBlock);
      quoteBuffer = [];
    };

    const flushCurrentParagraph = () => {
      if (currentBlock && currentBlock.type === "paragraph" && currentBlock.text.trim()) {
        addBlockToTree(currentBlock);
      }
      currentBlock = null;
    };

    const flushAllBuffers = () => {
      flushTable();
      flushList();
      flushQuote();
      flushCurrentParagraph();
    };

    const addBlockToTree = (block: MarkdownBlock) => {
      if (block.type === "heading") {
        // Pop stack until we find a heading with depth < block.depth
        while (stack.length > 0) {
          const top = stack[stack.length - 1];
          if (top.depth! < block.depth!) {
            break;
          }
          stack.pop();
        }
        if (stack.length === 0) {
          rootBlocks.push(block);
        } else {
          stack[stack.length - 1].children.push(block);
        }
        stack.push(block);
      } else {
        // Add to the children of the current top of the stack, or root
        if (stack.length === 0) {
          rootBlocks.push(block);
        } else {
          stack[stack.length - 1].children.push(block);
        }
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip empty lines, but flush buffers
      if (!trimmed) {
        flushAllBuffers();
        continue;
      }

      // 1. Heading Check (# Heading)
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)/);
      if (headingMatch) {
        flushAllBuffers();
        const depth = headingMatch[1].length;
        const text = headingMatch[2].trim();
        const headingBlock: MarkdownBlock = {
          type: "heading",
          depth,
          text,
          children: [],
        };
        addBlockToTree(headingBlock);
        continue;
      }

      // 2. Table Check (| cell |)
      if (trimmed.startsWith("|")) {
        flushList();
        flushQuote();
        flushCurrentParagraph();
        tableBuffer.push(trimmed);
        continue;
      } else {
        flushTable();
      }

      // 3. List Check (- item, * item, 1. item)
      const listMatch = trimmed.match(/^([-*]|\d+\.)\s+(.*)/);
      if (listMatch) {
        flushQuote();
        flushCurrentParagraph();
        listBuffer.push(listMatch[2].trim());
        continue;
      } else {
        flushList();
      }

      // 4. Property Check (**Key:** Value)
      // Make sure it doesn't match an entire bolded sentence by ensuring a colon
      const propMatch = trimmed.match(/^\*\*([^*]+?):\*\*(.*)/);
      if (propMatch) {
        flushAllBuffers();
        const propBlock: MarkdownBlock = {
          type: "property",
          text: trimmed,
          key: propMatch[1].trim(),
          value: propMatch[2].trim(),
          children: [],
        };
        addBlockToTree(propBlock);
        continue;
      }

      // 5. Quote Check (> Quote)
      if (trimmed.startsWith(">")) {
        flushCurrentParagraph();
        const quoteText = trimmed.substring(1).trim();
        // Sometimes quotes start with > ##### which is a nested header inside a blockquote.
        // For simplicity, we just treat the blockquote as a big text block.
        quoteBuffer.push(quoteText);
        continue;
      } else {
        flushQuote();
      }

      // 6. Regular Paragraph
      if (!currentBlock || currentBlock.type !== "paragraph") {
        currentBlock = { type: "paragraph", text: trimmed, children: [] };
      } else {
        currentBlock.text += " " + trimmed;
      }
    }

    // Flush at EOF
    flushAllBuffers();

    return rootBlocks;
  }
}
