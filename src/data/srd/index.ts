export interface SRDRule {
  id: string;
  title: string;
  content: string;
}

export interface SRDRace {
  id: string;
  name: string;
  description: string;
  speed: number;
  abilityBonuses: { ability: string; bonus: number }[];
  features: { name: string; description: string }[];
  subraces?: {
    id: string;
    name: string;
    description: string;
    abilityBonuses?: { ability: string; bonus: number }[];
    features?: { name: string; description: string }[];
  }[];
}

export interface SRDClass {
  id: string;
  name: string;
  description: string;
  hitDice?: number;
  primaryAbility: string[];
  saves?: string[];
  featuresByLevel?: Record<
    number,
    { name: string; description: string; [key: string]: unknown }[]
  >;
  subclasses?: {
    id: string;
    name: string;
    description: string;
    [key: string]: unknown;
  }[];
  [key: string]: unknown;
}

export const rules: SRDRule[] = [
  {
    id: "combat",
    title: "Combat",
    content:
      "## The Order of Combat\n1. Determine surprise.\n2. Establish positions.\n3. Roll initiative.\n4. Take turns.\n5. Begin the next round.\n\n### Actions in Combat\nWhen you take your action on your turn, you can take one of the actions presented here, an action you gained from your class or a special feature, or an action you improvise.",
  },
  {
    id: "spellcasting",
    title: "Spellcasting",
    content:
      "## What Is a Spell?\nA spell is a discrete magical effect, a single shaping of the magical energies that suffuse the multiverse into a specific, limited expression.\n\n### Spell Level\nEvery spell has a level from 0 to 9. A spell's level is a general indicator of how powerful it is.",
  },
  {
    id: "ability-scores",
    title: "Using Ability Scores",
    content:
      "## Ability Scores and Modifiers\nEach of a creature's abilities has a score, a number that defines the magnitude of that ability.\n- Strength: Measuring physical power\n- Dexterity: Measuring agility\n- Constitution: Measuring endurance\n- Intelligence: Measuring reasoning and memory\n- Wisdom: Measuring Perception and Insight\n- Charisma: Measuring force of Personality",
  },
];

