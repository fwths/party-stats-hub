export interface SRDRule {
  id: string;
  title: string;
  content: string;
}

// 0. THE PINNACLE OF PERFECTION: ACTIVE EFFECTS ENGINE
// This allows the app to mathematically calculate buffs, debuffs, and auras (like Bless, Haste, or Mage Armor)
export interface SRDActiveEffect {
  id: string;
  name: string;
  type: "Buff" | "Debuff" | "Aura";
  target: "Self" | "Ally" | "Enemy" | "Area";
  auraRadius?: number; // e.g., Paladin Aura of Protection is 10 ft
  duration: {
    value: number;
    unit: "Round" | "Minute" | "Hour" | "Day" | "Permanent";
  };
  changes: {
    // What property is being altered? (e.g., "ac.base", "speed.walk", "savingThrow.all")
    key: string;
    // How is it altered? (e.g., Haste multiplies speed by 2, Mage Armor overrides AC base to 13)
    mode: "Add" | "Multiply" | "Override" | "Upgrade" | "Downgrade";
    // The value (e.g., 2, "1d4", "charismaModifier")
    value: number | string;
  }[];
  grantsAdvantageOn?: string[]; // e.g. ["savingThrow.dexterity"]
  grantsDisadvantageOn?: string[];
  grantsResistances?: string[]; // e.g. ["Fire", "Bludgeoning"]
  grantsImmunities?: string[];
}

// 1. PERFECTLY CALCULATED SPELLS
export interface SRDSpell {
  id: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  // Mathematical Components
  components:
    | string
    | {
        v: boolean;
        s: boolean;
        m: boolean;
        materialDescription?: string;
        materialCost?: number;
        consumed?: boolean;
      };
  duration: string;
  concentration?: boolean;
  ritual?: boolean;
  description: string;
  // Mathematical Calculations
  damage?: {
    dice: string; // e.g. "8d6"
    type: string; // e.g. "Fire"
    scalingType?: "spellLevel" | "characterLevel" | "none";
    scalingFormula?: string; // e.g. "1d6 per slot above 3rd"
  }[];
  healing?: {
    dice: string;
    scalingType?: "spellLevel" | "characterLevel";
    scalingFormula?: string;
  };
  savingThrow?: {
    ability: "Strength" | "Dexterity" | "Constitution" | "Intelligence" | "Wisdom" | "Charisma";
    halfOnSuccess: boolean;
  };
  areaOfEffect?: {
    type: "Sphere" | "Cone" | "Cube" | "Line" | "Cylinder" | "Emanation";
    size: number; // in feet
  };
  attackRoll?: boolean;

  // Perfect Math: Links to calculated summons
  summonsStatBlockIds?: string[];

  // THE PINNACLE: Active Effects applied by this spell (e.g. Bless, Haste)
  activeEffects?: SRDActiveEffect[];

  classes: string[];
  source?: string;
}

// 2. PERFECTLY CALCULATED FEATURES
export interface SRDClassFeature {
  id: string;
  name: string;
  description: string;
  levelRequired?: number;
  actionType?:
    | "Action"
    | "Bonus Action"
    | "Reaction"
    | "Free Action"
    | "Special"
    | "Initiative Roll";

  // Perfect Math: Recoveries can be partial (e.g., regain 1 use on Short Rest, all on Long)
  mathematicalRecovery?: {
    shortRest?: "All" | "Half" | number;
    longRest?: "All" | "Half" | number;
    initiativeRoll?: number;
  };
  recovery?: string;

  duration?: string;
  savingThrow?: string;
  damageType?: string;

  // THE PINNACLE: Active Effects applied by this feature (e.g. Rage, Aura of Protection)
  activeEffects?: SRDActiveEffect[];

  // Mathematical Uses instead of a string
  uses?:
    | string
    | {
        base: number;
        scalingByLevel?: Record<number, number>;
        abilityModifier?: string;
      };

  // Mathematical Modifiers (e.g. Rage Damage)
  numericalModifiers?: {
    stat: string;
    bonus: number | Record<number, number>;
  }[];

  options?: SRDOption[];
  table?: { headers: string[]; rows: string[][] };
}

export interface SRDOptionChoice {
  id: string;
  name: string;
  description: string;
  prerequisite?: string;
  levelRequired?: number;
  actionType?:
    | "Action"
    | "Bonus Action"
    | "Reaction"
    | "Free Action"
    | "Special"
    | "Initiative Roll";

  mathematicalRecovery?: {
    shortRest?: "All" | "Half" | number;
    longRest?: "All" | "Half" | number;
    initiativeRoll?: number;
  };
  recovery?: string;

  duration?: string;
  savingThrow?: string;
  damageType?: string;

