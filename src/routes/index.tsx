import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useEffect, useState } from "react";
import { PARTY_CHARACTER_IDS } from "@/lib/party-config";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  readStoredIds,
  partyQueryOptions,
  STORAGE_KEY,
  getStoredIdsServer,
  readStoredIdsFromCookie,
  COOKIE_KEY,
} from "@/lib/party";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Users, Activity, Package, Swords, BookOpen, Info } from "lucide-react";

import { RefreshButton } from "@/components/party/RefreshButton";
import { PartyHighlights } from "@/components/party/PartyHighlights";
import { PartyGrid, PartyGridSkeleton } from "@/components/party/PartyGrid";
import { ManagePartyDialog } from "@/components/party/ManagePartyDialog";
import { ThemeSelector } from "@/components/party/ThemeSelector";
import { CombatDashboard } from "@/components/party/CombatDashboard";
import { useModalHistorySync } from "@/hooks/useModalHistorySync";
import { GroupDiceRoller } from "@/components/party/GroupDiceRoller";
import { SharedInventory } from "@/components/party/SharedInventory";
import { AmbientAudio } from "@/components/party/AmbientAudio";
import SessionNotes from "@/components/party/SessionNotes";
import RulesReference from "@/components/party/RulesReference";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mother of Bob (MOB) — Party Stats" },
      {
        name: "description",
        content: "Live stats for the Mother of Bob (MOB) party, pulled from D&D Beyond.",
      },
      { property: "og:title", content: "Mother of Bob (MOB)" },
      { property: "og:description", content: "Live D&D party stats for MOB." },
    ],
  }),
  loader: async ({ context }) => {
    let ids: number[] | null = null;
    if (typeof window === "undefined") {
      ids = await getStoredIdsServer();
    } else {
      ids = readStoredIdsFromCookie();
    }
    await context.queryClient.ensureQueryData(partyQueryOptions(ids));
    return { ids };
  },
  component: Index,
});

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Index() {
  const { ids: initialIds } = Route.useLoaderData();
  const [ids, setIds] = useState<number[]>(initialIds ?? PARTY_CHARACTER_IDS);
  const [managing, setManaging] = useState(false);
  useModalHistorySync(managing, setManaging, "isManagingParty");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    try {
      const isDefault =
        ids.length === PARTY_CHARACTER_IDS.length &&
        ids.every((v, i) => v === PARTY_CHARACTER_IDS[i]);
      if (isDefault) {
        localStorage.removeItem(STORAGE_KEY);
        document.cookie = `${COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax`;
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
        document.cookie = `${COOKIE_KEY}=${ids.join(",")}; path=/; max-age=31536000; SameSite=Lax`;
      }
    } catch (e) {
      console.warn("Failed to save party IDs to localStorage/cookie:", e);
    }
  }, [ids]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallBtn(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    if (
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone)
    ) {
      setShowInstallBtn(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  return (
    <main className="min-h-screen text-foreground animate-fade-in">
      <div className="bg-particles" />
      <div className="bg-particles-2" />
      <TooltipProvider delayDuration={100}>
        <div className="mx-auto max-w-6xl 2xl:max-w-[1600px] px-4 py-6 relative z-10">
          <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
            <h1 className="font-heading text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-accent bg-clip-text text-transparent select-none">
              Mother of Bob{" "}
              <span className="text-muted-foreground/40 text-xl tracking-normal">(MOB)</span>
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <AmbientAudio />
              <ThemeSelector />
              {showInstallBtn && (
                <button
                  onClick={handleInstallClick}
                  className="rounded border border-accent bg-accent/15 hover:bg-accent/25 px-2 py-1 text-accent font-semibold transition-all duration-200 cursor-pointer shadow-sm shadow-accent/10 active:scale-95"
                >
                  📥 Install App
                </button>
              )}
              <button
                onClick={() => setManaging(true)}
                className="rounded border border-border bg-secondary/60 px-2 py-1 text-foreground hover:border-accent/60 cursor-pointer"
              >
                ⚙ Manage
              </button>
              <a className="underline hover:text-accent font-medium" href="/api/party">
                JSON
              </a>
              <Suspense fallback={null}>
                <RefreshButton ids={ids} />
              </Suspense>
            </div>
          </header>

          <Suspense fallback={<PartyGridSkeleton />}>
            <PartyDashboard ids={ids} />
          </Suspense>

          {managing && (
            <ManagePartyDialog ids={ids} onClose={() => setManaging(false)} onChange={setIds} />
          )}
        </div>
      </TooltipProvider>
    </main>
  );
}

function PartyDashboard({ ids }: { ids: number[] }) {
  const { data } = useSuspenseQuery(partyQueryOptions(ids));
  const [activeTab, setActiveTab] = useState<
    "grid" | "combat" | "inventory" | "roller" | "notes" | "rules"
  >("grid");

  const validMembers = data.members.filter((m) => !m.error);

  return (
    <div className="space-y-6">
      {/* Navigation tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border/30 pb-3 select-none">
        <button
          onClick={() => setActiveTab("grid")}
          className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeTab === "grid"
              ? "border border-accent/40 bg-accent/15 text-accent shadow-sm"
              : "border border-transparent hover:border-border hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users size={12} />
          <span>Party Cards</span>
        </button>
        <button
          onClick={() => setActiveTab("combat")}
          disabled={validMembers.length === 0}
          className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
            activeTab === "combat"
              ? "border border-accent/40 bg-accent/15 text-accent shadow-sm"
              : "border border-transparent hover:border-border hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity size={12} />
          <span>Combat Health</span>
        </button>
        <button
          onClick={() => setActiveTab("inventory")}
          disabled={validMembers.length === 0}
          className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
            activeTab === "inventory"
              ? "border border-accent/40 bg-accent/15 text-accent shadow-sm"
              : "border border-transparent hover:border-border hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Package size={12} />
          <span>Shared Bags</span>
        </button>
        <button
          onClick={() => setActiveTab("roller")}
          disabled={validMembers.length === 0}
          className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
            activeTab === "roller"
              ? "border border-accent/40 bg-accent/15 text-accent shadow-sm"
              : "border border-transparent hover:border-border hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Swords size={12} />
          <span>Dice Roller</span>
        </button>
        <button
          onClick={() => setActiveTab("notes")}
          className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeTab === "notes"
              ? "border border-accent/40 bg-accent/15 text-accent shadow-sm"
              : "border border-transparent hover:border-border hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen size={12} />
          <span>Campaign Journal</span>
        </button>
        <button
          onClick={() => setActiveTab("rules")}
          className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeTab === "rules"
              ? "border border-accent/40 bg-accent/15 text-accent shadow-sm"
              : "border border-transparent hover:border-border hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Info size={12} />
          <span>Rules Reference</span>
        </button>
      </div>

      <div className="transition-all duration-300">
        {activeTab === "grid" && (
          <div className="space-y-6 animate-fade-in">
            <PartyHighlights ids={ids} />
            <PartyGrid ids={ids} />
          </div>
        )}

        {activeTab === "combat" && (
          <div className="animate-fade-in">
            <CombatDashboard members={data.members} />
          </div>
        )}

        {activeTab === "inventory" && (
          <div className="animate-fade-in">
            <SharedInventory members={data.members} />
          </div>
        )}

        {activeTab === "roller" && (
          <div className="animate-fade-in">
            <GroupDiceRoller members={data.members} />
          </div>
        )}

        {activeTab === "notes" && (
          <div className="animate-fade-in">
            <SessionNotes />
          </div>
        )}

        {activeTab === "rules" && (
          <div className="animate-fade-in">
            <RulesReference />
          </div>
        )}
      </div>
    </div>
  );
}
