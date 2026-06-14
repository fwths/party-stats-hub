const fs = require("fs");
const path = require("path");

const classesFile = "src/data/srd/classes.ts";
let contentStr = fs.readFileSync(classesFile, "utf8");

const startIndex = contentStr.indexOf("[");
const endIndex = contentStr.lastIndexOf("]");
let existingClasses = eval("(" + contentStr.substring(startIndex, endIndex + 1) + ")");

const parsedDir = "parsed_classes";
const files = fs.readdirSync(parsedDir);

let updatedCount = 0;

for (let file of files) {
  if (!file.endsWith(".json")) continue;

  let filePath = path.join(parsedDir, file);
  let jsonData = fs.readFileSync(filePath, "utf8");

  try {
    let parsedClass = JSON.parse(jsonData);
    let existingIndex = existingClasses.findIndex((c) => c.id === parsedClass.id);

    if (existingIndex !== -1) {
      // Merge data: Overwrite everything EXCEPT subclasses.
      const oldSubclasses = existingClasses[existingIndex].subclasses || [];

      existingClasses[existingIndex] = {
        ...parsedClass,
        subclasses: oldSubclasses,
        source: "Player's Handbook (2024)",
      };

      updatedCount++;
      console.log(`Updated 2024 mechanics for ${parsedClass.name}`);
    } else {
      console.log(`Class ${parsedClass.name} not found in existing classes. Appending it!`);
      parsedClass.source = "Player's Handbook (2024)";
      if (!parsedClass.subclasses) parsedClass.subclasses = [];
      existingClasses.push(parsedClass);
      updatedCount++;
    }
  } catch (e) {
    console.error(`Error parsing ${file}:`, e);
  }
}

const newContent = `import { SRDClass } from './index';\n\nexport const classes: SRDClass[] = ${JSON.stringify(existingClasses, null, 2)};\n`;
fs.writeFileSync(classesFile, newContent);

console.log(`Successfully merged or appended ${updatedCount} 2024 classes!`);
