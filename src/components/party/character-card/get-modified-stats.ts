import { PartyMember } from "@/lib/dndbeyond.types";
import type { LocalCondition } from "./condition-state";

export function getModifiedStats(member: PartyMember, localConditions: LocalCondition[]) {
  let ac = member.armorClass;
  let speed = member.speed;
  const acNotes: string[] = [];
  const speedNotes: string[] = [];

  // Combine remote and local conditions for checks
  const allConditions = [
    ...member.conditions.map((c) => c.toLowerCase()),
    ...localConditions.map((c) => c.name.toLowerCase()),
  ];

  // 1. Check Exhaustion (2024 Rules: Speed reduced by 5 ft per level of exhaustion)
  if (member.exhaustion > 0) {
    const penalty = member.exhaustion * 5;
    speed = Math.max(0, speed - penalty);
    speedNotes.push(`-${penalty} ft. from Exhaustion (Level ${member.exhaustion})`);
  }

  // 2. Check Restraining Conditions (Speed becomes 0)
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

  // 3. Check Shield Spell (+5 AC)
  if (allConditions.includes("shield")) {
    ac += 5;
    acNotes.push("+5 from Shield spell");
  }

  // 4. Check Haste Spell (+2 AC, double Speed)
  if (allConditions.includes("haste")) {
    ac += 2;
    acNotes.push("+2 from Haste spell");
    if (speed > 0) {
      speed = speed * 2;
      speedNotes.push("Speed doubled from Haste spell");
    }
  }

  // 5. Check Slow Spell (-2 AC, half Speed)
  if (allConditions.includes("slow")) {
    ac = Math.max(0, ac - 2);
    acNotes.push("-2 from Slow spell");
    if (speed > 0) {
      speed = Math.floor(speed / 2);
      speedNotes.push("Speed halved from Slow spell");
    }
  }

  // Bladesong (+INT modifier to AC [min +1], +10 ft speed)
  if (allConditions.includes("bladesong")) {
    const intMod = member.abilities.find((a) => a.name === "INT")?.modifier ?? 0;
    const bladesongAc = Math.max(1, intMod);
    ac += bladesongAc;
    acNotes.push(`+${bladesongAc} from Bladesong (INT)`);
    speed += 10;
    speedNotes.push("+10 ft. from Bladesong");
  }

  // Longstrider (+10 ft speed)
  if (allConditions.includes("longstrider")) {
    speed += 10;
    speedNotes.push("+10 ft. from Longstrider spell");
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

  return { ac, speed, acNotes, speedNotes };
}
