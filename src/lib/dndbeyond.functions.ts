import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { PARTY_CHARACTER_IDS } from "./party-config";
import { PartyMember } from "./dndbeyond.types";
import { parseCharacterPayload, errorMember } from "./dndbeyond.parser";
import { applyOverrides } from "./modifiers/apply-overrides";

export * from "./dndbeyond.types";
export * from "./dndbeyond.parser";

async function fetchCharacter(id: number): Promise<PartyMember> {
  if (id >= 900000000) {
    if (typeof window === "undefined") {
      try {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const filePath = path.join(process.cwd(), `native-char-${id}.json`);
        const content = await fs.readFile(filePath, "utf-8");
        const payload = JSON.parse(content);
        if (payload?.success && payload?.data) {
          const member = payload.data as PartyMember;
          // Mark it as native so the UI knows
          (member as any).isNative = true;
          return member;
        }
      } catch (e) {
        console.warn(`Failed to read native character ${id}:`, e);
      }
    }
    return errorMember(id, "Native character not found");
  }

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
  .inputValidator(
    z
      .object({
        ids: z.array(z.number().int().positive()).optional(),
      })
      .optional()
      .transform((data) => data ?? {}),
  )
  .handler(async ({ data }) => {
    const inputIds = Array.isArray(data.ids)
      ? data.ids.filter((n) => Number.isInteger(n) && n > 0).slice(0, 12)
      : [];
    const ids = inputIds.length > 0 ? inputIds : PARTY_CHARACTER_IDS;
    let members = await loadParty(ids);

    try {
      // Dynamic import to prevent bundler trying to resolve node:sqlite in client context
      const { getAllKv } = await import("./db.server");
      const kv = await getAllKv();
      members = mergeDbOverrides(members, kv);
    } catch (err) {
      console.warn("[Server Overrides] Failed to load or merge SQLite overrides:", err);
    }

    return { members, fetchedAt: new Date().toISOString() };
  });

function mergeDbOverrides(members: PartyMember[], kv: Record<string, string>): PartyMember[] {
  return members.map((member) => applyOverrides(member, kv));
}
