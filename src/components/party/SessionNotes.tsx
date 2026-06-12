import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, CheckCircle2, Circle, Sparkles, ListTodo, FileText, Check, AlertCircle, Settings, Send, ExternalLink, Loader2, Database } from "lucide-react";

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  type: "main" | "side" | "bounty" | "personal";
  createdAt: number;
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

  // --- Notion Config & Sync State ---
  const [showNotionSettings, setShowNotionSettings] = useState(false);
  const [notionToken, setNotionToken] = useState("");
  const [notionParentId, setNotionParentId] = useState("");
  const [notionParentType, setNotionParentType] = useState<"database" | "page">("database");
  const [triggerRefresh, setTriggerRefresh] = useState(0);

  // Load Notion config on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("mob.notion-config.v1");
        if (stored) {
          const parsed = JSON.parse(stored);
          setNotionToken(parsed.token || "");
          setNotionParentId(parsed.parentId || "");
          setNotionParentType(parsed.parentType || "database");
          setTriggerRefresh((prev) => prev + 1);
        }
      } catch (err) {
        console.warn("Failed to load Notion config:", err);
      }
    }
  }, []);

  const saveNotionConfig = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem(
        "mob.notion-config.v1",
        JSON.stringify({ token: notionToken, parentId: notionParentId, parentType: notionParentType })
      );
      alert("Notion configuration saved successfully!");
      setShowNotionSettings(false);
      setTriggerRefresh((prev) => prev + 1);
    } catch (err) {
      alert("Failed to save Notion configuration.");
    }
  };

  // Sync state
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncTitle, setSyncTitle] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; url?: string; error?: string } | null>(null);

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

  // --- Notion Import & Load States ---
  const [notionPages, setNotionPages] = useState<any[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [pagesError, setPagesError] = useState<string | null>(null);
  const [loadingPageId, setLoadingPageId] = useState<string | null>(null);

  const fetchNotionPages = async () => {
    if (!notionToken || !notionParentId || notionParentType !== "database") {
      setNotionPages([]);
      return;
    }
    setIsLoadingPages(true);
    setPagesError(null);
    try {
      const res = await fetch(
        `/api/notion?token=${encodeURIComponent(notionToken)}&parentId=${encodeURIComponent(notionParentId)}`
      );
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
  }, [triggerRefresh]);

  const handleLoadPageContent = async (pageId: string, pageTitle: string) => {
    if (
      !window.confirm(
        `Are you sure you want to load "${pageTitle}" into your scratchpad?\nWarning: This will overwrite your current local journal notes.`
      )
    ) {
      return;
    }
    setLoadingPageId(pageId);
    try {
      const res = await fetch(
        `/api/notion?token=${encodeURIComponent(notionToken)}&pageId=${encodeURIComponent(pageId)}`
      );
      const data = await res.json();
      if (res.ok && data.success) {
        const markdown = data.markdown || "";
        setNotes(markdown);
        localStorage.setItem(NOTE_KEY, markdown);
        alert("Notes successfully loaded into scratchpad!");
      } else {
        alert(data.error || "Failed to load page content from Notion.");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred while loading notes.");
    } finally {
      setLoadingPageId(null);
    }
  };

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

  // Actions
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
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
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
    if (window.confirm("Are you sure you want to clear your session notes? This cannot be undone.")) {
      setNotes("");
      localStorage.setItem(NOTE_KEY, "");
      setIsSaving(false);
    }
  };

  // Filtered lists
  const filteredTodos = todos.filter((t) => {
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  const activeCount = todos.filter((t) => !t.completed).length;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* LEFT COLUMN: Markdown Journal & Notion Logs */}
      <div className="lg:col-span-7 space-y-6 flex flex-col">
        {/* Card 1: Journal */}
        <div className="flex flex-col min-h-[500px] card-arcane rounded-xl border border-border p-5 shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4 select-none">
          <div className="flex items-center gap-2.5">
            <FileText size={16} className="text-gold" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-foreground bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Campaign Journal
            </h2>
          </div>
          <div className="flex items-center gap-3.5">
            {notionToken && notionParentId && (
              <button
                onClick={handleOpenSync}
                disabled={!notes.trim()}
                className="text-[10px] uppercase font-bold tracking-wider text-gold hover:text-yellow-300 disabled:opacity-30 disabled:hover:text-gold transition-colors duration-200 cursor-pointer flex items-center gap-1"
              >
                <Send size={10} />
                Sync Notion
              </button>
            )}

            <button
              onClick={() => setShowNotionSettings(!showNotionSettings)}
              className={`text-[10px] uppercase font-bold tracking-wider transition-colors duration-200 cursor-pointer flex items-center gap-1 ${
                showNotionSettings ? "text-gold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Settings size={10} />
              Notion Config
            </button>

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
              onClick={handleClearNotes}
              disabled={!notes}
              className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground hover:text-rose-400 disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors duration-200 cursor-pointer"
            >
              Clear Notes
            </button>
          </div>
        </div>

        {showNotionSettings && (
          <form onSubmit={saveNotionConfig} className="mb-4 rounded-lg bg-secondary/15 border border-border/30 p-4 space-y-3 animate-fade-in select-none">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1">
              <Settings size={12} />
              Notion Integration Settings
            </h3>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Create an integration in your Notion workspace (at developers.notion.com) and share your Database or Page with it.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">
                  Parent ID (Database or Page ID)
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
            </div>
            <div className="flex items-center justify-between gap-4 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                  Parent Type:
                </span>
                <div className="flex rounded border border-border/40 overflow-hidden text-[10px]">
                  <button
                    type="button"
                    onClick={() => setNotionParentType("database")}
                    className={`px-2 py-1 transition-colors duration-150 cursor-pointer ${
                      notionParentType === "database"
                        ? "bg-gold/15 text-gold font-bold"
                        : "bg-secondary/25 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Database
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotionParentType("page")}
                    className={`px-2 py-1 transition-colors duration-150 cursor-pointer ${
                      notionParentType === "page"
                        ? "bg-gold/15 text-gold font-bold"
                        : "bg-secondary/25 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Page
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowNotionSettings(false)}
                  className="rounded bg-secondary/25 border border-border/40 px-3 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/40 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-gold/15 hover:bg-gold/25 border border-gold/40 px-3 py-1 text-[10px] font-bold text-gold cursor-pointer"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="flex-1 flex flex-col">
          <textarea
            value={notes}
            onChange={handleNotesChange}
            placeholder="Type your campaign journal, loot tracking, NPC details, or session summaries here... Supports raw text and scratchpad notes."
            className="flex-1 w-full min-h-[380px] lg:min-h-[420px] rounded-lg bg-secondary/10 border border-border/40 hover:border-border/60 focus:border-gold/50 focus:ring-1 focus:ring-gold/20 p-4 text-sm text-foreground placeholder-muted-foreground/50 resize-y focus:outline-none transition-all duration-300 font-sans leading-relaxed"
          />
          <div className="mt-3 flex justify-between items-center text-[10px] text-muted-foreground font-mono select-none">
            <span>Character count: {notes.length}</span>
            <span>Auto-saving enabled (Local Storage)</span>
          </div>
        </div>
      </div>

        {/* Card 2: Notion Logs */}
        <div className="card-arcane rounded-xl border border-border p-5 shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4 select-none">
            <div className="flex items-center gap-2.5">
              <Database size={16} className="text-gold" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-foreground bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Recent Notion Logs
              </h2>
            </div>
            {notionToken && notionParentId && notionParentType === "database" && (
              <button
                type="button"
                onClick={fetchNotionPages}
                disabled={isLoadingPages}
                className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground hover:text-gold disabled:opacity-40 transition-colors duration-200 cursor-pointer"
              >
                {isLoadingPages ? "Refreshing..." : "Refresh"}
              </button>
            )}
          </div>

          {!notionToken || !notionParentId ? (
            <p className="text-xs text-muted-foreground italic text-center py-4 select-none">
              Configure your Notion Integration above to load and view synced campaign logs.
            </p>
          ) : notionParentType === "page" ? (
            <p className="text-xs text-muted-foreground italic text-center py-4 select-none">
              Page listing is only supported for Notion Databases. (Syncing directly to a parent Page ID is supported).
            </p>
          ) : isLoadingPages ? (
            <div className="flex items-center justify-center py-8 text-xs text-muted-foreground select-none">
              <Loader2 size={16} className="animate-spin text-gold mr-2" />
              <span>Fetching Notion database logs...</span>
            </div>
          ) : pagesError ? (
            <p className="text-xs text-rose-400 italic text-center py-4 select-none">
              Error loading Notion logs: {pagesError}
            </p>
          ) : notionPages.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-4 select-none">
              No session pages found in this Notion database yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
              {notionPages.map((page) => (
                <div
                  key={page.id}
                  className="flex items-center justify-between gap-4 p-2.5 rounded-lg border border-border/30 bg-secondary/5 hover:bg-secondary/10 hover:border-border/60 transition-all duration-200"
                >
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-foreground truncate">{page.title}</span>
                    <span className="block text-[9px] text-muted-foreground font-mono mt-0.5">
                      Synced: {new Date(page.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 select-none">
                    <button
                      type="button"
                      onClick={() => handleLoadPageContent(page.id, page.title)}
                      disabled={loadingPageId !== null}
                      className="rounded bg-gold/10 hover:bg-gold/20 border border-gold/30 px-2 py-1 text-[9px] font-bold text-gold transition-colors duration-150 cursor-pointer disabled:opacity-40"
                    >
                      {loadingPageId === page.id ? "Loading..." : "Load Notes"}
                    </button>
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded bg-secondary border border-border/40 p-1.5 text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors duration-150"
                      title="Open page in Notion"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Quest & Todo Tracker */}
      <div className="lg:col-span-5 flex flex-col card-arcane rounded-xl border border-border p-5 shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4 select-none">
          <div className="flex items-center gap-2.5">
            <ListTodo size={16} className="text-gold" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-foreground bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Quests & Tasks
            </h2>
          </div>
          <span className="rounded-full bg-gold/10 border border-gold/25 px-2 py-0.5 text-[10px] font-bold text-gold font-mono">
            {activeCount} Active
          </span>
        </div>

        {/* Add quest form */}
        <form onSubmit={handleAddTodo} className="space-y-3 mb-5">
          <div>
            <div className="relative">
              <input
                type="text"
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                placeholder="Log a new quest or party goal..."
                className="w-full rounded-lg bg-secondary/15 border border-border/40 focus:border-gold/50 focus:ring-1 focus:ring-gold/20 pl-3 pr-10 py-2 text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none transition-all duration-300"
              />
              <button
                type="submit"
                disabled={!newTodoText.trim()}
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-gold/15 hover:bg-gold/25 border border-gold/30 text-gold disabled:opacity-40 disabled:hover:bg-gold/15 transition-all duration-200 cursor-pointer"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Type Selectors */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase mr-1 select-none">
              Category:
            </span>
            {(Object.keys(BADGES) as Array<TodoItem["type"]>).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setNewTodoType(type)}
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-all duration-200 cursor-pointer ${
                  newTodoType === type
                    ? "bg-gold/20 border-gold text-gold shadow-[0_0_8px_rgba(212,175,55,0.1)]"
                    : "bg-secondary/20 border-border/40 text-muted-foreground hover:text-foreground hover:border-border/80"
                }`}
              >
                {BADGES[type].label}
              </button>
            ))}
          </div>
        </form>

        {/* Filter Toolbar */}
        <div className="flex items-center justify-between border-b border-border/30 pb-2 mb-3 text-xs select-none">
          <div className="flex items-center gap-1.5">
            {(["all", "active", "completed"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                className={`px-2 py-0.5 capitalize rounded-md transition-colors duration-200 cursor-pointer font-medium ${
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
              className="text-[10px] font-bold uppercase tracking-wider text-rose-400/80 hover:text-rose-400 transition-colors duration-200 cursor-pointer"
            >
              Clear Completed
            </button>
          )}
        </div>

        {/* Quest List */}
        <div className="flex-1 overflow-y-auto max-h-[320px] lg:max-h-[380px] space-y-2 pr-1 custom-scrollbar">
          {filteredTodos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center select-none">
              <Sparkles size={24} className="text-muted-foreground/20 mb-2" />
              <p className="text-xs text-muted-foreground italic">
                {filter === "all"
                  ? "No quests logged yet. Enter one above!"
                  : filter === "active"
                  ? "No active quests. Adventure awaits!"
                  : "No completed quests yet. Go claim victory!"}
              </p>
            </div>
          ) : (
            filteredTodos.map((todo) => {
              const badge = BADGES[todo.type];
              return (
                <div
                  key={todo.id}
                  className={`group flex items-start justify-between gap-3 rounded-lg border p-3 transition-all duration-300 ${
                    todo.completed
                      ? "bg-secondary/5 border-border/20 opacity-60"
                      : "bg-secondary/10 border-border/30 hover:border-border/60 hover:bg-secondary/15"
                  }`}
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleTodo(todo.id)}
                      className="mt-0.5 text-muted-foreground hover:text-gold transition-colors duration-200 cursor-pointer flex-shrink-0"
                    >
                      {todo.completed ? (
                        <CheckCircle2 size={16} className="text-gold" />
                      ) : (
                        <Circle size={16} />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-medium leading-relaxed break-words text-foreground ${
                          todo.completed ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {todo.text}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 select-none">
                        <span
                          className={`rounded-full border px-1.5 py-0.5 text-[8px] font-bold tracking-wide uppercase ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                        <span className="text-[9px] text-muted-foreground/60 font-mono">
                          {new Date(todo.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteTodo(todo.id)}
                    className="text-muted-foreground hover:text-rose-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200 cursor-pointer flex-shrink-0"
                    title="Delete quest"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>

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
              className="text-muted-foreground hover:text-foreground cursor-pointer text-sm font-bold"
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
                This will create a new page named <strong className="text-foreground">"{syncTitle}"</strong> inside your specified Notion {notionParentType === "database" ? "database" : "page"} and sync all markdown journal notes.
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
                    <h4 className="font-bold text-xs text-foreground">Sync Completed Successfully!</h4>
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
