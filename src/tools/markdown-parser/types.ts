export type BlockType =
  | "heading"
  | "paragraph"
  | "table"
  | "list"
  | "property" // Key-Value pair like **Hit Dice:** 1d10
  | "quote";

export interface MarkdownBlock {
  type: BlockType;
  depth?: number; // Only for headings (1 = #, 2 = ##, etc.)
  text: string;

  // Specific data structures for analytical parsing
  rows?: string[][]; // For tables: Array of rows, where each row is an array of cell strings
  items?: string[]; // For lists: Array of list items
  key?: string; // For properties: The bolded key
  value?: string; // For properties: The value after the colon

  // Hierarchical structure: All blocks that exist "under" this heading
  // before the next heading of equal or higher level.
  children: MarkdownBlock[];
}

export interface MarkdownDocument {
  sourceBook: string;
  blocks: MarkdownBlock[]; // The root level blocks (usually H1s)
}
