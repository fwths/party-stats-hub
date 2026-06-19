import { CONDITIONS_KEY } from "./storage-keys";

export type LocalCondition = { name: string; rounds: number | null };

export function getLocalConditions(memberId: number): LocalCondition[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CONDITIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const list = parsed[String(memberId)];
      return Array.isArray(list) ? list : [];
    }
  } catch {
    // Ignore error
  }
  return [];
}
