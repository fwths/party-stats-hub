const syncQueue: Record<string, string | null> = {};
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let isInitialized = false;

// Debounced synchronization to save local edits to server
export function queueSync(key: string, value: string | null) {
  syncQueue[key] = value;

  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(async () => {
    const snapshot = { ...syncQueue };
    // Clear queued items immediately to avoid race conditions during async request
    for (const k of Object.keys(snapshot)) {
      delete syncQueue[k];
    }

    const requeueMissing = () => {
      for (const [key, value] of Object.entries(snapshot)) {
        if (!(key in syncQueue)) {
          syncQueue[key] = value;
        }
      }
    };

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batch: Object.entries(snapshot).map(([k, v]) => ({ key: k, value: v })),
        }),
      });
      if (!res.ok) {
        console.warn("Failed to sync changes to server, re-queuing:", await res.text());
        requeueMissing();
      }
    } catch (err) {
      console.warn("Network error during sync to server, re-queuing:", err);
      requeueMissing();
    }
  }, 1000); // 1 second debounce
}

export async function initSyncEngine() {
  if (typeof window === "undefined") return;
  if (isInitialized) return;
  isInitialized = true;

  // Fetch server database overrides on page load
  try {
    const res = await fetch("/api/sync");
    if (!res.ok) {
      console.error("Failed to load initial sync data from server database");
      return;
    }
    const serverData: Record<string, string> = await res.json();

    // Collect all syncable keys in localStorage
    const localKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith("party-stats:") || key === "mob.conditions.v1" || key === "mob.partyIds.v1")
      ) {
        localKeys.push(key);
      }
    }

    // Migrate client-only legacy data to the server
    const toMigrate: Array<{ key: string; value: string }> = [];
    for (const key of localKeys) {
      if (!(key in serverData)) {
        const val = localStorage.getItem(key);
        if (val !== null) {
          toMigrate.push({ key, value: val });
        }
      }
    }

    if (toMigrate.length > 0) {
      console.log(`[Sync Engine] Migrating ${toMigrate.length} local items to SQLite server...`);
      // Sync immediately in background
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch: toMigrate }),
      }).catch((err) => console.warn("Failed to migrate items to server:", err));

      // Optimistically add migrating items to serverData map
      for (const item of toMigrate) {
        serverData[item.key] = item.value;
      }
    }

    // Update localStorage with server values (server is source of truth)
    for (const [key, value] of Object.entries(serverData)) {
      const localVal = localStorage.getItem(key);
      if (localVal !== value) {
        localStorage.setItem(key, value);
      }
    }

    // Clean up any local keys that were deleted from the server database
    for (const key of localKeys) {
      if (!(key in serverData)) {
        localStorage.removeItem(key);
      }
    }
  } catch (err) {
    console.error("Error running client sync engine:", err);
  }
}
