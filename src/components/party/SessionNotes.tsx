import React, { useState, useEffect, useCallback } from "react";
import { useModalHistorySync } from "@/hooks/useModalHistorySync";
import DEFAULT_JOURNAL from "./default-journal.md?raw";
import { Send, Loader2, ChevronRight, ExternalLink, AlertCircle, Check } from "lucide-react";

import { TodoItem, NotionPage, NOTE_KEY } from "./session-notes/types";
import QuestTracker from "./session-notes/QuestTracker";
import NotionConfigForm from "./session-notes/NotionConfigForm";
import NotionPagesList from "./session-notes/NotionPagesList";
import ScratchpadEditor from "./session-notes/ScratchpadEditor";
import { MarkdownRenderer, parseInlineStyles } from "./session-notes/MarkdownRenderer";

export default function SessionNotes() {
  // --- Navigation & View Mode ---
  const [activeMode, setActiveMode] = useState<"scratchpad" | "page">("page");
  const [expandedPageIds, setExpandedPageIds] = useState<Set<string>>(() => new Set());

  // --- Session Notes (Scratchpad) State ---
  const [notes, setNotes] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(NOTE_KEY);
      if (stored !== null) return stored;
      return DEFAULT_JOURNAL;
    }
    return "";
  });

  // --- Notion Config & Integration State ---
  const [showNotionSettings, setShowNotionSettings] = useState(false);
  const [notionToken, setNotionToken] = useState("");
  const [notionParentId, setNotionParentId] = useState("");
  const [notionParentType, setNotionParentType] = useState<"database" | "page" | "workspace">(
    "workspace",
  );
  const [triggerRefresh, setTriggerRefresh] = useState(0);

  // --- Workspace Pages List & Search States ---
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [notionPages, setNotionPages] = useState<NotionPage[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [pagesError, setPagesError] = useState<string | null>(null);

  // --- Selected Page Content Loading States ---
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedPageTitle, setSelectedPageTitle] = useState<string | null>(null);
  const [selectedPageIsDb, setSelectedPageIsDb] = useState<boolean>(false);
  const [navigationHistory, setNavigationHistory] = useState<
    { id: string; title: string; isDb: boolean }[]
  >([]);
  const [pageContent, setPageContent] = useState<string>("");
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  // Expand all pages by default on initial fetch
  useEffect(() => {
    setExpandedPageIds((prev) =>
      notionPages.length > 0 && prev.size === 0 ? new Set(notionPages.map((p) => p.id)) : prev,
    );
  }, [notionPages]);

  // --- Sync Modal State ---
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
        let stored = localStorage.getItem("mob.notion-config.v1");
        if (!stored) {
          const defaultConfig = {
            token: "default",
            parentId: "",
            parentType: "workspace",
          };
          localStorage.setItem("mob.notion-config.v1", JSON.stringify(defaultConfig));
          stored = JSON.stringify(defaultConfig);
        }
        const parsed = JSON.parse(stored);
        setNotionToken(parsed.token || "");
        setNotionParentId(parsed.parentId || "");
        setNotionParentType(parsed.parentType || "workspace");
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
  const fetchNotionPages = useCallback(async () => {
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
  }, [debouncedSearchTerm, notionParentId, notionParentType, notionToken]);

  useEffect(() => {
    fetchNotionPages();
  }, [fetchNotionPages, triggerRefresh]);

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
          if (data.parentDb) {
            setNavigationHistory((prev) =>
              prev.length === 0
                ? [{ id: data.parentDb.id, title: data.parentDb.title, isDb: true }]
                : prev,
            );
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

  const handleClearNotes = () => {
    if (
      window.confirm("Are you sure you want to clear your session notes? This cannot be undone.")
    ) {
      setNotes("");
      localStorage.setItem(NOTE_KEY, "");
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
      alert("Notes loaded into active session scratchpad!");
    }
  };

  const handleSelectPage = (id: string, title: string, isDb?: boolean) => {
    setActiveMode("page");
    setSelectedPageId(id);
    setSelectedPageTitle(title);
    setSelectedPageIsDb(!!isDb);

    // Check if selected page has a parent database and prepopulate history
    const selectedPage = notionPages.find((p) => p.id === id);
    if (selectedPage?.parent?.type === "database_id" && selectedPage.parent.database_id) {
      const parentDbId = selectedPage.parent.database_id;
      const cleanParentId = parentDbId.replace(/-/g, "").toLowerCase();
      const parentDb = notionPages.find(
        (p) => p.id.replace(/-/g, "").toLowerCase() === cleanParentId,
      );
      if (parentDb) {
        setNavigationHistory([{ id: parentDb.id, title: parentDb.title, isDb: true }]);
        return;
      }
    }
    setNavigationHistory([]); // Clear history on new sidebar selections
  };

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-6 items-stretch min-h-[600px]">
        {/* LEFT COLUMN: Sidebar (Campaign Codex) */}
        <NotionPagesList
          notionToken={notionToken}
          notionPages={notionPages}
          isLoadingPages={isLoadingPages}
          pagesError={pagesError}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedPageId={selectedPageId}
          notionParentType={notionParentType}
          notionParentId={notionParentId}
          expandedPageIds={expandedPageIds}
          onToggleExpand={handleToggleExpand}
          onSelectPage={handleSelectPage}
          onRefreshClick={fetchNotionPages}
          onConfigureClick={() => setShowNotionSettings(!showNotionSettings)}
          handleExpandAll={handleExpandAll}
          handleCollapseAll={handleCollapseAll}
          showNotionSettings={showNotionSettings}
          setShowNotionSettings={setShowNotionSettings}
        />

        {/* RIGHT COLUMN: Work Area */}
        <div className="flex-1 flex flex-col card-arcane rounded-xl border border-border p-6 shadow-xl transition-all duration-300 min-h-[500px] min-w-0">
          {showNotionSettings && (
            <NotionConfigForm
              notionToken={notionToken}
              setNotionToken={setNotionToken}
              notionParentId={notionParentId}
              setNotionParentId={setNotionParentId}
              notionParentType={notionParentType}
              setNotionParentType={setNotionParentType}
              onSubmit={saveNotionConfig}
              onCancel={() => setShowNotionSettings(false)}
            />
          )}

          {/* VIEW MODE 1: Scratchpad Workspace */}
          {activeMode === "scratchpad" && (
            <ScratchpadEditor
              notes={notes}
              setNotes={setNotes}
              onClearNotes={handleClearNotes}
              notionToken={notionToken}
              notionParentId={notionParentId}
              notionParentType={notionParentType}
              selectedPageId={selectedPageId}
              setActiveMode={setActiveMode}
              handleOpenSync={handleOpenSync}
              QuestTracker={<QuestTracker />}
            />
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
