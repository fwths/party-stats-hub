const fs = require("fs");
let classesText = fs.readFileSync("src/data/srd/classes.ts", "utf8");
classesText = classesText.replace(/,\n\s*\{\s*id:\s*"spellwright"[\s\S]*?\}/g, "");
fs.writeFileSync("src/data/srd/classes.ts", classesText, "utf8");
console.log("Removed Spellwright subclass");
