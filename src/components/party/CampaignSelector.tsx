import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Folder, Plus, Users, Copy, Check, Globe, Loader2, ChevronDown, Info } from "lucide-react";
import {
  getCampaignsFn,
  getActiveCampaignFn,
  createCampaignFn,
  joinCampaignFn,
  selectActiveCampaignFn,
} from "@/lib/campaign-fns";

export function CampaignSelector() {
  const router = useRouter();
  const qc = useQueryClient();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form states
  const [campaignName, setCampaignName] = useState("");
  const [campaignDesc, setCampaignDesc] = useState("");
  const [joinId, setJoinId] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Queries
  const { data: campaigns = [], refetch: refetchCampaigns } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => getCampaignsFn(),
  });

  const { data: activeCampaign, refetch: refetchActive } = useQuery({
    queryKey: ["activeCampaign"],
    queryFn: () => getActiveCampaignFn(),
  });

  // Mutations
  const selectMutation = useMutation({
    mutationFn: (id: string) => selectActiveCampaignFn({ data: { campaignId: id } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["activeCampaign"] });
      await qc.invalidateQueries({ queryKey: ["party"] });
      await router.invalidate();
      setDropdownOpen(false);
    },
  });

  const createMutation = useMutation({
    mutationFn: (variables: { name: string; description?: string }) =>
      createCampaignFn({ data: variables }),
    onSuccess: async () => {
      await refetchCampaigns();
      await refetchActive();
      await qc.invalidateQueries({ queryKey: ["party"] });
      await router.invalidate();
      setShowCreateModal(false);
      setCampaignName("");
      setCampaignDesc("");
      setDropdownOpen(false);
    },
    onError: (err: any) => {
      setError(err.message || "Failed to create campaign");
    },
  });

  const joinMutation = useMutation({
    mutationFn: (id: string) => joinCampaignFn({ data: { campaignId: id } }),
    onSuccess: async () => {
      await refetchCampaigns();
      await refetchActive();
      await qc.invalidateQueries({ queryKey: ["party"] });
      await router.invalidate();
      setShowJoinModal(false);
      setJoinId("");
      setDropdownOpen(false);
    },
    onError: (err: any) => {
      setError(err.message || "Failed to join campaign. Verify the ID.");
    },
  });

  const handleCopyId = () => {
    if (!activeCampaign) return;
    navigator.clipboard.writeText(activeCampaign.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative z-50">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/35 px-3 py-1.5 backdrop-blur-md hover:border-purple-500/50 transition-all cursor-pointer font-semibold text-foreground text-xs md:text-sm select-none active:scale-95"
      >
        <Folder className="w-3.5 h-3.5 text-purple-400" />
        <span className="max-w-[120px] md:max-w-[200px] truncate">
          {activeCampaign ? activeCampaign.name : "Select Campaign"}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground/60 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
        />
      </button>

      {dropdownOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
          <div className="absolute left-0 mt-2 w-64 origin-top-left rounded-xl border border-border/60 bg-popover/95 p-2 shadow-2xl backdrop-blur-md z-50 flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
            {activeCampaign && (
              <div className="p-2.5 bg-secondary/20 rounded-lg border border-border/30 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Active Campaign Info
                </span>
                <div className="font-semibold text-foreground truncate">{activeCampaign.name}</div>
                {activeCampaign.description && (
                  <div className="text-[10px] text-muted-foreground line-clamp-1 mb-2">
                    {activeCampaign.description}
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 mt-1 border-t border-border/20 pt-1.5">
                  <span className="text-[10px] text-muted-foreground font-mono truncate select-all">
                    ID: {activeCampaign.id.slice(0, 13)}...
                  </span>
                  <button
                    onClick={handleCopyId}
                    className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
                    title="Copy full campaign ID to share"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-green-400" />
                        <span className="text-green-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy ID</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5 border-t border-border/10 pt-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 block mb-1">
                Your Campaigns
              </span>

              {campaigns.length === 0 ? (
                <div className="text-xs text-muted-foreground px-2.5 py-1.5 italic">
                  No campaigns joined.
                </div>
              ) : (
                campaigns.map((c) => (
                  <button
                    key={c.id}
                    disabled={selectMutation.isPending}
                    onClick={() => selectMutation.mutate(c.id)}
                    className={`w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      activeCampaign?.id === c.id
                        ? "bg-purple-500/15 border border-purple-500/20 text-purple-300 font-semibold"
                        : "hover:bg-secondary/60 text-foreground border border-transparent"
                    }`}
                  >
                    <span className="truncate pr-2">{c.name}</span>
                    {activeCampaign?.id === c.id && (
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    )}
                  </button>
                ))
              )}
            </div>

            <div className="border-t border-border/30 my-1" />

            <button
              onClick={() => {
                setError(null);
                setShowJoinModal(true);
              }}
              className="w-full text-left rounded-lg hover:bg-secondary/60 px-2.5 py-2 text-xs text-accent font-semibold transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Join Campaign by ID</span>
            </button>

            <button
              onClick={() => {
                setError(null);
                setShowCreateModal(true);
              }}
              className="w-full text-left rounded-lg hover:bg-secondary/60 px-2.5 py-2 text-xs text-accent font-semibold transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Campaign</span>
            </button>
          </div>
        </>
      )}

      {/* CREATE CAMPAIGN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-5 shadow-2xl animate-in scale-in duration-200">
            <h3 className="text-base font-bold text-foreground mb-1">Create Campaign</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Create a new sandbox space for your party.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (campaignName.trim()) {
                  createMutation.mutate({ name: campaignName, description: campaignDesc });
                }
              }}
              className="space-y-3"
            >
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Campaign Name
                </label>
                <input
                  required
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. Curse of Strahd"
                  className="w-full px-3 py-2 bg-secondary/40 border border-border focus:border-purple-500 rounded-lg outline-none text-foreground text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Description (Optional)
                </label>
                <textarea
                  value={campaignDesc}
                  onChange={(e) => setCampaignDesc(e.target.value)}
                  placeholder="e.g. Wednesday night group"
                  className="w-full px-3 py-2 bg-secondary/40 border border-border focus:border-purple-500 rounded-lg outline-none text-foreground text-sm h-16 resize-none"
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 border border-border rounded-lg text-xs text-muted-foreground hover:bg-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs font-semibold hover:bg-purple-600 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {createMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Create</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOIN CAMPAIGN MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-5 shadow-2xl animate-in scale-in duration-200">
            <h3 className="text-base font-bold text-foreground mb-1">Join Campaign</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Paste the Campaign ID provided by your DM.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (joinId.trim()) {
                  joinMutation.mutate(joinId.trim());
                }
              }}
              className="space-y-3"
            >
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Campaign ID
                </label>
                <input
                  required
                  type="text"
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                  placeholder="Paste UUID e.g. 550e8400-e29b-41d4-a716-446655440000"
                  className="w-full px-3 py-2 bg-secondary/40 border border-border focus:border-purple-500 rounded-lg outline-none text-foreground text-sm font-mono"
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-3 py-1.5 border border-border rounded-lg text-xs text-muted-foreground hover:bg-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joinMutation.isPending}
                  className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs font-semibold hover:bg-purple-600 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {joinMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Join</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
