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

  try {
    const { getSessionIdFromHeaders } = await import("@/lib/auth.server");
    const sessionId = getSessionIdFromHeaders(headers);
    if (sessionId) {
      const { getUserIdFromSession } = await import("@/lib/db.server");
      const userId = await getUserIdFromSession(sessionId);
      if (userId) {
        const cookieHeader = headers.get("cookie") ?? "";
        const activeCampaignId = getCookie(cookieHeader, "active_campaign_id");
        if (activeCampaignId) {
          const { db } = await import("./drizzle.server");
          const schema = await import("../db/schema");
          const { eq } = await import("drizzle-orm");

          const chars = await db
            .select({ id: schema.characters.id })
            .from(schema.characters)
            .where(eq(schema.characters.campaignId, activeCampaignId));

          const dbIds = chars.map((c) => Number(c.id)).filter((n) => Number.isInteger(n) && n > 0);
          return dbIds; // Return empty array or campaign character IDs
        }
      }
    }
  } catch (err) {
    console.error("getStoredIdsServer database fetch failed:", err);
  }

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

export function withDefaultPartyIds(ids: number[] | null): number[] {
  return ids && ids.length > 0 ? ids : PARTY_CHARACTER_IDS;
}

export function addPartyId(ids: number[] | null, id: number): number[] {
  return Array.from(new Set([...withDefaultPartyIds(ids), id]));
}

export function partyQueryOptions(ids: number[] | null) {
  const effective = withDefaultPartyIds(ids);
  return queryOptions({
    queryKey: ["party", effective],
    queryFn: () => getParty({ data: { ids: effective } }),
    staleTime: Infinity,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
