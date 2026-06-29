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

async function fetchCharacter(id: number, force = false): Promise<PartyMember> {
  // If we are forcing a refresh on an imported DDB character, clear local native builder state
  if (id < 900000000 && force) {
    try {
      const { db } = await import("./drizzle.server");
      const schema = await import("../db/schema");
      const { eq } = await import("drizzle-orm");
      await db
        .update(schema.characters)
        .set({ builderStateJson: null })
        .where(eq(schema.characters.id, id.toString()));
    } catch (dbErr) {
      console.warn("Failed to clear builderStateJson for character:", id, dbErr);
    }
  }

  // Check if character is natively built/edited (has builderStateJson in SQLite)
  try {
    const { db } = await import("./drizzle.server");
    const schema = await import("../db/schema");
    const { eq } = await import("drizzle-orm");

    const rows = await db
      .select()
      .from(schema.characters)
      .where(eq(schema.characters.id, id.toString()));

    if (rows.length > 0 && rows[0].builderStateJson && rows[0].rawJson) {
      const member = JSON.parse(rows[0].rawJson) as PartyMember;
      (member as any).isNative = true;
      const { refreshNativePartyMemberSnapshot } = await import("./native-engine");
      return refreshNativePartyMemberSnapshot(member);
    }
  } catch (dbErr) {
    console.warn("Failed to check SQLite characters for builder state:", dbErr);
  }

  if (id >= 900000000) {
    // Fallback to cache JSON file for native IDs (which are always native but might not be in sqlite database yet)
    const payload = await readJsonFile(await cachePath(`native-char-${id}.json`));
    if (payload?.success && payload?.data) {
      const member = payload.data as PartyMember;
      (member as any).isNative = true;
      const { refreshNativePartyMemberSnapshot } = await import("./native-engine");
      return refreshNativePartyMemberSnapshot(member);
    }
    return errorMember(id, "Native character not found");
  }

  if (!force) {
    try {
      const fs = await import("node:fs/promises");
      const path = await cachePath(`char-${id}.json`);
      const stat = await fs.stat(path);
      const ageMs = Date.now() - stat.mtime.getTime();
      if (ageMs < 60_000) {
        const cachedPayload = await readJsonFile(path);
        if (cachedPayload?.success && cachedPayload?.data) {
          const member = parseCharacterPayload(id, cachedPayload);
          return member;
        }
      }
    } catch {}
  }

  let payload: any = null;
  let source: "live" | "cache" = "live";
  let fetchError = "";

  try {
    const res = await fetch(
      `https://character-service.dndbeyond.com/character/v5/character/${id}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
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

export async function loadParty(
  ids: number[] = PARTY_CHARACTER_IDS,
  force = false,
): Promise<PartyMember[]> {
  return Promise.all(ids.map((id) => fetchCharacter(id, force)));
}
