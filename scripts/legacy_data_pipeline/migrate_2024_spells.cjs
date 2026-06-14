const fs = require("fs");
const { parse } = require("csv-parse/sync");

const spellsFile = "src/data/srd/spells.ts";
let existingSpellsStr = fs.readFileSync(spellsFile, "utf8");

const startIndex = existingSpellsStr.indexOf("[");
const endIndex = existingSpellsStr.lastIndexOf("]");
let existingSpells = eval("(" + existingSpellsStr.substring(startIndex, endIndex + 1) + ")");

const csvPath = "2024_spells_repo/DnD-5e-2024-Spells-main/Spells DnD 5e 2024 3-12-2025.csv";
const csvData = fs.readFileSync(csvPath, "utf8");

const records = parse(csvData, {
  columns: false,
  skip_empty_lines: true,
});

let updatedCount = 0;
let newCount = 0;

for (let row of records) {
  let name = row[0];
  let text = row[1];

  if (!name || name === "Name" || !text) continue; // Skip header or empty

  // Parse the text block
  let levelMatch = text.match(/level (\d+)/i) || text.match(/cantrip/i);
  let schoolMatch = text.match(/#([a-zA-Z]+)/);
  let timeMatch = text.match(/Casting Time:\s*(.*?)\s*Range:/i);
  let rangeMatch = text.match(/Range:\s*(.*?)\s*Components:/i);
  let compMatch = text.match(/Components:\s*(.*?)\s*Duration:/i);
  let durMatch = text.match(/Duration:\s*(.*?)\n/i) || text.match(/Duration:\s*(.*)$/i);

  if (!schoolMatch || !timeMatch || !rangeMatch || !compMatch || !durMatch) {
    console.log("Skipping unparseable spell:", name);
    continue;
  }

  let level = 0;
  if (text.match(/cantrip/i) && !text.match(/level/i)) {
    level = 0;
  } else if (text.match(/level (\d+)/i)) {
    level = parseInt(text.match(/level (\d+)/i)[1]);
  }

  let school = schoolMatch[1];
  school = school.charAt(0).toUpperCase() + school.slice(1).toLowerCase();

  let castingTime = timeMatch[1]
    .replace("#BonusAction", "1 bonus action")
    .replace("#Reaction", "1 reaction")
    .replace("#Action", "1 action");
  let range = rangeMatch[1];
  let components = compMatch[1];
  let duration = durMatch[1].trim();

  let descStart = text.indexOf(durMatch[0]) + durMatch[0].length;
  let rawDesc = text.substring(descStart).trim();

  let classesMatch = rawDesc.match(/(#[a-zA-Z]+\s*)+$/);
  let classes = [];
  if (classesMatch) {
    let classTokens = classesMatch[0].match(/#([a-zA-Z]+)/g);
    if (classTokens) {
      classes = classTokens.map((c) => c.replace("#", "").toLowerCase());
    }
    rawDesc = rawDesc.replace(/(#[a-zA-Z]+\s*)+$/, "").trim();
  }

  let id = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  let newSpell = {
    id,
    name,
    level,
    school,
    castingTime,
    range,
    components,
    duration,
    description: rawDesc,
    classes,
    source: "Player's Handbook (2024)",
  };

  let existingIndex = existingSpells.findIndex((s) => s.id === id);
  if (existingIndex !== -1) {
    existingSpells[existingIndex] = newSpell;
    updatedCount++;
  } else {
    existingSpells.push(newSpell);
    newCount++;
  }
}

existingSpells.sort((a, b) => a.name.localeCompare(b.name));

const newContent = `import { SRDSpell } from './index';\n\nexport const spells: SRDSpell[] = ${JSON.stringify(existingSpells, null, 2)};\n`;
fs.writeFileSync(spellsFile, newContent);

console.log(
  `Migration complete. Updated ${updatedCount} existing spells. Added ${newCount} new 2024 spells.`,
);
