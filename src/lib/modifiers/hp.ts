import { DeathSaves } from "../dndbeyond.types";
import { getHpKey } from "./storage-keys";

export function getLocalHp(
  memberId: number,
  remoteHpCurrent: number,
  remoteTempHp: number,
  remoteDeathSaves: DeathSaves,
): {
  hpCurrent: number;
  tempHp: number;
  deathSaves: DeathSaves;
  spentHitDice: Record<string, number>;
} {
  if (typeof window === "undefined") {
    return {
      hpCurrent: remoteHpCurrent,
      tempHp: remoteTempHp,
      deathSaves: remoteDeathSaves,
      spentHitDice: {},
    };
  }
  try {
    const storageKey = getHpKey(memberId);
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (typeof parsed.hpCurrent === "number" && typeof parsed.tempHp === "number") {
        return {
          hpCurrent: parsed.hpCurrent,
          tempHp: parsed.tempHp,
          deathSaves: parsed.deathSaves ?? remoteDeathSaves,
          spentHitDice: parsed.spentHitDice ?? {},
        };
      }
    }
  } catch (e) {
    console.warn("Failed to load HP data from localStorage:", e);
  }
  return {
    hpCurrent: remoteHpCurrent,
    tempHp: remoteTempHp,
    deathSaves: remoteDeathSaves,
    spentHitDice: {},
  };
}

export function getModifiedHitDice(
  hitDiceStr: string,
  spentHitDice: Record<string, number>,
): string {
  if (!hitDiceStr || hitDiceStr === "—") return hitDiceStr;
  const parts = hitDiceStr.split("+").map((part) => {
    const m = part.trim().match(/(\d+)\/(\d+)d(\d+)/);
    if (m) {
      const total = parseInt(m[2], 10);
      const die = `d${m[3]}`;
      const spent = spentHitDice[die] ?? 0;
      const remaining = Math.min(total, Math.max(0, parseInt(m[1], 10) - spent));
      return `${remaining}/${total}${die}`;
    }
    return part.trim();
  });
  return parts.join(" + ");
}
