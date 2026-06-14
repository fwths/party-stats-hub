const fs = require("fs");
const txt = fs.readFileSync("src/data/srd/classes.ts", "utf8");

let braceCount = 0;
let bracketCount = 0;
let inString = false;
let escape = false;

for (let i = 0; i < txt.length; i++) {
  const c = txt[i];
  if (inString) {
    if (escape) escape = false;
    else if (c === "\\") escape = true;
    else if (c === '"') inString = false;
  } else {
    if (c === '"') inString = true;
    else if (c === "{") braceCount++;
    else if (c === "}") {
      braceCount--;
      if (braceCount < 0) {
        console.log(`Unmatched } at line ${txt.substring(0, i).split("\n").length}`);
        break;
      }
    } else if (c === "[") bracketCount++;
    else if (c === "]") {
      bracketCount--;
      if (bracketCount < 0) {
        console.log(`Unmatched ] at line ${txt.substring(0, i).split("\n").length}`);
        break;
      }
    }
  }
}
console.log(`Final braces: ${braceCount}, brackets: ${bracketCount}`);
