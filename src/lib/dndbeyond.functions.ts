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
    let members = await loadParty(ids);

    try {
      // Dynamic import to prevent bundler trying to resolve node:sqlite in client context
      const { getAllKv } = await import("./db.server");
      const kv = getAllKv();
      members = mergeDbOverrides(members, kv);
    } catch (err) {
      console.warn("[Server Overrides] Failed to load or merge SQLite overrides:", err);
    }

    return { members, fetchedAt: new Date().toISOString() };
  });

function mergeDbOverrides(members: PartyMember[], kv: Record<string, string>): PartyMember[] {
  const conditionsRaw = kv["mob.conditions.v1"];
  const allConditions = conditionsRaw ? JSON.parse(conditionsRaw) : {};

  return members.map((member) => {
    const id = member.id;

    // 1. HP & Death Saves
    const hpRaw = kv[`party-stats:hp:${id}`];
    let hpCurrent = member.hpCurrent;
    let tempHp = member.tempHp;
    let deathSaves = member.deathSaves;
    let hitDice = member.hitDice;
    if (hpRaw) {
      try {
        const hpData = JSON.parse(hpRaw);
        if (typeof hpData.hpCurrent === "number") hpCurrent = hpData.hpCurrent;
        if (typeof hpData.tempHp === "number") tempHp = hpData.tempHp;
        if (hpData.deathSaves) deathSaves = hpData.deathSaves;

        if (hpData.spentHitDice && member.hitDice && member.hitDice !== "—") {
          const parts = member.hitDice.split("+").map((part) => {
            const m = part.trim().match(/(\d+)\/(\d+)d(\d+)/);
            if (m) {
              const total = parseInt(m[2], 10);
              const die = `d${m[3]}`;
              const spent = hpData.spentHitDice[die] ?? 0;
              const remaining = Math.max(0, parseInt(m[1], 10) - spent);
              return `${remaining}/${total}${die}`;
            }
            return part.trim();
          });
          hitDice = parts.join(" + ");
        }
      } catch (e) {
        console.warn(`Failed to parse HP overrides for character ${id}:`, e);
      }
    }

    // 2. Conditions
    const memberConds = allConditions[String(id)];
    let conditions = member.conditions;
    if (Array.isArray(memberConds)) {
      const remoteConds = Array.isArray(member.conditions) ? member.conditions : [];
      const uniqueConditionNames = Array.from(
        new Set([
          ...remoteConds.map((c) => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase()),
          ...memberConds.map((c) => c.name.charAt(0).toUpperCase() + c.name.slice(1).toLowerCase()),
        ]),
      );
      conditions = uniqueConditionNames;
    }

    // 3. Active Infusions
    const infusionsRaw = kv[`party-stats:active-infusions:${id}`];
    let activeInfusions = member.activeInfusions;
    if (infusionsRaw) {
      try {
        activeInfusions = JSON.parse(infusionsRaw);
      } catch {}
    }

    // 4. Item Overrides & Custom Items
    const itemOverridesRaw = kv[`party-stats:item-overrides:${id}`];
    const customItemsRaw = kv[`party-stats:custom-items:${id}`];
    let inventory = member.inventory || [];
    if (itemOverridesRaw || customItemsRaw) {
      try {
        const localOverrides = itemOverridesRaw ? JSON.parse(itemOverridesRaw) : {};
        const localCustomItems = customItemsRaw ? JSON.parse(customItemsRaw) : [];

        inventory = [
          ...inventory.map((item) => {
            const over = localOverrides[item.name];
            if (over) {
              return {
                ...item,
                equipped: over.equipped !== undefined ? over.equipped : item.equipped,
                attuned: over.attuned !== undefined ? over.attuned : item.attuned,
              };
            }
            return item;
          }),
          ...localCustomItems,
        ];
      } catch {}
    }

    // 5. Armor Model
    const armorModelRaw = kv[`party-stats:armor-model:${id}`];
    let activeArmorModel = member.activeArmorModel;
    if (armorModelRaw !== undefined) {
      activeArmorModel = armorModelRaw === "null" ? null : armorModelRaw;
    }

    // 6. Totem Aspects
    const totemRaw = kv[`party-stats:totem-aspects:${id}`];
    let totemAspects = member.totemAspects;
    if (totemRaw) {
      try {
        totemAspects = totemRaw === "null" ? [] : JSON.parse(totemRaw);
      } catch {}
    }

    // 7. Rage State
    const rageRaw = kv[`party-stats:rage:${id}`];
    // Wait, getFullyModifiedStats expects localRage directly. We don't overwrite a specific rage property on member,
    // but the client-side getLocalRage hook uses localStorage which will be synced! On the server-side,
    // getModifiedDefenses reads localRage. Let's see if we should store custom properties on the member.
    // Yes! We can store rage, metamagic, and weapon masteries on the member so the server can compute them.
    let activeRage = "None";
    if (rageRaw !== undefined) {
      activeRage = rageRaw;
    }

    // 8. Spell Slots
    const slotsRaw = kv[`party-stats:slots:${id}`];
    let spellSlots = member.spellSlots;
    let pactSlots = member.pactSlots;
    if (slotsRaw) {
      try {
        const parsed = JSON.parse(slotsRaw);
        if (parsed.spellSlotsUsed && parsed.pactSlotsUsed) {
          const getEffective = (slots: SpellSlotLevel[], isPact: boolean) => {
            return slots.map((s) => {
              const localUsed = (isPact ? parsed.pactSlotsUsed : parsed.spellSlotsUsed)[s.level];
              return {
                level: s.level,
                max: s.max,
                used: localUsed !== undefined ? localUsed : s.used,
              };
            });
          };
          spellSlots = getEffective(member.spellSlots, false);
          pactSlots = getEffective(member.pactSlots, true);
        }
      } catch {}
    }

    // 9. Class Resources
    const resourcesRaw = kv[`party-stats:resources:${id}`];
    let actions = member.actions;
    if (resourcesRaw) {
      try {
        const parsed = JSON.parse(resourcesRaw);
        if (parsed.spent) {
          actions = (member.actions || []).map((a) => {
            if (!a.uses) return a;
            const spent = parsed.spent[a.name] ?? 0;
            return {
              ...a,
              uses: {
                ...a.uses,
                current: Math.max(0, a.uses.max - spent),
              },
            };
          });
        }
      } catch {}
    }

    // 10. Metamagic
    const metamagicRaw = kv[`party-stats:metamagic:${id}`];
    let metamagic = member.metamagic;
    if (metamagicRaw) {
      try {
        metamagic = metamagicRaw === "null" ? [] : JSON.parse(metamagicRaw);
      } catch {}
    }

    // 11. Weapon Masteries
    const masteriesRaw = kv[`party-stats:masteries:${id}`];
    let weaponMasteries = member.weaponMasteries;
    if (masteriesRaw) {
      try {
        weaponMasteries = masteriesRaw === "null" ? [] : JSON.parse(masteriesRaw);
      } catch {}
    }

    return {
      ...member,
      hpCurrent,
      tempHp,
      deathSaves,
      hitDice,
      conditions,
      activeInfusions,
      inventory,
      activeArmorModel,
      totemAspects,
      spellSlots,
      pactSlots,
      actions,
      metamagic,
      weaponMasteries,
      // Pass these custom values for server-side modifiers logic:
      ...({ rageState: activeRage } as any),
    };
  });
}
