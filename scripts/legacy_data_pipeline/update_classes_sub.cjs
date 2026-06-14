const fs = require("fs");

const classesFile = "src/data/srd/classes.ts";
let classesText = fs.readFileSync(classesFile, "utf8");

const subclassesData = require("./artificer_subclasses.json");

// We need to inject the featuresByLevel into the artificer's subclasses array
// Let's parse the classes.ts using regex and replace the subclass objects carefully
const artificerIndex = classesText.indexOf('id: "artificer"');
const endOfArtificer = classesText.indexOf("  }", artificerIndex);

let artificerBlock = classesText.substring(artificerIndex, endOfArtificer);

for (const subId of Object.keys(subclassesData)) {
  const featsObj = subclassesData[subId];

  // Format the features string
  let featsStr = "featuresByLevel: {\n";
  for (let i = 1; i <= 20; i++) {
    const feats = featsObj[String(i)];
    if (!feats || feats.length === 0) continue;
    featsStr += `        ${i}: [\n`;
    for (const f of feats) {
      featsStr += `          { name: ${JSON.stringify(f.name)}, description: ${JSON.stringify(f.description)} },\n`;
    }
    featsStr += `        ],\n`;
  }
  featsStr += "      }";

  // Find the subclass block in artificerBlock
  const subStart = artificerBlock.indexOf(`id: "${subId}"`);
  if (subStart !== -1) {
    const subDescEnd = artificerBlock.indexOf(" }", subStart);
    if (subDescEnd !== -1) {
      // Inject before the closing brace
      artificerBlock =
        artificerBlock.substring(0, subDescEnd) +
        ",\n      " +
        featsStr +
        "\n    }" +
        artificerBlock.substring(subDescEnd + 2);
    }
  }
}

// Add some placeholder infusions
const infusionsStr = `\n    infusions: [
      { id: "enhanced-defense", name: "Enhanced Defense", description: "Item: A suit of armor or a shield. A creature gains a +1 bonus to Armor Class while wearing (armor) or wielding (shield) the infused item. The bonus increases to +2 when you reach Artificer level 10.", levelRequired: 1 },
      { id: "enhanced-weapon", name: "Enhanced Weapon", description: "Item: A simple or martial weapon. This magic weapon grants a +1 bonus to attack and damage rolls made with it. The bonus increases to +2 when you reach Artificer level 10.", levelRequired: 1 },
      { id: "replicate-magic-item", name: "Replicate Magic Item", description: "Using this infusion, you replicate a particular magic item. You can learn this infusion multiple times.", levelRequired: 1 }
    ],`;

// Add infusions after featuresByLevel
artificerBlock = artificerBlock.replace("    subclasses: [", infusionsStr + "\n    subclasses: [");

classesText =
  classesText.substring(0, artificerIndex) + artificerBlock + classesText.substring(endOfArtificer);
fs.writeFileSync(classesFile, classesText, "utf8");

console.log("Updated subclasses and infusions!");
