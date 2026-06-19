import { PartyMember } from "../dndbeyond.types";
import {
  CONDITIONS_KEY,
  getHpKey,
  getActiveInfusionsKey,
  getItemOverridesKey,
  getCustomItemsKey,
  getArmorModelKey,
  getTotemAspectsKey,
  getRageKey,
  getSlotsKey,
  getResourcesKey,
  getMetamagicKey,
  getMasteriesKey,
} from "./storage-keys";

export function applyOverrides(
  member: PartyMember,
  values: Record<string, string | null>,
): PartyMember {
  const id = member.id;

  // 1. HP & Death Saves
  const hpRaw = values[getHpKey(id)];
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
  const conditionsRaw = values[CONDITIONS_KEY];
  let conditions = member.conditions;
  if (conditionsRaw) {
    try {
      const allConditions = JSON.parse(conditionsRaw) || {};
      const memberConds = allConditions[String(id)];
      if (Array.isArray(memberConds)) {
        const remoteConds = Array.isArray(member.conditions) ? member.conditions : [];
        const uniqueConditionNames = Array.from(
          new Set([
            ...remoteConds.map((c) => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase()),
            ...memberConds.map(
              (c) => c.name.charAt(0).toUpperCase() + c.name.slice(1).toLowerCase(),
            ),
          ]),
        );
        conditions = uniqueConditionNames;
      }
    } catch (e) {
      console.warn(`Failed to parse conditions for character ${id}:`, e);
    }
  }

  // 3. Active Infusions
  const infusionsRaw = values[getActiveInfusionsKey(id)];
  let activeInfusions = member.activeInfusions;
  if (infusionsRaw) {
    try {
      activeInfusions = JSON.parse(infusionsRaw);
    } catch (e) {
      console.warn(`Failed to parse infusions for character ${id}:`, e);
    }
  }

  // 4. Item Overrides & Custom Items
  const itemOverridesRaw = values[getItemOverridesKey(id)];
  const customItemsRaw = values[getCustomItemsKey(id)];
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
    } catch (e) {
      console.warn(`Failed to parse item overrides for character ${id}:`, e);
    }
  }

  // 5. Armor Model
  const armorModelRaw = values[getArmorModelKey(id)];
  let activeArmorModel = member.activeArmorModel;
  if (armorModelRaw !== undefined && armorModelRaw !== null) {
    activeArmorModel = armorModelRaw === "null" ? null : armorModelRaw;
  }

  // 6. Totem Aspects
  const totemRaw = values[getTotemAspectsKey(id)];
  let totemAspects = member.totemAspects;
  if (totemRaw) {
    try {
      totemAspects = totemRaw === "null" ? [] : JSON.parse(totemRaw);
    } catch (e) {
      console.warn(`Failed to parse totem aspects for character ${id}:`, e);
    }
  }

  // 7. Rage State
  const rageRaw = values[getRageKey(id)];
  let activeRage = "None";
  if (rageRaw !== undefined && rageRaw !== null) {
    activeRage = rageRaw;
  }

  // 8. Spell Slots
  const slotsRaw = values[getSlotsKey(id)];
  let spellSlots = member.spellSlots;
  let pactSlots = member.pactSlots;
  if (slotsRaw) {
    try {
      const parsed = JSON.parse(slotsRaw);
      if (parsed.spellSlotsUsed && parsed.pactSlotsUsed) {
        const getEffective = (slots: typeof member.spellSlots, isPact: boolean) => {
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
    } catch (e) {
      console.warn(`Failed to parse slots for character ${id}:`, e);
    }
  }

  // 9. Class Resources
  const resourcesRaw = values[getResourcesKey(id)];
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
    } catch (e) {
      console.warn(`Failed to parse resources for character ${id}:`, e);
    }
  }

  // 10. Metamagic
  const metamagicRaw = values[getMetamagicKey(id)];
  let metamagic = member.metamagic;
  if (metamagicRaw) {
    try {
      metamagic = metamagicRaw === "null" ? [] : JSON.parse(metamagicRaw);
    } catch (e) {
      console.warn(`Failed to parse metamagic for character ${id}:`, e);
    }
  }

  // 11. Weapon Masteries
  const masteriesRaw = values[getMasteriesKey(id)];
  let weaponMasteries = member.weaponMasteries;
  if (masteriesRaw) {
    try {
      weaponMasteries = masteriesRaw === "null" ? [] : JSON.parse(masteriesRaw);
    } catch (e) {
      console.warn(`Failed to parse masteries for character ${id}:`, e);
    }
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
    // Pass custom properties for modifiers logic:
    ...({ rageState: activeRage } as any),
  };
}
