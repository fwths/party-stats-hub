import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { PARTY_CHARACTER_IDS } from "./party-config";
import type { PartyMember } from "./dndbeyond.types";
import { applyOverrides } from "./modifiers/apply-overrides";

export * from "./dndbeyond.types";
export * from "./dndbeyond.parser";

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
    const { loadParty } = await import("./dndbeyond.server");
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
