import { PartyMember } from "./dndbeyond.types";

import { createServerFn } from "@tanstack/react-start";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export function createNativePartyMember(state: any, raceData: any, classData: any): PartyMember {
  const id = Math.floor(Math.random() * 1000000) + 900000000; // Native IDs are 900M+

  const hitDice = classData?.hitDice ?? 8;
  const hpMax = classData
    ? hitDice +
      Math.floor((state.abilities.CON - 10) / 2) +
      (state.level - 1) * (Math.floor(hitDice / 2) + 1 + Math.floor((state.abilities.CON - 10) / 2))
    : 10;

  const proficiencyBonus = Math.ceil(state.level / 4) + 1;
  const wisMod = Math.floor((state.abilities.WIS - 10) / 2);
  const intMod = Math.floor((state.abilities.INT - 10) / 2);

  const abilities = Object.entries(state.abilities).map(([name, score]) => ({
    name,
    score: score as number,
    modifier: Math.floor(((score as number) - 10) / 2),
  }));

  const member = {
    id,
    name: state.name || "Unnamed",
    avatarUrl: null,
    race: raceData?.name || "Unknown",
    background: "Custom",
    classes: classData?.name || "Unknown",
    subclasses: [],
    level: state.level || 1,
    hpMax,
    hpCurrent: hpMax,
    tempHp: 0,
    inspiration: false,
    exhaustion: 0,
    deathSaves: { successes: 0, failures: 0, stabilized: false },
    passivePerception: 10 + wisMod,
    passiveInvestigation: 10 + intMod,
    passiveInsight: 10 + wisMod,
    armorClass: 10 + Math.floor((state.abilities.DEX - 10) / 2),
    initiative: Math.floor((state.abilities.DEX - 10) / 2),
    speed: raceData?.speed || 30,
    proficiencyBonus,
    senses: [],
    skills: [],
    saves: [],
    spellSlots: [],
    pactSlots: [],
    abilities,
    conditions: [],
    defenses: [],
    actions: [],
    inventory: [],
    readonlyUrl: `/character/${id}`,
    languages: ["Common"],
    tools: [],
    armorProficiencies: [],
    weaponProficiencies: [],
    hitDice: `${state.level}/${state.level}d${cls?.hitDice || 8}`,
  } as unknown as PartyMember;

  return member;
}

export const saveNativeCharacter = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { character: PartyMember } }) => {
    const filePath = path.join(process.cwd(), `native-char-${data.id}.json`);
    await fs.writeFile(filePath, JSON.stringify({ success: true, data }, null, 2), "utf-8");
    return data.id;
  });

export const getNativeCharacter = createServerFn({ method: "GET" })
  .handler(async ({ data }: { data: { id: number } }) => {
    if (!data?.id) return null;
    try {
      const filePath = path.join(process.cwd(), `native-char-${data.id}.json`);
      const content = await fs.readFile(filePath, "utf-8");
      const payload = JSON.parse(content);
      return payload.data as PartyMember;
    } catch {
      return null;
    }
  });
