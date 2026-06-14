const fs = require("fs");

const classNames = [
  "Artificer",
  "Barbarian",
  "Bard",
  "Cleric",
  "Druid",
  "Fighter",
  "Monk",
  "Paladin",
  "Ranger",
  "Rogue",
  "Sorcerer",
  "Warlock",
  "Wizard",
];

const classesArray = classNames.map((name) => {
  return {
    id: name.toLowerCase(),
    name: name,
    className: name,
    description: `The 2024 updated ${name} class.`,
    primaryAbility: ["Strength"], // Placeholder
    hitPoints: {
      hitDice: 8,
      hitDiceType: "d8",
      hpAtFirstLevel: "8 + Constitution modifier",
      hpAtHigherLevels: "5 (or 1d8) + Constitution modifier per level after 1st",
    },
    proficiencies: {
      savingThrows: [],
      skills: { choose: 2, options: [] },
      weapons: [],
      armor: [],
      tools: [],
    },
    startingEquipment: {
      defaultBundle: [],
      goldAlternative: "5d4 x 10 gp",
    },
    featuresByLevel: {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
      8: [],
      9: [],
      10: [],
      11: [],
      12: [],
      13: [],
      14: [],
      15: [],
      16: [],
      17: [],
      18: [],
      19: [],
      20: [],
    },
    subclasses: [],
  };
});

const content = `import { SRDClass } from './index';\n\nexport const classes: SRDClass[] = ${JSON.stringify(classesArray, null, 2)};\n`;

fs.writeFileSync("src/data/srd/classes.ts", content);
console.log("Successfully generated 2024 class scaffolds in classes.ts");
