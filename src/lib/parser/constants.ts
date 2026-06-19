export const ABILITY_NAMES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;
export const ABILITY_ID_TO_INDEX: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };
export const WIS_INDEX = 4;
export const DEX_INDEX = 1;

export const SKILLS: Array<[string, string, number]> = [
  ["acrobatics", "Acrobatics", 1],
  ["animal-handling", "Animal Handling", 4],
  ["arcana", "Arcana", 3],
  ["athletics", "Athletics", 0],
  ["deception", "Deception", 5],
  ["history", "History", 3],
  ["insight", "Insight", 4],
  ["intimidation", "Intimidation", 5],
  ["investigation", "Investigation", 3],
  ["medicine", "Medicine", 4],
  ["nature", "Nature", 3],
  ["perception", "Perception", 4],
  ["performance", "Performance", 5],
  ["persuasion", "Persuasion", 5],
  ["religion", "Religion", 3],
  ["sleight-of-hand", "Sleight of Hand", 1],
  ["stealth", "Stealth", 1],
  ["survival", "Survival", 4],
];

export const ABILITY_LONG = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
] as const;

export const MULTI_SLOTS: number[][] = [
  [], // 0
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

export const PACT_TABLE: Array<[number, number]> = [
  [0, 0],
  [1, 1],
  [1, 2],
  [2, 2],
  [2, 2],
  [3, 2],
  [3, 2],
  [4, 2],
  [4, 2],
  [5, 2],
  [5, 2],
  [5, 3],
  [5, 3],
  [5, 3],
  [5, 3],
  [5, 3],
  [5, 3],
  [5, 4],
  [5, 4],
  [5, 4],
  [5, 4],
];

export const ALIGNMENT_MAP: Record<number, string> = {
  1: "Lawful Good",
  2: "Neutral Good",
  3: "Chaotic Good",
  4: "Lawful Neutral",
  5: "True Neutral",
  6: "Chaotic Neutral",
  7: "Lawful Evil",
  8: "Neutral Evil",
  9: "Chaotic Evil",
};

export const RARITY_ORDER = [
  "Mundane",
  "Common",
  "Uncommon",
  "Rare",
  "Very Rare",
  "Legendary",
  "Artifact",
];
