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
import { applyOverrides } from "./apply-overrides";
import { calculateModifiedAc } from "./ac";
import { calculateModifiedSpeed } from "./speed";
import { applySensesAndCapacityModifiers } from "./senses-capacity";
import { getModifiedDefenses } from "./defenses";

export * from "./storage-keys";
export * from "./apply-overrides";
export * from "./hp";
export * from "./conditions";
export * from "./ac";
export * from "./speed";
export * from "./defenses";
export * from "./senses-capacity";

function getLocalOverridesRecord(memberId: number): Record<string, string | null> {
  if (typeof window === "undefined") return {};
  const keys = [
    CONDITIONS_KEY,
    getHpKey(memberId),
    getActiveInfusionsKey(memberId),
    getItemOverridesKey(memberId),
    getCustomItemsKey(memberId),
    getArmorModelKey(memberId),
    getTotemAspectsKey(memberId),
    getRageKey(memberId),
    getSlotsKey(memberId),
    getResourcesKey(memberId),
    getMetamagicKey(memberId),
    getMasteriesKey(memberId),
  ];
  const record: Record<string, string | null> = {};
  keys.forEach((key) => {
    record[key] = localStorage.getItem(key);
  });
  return record;
}

export function getFullyModifiedStats(member: PartyMember) {
  const overrides = getLocalOverridesRecord(member.id);
  const overridden = applyOverrides(member, overrides);

  const dexMod = overridden.abilities.find((a) => a.name === "DEX")?.modifier ?? 0;
  const allConditions = overridden.conditions.map((c) => c.toLowerCase());

  const acNotes: string[] = [];
  const speedNotes: string[] = [];

  const ac = calculateModifiedAc(
    member,
    overridden.inventory,
    dexMod,
    allConditions,
    overridden.activeInfusions,
    acNotes,
  );

  const speed = calculateModifiedSpeed(
    member,
    overridden.inventory,
    dexMod,
    allConditions,
    overridden.activeArmorModel,
    (overridden as any).rageState ?? "None",
    speedNotes,
  );

  const { senses, carryingCapacity, specialSpeeds } = applySensesAndCapacityModifiers(
    overridden,
    speed,
    overridden.totemAspects ?? [],
  );

  return {
    ...overridden,
    ac,
    speed,
    acNotes,
    speedNotes,
    senses,
    carryingCapacity,
    specialSpeeds,
    defenses: getModifiedDefenses(
      overridden,
      (overridden as any).rageState ?? "None",
      overridden.totemAspects ?? [],
    ),
    isDowned: overridden.hpCurrent <= 0,
  };
}
