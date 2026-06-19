import { PartyMember, InventoryItem } from "../dndbeyond.types";

export function calculateModifiedSpeed(
  member: PartyMember,
  inventory: InventoryItem[],
  _dexMod: number,
  allConditions: string[],
  localArmorModel: string | null,
  localRage: string,
  speedNotes: string[],
): number {
  let speed = member.speed;

  const isShield = (i: InventoryItem) => i.armorTypeId === 4;
  const isBodyArmor = (i: InventoryItem) =>
    (i.type?.toLowerCase().includes("armor") || i.type === "Armor") &&
    (i.armorTypeId ?? 0) <= 3 &&
    !isShield(i);
  const localArmorItem = inventory.find((i) => i.equipped && isBodyArmor(i));

  // 1. Heavy Armor Speed Penalty Adjustment
  const getHeavyArmorPenalty = (item: InventoryItem | undefined) => {
    if (!item) return false;
    const name = item.name.toLowerCase();
    const strScore = member.abilities.find((a) => a.name === "STR")?.score ?? 10;
    if (name.includes("plate") && strScore < 15) return true;
    if (name.includes("chain mail") && strScore < 13) return true;
    return false;
  };

  const remoteArmorItem = member.inventory?.find((i) => i.equipped && isBodyArmor(i));
  const remotePenalty = getHeavyArmorPenalty(remoteArmorItem);
  const localPenalty = getHeavyArmorPenalty(localArmorItem);
  if (remotePenalty && !localPenalty) {
    speed += 10;
    speedNotes.push("+10 ft. from unequipping heavy armor (Strength requirement removed)");
  } else if (!remotePenalty && localPenalty) {
    speed -= 10;
    speedNotes.push("-10 ft. from equipping heavy armor without Strength requirement");
  }

  const isArmorer =
    member.subclasses.some((s) => s.toLowerCase().includes("armorer")) ||
    member.activeArmorModel !== null;

  const isBarbarian = member.classes.toLowerCase().includes("barbarian");

  // 2. Check Exhaustion (2024 Rules: Speed reduced by 5 ft per level of exhaustion)
  if (member.exhaustion > 0) {
    const penalty = member.exhaustion * 5;
    speed = Math.max(0, speed - penalty);
    speedNotes.push(`-${penalty} ft. from Exhaustion (Level ${member.exhaustion})`);
  }

  // 3. Check Restraining Conditions (Speed becomes 0)
  const zeroSpeedConditions = [
    "grappled",
    "restrained",
    "paralyzed",
    "petrified",
    "stunned",
    "unconscious",
  ];
  const activeZeroSpeed = zeroSpeedConditions.filter((c) => allConditions.includes(c));
  if (activeZeroSpeed.length > 0) {
    speed = 0;
    speedNotes.push(
      `Speed 0 from ${activeZeroSpeed.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(", ")}`,
    );
  }

  // 4. Check Haste Spell (double Speed)
  if (allConditions.includes("haste") && speed > 0) {
    speed = speed * 2;
    speedNotes.push("Speed doubled from Haste spell");
  }

  // 5. Check Slow Spell (half Speed)
  if (allConditions.includes("slow") && speed > 0) {
    speed = Math.floor(speed / 2);
    speedNotes.push("Speed halved from Slow spell");
  }

  // Bladesong (+10 ft speed)
  if (allConditions.includes("bladesong")) {
    speed += 10;
    speedNotes.push("+10 ft. from Bladesong");
  }

  // Longstrider (+10 ft speed)
  if (allConditions.includes("longstrider")) {
    speed += 10;
    speedNotes.push("+10 ft. from Longstrider spell");
  }

  // 6. Armorer steps
  if (isArmorer && localArmorModel === "Infiltrator") {
    speed += 5;
    speedNotes.push("+5 ft. (Powered Steps)");
  }

  // 7. Elk Rage
  if (isBarbarian && localRage === "Elk") {
    speed += 15;
    speedNotes.push("+15 ft. (Elk Totem Rage)");
  }

  return speed;
}
