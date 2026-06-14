const fs = require("fs");
const path = require("path");

const classesFile = "src/data/srd/classes.ts";
let contentStr = fs.readFileSync(classesFile, "utf8");

// Parse existing array
const startIndex = contentStr.indexOf("[");
const endIndex = contentStr.lastIndexOf("]");
let existingClasses = eval("(" + contentStr.substring(startIndex, endIndex + 1) + ")");

let updatedCount = 0;

for (let c of existingClasses) {
  if (c.subclasses) {
    for (let sub of c.subclasses) {
      if (sub.levelChosen !== 3) {
        sub.levelChosen = 3;
        updatedCount++;
      }
    }
  }
}

const newContent = `import { SRDClass } from './index';\n\nexport const classes: SRDClass[] = ${JSON.stringify(existingClasses, null, 2)};\n`;
fs.writeFileSync(classesFile, newContent);

console.log(`Updated ${updatedCount} subclasses to trigger at level 3 (2024 Normalization).`);
