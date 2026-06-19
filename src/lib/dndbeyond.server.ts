import { PARTY_CHARACTER_IDS } from "./party-config";
import type { PartyMember } from "./dndbeyond.types";
import { parseCharacterPayload, errorMember } from "./dndbeyond.parser";

async function readJsonFile(filePath: string): Promise<any | null> {
  try {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function cachePath(fileName: string): Promise<string> {
  const path = await import("node:path");
  return path.join(process.cwd(), "data", "cache", fileName);
}

async function writeJsonFile(filePath: string, payload: unknown): Promise<void> {
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to write local character cache:", err);
  }
}

async function fetchCharacter(id: number): Promise<PartyMember> {
  if (id >= 900000000) {
    // Try to load from SQLite characters table first
    try {
      const { db } = await import("./drizzle.server");
      const schema = await import("../db/schema");
      const { eq } = await import("drizzle-orm");

      const rows = await db
        .select()
        .from(schema.characters)
        .where(eq(schema.characters.id, id.toString()));

      if (rows.length > 0 && rows[0].rawJson) {
        const member = JSON.parse(rows[0].rawJson) as PartyMember;
        (member as any).isNative = true;
        return member;
      }
    } catch (dbErr) {
      console.warn("Failed to load native character from database:", dbErr);
    }

    // Fallback to cache JSON file
    const payload = await readJsonFile(await cachePath(`native-char-${id}.json`));
    if (payload?.success && payload?.data) {
      const member = payload.data as PartyMember;
      (member as any).isNative = true;
      return member;
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
        await writeJsonFile(await cachePath(`char-${id}.json`), payload);
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
    const cachedPayload = await readJsonFile(await cachePath(`char-${id}.json`));
    if (cachedPayload?.success && cachedPayload?.data) {
      payload = cachedPayload;
      source = "cache";
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