export const races: SRDRace[] = [
  {
    id: "dragonborn",
    name: "Dragonborn",
    description:
      "Dragonborn look very much like dragons standing erect in humanoid form, though they lack wings or a tail.",
    speed: 30,
    abilityBonuses: [
      { ability: "STR", bonus: 2 },
      { ability: "CHA", bonus: 1 },
    ],
    features: [
      {
        name: "Draconic Ancestry",
        description:
          "You have draconic ancestry. Choose one type of dragon from the Draconic Ancestry table.",
      },
      {
        name: "Breath Weapon",
        description: "You can use your action to exhale destructive energy.",
      },
    ],
  },
  {
    id: "dwarf",
    name: "Dwarf",
    description:
      "Bold and hardy, dwarves are known as skilled warriors, miners, and workers of stone and metal.",
    speed: 25,
    abilityBonuses: [{ ability: "CON", bonus: 2 }],
    features: [
      {
        name: "Darkvision",
        description: "You can see in dim light within 60 feet of you as if it were bright light.",
      },
      {
        name: "Dwarven Resilience",
        description:
          "You have advantage on saving throws against poison, and you have resistance against poison damage.",
      },
    ],
    subraces: [
      {
        id: "hill-dwarf",
        name: "Hill Dwarf",
        description:
          "As a hill dwarf, you have keen senses, deep intuition, and remarkable resilience.",
        abilityBonuses: [{ ability: "WIS", bonus: 1 }],
        features: [
          {
            name: "Dwarven Toughness",
            description:
              "Your hit point maximum increases by 1, and it increases by 1 every time you gain a level.",
          },
        ],
      },
    ],
  },
  {
    id: "elf",
    name: "Elf",
    description:
      "Elves are a magical people of otherworldly grace, living in the world but not entirely part of it.",
    speed: 30,
    abilityBonuses: [{ ability: "DEX", bonus: 2 }],
    features: [
      {
        name: "Darkvision",
        description: "You can see in dim light within 60 feet of you as if it were bright light.",
      },
      { name: "Keen Senses", description: "You have proficiency in the Perception skill." },
      {
        name: "Fey Ancestry",
        description:
          "You have advantage on saving throws against being charmed, and magic can't put you to sleep.",
      },
      {
        name: "Trance",
        description:
          "Elves don't need to sleep. Instead, they meditate deeply, remaining semiconscious, for 4 hours a day.",
      },
    ],
    subraces: [
      {
        id: "high-elf",
        name: "High Elf",
        description:
          "As a high elf, you have a keen mind and a mastery of at least the basics of magic.",
        abilityBonuses: [{ ability: "INT", bonus: 1 }],
        features: [
          {
            name: "Cantrip",
            description: "You know one cantrip of your choice from the wizard spell list.",
          },
        ],
      },
    ],
  },
  {
    id: "gnome",
    name: "Gnome",
    description:
      "A gnome’s energy and enthusiasm for living shines through every inch of their tiny body.",
    speed: 25,
    abilityBonuses: [{ ability: "INT", bonus: 2 }],
    features: [
      {
        name: "Darkvision",
        description: "You can see in dim light within 60 feet of you as if it were bright light.",
      },
      {
        name: "Gnome Cunning",
        description:
          "You have advantage on all Intelligence, Wisdom, and Charisma saving throws against magic.",
      },
    ],
    subraces: [
      {
        id: "rock-gnome",
        name: "Rock Gnome",
        description:
          "As a rock gnome, you have a natural inventiveness and hardiness beyond that of other gnomes.",
        abilityBonuses: [{ ability: "CON", bonus: 1 }],
        features: [
          {
            name: "Artificer's Lore",
            description:
              "Whenever you make an Intelligence (History) check related to magic items, alchemical objects, or technological devices, you can add twice your proficiency bonus.",
          },
        ],
      },
    ],
  },
  {
    id: "half-elf",
    name: "Half-Elf",
    description:
      "Half-elves combine what some say are the best qualities of their elf and human parents.",
    speed: 30,
    abilityBonuses: [
      { ability: "CHA", bonus: 2 },
      { ability: "DEX", bonus: 1 },
      { ability: "CON", bonus: 1 },
    ],
    features: [
      {
        name: "Darkvision",
        description: "You can see in dim light within 60 feet of you as if it were bright light.",
      },
      {
        name: "Fey Ancestry",
        description:
          "You have advantage on saving throws against being charmed, and magic can't put you to sleep.",
      },
    ],
  },
  {
    id: "halfling",
    name: "Halfling",
    description:
      "The diminutive halflings survive in a world full of larger creatures by avoiding notice.",
    speed: 25,
    abilityBonuses: [{ ability: "DEX", bonus: 2 }],
    features: [
      {
        name: "Lucky",
        description:
          "When you roll a 1 on the d20 for an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll.",
      },
      {
        name: "Brave",
        description: "You have advantage on saving throws against being frightened.",
      },
    ],
    subraces: [
      {
        id: "lightfoot",
        name: "Lightfoot",
        description:
          "As a lightfoot halfling, you can easily hide from notice, even using other people as cover.",
        abilityBonuses: [{ ability: "CHA", bonus: 1 }],
        features: [
          {
            name: "Naturally Stealthy",
            description:
              "You can attempt to hide even when you are obscured only by a creature that is at least one size larger than you.",
          },
        ],
      },
    ],
  },
  {
    id: "half-orc",
    name: "Half-Orc",
    description:
      "Half-orcs’ grayish pigmentation, sloping foreheads, jutting jaws, prominent teeth, and towering builds make their orcish heritage plain for all to see.",
    speed: 30,
    abilityBonuses: [
      { ability: "STR", bonus: 2 },
      { ability: "CON", bonus: 1 },
    ],
    features: [
      {
        name: "Darkvision",
        description: "You can see in dim light within 60 feet of you as if it were bright light.",
      },
      {
        name: "Relentless Endurance",
        description:
          "When you are reduced to 0 hit points but not killed outright, you can drop to 1 hit point instead.",
      },
    ],
  },
  {
    id: "human",
    name: "Human",
    description: "Humans are the most adaptable and ambitious people among the common races.",
    speed: 30,
    abilityBonuses: [
      { ability: "STR", bonus: 1 },
      { ability: "DEX", bonus: 1 },
      { ability: "CON", bonus: 1 },
      { ability: "INT", bonus: 1 },
      { ability: "WIS", bonus: 1 },
      { ability: "CHA", bonus: 1 },
    ],
    features: [],
  },
  {
    id: "tiefling",
    name: "Tiefling",
    description:
      "To be greeted with stares and whispers, to suffer violence and insult on the street, to see mistrust and fear in every eye: this is the lot of the tiefling.",
    speed: 30,
    abilityBonuses: [
      { ability: "INT", bonus: 1 },
      { ability: "CHA", bonus: 2 },
    ],
    features: [
      {
        name: "Darkvision",
        description: "You can see in dim light within 60 feet of you as if it were bright light.",
      },
      { name: "Hellish Resistance", description: "You have resistance to fire damage." },
    ],
  },
];

