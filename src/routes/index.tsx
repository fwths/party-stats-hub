import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useEffect, useState } from "react";
import { PARTY_CHARACTER_IDS } from "@/lib/party-config";
import { TooltipProvider } from "@/components/ui/tooltip";
import { readStoredIds, partyQueryOptions, STORAGE_KEY } from "@/lib/party";

import { RefreshButton } from "@/components/party/RefreshButton";
import { PartyHighlights } from "@/components/party/PartyHighlights";
import { PartyGrid, PartyGridSkeleton } from "@/components/party/PartyGrid";
import { ManagePartyDialog } from "@/components/party/ManagePartyDialog";
import { PartyVitals } from "@/components/party/PartyVitals";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mother of Bob (MOB) — Party Stats" },
      { name: "description", content: "Live stats for the Mother of Bob (MOB) party, pulled from D&D Beyond." },
      { property: "og:title", content: "Mother of Bob (MOB)" },
      { property: "og:description", content: "Live D&D party stats for MOB." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(partyQueryOptions(null)),
  component: Index,
});

export default function Index() {
  const [ids, setIds] = useState<number[]>(() => readStoredIds() ?? PARTY_CHARACTER_IDS);
  const [managing, setManaging] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    try {
      const isDefault =
        ids.length === PARTY_CHARACTER_IDS.length &&
        ids.every((v, i) => v === PARTY_CHARACTER_IDS[i]);
      if (isDefault) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {}
  }, [ids]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    if (
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as any).standalone)
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
    <main className="min-h-screen text-foreground">
      <div className="bg-particles" />
      <div className="bg-particles-2" />
      <TooltipProvider delayDuration={100}>
        <div className="mx-auto max-w-6xl px-4 py-6 relative z-10">
        <header className="mb-6 flex items-baseline justify-between gap-3 border-b border-border/50 pb-4">
          <h1 className="font-heading text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-accent bg-clip-text text-transparent">
            Mother of Bob <span className="text-muted-foreground/40 text-xl tracking-normal">(MOB)</span>
          </h1>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
              className="rounded border border-border bg-secondary/60 px-2 py-1 text-foreground hover:border-accent/60"
            >
              ⚙ Manage
            </button>
            <a className="underline hover:text-accent" href="/api/party">JSON</a>
            <Suspense fallback={null}>
              <RefreshButton ids={ids} />
            </Suspense>
          </div>
        </header>
        <Suspense fallback={<PartyGridSkeleton />}>
          {/* <PartyVitals ids={ids} /> */}
          <PartyHighlights ids={ids} />
          <PartyGrid ids={ids} />
        </Suspense>
        {managing && (
          <ManagePartyDialog
            ids={ids}
            onClose={() => setManaging(false)}
            onChange={setIds}
          />
        )}
        </div>
      </TooltipProvider>
    </main>
  );
}