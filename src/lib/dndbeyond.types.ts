export interface AbilityScore {
  name: string;
  score: number;
  modifier: number;
}

export interface SkillInfo {
  key: string;
  name: string;
  ability: string; // STR/DEX/...
  modifier: number;
  proficiency: "none" | "half" | "proficient" | "expertise";
}

export interface SenseInfo {
  name: string;
  value: number | null; // e.g. 60 (ft) or null for non-range senses
}

export interface SaveInfo {
  ability: string; // STR/DEX/...
  modifier: number;
  proficiency: "none" | "proficient" | "expertise";
}

export interface SpellSlotLevel {
  level: number; // 1-9 or 1-5 for pact
  max: number;
  used: number;
}

export interface SpellcastingInfo {
  className: string;
  ability: string; // e.g. INT, WIS, CHA
  saveDc: number;
  attackBonus: number;
}

export interface DefenseInfo {
  type: "resistance" | "immunity" | "vulnerability";
  damageType: string;
}

export interface ActionInfo {
  name: string;
  source: string; // class / race / feat / item
  description?: string;
  activation?: {
    activationType: number;
    activationTime: number | null;
  };
  uses?: { current: number; max: number; reset: string };
}

export interface InventoryItem {
  name: string;
  type: string; // Weapon / Armor / Wondrous item / Potion / ...
  rarity: string | null; // Common, Uncommon, Rare, Very Rare, Legendary, Artifact, Mundane
  magic: boolean;
  equipped: boolean;
  attuned: boolean;
  quantity: number;
  weight?: number;
  description?: string;
  snippet?: string;
  cost?: number;
  damage?: string;
  properties?: string[];
  armorClass?: number;
  armorTypeId?: number;
}

export interface DeathSaves {
  successes: number;
  failures: number;
  stabilized: boolean;
}

export interface Currencies {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}

export interface AttackInfo {
  name: string;
  attackBonus: number;
  damage: string;
  damageType: string;
  properties: string[];
  isWeapon: boolean;
}

export interface PreparedSpell {
  level: number;
  name: string;
  description?: string;
  school?: string;
  activation?: {
    activationTime: number;
    activationType: number;
  };
  range?: {
    origin: string;
    rangeValue: number | null;
    aoeType: string | null;
    aoeValue: number | null;
  };
  duration?: {
    durationType: string;
    durationInterval: number | null;
    durationUnit: string | null;
  };
  components?: number[];
  componentsDescription?: string;
  concentration?: boolean;
  ritual?: boolean;
  prepared?: boolean;
  alwaysPrepared?: boolean;
}

export interface FeatureInfo {
  name: string;
  description: string;
  source: "class" | "race" | "background" | "other" | "feat";
  sourceName: string;
  level?: number;
  isUnlocked?: boolean;
}

export interface CharacterCharacteristics {
  personalityTraits: string;
  ideals: string;
  bonds: string;
  flaws: string;
  appearance: string;
  gender?: string;
  age?: string;
  height?: string;
  weight?: string;
  eyes?: string;
  skin?: string;
  hair?: string;
  backstory?: string;
  allies?: string;
  enemies?: string;
  organizations?: string;
  otherNotes?: string;
}

export interface CreatureMovement {
  movementId: number;
  speed: number;
  notes: string;
}

export interface CreatureStat {
  statId: number;
  name: string | null;
  value: number;
}

export interface CreatureSense {
  senseId: number;
  notes: string;
}

export interface CreatureSkill {
  name: string;
  value: number;
}

export interface CreatureSavingThrow {
  name: string;
  value: number;
}

export interface CreatureInfo {
  id: number;
  name: string | null;
  description: string | null;
  isActive: boolean;
  removedHitPoints: number;
  temporaryHitPoints: number | null;
  definition: {
    id: number;
    name: string;
    armorClass: number;
    armorClassDescription: string | null;
    averageHitPoints: number;
    hitPointDice: {
      diceCount: number;
      diceValue: number;
      diceString: string;
    } | null;
    movements: CreatureMovement[];
    passivePerception: number;
    avatarUrl: string | null;
    stats: CreatureStat[];
    senses: CreatureSense[];
    specialTraitsDescription: string;
    actionsDescription: string;
    reactionsDescription: string;
    bonusActionsDescription: string;
    characteristicsDescription: string;
    skills: CreatureSkill[];
    savingThrows: CreatureSavingThrow[];
  };
}

export interface PartyMember {
  id: number;
  name: string;
  avatarUrl: string | null;
  race: string;
  background: string;
  classes: string;
  subclasses: string[];
  level: number;
  hpMax: number;
  hpCurrent: number;
  tempHp: number;
  inspiration: boolean;
  exhaustion: number;
  deathSaves: DeathSaves;
  passivePerception: number;
  passiveInvestigation: number;
  passiveInsight: number;
  armorClass: number;
  initiative: number;
  speed: number;
  proficiencyBonus: number;
  senses: SenseInfo[];
  skills: SkillInfo[];
  saves: SaveInfo[];
  spellSlots: SpellSlotLevel[];
  pactSlots: SpellSlotLevel[];
  abilities: AbilityScore[];
  conditions: string[];
  defenses: DefenseInfo[];
  actions: ActionInfo[];
  inventory: InventoryItem[];
  readonlyUrl: string;
  error?: string;
  languages: string[];
  tools: string[];
  armorProficiencies: string[];
  weaponProficiencies: string[];
  specialSpeeds: Array<{ type: string; value: number }>;
  spellcasting: SpellcastingInfo[];
  hitDice: string;
  feats: Array<{ name: string; description: string; choices: string[] }>;
  alignment: string | null;
  currencies: Currencies;
  weightCarried: number;
  carryingCapacity: number;
  attacks: AttackInfo[];
  cantrips: PreparedSpell[];
  preparedSpells: PreparedSpell[];
  allSpells: PreparedSpell[];
  features: FeatureInfo[];
  characteristics: CharacterCharacteristics;
  activeArmorModel: string | null;
  activeInfusions: string[];
  infusions: Array<{ name: string; description: string }>;
  metamagic: Array<{ name: string; description: string }>;
  totemAspects: Array<{ name: string; description: string }>;
  weaponMasteries: Array<{ name: string; description: string }>;
  creatures: CreatureInfo[];
}