export const classes: SRDClass[] = [
  {
    id: "barbarian",
    name: "Barbarian",
    description: "A fierce warrior of primitive background who can enter a battle rage.",
    hitDice: 12,
    primaryAbility: ["STR"],
    saves: ["STR", "CON"],
    featuresByLevel: {
      1: [
        {
          name: "Rage",
          description:
            "In battle, you fight with primal ferocity. On your turn, you can enter a rage as a bonus action.",
        },
        {
          name: "Unarmored Defense",
          description:
            "While you are not wearing any armor, your Armor Class equals 10 + your Dexterity modifier + your Constitution modifier.",
        },
      ],
    },
    subclasses: [
      {
        id: "berserker",
        name: "Path of the Berserker",
        description: "For some barbarians, rage is a means to an end—that end being violence.",
      },
    ],
  },
  {
    id: "bard",
    name: "Bard",
    description: "An inspiring magician whose power echoes the music of creation.",
    hitDice: 8,
    primaryAbility: ["CHA"],
    saves: ["DEX", "CHA"],
    featuresByLevel: {
      1: [
        {
          name: "Spellcasting",
          description:
            "You have learned to untangle and reshape the fabric of reality in harmony with your wishes and music.",
        },
        {
          name: "Bardic Inspiration",
          description: "You can inspire others through stirring words or music.",
        },
      ],
    },
    subclasses: [
      {
        id: "lore",
        name: "College of Lore",
        description:
          "Bards of the College of Lore know something about most things, collecting bits of knowledge from sources as diverse as scholarly tomes and peasant tales.",
      },
    ],
  },
  {
    id: "cleric",
    name: "Cleric",
    description: "A priestly champion who wields divine magic in service of a higher power.",
    hitDice: 8,
    primaryAbility: ["WIS"],
    saves: ["WIS", "CHA"],
    featuresByLevel: {
      1: [
        {
          name: "Spellcasting",
          description: "As a conduit for divine power, you can cast cleric spells.",
        },
        { name: "Divine Domain", description: "Choose one domain related to your deity." },
      ],
    },
    subclasses: [
      {
        id: "life",
        name: "Life Domain",
        description:
          "The Life domain focuses on the vibrant positive energy—one of the fundamental forces of the universe—that sustains all life.",
      },
    ],
  },
  {
    id: "druid",
    name: "Druid",
    description:
      "A priest of the Old Faith, wielding the powers of nature and adopting animal forms.",
    hitDice: 8,
    primaryAbility: ["WIS"],
    saves: ["INT", "WIS"],
    featuresByLevel: {
      1: [
        { name: "Druidic", description: "You know Druidic, the secret language of druids." },
        {
          name: "Spellcasting",
          description:
            "Drawing on the divine essence of nature itself, you can cast spells to shape that essence to your will.",
        },
      ],
    },
    subclasses: [
      {
        id: "land",
        name: "Circle of the Land",
        description:
          "The Circle of the Land is made up of mystics and sages who safeguard ancient knowledge and rites through a vast oral tradition.",
      },
    ],
  },
  {
    id: "fighter",
    name: "Fighter",
    description: "A master of martial combat, skilled with a variety of weapons and armor.",
    hitDice: 10,
    primaryAbility: ["STR", "DEX"],
    saves: ["STR", "CON"],
    featuresByLevel: {
      1: [
        {
          name: "Fighting Style",
          description: "You adopt a particular style of fighting as your specialty.",
        },
        {
          name: "Second Wind",
          description:
            "You have a limited well of stamina that you can draw on to protect yourself from harm.",
        },
      ],
    },
    subclasses: [
      {
        id: "champion",
        name: "Champion",
        description:
          "The archetypal Champion focuses on the development of raw physical power honed to deadly perfection.",
      },
    ],
  },
  {
    id: "monk",
    name: "Monk",
    description:
      "A master of martial arts, harnessing the power of the body in pursuit of physical and spiritual perfection.",
    hitDice: 8,
    primaryAbility: ["DEX", "WIS"],
    saves: ["STR", "DEX"],
    featuresByLevel: {
      1: [
        {
          name: "Unarmored Defense",
          description:
            "While you are wearing no armor and not wielding a shield, your AC equals 10 + your Dexterity modifier + your Wisdom modifier.",
        },
        {
          name: "Martial Arts",
          description:
            "Your practice of martial arts gives you mastery of combat styles that use unarmed strikes and monk weapons.",
        },
      ],
    },
    subclasses: [
      {
        id: "open-hand",
        name: "Warrior of the Open Hand",
        description:
          "Monks of the Way of the Open Hand are the ultimate masters of martial arts combat, whether armed or unarmed.",
      },
    ],
  },
  {
    id: "paladin",
    name: "Paladin",
    description: "A holy warrior bound to a sacred oath.",
    hitDice: 10,
    primaryAbility: ["STR", "CHA"],
    saves: ["WIS", "CHA"],
    featuresByLevel: {
      1: [
        {
          name: "Divine Sense",
          description: "The presence of strong evil registers on your senses like a noxious odor.",
        },
        { name: "Lay on Hands", description: "Your blessed touch can heal wounds." },
      ],
    },
    subclasses: [
      {
        id: "devotion",
        name: "Oath of Devotion",
        description:
          "The Oath of Devotion binds a paladin to the loftiest ideals of justice, virtue, and order.",
      },
    ],
  },
  {
    id: "ranger",
    name: "Ranger",
    description: "A warrior who combats threats on the edges of civilization.",
    hitDice: 10,
    primaryAbility: ["DEX", "WIS"],
    saves: ["STR", "DEX"],
    featuresByLevel: {
      1: [
        {
          name: "Favored Enemy",
          description:
            "You have significant experience studying, tracking, hunting, and even talking to a certain type of enemy.",
        },
        {
          name: "Natural Explorer",
          description: "You are particularly familiar with one type of natural environment.",
        },
      ],
    },
    subclasses: [
      {
        id: "hunter",
        name: "Hunter",
        description:
          "Emulating the Hunter archetype means accepting your place as a bulwark between civilization and the terrors of the wilderness.",
      },
    ],
  },
  {
    id: "rogue",
    name: "Rogue",
    description: "A scoundrel who uses stealth and trickery to overcome obstacles and enemies.",
    hitDice: 8,
    primaryAbility: ["DEX"],
    saves: ["DEX", "INT"],
    featuresByLevel: {
      1: [
        {
          name: "Expertise",
          description:
            "Choose two of your skill proficiencies, or one of your skill proficiencies and your proficiency with thieves’ tools.",
        },
        {
          name: "Sneak Attack",
          description: "You know how to strike subtly and exploit a foe’s distraction.",
        },
      ],
    },
    subclasses: [
      {
        id: "thief",
        name: "Thief",
        description:
          "You hone your skills in the larcenous arts. Burglars, bandits, cutpurses, and other criminals typically follow this archetype.",
      },
    ],
  },
  {
    id: "sorcerer",
    name: "Sorcerer",
    description: "A spellcaster who draws on inherent magic from a gift or bloodline.",
    hitDice: 6,
    primaryAbility: ["CHA"],
    saves: ["CON", "CHA"],
    featuresByLevel: {
      1: [
        {
          name: "Spellcasting",
          description:
            "An event in your past, or in the life of a parent or ancestor, left an indelible mark on you, infusing you with arcane magic.",
        },
      ],
    },
    subclasses: [
      {
        id: "draconic",
        name: "Draconic Sorcery",
        description:
          "Your innate magic comes from draconic magic that was mingled with your blood or that of your ancestors.",
      },
    ],
  },
  {
    id: "warlock",
    name: "Warlock",
    description: "A wielder of magic that is derived from a bargain with an extraplanar entity.",
    hitDice: 8,
    primaryAbility: ["CHA"],
    saves: ["WIS", "CHA"],
    featuresByLevel: {
      1: [
        {
          name: "Pact Magic",
          description:
            "Your arcane research and the magic bestowed on you by your patron have given you facility with spells.",
        },
      ],
    },
    subclasses: [
      {
        id: "fiend",
        name: "The Fiend",
        description:
          "You have made a pact with a fiend from the lower planes of existence, a being whose aims are evil.",
      },
    ],
  },
  {
    id: "wizard",
    name: "Wizard",
    description: "A scholarly magic-user capable of manipulating the structures of reality.",
    hitDice: 6,
    primaryAbility: ["INT"],
    saves: ["INT", "WIS"],
    featuresByLevel: {
      1: [
        {
          name: "Spellcasting",
          description:
            "As a student of arcane magic, you have a spellbook containing spells that show the first glimmerings of your true power.",
        },
      ],
    },
    subclasses: [
      {
        id: "evoker",
        name: "Evoker",
        description:
          "You focus your study on magic that creates powerful elemental effects such as bitter cold, searing flame, rolling thunder, crackling lightning, and burning acid.",
      },
    ],
  },
];
