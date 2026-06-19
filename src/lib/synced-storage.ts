import { queueSync } from "./sync-engine";

export const syncedLocalStorage = {
  getItem(key: string): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  },
  setItem(key: string, value: string): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
    const isSyncable =
      key.startsWith("party-stats:") || key === "mob.conditions.v1" || key === "mob.partyIds.v1";
    if (isSyncable) {
      queueSync(key, value);
    }
  },
  removeItem(key: string): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
    const isSyncable =
      key.startsWith("party-stats:") || key === "mob.conditions.v1" || key === "mob.partyIds.v1";
    if (isSyncable) {
      queueSync(key, null);
    }
  },
  clear(): void {
    if (typeof window === "undefined") return;
    window.localStorage.clear();
  },
  key(index: number): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.key(index);
  },
  get length(): number {
    if (typeof window === "undefined") return 0;
    return window.localStorage.length;
  },
};