  uses?:
    | string
    | {
        base: number;
        scalingByLevel?: Record<number, number>;
        abilityModifier?: string;
      };

  spellsGained?: string[];
  statBlocks?: any[];
}

export interface SRDOption {
  id: string;
  name: string;
  description: string;
  levelRequired?: number;
  choices: SRDOptionChoice[];
}

export interface SRDSubclass {
  id: string;
  name: string;
  description: string;
  levelChosen?: number;
  source?: string;
  page?: number;
  options?: SRDOption[];

  // Perfect Math: Differentiating between "Always Prepared" (Cleric) vs "Added to spell list" (Warlock)
  alwaysPreparedSpells?: {
    levelGained: number;
    spells: string[];
  }[];
  expandedSpellList?: {
    levelGained: number;
    spells: string[];
  }[];
  featuresByLevel?: Record<number, SRDClassFeature[]>;
  spellcasting?: {
    ability: string;
    spellcastingFocus: string[];
    slotsByLevel: Record<number, number[]>;
    cantripsKnownByLevel?: Record<number, number>;
    spellsPreparedByLevel?: Record<number, number>;
  };
}

export interface SRDMagicItemPlan {
  id: string;
  name: string;
  description: string;
  levelRequired: number;
  prerequisite?: string;
}

export interface SRDStatBlock {
  name: string;
  description: string;
  ac: string;
  hp: string;
  speed: string;
  stats: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  actions: { name: string; description: string }[];
}

export interface SRDInfusion {
  id: string;
  name: string;
  description: string;
  levelRequired?: number;
  prerequisite?: string; // e.g., "Requires attunement" or a specific item
  itemRequirement?: string; // e.g., "A simple or martial weapon"

  // The mathematical bonus applied to the infused item
  grantedActiveEffects?: SRDActiveEffect[];
  // If the infusion replicates a magic item (e.g. Bag of Holding)
  replicatedMagicItemId?: string;
}

export interface SRDClassTable {
  headers: string[];
  rows: string[][];
}

export interface SRDClass {
  id: string;
  name: string;
  className?:
    | "Artificer"
    | "Barbarian"
    | "Bard"
    | "Cleric"
    | "Druid"
    | "Fighter"
    | "Monk"
    | "Paladin"
    | "Ranger"
    | "Rogue"
    | "Sorcerer"
    | "Warlock"
    | "Wizard";
  description: string;
  primaryAbility: string[];
  // Mathematical HP
  hitPoints: {
    hitDice: number;
    hitDiceType?: string; // e.g. "d12"
    hpAtFirstLevelValue?: number;
    hpAtHigherLevelsValue?: number;
    hpAtFirstLevel?: string;
    hpAtHigherLevels?: string;
  };
  subclassTitle?: string;
  proficiencies: {
    savingThrows: string[];
    skills: { choose: number; options: string[] };
    weapons: string[];
    armor: string[];
    tools?: string[];
    toolChoice?: { choose: number; options: string[] };
    languages?: string[];
    expertise?: { choose: number; options: string[] };
  };
  startingEquipment: {
    defaultBundle: string[];
    goldAlternative: number | string; // integer
  };
  // Perfect Math: AC Calculations
  acCalculation?: {
    base: number;
    modifiers: string[]; // e.g. ["Dexterity", "Constitution"] for Barbarian
  };

  // Perfect Math: Senses & Movement
  speed?: {
    walk: number;
    fly?: number;
    swim?: number;
    climb?: number;
    burrow?: number;
  };
  senses?: {
    darkvision?: number;
    blindsight?: number;
    tremorsense?: number;
    truesight?: number;
  };

  weaponMastery?: {
    levelGained: number;
    weaponsKnownCount: number | Record<number, number>;
  };

  // PERFECT MATH: CLASS-SPECIFIC ENGINES
  // 1. Artificer Infusions Engine
  infusions?: {
    knownByLevel: Record<number, number>;
    infusedItemsByLevel: Record<number, number>;
    options: SRDInfusion[];
  };

  // 2. Druid Wild Shape Engine
  wildShape?: {
    usesByLevel: Record<number, number>;
    maxCrByLevel: Record<number, number>;
    swimSpeedLevelRequirement: number; // e.g. 4
    flySpeedLevelRequirement: number; // e.g. 8
  };

  // 3. Warlock Invocation Engine / General Options (Fighting Styles, Metamagic)
  optionsProgression?: {
    name: string; // e.g., "Eldritch Invocations"
    knownByLevel: Record<number, number>;
    options: SRDOption[];
  }[];

