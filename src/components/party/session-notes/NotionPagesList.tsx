import {
  BookOpen,
  RefreshCw,
  Settings,
  Search,
  Compass,
  Loader2,
  AlertCircle,
  Database,
  FileText,
  ChevronRight,
} from "lucide-react";
import { NotionPage } from "./types";
import { highlightMatch } from "./markdown-inline";

interface NotionPagesListProps {
  notionToken: string;
  notionPages: NotionPage[];
  isLoadingPages: boolean;
  pagesError: string | null;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  selectedPageId: string | null;
  notionParentType: "database" | "page" | "workspace";
  notionParentId: string;
  expandedPageIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onSelectPage: (id: string, title: string, isDb?: boolean) => void;
  onRefreshClick: () => void;
  onConfigureClick: () => void;
  handleExpandAll: () => void;
  handleCollapseAll: () => void;
  showNotionSettings: boolean;
  setShowNotionSettings: (val: boolean) => void;
}

export default function NotionPagesList({
  notionToken,
  notionPages,
  isLoadingPages,
  pagesError,
  searchTerm,
  setSearchTerm,
  selectedPageId,
  notionParentType,
  notionParentId,
  expandedPageIds,
  onToggleExpand,
  onSelectPage,
  onRefreshClick,
  onConfigureClick,
  handleExpandAll,
  handleCollapseAll,
  showNotionSettings,
  setShowNotionSettings: _setShowNotionSettings,
}: NotionPagesListProps) {
  return (
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
              onClick={onRefreshClick}
              disabled={isLoadingPages}
              className="text-muted-foreground hover:text-gold disabled:opacity-40 transition-colors duration-150 cursor-pointer flex items-center justify-center p-1"
              title="Refresh Codex Pages"
            >
              <RefreshCw size={12} className={isLoadingPages ? "animate-spin" : ""} />
            </button>
          )}
          <button
            onClick={onConfigureClick}
            className={`text-muted-foreground hover:text-gold transition-colors duration-150 cursor-pointer flex items-center justify-center p-1 ${
              showNotionSettings ? "text-gold" : ""
            }`}
            title="Notion Credentials"
          >
            <Settings size={12} />
          </button>
        </div>
      </div>

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
                onClick={onConfigureClick}
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
                onClick={onRefreshClick}
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
                        onSelectPage(id, title, !!isDb);
                      }}
                      searchQuery={searchTerm}
                      notionPages={notionPages}
                      expandedPageIds={expandedPageIds}
                      onToggleExpand={onToggleExpand}
                    />
                  ));
                })()}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
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
