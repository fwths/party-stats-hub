import { PartyMember, InventoryItem } from "../dndbeyond.types";

export function calculateModifiedAc(
  member: PartyMember,
  inventory: InventoryItem[],
  dexMod: number,
  allConditions: string[],
  localActiveInfusions: string[],
  acNotes: string[],
): number {
  let ac = member.armorClass;

  const isShield = (i: InventoryItem) => i.armorTypeId === 4;
  const remoteShieldItem = member.inventory?.find((i) => i.equipped && isShield(i));
  const localShieldItem = inventory.find((i) => i.equipped && isShield(i));

  const getShieldAcValue = (item: InventoryItem) => {
    const base = item.armorClass ?? 2;
    const magicMatch = item.name.match(/\+(\d+)/);
    const magic = magicMatch ? parseInt(magicMatch[1], 10) : 0;
    return base + magic;
  };

  if (remoteShieldItem && !localShieldItem) {
    const shieldVal = getShieldAcValue(remoteShieldItem);
    ac -= shieldVal;
    acNotes.push(`-${shieldVal} from unequipping ${remoteShieldItem.name}`);
  } else if (!remoteShieldItem && localShieldItem) {
    const shieldVal = getShieldAcValue(localShieldItem);
    ac += shieldVal;
    acNotes.push(`+${shieldVal} from equipping ${localShieldItem.name}`);
  } else if (
    remoteShieldItem &&
    localShieldItem &&
    remoteShieldItem.name !== localShieldItem.name
  ) {
    const remVal = getShieldAcValue(remoteShieldItem);
    const locVal = getShieldAcValue(localShieldItem);
    ac += locVal - remVal;
    acNotes.push(
      `Net AC change: ${locVal - remVal > 0 ? "+" : ""}${locVal - remVal} (equipped ${localShieldItem.name} instead of ${remoteShieldItem.name})`,
    );
  }

  // 2. Armor Adjustment
  const isBodyArmor = (i: InventoryItem) =>
    (i.type?.toLowerCase().includes("armor") || i.type === "Armor") &&
    (i.armorTypeId ?? 0) <= 3 &&
    !isShield(i);
  const remoteArmorItem = member.inventory?.find((i) => i.equipped && isBodyArmor(i));
  const localArmorItem = inventory.find((i) => i.equipped && isBodyArmor(i));

  const getArmorContribution = (item: InventoryItem | undefined) => {
    if (!item) return 0;
    const base = item.armorClass ?? 10;
    const magicMatch = item.name.match(/\+(\d+)/);
    const magic = magicMatch ? parseInt(magicMatch[1], 10) : 0;
    const typeId = item.armorTypeId ?? 0;
    const dexLimit = typeId === 3 ? 0 : typeId === 2 ? 2 : Infinity;
    return base + magic + Math.min(dexMod, dexLimit) - (10 + dexMod);
  };

  const remoteContrib = getArmorContribution(remoteArmorItem);
  const localContrib = getArmorContribution(localArmorItem);
  const netArmorChange = localContrib - remoteContrib;
  if (netArmorChange !== 0) {
    ac += netArmorChange;
    acNotes.push(`${netArmorChange > 0 ? "+" : ""}${netArmorChange} AC from armor changes`);
  }

  // 2.5. Wondrous Item / Ring AC Adjustment
  const requiresAttunement = (item: InventoryItem) => {
    const typeLower = item.type?.toLowerCase() || "";
    const descLower = item.description?.toLowerCase() || "";
    if (typeLower.includes("ring") || typeLower.includes("wondrous")) {
      return true;
    }
    if (descLower.includes("attunement") || descLower.includes("attune")) {
      return true;
    }
    return false;
  };

  inventory.forEach((item) => {
    if (item.armorClass && item.armorClass > 0 && !isShield(item) && !isBodyArmor(item)) {
      const isActive = item.equipped && (!requiresAttunement(item) || item.attuned);
      const remoteItem = member.inventory?.find((ri) => ri.name === item.name);

      if (remoteItem) {
        const remoteActive =
          remoteItem.equipped && (!requiresAttunement(remoteItem) || remoteItem.attuned);
        if (remoteActive && !isActive) {
          ac -= item.armorClass;
          acNotes.push(`-${item.armorClass} from unequipping/unattuning ${item.name}`);
        } else if (!remoteActive && isActive) {
          ac += item.armorClass;
          acNotes.push(`+${item.armorClass} from equipping/attuning ${item.name}`);
        }
      } else {
        // Local custom item
        if (isActive) {
          ac += item.armorClass;
          acNotes.push(`+${item.armorClass} from equipping/attuning ${item.name}`);
        }
      }
    }
  });

  // 3. Shield Spell (+5 AC)
  if (allConditions.includes("shield")) {
    ac += 5;
    acNotes.push("+5 from Shield spell");
  }

  // 4. Haste Spell (+2 AC)
  if (allConditions.includes("haste")) {
    ac += 2;
    acNotes.push("+2 from Haste spell");
  }

  // 5. Slow Spell (-2 AC)
  if (allConditions.includes("slow")) {
    ac = Math.max(0, ac - 2);
    acNotes.push("-2 from Slow spell");
  }

  // Bladesong (+INT modifier to AC [min +1])
  if (allConditions.includes("bladesong")) {
    const intMod = member.abilities.find((a) => a.name === "INT")?.modifier ?? 0;
    const bladesongAc = Math.max(1, intMod);
    ac += bladesongAc;
    acNotes.push(`+${bladesongAc} from Bladesong (INT)`);
  }

  // Warding Bond (+1 AC)
  if (allConditions.includes("warding bond")) {
    ac += 1;
    acNotes.push("+1 from Warding Bond");
  }

  // Cover (+2 AC for Half, +5 AC for Three-Quarters)
  if (allConditions.includes("half cover")) {
    ac += 2;
    acNotes.push("+2 from Half Cover");
  }
  if (allConditions.includes("three-quarters cover") || allConditions.includes("3/4 cover")) {
    ac += 5;
    acNotes.push("+5 from 3/4 Cover");
  }

  // Artificer Infusions AC modifiers (checks for double counting remote DDB active infusions)
  const isArtificer = member.classes.toLowerCase().includes("artificer");
  if (isArtificer) {
    const remoteActive = member.activeInfusions || [];

    // 1. Shield Infusions (Shield +1 / Repulsion Shield)
    const remoteShield =
      remoteActive.includes("Shield, +1") || remoteActive.includes("Repulsion Shield");
    const localShield =
      localActiveInfusions.includes("Shield, +1") ||
      localActiveInfusions.includes("Repulsion Shield");
    const hasShield = inventory.some((i) => i.equipped && i.armorTypeId === 4);

    if (hasShield) {
      const shieldDiff = (localShield ? 1 : 0) - (remoteShield ? 1 : 0);
      if (shieldDiff !== 0) {
        ac += shieldDiff;
        acNotes.push(`${shieldDiff > 0 ? "+" : ""}${shieldDiff} from Shield Infusion`);
      }
    }

    // 2. Armor Infusions (Plate +1 / Enhanced Defense / scale, ring, leather +1, etc.)
    const armorInfusionNames = [
      "Plate, +1",
      "Scale Mail, +1",
      "Breastplate, +1",
      "Ring Mail, +1",
      "Chain Mail, +1",
      "Half Plate, +1",
      "Leather, +1",
      "Studded Leather, +1",
      "Enhanced Defense",
    ];
    const remoteArmor = remoteActive.some((name) => armorInfusionNames.includes(name));
    const localArmor = localActiveInfusions.some((name) => armorInfusionNames.includes(name));
    const hasArmor = inventory.some(
      (i) => i.equipped && i.type?.toLowerCase().includes("armor") && (i.armorTypeId ?? 0) <= 3,
    );

    if (hasArmor) {
      const armorDiff = (localArmor ? 1 : 0) - (remoteArmor ? 1 : 0);
      if (armorDiff !== 0) {
        ac += armorDiff;
        acNotes.push(`${armorDiff > 0 ? "+" : ""}${armorDiff} from Enhanced Defense Infusion`);
      }
    }
  }

  return ac;
}
