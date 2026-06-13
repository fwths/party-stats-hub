import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getParty } from "@/lib/dndbeyond.functions";
import { PARTY_CHARACTER_IDS } from "@/lib/party-config";

export const STORAGE_KEY = "mob.partyIds.v1";
export const COOKIE_KEY = "mob_party_ids";

export function getCookie(cookieString: string, name: string): string | null {
  const match = cookieString.match(new RegExp("(^| )" + name + "=([^;]+)"));
  if (match) return match[2];
  return null;
}

export function parseCookieIds(cookieValue: string | null): number[] | null {
  if (!cookieValue) return null;
  try {
    const ids = cookieValue
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    return ids.length > 0 ? ids : null;
  } catch {
    return null;
  }
}

export function readStoredIdsFromCookie(): number[] | null {
  if (typeof window === "undefined") return null;
  return parseCookieIds(getCookie(document.cookie, COOKIE_KEY));
}

export const getStoredIdsServer = createServerFn({ method: "GET" }).handler(async () => {
  const { getRequestHeaders } = await import("@tanstack/react-start/server");
  const headers = getRequestHeaders();
  const cookieHeader = headers.get("cookie") ?? "";
  const cookieVal = getCookie(cookieHeader, COOKIE_KEY);
  return parseCookieIds(cookieVal);
});

export function readStoredIds(): number[] | null {
  const fromCookie = readStoredIdsFromCookie();
  if (fromCookie) return fromCookie;

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
