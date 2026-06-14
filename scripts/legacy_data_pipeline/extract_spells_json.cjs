const fs = require("fs");

const spellsFile = "src/data/srd/spells.ts";
let contentStr = fs.readFileSync(spellsFile, "utf8");

const startIndex = contentStr.indexOf("[");
const endIndex = contentStr.lastIndexOf("]");
let spells = eval("(" + contentStr.substring(startIndex, endIndex + 1) + ")");

fs.writeFileSync("src/data/reference/spells.json", JSON.stringify(spells, null, 2));
console.log(`Successfully extracted ${spells.length} spells to spells.json`);