  spellcasting?: {
    ability: string;
    casterType?: "Full" | "Half" | "Third" | "Pact";
    preparationType?: "Prepared" | "Known" | "Spellbook";
    spellcastingFocus: string[];
    ritualCasting?: boolean;
    slotsByLevel: Record<number, number[]>;
    cantripsKnownByLevel?: Record<number, number>;
    spellsPreparedByLevel?: Record<number, number>;
    spellsKnownByLevel?: Record<number, number>;
  };
  epicBoonRecommendation?: string;
  quickBuild?: {
    primaryAbility: string;
    secondaryAbility: string;
    background: string;
    species: string;
  };
  source?: string;
  page?: number;
  iconUrl?: string;
  imageUrl?: string;
  multiclassing?: {
    requirements: { ability: string; minScore: number }[];
    // Perfect Math: Multiclass Spell Slot Rules
    spellSlotRounding?: "Round Up" | "Round Down" | "None";
    proficienciesGained: {
      armor?: string[];
      weapons?: string[];
      tools?: string[];
      skills?: { choose: number; options: string[] };
      languages?: string[];
    };
  };
  options?: SRDOption[];
  features?: SRDClassFeature[];
  featuresByLevel: Record<number, SRDClassFeature[]>;
  subclasses?: SRDSubclass[];
  magicItemPlans?: SRDMagicItemPlan[];
  statBlocks?: SRDStatBlock[];
  classTable?: SRDClassTable;
  spells?: string[];
}

// 3. THE MISSING 2024 ENTITIES
export interface SRDFeat {
  id: string;
  name: string;
  category: "Origin" | "General" | "Fighting Style" | "Epic Boon";
  prerequisite?: string;
  levelRequirement?: number;
  repeatable: boolean;
  abilityScoreImprovement?: {
    choose: number;
    options: string[];
    amount: number;
  };
  description: string;
}

export interface SRDBackground {
  id: string;
  name: string;
  abilityScoreIncreases: {
    choose: number;
    options: string[];
    amount: number;
  };
  skillProficiencies: string[];
  toolProficiencies: string[];
  originFeatId: string;
  startingEquipment: string[];
  description: string;
}

export interface SRDRace {
  id: string;
  name: string;
  description: string;
  speed: number;
  abilityBonuses?: any[];
  features: { name: string; description: string }[];
  size?: "Tiny" | "Small" | "Medium" | "Large" | "Huge" | "Gargantuan";
  source?: string;
}

export interface SRDSpecies {
  id: string;
  name: string;
  size: "Tiny" | "Small" | "Medium" | "Large" | "Huge" | "Gargantuan";
  speed: number;
  features: { name: string; description: string }[];
  description: string;
}

export interface SRDMagicItem {
  id: string;
  name: string;
  type: string; // e.g. "Wondrous Item"
  rarity: "Common" | "Uncommon" | "Rare" | "Very Rare" | "Legendary" | "Artifact";
  requiresAttunement: boolean;
  attunementConditions?: string;
  description: string;
  weight?: number;

  // THE PINNACLE: Active Effects granted while wearing/attuned to this item
  activeEffects?: SRDActiveEffect[];

  // Perfect Math: Magic Item Charges
  charges?: {
    max: number;
    rechargeFormula?: string; // e.g. "1d6 + 1"
    rechargeCondition?: "Dawn" | "Dusk" | "Midnight" | "Short Rest" | "Long Rest";
    crumbleOnZero?: {
      dice: "d20";
      crumbleOn: number[]; // e.g. [1]
    };
  };
}

// 5. PERFECTLY CALCULATED MONSTERS
export interface SRDMonsterStatBlock {
  id: string;
  name: string;
  size: "Tiny" | "Small" | "Medium" | "Large" | "Huge" | "Gargantuan";
  type: string;
  alignment: string;
  ac: {
    base: number;
    source?: string;
  };
  hp: {
    average: number;
    formula: string; // e.g. "2d8 + 2"
  };
  speed: {
    walk: number;
    fly?: number;
    swim?: number;
    climb?: number;
    burrow?: number;
    hover?: boolean;
  };
  stats: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  saves?: Record<string, number>;
  skills?: Record<string, number>;
  resistances?: string[];
  immunities?: string[];
  vulnerabilities?: string[];
  conditionImmunities?: string[];
  senses: {
    darkvision?: number;
    blindsight?: number;
    tremorsense?: number;
    truesight?: number;
    passivePerception: number;
  };
  languages: string[];
  challengeRating: number;
  proficiencyBonus: number;

  traits?: { name: string; description: string }[];

  // Perfect Math: Monster Actions need calculated damage and recharge rules
  actions: {
    name: string;
    description: string;
    attackBonus?: number;
    damage?: { dice: string; type: string }[];
    recharge?: {
      dice: "d6";
      successOn: number[]; // e.g. [5, 6]
    };
  }[];
  bonusActions?: { name: string; description: string }[];
  reactions?: { name: string; description: string }[];
  legendaryActions?: { name: string; description: string; cost?: number }[];
  mythicActions?: { name: string; description: string }[];
  lairActions?: { name: string; description: string }[];
}

