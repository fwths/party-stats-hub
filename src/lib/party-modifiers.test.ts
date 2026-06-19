import { describe, it, expect, beforeEach } from "vitest";
import { getFullyModifiedStats } from "./party-modifiers";
import type { PartyMember } from "./dndbeyond.types";

const mockBaseMember = {
  id: 12345,
  name: "Gimli",
  avatarUrl: null,
  race: "Dwarf",
  background: "Soldier",
  classes: "Fighter 5",
  subclasses: ["Champion"],
  level: 5,
  hpMax: 44,
  hpCurrent: 44,
  tempHp: 0,
  inspiration: false,
  exhaustion: 0,
  deathSaves: { successes: 0, failures: 0, stabilized: false },
  passivePerception: 12,
  passiveInvestigation: 10,
  passiveInsight: 11,
  armorClass: 16,
  initiative: 2,
  speed: 25,
  proficiencyBonus: 3,
  senses: [],
  skills: [],
  saves: [],
  spellSlots: [],
  pactSlots: [],
  abilities: [
    { name: "STR", score: 16, modifier: 3 },
    { name: "DEX", score: 14, modifier: 2 },
    { name: "CON", score: 15, modifier: 2 },
    { name: "INT", score: 10, modifier: 0 },
    { name: "WIS", score: 12, modifier: 1 },
    { name: "CHA", score: 8, modifier: -1 },
  ],
  conditions: [],
  defenses: [],
  actions: [],
  inventory: [],
  readonlyUrl: "http://example.com",
  languages: ["Common", "Dwarvish"],
  tools: [],
  armorProficiencies: [],
  weaponProficiencies: [],
  specialSpeeds: [],
  spellcasting: [],
  hitDice: "5d10",
  feats: [],
  alignment: "LG",
  currencies: { cp: 0, sp: 0, ep: 0, gp: 100, pp: 0 },
  weightCarried: 50,
  carryingCapacity: 240,
  attacks: [],
  cantrips: [],
  preparedSpells: [],
  allSpells: [],
  features: [],
  characteristics: {
    personalityTraits: "",
    ideals: "",
    bonds: "",
    flaws: "",
    appearance: "",
  },
  activeArmorModel: null,
  activeInfusions: [],
  infusions: [],
  metamagic: [],
  totemAspects: [],
  weaponMasteries: [],
  creatures: [],
} as unknown as PartyMember;

describe("getFullyModifiedStats", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns base member details when no local storage overrides exist", () => {
    const result = getFullyModifiedStats(mockBaseMember);
    expect(result.name).toBe("Gimli");
    expect(result.hpCurrent).toBe(44);
    expect(result.conditions).toEqual([]);
    expect(result.armorClass).toBe(16);
  });

  it("applies HP overrides from local storage", () => {
    const override = { hpCurrent: 30, tempHp: 5 };
    localStorage.setItem(`party-stats:hp:${mockBaseMember.id}`, JSON.stringify(override));

    const result = getFullyModifiedStats(mockBaseMember);
    expect(result.hpCurrent).toBe(30);
    expect(result.tempHp).toBe(5);
  });

  it("applies conditions overrides from local storage", () => {
    const activeConditions = {
      [mockBaseMember.id]: [
        { name: "Prone", rounds: null },
        { name: "Poisoned", rounds: null },
      ],
    };
    localStorage.setItem("mob.conditions.v1", JSON.stringify(activeConditions));

    const result = getFullyModifiedStats(mockBaseMember);
    expect(result.conditions).toEqual(["Prone", "Poisoned"]);
  });
});
