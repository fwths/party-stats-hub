import React, { useState, useEffect, useRef } from "react";
import { FileText, Send, Minimize2, Maximize2, CheckCircle2 } from "lucide-react";
import { NOTE_KEY, HISTORY_KEY } from "./types";

interface ScratchpadEditorProps {
  notes: string;
  setNotes: (val: string) => void;
  onClearNotes: () => void;
  notionToken: string;
  notionParentId: string;
  notionParentType: "database" | "page" | "workspace";
  selectedPageId: string | null;
  setActiveMode: (mode: "scratchpad" | "page") => void;
  handleOpenSync: () => void;
  QuestTracker: React.ReactNode;
}

export default function ScratchpadEditor({
  notes,
  setNotes,
  onClearNotes,
  notionToken,
  notionParentId,
  notionParentType,
  selectedPageId,
  setActiveMode,
  handleOpenSync,
  QuestTracker,
}: ScratchpadEditorProps) {
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);
  const [showHistoryMenu, setShowHistoryMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<{ timestamp: number; content: string }[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(HISTORY_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const historyMenuRef = useRef<HTMLDivElement | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close history menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (historyMenuRef.current && !historyMenuRef.current.contains(e.target as Node)) {
        setShowHistoryMenu(false);
      }
    };
    if (showHistoryMenu) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showHistoryMenu]);

  // Check and save history snapshot
  const saveHistorySnapshot = (content: string) => {
    if (!content.trim()) return;
    setHistory((prev) => {
      const lastSnapshot = prev[0];
      const now = Date.now();

      if (lastSnapshot) {
        const timeDiff = now - lastSnapshot.timestamp;
        const minutesDiff = timeDiff / (1000 * 60);
        if (lastSnapshot.content === content || minutesDiff < 3) {
          return prev;
        }
      }

      const newHistory = [{ timestamp: now, content }, ...prev].slice(0, 10);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
  };

  // Debounced auto-history snapshot saving
  useEffect(() => {
    const handler = setTimeout(() => {
      saveHistorySnapshot(notes);
    }, 5000);
    return () => clearTimeout(handler);
  }, [notes]);

  // Save notes with debounce to avoid excessive localStorage calls
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);
    setIsSaving(true);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(NOTE_KEY, val);
        setIsSaving(false);
      } catch (err) {
        console.warn("Failed to auto-save notes:", err);
      }
    }, 600);
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const applyFormat = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const replacement = prefix + selectedText + suffix;

    const newNotes = text.substring(0, start) + replacement + text.substring(end);
    setNotes(newNotes);
    localStorage.setItem(NOTE_KEY, newNotes);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length,
      );
    }, 0);
  };

  const handleExportNotes = () => {
    if (!notes.trim()) return;
    const blob = new Blob([notes], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().split("T")[0];
    link.href = url;
    link.download = `session-journal-${dateStr}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportNotes = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        if (
          window.confirm("Importing this file will replace your current scratchpad notes. Proceed?")
        ) {
          setNotes(content);
          localStorage.setItem(NOTE_KEY, content);
          saveHistorySnapshot(content);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4 select-none">
        <div className="flex items-center gap-3">
          {selectedPageId && (
            <button
              onClick={() => setActiveMode("page")}
              className="text-xs font-bold text-gold hover:text-yellow-300 transition-colors duration-200 cursor-pointer flex items-center gap-1 border border-gold/30 hover:border-gold/60 rounded px-2.5 py-1 bg-gold/5 hover:bg-gold/10"
            >
              ← Back to Codex
            </button>
          )}
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-gold" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-foreground bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Active Session Journal
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-3.5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportNotes}
            accept=".md,.txt"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground hover:text-gold transition-colors duration-200 cursor-pointer"
            title="Import notes from a local Markdown file"
          >
            Import
          </button>
          <button
            onClick={handleExportNotes}
            disabled={!notes.trim()}
            className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground hover:text-gold disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors duration-200 cursor-pointer"
            title="Export notes as a Markdown file"
          >
            Export
          </button>
          <div className="relative" ref={historyMenuRef}>
            <button
              onClick={() => setShowHistoryMenu(!showHistoryMenu)}
              className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground hover:text-gold transition-colors duration-200 cursor-pointer flex items-center gap-1"
              title="View draft history snapshots"
            >
              History ⏳
            </button>
            {showHistoryMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-lg bg-black/90 backdrop-blur-md border border-border/80 p-3 shadow-2xl z-50 text-xs text-foreground space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar animate-fade-in border-gold/20">
                <span className="block text-[9px] uppercase font-bold tracking-widest text-gold border-b border-border/20 pb-1.5 mb-1.5">
                  Draft Snapshots
                </span>
                {history.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground italic text-center py-4">
                    No snapshots saved yet.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {history.map((snapshot, idx) => {
                      const timeStr = new Date(snapshot.timestamp).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const dateStr = new Date(snapshot.timestamp).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      });
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                "Restore this draft snapshot? Your current active notes will be overwritten.",
                              )
                            ) {
                              setNotes(snapshot.content);
                              localStorage.setItem(NOTE_KEY, snapshot.content);
                              setShowHistoryMenu(false);
                            }
                          }}
                          className="w-full text-left p-2 rounded hover:bg-gold/5 border border-transparent hover:border-gold/20 transition-all duration-150 block"
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold text-gold mb-0.5">
                            <span>
                              {dateStr} - {timeStr}
                            </span>
                            <span className="text-[8px] font-mono text-muted-foreground">
                              {snapshot.content.length} chars
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate font-sans">
                            {snapshot.content.trim() || "(empty notes)"}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="w-[1px] h-3 bg-border/40" />
          {notionToken && notionParentId && notionParentType !== "workspace" && (
            <button
              onClick={handleOpenSync}
              disabled={!notes.trim()}
              className="text-[10px] uppercase font-bold tracking-wider text-gold hover:text-yellow-300 disabled:opacity-30 disabled:hover:text-gold transition-colors duration-200 cursor-pointer flex items-center gap-1"
            >
              <Send size={10} />
              Sync Notion
            </button>
          )}
          {isSaving ? (
            <span className="flex items-center gap-1.5 text-[10px] text-gold font-medium font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-gold animate-ping" />
              Saving...
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Saved
            </span>
          )}
          <button
            onClick={() => setIsEditorExpanded(!isEditorExpanded)}
            className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground hover:text-gold transition-colors duration-200 cursor-pointer flex items-center gap-1"
            title={isEditorExpanded ? "Collapse Editor" : "Expand Editor"}
          >
            {isEditorExpanded ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
            <span>{isEditorExpanded ? "Collapse" : "Expand"}</span>
          </button>
          <button
            onClick={onClearNotes}
            disabled={!notes}
            className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground hover:text-rose-400 disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors duration-200 cursor-pointer"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Nested Workspace */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Journal Editor (left 7 cols or full 12 cols if expanded) */}
        <div
          className={`${isEditorExpanded ? "xl:col-span-12" : "xl:col-span-7"} flex flex-col min-h-[300px]`}
        >
          {/* Markdown Formatting Toolbar */}
          <div className="flex flex-wrap items-center gap-1 bg-secondary/15 border border-border/40 border-b-0 rounded-t-lg px-3 py-2 select-none">
            <button
              type="button"
              onClick={() => applyFormat("**", "**")}
              className="text-xs font-bold text-muted-foreground hover:text-gold hover:bg-gold/5 transition-all px-2.5 py-1 rounded border border-transparent hover:border-gold/20 cursor-pointer"
              title="Bold"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => applyFormat("*", "*")}
              className="text-xs italic text-muted-foreground hover:text-gold hover:bg-gold/5 transition-all px-2.5 py-1 rounded border border-transparent hover:border-gold/20 cursor-pointer"
              title="Italic"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => applyFormat("# ")}
              className="text-xs font-bold text-muted-foreground hover:text-gold hover:bg-gold/5 transition-all px-2.5 py-1 rounded border border-transparent hover:border-gold/20 cursor-pointer"
              title="Heading 1"
            >
              H1
            </button>
            <button
              type="button"
              onClick={() => applyFormat("## ")}
              className="text-xs font-bold text-muted-foreground hover:text-gold hover:bg-gold/5 transition-all px-2.5 py-1 rounded border border-transparent hover:border-gold/20 cursor-pointer"
              title="Heading 2"
            >
              H2
            </button>
            <div className="w-[1px] h-4 bg-border/30 mx-1" />
            <button
              type="button"
              onClick={() => applyFormat("- ")}
              className="text-xs text-muted-foreground hover:text-gold hover:bg-gold/5 transition-all px-2.5 py-1 rounded border border-transparent hover:border-gold/20 cursor-pointer"
              title="Bullet List"
            >
              • List
            </button>
            <button
              type="button"
              onClick={() => applyFormat("- [ ] ")}
              className="text-xs text-muted-foreground hover:text-gold hover:bg-gold/5 transition-all px-2.5 py-1 rounded border border-transparent hover:border-gold/20 cursor-pointer flex items-center gap-1"
              title="Checklist"
            >
              <CheckCircle2 size={11} />
              <span>Todo</span>
            </button>
            <button
              type="button"
              onClick={() => applyFormat("> ")}
              className="text-xs text-muted-foreground hover:text-gold hover:bg-gold/5 transition-all px-2.5 py-1 rounded border border-transparent hover:border-gold/20 cursor-pointer"
              title="Blockquote"
            >
              ” Quote
            </button>
          </div>
          <textarea
            ref={textareaRef}
            value={notes}
            onChange={handleNotesChange}
            placeholder="Type your campaign journal, loot tracking, NPC details, or session summaries here... Automatically saved locally."
            className="flex-1 w-full min-h-[350px] lg:min-h-[400px] rounded-b-lg rounded-t-none border border-border/40 border-t-0 hover:border-border/60 focus:border-gold/50 focus:ring-1 focus:ring-gold/20 p-4 text-sm text-foreground placeholder-muted-foreground/50 resize-y focus:outline-none transition-all duration-300 font-sans leading-relaxed"
          />
          <div className="mt-3 flex justify-between items-center text-[10px] text-muted-foreground font-mono select-none">
            <span>Characters: {notes.length}</span>
            <span>Local Auto-Save</span>
          </div>
        </div>

        {/* Quest Tracker (right 5 cols) */}
        {!isEditorExpanded && QuestTracker}
      </div>
    </div>
  );
}
