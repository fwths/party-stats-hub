import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyCharacterV3Events,
  bootstrapCharacterV3ClientSyncState,
  characterV3ClientSyncSummary,
  emptyCharacterV3ClientSyncState,
  type CharacterV3ClientSyncState,
} from "@/lib/character-v3/client-sync";
import type { PersistedCharacterMutation } from "@/lib/character-v3/persistence";
import {
  getCharacterV3CampaignEventsFn,
  getCharacterV3CampaignSnapshotFn,
} from "@/lib/character-v3/sync-functions";

type UseCharacterV3CampaignSyncOptions = {
  campaignId: string;
  enabled?: boolean;
  pollMs?: number;
  limit?: number;
};

const MAX_CATCH_UP_PAGES = 20;

export function useCharacterV3CampaignSync({
  campaignId,
  enabled = true,
  pollMs = 5_000,
  limit = 100,
}: UseCharacterV3CampaignSyncOptions): {
  state: CharacterV3ClientSyncState;
  summary: ReturnType<typeof characterV3ClientSyncSummary>;
  refresh: () => Promise<void>;
  isPolling: boolean;
  lastError: Error | null;
} {
  const [state, setState] = useState<CharacterV3ClientSyncState>(() =>
    emptyCharacterV3ClientSyncState(),
  );
  const [isPolling, setIsPolling] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);
  const cursorRef = useRef(0);
  const inFlightRef = useRef(false);
  const generationRef = useRef(0);
  const bootstrappedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!enabled || inFlightRef.current) return;
    const generation = generationRef.current;
    inFlightRef.current = true;
    setIsPolling(true);
    try {
      const snapshot = bootstrappedRef.current
        ? null
        : await getCharacterV3CampaignSnapshotFn({ data: { campaignId } });
      if (generationRef.current !== generation) return;
      if (snapshot) {
        cursorRef.current = snapshot.cursor;
        bootstrappedRef.current = true;
      }
      const received: PersistedCharacterMutation[] = [];
      let afterSequence = cursorRef.current;
      for (let page = 0; page < MAX_CATCH_UP_PAGES; page += 1) {
        const events = await getCharacterV3CampaignEventsFn({
          data: { campaignId, afterSequence, limit },
        });
        if (generationRef.current !== generation) return;
        received.push(...events);
        if (events.length < limit) break;
        afterSequence = events.reduce(
          (highest, event) => Math.max(highest, event.sequence),
          afterSequence,
        );
      }
      setState((current) => {
        if (generationRef.current !== generation) return current;
        const base = snapshot ? bootstrapCharacterV3ClientSyncState(snapshot) : current;
        const next = applyCharacterV3Events(base, received);
        cursorRef.current = next.cursor;
        return next;
      });
      setLastError(null);
    } catch (error) {
      if (generationRef.current === generation) {
        setLastError(error instanceof Error ? error : new Error(String(error)));
      }
    } finally {
      if (generationRef.current === generation) {
        inFlightRef.current = false;
        setIsPolling(false);
      }
    }
  }, [campaignId, enabled, limit]);

  useEffect(() => {
    generationRef.current += 1;
    cursorRef.current = 0;
    inFlightRef.current = false;
    bootstrappedRef.current = false;
    setState(emptyCharacterV3ClientSyncState());
    setLastError(null);
    setIsPolling(false);
  }, [campaignId]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, pollMs);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const refreshWhenOnline = () => void refresh();
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);
    window.addEventListener("online", refreshWhenOnline);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
      window.removeEventListener("online", refreshWhenOnline);
    };
  }, [enabled, pollMs, refresh]);

  const summary = useMemo(() => characterV3ClientSyncSummary(state), [state]);

  return { state, summary, refresh, isPolling, lastError };
}
