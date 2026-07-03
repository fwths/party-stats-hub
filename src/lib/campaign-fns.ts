import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function getCurrentUser() {
  const { getRequestHeaders } = await import("@tanstack/react-start/server");
  const { getUserIdFromSession } = await import("./db.server");
  const { db } = await import("./drizzle.server");
  const schema = await import("../db/schema");
  const { eq } = await import("drizzle-orm");

  const userId = await getUserIdFromSession(getRequestHeaders().get("cookie") ?? "");
  if (!userId) throw new Error("Authentication required");

  const users = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  if (!users.length) throw new Error("Authenticated user no longer exists");
  return users[0];
}

export const getCampaignsFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const user = await getCurrentUser();
    const { db } = await import("./drizzle.server");
    const schema = await import("../db/schema");
    const { eq, or } = await import("drizzle-orm");

    const allCampaigns = await db
      .select({
        id: schema.campaigns.id,
        name: schema.campaigns.name,
        description: schema.campaigns.description,
        dmUserId: schema.campaigns.dmUserId,
        createdAt: schema.campaigns.createdAt,
      })
      .from(schema.campaigns)
      .leftJoin(schema.campaignMembers, eq(schema.campaignMembers.campaignId, schema.campaigns.id))
      .where(or(eq(schema.campaigns.dmUserId, user.id), eq(schema.campaignMembers.userId, user.id)))
      .groupBy(schema.campaigns.id);

    return allCampaigns;
  } catch (err) {
    console.error("getCampaignsFn error:", err);
    return [];
  }
});

export const createCampaignFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ name: z.string().min(2).max(100), description: z.string().optional() }),
  )
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    const { db } = await import("./drizzle.server");
    const schema = await import("../db/schema");
    const { randomUUID } = await import("node:crypto");

    const campaignId = randomUUID();
    await db.insert(schema.campaigns).values({
      id: campaignId,
      name: data.name,
      dmUserId: user.id,
      description: data.description || "",
      createdAt: Date.now(),
    });

    await db.insert(schema.campaignMembers).values({
      campaignId,
      userId: user.id,
    });

    const { setResponseHeaders } = await import("@tanstack/react-start/server");
    const secureFlag = process.env.NODE_ENV === "production" ? "; Secure" : "";
    setResponseHeaders({
      "Set-Cookie": `active_campaign_id=${campaignId}; Path=/; Max-Age=31536000; SameSite=Lax${secureFlag}`,
    } as any);

    return { success: true, campaignId };
  });

export const joinCampaignFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ campaignId: z.string() }))
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    const { db } = await import("./drizzle.server");
    const schema = await import("../db/schema");
    const { eq, and } = await import("drizzle-orm");

    const campaignList = await db
      .select()
      .from(schema.campaigns)
      .where(eq(schema.campaigns.id, data.campaignId))
      .limit(1);

    if (campaignList.length === 0) {
      throw new Error("Campaign not found");
    }

    const existing = await db
      .select()
      .from(schema.campaignMembers)
      .where(
        and(
          eq(schema.campaignMembers.campaignId, data.campaignId),
          eq(schema.campaignMembers.userId, user.id),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.campaignMembers).values({
        campaignId: data.campaignId,
        userId: user.id,
      });
    }

    const { setResponseHeaders } = await import("@tanstack/react-start/server");
    const secureFlag = process.env.NODE_ENV === "production" ? "; Secure" : "";
    setResponseHeaders({
      "Set-Cookie": `active_campaign_id=${data.campaignId}; Path=/; Max-Age=31536000; SameSite=Lax${secureFlag}`,
    } as any);

    return { success: true };
  });

export const selectActiveCampaignFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ campaignId: z.string() }))
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    const { db } = await import("./drizzle.server");
    const schema = await import("../db/schema");
    const { eq, and } = await import("drizzle-orm");

    const memberships = await db
      .select()
      .from(schema.campaignMembers)
      .where(
        and(
          eq(schema.campaignMembers.campaignId, data.campaignId),
          eq(schema.campaignMembers.userId, user.id),
        ),
      )
      .limit(1);

    const isDm = await db
      .select()
      .from(schema.campaigns)
      .where(and(eq(schema.campaigns.id, data.campaignId), eq(schema.campaigns.dmUserId, user.id)))
      .limit(1);

    if (memberships.length === 0 && isDm.length === 0) {
      throw new Error("You are not a member of this campaign");
    }

    const { setResponseHeaders } = await import("@tanstack/react-start/server");
    const secureFlag = process.env.NODE_ENV === "production" ? "; Secure" : "";
    setResponseHeaders({
      "Set-Cookie": `active_campaign_id=${data.campaignId}; Path=/; Max-Age=31536000; SameSite=Lax${secureFlag}`,
    } as any);

    return { success: true };
  });

