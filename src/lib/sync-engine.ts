let isSyncingFromServer = false;
const syncQueue: Record<string, string | null> = {};
let syncTimeout: any = null;

// Debounced synchronization to save local edits to server
function queueSync(key: string, value: string | null) {
  if (isSyncingFromServer) return;

  syncQueue[key] = value;

  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(async () => {
    const batch = Object.entries(syncQueue).map(([k, v]) => ({ key: k, value: v }));
    // Clear queued items immediately to avoid race conditions during async request
    for (const k of Object.keys(syncQueue)) {
      delete syncQueue[k];
    }

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch }),
      });
      if (!res.ok) {
        console.warn("Failed to sync changes to server:", await res.text());
      }
    } catch (err) {
      console.warn("Network error during sync to server:", err);
    }
  }, 1000); // 1 second debounce
}

export async function initSyncEngine() {
  if (typeof window === "undefined") return;

  // 1. Monkey-patch localStorage.setItem and localStorage.removeItem
  const originalSetItem = localStorage.setItem;
  const originalRemoveItem = localStorage.removeItem;

  localStorage.setItem = function (...args: [string, string]) {
    originalSetItem.apply(this, args);
    const [key, value] = args;
    const isSyncable =
      key.startsWith("party-stats:") || key === "mob.conditions.v1" || key === "mob.partyIds.v1";

    if (isSyncable) {
      queueSync(key, value);
    }
  };

  localStorage.removeItem = function (...args: [string]) {
    originalRemoveItem.apply(this, args);
    const [key] = args;
    const isSyncable =
      key.startsWith("party-stats:") || key === "mob.conditions.v1" || key === "mob.partyIds.v1";

    if (isSyncable) {
      queueSync(key, null);
    }
  };

  // 2. Fetch server database overrides on page load
  try {
    const res = await fetch("/api/sync");
    if (!res.ok) {
      console.error("Failed to load initial sync data from server database");
      return;
    }
    const serverData: Record<string, string> = await res.json();

    // Lock sync mechanism to prevent loops while updating localStorage from server values
    isSyncingFromServer = true;

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

    // 3. Migrate client-only legacy data to the server
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

    // 4. Update localStorage with server values (server is source of truth)
    for (const [key, value] of Object.entries(serverData)) {
      const localVal = localStorage.getItem(key);
      if (localVal !== value) {
        originalSetItem.call(localStorage, key, value);
      }
    }

    // 5. Clean up any local keys that were deleted from the server database
    for (const key of localKeys) {
      if (!(key in serverData)) {
        originalRemoveItem.call(localStorage, key);
      }
    }
  } catch (err) {
    console.error("Error running client sync engine:", err);
  } finally {
    isSyncingFromServer = false;
  }
}
