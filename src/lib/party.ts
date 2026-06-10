import { queryOptions } from "@tanstack/react-query";
import { getParty } from "@/lib/dndbeyond.functions";
import { PARTY_CHARACTER_IDS } from "@/lib/party-config";

export const STORAGE_KEY = "mob.partyIds.v1";

export function readStoredIds(): number[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return null;
    const ids = arr.filter((n) => Number.isInteger(n) && n > 0);
    return ids.length > 0 ? ids : null;
  } catch {
    return null;
  }
}

export function partyQueryOptions(ids: number[] | null) {
  const effective = ids && ids.length > 0 ? ids : PARTY_CHARACTER_IDS;
  return queryOptions({
    queryKey: ["party", effective],
    queryFn: () => getParty({ data: { ids: effective } }),
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}