export const getActiveCampaignFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const user = await getCurrentUser();
    const { getRequestHeaders } = await import("@tanstack/react-start/server");
    const headers = getRequestHeaders();
    const cookieHeader = headers.get("cookie");

    // Parse cookies
    const cookies: Record<string, string> = {};
    if (cookieHeader) {
      cookieHeader.split(";").forEach((cookie) => {
        const parts = cookie.split("=");
        if (parts.length >= 2) {
          cookies[parts[0].trim()] = parts.slice(1).join("=").trim();
        }
      });
    }

    const activeCampaignId = cookies["active_campaign_id"];
    if (!activeCampaignId) return null;

    const { db } = await import("./drizzle.server");
    const schema = await import("../db/schema");
    const { and, eq, or } = await import("drizzle-orm");

    const campaignList = await db
      .select({ campaign: schema.campaigns })
      .from(schema.campaigns)
      .leftJoin(
        schema.campaignMembers,
        and(
          eq(schema.campaignMembers.campaignId, schema.campaigns.id),
          eq(schema.campaignMembers.userId, user.id),
        ),
      )
      .where(
        and(
          eq(schema.campaigns.id, activeCampaignId),
          or(
            eq(schema.campaigns.dmUserId, user.id),
            eq(schema.campaignMembers.userId, user.id),
          ),
        ),
      )
      .limit(1);

    return campaignList.length > 0 ? campaignList[0].campaign : null;
  } catch (err) {
    console.error("getActiveCampaignFn error:", err);
    return null;
  }
});

export const updateCampaignCharactersFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ ids: z.array(z.number()) }))
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    const { getRequestHeaders } = await import("@tanstack/react-start/server");
    const headers = getRequestHeaders();
    const cookieHeader = headers.get("cookie");

    // Parse cookies
    const cookies: Record<string, string> = {};
    if (cookieHeader) {
      cookieHeader.split(";").forEach((cookie) => {
        const parts = cookie.split("=");
        if (parts.length >= 2) {
          cookies[parts[0].trim()] = parts.slice(1).join("=").trim();
        }
      });
    }

    const activeCampaignId = cookies["active_campaign_id"];
    if (!activeCampaignId) throw new Error("No active campaign selected");

    const { db } = await import("./drizzle.server");
    const schema = await import("../db/schema");
    const { eq, and, notIn, inArray } = await import("drizzle-orm");

    const ownedCampaign = await db
      .select({ id: schema.campaigns.id })
      .from(schema.campaigns)
      .where(
        and(eq(schema.campaigns.id, activeCampaignId), eq(schema.campaigns.dmUserId, user.id)),
      )
      .limit(1);
    if (ownedCampaign.length === 0) {
      throw new Error("Only the campaign owner can replace the campaign character list");
    }

    const inputIdsStrings = data.ids.map((id) => id.toString());

    // 1. Remove characters no longer in campaign
    if (inputIdsStrings.length > 0) {
      await db
        .update(schema.characters)
        .set({ campaignId: null })
        .where(
          and(
            eq(schema.characters.campaignId, activeCampaignId),
            notIn(schema.characters.id, inputIdsStrings),
          ),
        );
    } else {
      await db
        .update(schema.characters)
        .set({ campaignId: null })
        .where(eq(schema.characters.campaignId, activeCampaignId));
    }

    // 2. Add characters to campaign
    for (const id of data.ids) {
      const idStr = id.toString();

      // Check if character already exists in db
      const existing = await db
        .select()
        .from(schema.characters)
        .where(eq(schema.characters.id, idStr))
        .limit(1);

      if (existing.length > 0) {
        // Set campaignId
        await db
          .update(schema.characters)
          .set({ campaignId: activeCampaignId })
          .where(eq(schema.characters.id, idStr));
      } else {
        // D&D Beyond character: fetch and insert
        try {
          const { loadParty } = await import("./dndbeyond.server");
          const fetched = await loadParty([id]);
          if (fetched && fetched.length > 0) {
            const member = fetched[0];
            await db.insert(schema.characters).values({
              id: idStr,
              name: member.name || "D&D Beyond Character",
              playerName: member.playerName || "DDB Import",
              speciesId: member.race || "unknown",
              backgroundId: member.background || "unknown",
              campaignId: activeCampaignId,
              ownerUserId: user.id,
              classesJson: JSON.stringify([]),
              baseStatsJson: JSON.stringify(member.abilities || {}),
              currencyJson: JSON.stringify(member.currencies || {}),
              inventoryJson: JSON.stringify(member.inventory || []),
              equippedWeaponIdsJson: JSON.stringify([]),
              equippedArmorId: null,
              attunedItemIdsJson: JSON.stringify([]),
              currentHp: member.hpCurrent || 10,
              temporaryHp: member.tempHp || 0,
              exhaustionLevel: member.exhaustion || 0,
              heroicInspiration: member.inspiration || false,
              deathSavesJson: JSON.stringify(member.deathSaves || {}),
              hitDiceExpendedJson: JSON.stringify([]),
              spellSlotsExpendedJson: JSON.stringify([]),
              featureUsesExpendedJson: JSON.stringify([]),
              activeEffectIdsJson: JSON.stringify([]),
              builderStateJson: null,
              rawJson: JSON.stringify(member),
            });
          }
        } catch (fetchErr) {
          console.error(`Failed to fetch DDB character ${id}:`, fetchErr);
        }
      }
    }

    return { success: true };
  });
