const fs = require("fs");
const path = require("path");

const classesPath = path.join(__dirname, "src/data/srd/classes.ts");
let content = fs.readFileSync(classesPath, "utf8");

// Find the start of the array
const arrayStartIndex = content.indexOf("export const classes: SRDClass[] = [");
if (arrayStartIndex !== -1) {
  const arrayStr = content.substring(content.indexOf("[", arrayStartIndex));
  try {
    let classesArray = eval(`(${arrayStr})`);

    // Mutate array
    for (let c of classesArray) {
      if (c.startingEquipment && c.startingEquipment.wealth) {
        const oldWealth = c.startingEquipment.wealth;
        c.startingEquipment = {
          defaultBundle: c.startingEquipment.choices
            ? c.startingEquipment.choices.map((ch) => ch.items.join(", "))
            : [],
          goldAlternative: oldWealth,
        };
      }

      // Just to ensure schema conformity
      if (!c.featuresByLevel) {
        c.featuresByLevel = {};
      }
    }

    const newContent = `import { SRDClass } from './index';\n\nexport const classes: SRDClass[] = ${JSON.stringify(classesArray, null, 2)};\n`;
    fs.writeFileSync(classesPath, newContent);
    console.log("Successfully patched classes.ts while keeping all data intact.");
  } catch (e) {
    console.error("Eval failed:", e);
  }
}
