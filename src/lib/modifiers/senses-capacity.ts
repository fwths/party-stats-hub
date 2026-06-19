import { PartyMember, SenseInfo } from "../dndbeyond.types";

export function applySensesAndCapacityModifiers(
  member: PartyMember,
  speed: number,
  localTotemAspects: Array<{ name: string; description: string }>,
): {
  senses: SenseInfo[];
  carryingCapacity: number;
  specialSpeeds: Array<{ type: string; value: number }>;
} {
  const isBarbarian =
    member.classes.toLowerCase().includes("barbarian") ||
    (member.totemAspects && member.totemAspects.length > 0);

  // 1. Senses modification (Owl Totem Aspect)
  const senses: SenseInfo[] = [...(member.senses ?? [])];
  if (isBarbarian && localTotemAspects[0]?.name === "Owl") {
    const dvIndex = senses.findIndex((s) => s.name.toLowerCase().includes("darkvision"));
    if (dvIndex >= 0) {
      const currentVal = senses[dvIndex].value ?? 0;
      senses[dvIndex] = {
        name: senses[dvIndex].name,
        value: currentVal + 60,
      };
    } else {
      senses.push({ name: "Darkvision", value: 60 });
    }
  }

  // 2. Carrying Capacity modification (Bear Totem Aspect)
  let carryingCapacity = member.carryingCapacity;
  if (isBarbarian && localTotemAspects[0]?.name === "Bear") {
    carryingCapacity *= 2;
  }

  // 3. Special Speeds modification (Panther/Salmon totem aspects)
  const specialSpeeds = [...(member.specialSpeeds ?? [])];
  if (isBarbarian && localTotemAspects[0]?.name === "Panther") {
    const exists = specialSpeeds.some((s) => s.type.toLowerCase().includes("climb"));
    if (!exists) {
      specialSpeeds.push({ type: "climb", value: speed });
    }
  }
  if (isBarbarian && localTotemAspects[0]?.name === "Salmon") {
    const exists = specialSpeeds.some((s) => s.type.toLowerCase().includes("swim"));
    if (!exists) {
      specialSpeeds.push({ type: "swim", value: speed });
    }
  }

  return { senses, carryingCapacity, specialSpeeds };
}
