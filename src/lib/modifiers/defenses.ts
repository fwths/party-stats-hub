import { PartyMember, DefenseInfo } from "../dndbeyond.types";

export function getModifiedDefenses(
  member: PartyMember,
  localRage: string,
  localTotemAspects: Array<{ name: string; description: string }>,
): DefenseInfo[] {
  const list = [...(member.defenses || [])];
  const isBarbarian =
    member.classes.toLowerCase().includes("barbarian") ||
    (member.totemAspects && member.totemAspects.length > 0);
  const isRaging = localRage !== "None";

  if (isBarbarian && isRaging) {
    const physicalTypes = ["Bludgeoning", "Piercing", "Slashing"];
    physicalTypes.forEach((dt) => {
      if (
        !list.some(
          (d) => d.damageType.toLowerCase() === dt.toLowerCase() && d.type === "resistance",
        )
      ) {
        list.push({ type: "resistance", damageType: dt });
      }
    });

    const hasBearResistance = localRage === "Bear" || localTotemAspects[0]?.name === "Bear";
    if (hasBearResistance) {
      const bearTypes = ["Acid", "Cold", "Fire", "Lightning", "Poison", "Thunder"];
      bearTypes.forEach((dt) => {
        if (
          !list.some(
            (d) => d.damageType.toLowerCase() === dt.toLowerCase() && d.type === "resistance",
          )
        ) {
          list.push({ type: "resistance", damageType: dt });
        }
      });
    }
  }
  return list;
}
