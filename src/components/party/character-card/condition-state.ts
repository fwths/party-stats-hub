import { useState } from "react";
import { syncedLocalStorage as localStorage } from "@/lib/synced-storage";

export type LocalCondition = { name: string; rounds: number | null };

const CONDITIONS_KEY = "mob.conditions.v1";

function readAllConditions(): Record<string, LocalCondition[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CONDITIONS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function useCharacterConditions(characterId: number) {
  const [all, setAll] = useState<Record<string, LocalCondition[]>>(() => readAllConditions());
  const key = String(characterId);
  const list = all[key] ?? [];

  const persist = (next: Record<string, LocalCondition[]>) => {
    setAll(next);
    try {
      localStorage.setItem(CONDITIONS_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn("Failed to save conditions to localStorage:", e);
    }
  };

  const add = (name: string, rounds: number | null) => {
    const exists = list.some((c) => c.name.toLowerCase() === name.toLowerCase());
    if (exists) return;
    persist({ ...all, [key]: [...list, { name, rounds }] });
  };
  const remove = (name: string) => {
    persist({ ...all, [key]: list.filter((c) => c.name !== name) });
  };
  const tick = (name: string, delta: number) => {
    persist({
      ...all,
      [key]: list
        .map((c) => (c.name === name && c.rounds != null ? { ...c, rounds: c.rounds + delta } : c))
        .filter((c) => c.rounds == null || c.rounds > 0),
    });
  };
  const clear = () => {
    persist({ ...all, [key]: [] });
  };

  return { list, add, remove, tick, clear };
}
