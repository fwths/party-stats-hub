import { PartyMember } from "./dndbeyond.types";
import { getRace, getClass } from "./srd-engine";
import { createServerFn } from "@tanstack/react-start";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export function createNativePartyMember(state: any): PartyMember {
  const id = Math.floor(Math.random() * 1000000) + 900000000; // Native IDs are 900M+

  const race = getRace(state.raceId);
  const cls = getClass(state.classId);

  const conMod = Math.floor((state.abilities.CON - 10) / 2);
  const hpMax = cls
    ? cls.hitPoints.hitDice +
      conMod +
      (state.level - 1) * (Math.floor(cls.hitPoints.hitDice / 2) + 1 + conMod)
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
    race: race?.name || "Unknown",
    background: "Custom",
    classes: cls?.name || "Unknown",
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
    speed: race?.speed || 30,
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
    hitDice: `${state.level}/${state.level}d${cls?.hitPoints.hitDice || 8}`,
    specialSpeeds: [],
    spellcasting: [],
    feats: [],
    alignment: "Unknown",
    currencies: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    weightCarried: 0,
    carryingCapacity: (state.abilities.STR || 10) * 15,
    attacks: [],
    cantrips: [],
    preparedSpells: [],
    allSpells: [],
    features: [],
    characteristics: { personalityTraits: "", ideals: "", bonds: "", flaws: "", appearance: "" },
    activeArmorModel: null,
    activeInfusions: [],
    infusions: [],
    metamagic: [],
    totemAspects: [],
    weaponMasteries: [],
    creatures: [],
  } as PartyMember;

  return member;
}

export const saveNativeCharacter = createServerFn({ method: "POST" })
  .validator((input: any) => input)
  .handler(async ({ data }) => {
    const filePath = path.join(process.cwd(), `native-char-${data.id}.json`);
    await fs.writeFile(filePath, JSON.stringify({ success: true, data }, null, 2), "utf-8");
    return data.id;
  });

export const getNativeCharacter = createServerFn({ method: "GET" })
  .validator((input?: { id?: number }) => input)
  .handler(async ({ data }) => {
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
