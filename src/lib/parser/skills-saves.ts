import { AbilityScore, SaveInfo, SkillInfo } from "../dndbeyond.types";
import { ABILITY_LONG, ABILITY_NAMES, SKILLS } from "./constants";

export function computeSaves(modifiers: any[], abilities: AbilityScore[], pb: number): SaveInfo[] {
  // Flat bonus that applies to all saves (e.g. Cloak of Protection, Aura of Protection)
  let allSavesBonus = 0;
  for (const m of modifiers) {
    if (m?.subType === "saving-throws" && m?.type === "bonus") {
      if (typeof m.value === "number") {
        allSavesBonus += m.value;
      }
      if (typeof m.statId === "number" && m.statId >= 1 && m.statId <= 6) {
        allSavesBonus += abilities[m.statId - 1].modifier;
      }
    }
  }
  return ABILITY_LONG.map((long, i) => {
    const subType = `${long}-saving-throws`;
    let prof: "none" | "proficient" | "expertise" = "none";
    let bonus = 0;
    for (const m of modifiers) {
      if (m?.subType !== subType) continue;
      if (m.type === "expertise") prof = "expertise";
      else if (m.type === "proficiency" && prof !== "expertise") prof = "proficient";
      else if (m.type === "bonus" && typeof m.value === "number") bonus += m.value;
    }
    const profBonus = prof === "expertise" ? pb * 2 : prof === "proficient" ? pb : 0;
    return {
      ability: ABILITY_NAMES[i],
      modifier: abilities[i].modifier + profBonus + bonus + allSavesBonus,
      proficiency: prof,
    };
  });
}

export function computeSkillProficiency(
  modifiers: any[],
  subType: string,
): "none" | "half" | "proficient" | "expertise" {
  const target = subType.toLowerCase().replace(/\s+/g, "-");
  let level: "none" | "half" | "proficient" = "none";
  for (const m of modifiers) {
    const modSub = String(m?.subType ?? "")
      .toLowerCase()
      .replace(/\s+/g, "-");
    // Jack of All Trades gives half-proficiency to all ability checks
    if (modSub === "ability-checks" && m.type === "half-proficiency" && level === "none") {
      level = "half";
    }
    if (modSub !== target) continue;
    if (m.type === "expertise") return "expertise";
    if (m.type === "proficiency") level = "proficient";
    if (m.type === "half-proficiency" && level === "none") level = "half";
  }
  return level;
}

export function computeSkills(
  modifiers: any[],
  abilities: AbilityScore[],
  pb: number,
  characterValues: any[] = [],
): SkillInfo[] {
  // D&D Beyond skill ID -> skill key (used in characterValues overrides)
  const SKILL_ID_TO_KEY: Record<string, string> = {
    "2": "athletics",
    "3": "acrobatics",
    "4": "sleight-of-hand",
    "5": "stealth",
    "6": "arcana",
    "8": "history",
    "9": "investigation",
    "10": "nature",
    "11": "animal-handling",
    "12": "insight",
    "13": "medicine",
    "14": "perception",
    "15": "religion",
    "16": "deception",
    "17": "intimidation",
    "18": "performance",
    "19": "persuasion",
    "20": "survival",
  };
  // typeId 26 = skill proficiency level override
  // value: 1=none, 2=half, 3=proficient, 4=expertise
  const overrides: Record<string, "none" | "half" | "proficient" | "expertise"> = {};
  for (const cv of characterValues) {
    if (cv?.typeId !== 26) continue;
    const key = SKILL_ID_TO_KEY[String(cv.valueId)];
    if (!key) continue;
    const v = cv.value;
    if (v === 4) overrides[key] = "expertise";
    else if (v === 3) overrides[key] = "proficient";
    else if (v === 2) overrides[key] = "half";
    else if (v === 1) overrides[key] = "none";
  }
  return SKILLS.map(([key, name, abilityIdx]) => {
    const modProf = computeSkillProficiency(modifiers, key);
    const override = overrides[key];
    // Take the higher of the two
    const rank = { none: 0, half: 1, proficient: 2, expertise: 3 } as const;
    const prof: "none" | "half" | "proficient" | "expertise" =
      override && rank[override] > rank[modProf] ? override : modProf;
    const profBonus =
      prof === "expertise"
        ? pb * 2
        : prof === "proficient"
          ? pb
          : prof === "half"
            ? Math.floor(pb / 2)
            : 0;
    // Flat skill bonuses (rare)
    let extra = 0;
    for (const m of modifiers) {
      const modSub = String(m?.subType ?? "")
        .toLowerCase()
        .replace(/\s+/g, "-");
      if (modSub === key && m?.type === "bonus" && typeof m?.value === "number") {
        extra += m.value;
      }
    }
    return {
      key,
      name,
      ability: ABILITY_NAMES[abilityIdx],
      modifier: abilities[abilityIdx].modifier + profBonus + extra,
      proficiency: prof,
    };
  });
}
