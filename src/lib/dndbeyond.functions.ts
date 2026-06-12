import { createServerFn } from "@tanstack/react-start";
import { PARTY_CHARACTER_IDS } from "./party-config";
import { PartyMember } from "./dndbeyond.types";
import { parseCharacterPayload, errorMember } from "./dndbeyond.parser";

export * from "./dndbeyond.types";
export * from "./dndbeyond.parser";

async function fetchCharacter(id: number): Promise<PartyMember> {
  let payload: any = null;
  let source: "live" | "cache" = "live";
  let fetchError = "";

  try {
    const res = await fetch(
      `https://character-service.dndbeyond.com/character/v5/character/${id}`,
      {
        headers: { Accept: "application/json" },
      },
    );
    if (res.ok) {
      payload = await res.json();
      if (payload?.success && payload?.data) {
        if (typeof window === "undefined") {
          try {
            const fs = await import("node:fs/promises");
            const path = await import("node:path");
            const filePath = path.join(process.cwd(), `char-${id}.json`);
            await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf-8");
          } catch (e) {
            console.warn(`Failed to write local cache for character ${id}:`, e);
          }
        }
      } else {
        fetchError = payload?.message || "Character payload was unsuccessful";
      }
    } else {
      fetchError = `D&D Beyond returned status ${res.status}`;
    }
  } catch (err: any) {
    fetchError = err?.message ?? "Fetch failed";
  }

  if (!payload?.success || !payload?.data) {
    if (typeof window === "undefined") {
      try {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const filePath = path.join(process.cwd(), `char-${id}.json`);
        const content = await fs.readFile(filePath, "utf-8");
        const cachedPayload = JSON.parse(content);
        if (cachedPayload?.success && cachedPayload?.data) {
          payload = cachedPayload;
          source = "cache";
        }
      } catch (e) {
        console.warn(`Failed to read local cache for character ${id}:`, e);
      }
    }
  }

  if (!payload?.success || !payload?.data) {
    return errorMember(id, fetchError || "Character not found or not public");
  }

  try {
    const member = parseCharacterPayload(id, payload);
    if (source === "cache") {
      member.error = "Loaded from offline cache (Character is private or D&D Beyond is offline)";
    }
    return member;
  } catch (err: any) {
    return errorMember(id, err?.message ?? "Failed to parse character payload");
  }
}

export async function loadParty(ids: number[] = PARTY_CHARACTER_IDS): Promise<PartyMember[]> {
  return Promise.all(ids.map(fetchCharacter));
}

export const getParty = createServerFn({ method: "GET" })
  .inputValidator((input?: { ids?: number[] }) => {
    const ids = Array.isArray(input?.ids)
      ? input!.ids!.filter((n) => Number.isInteger(n) && n > 0).slice(0, 12)
      : [];
    return { ids };
  })
  .handler(async ({ data }) => {
    const ids = data.ids.length > 0 ? data.ids : PARTY_CHARACTER_IDS;
    const members = await loadParty(ids);
    return { members, fetchedAt: new Date().toISOString() };
  });
