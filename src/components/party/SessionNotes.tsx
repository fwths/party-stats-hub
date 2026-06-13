import React, { useState, useEffect, useRef } from "react";
import { useModalHistorySync } from "@/hooks/useModalHistorySync";
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Sparkles,
  ListTodo,
  FileText,
  Check,
  AlertCircle,
  Settings,
  Send,
  ExternalLink,
  Loader2,
  Database,
  Search,
  RefreshCw,
  BookOpen,
  Compass,
  ChevronRight,
  Maximize2,
  Minimize2,
} from "lucide-react";

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  type: "main" | "side" | "bounty" | "personal";
  createdAt: number;
}

interface NotionPage {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  object?: string;
  parent?: {
    type: string;
    page_id?: string;
    database_id?: string;
    workspace?: boolean;
  };
}

const NOTE_KEY = "mob.session-notes.v1";
const TODO_KEY = "mob.todos.v1";

const BADGES = {
  main: { label: "Main Quest", color: "bg-red-500/10 text-red-400 border-red-500/25" },
  side: { label: "Side Quest", color: "bg-sky-500/10 text-sky-400 border-sky-500/25" },
  bounty: { label: "Bounty", color: "bg-amber-500/10 text-amber-400 border-amber-500/25" },
  personal: { label: "Personal", color: "bg-purple-500/10 text-purple-400 border-purple-500/25" },
};

