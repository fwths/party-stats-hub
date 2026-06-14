import { SRDClass } from "./index";

export const classes: SRDClass[] = [
  {
    id: "barbarian",
    name: "Barbarian",
    className: "Barbarian",
    description:
      "Barbarians are mighty warriors who are powered by primal forces of the multiverse that manifest as a Rage. More than a mere emotion-and not limited to anger-this Rage is an incarnation of a predator's ferocity, a storm's fury, and a sea's turmoil.",
    primaryAbility: ["Strength"],
    hitPoints: {
      hitDice: 1,
      hitDiceType: "d12",
      hpAtFirstLevel: "12 + Constitution modifier",
      hpAtHigherLevels: "1d12 (or 7) + Constitution modifier per Barbarian level after 1st",
    },
    subclassTitle: "Barbarian Subclass",
    proficiencies: {
      savingThrows: ["Strength", "Constitution"],
      skills: {
        choose: 2,
        options: [
          "Animal Handling",
          "Athletics",
          "Intimidation",
          "Nature",
          "Perception",
          "Survival",
        ],
      },
      weapons: ["Simple weapons", "Martial weapons"],
      armor: ["Light armor", "Medium armor", "Shields"],
      tools: [],
    },
    startingEquipment: {
      defaultBundle: ["Greataxe", "4 Handaxes", "Explorer's Pack", "15 GP"],
      goldAlternative: "75 GP",
    },
    weaponMastery: {
      levelGained: 1,
      weaponsKnownCount: {
        "1": 2,
        "4": 3,
        "10": 4,
      },
    },
    epicBoonRecommendation: "Boon of Irresistible Offense",
    multiclassing: {
      requirements: [
        {
          ability: "Strength",
          minScore: 13,
        },
      ],
      proficienciesGained: {
        weapons: ["Martial weapons"],
        armor: ["Shields"],
      },
    },
    featuresByLevel: {
      "1": [
        {
          id: "barbarian-rage",
          name: "Rage",
          description:
            "You can imbue yourself with a primal power called Rage, a force that grants you extraordinary might and resilience. You can enter it as a Bonus Action if you aren't wearing Heavy armor.\nYou can enter your Rage the number of times shown for your Barbarian level in the Rages column of the Barbarian Features table. You regain one expended use when you finish a Short Rest, and you regain all expended uses when you finish a Long Rest.\nWhile active, your Rage follows the rules below.\nDamage Resistance. You have Resistance to Bludgeoning, Piercing, and Slashing damage.\nRage Damage. When you make an attack using Strength-with either a weapon or an Unarmed Strike-and deal damage to the target, you gain a bonus to the damage that increases as you gain levels as a Barbarian, as shown in the Rage Damage column of the Barbarian Features table.\nStrength Advantage. You have Advantage on Strength checks and Strength saving throws.\nNo Concentration or Spells. You can't maintain Concentration, and you can't cast spells.\nDuration. The Rage lasts until the end of your next turn, and it ends early if you don Heavy armor or have the Incapacitated condition. If your Rage is still active on your next turn, you can extend the Rage for another round by doing one of the following:\n- Make an attack roll against an enemy.\n- Force an enemy to make a saving throw.\n- Take a Bonus Action to extend your Rage.\nEach time the Rage is extended, it lasts until the end of your next turn. You can maintain a Rage for up to 10 minutes.",
          levelRequired: 1,
          actionType: "Bonus Action",
          recovery: "Short or Long Rest",
          duration: "Up to 10 minutes",
          uses: "2 at level 1, 3 at level 3, 4 at level 6, 5 at level 12, 6 at level 17, Unlimited at level 20",
        },
        {
          id: "barbarian-unarmored-defense",
          name: "Unarmored Defense",
          description:
            "While you aren't wearing any armor, your base Armor Class equals 10 plus your Dexterity and Constitution modifiers. You can use a Shield and still gain this benefit.",
          levelRequired: 1,
        },
        {
          id: "barbarian-weapon-mastery",
          name: "Weapon Mastery",
          description:
            "Your training with weapons allows you to use the mastery properties of two kinds of Simple or Martial Melee weapons of your choice, such as Greataxes and Handaxes. Whenever you finish a Long Rest, you can practice weapon drills and change one of those weapon choices.\nWhen you reach certain Barbarian levels, you gain the ability to use the mastery properties of more kinds of weapons, as shown in the Weapon Mastery column of the Barbarian Features table.",
          levelRequired: 1,
          recovery: "Long Rest",
        },
      ],
      "2": [
        {
          id: "barbarian-danger-sense",
          name: "Danger Sense",
          description:
            "You gain an uncanny sense of when things aren't as they should be, giving you an edge when you dodge perils. You have Advantage on Dexterity saving throws unless you have the Incapacitated condition.",
          levelRequired: 2,
        },
        {
          id: "barbarian-reckless-attack",
          name: "Reckless Attack",
          description:
            "You can throw aside all concern for defense to attack with increased ferocity. When you make your first attack roll on your turn, you can decide to attack recklessly. Doing so gives you Advantage on attack rolls using Strength until the start of your next turn, but attack rolls against you have Advantage during that time.",
          levelRequired: 2,
          actionType: "Special",
        },
      ],
      "3": [
        {
          id: "barbarian-subclass",
          name: "Barbarian Subclass",
          description:
            "You gain a Barbarian subclass of your choice. A subclass is a specialization that grants you features at certain Barbarian levels. For the rest of your career, you gain each of your subclass's features that are of your Barbarian level or lower.",
          levelRequired: 3,
        },
        {
          id: "barbarian-primal-knowledge",
          name: "Primal Knowledge",
          description:
            "You gain proficiency in another skill of your choice from the skill list available to Barbarians at level 1.\nIn addition, while your Rage is active, you can channel primal power when you attempt certain tasks; whenever you make an ability check using one of the following skills, you can make it as a Strength check even if it normally uses a different ability: Acrobatics, Intimidation, Perception, Stealth, or Survival. When you use this ability, your Strength represents primal power coursing through you, honing your agility, bearing, and senses.",
          levelRequired: 3,
        },
      ],
      "4": [
        {
          id: "barbarian-ability-score-improvement-4",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify. You gain this feature again at Barbarian levels 8, 12, and 16.",
          levelRequired: 4,
        },
      ],
      "5": [
        {
          id: "barbarian-extra-attack",
          name: "Extra Attack",
          description:
            "You can attack twice instead of once whenever you take the Attack action on your turn.",
          levelRequired: 5,
        },
        {
          id: "barbarian-fast-movement",
          name: "Fast Movement",
          description: "Your speed increases by 10 feet while you aren't wearing Heavy armor.",
          levelRequired: 5,
        },
      ],
      "6": [
        {
          id: "barbarian-subclass-feature-6",
          name: "Subclass Feature",
          description: "You gain a feature from your Barbarian subclass.",
          levelRequired: 6,
        },
      ],
      "7": [
        {
          id: "barbarian-feral-instinct",
          name: "Feral Instinct",
          description: "Your instincts are so honed that you have Advantage on Initiative rolls.",
          levelRequired: 7,
        },
        {
          id: "barbarian-instinctive-pounce",
          name: "Instinctive Pounce",
          description:
            "As part of the Bonus Action you take to enter your Rage, you can move up to half your Speed.",
          levelRequired: 7,
          actionType: "Special",
        },
      ],
      "8": [
        {
          id: "barbarian-ability-score-improvement-8",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
          levelRequired: 8,
        },
      ],
      "9": [
        {
          id: "barbarian-brutal-strike",
          name: "Brutal Strike",
          description:
            "If you use Reckless Attack, you can forgo any Advantage on one Strength-based attack roll of your choice on your turn. The chosen attack roll mustn't have Disadvantage. If the chosen attack roll hits, the target takes an extra 1d10 damage of the same type dealt by the weapon or Unarmed Strike, and you can cause one Brutal Strike effect of your choice.\nYou have the following effect options.\nForceful Blow. The target is pushed 15 feet straight away from you. You can then move up to half your Speed straight toward the target without provoking Opportunity Attacks.\nHamstring Blow. The target's Speed is reduced by 15 feet until the start of your next turn. A target can be affected by only one Hamstring Blow at a time-the most recent one.",
          levelRequired: 9,
        },
      ],
      "10": [
        {
          id: "barbarian-subclass-feature-10",
          name: "Subclass Feature",
          description: "You gain a feature from your Barbarian subclass.",
          levelRequired: 10,
        },
      ],
      "11": [
        {
          id: "barbarian-relentless-rage",
          name: "Relentless Rage",
          description:
            "Your Rage can keep you fighting despite grievous wounds. If you drop to 0 Hit Points while your Rage is active and don't die outright, you can make a DC 10 Constitution saving throw. If you succeed, your Hit Points instead change to a number equal to twice your Barbarian level.\nEach time you use this feature after the first, the DC increases by 5. When you finish a Short or Long Rest, the DC resets to 10.",
          levelRequired: 11,
          recovery: "Short or Long Rest",
        },
      ],
      "12": [
        {
          id: "barbarian-ability-score-improvement-12",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
          levelRequired: 12,
        },
      ],
      "13": [
        {
          id: "barbarian-improved-brutal-strike-13",
          name: "Improved Brutal Strike",
          description:
            "You have honed new ways to attack furiously. The following effects are now among your Brutal Strike options.\nStaggering Blow. The target has Disadvantage on the next saving throw it makes, and it can't make Opportunity Attacks until the start of your next turn.\nSundering Blow. Before the start of your next turn, the next attack roll made by another creature against the target gains a +5 bonus to the roll. An attack roll can gain only one Sundering Blow bonus.",
          levelRequired: 13,
        },
      ],
      "14": [
        {
          id: "barbarian-subclass-feature-14",
          name: "Subclass Feature",
          description: "You gain a feature from your Barbarian subclass.",
          levelRequired: 14,
        },
      ],
      "15": [
        {
          id: "barbarian-persistent-rage",
          name: "Persistent Rage",
          description:
            "When you roll Initiative, you can regain all expended uses of Rage. After you regain uses of Rage in this way, you can't do so again until you finish a Long Rest.\nIn addition, your Rage is so fierce that it now lasts for 10 minutes without you needing to do anything to extend it from round to round. Your Rage ends early if you have the Unconscious condition (not just the Incapacitated condition) or don Heavy armor.",
          levelRequired: 15,
          recovery: "Long Rest",
          actionType: "Special",
        },
      ],
      "16": [
        {
          id: "barbarian-ability-score-improvement-16",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
          levelRequired: 16,
        },
      ],
      "17": [
        {
          id: "barbarian-improved-brutal-strike-17",
          name: "Improved Brutal Strike",
          description:
            "The extra damage of your Brutal Strike increases to 2d10. In addition, you can use two different Brutal Strike effects whenever you use your Brutal Strike feature.",
          levelRequired: 17,
        },
      ],
      "18": [
        {
          id: "barbarian-indomitable-might",
          name: "Indomitable Might",
          description:
            "If your total for a Strength check or Strength saving throw is less than your Strength score, you can use that score in place of the total.",
          levelRequired: 18,
        },
      ],
      "19": [
        {
          id: "barbarian-epic-boon",
          name: "Epic Boon",
          description:
            "You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Irresistible Offense is recommended.",
          levelRequired: 19,
        },
      ],
      "20": [
        {
          id: "barbarian-primal-champion",
          name: "Primal Champion",
          description:
            "You embody primal power. Your Strength and Constitution scores increase by 4, to a maximum of 25.",
          levelRequired: 20,
        },
      ],
    },
    subclasses: [],
    source: "Player's Handbook (2024)",
  },
  {
    id: "bard",
    name: "Bard",
    className: "Bard",
    description:
      "Invoking magic through music, dance, and verse, Bards are expert at inspiring others, soothing hurts, disheartening foes, and creating illusions. Bards believe the multiverse was spoken into existence and that remnants of its Words of Creation still resound and glimmer on every plane of existence. Bardic magic attempts to harness those words, which transcend any language.",
    primaryAbility: ["Charisma"],
    hitPoints: {
      hitDice: 8,
      hitDiceType: "d8",
      hpAtFirstLevel: "8 + Constitution modifier",
      hpAtHigherLevels: "1d8 (or 5) + Constitution modifier",
    },
    subclassTitle: "Bard Subclass",
    proficiencies: {
      savingThrows: ["Dexterity", "Charisma"],
      skills: {
        choose: 3,
        options: [
          "Acrobatics",
          "Animal Handling",
          "Arcana",
          "Athletics",
          "Deception",
          "History",
          "Insight",
          "Intimidation",
          "Investigation",
          "Medicine",
          "Nature",
          "Perception",
          "Performance",
          "Persuasion",
          "Religion",
          "Sleight of Hand",
          "Stealth",
          "Survival",
        ],
      },
      weapons: ["Simple weapons"],
      armor: ["Light armor"],
      tools: [],
      toolChoice: {
        choose: 3,
        options: ["Musical Instrument"],
      },
    },
    startingEquipment: {
      defaultBundle: [
        "Leather Armor",
        "2 Daggers",
        "Musical Instrument of your choice",
        "Entertainer's Pack",
        "19 GP",
      ],
      goldAlternative: "90 GP",
    },
    spellcasting: {
      ability: "Charisma",
      casterType: "Full",
      preparationType: "Prepared",
      spellcastingFocus: ["Musical Instrument"],
      slotsByLevel: {
        "1": [2],
        "2": [3],
        "3": [4, 2],
        "4": [4, 3],
        "5": [4, 3, 2],
        "6": [4, 3, 3],
        "7": [4, 3, 3, 1],
        "8": [4, 3, 3, 2],
        "9": [4, 3, 3, 3, 1],
        "10": [4, 3, 3, 3, 2],
        "11": [4, 3, 3, 3, 2, 1],
        "12": [4, 3, 3, 3, 2, 1],
        "13": [4, 3, 3, 3, 2, 1, 1],
        "14": [4, 3, 3, 3, 2, 1, 1],
        "15": [4, 3, 3, 3, 2, 1, 1, 1],
        "16": [4, 3, 3, 3, 2, 1, 1, 1],
        "17": [4, 3, 3, 3, 2, 1, 1, 1, 1],
        "18": [4, 3, 3, 3, 3, 1, 1, 1, 1],
        "19": [4, 3, 3, 3, 3, 2, 1, 1, 1],
        "20": [4, 3, 3, 3, 3, 2, 2, 1, 1],
      },
      cantripsKnownByLevel: {
        "1": 2,
        "2": 2,
        "3": 2,
        "4": 3,
        "5": 3,
        "6": 3,
        "7": 3,
        "8": 3,
        "9": 3,
        "10": 4,
        "11": 4,
        "12": 4,
        "13": 4,
        "14": 4,
        "15": 4,
        "16": 4,
        "17": 4,
        "18": 4,
        "19": 4,
        "20": 4,
      },
      spellsPreparedByLevel: {
        "1": 4,
        "2": 5,
        "3": 6,
        "4": 7,
        "5": 9,
        "6": 10,
        "7": 11,
        "8": 12,
        "9": 14,
        "10": 15,
        "11": 16,
        "12": 16,
        "13": 17,
        "14": 17,
        "15": 18,
        "16": 18,
        "17": 19,
        "18": 20,
        "19": 21,
        "20": 22,
      },
    },
    epicBoonRecommendation: "Boon of Spell Recall",
    multiclassing: {
      requirements: [
        {
          ability: "Charisma",
          minScore: 13,
        },
      ],
      proficienciesGained: {
        armor: ["Light armor"],
        skills: {
          choose: 1,
          options: [
            "Acrobatics",
            "Animal Handling",
            "Arcana",
            "Athletics",
            "Deception",
            "History",
            "Insight",
            "Intimidation",
            "Investigation",
            "Medicine",
            "Nature",
            "Perception",
            "Performance",
            "Persuasion",
            "Religion",
            "Sleight of Hand",
            "Stealth",
            "Survival",
          ],
        },
        tools: ["1 Musical Instrument"],
      },
    },
    featuresByLevel: {
      "1": [
        {
          id: "bard-1-bardic-inspiration",
          name: "Bardic Inspiration",
          description:
            "You can supernaturally inspire others through words, music, or dance. This inspiration is represented by your Bardic Inspiration die, which is a d6.\n\nUsing Bardic Inspiration. As a Bonus Action, you can inspire another creature within 60 feet of yourself who can see or hear you. That creature gains one of your Bardic Inspiration dice. A creature can have only one Bardic Inspiration die at a time.\n\nOnce within the next hour when the creature fails a D20 Test, the creature can roll the Bardic Inspiration die and add the number rolled to the d20, potentially turning the failure into a success. A Bardic Inspiration die is expended when it's rolled.\n\nNumber of Uses. You can confer a Bardic Inspiration die a number of times equal to your Charisma modifier (minimum of once), and you regain all expended uses when you finish a Long Rest.\n\nAt Higher Levels. Your Bardic Inspiration die changes when you reach certain Bard levels, as shown in the Bardic Die column of the Bard Features table. The die becomes a d8 at level 5, a d10 at level 10, and a d12 at level 15.",
          levelRequired: 1,
          actionType: "Bonus Action",
          duration: "1 hour",
          uses: "Charisma modifier (minimum of once)",
          recovery: "Long Rest",
        },
        {
          id: "bard-1-spellcasting",
          name: "Spellcasting",
          description:
            "You have learned to cast spells through your bardic arts.\n\nCantrips. You know two cantrips of your choice from the Bard spell list. Dancing Lights and Vicious Mockery are recommended. Whenever you gain a Bard level, you can replace one of your cantrips with another cantrip of your choice from the Bard spell list. When you reach Bard levels 4 and 10, you learn another cantrip of your choice from the Bard spell list.\n\nSpell Slots. The Bard Features table shows how many spell slots you have to cast your level 1+ spells. You regain all expended slots when you finish a Long Rest.\n\nPrepared Spells of Level 1+. You prepare the list of level 1+ spells that are available for you to cast with this feature. To start, choose four level 1 spells from the Bard spell list. Charm Person, Color Spray, Dissonant Whispers, and Healing Word are recommended. The number of spells on your list increases as you gain Bard levels. Whenever that number increases, choose additional spells from the Bard spell list until the number of spells on your list matches the number on the table. The chosen spells must be of a level for which you have spell slots.\n\nIf another Bard feature gives you spells that you always have prepared, those spells don't count against the number of spells you can prepare with this feature, but those spells otherwise count as Bard spells for you.\n\nChanging Your Prepared Spells. Whenever you gain a Bard level, you can replace one spell on your list with another Bard spell for which you have spell slots.\n\nSpellcasting Ability. Charisma is your spellcasting ability for your Bard spells.\n\nSpellcasting Focus. You can use a Musical Instrument as a Spellcasting Focus for your Bard spells.",
          levelRequired: 1,
        },
      ],
      "2": [
        {
          id: "bard-2-expertise",
          name: "Expertise",
          description:
            "You gain Expertise (see the rules glossary) in two of your skill proficiencies of your choice. Performance and Persuasion are recommended if you have proficiency in them.\n\nAt Bard level 9, you gain Expertise in two more of your skill proficiencies of your choice.",
          levelRequired: 2,
        },
        {
          id: "bard-2-jack-of-all-trades",
          name: "Jack of All Trades",
          description:
            "You can add half your Proficiency Bonus (round down) to any ability check you make that uses a skill proficiency you lack and that doesn't otherwise use your Proficiency Bonus.",
          levelRequired: 2,
        },
      ],
      "3": [
        {
          id: "bard-3-bard-subclass",
          name: "Bard Subclass",
          description:
            "You gain a Bard subclass of your choice. A subclass is a specialization that grants you features at certain Bard levels. For the rest of your career, you gain each of your subclass's features that are of your Bard level or lower.",
          levelRequired: 3,
        },
      ],
      "4": [
        {
          id: "bard-4-ability-score-improvement",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat (see chapter 5) or another feat of your choice for which you qualify. You gain this feature again at Bard levels 8, 12, and 16.",
          levelRequired: 4,
        },
      ],
      "5": [
        {
          id: "bard-5-font-of-inspiration",
          name: "Font of Inspiration",
          description:
            "You now regain all your expended uses of Bardic Inspiration when you finish a Short or Long Rest.\n\nIn addition, you can expend a spell slot (no action required) to regain one expended use of Bardic Inspiration.",
          levelRequired: 5,
          recovery: "Short or Long Rest",
        },
      ],
      "6": [
        {
          id: "bard-6-subclass-feature",
          name: "Subclass Feature",
          description: "You gain a feature from your Bard subclass.",
          levelRequired: 6,
        },
      ],
      "7": [
        {
          id: "bard-7-countercharm",
          name: "Countercharm",
          description:
            "You can use musical notes or words of power to disrupt mind-influencing effects. If you or a creature within 30 feet of you fails a saving throw against an effect that applies the Charmed or Frightened condition, you can take a Reaction to cause the save to be rerolled, and the new roll has Advantage.",
          levelRequired: 7,
          actionType: "Reaction",
        },
      ],
      "8": [
        {
          id: "bard-8-ability-score-improvement",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat (see chapter 5) or another feat of your choice for which you qualify.",
          levelRequired: 8,
        },
      ],
      "9": [
        {
          id: "bard-9-expertise",
          name: "Expertise",
          description: "You gain Expertise in two more of your skill proficiencies of your choice.",
          levelRequired: 9,
        },
      ],
      "10": [
        {
          id: "bard-10-magical-secrets",
          name: "Magical Secrets",
          description:
            "You've learned secrets from various magical traditions. Whenever you reach a Bard level (including this level) and the Prepared Spells number in the Bard Features table increases, you can choose any of your new prepared spells from the Bard, Cleric, Druid, and Wizard spell lists, and the chosen spells count as Bard spells for you (see a class's section for its spell list). In addition, whenever you replace a spell prepared for this class, you can replace it with a spell from those lists.",
          levelRequired: 10,
        },
      ],
      "11": [],
      "12": [
        {
          id: "bard-12-ability-score-improvement",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat (see chapter 5) or another feat of your choice for which you qualify.",
          levelRequired: 12,
        },
      ],
      "13": [],
      "14": [
        {
          id: "bard-14-subclass-feature",
          name: "Subclass Feature",
          description: "You gain a feature from your Bard subclass.",
          levelRequired: 14,
        },
      ],
      "15": [],
      "16": [
        {
          id: "bard-16-ability-score-improvement",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat (see chapter 5) or another feat of your choice for which you qualify.",
          levelRequired: 16,
        },
      ],
      "17": [],
      "18": [
        {
          id: "bard-18-superior-inspiration",
          name: "Superior Inspiration",
          description:
            "When you roll Initiative, you regain expended uses of Bardic Inspiration until you have two if you have fewer than that.",
          levelRequired: 18,
          recovery: "Initiative Roll",
        },
      ],
      "19": [
        {
          id: "bard-19-epic-boon",
          name: "Epic Boon",
          description:
            "You gain an Epic Boon feat (see chapter 5) or another feat of your choice for which you qualify. Boon of Spell Recall is recommended.",
          levelRequired: 19,
        },
      ],
      "20": [
        {
          id: "bard-20-words-of-creation",
          name: "Words of Creation",
          description:
            "You have mastered two of the Words of Creation: the words of life and death. You therefore always have the Power Word Heal and Power Word Kill spells prepared. When you cast either spell, you can target a second creature with it if that creature is within 10 feet of the first target.",
          levelRequired: 20,
        },
      ],
    },
    subclasses: [],
    source: "Player's Handbook (2024)",
  },
  {
    id: "cleric",
    name: "Cleric",
    className: "Cleric",
    description: "Clerics draw power from the realms of the gods and harness it to work miracles.",
    primaryAbility: ["Wisdom"],
    hitPoints: {
      hitDice: 8,
      hitDiceType: "d8",
      hpAtFirstLevel: "8 + Constitution modifier",
      hpAtHigherLevels: "1d8 (or 5) + Constitution modifier",
    },
    subclassTitle: "Cleric Subclass",
    proficiencies: {
      savingThrows: ["Wisdom", "Charisma"],
      skills: {
        choose: 2,
        options: ["History", "Insight", "Medicine", "Persuasion", "Religion"],
      },
      weapons: ["Simple weapons"],
      armor: ["Light armor", "Medium armor", "Shields"],
      tools: [],
    },
    startingEquipment: {
      defaultBundle: ["Chain Shirt", "Shield", "Mace", "Holy Symbol", "Priest's Pack", "7 GP"],
      goldAlternative: "110 GP",
    },
    spellcasting: {
      ability: "Wisdom",
      casterType: "Full",
      preparationType: "Prepared",
      spellcastingFocus: ["Holy Symbol"],
      slotsByLevel: {
        "1": [2, 0, 0, 0, 0, 0, 0, 0, 0],
        "2": [3, 0, 0, 0, 0, 0, 0, 0, 0],
        "3": [4, 2, 0, 0, 0, 0, 0, 0, 0],
        "4": [4, 3, 0, 0, 0, 0, 0, 0, 0],
        "5": [4, 3, 2, 0, 0, 0, 0, 0, 0],
        "6": [4, 3, 3, 0, 0, 0, 0, 0, 0],
        "7": [4, 3, 3, 1, 0, 0, 0, 0, 0],
        "8": [4, 3, 3, 2, 0, 0, 0, 0, 0],
        "9": [4, 3, 3, 3, 1, 0, 0, 0, 0],
        "10": [4, 3, 3, 3, 2, 0, 0, 0, 0],
        "11": [4, 3, 3, 3, 2, 1, 0, 0, 0],
        "12": [4, 3, 3, 3, 2, 1, 0, 0, 0],
        "13": [4, 3, 3, 3, 2, 1, 1, 0, 0],
        "14": [4, 3, 3, 3, 2, 1, 1, 0, 0],
        "15": [4, 3, 3, 3, 2, 1, 1, 1, 0],
        "16": [4, 3, 3, 3, 2, 1, 1, 1, 0],
        "17": [4, 3, 3, 3, 2, 1, 1, 1, 1],
        "18": [4, 3, 3, 3, 3, 1, 1, 1, 1],
        "19": [4, 3, 3, 3, 3, 2, 1, 1, 1],
        "20": [4, 3, 3, 3, 3, 2, 2, 1, 1],
      },
      cantripsKnownByLevel: {
        "1": 3,
        "2": 3,
        "3": 3,
        "4": 4,
        "5": 4,
        "6": 4,
        "7": 4,
        "8": 4,
        "9": 4,
        "10": 5,
        "11": 5,
        "12": 5,
        "13": 5,
        "14": 5,
        "15": 5,
        "16": 5,
        "17": 5,
        "18": 5,
        "19": 5,
        "20": 5,
      },
      spellsPreparedByLevel: {
        "1": 4,
        "2": 5,
        "3": 6,
        "4": 7,
        "5": 9,
        "6": 10,
        "7": 11,
        "8": 12,
        "9": 14,
        "10": 15,
        "11": 16,
        "12": 16,
        "13": 17,
        "14": 17,
        "15": 18,
        "16": 18,
        "17": 19,
        "18": 20,
        "19": 21,
        "20": 22,
      },
    },
    epicBoonRecommendation: "Boon of Fate",
    multiclassing: {
      requirements: [
        {
          ability: "Wisdom",
          minScore: 13,
        },
      ],
      proficienciesGained: {
        armor: ["Light armor", "Medium armor", "Shields"],
      },
    },
    featuresByLevel: {
      "1": [
        {
          id: "spellcasting",
          name: "Spellcasting",
          description:
            "You have learned to cast spells through prayer and meditation. Wisdom is your spellcasting ability. You can use a Holy Symbol as a Spellcasting Focus.",
          levelRequired: 1,
        },
        {
          id: "divine-order",
          name: "Divine Order",
          description:
            "You have dedicated yourself to one of the following sacred roles of your choice: Protector or Thaumaturge.",
          levelRequired: 1,
          options: [
            {
              id: "divine-order-options",
              name: "Divine Order Options",
              description: "Choose either Protector or Thaumaturge.",
              choices: [
                {
                  id: "protector",
                  name: "Protector",
                  description:
                    "Trained for battle, you gain proficiency with Martial weapons and training with Heavy armor.",
                },
                {
                  id: "thaumaturge",
                  name: "Thaumaturge",
                  description:
                    "You know one extra cantrip from the Cleric spell list. In addition, your mystical connection to the divine gives you a bonus to your Intelligence (Arcana or Religion) checks. The bonus equals your Wisdom modifier (minimum of +1).",
                },
              ],
            },
          ],
        },
      ],
      "2": [
        {
          id: "channel-divinity",
          name: "Channel Divinity",
          description:
            "You can channel divine energy directly from the Outer Planes to fuel magical effects. You start with two such effects: Divine Spark and Turn Undead. You can use this class's Channel Divinity twice. You regain one expended use when you finish a Short Rest, and all expended uses when you finish a Long Rest.",
          levelRequired: 2,
          recovery: "Short or Long Rest",
          uses: "2 at 2nd level, increasing to 3 at 6th level, and 4 at 18th level.",
        },
        {
          id: "divine-spark",
          name: "Channel Divinity: Divine Spark",
          description:
            "As a Magic action, you point your Holy Symbol at another creature you can see within 30 feet of yourself and focus divine energy at it. Roll 1d8 and add your Wisdom modifier. You either restore Hit Points to the creature equal to that total or force the creature to make a Constitution saving throw. On a failed save, the creature takes Necrotic or Radiant damage (your choice) equal to that total. On a successful save, the creature takes half as much damage.",
          levelRequired: 2,
          actionType: "Action",
          savingThrow: "Constitution",
          damageType: "Necrotic or Radiant",
        },
        {
          id: "turn-undead",
          name: "Channel Divinity: Turn Undead",
          description:
            "As a Magic action, you present your Holy Symbol and censure Undead creatures. Each Undead of your choice within 30 feet of you must make a Wisdom saving throw. If the creature fails its save, it has the Frightened and Incapacitated conditions for 1 minute. For that duration, it tries to move as far from you as it can on its turns.",
          levelRequired: 2,
          actionType: "Action",
          savingThrow: "Wisdom",
          duration: "1 minute",
        },
      ],
      "3": [
        {
          id: "cleric-subclass",
          name: "Cleric Subclass",
          description: "You gain a Cleric subclass of your choice.",
          levelRequired: 3,
        },
      ],
      "4": [
        {
          id: "ability-score-improvement-4",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
          levelRequired: 4,
        },
      ],
      "5": [
        {
          id: "sear-undead",
          name: "Sear Undead",
          description:
            "Whenever you use Turn Undead, you can roll a number of d8s equal to your Wisdom modifier (minimum of 1d8) and add the rolls together. Each Undead that fails its saving throw against that use of Turn Undead takes Radiant damage equal to the roll's total. This damage doesn't end the turn effect.",
          levelRequired: 5,
          damageType: "Radiant",
        },
      ],
      "6": [
        {
          id: "subclass-feature-6",
          name: "Subclass Feature",
          description: "You gain a feature from your Cleric subclass.",
          levelRequired: 6,
        },
      ],
      "7": [
        {
          id: "blessed-strikes",
          name: "Blessed Strikes",
          description:
            "Divine power infuses you in battle. You gain one of the following options of your choice: Divine Strike or Potent Spellcasting.",
          levelRequired: 7,
          options: [
            {
              id: "blessed-strikes-options",
              name: "Blessed Strikes Options",
              description: "Choose Divine Strike or Potent Spellcasting.",
              choices: [
                {
                  id: "divine-strike",
                  name: "Divine Strike",
                  description:
                    "Once on each of your turns when you hit a creature with an attack roll using a weapon, you can cause the target to take an extra 1d8 Necrotic or Radiant damage (your choice).",
                },
                {
                  id: "potent-spellcasting",
                  name: "Potent Spellcasting",
                  description:
                    "Add your Wisdom modifier to the damage you deal with any Cleric cantrip.",
                },
              ],
            },
          ],
        },
      ],
      "8": [
        {
          id: "ability-score-improvement-8",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
          levelRequired: 8,
        },
      ],
      "9": [],
      "10": [
        {
          id: "divine-intervention",
          name: "Divine Intervention",
          description:
            "You can call on your deity or pantheon to intervene on your behalf. As a Magic action, choose any Cleric spell of level 5 or lower that doesn't require a Reaction to cast. As part of the same action, you cast that spell without expending a spell slot or needing Material components. You can't use this feature again until you finish a Long Rest.",
          levelRequired: 10,
          actionType: "Action",
          recovery: "Long Rest",
          uses: "1/Long Rest",
        },
      ],
      "11": [],
      "12": [
        {
          id: "ability-score-improvement-12",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
          levelRequired: 12,
        },
      ],
      "13": [],
      "14": [
        {
          id: "improved-blessed-strikes",
          name: "Improved Blessed Strikes",
          description:
            "The option you chose for Blessed Strikes grows more powerful. Divine Strike extra damage increases to 2d8. For Potent Spellcasting, when you cast a Cleric cantrip and deal damage to a creature with it, you can give vitality to yourself or another creature within 60 feet, granting Temporary Hit Points equal to twice your Wisdom modifier.",
          levelRequired: 14,
        },
      ],
      "15": [],
      "16": [
        {
          id: "ability-score-improvement-16",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
          levelRequired: 16,
        },
      ],
      "17": [
        {
          id: "subclass-feature-17",
          name: "Subclass Feature",
          description: "You gain a feature from your Cleric subclass.",
          levelRequired: 17,
        },
      ],
      "18": [],
      "19": [
        {
          id: "epic-boon",
          name: "Epic Boon",
          description:
            "You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Fate is recommended.",
          levelRequired: 19,
        },
      ],
      "20": [
        {
          id: "greater-divine-intervention",
          name: "Greater Divine Intervention",
          description:
            "You can call on even more powerful divine intervention. When you use your Divine Intervention feature, you can choose Wish when you select a spell. If you do so, you can't use Divine Intervention again until you finish 2d4 Long Rests.",
          levelRequired: 20,
          recovery: "Long Rest",
          uses: "Once per 2d4 Long Rests when used for Wish",
        },
      ],
    },
    subclasses: [],
    source: "Player's Handbook (2024)",
  },
  {
    id: "druid",
    name: "Druid",
    className: "Druid",
    description:
      "Druids belong to ancient orders that call on the forces of nature. Harnessing the magic of animals, plants, and the four elements, Druids heal, transform into animals, and wield elemental destruction.",
    primaryAbility: ["Wisdom"],
    hitPoints: {
      hitDice: 8,
      hitDiceType: "d8",
      hpAtFirstLevel: "8 + Constitution modifier",
      hpAtHigherLevels: "1d8 (or 5) + Constitution modifier",
    },
    subclassTitle: "Druid Subclass",
    proficiencies: {
      savingThrows: ["Intelligence", "Wisdom"],
      skills: {
        choose: 2,
        options: [
          "Arcana",
          "Animal Handling",
          "Insight",
          "Medicine",
          "Nature",
          "Perception",
          "Religion",
          "Survival",
        ],
      },
      weapons: ["Simple weapons"],
      armor: ["Light armor", "Shields"],
      tools: ["Herbalism Kit"],
    },
    startingEquipment: {
      defaultBundle: [
        "Leather Armor",
        "Shield",
        "Sickle",
        "Druidic Focus (Quarterstaff)",
        "Explorer's Pack",
        "Herbalism Kit",
        "9 GP",
      ],
      goldAlternative: "50 GP",
    },
    multiclassing: {
      requirements: [
        {
          ability: "Wisdom",
          minScore: 13,
        },
      ],
      proficienciesGained: {
        armor: ["Light armor", "Shields"],
      },
    },
    spellcasting: {
      ability: "Wisdom",
      casterType: "Full",
      preparationType: "Prepared",
      spellcastingFocus: ["Druidic Focus"],
      ritualCasting: true,
      slotsByLevel: {
        "1": [2],
        "2": [3],
        "3": [4, 2],
        "4": [4, 3],
        "5": [4, 3, 2],
        "6": [4, 3, 3],
        "7": [4, 3, 3, 1],
        "8": [4, 3, 3, 2],
        "9": [4, 3, 3, 3, 1],
        "10": [4, 3, 3, 3, 2],
        "11": [4, 3, 3, 3, 2, 1],
        "12": [4, 3, 3, 3, 2, 1],
        "13": [4, 3, 3, 3, 2, 1, 1],
        "14": [4, 3, 3, 3, 2, 1, 1],
        "15": [4, 3, 3, 3, 2, 1, 1, 1],
        "16": [4, 3, 3, 3, 2, 1, 1, 1],
        "17": [4, 3, 3, 3, 2, 1, 1, 1, 1],
        "18": [4, 3, 3, 3, 3, 1, 1, 1, 1],
        "19": [4, 3, 3, 3, 3, 2, 1, 1, 1],
        "20": [4, 3, 3, 3, 3, 2, 2, 1, 1],
      },
      cantripsKnownByLevel: {
        "1": 2,
        "2": 2,
        "3": 2,
        "4": 3,
        "5": 3,
        "6": 3,
        "7": 3,
        "8": 3,
        "9": 3,
        "10": 4,
        "11": 4,
        "12": 4,
        "13": 4,
        "14": 4,
        "15": 4,
        "16": 4,
        "17": 4,
        "18": 4,
        "19": 4,
        "20": 4,
      },
      spellsPreparedByLevel: {
        "1": 4,
        "2": 5,
        "3": 6,
        "4": 7,
        "5": 9,
        "6": 10,
        "7": 11,
        "8": 12,
        "9": 14,
        "10": 15,
        "11": 16,
        "12": 16,
        "13": 17,
        "14": 17,
        "15": 18,
        "16": 18,
        "17": 19,
        "18": 20,
        "19": 21,
        "20": 22,
      },
    },
    epicBoonRecommendation: "Boon of Dimensional Travel",
    quickBuild: {
      primaryAbility: "Wisdom",
      secondaryAbility: "Constitution",
      background: "",
      species: "",
    },
    featuresByLevel: {
      "1": [
        {
          id: "druid-spellcasting",
          name: "Spellcasting",
          description:
            "You have learned to cast spells through studying the mystical forces of nature.",
        },
        {
          id: "druidic",
          name: "Druidic",
          description:
            "You know Druidic, the secret language of Druids. While learning this ancient tongue, you also unlocked the magic of communicating with animals; you always have the Speak with Animals spell prepared.\nYou can use Druidic to leave hidden messages. You and others who know Druidic automatically spot such a message. Others spot the message's presence with a successful DC 15 Intelligence (Investigation) check but can't decipher it without magic.",
        },
        {
          id: "primal-order",
          name: "Primal Order",
          description:
            "You have dedicated yourself to one of the following sacred roles of your choice.",
          options: [
            {
              id: "primal-order-options",
              name: "Primal Order Options",
              description: "Choose one of the following sacred roles.",
              choices: [
                {
                  id: "magician",
                  name: "Magician",
                  description:
                    "You know one extra cantrip from the Druid spell list. In addition, your mystical connection to nature gives you a bonus to your Intelligence (Arcana or Nature) checks. The bonus equals your Wisdom modifier (minimum bonus of +1).",
                },
                {
                  id: "warden",
                  name: "Warden",
                  description:
                    "Trained for battle, you gain proficiency with Martial weapons and training with Medium armor.",
                },
              ],
            },
          ],
        },
      ],
      "2": [
        {
          id: "wild-shape",
          name: "Wild Shape",
          description:
            "The power of nature allows you to assume the form of an animal. As a Bonus Action, you shape-shift into a Beast form that you have learned for this feature... You stay in that form for a number of hours equal to half your Druid level or until you use Wild Shape again, have the Incapacitated condition, or die. You can also leave the form early as a Bonus Action.\nNumber of Uses. You can use Wild Shape twice. You regain one expended use when you finish a Short Rest, and you regain all expended uses when you finish a Long Rest.\nKnown Forms. You know four Beast forms for this feature, chosen from among Beast stat blocks that have a maximum Challenge Rating of 1/4 and that lack a Fly Speed. Whenever you finish a Long Rest, you can replace one of your known forms with another eligible form.\nRules While Shape-Shifted. While in a form, you retain your personality, memories, and ability to speak... Game Statistics. Your game statistics are replaced by the Beast's stat block, but you retain your creature type; Hit Points; Hit Point Dice; Intelligence, Wisdom, and Charisma scores; class features; languages; and feats... No Spellcasting. You can't cast spells... Objects. Your ability to handle objects is determined by the form's limbs...",
          actionType: "Bonus Action",
          recovery: "Short or Long Rest",
          duration: "Half your Druid level hours",
          uses: "2 (increases to 3 at 6th level and 4 at 17th level)",
          table: {
            headers: ["Druid Level", "Known Forms", "Max CR", "Fly Speed"],
            rows: [
              ["2", "4", "1/4", "No"],
              ["4", "6", "1/2", "No"],
              ["8", "8", "1", "Yes"],
            ],
          },
        },
        {
          id: "wild-companion",
          name: "Wild Companion",
          description:
            "You can summon a nature spirit that assumes an animal form to aid you. As a Magic action, you can expend a spell slot or a use of Wild Shape to cast the Find Familiar spell without Material components. When you cast the spell in this way, the familiar is Fey and disappears when you finish a Long Rest.",
          actionType: "Action",
        },
      ],
      "3": [
        {
          id: "druid-subclass",
          name: "Druid Subclass",
          description:
            "You gain a Druid subclass of your choice... A subclass is a specialization that grants you features at certain Druid levels. For the rest of your career, you gain each of your subclass's features that are of your Druid level or lower.",
        },
      ],
      "4": [
        {
          id: "druid-asi-4",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
        },
      ],
      "5": [
        {
          id: "wild-resurgence",
          name: "Wild Resurgence",
          description:
            "Once on each of your turns, if you have no uses of Wild Shape left, you can give yourself one use by expending a spell slot (no action required).\nIn addition, you can expend one use of Wild Shape (no action required) to give yourself a level 1 spell slot, but you can't do so again until you finish a Long Rest.",
        },
      ],
      "6": [
        {
          id: "druid-subclass-feature-6",
          name: "Subclass Feature",
          description: "You gain a feature from your Druid subclass.",
        },
      ],
      "7": [
        {
          id: "elemental-fury",
          name: "Elemental Fury",
          description:
            "The might of the elements flows through you. You gain one of the following options of your choice.",
          options: [
            {
              id: "elemental-fury-options",
              name: "Elemental Fury Options",
              description: "Choose one of the following options.",
              choices: [
                {
                  id: "potent-spellcasting",
                  name: "Potent Spellcasting",
                  description:
                    "Add your Wisdom modifier to the damage you deal with any Druid cantrip.",
                },
                {
                  id: "primal-strike",
                  name: "Primal Strike",
                  description:
                    "Once on each of your turns when you hit a creature with an attack roll using a weapon or a Beast form's attack in Wild Shape, you can cause the target to take an extra 1d8 Cold, Fire, Lightning, or Thunder damage (choose when you hit).",
                },
              ],
            },
          ],
        },
      ],
      "8": [
        {
          id: "druid-asi-8",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
        },
      ],
      "9": [],
      "10": [
        {
          id: "druid-subclass-feature-10",
          name: "Subclass Feature",
          description: "You gain a feature from your Druid subclass.",
        },
      ],
      "11": [],
      "12": [
        {
          id: "druid-asi-12",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
        },
      ],
      "13": [],
      "14": [
        {
          id: "druid-subclass-feature-14",
          name: "Subclass Feature",
          description: "You gain a feature from your Druid subclass.",
        },
      ],
      "15": [
        {
          id: "improved-elemental-fury",
          name: "Improved Elemental Fury",
          description:
            "The option you chose for Elemental Fury grows more powerful, as detailed below.\nPotent Spellcasting. When you cast a Druid cantrip with a range of 10 feet or greater, the spell's range increases by 300 feet.\nPrimal Strike. The extra damage of your Primal Strike increases to 2d8.",
        },
      ],
      "16": [
        {
          id: "druid-asi-16",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
        },
      ],
      "17": [],
      "18": [
        {
          id: "beast-spells",
          name: "Beast Spells",
          description:
            "While using Wild Shape, you can cast spells in Beast form, except for any spell that has a Material component with a cost specified or that consumes its Material component.",
        },
      ],
      "19": [
        {
          id: "epic-boon",
          name: "Epic Boon",
          description:
            "You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Dimensional Travel is recommended.",
        },
      ],
      "20": [
        {
          id: "archdruid",
          name: "Archdruid",
          description:
            "The vitality of nature constantly blooms within you, granting you the following benefits.\nEvergreen Wild Shape. Whenever you roll Initiative and have no uses of Wild Shape left, you regain one expended use of it.\nNature Magician. You can convert uses of Wild Shape into a spell slot (no action required). Choose a number of your unexpended uses of Wild Shape and convert them into a single spell slot, with each use contributing 2 spell levels. For example, if you convert two uses of Wild Shape, you produce a level 4 spell slot. Once you use this benefit, you can't do so again until you finish a Long Rest.\nLongevity. The primal magic that you wield causes you to age more slowly. For every ten years that pass, your body ages only one year.",
        },
      ],
    },
    subclasses: [],
    source: "Player's Handbook (2024)",
  },
  {
    id: "fighter",
    name: "Fighter",
    className: "Fighter",
    description:
      "Questing knights, royal champions, elite soldiers, and hardened mercenaries-as Fighters, they all share an unparalleled prowess with weapons and armor. And they are well acquainted with death, both meting it out and defying it. Fighters master various weapon techniques, and a well-equipped Fighter always has the right tool at hand for any combat situation. Likewise, a Fighter is adept with every form of armor. Beyond that basic degree of familiarity, each Fighter specializes in certain styles of combat. Some concentrate on archery, some on fighting with two weapons at once, and some on augmenting their martial skills with magic. This combination of broad ability and extensive specialization makes Fighters superior combatants.",
    primaryAbility: ["Strength", "Dexterity"],
    hitPoints: {
      hitDice: 10,
      hitDiceType: "d10",
      hpAtFirstLevel: "10 + Constitution modifier",
      hpAtHigherLevels: "1d10 (or 6) + Constitution modifier",
    },
    subclassTitle: "Fighter Subclass",
    proficiencies: {
      savingThrows: ["Strength", "Constitution"],
      skills: {
        choose: 2,
        options: [
          "Acrobatics",
          "Animal Handling",
          "Athletics",
          "History",
          "Insight",
          "Intimidation",
          "Persuasion",
          "Perception",
          "Survival",
        ],
      },
      weapons: ["Simple", "Martial"],
      armor: ["Light", "Medium", "Heavy", "Shields"],
      tools: [],
    },
    startingEquipment: {
      defaultBundle: [
        "(A) Chain Mail, Greatsword, Flail, 8 javelins, Dungeoneer's Pack, and 4 GP",
        "(B) Studded Leather Armor, Scimitar, Shortsword, Longbow, 20 Arrows, Quiver, Dungeoneer's Pack, and 11 GP",
      ],
      goldAlternative: "155 GP",
    },
    weaponMastery: {
      levelGained: 1,
      weaponsKnownCount: {
        "1": 3,
        "2": 3,
        "3": 3,
        "4": 4,
        "5": 4,
        "6": 4,
        "7": 4,
        "8": 4,
        "9": 4,
        "10": 5,
        "11": 5,
        "12": 5,
        "13": 5,
        "14": 5,
        "15": 5,
        "16": 6,
        "17": 6,
        "18": 6,
        "19": 6,
        "20": 6,
      },
    },
    multiclassing: {
      requirements: [],
      proficienciesGained: {
        armor: ["Light", "Medium", "Shields"],
        weapons: ["Martial"],
      },
    },
    classTable: {
      headers: ["Level", "Proficiency Bonus", "Class Features", "Second Wind", "Weapon Mastery"],
      rows: [
        ["1", "+2", "Fighting Style, Second Wind, Weapon Mastery", "2", "3"],
        ["2", "+2", "Action Surge (one use), Tactical Mind", "2", "3"],
        ["3", "+2", "Fighter Subclass", "2", "3"],
        ["4", "+2", "Ability Score Improvement", "3", "4"],
        ["5", "+3", "Extra Attack, Tactical Shift", "3", "4"],
        ["6", "+3", "Ability Score Improvement", "3", "4"],
        ["7", "+3", "Subclass feature", "3", "4"],
        ["8", "+3", "Ability Score Improvement", "3", "4"],
        ["9", "+4", "Indomitable (one use), Tactical Master", "3", "4"],
        ["10", "+4", "Subclass feature", "4", "5"],
        ["11", "+4", "Two Extra Attacks", "4", "5"],
        ["12", "+4", "Ability Score Improvement", "4", "5"],
        ["13", "+5", "Indomitable (two uses), Studied Attacks", "4", "5"],
        ["14", "+5", "Ability Score Improvement", "4", "5"],
        ["15", "+5", "Subclass feature", "4", "5"],
        ["16", "+5", "Ability Score Improvement", "4", "6"],
        ["17", "+6", "Action Surge (two uses), Indomitable (three uses)", "4", "6"],
        ["18", "+6", "Subclass feature", "4", "6"],
        ["19", "+6", "Epic Boon", "4", "6"],
        ["20", "+6", "Three Extra Attacks", "4", "6"],
      ],
    },
    featuresByLevel: {
      "1": [
        {
          id: "fighter-1-1",
          name: "Fighting Style",
          description:
            "You have honed your martial prowess and gain a Fighting Style feat of your choice (see chapter 5). Defense is recommended. Whenever you gain a Fighter level, you can replace the feat you chose with a different Fighting Style feat.",
        },
        {
          id: "fighter-1-2",
          name: "Second Wind",
          description:
            "You have a limited well of physical and mental stamina that you can draw on. As a Bonus Action, you can use it to regain Hit Points equal to 1d10 plus your Fighter level. You can use this feature twice. You regain one expended use when you finish a Short Rest, and you regain all expended uses when you finish a Long Rest. When you reach certain Fighter levels, you gain more uses of this feature, as shown in the Second Wind column of the Fighter Features table.",
          actionType: "Bonus Action",
          recovery: "Short or Long Rest",
          uses: "2",
        },
        {
          id: "fighter-1-3",
          name: "Weapon Mastery",
          description:
            "Your training with weapons allows you to use the mastery properties of three kinds of Simple or Martial weapons of your choice. Whenever you finish a Long Rest, you can practice weapon drills and change one of those weapon choices. When you reach certain Fighter levels, you gain the ability to use the mastery properties of more kinds of weapons, as shown in the Weapon Mastery column of the Fighter Features table.",
        },
      ],
      "2": [
        {
          id: "fighter-2-1",
          name: "Action Surge",
          description:
            "You can push yourself beyond your normal limits for a moment. On your turn, you can take one additional action, except the Magic action. Once you use this feature, you can't do so again until you finish a Short or Long Rest. Starting at level 17, you can use it twice before a rest but only once on a turn.",
          actionType: "Free Action",
          recovery: "Short or Long Rest",
          uses: "1",
        },
        {
          id: "fighter-2-2",
          name: "Tactical Mind",
          description:
            "You have a mind for tactics on and off the battlefield. When you fail an ability check, you can expend a use of your Second Wind to push yourself toward success. Rather than regaining Hit Points, you roll 1d10 and add the number rolled to the ability check, potentially turning it into a success. If the check still fails, this use of Second Wind isn't expended.",
          actionType: "Special",
        },
      ],
      "3": [
        {
          id: "fighter-3-1",
          name: "Fighter Subclass",
          description:
            "You gain a Fighter subclass of your choice. A subclass is a specialization that grants you features at certain Fighter levels. For the rest of your career, you gain each of your subclass's features that are of your Fighter level or lower.",
        },
      ],
      "4": [
        {
          id: "fighter-4-1",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat (see chapter 5) or another feat of your choice for which you qualify. You gain this feature again at Fighter levels 6, 8, 12, 14, and 16.",
        },
      ],
      "5": [
        {
          id: "fighter-5-1",
          name: "Extra Attack",
          description:
            "You can attack twice instead of once whenever you take the Attack action on your turn.",
        },
        {
          id: "fighter-5-2",
          name: "Tactical Shift",
          description:
            "Whenever you activate your Second Wind with a Bonus Action, you can move up to half your Speed without provoking Opportunity Attacks.",
        },
      ],
      "6": [
        {
          id: "fighter-6-1",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
        },
      ],
      "7": [
        {
          id: "fighter-7-1",
          name: "Subclass feature",
          description: "You gain a feature from your Fighter subclass.",
        },
      ],
      "8": [
        {
          id: "fighter-8-1",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
        },
      ],
      "9": [
        {
          id: "fighter-9-1",
          name: "Indomitable",
          description:
            "If you fail a saving throw, you can reroll it with a bonus equal to your Fighter level. You must use the new roll, and you can't use this feature again until you finish a Long Rest. You can use this feature twice before a Long Rest starting at level 13 and three times before a Long Rest starting at level 17.",
          actionType: "Free Action",
          recovery: "Long Rest",
          uses: "1",
        },
        {
          id: "fighter-9-2",
          name: "Tactical Master",
          description:
            "When you attack with a weapon whose mastery property you can use, you can replace that property with the Push, Sap, or Slow property for that attack.",
        },
      ],
      "10": [
        {
          id: "fighter-10-1",
          name: "Subclass feature",
          description: "You gain a feature from your Fighter subclass.",
        },
      ],
      "11": [
        {
          id: "fighter-11-1",
          name: "Two Extra Attacks",
          description:
            "You can attack three times instead of once whenever you take the Attack action on your turn.",
        },
      ],
      "12": [
        {
          id: "fighter-12-1",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
        },
      ],
      "13": [
        {
          id: "fighter-13-1",
          name: "Studied Attacks",
          description:
            "You study your opponents and learn from each attack you make. If you make an attack roll against a creature and miss, you have Advantage on your next attack roll against that creature before the end of your next turn.",
        },
        {
          id: "fighter-13-2",
          name: "Indomitable (two uses)",
          description: "You can use your Indomitable feature twice before a Long Rest.",
          uses: "2",
        },
      ],
      "14": [
        {
          id: "fighter-14-1",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
        },
      ],
      "15": [
        {
          id: "fighter-15-1",
          name: "Subclass feature",
          description: "You gain a feature from your Fighter subclass.",
        },
      ],
      "16": [
        {
          id: "fighter-16-1",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
        },
      ],
      "17": [
        {
          id: "fighter-17-1",
          name: "Action Surge (two uses)",
          description:
            "You can use your Action Surge feature twice before a rest but only once on a turn.",
          uses: "2",
        },
        {
          id: "fighter-17-2",
          name: "Indomitable (three uses)",
          description: "You can use your Indomitable feature three times before a Long Rest.",
          uses: "3",
        },
      ],
      "18": [
        {
          id: "fighter-18-1",
          name: "Subclass feature",
          description: "You gain a feature from your Fighter subclass.",
        },
      ],
      "19": [
        {
          id: "fighter-19-1",
          name: "Epic Boon",
          description:
            "You gain an Epic Boon feat (see chapter 5) or another feat of your choice for which you qualify. Boon of Combat Prowess is recommended.",
        },
      ],
      "20": [
        {
          id: "fighter-20-1",
          name: "Three Extra Attacks",
          description:
            "You can attack four times instead of once whenever you take the Attack action on your turn.",
        },
      ],
    },
    subclasses: [],
    source: "Player's Handbook (2024)",
  },
  {
    id: "monk",
    name: "Monk",
    className: "Monk",
    description:
      "Monks use rigorous combat training and mental discipline to align themselves with the multiverse and focus their internal reservoirs of power.",
    primaryAbility: ["Dexterity", "Wisdom"],
    hitPoints: {
      hitDice: 8,
      hitDiceType: "d8",
      hpAtFirstLevel: "8 + Constitution modifier",
      hpAtHigherLevels: "1d8 (or 5) + Constitution modifier",
    },
    proficiencies: {
      savingThrows: ["Strength", "Dexterity"],
      skills: {
        choose: 2,
        options: ["Acrobatics", "Athletics", "History", "Insight", "Religion", "Stealth"],
      },
      weapons: ["Simple weapons", "Martial weapons with the Light property"],
      armor: [],
      tools: [],
      toolChoice: {
        choose: 1,
        options: ["Artisan's Tools", "Musical Instrument"],
      },
    },
    startingEquipment: {
      defaultBundle: [
        "Spear",
        "5 Daggers",
        "Artisan's Tools or Musical Instrument",
        "Explorer's Pack",
        "11 GP",
      ],
      goldAlternative: "50 GP",
    },
    featuresByLevel: {
      "1": [
        {
          id: "martial-arts",
          name: "Martial Arts",
          description:
            "Your practice of martial arts gives you mastery of combat styles that use your Unarmed Strike and Monk weapons.\nBonus Unarmed Strike: Make an Unarmed Strike as a Bonus Action.\nMartial Arts Die: Roll 1d6 in place of normal damage.\nDexterous Attacks: Use Dexterity instead of Strength for attack and damage rolls of Unarmed Strikes and Monk weapons.",
          actionType: "Bonus Action",
        },
        {
          id: "unarmored-defense-monk",
          name: "Unarmored Defense",
          description:
            "While you aren't wearing armor or wielding a Shield, your base Armor Class equals 10 plus your Dexterity and Wisdom modifiers.",
        },
      ],
      "2": [
        {
          id: "monks-focus",
          name: "Monk's Focus",
          description:
            "You have a well of extraordinary energy represented by Focus Points equal to your Monk level. You can use Flurry of Blows, Patient Defense, and Step of the Wind.",
          recovery: "Short or Long Rest",
          uses: "Monk Level",
        },
        {
          id: "unarmored-movement",
          name: "Unarmored Movement",
          description:
            "Your speed increases by 10 feet while you aren't wearing armor or wielding a Shield.",
        },
        {
          id: "uncanny-metabolism",
          name: "Uncanny Metabolism",
          description:
            "When you roll Initiative, you can regain all expended Focus Points. Roll your Martial Arts die and regain Hit Points equal to your Monk level plus the number rolled.",
          recovery: "Long Rest",
          actionType: "Initiative Roll",
        },
      ],
      "3": [
        {
          id: "deflect-attacks",
          name: "Deflect Attacks",
          description:
            "When an attack roll hits you and deals Bludgeoning, Piercing, or Slashing damage, you can take a Reaction to reduce the damage by 1d10 + Dexterity modifier + Monk level. If you reduce it to 0, you can expend 1 Focus Point to redirect it.",
          actionType: "Reaction",
        },
        {
          id: "monk-subclass",
          name: "Monk Subclass",
          description: "Choose a Monk subclass.",
        },
      ],
      "4": [
        {
          id: "asi-4",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
        },
        {
          id: "slow-fall",
          name: "Slow Fall",
          description:
            "Take a Reaction when you fall to reduce fall damage by five times your Monk level.",
          actionType: "Reaction",
        },
      ],
      "5": [
        {
          id: "extra-attack",
          name: "Extra Attack",
          description:
            "You can attack twice instead of once whenever you take the Attack action on your turn.",
        },
        {
          id: "stunning-strike",
          name: "Stunning Strike",
          description:
            "Once per turn when you hit a creature with a Monk weapon or an Unarmed Strike, you can expend 1 Focus Point to attempt a stunning strike. Target must make a Constitution save or be Stunned.",
          actionType: "Special",
          duration: "1 Round",
        },
      ],
      "6": [
        {
          id: "empowered-strikes",
          name: "Empowered Strikes",
          description:
            "Whenever you deal damage with your Unarmed Strike, it can deal your choice of Force damage or its normal damage type.",
        },
        {
          id: "subclass-feature-6",
          name: "Subclass Feature",
          description: "You gain a feature from your Monk subclass.",
        },
      ],
      "7": [
        {
          id: "evasion",
          name: "Evasion",
          description:
            "When subjected to an effect that allows a Dexterity saving throw for half damage, you take no damage on a success and half on a failure.",
        },
      ],
      "8": [
        {
          id: "asi-8",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice.",
        },
      ],
      "9": [
        {
          id: "acrobatic-movement",
          name: "Acrobatic Movement",
          description:
            "While unarmored, you gain the ability to move along vertical surfaces and across liquids on your turn without falling.",
        },
      ],
      "10": [
        {
          id: "heightened-focus",
          name: "Heightened Focus",
          description:
            "Flurry of Blows makes three strikes. Patient Defense grants Temporary Hit Points. Step of the Wind lets you bring a willing creature with you.",
        },
        {
          id: "self-restoration",
          name: "Self-Restoration",
          description:
            "At the end of your turns, you can remove one condition: Charmed, Frightened, or Poisoned. Forgoing food/drink doesn't cause Exhaustion.",
          actionType: "Free Action",
        },
      ],
      "11": [
        {
          id: "subclass-feature-11",
          name: "Subclass Feature",
          description: "You gain a feature from your Monk subclass.",
        },
      ],
      "12": [
        {
          id: "asi-12",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice.",
        },
      ],
      "13": [
        {
          id: "deflect-energy",
          name: "Deflect Energy",
          description: "You can use Deflect Attacks against attacks that deal any damage type.",
        },
      ],
      "14": [
        {
          id: "disciplined-survivor",
          name: "Disciplined Survivor",
          description:
            "You gain proficiency in all saving throws. You can expend 1 Focus Point to reroll a failed save.",
        },
      ],
      "15": [
        {
          id: "perfect-focus",
          name: "Perfect Focus",
          description:
            "When you roll Initiative and don't use Uncanny Metabolism, you regain expended Focus Points until you have 4 if you have 3 or fewer.",
        },
      ],
      "16": [
        {
          id: "asi-16",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice.",
        },
      ],
      "17": [
        {
          id: "subclass-feature-17",
          name: "Subclass Feature",
          description: "You gain a feature from your Monk subclass.",
        },
      ],
      "18": [
        {
          id: "superior-defense",
          name: "Superior Defense",
          description:
            "At the start of your turn, you can expend 3 Focus Points to gain Resistance to all damage except Force damage for 1 minute.",
          actionType: "Free Action",
          duration: "1 Minute",
        },
      ],
      "19": [
        {
          id: "epic-boon-monk",
          name: "Epic Boon",
          description: "You gain an Epic Boon feat or another feat of your choice.",
        },
      ],
      "20": [
        {
          id: "body-and-mind",
          name: "Body and Mind",
          description: "Your Dexterity and Wisdom scores increase by 4, to a maximum of 25.",
        },
      ],
    },
    subclasses: [
      {
        id: "warrior-of-mercy",
        name: "Warrior of Mercy",
        description:
          "Monks of the Way of Mercy learn to manipulate the life force of others to bring aid to those in need and to end the suffering of their enemies.",
        source: "Player's Handbook (2024)",
        featuresByLevel: {},
      },
      {
        id: "warrior-of-shadow",
        name: "Warrior of Shadow",
        description:
          "Monks of the Way of Shadow value the arts of stealth and subterfuge, often serving as spies and assassins.",
        source: "Player's Handbook (2024)",
        featuresByLevel: {},
      },
      {
        id: "warrior-of-the-elements",
        name: "Warrior of the Elements",
        description:
          "Monks of the Way of the Elements draw on the elemental forces of the multiverse to enhance their attacks and defenses.",
        source: "Player's Handbook (2024)",
        featuresByLevel: {},
      },
      {
        id: "warrior-of-the-open-hand",
        name: "Warrior of the Open Hand",
        description:
          "Monks of the Way of the Open Hand are the ultimate masters of martial arts combat, whether armed or unarmed.",
        source: "Player's Handbook (2024)",
        featuresByLevel: {},
      },
    ],
    source: "Player's Handbook (2024)",
  },
  {
    id: "paladin",
    name: "Paladin",
    className: "Paladin",
    description:
      "Paladins are united by their oaths to stand against the forces of annihilation and corruption. Whether sworn before a god's altar, in a sacred glade before nature spirits, or in a moment of desperation and grief with the dead as the only witnesses, a Paladin's oath is a powerful bond. It is a source of power that turns a devout warrior into a blessed champion.",
    primaryAbility: ["Strength", "Charisma"],
    hitPoints: {
      hitDice: 10,
      hitDiceType: "d10",
      hpAtFirstLevel: "10 + Constitution modifier",
      hpAtHigherLevels: "1d10 (or 6) + Constitution modifier",
    },
    proficiencies: {
      savingThrows: ["Wisdom", "Charisma"],
      skills: {
        choose: 2,
        options: ["Athletics", "Insight", "Intimidation", "Medicine", "Persuasion", "Religion"],
      },
      weapons: ["Simple", "Martial"],
      armor: ["Light", "Medium", "Heavy", "Shields"],
      tools: [],
    },
    startingEquipment: {
      defaultBundle: [
        "Chain Mail",
        "Shield",
        "Longsword",
        "6 Javelins",
        "Holy Symbol",
        "Priest's Pack",
        "9 GP",
      ],
      goldAlternative: "150 GP",
    },
    weaponMastery: {
      levelGained: 1,
      weaponsKnownCount: 2,
    },
    multiclassing: {
      requirements: [
        {
          ability: "Strength",
          minScore: 13,
        },
        {
          ability: "Charisma",
          minScore: 13,
        },
      ],
      proficienciesGained: {
        armor: ["Light", "Medium", "Shields"],
        weapons: ["Martial"],
      },
    },
    spellcasting: {
      ability: "Charisma",
      casterType: "Half",
      preparationType: "Prepared",
      spellcastingFocus: ["Holy Symbol"],
      slotsByLevel: {
        "1": [2],
        "2": [2],
        "3": [3],
        "4": [3],
        "5": [4, 2],
        "6": [4, 2],
        "7": [4, 3],
        "8": [4, 3],
        "9": [4, 3, 2],
        "10": [4, 3, 2],
        "11": [4, 3, 3],
        "12": [4, 3, 3],
        "13": [4, 3, 3, 1],
        "14": [4, 3, 3, 1],
        "15": [4, 3, 3, 2],
        "16": [4, 3, 3, 2],
        "17": [4, 3, 3, 3, 1],
        "18": [4, 3, 3, 3, 1],
        "19": [4, 3, 3, 3, 2],
        "20": [4, 3, 3, 3, 2],
      },
      spellsPreparedByLevel: {
        "1": 2,
        "2": 2,
        "3": 3,
        "4": 3,
        "5": 4,
        "6": 4,
        "7": 5,
        "8": 5,
        "9": 6,
        "10": 6,
        "11": 7,
        "12": 7,
        "13": 8,
        "14": 8,
        "15": 9,
        "16": 9,
        "17": 10,
        "18": 10,
        "19": 11,
        "20": 11,
      },
    },
    epicBoonRecommendation: "Boon of Truesight",
    subclasses: [],
    featuresByLevel: {
      "1": [
        {
          id: "lay-on-hands",
          name: "Lay On Hands",
          description:
            "Your blessed touch can heal wounds. You have a pool of healing power that replenishes when you finish a Long Rest. With that pool, you can restore a total number of Hit Points equal to five times your Paladin level.\nAs a Bonus Action, you can touch a creature (which could be yourself) and draw power from the pool of healing to restore a number of Hit Points to that creature, up to the maximum amount remaining in the pool.\nYou can also expend 5 Hit Points from the pool of healing power to remove the Poisoned condition from the creature; those points don't also restore Hit Points to the creature.",
          levelRequired: 1,
          actionType: "Bonus Action",
          recovery: "Long Rest",
          uses: "5 x Paladin level HP",
        },
        {
          id: "spellcasting",
          name: "Spellcasting",
          description: "You have learned to cast spells through prayer and meditation.",
          levelRequired: 1,
        },
        {
          id: "weapon-mastery",
          name: "Weapon Mastery",
          description:
            "Your training with weapons allows you to use the mastery properties of two kinds of weapons of your choice with which you have proficiency, such as Longswords and Javelins.\nWhenever you finish a Long Rest, you can change the kinds of weapons you chose.",
          levelRequired: 1,
          recovery: "Long Rest",
        },
      ],
      "2": [
        {
          id: "fighting-style",
          name: "Fighting Style",
          description:
            "You gain a Fighting Style feat of your choice. Instead of choosing one of those feats, you can choose the Blessed Warrior option.",
          levelRequired: 2,
        },
        {
          id: "paladins-smite",
          name: "Paladin's Smite",
          description:
            "You always have the Divine Smite spell prepared. In addition, you can cast it without expending a spell slot, but you must finish a Long Rest before you can cast it in this way again.",
          levelRequired: 2,
          recovery: "Long Rest",
          uses: "1",
        },
      ],
      "3": [
        {
          id: "channel-divinity",
          name: "Channel Divinity",
          description:
            "You can channel divine energy directly from the Outer Planes, using it to fuel magical effects. You start with one such effect: Divine Sense. Other Paladin features give additional Channel Divinity effect options. Each time you use this class's Channel Divinity, you choose which effect from this class to create.\nYou can use this class's Channel Divinity twice. You regain one of its expended uses when you finish a Short Rest, and you regain all expended uses when you finish a Long Rest. You gain an additional use when you reach Paladin level 11.\n\nDivine Sense. As a Bonus Action, you can open your awareness to detect Celestials, Fiends, and Undead. For the next 10 minutes or until you have the Incapacitated condition, you know the location of any creature of those types within 60 feet of yourself, and you know its creature type. Within the same radius, you also detect the presence of any place or object that has been consecrated or desecrated.",
          levelRequired: 3,
          actionType: "Bonus Action",
          recovery: "Short or Long Rest",
          uses: "2",
        },
        {
          id: "paladin-subclass",
          name: "Paladin Subclass",
          description: "You gain a Paladin subclass of your choice.",
          levelRequired: 3,
        },
      ],
      "4": [
        {
          id: "ability-score-improvement-4",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
          levelRequired: 4,
        },
      ],
      "5": [
        {
          id: "extra-attack",
          name: "Extra Attack",
          description:
            "You can attack twice instead of once whenever you take the Attack action on your turn.",
          levelRequired: 5,
          actionType: "Action",
        },
        {
          id: "faithful-steed",
          name: "Faithful Steed",
          description:
            "You can call on the aid of an otherworldly steed. You always have the Find Steed spell prepared. You can also cast the spell once without expending a spell slot, and you regain the ability to do so when you finish a Long Rest.",
          levelRequired: 5,
          recovery: "Long Rest",
          uses: "1",
        },
      ],
      "6": [
        {
          id: "aura-of-protection",
          name: "Aura of Protection",
          description:
            "You radiate a protective, unseeable aura in a 10-foot Emanation that originates from you. The aura is inactive while you have the Incapacitated condition.\nYou and your allies in the aura gain a bonus to saving throws equal to your Charisma modifier (minimum bonus of +1).",
          levelRequired: 6,
        },
      ],
      "7": [
        {
          id: "subclass-feature-7",
          name: "Subclass Feature",
          description: "You gain a feature from your Paladin subclass.",
          levelRequired: 7,
        },
      ],
      "8": [
        {
          id: "ability-score-improvement-8",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
          levelRequired: 8,
        },
      ],
      "9": [
        {
          id: "abjure-foes",
          name: "Abjure Foes",
          description:
            "As a Magic action, you can expend one use of this class's Channel Divinity to overwhelm foes with awe. As you present your Holy Symbol or weapon, you can target a number of creatures equal to your Charisma modifier (minimum of one creature) that you can see within 60 feet of yourself. Each target must succeed on a Wisdom saving throw or have the Frightened condition for 1 minute or until it takes any damage. While Frightened in this way, a target can do only one of the following on its turns: move, take an action, or take a Bonus Action.",
          levelRequired: 9,
          actionType: "Action",
          savingThrow: "Wisdom",
          duration: "1 minute",
        },
      ],
      "10": [
        {
          id: "aura-of-courage",
          name: "Aura of Courage",
          description:
            "You and your allies have Immunity to the Frightened condition while in your Aura of Protection. If a Frightened ally enters the aura, that condition has no effect on that ally while there.",
          levelRequired: 10,
        },
      ],
      "11": [
        {
          id: "radiant-strikes",
          name: "Radiant Strikes",
          description:
            "Your strikes now carry supernatural power. When you hit a target with an attack roll using a Melee weapon or an Unarmed Strike, the target takes an extra 1d8 Radiant damage.",
          levelRequired: 11,
          damageType: "Radiant",
        },
      ],
      "12": [
        {
          id: "ability-score-improvement-12",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
          levelRequired: 12,
        },
      ],
      "13": [],
      "14": [
        {
          id: "restoring-touch",
          name: "Restoring Touch",
          description:
            "When you use Lay On Hands on a creature, you can also remove one or more of the following conditions from the creature: Blinded, Charmed, Deafened, Frightened, Paralyzed, or Stunned. You must expend 5 Hit Points from the healing pool of Lay On Hands for each of these conditions you remove; those points don't also restore Hit Points to the creature.",
          levelRequired: 14,
        },
      ],
      "15": [
        {
          id: "subclass-feature-15",
          name: "Subclass Feature",
          description: "You gain a feature from your Paladin subclass.",
          levelRequired: 15,
        },
      ],
      "16": [
        {
          id: "ability-score-improvement-16",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
          levelRequired: 16,
        },
      ],
      "17": [],
      "18": [
        {
          id: "aura-expansion",
          name: "Aura Expansion",
          description: "Your Aura of Protection is now a 30-foot Emanation.",
          levelRequired: 18,
        },
      ],
      "19": [
        {
          id: "epic-boon",
          name: "Epic Boon",
          description:
            "You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Truesight is recommended.",
          levelRequired: 19,
        },
      ],
      "20": [
        {
          id: "subclass-feature-20",
          name: "Subclass Feature",
          description: "You gain a feature from your Paladin subclass.",
          levelRequired: 20,
        },
      ],
    },
    source: "Player's Handbook (2024)",
  },
  {
    id: "ranger",
    name: "Ranger",
    className: "Ranger",
    description:
      "Far from bustling cities, amid the trees of trackless forests and across wide plains, Rangers keep their unending watch in the wilderness. Rangers learn to track their quarry as a predator does, moving stealthily through the wilds and hiding themselves in brush and rubble. Thanks to their connection with nature, Rangers can also cast spells that harness primal powers of the wilderness. A Ranger's talents and magic are honed with deadly focus to protect the world from the ravages of monsters and tyrants.",
    primaryAbility: ["Dexterity", "Wisdom"],
    hitPoints: {
      hitDice: 10,
      hitDiceType: "d10",
      hpAtFirstLevel: "10 + your Constitution modifier",
      hpAtHigherLevels: "1d10 (or 6) + your Constitution modifier per Ranger level after 1st",
    },
    proficiencies: {
      savingThrows: ["Strength", "Dexterity"],
      skills: {
        choose: 3,
        options: [
          "Animal Handling",
          "Athletics",
          "Insight",
          "Investigation",
          "Nature",
          "Perception",
          "Stealth",
          "Survival",
        ],
      },
      weapons: ["Simple", "Martial"],
      armor: ["Light", "Medium", "Shields"],
    },
    startingEquipment: {
      defaultBundle: [
        "Studded Leather Armor",
        "Scimitar",
        "Shortsword",
        "Longbow",
        "20 Arrows",
        "Quiver",
        "Druidic Focus (sprig of mistletoe)",
        "Explorer's Pack",
        "7 GP",
      ],
      goldAlternative: "150 GP",
    },
    weaponMastery: {
      levelGained: 1,
      weaponsKnownCount: 2,
    },
    spellcasting: {
      ability: "Wisdom",
      casterType: "Half",
      preparationType: "Prepared",
      spellcastingFocus: ["Druidic Focus"],
      slotsByLevel: {
        "1": [2],
        "2": [2],
        "3": [3],
        "4": [3],
        "5": [4, 2],
        "6": [4, 2],
        "7": [4, 3],
        "8": [4, 3],
        "9": [4, 3, 2],
        "10": [4, 3, 2],
        "11": [4, 3, 3],
        "12": [4, 3, 3],
        "13": [4, 3, 3, 1],
        "14": [4, 3, 3, 1],
        "15": [4, 3, 3, 2],
        "16": [4, 3, 3, 2],
        "17": [4, 3, 3, 3, 1],
        "18": [4, 3, 3, 3, 1],
        "19": [4, 3, 3, 3, 2],
        "20": [4, 3, 3, 3, 2],
      },
      spellsPreparedByLevel: {
        "1": 2,
        "2": 3,
        "3": 4,
        "4": 5,
        "5": 6,
        "6": 6,
        "7": 7,
        "8": 7,
        "9": 9,
        "10": 9,
        "11": 10,
        "12": 10,
        "13": 11,
        "14": 11,
        "15": 12,
        "16": 12,
        "17": 14,
        "18": 14,
        "19": 15,
        "20": 15,
      },
    },
    epicBoonRecommendation: "Boon of Dimensional Travel",
    multiclassing: {
      requirements: [
        {
          ability: "Dexterity",
          minScore: 13,
        },
        {
          ability: "Wisdom",
          minScore: 13,
        },
      ],
      proficienciesGained: {
        armor: ["Light", "Medium", "Shields"],
        weapons: ["Martial"],
        skills: {
          choose: 1,
          options: [
            "Animal Handling",
            "Athletics",
            "Insight",
            "Investigation",
            "Nature",
            "Perception",
            "Stealth",
            "Survival",
          ],
        },
      },
    },
    featuresByLevel: {
      "1": [
        {
          id: "ranger-1-spellcasting",
          name: "Spellcasting",
          description:
            "You have learned to channel the magical essence of nature to cast spells. You prepare a list of Ranger spells from the Ranger spell list, using Wisdom as your spellcasting ability.",
        },
        {
          id: "ranger-1-favored-enemy",
          name: "Favored Enemy",
          description:
            "You always have the Hunter's Mark spell prepared. You can cast it twice without expending a spell slot, and you regain all expended uses of this ability when you finish a Long Rest. The number of times you can cast the spell without a spell slot increases when you reach certain Ranger levels (2 at levels 1-4, 3 at levels 5-8, 4 at levels 9-12, 5 at levels 13-16, 6 at levels 17-20).",
          recovery: "Long Rest",
          uses: "2 (scales)",
        },
        {
          id: "ranger-1-weapon-mastery",
          name: "Weapon Mastery",
          description:
            "Your training with weapons allows you to use the mastery properties of two kinds of weapons of your choice with which you have proficiency, such as Longbows and Shortswords. Whenever you finish a Long Rest, you can change the kinds of weapons you chose.",
          recovery: "Long Rest",
        },
      ],
      "2": [
        {
          id: "ranger-2-deft-explorer",
          name: "Deft Explorer",
          description:
            "Thanks to your travels, you gain the following benefits: Expertise. Choose one of your skill proficiencies with which you lack Expertise. You gain Expertise in that skill. Languages. You know two languages of your choice from the language tables in chapter 2.",
        },
        {
          id: "ranger-2-fighting-style",
          name: "Fighting Style",
          description:
            "You gain a Fighting Style feat of your choice. Instead of choosing one of those feats, you can choose Druidic Warrior: You learn two Druid cantrips of your choice.",
        },
      ],
      "3": [
        {
          id: "ranger-3-ranger-subclass",
          name: "Ranger Subclass",
          description:
            "You gain a Ranger subclass of your choice. The Beast Master, Fey Wanderer, Gloom Stalker, and Hunter subclasses are detailed after this class's description.",
        },
      ],
      "4": [
        {
          id: "ranger-4-ability-score-improvement",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
        },
      ],
      "5": [
        {
          id: "ranger-5-extra-attack",
          name: "Extra Attack",
          description:
            "You can attack twice instead of once whenever you take the Attack action on your turn.",
        },
      ],
      "6": [
        {
          id: "ranger-6-roving",
          name: "Roving",
          description:
            "Your Speed increases by 10 feet while you aren't wearing Heavy armor. You also have a Climb Speed and a Swim Speed equal to your Speed.",
        },
      ],
      "7": [
        {
          id: "ranger-7-subclass-feature",
          name: "Subclass feature",
          description: "You gain a feature from your Ranger subclass.",
        },
      ],
      "8": [
        {
          id: "ranger-8-ability-score-improvement",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
        },
      ],
      "9": [
        {
          id: "ranger-9-expertise",
          name: "Expertise",
          description:
            "Choose two of your skill proficiencies with which you lack Expertise. You gain Expertise in those skills.",
        },
      ],
      "10": [
        {
          id: "ranger-10-tireless",
          name: "Tireless",
          description:
            "Primal forces now help fuel you on your journeys, granting you Temporary Hit Points and Decrease Exhaustion. Temporary Hit Points: As a Magic action, you can give yourself a number of Temporary Hit Points equal to 1d8 plus your Wisdom modifier (minimum of 1). You can use this action a number of times equal to your Wisdom modifier, and you regain all expended uses when you finish a Long Rest. Decrease Exhaustion: Whenever you finish a Short Rest, your Exhaustion level, if any, decreases by 1.",
          actionType: "Action",
          recovery: "Long Rest",
          uses: "Wisdom modifier",
        },
      ],
      "11": [
        {
          id: "ranger-11-subclass-feature",
          name: "Subclass feature",
          description: "You gain a feature from your Ranger subclass.",
        },
      ],
      "12": [
        {
          id: "ranger-12-ability-score-improvement",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
        },
      ],
      "13": [
        {
          id: "ranger-13-relentless-hunter",
          name: "Relentless Hunter",
          description: "Taking damage can't break your Concentration on Hunter's Mark.",
        },
      ],
      "14": [
        {
          id: "ranger-14-natures-veil",
          name: "Nature's Veil",
          description:
            "You invoke spirits of nature to magically hide yourself. As a Bonus Action, you can give yourself the Invisible condition until the end of your next turn. You can use this feature a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses when you finish a Long Rest.",
          actionType: "Bonus Action",
          duration: "1 round",
          recovery: "Long Rest",
          uses: "Wisdom modifier",
        },
      ],
      "15": [
        {
          id: "ranger-15-subclass-feature",
          name: "Subclass feature",
          description: "You gain a feature from your Ranger subclass.",
        },
      ],
      "16": [
        {
          id: "ranger-16-ability-score-improvement",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
        },
      ],
      "17": [
        {
          id: "ranger-17-precise-hunter",
          name: "Precise Hunter",
          description:
            "You have Advantage on attack rolls against the creature currently marked by your Hunter's Mark.",
        },
      ],
      "18": [
        {
          id: "ranger-18-feral-senses",
          name: "Feral Senses",
          description:
            "Your connection to the forces of nature grants you Blindsight with a range of 30 feet.",
        },
      ],
      "19": [
        {
          id: "ranger-19-epic-boon",
          name: "Epic Boon",
          description:
            "You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Dimensional Travel is recommended.",
        },
      ],
      "20": [
        {
          id: "ranger-20-foe-slayer",
          name: "Foe Slayer",
          description: "The damage die of your Hunter's Mark is a d10 rather than a d6.",
        },
      ],
    },
    subclasses: [],
    source: "Player's Handbook (2024)",
  },
  {
    id: "rogue",
    name: "Rogue",
    className: "Rogue",
    description:
      "Rogues rely on cunning, stealth, and their foes' vulnerabilities to get the upper hand in any situation. They have a knack for finding the solution to just about any problem. A few even learn magical tricks to supplement their other abilities. Many Rogues focus on stealth and deception, while others refine skills that help them in a dungeon environment, such as climbing, finding and disarming traps, and opening locks.",
    primaryAbility: ["Dexterity"],
    hitPoints: {
      hitDice: 8,
      hitDiceType: "d8",
      hpAtFirstLevel: "8 + Constitution modifier",
      hpAtHigherLevels: "1d8 (or 5) + Constitution modifier",
    },
    subclassTitle: "Rogue Subclass",
    proficiencies: {
      savingThrows: ["Dexterity", "Intelligence"],
      skills: {
        choose: 4,
        options: [
          "Acrobatics",
          "Athletics",
          "Deception",
          "Insight",
          "Intimidation",
          "Investigation",
          "Perception",
          "Persuasion",
          "Sleight of Hand",
          "Stealth",
        ],
      },
      weapons: ["Simple weapons", "Martial weapons that have the Finesse or Light property"],
      armor: ["Light armor"],
      tools: ["Thieves' Tools"],
      expertise: {
        choose: 2,
        options: [],
      },
    },
    startingEquipment: {
      defaultBundle: [
        "Leather Armor",
        "2 Daggers",
        "Shortsword",
        "Shortbow",
        "20 Arrows",
        "Quiver",
        "Thieves' Tools",
        "Burglar's Pack",
        "8 GP",
      ],
      goldAlternative: "700 GP",
    },
    weaponMastery: {
      levelGained: 1,
      weaponsKnownCount: 2,
    },
    epicBoonRecommendation: "Boon of the Night Spirit",
    multiclassing: {
      requirements: [
        {
          ability: "Dexterity",
          minScore: 13,
        },
      ],
      proficienciesGained: {
        armor: ["Light armor"],
        tools: ["Thieves' Tools"],
        skills: {
          choose: 1,
          options: [
            "Acrobatics",
            "Athletics",
            "Deception",
            "Insight",
            "Intimidation",
            "Investigation",
            "Perception",
            "Persuasion",
            "Sleight of Hand",
            "Stealth",
          ],
        },
      },
    },
    featuresByLevel: {
      "1": [
        {
          id: "expertise",
          name: "Expertise",
          description:
            "You gain Expertise in two of your skill proficiencies of your choice. Sleight of Hand and Stealth are recommended if you have proficiency in them. At Rogue level 6, you gain Expertise in two more of your skill proficiencies of your choice.",
          levelRequired: 1,
        },
        {
          id: "sneak-attack",
          name: "Sneak Attack",
          description:
            "You know how to strike subtly and exploit a foe's distraction. Once per turn, you can deal an extra 1d6 damage to one creature you hit with an attack roll if you have Advantage on the roll and the attack uses a Finesse or a Ranged weapon. The extra damage's type is the same as the weapon's type. You don't need Advantage on the attack roll if at least one of your allies is within 5 feet of the target, the ally doesn't have the Incapacitated condition, and you don't have Disadvantage on the attack roll. The extra damage increases as you gain Rogue levels, as shown in the Sneak Attack column of the Rogue Features table.",
          levelRequired: 1,
          uses: "Once per turn",
        },
        {
          id: "thieves-cant",
          name: "Thieves' Cant",
          description:
            "You picked up various languages in the communities where you plied your roguish talents. You know Thieves' Cant and one other language of your choice, which you choose from the language tables in chapter 2.",
          levelRequired: 1,
        },
        {
          id: "weapon-mastery",
          name: "Weapon Mastery",
          description:
            "Your training with weapons allows you to use the mastery properties of two kinds of weapons of your choice with which you have proficiency, such as Daggers and Shortbows. Whenever you finish a Long Rest, you can change the kinds of weapons you chose. For example, you could switch to using the mastery properties of Scimitars and Shortswords.",
          levelRequired: 1,
        },
      ],
      "2": [
        {
          id: "cunning-action",
          name: "Cunning Action",
          description:
            "Your quick thinking and agility allow you to move and act quickly. On your turn, you can take one of the following actions as a Bonus Action: Dash, Disengage, or Hide.",
          levelRequired: 2,
          actionType: "Bonus Action",
        },
      ],
      "3": [
        {
          id: "rogue-subclass",
          name: "Rogue Subclass",
          description:
            "You gain a Rogue subclass of your choice. The Arcane Trickster, Assassin, Soulknife, and Thief subclasses are detailed after this class's description. A subclass is a specialization that grants you features at certain Rogue levels. For the rest of your career, you gain each of your subclass's features that are of your Rogue level or lower.",
          levelRequired: 3,
        },
        {
          id: "steady-aim",
          name: "Steady Aim",
          description:
            "As a Bonus Action, you give yourself Advantage on your next attack roll on the current turn. You can use this feature only if you haven't moved during this turn, and after you use it, your Speed is 0 until the end of the current turn.",
          levelRequired: 3,
          actionType: "Bonus Action",
        },
      ],
      "4": [
        {
          id: "ability-score-improvement-4",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat (see chapter 5) or another feat of your choice for which you qualify. You gain this feature again at Rogue levels 8, 10, 12, and 16.",
          levelRequired: 4,
        },
      ],
      "5": [
        {
          id: "cunning-strike",
          name: "Cunning Strike",
          description:
            "You've developed cunning ways to use your Sneak Attack. When you deal Sneak Attack damage, you can add one of the following Cunning Strike effects. Each effect has a die cost, which is the number of Sneak Attack damage dice you must forgo to add the effect. You remove the die before rolling, and the effect occurs immediately after the attack's damage is dealt.\n\nIf a Cunning Strike effect requires a saving throw, the DC equals 8 plus your Dexterity modifier and Proficiency Bonus.\n\nPoison (Cost: 1d6). You add a toxin to your strike, forcing the target to make a Constitution saving throw. On a failed save, the target has the Poisoned condition for 1 minute. At the end of each of its turns, the Poisoned target repeats the save, ending the effect on itself on a success. To use this effect, you must have a Poisoner's Kit on your person.\n\nTrip (Cost: 1d6). If the target is Large or smaller, it must succeed on a Dexterity saving throw or have the Prone condition.\n\nWithdraw (Cost: 1d6). Immediately after the attack, you move up to half your Speed without provoking Opportunity Attacks.",
          levelRequired: 5,
        },
        {
          id: "uncanny-dodge",
          name: "Uncanny Dodge",
          description:
            "When an attacker that you can see hits you with an attack roll, you can take a Reaction to halve the attack's damage against you (round down).",
          levelRequired: 5,
          actionType: "Reaction",
        },
      ],
      "6": [
        {
          id: "expertise-6",
          name: "Expertise",
          description:
            "At Rogue level 6, you gain Expertise in two more of your skill proficiencies of your choice.",
          levelRequired: 6,
        },
      ],
      "7": [
        {
          id: "evasion",
          name: "Evasion",
          description:
            "You can nimbly dodge out of the way of certain dangers. When you're subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you instead take no damage if you succeed on the saving throw and only half damage if you fail. You can't use this feature if you have the Incapacitated condition.",
          levelRequired: 7,
        },
        {
          id: "reliable-talent",
          name: "Reliable Talent",
          description:
            "Whenever you make an ability check that uses one of your skill or tool proficiencies, you can treat a d20 roll of 9 or lower as a 10.",
          levelRequired: 7,
        },
      ],
      "8": [
        {
          id: "ability-score-improvement-8",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat (see chapter 5) or another feat of your choice for which you qualify.",
          levelRequired: 8,
        },
      ],
      "9": [
        {
          id: "subclass-feature-9",
          name: "Subclass Feature",
          description: "You gain a feature from your Rogue subclass.",
          levelRequired: 9,
        },
      ],
      "10": [
        {
          id: "ability-score-improvement-10",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat (see chapter 5) or another feat of your choice for which you qualify.",
          levelRequired: 10,
        },
      ],
      "11": [
        {
          id: "improved-cunning-strike",
          name: "Improved Cunning Strike",
          description:
            "You can use up to two Cunning Strike effects when you deal Sneak Attack damage, paying the die cost for each effect.",
          levelRequired: 11,
        },
      ],
      "12": [
        {
          id: "ability-score-improvement-12",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat (see chapter 5) or another feat of your choice for which you qualify.",
          levelRequired: 12,
        },
      ],
      "13": [
        {
          id: "subclass-feature-13",
          name: "Subclass Feature",
          description: "You gain a feature from your Rogue subclass.",
          levelRequired: 13,
        },
      ],
      "14": [
        {
          id: "devious-strikes",
          name: "Devious Strikes",
          description:
            "You've practiced new ways to use your Sneak Attack deviously. The following effects are now among your Cunning Strike options.\n\nDaze (Cost: 2d6). The target must succeed on a Constitution saving throw, or on its next turn, it can do only one of the following: move or take an action or a Bonus Action.\n\nKnock Out (Cost: 6d6). The target must succeed on a Constitution saving throw, or it has the Unconscious condition for 1 minute or until it takes any damage. The Unconscious target repeats the save at the end of each of its turns, ending the effect on itself on a success.\n\nObscure (Cost: 3d6). The target must succeed on a Dexterity saving throw, or it has the Blinded condition until the end of its next turn.",
          levelRequired: 14,
        },
      ],
      "15": [
        {
          id: "slippery-mind",
          name: "Slippery Mind",
          description:
            "Your cunning mind is exceptionally difficult to control. You gain proficiency in Wisdom and Charisma saving throws.",
          levelRequired: 15,
        },
      ],
      "16": [
        {
          id: "ability-score-improvement-16",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat (see chapter 5) or another feat of your choice for which you qualify.",
          levelRequired: 16,
        },
      ],
      "17": [
        {
          id: "subclass-feature-17",
          name: "Subclass Feature",
          description: "You gain a feature from your Rogue subclass.",
          levelRequired: 17,
        },
      ],
      "18": [
        {
          id: "elusive",
          name: "Elusive",
          description:
            "You're so evasive that attackers rarely gain the upper hand against you. No attack roll can have Advantage against you unless you have the Incapacitated condition.",
          levelRequired: 18,
        },
      ],
      "19": [
        {
          id: "epic-boon",
          name: "Epic Boon",
          description:
            "You gain an Epic Boon feat (see chapter 5) or another feat of your choice for which you qualify. Boon of the Night Spirit is recommended.",
          levelRequired: 19,
        },
      ],
      "20": [
        {
          id: "stroke-of-luck",
          name: "Stroke of Luck",
          description:
            "You have a marvelous knack for succeeding when you need to. If you fail a D20 Test, you can turn the roll into a 20. Once you use this feature, you can't use it again until you finish a Short or Long Rest.",
          levelRequired: 20,
          recovery: "Short or Long Rest",
        },
      ],
    },
    subclasses: [],
    classTable: {
      headers: ["Level", "Proficiency Bonus", "Sneak Attack", "Class Features"],
      rows: [
        ["1", "+2", "1d6", "Expertise, Sneak Attack, Thieves' Cant, Weapon Mastery"],
        ["2", "+2", "1d6", "Cunning Action"],
        ["3", "+2", "2d6", "Rogue Subclass, Steady Aim"],
        ["4", "+2", "2d6", "Ability Score Improvement"],
        ["5", "+3", "3d6", "Cunning Strike, Uncanny Dodge"],
        ["6", "+3", "3d6", "Expertise"],
        ["7", "+3", "4d6", "Evasion, Reliable Talent"],
        ["8", "+3", "4d6", "Ability Score Improvement"],
        ["9", "+4", "5d6", "Subclass feature"],
        ["10", "+4", "5d6", "Ability Score Improvement"],
        ["11", "+4", "6d6", "Improved Cunning Strike"],
        ["12", "+4", "6d6", "Ability Score Improvement"],
        ["13", "+5", "7d6", "Subclass feature"],
        ["14", "+5", "7d6", "Devious Strikes"],
        ["15", "+5", "8d6", "Slippery Mind"],
        ["16", "+5", "8d6", "Ability Score Improvement"],
        ["17", "+6", "9d6", "Subclass feature"],
        ["18", "+6", "9d6", "Elusive"],
        ["19", "+6", "10d6", "Epic Boon"],
        ["20", "+6", "10d6", "Stroke of Luck"],
      ],
    },
    source: "Player's Handbook (2024)",
  },
  {
    id: "sorcerer",
    name: "Sorcerer",
    className: "Sorcerer",
    description:
      "Sorcerers wield innate magic that is stamped into their being. Some Sorcerers can't name the origin of their power, while others trace it to strange events in their personal or family history.",
    primaryAbility: ["Charisma"],
    hitPoints: {
      hitDice: 6,
      hitDiceType: "d6",
      hpAtFirstLevel: "6 + your Constitution modifier",
      hpAtHigherLevels: "1d6 (or 4) + your Constitution modifier per Sorcerer level after 1st",
    },
    subclassTitle: "Sorcerer Subclass",
    proficiencies: {
      savingThrows: ["Constitution", "Charisma"],
      skills: {
        choose: 2,
        options: ["Arcana", "Deception", "Insight", "Intimidation", "Persuasion", "Religion"],
      },
      weapons: ["Simple weapons"],
      armor: [],
      tools: [],
    },
    startingEquipment: {
      defaultBundle: ["Spear", "2 Daggers", "Arcane Focus (crystal)", "Dungeoneer's Pack", "28 GP"],
      goldAlternative: "50 GP",
    },
    spellcasting: {
      ability: "Charisma",
      casterType: "Full",
      preparationType: "Prepared",
      spellcastingFocus: ["Arcane Focus"],
      ritualCasting: false,
      slotsByLevel: {
        "1": [2],
        "2": [3],
        "3": [4, 2],
        "4": [4, 3],
        "5": [4, 3, 2],
        "6": [4, 3, 3],
        "7": [4, 3, 3, 1],
        "8": [4, 3, 3, 2],
        "9": [4, 3, 3, 3, 1],
        "10": [4, 3, 3, 3, 2],
        "11": [4, 3, 3, 3, 2, 1],
        "12": [4, 3, 3, 3, 2, 1],
        "13": [4, 3, 3, 3, 2, 1, 1],
        "14": [4, 3, 3, 3, 2, 1, 1],
        "15": [4, 3, 3, 3, 2, 1, 1, 1],
        "16": [4, 3, 3, 3, 2, 1, 1, 1],
        "17": [4, 3, 3, 3, 2, 1, 1, 1, 1],
        "18": [4, 3, 3, 3, 3, 1, 1, 1, 1],
        "19": [4, 3, 3, 3, 3, 2, 1, 1, 1],
        "20": [4, 3, 3, 3, 3, 2, 2, 1, 1],
      },
      cantripsKnownByLevel: {
        "1": 4,
        "2": 4,
        "3": 4,
        "4": 5,
        "5": 5,
        "6": 5,
        "7": 5,
        "8": 5,
        "9": 5,
        "10": 6,
        "11": 6,
        "12": 6,
        "13": 6,
        "14": 6,
        "15": 6,
        "16": 6,
        "17": 6,
        "18": 6,
        "19": 6,
        "20": 6,
      },
      spellsPreparedByLevel: {
        "1": 2,
        "2": 3,
        "3": 4,
        "4": 5,
        "5": 6,
        "6": 7,
        "7": 8,
        "8": 9,
        "9": 10,
        "10": 11,
        "11": 12,
        "12": 12,
        "13": 13,
        "14": 13,
        "15": 14,
        "16": 14,
        "17": 15,
        "18": 15,
        "19": 15,
        "20": 15,
      },
    },
    epicBoonRecommendation: "Boon of Dimensional Travel",
    multiclassing: {
      requirements: [
        {
          ability: "Charisma",
          minScore: 13,
        },
      ],
      proficienciesGained: {},
    },
    featuresByLevel: {
      "1": [
        {
          id: "sorcerer-1-spellcasting",
          name: "Spellcasting",
          description:
            "Drawing from your innate magic, you can cast spells. See chapter 7 for the rules on spellcasting. The information below details how you use those rules with Sorcerer spells...\n\nCantrips. You know four Sorcerer cantrips of your choice... When you reach Sorcerer levels 4 and 10, you learn another Sorcerer cantrip...\n\nSpell Slots. The Sorcerer Features table shows how many spell slots you have to cast your level 1+ spells. You regain all expended slots when you finish a Long Rest.\n\nPrepared Spells of Level 1+. You prepare the list of level 1+ spells that are available for you to cast with this feature. To start, choose two level 1 Sorcerer spells... The number of spells on your list increases as you gain Sorcerer levels... Whenever that number increases, choose additional Sorcerer spells until the number of spells on your list matches the number in the Sorcerer Features table. The chosen spells must be of a level for which you have spell slots...\n\nChanging Your Prepared Spells. Whenever you gain a Sorcerer level, you can replace one spell on your list with another Sorcerer spell for which you have spell slots.\n\nSpellcasting Ability. Charisma is your spellcasting ability for your Sorcerer spells.\n\nSpellcasting Focus. You can use an Arcane Focus as a Spellcasting Focus for your Sorcerer spells.",
        },
        {
          id: "sorcerer-1-innate-sorcery",
          name: "Innate Sorcery",
          description:
            "An event in your past left an indelible mark on you, infusing you with simmering magic. As a Bonus Action, you can unleash that magic for 1 minute, during which you gain the following benefits:\n- The spell save DC of your Sorcerer spells increases by 1.\n- You have Advantage on the attack rolls of Sorcerer spells you cast.\n\nYou can use this feature twice, and you regain all expended uses of it when you finish a Long Rest.",
          actionType: "Bonus Action",
          recovery: "Long Rest",
          duration: "1 minute",
          uses: "2",
        },
      ],
      "2": [
        {
          id: "sorcerer-2-font-of-magic",
          name: "Font of Magic",
          description:
            "You can tap into the wellspring of magic within yourself. This wellspring is represented by Sorcery Points, which allow you to create a variety of magical effects. You have 2 Sorcery Points, and you gain more as you reach higher levels... You regain all expended Sorcery Points when you finish a Long Rest.\n\nConverting Spell Slots to Sorcery Points. You can expend a spell slot to gain a number of Sorcery Points equal to the slot's level (no action required).\n\nCreating Spell Slots. As a Bonus Action, you can transform unexpended Sorcery Points into one spell slot. The Creating Spell Slots table shows the cost of creating a spell slot of a given level, and it lists the minimum Sorcerer level you must be to create a slot. You can create a spell slot no higher than level 5. Any spell slot you create with this feature vanishes when you finish a Long Rest.",
          recovery: "Long Rest",
        },
        {
          id: "sorcerer-2-metamagic",
          name: "Metamagic",
          description:
            "Because your magic flows from within, you can alter your spells to suit your needs; you gain two Metamagic options of your choice from \"Metamagic Options\" later in this class's description. You use the chosen options to temporarily modify spells you cast. To use an option, you must spend the number of Sorcery Points that it costs.\n\nYou can use only one Metamagic option on a spell when you cast it unless otherwise noted in one of those options.\n\nWhenever you gain a Sorcerer level, you can replace one of your Metamagic options with one you don't know. You gain two more options at Sorcerer level 10 and two more at Sorcerer level 17.",
          options: [
            {
              id: "metamagic-options",
              name: "Metamagic Options",
              description: "Choose Metamagic options.",
              choices: [
                {
                  id: "careful-spell",
                  name: "Careful Spell",
                  description:
                    "When you cast a spell that forces other creatures to make a saving throw, you can protect some of those creatures from the spell's full force. To do so, spend 1 Sorcery Point and choose a number of those creatures up to your Charisma modifier (minimum of one creature). A chosen creature automatically succeeds on its saving throw against the spell, and it takes no damage if it would normally take half damage on a successful save.",
                },
                {
                  id: "distant-spell",
                  name: "Distant Spell",
                  description:
                    "When you cast a spell that has a range of at least 5 feet, you can spend 1 Sorcery Point to double the spell's range. Or when you cast a spell that has a range of Touch, you can spend 1 Sorcery Point to make the spell's range 30 feet.",
                },
                {
                  id: "empowered-spell",
                  name: "Empowered Spell",
                  description:
                    "When you roll damage for a spell, you can spend 1 Sorcery Point to reroll a number of the damage dice up to your Charisma modifier (minimum of one), and you must use the new rolls. You can use Empowered Spell even if you've already used a different Metamagic option during the casting of the spell.",
                },
                {
                  id: "extended-spell",
                  name: "Extended Spell",
                  description:
                    "When you cast a spell that has a duration of 1 minute or longer, you can spend 1 Sorcery Point to double its duration to a maximum duration of 24 hours. If the affected spell requires Concentration, you have Advantage on any saving throw you make to maintain that Concentration.",
                },
                {
                  id: "heightened-spell",
                  name: "Heightened Spell",
                  description:
                    "When you cast a spell that forces a creature to make a saving throw, you can spend 2 Sorcery Points to give one target of the spell Disadvantage on saves against the spell.",
                },
                {
                  id: "quickened-spell",
                  name: "Quickened Spell",
                  description:
                    "When you cast a spell that has a casting time of an action, you can spend 2 Sorcery Points to change the casting time to a Bonus Action for this casting. You can't modify a spell in this way if you've already cast a level 1+ spell on the current turn, nor can you cast a level 1+ spell on this turn after modifying a spell in this way.",
                },
                {
                  id: "seeking-spell",
                  name: "Seeking Spell",
                  description:
                    "If you make an attack roll for a spell and miss, you can spend 1 Sorcery Point to reroll the d20, and you must use the new roll. You can use Seeking Spell even if you've already used a different Metamagic option during the casting of the spell.",
                },
                {
                  id: "subtle-spell",
                  name: "Subtle Spell",
                  description:
                    "When you cast a spell, you can spend 1 Sorcery Point to cast it without any Verbal, Somatic, or Material components, except Material components that are consumed by the spell or that have a cost specified in the spell.",
                },
                {
                  id: "transmuted-spell",
                  name: "Transmuted Spell",
                  description:
                    "When you cast a spell that deals a type of damage from the following list, you can spend 1 Sorcery Point to change that damage type to one of the other listed types: Acid, Cold, Fire, Lightning, Poison, Thunder.",
                },
                {
                  id: "twinned-spell",
                  name: "Twinned Spell",
                  description:
                    "When you cast a spell, such as Charm Person, that can be cast with a higher-level spell slot to target an additional creature, you can spend 1 Sorcery Point to increase the spell's effective level by 1.",
                },
              ],
            },
          ],
        },
      ],
      "3": [
        {
          id: "sorcerer-3-subclass",
          name: "Sorcerer Subclass",
          description:
            "You gain a Sorcerer subclass of your choice. The Aberrant Sorcery, Clockwork Sorcery, Draconic Sorcery, and Wild Magic Sorcery subclasses are detailed after this class's description. A subclass is a specialization that grants you features at certain Sorcerer levels. For the rest of your career, you gain each of your subclass's features that are of your Sorcerer level or lower.",
        },
      ],
      "4": [
        {
          id: "sorcerer-4-asi",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify. You gain this feature again at Sorcerer levels 8, 12, and 16.",
        },
      ],
      "5": [
        {
          id: "sorcerer-5-sorcerous-restoration",
          name: "Sorcerous Restoration",
          description:
            "When you finish a Short Rest, you can regain expended Sorcery Points, but no more than a number equal to half your Sorcerer level (round down). Once you use this feature, you can't do so again until you finish a Long Rest.",
          recovery: "Short Rest",
        },
      ],
      "6": [
        {
          id: "sorcerer-6-subclass-feature",
          name: "Subclass Feature",
          description: "You gain a feature from your Sorcerer subclass.",
        },
      ],
      "7": [
        {
          id: "sorcerer-7-sorcery-incarnate",
          name: "Sorcery Incarnate",
          description:
            "If you have no uses of Innate Sorcery left, you can use it if you spend 2 Sorcery Points when you take the Bonus Action to activate it.\n\nIn addition, while your Innate Sorcery feature is active, you can use up to two of your Metamagic options on each spell you cast.",
          actionType: "Bonus Action",
        },
      ],
      "8": [
        {
          id: "sorcerer-8-asi",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
        },
      ],
      "9": [],
      "10": [
        {
          id: "sorcerer-10-metamagic",
          name: "Metamagic",
          description: "You gain two more Metamagic options of your choice.",
        },
      ],
      "11": [],
      "12": [
        {
          id: "sorcerer-12-asi",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
        },
      ],
      "13": [],
      "14": [
        {
          id: "sorcerer-14-subclass-feature",
          name: "Subclass Feature",
          description: "You gain a feature from your Sorcerer subclass.",
        },
      ],
      "15": [],
      "16": [
        {
          id: "sorcerer-16-asi",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
        },
      ],
      "17": [
        {
          id: "sorcerer-17-metamagic",
          name: "Metamagic",
          description: "You gain two more Metamagic options of your choice.",
        },
      ],
      "18": [
        {
          id: "sorcerer-18-subclass-feature",
          name: "Subclass Feature",
          description: "You gain a feature from your Sorcerer subclass.",
        },
      ],
      "19": [
        {
          id: "sorcerer-19-epic-boon",
          name: "Epic Boon",
          description:
            "You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Dimensional Travel is recommended.",
        },
      ],
      "20": [
        {
          id: "sorcerer-20-arcane-apotheosis",
          name: "Arcane Apotheosis",
          description:
            "While your Innate Sorcery feature is active, you can use one Metamagic option on each of your turns without spending Sorcery Points on it.",
        },
      ],
    },
    subclasses: [],
    source: "Player's Handbook (2024)",
  },
  {
    id: "warlock",
    name: "Warlock",
    className: "Warlock",
    description:
      "Warlocks quest for knowledge that lies hidden in the fabric of the multiverse. They often begin their search for magical power by delving into tomes of forbidden lore, dabbling in invocations meant to attract the power of extraplanar beings, or seeking places of power where the influence of these beings can be felt.",
    primaryAbility: ["Charisma"],
    hitPoints: {
      hitDice: 8,
      hitDiceType: "d8",
      hpAtFirstLevel: "8 + your Constitution modifier",
      hpAtHigherLevels: "1d8 (or 5) + your Constitution modifier per Warlock level after 1st",
    },
    proficiencies: {
      savingThrows: ["Wisdom", "Charisma"],
      skills: {
        choose: 2,
        options: [
          "Arcana",
          "Deception",
          "History",
          "Intimidation",
          "Investigation",
          "Nature",
          "Religion",
        ],
      },
      weapons: ["Simple weapons"],
      armor: ["Light armor"],
      tools: [],
    },
    startingEquipment: {
      defaultBundle: [
        "Leather Armor",
        "Sickle",
        "2 Daggers",
        "Arcane Focus (orb)",
        "Book (occult lore)",
        "Scholar's Pack",
        "15 GP",
      ],
      goldAlternative: "100 GP",
    },
    spellcasting: {
      ability: "Charisma",
      casterType: "Pact",
      preparationType: "Prepared",
      spellcastingFocus: ["Arcane Focus"],
      slotsByLevel: {
        "1": [1, 0, 0, 0, 0, 0, 0, 0, 0],
        "2": [2, 0, 0, 0, 0, 0, 0, 0, 0],
        "3": [0, 2, 0, 0, 0, 0, 0, 0, 0],
        "4": [0, 2, 0, 0, 0, 0, 0, 0, 0],
        "5": [0, 0, 2, 0, 0, 0, 0, 0, 0],
        "6": [0, 0, 2, 0, 0, 0, 0, 0, 0],
        "7": [0, 0, 0, 2, 0, 0, 0, 0, 0],
        "8": [0, 0, 0, 2, 0, 0, 0, 0, 0],
        "9": [0, 0, 0, 0, 2, 0, 0, 0, 0],
        "10": [0, 0, 0, 0, 2, 0, 0, 0, 0],
        "11": [0, 0, 0, 0, 3, 0, 0, 0, 0],
        "12": [0, 0, 0, 0, 3, 0, 0, 0, 0],
        "13": [0, 0, 0, 0, 3, 0, 0, 0, 0],
        "14": [0, 0, 0, 0, 3, 0, 0, 0, 0],
        "15": [0, 0, 0, 0, 3, 0, 0, 0, 0],
        "16": [0, 0, 0, 0, 3, 0, 0, 0, 0],
        "17": [0, 0, 0, 0, 4, 0, 0, 0, 0],
        "18": [0, 0, 0, 0, 4, 0, 0, 0, 0],
        "19": [0, 0, 0, 0, 4, 0, 0, 0, 0],
        "20": [0, 0, 0, 0, 4, 0, 0, 0, 0],
      },
      cantripsKnownByLevel: {
        "1": 2,
        "2": 2,
        "3": 2,
        "4": 3,
        "5": 3,
        "6": 3,
        "7": 3,
        "8": 3,
        "9": 3,
        "10": 4,
        "11": 4,
        "12": 4,
        "13": 4,
        "14": 4,
        "15": 4,
        "16": 4,
        "17": 4,
        "18": 4,
        "19": 4,
        "20": 4,
      },
      spellsPreparedByLevel: {
        "1": 2,
        "2": 3,
        "3": 4,
        "4": 5,
        "5": 6,
        "6": 7,
        "7": 8,
        "8": 9,
        "9": 10,
        "10": 10,
        "11": 11,
        "12": 11,
        "13": 12,
        "14": 12,
        "15": 13,
        "16": 13,
        "17": 14,
        "18": 14,
        "19": 15,
        "20": 15,
      },
    },
    multiclassing: {
      requirements: [
        {
          ability: "Charisma",
          minScore: 13,
        },
      ],
      proficienciesGained: {
        armor: ["Light armor"],
      },
    },
    featuresByLevel: {
      "1": [
        {
          id: "warlock-1-1",
          name: "Eldritch Invocations",
          description:
            "You have unearthed Eldritch Invocations, pieces of forbidden knowledge that imbue you with an abiding magical ability or other lessons. You gain one invocation of your choice, such as Pact of the Tome.",
        },
        {
          id: "warlock-1-2",
          name: "Pact Magic",
          description:
            "Through occult ceremony, you have formed a pact with a mysterious entity to gain magical powers. The entity is a voice in the shadows—its identity unclear—but its boon to you is concrete: the ability to cast spells.",
        },
      ],
      "2": [
        {
          id: "warlock-2-1",
          name: "Magical Cunning",
          description:
            "You can perform an esoteric rite for 1 minute. At the end of it, you regain expended Pact Magic spell slots but no more than a number equal to half your maximum (round up).",
          actionType: "Special",
          duration: "1 minute",
          recovery: "Long Rest",
          uses: "1",
        },
      ],
      "3": [
        {
          id: "warlock-3-1",
          name: "Warlock Subclass",
          description:
            "You gain a Warlock subclass of your choice. A subclass is a specialization that grants you features at certain Warlock levels.",
        },
      ],
      "4": [
        {
          id: "warlock-4-1",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify. You gain this feature again at Warlock levels 8, 12, and 16.",
        },
      ],
      "5": [],
      "6": [
        {
          id: "warlock-6-1",
          name: "Subclass Feature",
          description: "You gain a feature from your Warlock subclass.",
        },
      ],
      "7": [],
      "8": [
        {
          id: "warlock-8-1",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
        },
      ],
      "9": [
        {
          id: "warlock-9-1",
          name: "Contact Patron",
          description:
            "In the past, you usually contacted your patron through intermediaries. Now you can communicate directly; you always have the Contact Other Plane spell prepared. With this feature, you can cast the spell without expending a spell slot to contact your patron, and you automatically succeed on the spell's saving throw.",
          actionType: "Action",
          recovery: "Long Rest",
          uses: "1",
        },
      ],
      "10": [
        {
          id: "warlock-10-1",
          name: "Subclass Feature",
          description: "You gain a feature from your Warlock subclass.",
        },
      ],
      "11": [
        {
          id: "warlock-11-1",
          name: "Mystic Arcanum (Level 6)",
          description:
            "Your patron grants you a magical secret called an arcanum. Choose one level 6 Warlock spell as this arcanum. You can cast your arcanum spell once without expending a spell slot, and you must finish a Long Rest before you can cast it in this way again.",
          actionType: "Action",
          recovery: "Long Rest",
          uses: "1",
        },
      ],
      "12": [
        {
          id: "warlock-12-1",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
        },
      ],
      "13": [
        {
          id: "warlock-13-1",
          name: "Mystic Arcanum (Level 7)",
          description:
            "Choose one level 7 Warlock spell as your arcanum. You can cast your arcanum spell once without expending a spell slot, and you must finish a Long Rest before you can cast it in this way again.",
          actionType: "Action",
          recovery: "Long Rest",
          uses: "1",
        },
      ],
      "14": [
        {
          id: "warlock-14-1",
          name: "Subclass Feature",
          description: "You gain a feature from your Warlock subclass.",
        },
      ],
      "15": [
        {
          id: "warlock-15-1",
          name: "Mystic Arcanum (Level 8)",
          description:
            "Choose one level 8 Warlock spell as your arcanum. You can cast your arcanum spell once without expending a spell slot, and you must finish a Long Rest before you can cast it in this way again.",
          actionType: "Action",
          recovery: "Long Rest",
          uses: "1",
        },
      ],
      "16": [
        {
          id: "warlock-16-1",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
        },
      ],
      "17": [
        {
          id: "warlock-17-1",
          name: "Mystic Arcanum (Level 9)",
          description:
            "Choose one level 9 Warlock spell as your arcanum. You can cast your arcanum spell once without expending a spell slot, and you must finish a Long Rest before you can cast it in this way again.",
          actionType: "Action",
          recovery: "Long Rest",
          uses: "1",
        },
      ],
      "18": [],
      "19": [
        {
          id: "warlock-19-1",
          name: "Epic Boon",
          description:
            "You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Fate is recommended.",
        },
      ],
      "20": [
        {
          id: "warlock-20-1",
          name: "Eldritch Master",
          description:
            "When you use your Magical Cunning feature, you regain all your expended Pact Magic spell slots.",
        },
      ],
    },
    classTable: {
      headers: [
        "Level",
        "Proficiency Bonus",
        "Features",
        "Eldritch Invocations",
        "Cantrips",
        "Prepared Spells",
        "Spell Slots",
        "Slot Level",
      ],
      rows: [
        ["1", "+2", "Eldritch Invocations, Pact Magic", "1", "2", "2", "1", "1"],
        ["2", "+2", "Magical Cunning", "2", "2", "3", "2", "1"],
        ["3", "+2", "Warlock Subclass", "3", "2", "4", "2", "2"],
        ["4", "+2", "Ability Score Improvement", "3", "3", "5", "2", "2"],
        ["5", "+3", "-", "5", "3", "6", "2", "3"],
        ["6", "+3", "Subclass feature", "5", "3", "7", "2", "3"],
        ["7", "+3", "-", "6", "3", "8", "2", "4"],
        ["8", "+3", "Ability Score Improvement", "6", "3", "9", "2", "4"],
        ["9", "+4", "Contact Patron", "7", "3", "10", "2", "5"],
        ["10", "+4", "Subclass feature", "7", "4", "10", "2", "5"],
        ["11", "+4", "Mystic Arcanum (level 6 spell)", "7", "4", "11", "3", "5"],
        ["12", "+4", "Ability Score Improvement", "8", "4", "11", "3", "5"],
        ["13", "+5", "Mystic Arcanum (level 7 spell)", "8", "4", "12", "3", "5"],
        ["14", "+5", "Subclass feature", "8", "4", "12", "3", "5"],
        ["15", "+5", "Mystic Arcanum (level 8 spell)", "9", "4", "13", "3", "5"],
        ["16", "+5", "Ability Score Improvement", "9", "4", "13", "3", "5"],
        ["17", "+6", "Mystic Arcanum (level 9 spell)", "9", "4", "14", "4", "5"],
        ["18", "+6", "-", "10", "4", "14", "4", "5"],
        ["19", "+6", "Epic Boon", "10", "4", "15", "4", "5"],
        ["20", "+6", "Eldritch Master", "10", "4", "15", "4", "5"],
      ],
    },
    subclasses: [],
    source: "Player's Handbook (2024)",
  },
  {
    multiclassing: {
      requirements: [
        {
          minScore: 13,
          ability: "Intelligence",
        },
      ],
      proficienciesGained: {},
    },
    id: "wizard",
    proficiencies: {
      savingThrows: ["Intelligence", "Wisdom"],
      tools: [],
      weapons: ["Simple weapons"],
      armor: [],
      skills: {
        options: [
          "Arcana",
          "History",
          "Insight",
          "Investigation",
          "Medicine",
          "Nature",
          "Religion",
        ],
        choose: 2,
      },
    },
    featuresByLevel: {
      "1": [
        {
          description:
            "As a student of arcane magic, you have learned to cast spells. You have a spellbook containing your level 1+ spells. You know 3 Wizard cantrips and can replace one on a Long Rest.",
          name: "Spellcasting",
          id: "wizard-1-spellcasting",
        },
        {
          description:
            "You can cast any spell as a Ritual if that spell has the Ritual tag and the spell is in your spellbook. You needn't have the spell prepared, but you must read from the book to cast a spell in this way.",
          name: "Ritual Adept",
          id: "wizard-1-ritual-adept",
        },
        {
          recovery: "Long Rest",
          description:
            "You can regain some of your magical energy by studying your spellbook. When you finish a Short Rest, you can choose expended spell slots to recover. The spell slots can have a combined level equal to no more than half your Wizard level (round up), and none of the slots can be level 6 or higher. Once you use this feature, you can't do so again until you finish a Long Rest.",
          name: "Arcane Recovery",
          id: "wizard-1-arcane-recovery",
        },
      ],
      "2": [
        {
          description:
            "While studying magic, you also specialized in another field of study. Choose one of the following skills in which you have proficiency: Arcana, History, Investigation, Medicine, Nature, or Religion. You have Expertise in the chosen skill.",
          name: "Scholar",
          id: "wizard-2-scholar",
        },
      ],
      "3": [
        {
          description:
            "You gain a Wizard subclass of your choice. A subclass is a specialization that grants you features at certain Wizard levels. For the rest of your career, you gain each of your subclass's features that are of your Wizard level or lower.",
          name: "Wizard Subclass",
          id: "wizard-3-subclass",
        },
      ],
      "4": [
        {
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify. You gain this feature again at Wizard levels 8, 12, and 16.",
          name: "Ability Score Improvement",
          id: "wizard-4-asi",
        },
      ],
      "5": [
        {
          description:
            "Whenever you finish a Short Rest, you can study your spell book and replace one of the level 1+ Wizard spells you have prepared for your Spellcasting feature with another level 1+ spell from the book.",
          name: "Memorize Spell",
          id: "wizard-5-memorize-spell",
        },
      ],
      "6": [
        {
          description: "You gain a feature from your Wizard subclass.",
          name: "Subclass feature",
          id: "wizard-6-subclass",
        },
      ],
      "7": [],
      "8": [
        {
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
          name: "Ability Score Improvement",
          id: "wizard-8-asi",
        },
      ],
      "9": [],
      "10": [
        {
          description: "You gain a feature from your Wizard subclass.",
          name: "Subclass feature",
          id: "wizard-10-subclass",
        },
      ],
      "11": [],
      "12": [
        {
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
          name: "Ability Score Improvement",
          id: "wizard-12-asi",
        },
      ],
      "13": [],
      "14": [
        {
          description: "You gain a feature from your Wizard subclass.",
          name: "Subclass feature",
          id: "wizard-14-subclass",
        },
      ],
      "15": [],
      "16": [
        {
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
          name: "Ability Score Improvement",
          id: "wizard-16-asi",
        },
      ],
      "17": [],
      "18": [
        {
          description:
            "You have achieved such mastery over certain spells that you can cast them at will. Choose a level 1 and a level 2 spell in your spellbook that have a casting time of an action. You always have those spells prepared, and you can cast them at their lowest level without expending a spell slot. To cast either spell at a higher level, you must expend a spell slot. Whenever you finish a Long Rest, you can study your spellbook and replace one of those spells with an eligible spell of the same level from the book.",
          name: "Spell Mastery",
          id: "wizard-18-spell-mastery",
        },
      ],
      "19": [
        {
          description:
            "You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Spell Recall is recommended.",
          name: "Epic Boon",
          id: "wizard-19-epic-boon",
        },
      ],
      "20": [
        {
          recovery: "Short or Long Rest",
          description:
            "Choose two level 3 spells in your spellbook as your signature spells. You always have these spells prepared, and you can cast each of them once at level 3 without expending a spell slot. When you do so, you can't cast them in this way again until you finish a Short or Long Rest. To cast either spell at a higher level, you must expend a spell slot.",
          name: "Signature Spells",
          id: "wizard-20-signature-spells",
        },
      ],
    },
    name: "Wizard",
    subclasses: [
      {
        id: "abjurationist",
        name: "Abjurationist",
        description:
          '*Defend Allies and Disable Enemy Magic. Compare to the core book’s Abjurer.*\n\nCommon folk often distrust wizards as reckless due to their penchant for exploring matters that mortals should best leave alone. Rogues and warriors may cause trouble now and again, but it takes a spellcaster to summon rampaging fiends from another dimension. Practitioners of the school of abjuring and warding can be called many things, but reckless is not one of them. Known as Abjurationists, these wizards pride themselves on preparing for the worst case in any magical situation, and they wouldn’t dare summon an extraplanar horror until they have triple checked their salt circles and set up various contingencies to banish the beast before it can go on a rampage. When a baleful spirit needs exorcizing or a vault needs protection from sorcerous snooping, an Abjurationist will be at the ready to proclaim: "But this rough magic I here abjure!"',
        source: "Player's Handbook (2014)",
        featuresByLevel: {
          "1": [
            {
              id: "spellcasting",
              name: "Spellcasting",
              description:
                "You have learned how to channel magical energy through objects. See the Player’s Handbook for the rules on spellcasting. The information below details how you use those rules with Artificer spells, which appear in the Artificer spell list later in the class’s description. Tools Required. You produce...",
            },
            {
              id: "tinker-s-magic",
              name: "Tinker’s Magic",
              description:
                "You know the Mending cantrip. As a Magic action while holding Tinker’s Tools, you can create one item in an unoccupied space within 5 feet of yourself, choosing the item from the following list: Ball Bearings Flask Pouch Basket Grappling Hook Rope Bedroll Hunting Trap Sack Bell Jug Shovel Blanket La...",
            },
          ],
          "2": [
            {
              id: "replicate-magic-item",
              name: "Replicate Magic Item",
              description:
                "You have learned arcane plans that you use to make magic items. Plans Known. When you gain this feature, choose four plans to learn from the Magic Item Plans (Artificer Level 2+) table (see the Dungeon Master’s Guide for the items’ descriptions). Bag of Holding, Cap of Water Breathing, Sending Stone...",
            },
          ],
          "3": [
            {
              id: "artificer-subclass",
              name: "Artificer Subclass",
              description:
                "You gain an Artificer subclass of your choice. The Alchemist, Armorer, Artillerist, Battle Smith, and Cartographer subclasses are detailed after this class’s description. A subclass is a specialization that grants you features at certain Artificer levels. For the rest of your career, you gain each o...",
            },
          ],
          "4": [
            {
              id: "ability-score-improvement",
              name: "Ability Score Improvement",
              description:
                "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify. You gain this feature again at Artificer levels 8, 12, and 16.",
            },
          ],
          "5": [],
          "6": [
            {
              id: "magic-item-tinker",
              name: "Magic Item Tinker",
              description:
                "Your Replicate Magic Item feature gains the following options. Charge Magic Item. As a Bonus Action, you can touch a magic item within 5 feet of yourself that you created with Replicate Magic Item and that uses charges. You expend a level 1+ spell slot and recharge the item. The number of charges th...",
            },
          ],
          "7": [
            {
              id: "flash-of-genius",
              name: "Flash of Genius",
              description:
                "When you or a creature you can see within 30 feet of you fails an ability check or a saving throw, you can take a Reaction to add a bonus to the roll, potentially causing it to succeed. The bonus equals your Intelligence modifier (minimum of +1). You can take this Reaction a number of times equal to...",
            },
          ],
          "8": [],
          "9": [],
          "10": [
            {
              id: "magic-item-adept",
              name: "Magic Item Adept",
              description: "You can now attune to up to four magic items at once.",
            },
          ],
          "11": [
            {
              id: "spell-storing-item",
              name: "Spell-Storing Item",
              description:
                "Whenever you finish a Long Rest, you can touch one Simple or Martial weapon or one item that you can use as a Spellcasting Focus, and you store a spell in it, choosing a level 1, 2, or 3 Artificer spell that has a casting time of an action and doesn’t require a Material component that is consumed by...",
            },
          ],
          "12": [],
          "13": [],
          "14": [
            {
              id: "advanced-artifice",
              name: "Advanced Artifice",
              description:
                "You gain the following benefits. Magic Item Savant. You can now attune to up to five magic items at once. Refreshed Genius. When you finish a Short Rest, you regain one expended use of your Flash of Genius feature.",
            },
          ],
          "15": [],
          "16": [],
          "17": [],
          "18": [
            {
              id: "magic-item-master",
              name: "Magic Item Master",
              description: "You can now attune to up to six magic items at once.",
            },
          ],
          "19": [
            {
              id: "epic-boon",
              name: "Epic Boon",
              description:
                "You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Energy Resistance is recommended.",
            },
          ],
          "20": [
            {
              id: "soul-of-artifice",
              name: "Soul of Artifice",
              description:
                "You have developed a mystical connection to your magic items, which you can draw on for aid. You gain the following benefits. Cheat Death. If you’re reduced to 0 Hit Points but not killed outright, you can disintegrate any number of Uncommon or Rare magic items created by your Replicate Magic Item f...",
            },
          ],
        },
        levelChosen: 3,
      },
    ],
    description:
      "Wizards are defined by their exhaustive study of magic's inner workings. They cast spells of explosive fire, arcing lightning, subtle deception, and spectacular transformations.",
    className: "Wizard",
    hitPoints: {
      hitDice: 6,
      hpAtHigherLevels: "1d6 (or 4) + Constitution modifier",
      hpAtFirstLevel: "6 + Constitution modifier",
    },
    startingEquipment: {
      defaultBundle: [
        "2 Daggers",
        "Arcane Focus (Quarterstaff)",
        "Robe",
        "Spellbook",
        "Scholar's Pack",
        "5 GP",
      ],
      goldAlternative: "55 GP",
    },
    epicBoonRecommendation: "Boon of Spell Recall",
    spellcasting: {
      slotsByLevel: {
        "1": [2],
        "2": [3],
        "3": [4, 2],
        "4": [4, 3],
        "5": [4, 3, 2],
        "6": [4, 3, 3],
        "7": [4, 3, 3, 1],
        "8": [4, 3, 3, 2],
        "9": [4, 3, 3, 3, 1],
        "10": [4, 3, 3, 3, 2],
        "11": [4, 3, 3, 3, 2, 1],
        "12": [4, 3, 3, 3, 2, 1],
        "13": [4, 3, 3, 3, 2, 1, 1],
        "14": [4, 3, 3, 3, 2, 1, 1],
        "15": [4, 3, 3, 3, 2, 1, 1, 1],
        "16": [4, 3, 3, 3, 2, 1, 1, 1],
        "17": [4, 3, 3, 3, 2, 1, 1, 1, 1],
        "18": [4, 3, 3, 3, 3, 1, 1, 1, 1],
        "19": [4, 3, 3, 3, 3, 2, 1, 1, 1],
        "20": [4, 3, 3, 3, 3, 2, 2, 1, 1],
      },
      ability: "Intelligence",
      spellsPreparedByLevel: {
        "1": 4,
        "2": 5,
        "3": 6,
        "4": 7,
        "5": 9,
        "6": 10,
        "7": 11,
        "8": 12,
        "9": 14,
        "10": 15,
        "11": 16,
        "12": 16,
        "13": 17,
        "14": 18,
        "15": 19,
        "16": 21,
        "17": 22,
        "18": 23,
        "19": 24,
        "20": 25,
      },
      casterType: "Full",
      cantripsKnownByLevel: {
        "1": 3,
        "2": 3,
        "3": 3,
        "4": 4,
        "5": 4,
        "6": 4,
        "7": 4,
        "8": 4,
        "9": 4,
        "10": 5,
        "11": 5,
        "12": 5,
        "13": 5,
        "14": 5,
        "15": 5,
        "16": 5,
        "17": 5,
        "18": 5,
        "19": 5,
        "20": 5,
      },
      spellcastingFocus: ["Arcane Focus", "Spellbook"],
      preparationType: "Spellbook",
      ritualCasting: true,
    },
    primaryAbility: ["Intelligence"],
    subclassTitle: "Wizard Subclass",
    source: "Player's Handbook (2024)",
  },
  {
    id: "artificer",
    name: "Artificer",
    className: "Artificer",
    description:
      "Masters of invention, artificers use ingenuity and magic to unlock extraordinary capabilities in objects. They see magic as a complex system waiting to be decoded and then harnessed in their spells and inventions.",
    primaryAbility: ["Intelligence"],
    hitPoints: {
      hitDice: 8,
      hitDiceType: "d8",
      hpAtFirstLevel: "8 + Constitution modifier",
      hpAtHigherLevels: "1d8 (or 5) + Constitution modifier",
    },
    proficiencies: {
      savingThrows: ["Constitution", "Intelligence"],
      skills: {
        choose: 2,
        options: [
          "Arcana",
          "History",
          "Investigation",
          "Medicine",
          "Nature",
          "Perception",
          "Sleight of Hand",
        ],
      },
      weapons: ["Simple weapons"],
      armor: ["Light armor", "Medium armor", "Shields"],
      tools: ["Thieves' Tools", "Tinker's Tools"],
      toolChoice: {
        choose: 1,
        options: ["Artisan's Tools"],
      },
    },
    startingEquipment: {
      defaultBundle: [
        "Studded Leather Armor",
        "Dagger",
        "Thieves' Tools",
        "Tinker's Tools",
        "Dungeoneer's Pack",
        "16 GP",
      ],
      goldAlternative: "150 GP",
    },
    spellcasting: {
      ability: "Intelligence",
      casterType: "Half",
      preparationType: "Prepared",
      spellcastingFocus: ["Thieves' Tools", "Tinker's Tools", "Artisan's Tools"],
      slotsByLevel: {
        "1": [2],
        "2": [2],
        "3": [3],
        "4": [3],
        "5": [4, 2],
        "6": [4, 2],
        "7": [4, 3],
        "8": [4, 3],
        "9": [4, 3, 2],
        "10": [4, 3, 2],
        "11": [4, 3, 3],
        "12": [4, 3, 3],
        "13": [4, 3, 3, 1],
        "14": [4, 3, 3, 1],
        "15": [4, 3, 3, 2],
        "16": [4, 3, 3, 2],
        "17": [4, 3, 3, 3, 1],
        "18": [4, 3, 3, 3, 1],
        "19": [4, 3, 3, 3, 2],
        "20": [4, 3, 3, 3, 2],
      },
      cantripsKnownByLevel: {
        "1": 2,
        "2": 2,
        "3": 2,
        "4": 2,
        "5": 2,
        "6": 2,
        "7": 2,
        "8": 2,
        "9": 2,
        "10": 3,
        "11": 3,
        "12": 3,
        "13": 3,
        "14": 4,
        "15": 4,
        "16": 4,
        "17": 4,
        "18": 4,
        "19": 4,
        "20": 4,
      },
      spellsPreparedByLevel: {
        "1": 2,
        "2": 2,
        "3": 3,
        "4": 3,
        "5": 4,
        "6": 4,
        "7": 5,
        "8": 5,
        "9": 6,
        "10": 6,
        "11": 7,
        "12": 7,
        "13": 8,
        "14": 8,
        "15": 9,
        "16": 9,
        "17": 10,
        "18": 10,
        "19": 11,
        "20": 11,
      },
    },
    epicBoonRecommendation: "Boon of Energy Resistance",
    multiclassing: {
      requirements: [
        {
          ability: "Intelligence",
          minScore: 13,
        },
      ],
      proficienciesGained: {
        armor: ["Light armor", "Medium armor", "Shields"],
        tools: ["Tinker's Tools"],
        skills: {
          choose: 1,
          options: [
            "Arcana",
            "History",
            "Investigation",
            "Medicine",
            "Nature",
            "Perception",
            "Sleight of Hand",
          ],
        },
      },
    },
    featuresByLevel: {
      "1": [
        {
          id: "artificer-spellcasting-1",
          name: "Spellcasting",
          description:
            "You have learned how to channel magical energy through objects. See the Player's Handbook for the rules on spellcasting. You produce your Artificer spells through tools. You can use Thieves' Tools, Tinker's Tools, or another kind of Artisan's Tools with which you have proficiency as a Spellcasting Focus, and you must have one of those focuses in hand when you cast an Artificer spell.",
        },
        {
          id: "artificer-tinkers-magic-1",
          name: "Tinker's Magic",
          description:
            "You know the Mending cantrip. As a Magic action while holding Tinker's Tools, you can create one item in an unoccupied space within 5 feet of yourself. The item lasts until you finish a Long Rest, at which point it vanishes. You can use this feature a number of times equal to your Intelligence modifier (minimum of once), and you regain all expended uses when you finish a Long Rest.",
          actionType: "Action",
          recovery: "Long Rest",
          uses: "Intelligence modifier per Long Rest",
        },
      ],
      "2": [
        {
          id: "artificer-replicate-magic-item-2",
          name: "Replicate Magic Item",
          description:
            "You have learned arcane plans that you use to make magic items. When you finish a Long Rest, you can create one or two different magic items if you have Tinker's Tools in hand. Each item is based on one of the plans you know for this feature.",
        },
      ],
      "3": [
        {
          id: "artificer-subclass-3",
          name: "Artificer Subclass",
          description:
            "You gain an Artificer subclass of your choice. A subclass is a specialization that grants you features at certain Artificer levels.",
        },
      ],
      "4": [
        {
          id: "artificer-asi-4",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
        },
      ],
      "5": [
        {
          id: "artificer-subclass-feature-5",
          name: "Subclass Feature",
          description: "You gain a feature from your Artificer subclass.",
        },
      ],
      "6": [
        {
          id: "artificer-magic-item-tinker-6",
          name: "Magic Item Tinker",
          description:
            "Your Replicate Magic Item feature gains the following options.\nCharge Magic Item. As a Bonus Action, you can touch a magic item within 5 feet of yourself that you created with Replicate Magic Item and that uses charges. You expend a level 1+ spell slot and recharge the item.\nDrain Magic Item. As a Bonus Action, you can touch a magic item within 5 feet of yourself that you created with Replicate Magic Item and cause the item to vanish, converting its magical energy into a spell slot.\nTransmute Magic Item. As a Magic action, you can touch one magic item within 5 feet of yourself that you created with Replicate Magic Item and transform it into a different magic item.",
          actionType: "Bonus Action",
          recovery: "Long Rest",
        },
      ],
      "7": [
        {
          id: "artificer-flash-of-genius-7",
          name: "Flash of Genius",
          description:
            "When you or a creature you can see within 30 feet of you fails an ability check or a saving throw, you can take a Reaction to add a bonus to the roll, potentially causing it to succeed. The bonus equals your Intelligence modifier (minimum of +1). You can take this Reaction a number of times equal to your Intelligence modifier (minimum of once). You regain all expended uses when you finish a Long Rest.",
          actionType: "Reaction",
          recovery: "Long Rest",
          uses: "Intelligence modifier per Long Rest",
        },
      ],
      "8": [
        {
          id: "artificer-asi-8",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
        },
      ],
      "9": [
        {
          id: "artificer-subclass-feature-9",
          name: "Subclass Feature",
          description: "You gain a feature from your Artificer subclass.",
        },
      ],
      "10": [
        {
          id: "artificer-magic-item-adept-10",
          name: "Magic Item Adept",
          description: "You can now attune to up to four magic items at once.",
        },
      ],
      "11": [
        {
          id: "artificer-spell-storing-item-11",
          name: "Spell-Storing Item",
          description:
            "Whenever you finish a Long Rest, you can touch one Simple or Martial weapon or one item that you can use as a Spellcasting Focus, and you store a spell in it, choosing a level 1, 2, or 3 Artificer spell that has a casting time of an action and doesn't require a Material component that is consumed by the spell.",
          recovery: "Long Rest",
          uses: "Twice your Intelligence modifier",
        },
      ],
      "12": [
        {
          id: "artificer-asi-12",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
        },
      ],
      "13": [],
      "14": [
        {
          id: "artificer-advanced-artifice-14",
          name: "Advanced Artifice",
          description:
            "You gain the following benefits.\nMagic Item Savant. You can now attune to up to five magic items at once.\nRefreshed Genius. When you finish a Short Rest, you regain one expended use of your Flash of Genius feature.",
          recovery: "Short Rest",
        },
      ],
      "15": [
        {
          id: "artificer-subclass-feature-15",
          name: "Subclass Feature",
          description: "You gain a feature from your Artificer subclass.",
        },
      ],
      "16": [
        {
          id: "artificer-asi-16",
          name: "Ability Score Improvement",
          description:
            "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.",
        },
      ],
      "17": [],
      "18": [
        {
          id: "artificer-magic-item-master-18",
          name: "Magic Item Master",
          description: "You can now attune to up to six magic items at once.",
        },
      ],
      "19": [
        {
          id: "artificer-epic-boon-19",
          name: "Epic Boon",
          description:
            "You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Energy Resistance is recommended.",
        },
      ],
      "20": [
        {
          id: "artificer-soul-of-artifice-20",
          name: "Soul of Artifice",
          description:
            "You have developed a mystical connection to your magic items, which you can draw on for aid. You gain the following benefits.\nCheat Death. If you're reduced to 0 Hit Points but not killed outright, you can disintegrate any number of Uncommon or Rare magic items created by your Replicate Magic Item feature. If you do so, your Hit Points instead change to a number equal to 20 times the number of magic items disintegrated.\nMagical Guidance. When you finish a Short Rest, you regain all expended uses of your Flash of Genius if you have Attunement to at least one magic item.",
          recovery: "Short Rest",
        },
      ],
    },
    subclasses: [
      {
        id: "alchemist",
        name: "Alchemist",
        description: "An Artificer specialized as a Alchemist.",
        levelChosen: 3,
      },
      {
        id: "armorer",
        name: "Armorer",
        description: "An Artificer specialized as a Armorer.",
        levelChosen: 3,
      },
      {
        id: "artillerist",
        name: "Artillerist",
        description: "An Artificer specialized as a Artillerist.",
        levelChosen: 3,
      },
      {
        id: "battle-smith",
        name: "Battle Smith",
        description: "An Artificer specialized as a Battle Smith.",
        levelChosen: 3,
      },
      {
        id: "cartographer",
        name: "Cartographer",
        description: "An Artificer specialized as a Cartographer.",
        levelChosen: 3,
      },
    ],
  },
];
