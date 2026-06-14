import type { SRDRace } from "./index";

export const races: SRDRace[] = [
  {
    id: "dragonborn",
    name: "Dragonborn",
    description:
      "Dragonborn look very much like dragons standing erect in humanoid form, though they lack wings or a tail. In the 2024 rules, they are defined by their Draconic Ancestry.",
    speed: 30,
    abilityBonuses: [], // 2024 rules use Backgrounds for ability bonuses, but we keep the structure
    features: [
      {
        name: "Draconic Ancestry",
        description:
          "You have a draconic ancestor. Choose a type of dragon. This determines your damage resistance and Breath Weapon.",
      },
      {
        name: "Breath Weapon",
        description:
          "You can exhale magical energy. Each creature in the area must make a Dexterity saving throw. The area and damage type depend on your Draconic Ancestry. You can use it a number of times equal to your Proficiency Bonus.",
      },
      {
        name: "Damage Resistance",
        description:
          "You have resistance to the damage type associated with your Draconic Ancestry.",
      },
      { name: "Darkvision", description: "You have Darkvision with a range of 60 feet." },
      {
        name: "Draconic Flight",
        description:
          "(Level 5) You can sprout spectral wings, gaining a Fly Speed equal to your Speed for 10 minutes.",
      },
    ],
  },
  {
    id: "dwarf",
    name: "Dwarf",
    description:
      "Bold and hardy, dwarves are known as skilled warriors, miners, and workers of stone and metal. They have Tremorsense and enhanced darkvision.",
    speed: 30,
    abilityBonuses: [],
    features: [
      {
        name: "Darkvision",
        description:
          "You can see in dim light within 120 feet of you as if it were bright light, and in darkness as if it were dim light.",
      },
      {
        name: "Dwarven Resilience",
        description:
          "You have Advantage on saving throws you make to avoid or end the Poisoned condition on yourself. You also have Resistance to Poison damage.",
      },
      {
        name: "Dwarven Toughness",
        description:
          "Your Hit Point maximum increases by 1, and it increases by 1 every time you gain a level.",
      },
      {
        name: "Stonecunning",
        description:
          "You gain Tremorsense with a range of 60 feet for 10 minutes on stone surfaces.",
      },
    ],
  },
  {
    id: "elf",
    name: "Elf",
    description:
      "Elves are a magical people of otherworldly grace, living in the world but not entirely part of it.",
    speed: 30,
    abilityBonuses: [],
    features: [
      {
        name: "Darkvision",
        description: "You can see in dim light within 60 feet of you as if it were bright light.",
      },
      {
        name: "Elven Lineage",
        description:
          "Choose a lineage (Drow, High Elf, or Wood Elf). You gain spells based on your choice at levels 1, 3, and 5.",
      },
      {
        name: "Fey Ancestry",
        description:
          "You have Advantage on saving throws you make to avoid or end the Charmed condition on yourself.",
      },
      {
        name: "Keen Senses",
        description: "You have proficiency in the Perception, Insight, or Survival skill.",
      },
      {
        name: "Trance",
        description:
          "You don't need to sleep, and magic can't put you to sleep. You can finish a Long Rest in 4 hours if you spend those hours in a trancelike meditation.",
      },
    ],
  },
  {
    id: "gnome",
    name: "Gnome",
    description:
      "A gnome’s energy and enthusiasm for living shines through every inch of their tiny body.",
    speed: 30,
    abilityBonuses: [],
    features: [
      {
        name: "Darkvision",
        description: "You can see in dim light within 60 feet of you as if it were bright light.",
      },
      {
        name: "Gnome Cunning",
        description: "You have Advantage on Intelligence, Wisdom, and Charisma saving throws.",
      },
      {
        name: "Gnomish Lineage",
        description:
          "Choose a lineage (Forest Gnome or Rock Gnome). You gain spells based on your choice at levels 1, 3, and 5.",
      },
    ],
  },
  {
    id: "halfling",
    name: "Halfling",
    description:
      "The diminutive halflings survive in a world full of larger creatures by avoiding notice.",
    speed: 30,
    abilityBonuses: [],
    features: [
      {
        name: "Brave",
        description:
          "You have Advantage on saving throws you make to avoid or end the Frightened condition on yourself.",
      },
      {
        name: "Halfling Nimbleness",
        description:
          "You can move through the space of any creature that is of a size larger than yours.",
      },
      {
        name: "Luck",
        description:
          "When you roll a 1 on the d20 for an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll.",
      },
      {
        name: "Naturally Stealthy",
        description:
          "You can attempt to Hide even when you are obscured only by a creature that is at least one size larger than you.",
      },
    ],
  },
  {
    id: "human",
    name: "Human",
    description: "Humans are the most adaptable and ambitious people among the common races.",
    speed: 30,
    abilityBonuses: [],
    features: [
      {
        name: "Resourceful",
        description: "You gain Heroic Inspiration whenever you finish a Long Rest.",
      },
      { name: "Skillful", description: "You gain proficiency in one skill of your choice." },
      { name: "Versatile", description: "You gain one Origin feat of your choice." },
    ],
  },
  {
    id: "orc",
    name: "Orc",
    description:
      "Orcs trace their ancestry to the god Gruumsh. They are hardy, fierce, and capable of shrugging off fatal blows.",
    speed: 30,
    abilityBonuses: [],
    features: [
      {
        name: "Adrenaline Rush",
        description:
          "You can take the Dash action as a Bonus Action. When you do so, you gain Temporary Hit Points equal to your level.",
      },
      {
        name: "Darkvision",
        description: "You can see in dim light within 120 feet of you as if it were bright light.",
      },
      {
        name: "Relentless Endurance",
        description:
          "When you are reduced to 0 Hit Points but not killed outright, you can drop to 1 Hit Point instead.",
      },
    ],
  },
  {
    id: "tiefling",
    name: "Tiefling",
    description:
      "Tieflings are derived from human bloodlines with an infernal, abyssal, or chthonic taint.",
    speed: 30,
    abilityBonuses: [],
    features: [
      {
        name: "Darkvision",
        description: "You can see in dim light within 60 feet of you as if it were bright light.",
      },
      {
        name: "Fiendish Legacy",
        description:
          "Choose a legacy (Abyssal, Chthonic, or Infernal). You gain damage resistance and spells based on your choice.",
      },
    ],
  },
  {
    id: "goliath",
    name: "Goliath",
    description:
      "Goliaths are massive beings with giant ancestry, standing head and shoulders above most other humanoids.",
    speed: 30,
    abilityBonuses: [],
    features: [
      {
        name: "Giant Ancestry",
        description:
          "Choose one type of giant as an ancestor. You gain a special trait associated with that giant.",
      },
      {
        name: "Large Form",
        description: "(Level 5) You can change your size to Large as a Bonus Action.",
      },
      {
        name: "Powerful Build",
        description:
          "You have Advantage on saving throws to end the Grappled condition. You count as one size larger when determining your carrying capacity.",
      },
    ],
  },
  {
    id: "aasimar",
    name: "Aasimar",
    description:
      "Aasimar are born to serve as champions of the gods, bearing celestial power in their souls.",
    speed: 30,
    abilityBonuses: [],
    features: [
      {
        name: "Celestial Resistance",
        description: "You have Resistance to Necrotic and Radiant damage.",
      },
      {
        name: "Darkvision",
        description: "You can see in dim light within 60 feet of you as if it were bright light.",
      },
      {
        name: "Healing Hands",
        description:
          "As a Magic action, you can touch a creature and heal it for a number of d4s equal to your Proficiency Bonus.",
      },
      { name: "Light Bearer", description: "You know the Light cantrip." },
      {
        name: "Celestial Revelation",
        description:
          "(Level 3) You can transform as a Bonus Action to gain special powers based on your celestial nature.",
      },
    ],
  },
];
