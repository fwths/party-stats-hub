import fs from "fs";

const data = JSON.parse(fs.readFileSync("char-97349530.json", "utf8")).data;

console.log("Character Name:", data.name);
console.log("Level:", data.level);

// Let's compute Proficiency Bonus
const getProficiencyBonus = (level) => {
  return Math.floor((level - 1) / 4) + 2;
};
const pb = getProficiencyBonus(data.level ?? 1);
console.log("Proficiency Bonus (computed):", pb);

// Let's see classes
const classes = data.classes.map((c) => `${c.definition.name} ${c.level}`).join(", ");
console.log("Classes:", classes);

// Let's see the parsed result from the loadParty loader
// Let's run loadParty or search how it computes Qemuel's skill modifier
