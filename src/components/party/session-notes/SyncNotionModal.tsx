import { Send, Loader2, Check, AlertCircle, ExternalLink } from "lucide-react";

interface SyncNotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncTitle: string;
  setSyncTitle: (val: string) => void;
  isSyncing: boolean;
  setIsSyncing: (val: boolean) => void;
  syncResult: { success: boolean; url?: string; error?: string } | null;
  setSyncResult: (val: { success: boolean; url?: string; error?: string } | null) => void;
  notionToken: string;
  notionParentId: string;
  notionParentType: "database" | "page" | "workspace";
  notes: string;
  onSuccess: () => void;
}

export default function SyncNotionModal({
  isOpen,
  onClose,
  syncTitle,
  setSyncTitle,
  isSyncing,
  setIsSyncing,
  syncResult,
  setSyncResult,
  notionToken,
  notionParentId,
  notionParentType,
  notes,
  onSuccess,
}: SyncNotionModalProps) {
  if (!isOpen) return null;

  const handleSyncToNotion = async () => {
    if (!notes.trim()) return;
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const response = await fetch("/api/notion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${notionToken}`,
        },
        body: JSON.stringify({
          parentId: notionParentId,
          parentType: notionParentType,
          title: syncTitle,
          markdown: notes,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSyncResult({ success: true, url: data.url });
        onSuccess();
      } else {
        setSyncResult({ success: false, error: data.error || "Failed to sync to Notion." });
      }
    } catch (err: any) {
      setSyncResult({ success: false, error: err.message || "An unexpected error occurred." });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl animate-fade-in card-arcane">
        <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-gold flex items-center gap-1.5">
            <Send size={14} className="text-gold" />
            Sync to Notion
          </h3>
          <button
            onClick={onClose}
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
              Notion {notionParentType === "database" ? "database" : "page"} and sync all markdown
              journal notes.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/20">
              <button
                onClick={onClose}
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
                    onClick={onClose}
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
                    onClick={onClose}
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
  );
}