// 4. THE MISSING CALCULATED EQUIPMENT
export interface SRDWeapon {
  id: string;
  name: string;
  category: "Simple" | "Martial";
  type: "Melee" | "Ranged";
  cost: number; // in gp
  damage: {
    dice: string;
    type: string;
    // Perfect Math: Versatile weapons deal different damage when two-handed
    versatileDice?: string;
  };
  // Perfect Math: Ranged and Thrown weapons need calculable integer ranges
  range?: {
    normal: number;
    long: number;
  };
  properties: string[];
  mastery: "Cleave" | "Graze" | "Nick" | "Push" | "Sap" | "Slow" | "Topple" | "Vex";
  weight: number;
}

export interface SRDArmor {
  id: string;
  name: string;
  category: "Light" | "Medium" | "Heavy" | "Shield";
  cost: number;
  ac: {
    base: number;
    modifier?: "Dexterity" | "Constitution" | "Wisdom";
    maxModifier?: number;
  };
  strengthRequirement?: number;
  stealthDisadvantage: boolean;
  weight: number;

  activeEffects?: SRDActiveEffect[];
}

export interface SRDCondition {
  id: string;
  name: string;
  description: string;

  // THE PINNACLE: Active Effects applied by this condition (e.g., Poisoned applies Disadvantage to Attack Rolls)
  activeEffects?: SRDActiveEffect[];

  // Perfect Math: Exhaustion mathematically alters speed and rolls
  mathematicalEffects?: {
    speedModifier?: number | "0"; // e.g., Exhaustion 1 reduces speed by half, Grappled sets to 0
    d20Modifier?: number; // e.g., Exhaustion applies -2 per level
    saveDcModifier?: number;
    grantsAdvantageAgainst?: string[]; // e.g. Prone grants advantage to melee attacks
    grantsDisadvantageTo?: string[];
  }[];
}

// 6. THE MISSING SUBSYSTEMS (VEHICLES, HAZARDS, BASTIONS)
export interface SRDVehicle {
  id: string;
  name: string;
  category: "Land" | "Water" | "Air";
  cost: number;
  speed: number;
  capacity: {
    creatures: number;
    cargoTonnage: number;
  };
  ac: number;
  hp: number;
  damageThreshold: number; // Perfect Math: Vehicles ignore damage below this threshold
  weapons?: { name: string; damage: string }[];
}

export interface SRDHazard {
  id: string;
  name: string;
  description: string;
  perceptionDc?: number;
  disableDc?: number;
  save?: { ability: string; dc: number };
  damage?: { dice: string; type: string }[];
}

export interface SRDBastionFacility {
  id: string;
  name: string;
  levelRequired: number;
  prerequisite?: string;
  costToBuild: number;
  daysToBuild: number;
  orders: { name: string; description: string; pointsGenerated?: number }[];
}

// 7. THE AGGREGATOR: THE CHARACTER STATE SCHEMA
// This is the true goal of "Party Stats Hub". The schema must define how to calculate the final character.
export interface SRDCharacter {
  id: string;
  name: string;
  playerName: string;
  speciesId: string;
  backgroundId: string;

  // Array of class levels to perfectly handle Multiclassing
  classes: {
    classId: string;
    subclassId?: string;
    level: number;
  }[];

  baseStats: { str: number; dex: number; con: number; int: number; wis: number; cha: number };

  // Perfect Math: Wealth and Encumbrance
  currency: {
    cp: number;
    sp: number;
    ep: number;
    gp: number;
    pp: number;
  };

  // Inventory & Equipment State
  inventory: { itemId: string; quantity: number }[];
  equippedWeaponIds: string[];
  equippedArmorId?: string;
  attunedItemIds: string[]; // Strict math: usually capped at 3

  // Current Combat State
  currentHp: number;
  temporaryHp: number;
  exhaustionLevel: number; // 0-10 in 2024 rules
  heroicInspiration: boolean;

  // Perfect Math: Death Saves and Hit Dice
  deathSaves: {
    successes: number; // 0-3
    failures: number; // 0-3
  };
  hitDiceExpended: Record<string, number>; // e.g., { "d8": 2, "d10": 1 }

  // Mathematical Tracking
  spellSlotsExpended: Record<number, number>;
  featureUsesExpended: Record<string, number>; // key: featureId

  // Applied Active Effects (e.g. Bless, Haste, Poisoned)
  activeEffectIds: string[];
}

export const rules: SRDRule[] = [];

// export { races } from './races';
// export { classes } from './classes';
// export { spells } from './spells';
