import React, { useState, useEffect, useRef } from "react";
import { CheckCircle2, Circle, Compass, Search } from "lucide-react";
import { parseInlineStyles } from "./markdown-inline";
import { PartyMember } from "@/lib/dndbeyond.types";

// Interactive Table Component with Local Filtering & Click-to-Sort Columns
function InteractiveTable({
  headers,
  rowsData,
  parseCellContent,
}: {
  headers: string[];
  rowsData: string[][];
  parseCellContent: (cellText: string, isFirstCol?: boolean) => React.ReactNode;
}) {
  const [filterText, setFilterText] = useState("");
  const [sortIndex, setSortIndex] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [hiddenColumns, setHiddenColumns] = useState<Set<number>>(() => new Set());
  const [showColMenu, setShowColMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close column visibility menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowColMenu(false);
      }
    };
    if (showColMenu) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showColMenu]);

  const toggleColumn = (idx: number) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  // Local Filtering
  const filteredRows = rowsData.filter((row) => {
    if (!filterText.trim()) return true;
    const searchVal = filterText.toLowerCase();
    return row.some((cell) => cell.toLowerCase().includes(searchVal));
  });

  // Local Sorting
  const sortedRows = [...filteredRows];
  if (sortIndex !== null) {
    sortedRows.sort((a, b) => {
      const valA = a[sortIndex] || "";
      const valB = b[sortIndex] || "";

      const numA = Number(valA.replace(/[^0-9.-]/g, ""));
      const numB = Number(valB.replace(/[^0-9.-]/g, ""));
      if (!isNaN(numA) && !isNaN(numB) && valA !== "" && valB !== "") {
        return sortDirection === "asc" ? numA - numB : numB - numA;
      }

      return sortDirection === "asc"
        ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: "base" })
        : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: "base" });
    });
  }

  const handleSort = (index: number) => {
    if (sortIndex === index) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortIndex(index);
      setSortDirection("asc");
    }
  };

  return (
    <div className="my-5 rounded-lg border border-border/40 shadow-md bg-secondary/5 overflow-hidden">
      {/* Table Filter Toolbar */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-border/30 bg-secondary/15 select-none gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex-shrink-0">
            Table Entries ({filteredRows.length} of {rowsData.length})
          </span>
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              onClick={() => setShowColMenu(!showColMenu)}
              className="text-[9px] font-bold uppercase tracking-wider text-gold hover:text-yellow-300 border border-gold/20 hover:border-gold/45 rounded px-1.5 py-0.5 bg-secondary/25 hover:bg-secondary/40 transition-all duration-150 cursor-pointer flex items-center gap-1 shadow-sm"
              title="Configure column visibility"
            >
              Cols ⚙
            </button>
            {showColMenu && (
              <div className="absolute left-0 mt-1.5 w-48 rounded-lg bg-card border border-border bg-black/85 backdrop-blur-md p-2.5 shadow-2xl z-50 text-[10px] select-none text-foreground space-y-1.5 max-h-[220px] overflow-y-auto custom-scrollbar animate-fade-in border-gold/20">
                <span className="block text-[8px] uppercase font-bold tracking-widest text-gold border-b border-border/20 pb-1 mb-1">
                  Columns Visibility
                </span>
                {headers.map((h, idx) => {
                  const isVisible = !hiddenColumns.has(idx);
                  return (
                    <label
                      key={idx}
                      className="flex items-center gap-2 cursor-pointer hover:bg-secondary/25 p-1 rounded transition-colors duration-150 min-w-0"
                    >
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={() => toggleColumn(idx)}
                        className="rounded border-border/40 text-gold focus:ring-0 cursor-pointer scale-90"
                      />
                      <span className="truncate text-foreground/80 font-medium text-[9px] select-none">
                        {h || `Col ${idx + 1}`}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="relative max-w-[200px] flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none text-muted-foreground/50">
            <Search size={10} />
          </span>
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter table..."
            className="w-full rounded bg-secondary/25 border border-border/40 hover:border-border/60 focus:border-gold/45 px-2 pl-6 py-1 text-[10px] text-foreground placeholder-muted-foreground/45 focus:outline-none transition-all duration-200"
          />
          {filterText && (
            <button
              onClick={() => setFilterText("")}
              className="absolute inset-y-0 right-0 flex items-center pr-2 text-muted-foreground/50 hover:text-foreground cursor-pointer text-[9px] font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs select-text">
          <thead>
            <tr className="bg-secondary/20 border-b border-border/40 select-none">
              {headers.map((h, idx) => {
                if (hiddenColumns.has(idx)) return null;
                const isSorted = sortIndex === idx;
                return (
                  <th
                    key={idx}
                    onClick={() => handleSort(idx)}
                    className="p-3 font-bold text-gold uppercase tracking-wider cursor-pointer hover:bg-gold/5 transition-colors duration-150 relative pr-6 group break-words whitespace-normal min-w-[90px] max-w-[200px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>{parseInlineStyles(h)}</span>
                      <span className="text-muted-foreground/45 group-hover:text-gold transition-colors duration-150 text-[9px]">
                        {isSorted ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {sortedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="p-4 text-center text-muted-foreground italic"
                >
                  No matching entries found.
                </td>
              </tr>
            ) : (
              sortedRows.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-secondary/5 transition-colors duration-150">
                  {row.map((cell, cellIdx) => {
                    if (hiddenColumns.has(cellIdx)) return null;
                    return (
                      <td
                        key={cellIdx}
                        className="p-3 text-foreground/85 leading-normal break-words whitespace-normal min-w-[90px] max-w-[200px]"
                      >
                        {parseCellContent(cell, cellIdx === 0)}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Markdown Renderer Helper
export function MarkdownRenderer({
  content,
  onSelectPage,
  members,
}: {
  content: string;
  onSelectPage: (id: string, title: string, isDb?: boolean) => void;
  members?: PartyMember[];
}) {
  if (!content || content.trim() === "") {
    return <p className="text-xs text-muted-foreground italic">No content in this page.</p>;
  }

  const lines = content.split(/\r?\n/);
  const elements: React.ReactNode[] = [];

  let keyCounter = 0;
  let inCodeBlock = false;
  let codeBlockLanguage = "";
  let codeBlockLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Handle table blocks
    if (trimmed.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      i--; // Step back to balance the loop increment

      if (tableLines.length >= 2) {
        const headers = tableLines[0]
          .split("|")
          .map((h) => h.trim())
          .filter((_h, idx, arr) => idx > 0 && idx < arr.length - 1);

        const rowsData = tableLines.slice(2).map((line) => {
          return line
            .split("|")
            .map((cell) => cell.trim())
            .filter((_cell, idx, arr) => idx > 0 && idx < arr.length - 1);
        });

        const parseCellContent = (cellText: string, isFirstCol?: boolean) => {
          if (!cellText) return "";

          // Split by newline or comma to support lists of items in a single cell
          const parts = cellText
            .split(/(?:\r?\n|,)/)
            .map((p) => p.trim())
            .filter(Boolean);

          const renderedParts: React.ReactNode[] = parts.map((part, idx) => {
            const match = part.match(/\[(.*?)\]\(pageId:(.*?)\)/);
            if (match) {
              const linkTitle = match[1];
              const linkId = match[2];

              const normalize = (val: string) =>
                val.toLowerCase()
                   .replace(/[“”"']/g, "")
                   .replace(/\s+/g, " ")
                   .trim();

              const getCleanName = (name: string) => {
                // Strip nicknames in quotes/smart quotes
                return name.replace(/["'“‘”’].*?["'“‘”’]/g, "");
              };

              // Check if the link title contains any party member name
              const matchMember = members?.find((m) => {
                const normalizedMemberName = normalize(m.name);
                const normalizedLinkTitle = normalize(linkTitle);
                if (
                  normalizedLinkTitle.includes(normalizedMemberName) ||
                  normalizedMemberName.includes(normalizedLinkTitle)
                ) {
                  return true;
                }

                // Try stripping nicknames
                const mClean = normalize(getCleanName(m.name));
                const lClean = normalize(getCleanName(linkTitle));
                if (mClean && lClean && (mClean.includes(lClean) || lClean.includes(mClean))) {
                  return true;
                }

                // Fallback: check significant word overlap (first and last name)
                const mWords = normalizedMemberName.split(/\s+/).filter((w) => w.length > 2);
                const lWords = normalizedLinkTitle.split(/\s+/).filter((w) => w.length > 2);
                const commonWords = mWords.filter((w) => lWords.includes(w));
                if (commonWords.length >= 2) {
                  return true;
                }

                return false;
              });

              return (
                <span key={idx} className="inline-flex items-center gap-1.5 align-middle">
                  {matchMember?.avatarUrl && (
                    <img
                      src={matchMember.avatarUrl}
                      alt={matchMember.name}
                      className="h-5 w-5 rounded-full object-cover border border-border/50 shadow-sm flex-shrink-0"
                    />
                  )}
                  <button
                    onClick={() => onSelectPage(linkId, linkTitle)}
                    className={`${
                      isFirstCol
                        ? "text-gold hover:text-yellow-300"
                        : "text-purple-400 hover:text-purple-300"
                    } font-bold hover:underline bg-transparent border-none p-0 cursor-pointer text-left inline`}
                  >
                    {linkTitle}
                  </button>
                </span>
              );
            }

            const normalize = (val: string) =>
              val.toLowerCase()
                 .replace(/[“”"']/g, "")
                 .replace(/\s+/g, " ")
                 .trim();

            const getCleanName = (name: string) => {
              return name.replace(/["'“‘”’].*?["'“‘”’]/g, "");
            };

            // Check if plain text matches any party member name
            const matchMemberText = members?.find((m) => {
              const normalizedMemberName = normalize(m.name);
              const normalizedPart = normalize(part);
              if (
                normalizedPart.includes(normalizedMemberName) ||
                normalizedMemberName.includes(normalizedPart)
              ) {
                return true;
              }

              // Try stripping nicknames
              const mClean = normalize(getCleanName(m.name));
              const pClean = normalize(getCleanName(part));
              if (mClean && pClean && (mClean.includes(pClean) || pClean.includes(mClean))) {
                return true;
              }

              // Fallback: check significant word overlap (first and last name)
              const mWords = normalizedMemberName.split(/\s+/).filter((w) => w.length > 2);
              const pWords = normalizedPart.split(/\s+/).filter((w) => w.length > 2);
              const commonWords = mWords.filter((w) => pWords.includes(w));
              if (commonWords.length >= 2) {
                return true;
              }

              return false;
            });

            const isImage = part.includes("![");
            if (!isImage && matchMemberText?.avatarUrl) {
              return (
                <span key={idx} className="inline-flex items-center gap-1.5 align-middle">
                  <img
                    src={matchMemberText.avatarUrl}
                    alt={matchMemberText.name}
                    className="h-5 w-5 rounded-full object-cover border border-border/50 shadow-sm flex-shrink-0"
                  />
                  <span>{parseInlineStyles(part, onSelectPage)}</span>
                </span>
              );
            }

            return <span key={idx}>{parseInlineStyles(part, onSelectPage)}</span>;
          });

          // Join items with commas
          const joinedElements: React.ReactNode[] = [];
          renderedParts.forEach((part, index) => {
            if (index > 0) {
              joinedElements.push(
                <span key={`comma-${index}`} className="text-muted-foreground mr-1">
                  ,
                </span>,
              );
            }
            joinedElements.push(part);
          });

          return <span className="inline-flex flex-wrap gap-y-1">{joinedElements}</span>;
        };

        elements.push(
          <InteractiveTable
            key={`table-${keyCounter++}`}
            headers={headers}
            rowsData={rowsData}
            parseCellContent={parseCellContent}
          />,
        );
        continue;
      }
    }

    // Handle code blocks
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <div
            key={`code-${keyCounter++}`}
            className="my-4 rounded-lg bg-black/45 border border-border/40 p-4 font-mono text-xs text-emerald-400 overflow-x-auto select-text"
          >
            {codeBlockLanguage && (
              <span className="block text-[10px] text-muted-foreground uppercase font-sans font-bold tracking-wider mb-2 border-b border-border/20 pb-1 select-none">
                {codeBlockLanguage}
              </span>
            )}
            <pre className="whitespace-pre">{codeBlockLines.join("\n")}</pre>
          </div>,
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeBlockLanguage = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Subpages / Databases link buttons
    if (trimmed.startsWith("> [!SUBPAGE] ") || trimmed.startsWith("> [!DATABASE] ")) {
      const isDb = trimmed.startsWith("> [!DATABASE] ");
      const match = trimmed.match(/>\s+\[!(?:SUBPAGE|DATABASE)\]\s+\[(.*?)\]\(pageId:(.*?)\)/);
      if (match) {
        const title = match[1];
        const id = match[2];
        elements.push(
          <div key={keyCounter++} className="my-2 select-none">
            <button
              onClick={() => {
                if (id) {
                  onSelectPage(id, title);
                }
              }}
              className="inline-flex items-center gap-2 rounded bg-secondary/15 hover:bg-secondary/25 border border-border/40 hover:border-gold/30 px-3 py-1.5 text-xs font-bold text-gold hover:text-yellow-300 transition-all duration-200 cursor-pointer"
            >
              <Compass size={12} className={isDb ? "text-amber-400" : "text-gold"} />
              <span>{title}</span>
              <span className="text-[9px] text-muted-foreground font-mono font-normal">
                ({isDb ? "Database" : "Subpage"})
              </span>
            </button>
          </div>,
        );
        continue;
      }
    }

    // Callout box formatting
    if (trimmed.startsWith("> [!CALLOUT]")) {
      const match = trimmed.match(/^>\s+\[!CALLOUT\]\s+(\S+)\s+(.*)$/);
      if (match) {
        const emoji = match[1];
        const text = match[2];
        elements.push(
          <div
            key={keyCounter++}
            className="my-4 flex gap-3 p-4 rounded-lg bg-gold/5 border border-gold/25 text-foreground/90 text-sm select-text leading-relaxed"
          >
            <span className="text-lg flex-shrink-0 select-none">{emoji}</span>
            <div className="flex-1">{parseInlineStyles(text, onSelectPage)}</div>
          </div>,
        );
        continue;
      }
    }

    // Checkbox items (to_do)
    if (trimmed.startsWith("- [ ] ") || trimmed.startsWith("- [x] ")) {
      const isChecked = trimmed.startsWith("- [x] ");
      elements.push(
        <div
          key={keyCounter++}
          className="flex items-start gap-2.5 text-sm text-foreground/80 leading-relaxed my-1.5 pl-1"
        >
          <span className="mt-1 flex-shrink-0 text-gold select-none">
            {isChecked ? <CheckCircle2 size={13} className="text-gold" /> : <Circle size={13} />}
          </span>
          <span className={isChecked ? "line-through text-muted-foreground" : ""}>
            {parseInlineStyles(trimmed.slice(6), onSelectPage)}
          </span>
        </div>,
      );
      continue;
    }

    // Blockquotes
    if (trimmed.startsWith("> ") && !trimmed.startsWith("> [!")) {
      elements.push(
        <blockquote
          key={keyCounter++}
          className="my-3 pl-4 border-l-2 border-gold/40 italic text-foreground/80 text-sm select-text leading-relaxed"
        >
          {parseInlineStyles(trimmed.slice(2), onSelectPage)}
        </blockquote>,
      );
      continue;
    }

    // Horizontal Ruler Divider
    if (trimmed === "---") {
      elements.push(
        <hr key={keyCounter++} className="my-5 border-t border-border/30 select-none" />,
      );
      continue;
    }

    // Images
    if (trimmed.startsWith("![") && trimmed.includes("](")) {
      const match = trimmed.match(/^!\[(.*)\]\((.*)\)$/);
      if (match) {
        const caption = match[1];
        const url = match[2];
        elements.push(
          <div
            key={keyCounter++}
            className="my-4 select-none flex flex-col items-center gap-2 max-w-full"
          >
            <img
              src={url}
              alt={caption}
              className="rounded-lg border border-border/40 max-h-[350px] object-contain shadow-md hover:border-gold/30 transition-all duration-300"
            />
            {caption && caption !== "image" && (
              <span className="text-[10px] text-muted-foreground italic font-sans">{caption}</span>
            )}
          </div>,
        );
        continue;
      }
    }

    // Headings
    if (trimmed.startsWith("# ")) {
      elements.push(
        <h1
          key={keyCounter++}
          className="font-heading text-lg font-bold tracking-tight text-gold mt-5 mb-3 border-b border-border/30 pb-2"
        >
          {parseInlineStyles(trimmed.slice(2), onSelectPage)}
        </h1>,
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      elements.push(
        <h2
          key={keyCounter++}
          className="font-heading text-base font-bold tracking-tight text-foreground mt-4 mb-2 border-b border-border/20 pb-1"
        >
          {parseInlineStyles(trimmed.slice(3), onSelectPage)}
        </h2>,
      );
      continue;
    }
    if (trimmed.startsWith("### ")) {
      elements.push(
        <h3
          key={keyCounter++}
          className="font-heading text-sm font-bold tracking-tight text-foreground mt-3.5 mb-1.5"
        >
          {parseInlineStyles(trimmed.slice(4), onSelectPage)}
        </h3>,
      );
      continue;
    }

    // Bullet lists - custom gold diamond marker
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      elements.push(
        <div
          key={keyCounter++}
          className="flex items-start gap-2 text-sm text-foreground/80 leading-relaxed my-1 pl-1"
        >
          <span className="text-gold mt-1.5 text-[8px] flex-shrink-0">◆</span>
          <span>{parseInlineStyles(trimmed.slice(2), onSelectPage)}</span>
        </div>,
      );
      continue;
    }

    // Numbered list items
    if (/^\d+\.\s+/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s+/);
      const num = match ? match[1] : "1";
      elements.push(
        <div
          key={keyCounter++}
          className="flex items-start gap-2 text-sm text-foreground/80 leading-relaxed my-1 pl-1"
        >
          <span className="text-gold font-bold font-mono text-xs mt-0.5 min-w-[15px] text-right">
            {num}.
          </span>
          <span>{parseInlineStyles(trimmed.replace(/^\d+\.\s+/, ""), onSelectPage)}</span>
        </div>,
      );
      continue;
    }

    // Paragraph spacing
    if (!trimmed) {
      elements.push(<div key={keyCounter++} className="h-2 select-none" />);
      continue;
    }

    // Regular paragraphs
    elements.push(
      <p key={keyCounter++} className="text-sm text-foreground/80 leading-relaxed my-2">
        {parseInlineStyles(line, onSelectPage)}
      </p>,
    );
  }

  return <div className="space-y-1 select-text">{elements}</div>;
}