export default function SessionNotes() {
  // --- Navigation & View Mode ---
  const [activeMode, setActiveMode] = useState<"scratchpad" | "page">("page");
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);
  const [expandedPageIds, setExpandedPageIds] = useState<Set<string>>(() => new Set());

  // --- Refs ---
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const historyMenuRef = useRef<HTMLDivElement | null>(null);

  // --- 1. Session Notes (Scratchpad) State ---
  const [notes, setNotes] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(NOTE_KEY) ?? "";
    }
    return "";
  });
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- 2. Quests / Todos State ---
  const [todos, setTodos] = useState<TodoItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(TODO_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [newTodoText, setNewTodoText] = useState("");
  const [newTodoType, setNewTodoType] = useState<TodoItem["type"]>("main");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  // --- 3. Notion Config & Integration State ---
  const [showNotionSettings, setShowNotionSettings] = useState(false);
  const [notionToken, setNotionToken] = useState(
    "ntn_H95757101687isncEDbBEQfsUR9ddZxFMhpBNsjkarcajU",
  );
  const [notionParentId, setNotionParentId] = useState("");
  const [notionParentType, setNotionParentType] = useState<"database" | "page" | "workspace">(
    "workspace",
  );
  const [triggerRefresh, setTriggerRefresh] = useState(0);

  // --- 4. Workspace Pages List & Search States ---
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [notionPages, setNotionPages] = useState<NotionPage[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [pagesError, setPagesError] = useState<string | null>(null);

  // --- 5. Selected Page Content Loading States ---
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedPageTitle, setSelectedPageTitle] = useState<string | null>(null);
  const [selectedPageIsDb, setSelectedPageIsDb] = useState<boolean>(false);
  const [navigationHistory, setNavigationHistory] = useState<
    { id: string; title: string; isDb: boolean }[]
  >([]);
  const [pageContent, setPageContent] = useState<string>("");
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  // --- 6. Editor Draft History & Formatting ---
  const HISTORY_KEY = "mob.notes-history.v1";
  const [showHistoryMenu, setShowHistoryMenu] = useState(false);
  const [history, setHistory] = useState<{ timestamp: number; content: string }[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("mob.notes-history.v1");
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  // Expand all pages by default on initial fetch
  useEffect(() => {
    if (notionPages.length > 0 && expandedPageIds.size === 0) {
      setExpandedPageIds(new Set(notionPages.map((p) => p.id)));
    }
  }, [notionPages]);

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

  const handleToggleExpand = (id: string) => {
    setExpandedPageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedPageIds(new Set(notionPages.map((p) => p.id)));
  };

  const handleCollapseAll = () => {
    setExpandedPageIds(new Set());
  };

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

  // --- 6. Sync Modal State ---
  const [showSyncModal, setShowSyncModal] = useState(false);
  useModalHistorySync(showSyncModal, setShowSyncModal, "isSessionNotesSyncModalOpen");
  const [syncTitle, setSyncTitle] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    url?: string;
    error?: string;
  } | null>(null);

  // Load Notion config on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("mob.notion-config.v1");
        if (stored) {
          const parsed = JSON.parse(stored);
          setNotionToken(parsed.token || "ntn_H95757101687isncEDbBEQfsUR9ddZxFMhpBNsjkarcajU");
          setNotionParentId(parsed.parentId || "");
          setNotionParentType(parsed.parentType || "workspace");
        }
      } catch (err) {
        console.warn("Failed to load Notion config:", err);
      }
    }
  }, [triggerRefresh]);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch Notion workspace/database pages
  const fetchNotionPages = async () => {
    if (!notionToken) {
      setNotionPages([]);
      return;
    }

    if (notionParentType === "database" && !notionParentId) {
      setNotionPages([]);
      return;
    }

    if (notionParentType === "page" && !notionParentId) {
      setNotionPages([]);
      return;
    }

    setIsLoadingPages(true);
    setPagesError(null);
    try {
      let url = `/api/notion?token=${encodeURIComponent(notionToken)}`;

      const useWorkspaceSearch =
        notionParentType === "workspace" || !notionParentId || debouncedSearchTerm.trim() !== "";

      if (useWorkspaceSearch) {
        url += `&workspaceSearch=true`;
        if (debouncedSearchTerm.trim()) {
          url += `&searchQuery=${encodeURIComponent(debouncedSearchTerm.trim())}`;
        }
      } else {
        url += `&parentId=${encodeURIComponent(notionParentId)}&parentType=${encodeURIComponent(notionParentType)}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        setNotionPages(data.pages || []);
      } else {
        setPagesError(data.error || "Failed to load Notion pages.");
      }
    } catch (err: any) {
      setPagesError(err.message || "Failed to fetch Notion logs from server.");
    } finally {
      setIsLoadingPages(false);
    }
  };

  useEffect(() => {
    fetchNotionPages();
  }, [triggerRefresh, debouncedSearchTerm, notionToken, notionParentId, notionParentType]);

  // Fetch individual page block content
  useEffect(() => {
    const fetchPageContent = async () => {
      if (activeMode !== "page" || !selectedPageId || !notionToken) return;
      setIsLoadingContent(true);
      setContentError(null);
      setPageContent("");
      try {
        let url = `/api/notion?token=${encodeURIComponent(notionToken)}&pageId=${encodeURIComponent(selectedPageId)}`;
        if (selectedPageIsDb) {
          url += `&isDatabase=true`;
        }
        const res = await fetch(url);
        const data = await res.json();
        if (res.ok && data.success) {
          setPageContent(data.markdown || "");
          if (data.parentDb && navigationHistory.length === 0) {
            setNavigationHistory([
              { id: data.parentDb.id, title: data.parentDb.title, isDb: true },
            ]);
          }
        } else {
          setContentError(data.error || "Failed to load page content from Notion.");
        }
      } catch (err: any) {
        setContentError(err.message || "An error occurred while loading notes.");
      } finally {
        setIsLoadingContent(false);
      }
    };

    fetchPageContent();
  }, [selectedPageId, activeMode, notionToken, selectedPageIsDb]);

  // Auto-select Campaign Timeline (or fallback to first page) when list is fetched (if in page mode and nothing selected)
  useEffect(() => {
    if (activeMode === "page" && !selectedPageId && notionPages.length > 0) {
      const timelinePage = notionPages.find((p) =>
        p.title?.toLowerCase().includes("campaign timeline"),
      );
      if (timelinePage) {
        setSelectedPageId(timelinePage.id);
        setSelectedPageTitle(timelinePage.title);
        setSelectedPageIsDb(timelinePage.object === "database");
      } else {
        setSelectedPageId(notionPages[0].id);
        setSelectedPageTitle(notionPages[0].title);
        setSelectedPageIsDb(notionPages[0].object === "database");
      }
    }
  }, [notionPages, activeMode, selectedPageId]);

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

  // Save todos whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(TODO_KEY, JSON.stringify(todos));
    } catch (err) {
      console.warn("Failed to save quests to localStorage:", err);
    }
  }, [todos]);

  // Config management
  const saveNotionConfig = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem(
        "mob.notion-config.v1",
        JSON.stringify({
          token: notionToken,
          parentId: notionParentId,
          parentType: notionParentType,
        }),
      );
      alert("Notion configuration saved successfully!");
      setShowNotionSettings(false);
      setTriggerRefresh((prev) => prev + 1);
    } catch (err) {
      alert("Failed to save Notion configuration.");
    }
  };

  // Quest Actions
  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;

    const newItem: TodoItem = {
      id: crypto.randomUUID(),
      text: newTodoText.trim(),
      completed: false,
      type: newTodoType,
      createdAt: Date.now(),
    };

    setTodos((prev) => [newItem, ...prev]);
    setNewTodoText("");
  };

  const handleToggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item)),
    );
  };

  const handleDeleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearCompleted = () => {
    if (window.confirm("Remove all completed quests/tasks?")) {
      setTodos((prev) => prev.filter((item) => !item.completed));
    }
  };

  const handleClearNotes = () => {
    if (
      window.confirm("Are you sure you want to clear your session notes? This cannot be undone.")
    ) {
      setNotes("");
      localStorage.setItem(NOTE_KEY, "");
      setIsSaving(false);
    }
  };

  // Sync Log Actions
  const handleOpenSync = () => {
    const dateStr = new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    setSyncTitle(`Session Journal - ${dateStr}`);
    setSyncResult(null);
    setShowSyncModal(true);
  };

  const handleSyncToNotion = async () => {
    if (!notes.trim()) return;
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const response = await fetch("/api/notion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: notionToken,
          parentId: notionParentId,
          parentType: notionParentType,
          title: syncTitle,
          markdown: notes,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSyncResult({ success: true, url: data.url });
        setTriggerRefresh((prev) => prev + 1); // Refresh page list
      } else {
        setSyncResult({ success: false, error: data.error || "Failed to sync to Notion." });
      }
    } catch (err: any) {
      setSyncResult({ success: false, error: err.message || "An unexpected error occurred." });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLoadPageIntoScratchpad = () => {
    if (
      window.confirm(
        `Are you sure you want to load "${selectedPageTitle}" into your scratchpad?\nWarning: This will overwrite your current active session notes.`,
      )
    ) {
      setNotes(pageContent);
      localStorage.setItem(NOTE_KEY, pageContent);
      setActiveMode("scratchpad");
      setSelectedPageId(null);
      setSelectedPageTitle(null);
      alert("Notes loaded into active session scratchpad!");
    }
  };

  const filteredTodos = todos.filter((t) => {
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  const activeCount = todos.filter((t) => !t.completed).length;

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-6 items-stretch min-h-[600px]">
        {/* LEFT COLUMN: Sidebar (Campaign Codex) */}
        <div className="w-full lg:w-[28%] flex flex-col card-arcane rounded-xl border border-border p-5 shadow-xl select-none min-h-[500px] flex-shrink-0">
          <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <BookOpen size={16} className="text-gold" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-foreground bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Campaign Codex
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {notionPages.length > 0 && (
                <div className="flex items-center gap-1.5 mr-1.5 border-r border-border/30 pr-2">
                  <button
                    type="button"
                    onClick={handleExpandAll}
                    className="text-[9px] uppercase font-bold text-muted-foreground hover:text-gold transition-colors duration-150 cursor-pointer"
                    title="Expand All Codex Pages"
                  >
                    Expand All
                  </button>
                  <span className="text-muted-foreground/30 text-[9px]">/</span>
                  <button
                    type="button"
                    onClick={handleCollapseAll}
                    className="text-[9px] uppercase font-bold text-muted-foreground hover:text-gold transition-colors duration-150 cursor-pointer"
                    title="Collapse All Codex Pages"
                  >
                    Collapse All
                  </button>
                </div>
              )}
              {notionToken && (
                <button
                  type="button"
                  onClick={fetchNotionPages}
                  disabled={isLoadingPages}
                  className="text-muted-foreground hover:text-gold disabled:opacity-40 transition-colors duration-150 cursor-pointer flex items-center justify-center p-1"
                  title="Refresh Codex Pages"
                >
                  <RefreshCw size={12} className={isLoadingPages ? "animate-spin" : ""} />
                </button>
              )}
              <button
                onClick={() => setShowNotionSettings(!showNotionSettings)}
                className={`text-muted-foreground hover:text-gold transition-colors duration-150 cursor-pointer flex items-center justify-center p-1 ${
                  showNotionSettings ? "text-gold" : ""
                }`}
                title="Notion Credentials"
              >
                <Settings size={12} />
              </button>
            </div>
          </div>

          {/* Config Settings inside Sidebar */}
          {showNotionSettings && (
            <form
              onSubmit={saveNotionConfig}
              className="mb-4 rounded-lg bg-secondary/15 border border-border/30 p-4 space-y-3 animate-fade-in select-text"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1">
                <Settings size={12} />
                Notion Configuration
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">
                    Integration Token (API Key)
                  </label>
                  <input
                    type="password"
                    value={notionToken}
                    onChange={(e) => setNotionToken(e.target.value)}
                    placeholder="secret_..."
                    required
                    className="w-full rounded bg-secondary/35 border border-border/40 px-2 py-1.5 text-xs text-foreground placeholder-muted-foreground/35 focus:outline-none focus:border-gold/50"
                  />
                </div>

                {notionParentType !== "workspace" && (
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">
                      Parent ID (Database/Page ID)
                    </label>
                    <input
                      type="text"
                      value={notionParentId}
                      onChange={(e) => setNotionParentId(e.target.value)}
                      placeholder="32-character ID"
                      required
                      className="w-full rounded bg-secondary/35 border border-border/40 px-2 py-1.5 text-xs text-foreground placeholder-muted-foreground/35 focus:outline-none focus:border-gold/50"
                    />
                  </div>
                )}

                <div>
                  <span className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">
                    Parent Type
                  </span>
                  <div className="flex rounded border border-border/40 overflow-hidden text-[10px]">
                    {(["database", "page", "workspace"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNotionParentType(type)}
                        className={`flex-1 px-2 py-1 capitalize transition-colors duration-150 cursor-pointer ${
                          notionParentType === type
                            ? "bg-gold/15 text-gold font-bold"
                            : "bg-secondary/25 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowNotionSettings(false)}
                    className="flex-1 rounded bg-secondary/25 border border-border/40 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded bg-gold/15 hover:bg-gold/25 border border-gold/40 py-1 text-[10px] font-bold text-gold cursor-pointer"
                  >
                    Save Config
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Search box for pages */}
          {notionToken && (
            <div className="relative mb-4">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-muted-foreground/50">
                <Search size={12} />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search campaign pages..."
                className="w-full rounded-lg bg-secondary/10 border border-border/40 hover:border-border/60 focus:border-gold/50 focus:ring-1 focus:ring-gold/20 pl-8 pr-8 py-1.5 text-xs text-foreground placeholder-muted-foreground/45 focus:outline-none transition-all duration-300"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-muted-foreground/50 hover:text-foreground cursor-pointer text-[10px] font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* Pages Scrollable List & Scratchpad block */}
          <div className="flex-1 min-h-0 flex flex-col justify-between">
            <div className="overflow-y-auto max-h-[380px] pr-1 custom-scrollbar space-y-1.5">
              {!notionToken ? (
                <div className="text-center py-10 space-y-3">
                  <Compass size={32} className="mx-auto text-muted-foreground/30 stroke-[1.5]" />
                  <p className="text-xs text-muted-foreground italic max-w-xs mx-auto leading-relaxed">
                    Connect your Notion integration to view your campaign workspace pages.
                  </p>
                  <button
                    onClick={() => setShowNotionSettings(true)}
                    className="rounded bg-gold/10 hover:bg-gold/20 border border-gold/30 px-3 py-1.5 text-[10px] font-bold text-gold cursor-pointer transition-colors duration-150"
                  >
                    Configure Notion
                  </button>
                </div>
              ) : isLoadingPages ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-xs text-muted-foreground">
                  <Loader2 size={16} className="animate-spin text-gold" />
                  <span>Scanning Notion workspace...</span>
                </div>
              ) : pagesError ? (
                <div className="text-center py-6 px-4">
                  <AlertCircle size={20} className="mx-auto text-rose-400 mb-2" />
                  <p className="text-xs text-rose-400 font-medium max-w-xs mx-auto leading-relaxed">
                    {pagesError}
                  </p>
                  <button
                    onClick={fetchNotionPages}
                    className="mt-3 text-[10px] uppercase font-bold tracking-wider text-muted-foreground hover:text-foreground cursor-pointer underline"
                  >
                    Try Again
                  </button>
                </div>
              ) : notionPages.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-8">
                  {searchTerm ? "No matching pages found." : "No pages found in this workspace."}
                </p>
              ) : (
                <>
                  <span className="block text-[9px] uppercase font-bold tracking-wider text-muted-foreground/50 border-b border-border/20 pb-1 mb-2">
                    Notion Documents
                  </span>
                  <div className="space-y-1">
                    {(() => {
                      const pageMap = new Map<string, any>();
                      notionPages.forEach((p) => pageMap.set(p.id, { ...p, children: [] }));

                      const roots: any[] = [];
                      pageMap.forEach((p) => {
                        const parentType = p.parent?.type;
                        const parentId =
                          parentType === "page_id"
                            ? p.parent.page_id
                            : parentType === "database_id"
                              ? p.parent.database_id
                              : null;

                        if (parentId && pageMap.has(parentId)) {
                          pageMap.get(parentId).children.push(p);
                        } else {
                          roots.push(p);
                        }
                      });

                      // Sort all children lists in ascending chronological order (oldest first)
                      pageMap.forEach((p) => {
                        p.children.sort((a: any, b: any) => {
                          const dateA = new Date(a.createdAt).getTime();
                          const dateB = new Date(b.createdAt).getTime();
                          return dateA - dateB;
                        });
                      });

                      // If a specific parent page/database is configured, display only its nested children
                      let displayNodes = roots;
                      if (notionParentType !== "workspace" && notionParentId) {
                        const targetKey = Array.from(pageMap.keys()).find(
                          (k) =>
                            k.replace(/-/g, "").toLowerCase() ===
                            notionParentId.replace(/-/g, "").toLowerCase(),
                        );
                        if (targetKey) {
                          displayNodes = pageMap.get(targetKey).children;
                        }
                      } else {
                        // In workspace/root mode, sort roots by last edited / creation time (descending),
                        // but prioritize "Campaign Timeline" first and "Mother of Bob" second
                        displayNodes.sort((a: any, b: any) => {
                          const aTitle = a.title?.toLowerCase() || "";
                          const bTitle = b.title?.toLowerCase() || "";

                          const isATimeline = aTitle.includes("campaign timeline");
                          const isBTimeline = bTitle.includes("campaign timeline");
                          const isAMotherOfBob = aTitle.includes("mother of bob");
                          const isBMotherOfBob = bTitle.includes("mother of bob");

                          if (isATimeline && !isBTimeline) return -1;
                          if (!isATimeline && isBTimeline) return 1;

                          if (isAMotherOfBob && !isBMotherOfBob) {
                            return isBTimeline ? 1 : -1;
                          }
                          if (!isAMotherOfBob && isBMotherOfBob) {
                            return isATimeline ? -1 : 1;
                          }

                          const dateA = new Date(a.createdAt).getTime();
                          const dateB = new Date(b.createdAt).getTime();
                          return dateB - dateA; // Default descending for other roots
                        });
                      }

                      return displayNodes.map((root) => (
                        <TreeItem
                          key={root.id}
                          item={root}
                          depth={0}
                          selectedId={selectedPageId}
                          onSelect={(id, title, isDb) => {
                            setActiveMode("page");
                            setSelectedPageId(id);
                            setSelectedPageTitle(title);
                            setSelectedPageIsDb(!!isDb);

                            // Check if selected page has a parent database and prepopulate history
                            const selectedPage = notionPages.find((p) => p.id === id);
                            if (
                              selectedPage?.parent?.type === "database_id" &&
                              selectedPage.parent.database_id
                            ) {
                              const parentDbId = selectedPage.parent.database_id;
                              const cleanParentId = parentDbId.replace(/-/g, "").toLowerCase();
                              const parentDb = notionPages.find(
                                (p) => p.id.replace(/-/g, "").toLowerCase() === cleanParentId,
                              );
                              if (parentDb) {
                                setNavigationHistory([
                                  { id: parentDb.id, title: parentDb.title, isDb: true },
                                ]);
                                return;
                              }
                            }
                            setNavigationHistory([]); // Clear history on new sidebar selections
                          }}
                          searchQuery={searchTerm}
                          notionPages={notionPages}
                          expandedPageIds={expandedPageIds}
                          onToggleExpand={handleToggleExpand}
                        />
                      ));
                    })()}
                  </div>
                </>
              )}
            </div>

            {/* Special static item: Active Scratchpad */}
            <div className="pt-4 mt-4 border-t border-border/20">
              <button
                onClick={() => {
                  setActiveMode("scratchpad");
                }}
                className={`w-full text-left p-3 rounded-lg border transition-all duration-200 cursor-pointer flex items-center gap-3 ${
                  activeMode === "scratchpad"
                    ? "bg-gold/15 border-gold/50 text-gold font-bold shadow-[0_0_10px_rgba(212,175,55,0.12)]"
                    : "border-border/40 bg-secondary/10 hover:bg-secondary/15 hover:border-border/60 text-foreground"
                }`}
              >
                <FileText
                  size={16}
                  className={activeMode === "scratchpad" ? "text-gold" : "text-muted-foreground"}
                />
                <div className="min-w-0 flex-1 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider font-bold">
                    Session Scratchpad
                  </span>
                  <span className="flex h-2 w-2 relative">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeMode === "scratchpad" ? "bg-gold" : "bg-emerald-400"}`}
                    ></span>
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${activeMode === "scratchpad" ? "bg-gold" : "bg-emerald-400"}`}
                    ></span>
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Work Area */}
        <div className="flex-1 flex flex-col card-arcane rounded-xl border border-border p-6 shadow-xl transition-all duration-300 min-h-[500px] min-w-0">
          {/* VIEW MODE 1: Scratchpad Workspace */}
          {activeMode === "scratchpad" && (
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
                              const timeStr = new Date(snapshot.timestamp).toLocaleTimeString(
                                undefined,
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              );
                              const dateStr = new Date(snapshot.timestamp).toLocaleDateString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                },
                              );
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
                    onClick={handleClearNotes}
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
                {!isEditorExpanded && (
                  <div className="xl:col-span-5 flex flex-col border-t xl:border-t-0 xl:border-l border-border/20 pt-5 xl:pt-0 xl:pl-6">
                    <div className="flex items-center justify-between border-b border-border/20 pb-2 mb-3 select-none">
                      <div className="flex items-center gap-1.5">
                        <ListTodo size={14} className="text-gold" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Quests & Tasks
                        </span>
                      </div>
                      <span className="rounded-full bg-gold/10 border border-gold/25 px-1.5 py-0.5 text-[9px] font-bold text-gold font-mono">
                        {activeCount} Active
                      </span>
                    </div>

                    {/* Add quest form */}
                    <form onSubmit={handleAddTodo} className="space-y-2 mb-4 select-text">
                      <div className="relative">
                        <input
                          type="text"
                          value={newTodoText}
                          onChange={(e) => setNewTodoText(e.target.value)}
                          placeholder="Log a new quest..."
                          className="w-full rounded-lg bg-secondary/15 border border-border/40 focus:border-gold/50 focus:ring-1 focus:ring-gold/20 pl-3 pr-8 py-1.5 text-xs text-foreground placeholder-muted-foreground/50 focus:outline-none transition-all duration-300"
                        />
                        <button
                          type="submit"
                          disabled={!newTodoText.trim()}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-md bg-gold/15 hover:bg-gold/25 border border-gold/30 text-gold disabled:opacity-40 disabled:hover:bg-gold/15 transition-all duration-200 cursor-pointer"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        {(Object.keys(BADGES) as Array<TodoItem["type"]>).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setNewTodoType(type)}
                            className={`rounded border px-1.5 py-0.5 text-[8px] font-medium transition-all duration-200 cursor-pointer capitalize ${
                              newTodoType === type
                                ? "bg-gold/20 border-gold text-gold"
                                : "bg-secondary/20 border-border/30 text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {BADGES[type].label.split(" ")[0]}
                          </button>
                        ))}
                      </div>
                    </form>

                    {/* Filter Toolbar */}
                    <div className="flex items-center justify-between border-b border-border/20 pb-1.5 mb-2.5 text-[10px] select-none">
                      <div className="flex items-center gap-1">
                        {(["all", "active", "completed"] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setFilter(mode)}
                            className={`px-1.5 py-0.5 capitalize rounded transition-colors duration-200 cursor-pointer font-medium ${
                              filter === mode
                                ? "text-gold bg-gold/5 font-semibold"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                      {todos.some((t) => t.completed) && (
                        <button
                          onClick={handleClearCompleted}
                          className="font-bold uppercase tracking-wider text-rose-400/80 hover:text-rose-400 transition-colors duration-200 cursor-pointer"
                        >
                          Clear Done
                        </button>
                      )}
                    </div>

                    {/* Quest Scrollable List */}
                    <div className="flex-1 overflow-y-auto max-h-[260px] space-y-1.5 pr-1 custom-scrollbar">
                      {filteredTodos.length === 0 ? (
                        <div className="text-center py-6 select-none">
                          <p className="text-[10px] text-muted-foreground italic">
                            No quests found.
                          </p>
                        </div>
                      ) : (
                        filteredTodos.map((todo) => {
                          const badge = BADGES[todo.type];
                          return (
                            <div
                              key={todo.id}
                              className={`group flex items-start justify-between gap-2.5 rounded-lg border p-2.5 transition-all duration-300 ${
                                todo.completed
                                  ? "bg-secondary/5 border-border/20 opacity-60"
                                  : "bg-secondary/10 border-border/30 hover:border-border/50 hover:bg-secondary/15"
                              }`}
                            >
                              <div className="flex items-start gap-2 flex-1 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => handleToggleTodo(todo.id)}
                                  className="mt-0.5 text-muted-foreground hover:text-gold transition-colors duration-200 cursor-pointer flex-shrink-0"
                                >
                                  {todo.completed ? (
                                    <CheckCircle2 size={14} className="text-gold" />
                                  ) : (
                                    <Circle size={14} />
                                  )}
                                </button>
                                <div className="min-w-0 flex-1">
                                  <p
                                    className={`text-xs leading-normal break-words text-foreground select-text ${todo.completed ? "line-through text-muted-foreground" : ""}`}
                                  >
                                    {todo.text}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-1 select-none">
                                    <span
                                      className={`rounded-full border px-1 py-0.2 text-[7px] font-bold tracking-wide uppercase ${badge.color}`}
                                    >
                                      {badge.label.split(" ")[0]}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteTodo(todo.id)}
                                className="text-muted-foreground hover:text-rose-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200 cursor-pointer flex-shrink-0 p-0.5"
                                title="Delete quest"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW MODE 2: Read-Only Notion Page */}
          {activeMode === "page" && selectedPageId && (
            <div className="flex-1 flex flex-col select-text">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4 select-none">
                <div className="flex items-center gap-3 min-w-0">
                  {navigationHistory.length > 0 && (
                    <button
                      onClick={() => {
                        const historyCopy = [...navigationHistory];
                        const previousPage = historyCopy.pop();
                        if (previousPage) {
                          setNavigationHistory(historyCopy);
                          setSelectedPageId(previousPage.id);
                          setSelectedPageTitle(previousPage.title);
                          setSelectedPageIsDb(previousPage.isDb);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gold/30 hover:border-gold/60 bg-gold/5 hover:bg-gold/15 text-xs font-bold text-gold transition-all duration-200 cursor-pointer shadow-[0_0_8px_rgba(212,175,55,0.05)] hover:shadow-[0_0_12px_rgba(212,175,55,0.15)] flex-shrink-0"
                      title={`Back to ${navigationHistory[navigationHistory.length - 1]?.title || "previous page"}`}
                    >
                      <ChevronRight size={12} className="transform rotate-180 text-gold" />
                      <span className="max-w-[150px] truncate">
                        Back to{" "}
                        {navigationHistory[navigationHistory.length - 1]?.title
                          ? parseInlineStyles(navigationHistory[navigationHistory.length - 1].title)
                          : "Codex"}
                      </span>
                    </button>
                  )}
                  <h2 className="text-base font-heading font-bold text-gold leading-none select-text truncate">
                    {selectedPageTitle ? parseInlineStyles(selectedPageTitle) : ""}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleLoadPageIntoScratchpad}
                    disabled={isLoadingContent}
                    className="rounded bg-gold/10 hover:bg-gold/20 border border-gold/30 px-2.5 py-1.5 text-[9px] font-bold text-gold transition-colors duration-150 cursor-pointer flex items-center gap-1 disabled:opacity-40"
                    title="Load these notes into your active session log"
                  >
                    <span>Import to Scratchpad</span>
                  </button>
                  {notionPages.find((p) => p.id === selectedPageId)?.url && (
                    <a
                      href={notionPages.find((p) => p.id === selectedPageId)?.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded bg-secondary hover:bg-secondary/80 border border-border/40 p-1.5 text-muted-foreground hover:text-foreground transition-colors duration-150 flex items-center justify-center"
                      title="Open page in Notion"
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              </div>

              {/* Content Box */}
              <div className="flex-1 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                {isLoadingContent ? (
                  <div className="h-full flex flex-col items-center justify-center py-20 gap-3 text-xs text-muted-foreground select-none">
                    <Loader2 size={20} className="animate-spin text-gold" />
                    <span>Retrieving document content from Notion...</span>
                  </div>
                ) : contentError ? (
                  <div className="text-center py-12 px-6 select-none">
                    <AlertCircle size={24} className="mx-auto text-rose-400 mb-3" />
                    <p className="text-sm text-rose-400 font-medium max-w-md mx-auto leading-relaxed">
                      {contentError}
                    </p>
                    <button
                      onClick={() => setSelectedPageId(selectedPageId)}
                      className="mt-4 text-xs font-bold text-muted-foreground hover:text-foreground underline cursor-pointer"
                    >
                      Retry Loading Page
                    </button>
                  </div>
                ) : (
                  <div className="py-1">
                    <MarkdownRenderer
                      content={pageContent}
                      onSelectPage={(id, title, isDb) => {
                        if (selectedPageId && selectedPageTitle) {
                          setNavigationHistory((prev) => [
                            ...prev,
                            {
                              id: selectedPageId,
                              title: selectedPageTitle,
                              isDb: selectedPageIsDb,
                            },
                          ]);
                        }
                        setActiveMode("page");
                        setSelectedPageId(id);
                        setSelectedPageTitle(title);
                        setSelectedPageIsDb(!!isDb);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sync Modal Pop-up */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl animate-fade-in card-arcane">
            <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gold flex items-center gap-1.5">
                <Send size={14} className="text-gold" />
                Sync to Notion
              </h3>
              <button
                onClick={() => setShowSyncModal(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer text-sm font-bold animate-pulse"
              >
                ✕
              </button>
            </div>

            {syncResult === null ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">
                    Session Entry Title
                  </label>
                  <input
                    type="text"
                    value={syncTitle}
                    onChange={(e) => setSyncTitle(e.target.value)}
                    placeholder="e.g., Session 14: The Return of Bob"
                    required
                    className="w-full rounded-lg bg-secondary/15 border border-border/40 focus:border-gold/50 focus:ring-1 focus:ring-gold/20 px-3 py-2 text-xs text-foreground placeholder-muted-foreground/50 focus:outline-none transition-all duration-300"
                  />
                </div>

                <p className="text-[10px] text-muted-foreground leading-normal">
                  This will create a new page named{" "}
                  <strong className="text-foreground">"{syncTitle}"</strong> inside your specified
                  Notion {notionParentType === "database" ? "database" : "page"} and sync all
                  markdown journal notes.
                </p>

                <div className="flex justify-end gap-2 pt-2 border-t border-border/20">
                  <button
                    onClick={() => setShowSyncModal(false)}
                    className="rounded bg-secondary/25 border border-border/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/45 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSyncToNotion}
                    disabled={isSyncing || !syncTitle.trim()}
                    className="rounded bg-gold/15 hover:bg-gold/25 border border-gold/40 px-3 py-1.5 text-xs font-bold text-gold disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        <span>Syncing...</span>
                      </>
                    ) : (
                      <>
                        <Send size={12} />
                        <span>Push to Notion</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-2 text-center">
                {syncResult.success ? (
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Check size={20} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-xs text-foreground">
                        Sync Completed Successfully!
                      </h4>
                      <p className="text-[10px] text-muted-foreground">
                        Your journal notes have been published to Notion.
                      </p>
                    </div>
                    <div className="pt-2 flex gap-3 w-full">
                      <button
                        onClick={() => setShowSyncModal(false)}
                        className="flex-1 rounded bg-secondary/35 border border-border/40 py-1.5 text-xs font-semibold text-foreground hover:text-accent cursor-pointer"
                      >
                        Close
                      </button>
                      {syncResult.url && (
                        <a
                          href={syncResult.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 rounded bg-gold/15 hover:bg-gold/25 border border-gold/40 py-1.5 text-xs font-bold text-gold cursor-pointer inline-flex items-center justify-center gap-1"
                        >
                          <span>Open in Notion</span>
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                      <AlertCircle size={20} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-xs text-rose-400">Sync Failed</h4>
                      <p className="text-[10px] text-muted-foreground max-w-xs break-words">
                        {syncResult.error}
                      </p>
                    </div>
                    <div className="pt-2 w-full flex gap-3">
                      <button
                        onClick={() => setSyncResult(null)}
                        className="flex-1 rounded bg-secondary/35 border border-border/40 py-1.5 text-xs font-semibold text-foreground hover:text-accent cursor-pointer"
                      >
                        Retry
                      </button>
                      <button
                        onClick={() => setShowSyncModal(false)}
                        className="flex-1 rounded bg-secondary/15 border border-transparent py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Parse inline styles: bold (**text**), italic (*text*), and markdown pageId links ([Title](pageId:ID))
function parseInlineStyles(
  text: string,
  onSelectPage?: (id: string, title: string) => void,
): React.ReactNode {
  if (!text) return "";

  // Split by pageId links: [Title](pageId:ID)
  const linkRegex = /\[(.*?)\]\(pageId:(.*?)\)/g;
  const parts = text.split(linkRegex);

  if (parts.length === 1) {
    // No links, just parse bold/italic
    return parseBoldItalic(text);
  }

  const elements: React.ReactNode[] = [];
  for (let i = 0; i < parts.length; i += 3) {
    // Add non-link text
    if (parts[i]) {
      elements.push(<span key={`text-${i}`}>{parseBoldItalic(parts[i])}</span>);
    }

    // Add link button
    if (i + 2 < parts.length) {
      const linkTitle = parts[i + 1];
      const linkId = parts[i + 2];
      if (onSelectPage) {
        elements.push(
          <button
            key={`link-${i}`}
            onClick={() => onSelectPage(linkId, linkTitle)}
            className="text-purple-400 hover:text-purple-300 font-bold hover:underline bg-transparent border-none p-0 cursor-pointer text-left inline mx-0.5"
          >
            {linkTitle}
          </button>,
        );
      } else {
        elements.push(
          <span key={`link-${i}`} className="text-purple-400 font-semibold mx-0.5">
            {linkTitle}
          </span>,
        );
      }
    }
  }

  return <>{elements}</>;
}

// Inner helper to parse bold and italic
function parseBoldItalic(text: string): React.ReactNode {
  const boldParts = text.split(/\*\*([^*]+)\*\*/g);
  return boldParts.map((part, index) => {
    if (index % 2 === 1) {
      return (
        <strong key={index} className="text-gold font-bold">
          {part}
        </strong>
      );
    }
    const italicParts = part.split(/\*([^*]+)\*/g);
    return italicParts.map((subPart, subIndex) => {
      if (subIndex % 2 === 1) {
        return (
          <em key={subIndex} className="italic text-foreground/90">
            {subPart}
          </em>
        );
      }
      return subPart;
    });
  });
}

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

  const visibleHeadersCount = headers.length - hiddenColumns.size;

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

// Markdown Renderer Helper (encapsulated)
function MarkdownRenderer({
  content,
  onSelectPage,
}: {
  content: string;
  onSelectPage: (id: string, title: string, isDb?: boolean) => void;
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
          .filter((h, idx, arr) => idx > 0 && idx < arr.length - 1);

        const rowsData = tableLines.slice(2).map((line) => {
          return line
            .split("|")
            .map((cell) => cell.trim())
            .filter((cell, idx, arr) => idx > 0 && idx < arr.length - 1);
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
              return (
                <button
                  key={idx}
                  onClick={() => onSelectPage(linkId, linkTitle)}
                  className={`${
                    isFirstCol
                      ? "text-gold hover:text-yellow-300"
                      : "text-purple-400 hover:text-purple-300"
                  } font-bold hover:underline bg-transparent border-none p-0 cursor-pointer text-left inline`}
                >
                  {linkTitle}
                </button>
              );
            }
            return <span key={idx}>{parseInlineStyles(part)}</span>;
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

// Helper to highlight matching characters from active workspace search
function highlightMatch(text: string, query: string) {
  if (!query || !query.trim() || !text) return parseInlineStyles(text);

  const cleanQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  const regex = new RegExp(`(${cleanQuery})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-gold/25 text-yellow-300 rounded px-0.5 font-semibold">
        {part}
      </mark>
    ) : (
      <React.Fragment key={i}>{parseInlineStyles(part)}</React.Fragment>
    ),
  );
}

// Tree Item Component for Hierarchical Codex Sidebar
interface TreeItemProps {
  item: any;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string, title: string, isDb?: boolean) => void;
  searchQuery?: string;
  notionPages?: any[];
  expandedPageIds: Set<string>;
  onToggleExpand: (id: string) => void;
}

function TreeItem({
  item,
  depth,
  selectedId,
  onSelect,
  searchQuery,
  notionPages = [],
  expandedPageIds,
  onToggleExpand,
}: TreeItemProps) {
  const hasChildren = item.children && item.children.length > 0;
  const isSelected = selectedId === item.id;
  const isOpen = expandedPageIds.has(item.id);

  // Search Results Badging: highlight object type when searching
  let badgeElement = null;
  if (searchQuery && searchQuery.trim() !== "") {
    if (item.object === "database") {
      badgeElement = (
        <span className="text-[7.5px] font-bold border px-1 py-0.2 rounded bg-amber-500/10 text-amber-400 border-amber-500/25 flex-shrink-0 select-none scale-90 tracking-wide uppercase">
          DB
        </span>
      );
    } else if (item.parent?.type === "database_id") {
      const parentDb = notionPages.find((p) => p.id === item.parent?.database_id);
      let text = "Entry";
      let colorClass = "bg-sky-500/10 text-sky-400 border-sky-500/25";
      if (parentDb) {
        const parentTitle = parentDb.title.toLowerCase();
        if (parentTitle.includes("npc")) {
          text = "NPC";
          colorClass = "bg-purple-500/10 text-purple-400 border-purple-500/25";
        } else if (parentTitle.includes("loc")) {
          text = "Loc";
          colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/25";
        } else {
          text = parentDb.title.length > 8 ? parentDb.title.slice(0, 6) + ".." : parentDb.title;
          colorClass = "bg-sky-500/10 text-sky-400 border-sky-500/25";
        }
      }
      badgeElement = (
        <span
          className={`text-[7.5px] font-bold border px-1 py-0.2 rounded flex-shrink-0 select-none scale-90 tracking-wide uppercase ${colorClass}`}
        >
          {text}
        </span>
      );
    }
  }

  return (
    <div className="space-y-1">
      <div
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        className={`group flex items-center justify-between p-1.5 rounded-lg border transition-all duration-200 cursor-pointer ${
          isSelected
            ? "bg-gold/10 border-gold/45 text-gold font-bold shadow-[0_0_8px_rgba(212,175,55,0.08)]"
            : "border-transparent hover:bg-secondary/10 hover:border-border/30 text-foreground"
        }`}
        onClick={() => onSelect(item.id, item.title, item.object === "database")}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-between">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand(item.id);
                }}
                className="text-muted-foreground hover:text-foreground p-0.5 flex items-center justify-center cursor-pointer"
              >
                <ChevronRight
                  size={10}
                  className={`transform transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                />
              </button>
            ) : (
              <span className="w-4 flex-shrink-0" />
            )}
            {item.object === "database" ? (
              <Database size={11} className="text-amber-400/80 flex-shrink-0" />
            ) : (
              <FileText size={11} className="text-muted-foreground/60 flex-shrink-0" />
            )}
            <span className="text-xs truncate">
              {highlightMatch(item.title, searchQuery || "")}
            </span>
          </div>
          {badgeElement}
        </div>
      </div>
      {hasChildren && isOpen && (
        <div className="space-y-1">
          {item.children.map((child: any) => (
            <TreeItem
              key={child.id}
              item={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              searchQuery={searchQuery}
              notionPages={notionPages}
              expandedPageIds={expandedPageIds}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}
