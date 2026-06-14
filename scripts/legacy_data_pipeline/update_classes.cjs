const fs = require("fs");

const classesFile = "src/data/srd/classes.ts";
let classesText = fs.readFileSync(classesFile, "utf8");

const artificerData = require("./artificer_data.json");

// Convert JSON features to string
let newFeaturesStr = "featuresByLevel: {\n";
for (let i = 1; i <= 20; i++) {
  const feats = artificerData.featuresByLevel[String(i)];
  if (!feats || feats.length === 0) continue;
  newFeaturesStr += `      ${i}: [\n`;
  for (let j = 0; j < feats.length; j++) {
    const f = feats[j];
    newFeaturesStr += `        { name: ${JSON.stringify(f.name)}, description: ${JSON.stringify(f.description)} }${j === feats.length - 1 ? "" : ","}\n`;
  }
  newFeaturesStr += `      ],\n`;
}
newFeaturesStr += "    }";

// Convert subclasses
let newSubclassesStr = "subclasses: [\n";
for (let i = 0; i < artificerData.subclasses.length; i++) {
  const s = artificerData.subclasses[i];
  newSubclassesStr += `      { id: ${JSON.stringify(s.id)}, name: ${JSON.stringify(s.name)}, description: ${JSON.stringify(s.description)} }${i === artificerData.subclasses.length - 1 ? "" : ","}\n`;
}
newSubclassesStr += "    ]";

// Regex to find and replace
const featuresRegex = /featuresByLevel:\s*\{[\s\S]*?\},/g;
const subclassesRegex = /subclasses:\s*\[[\s\S]*?\]/g;

// Instead of global replace which might hit others, find 'id: "artificer"' and replace from there
const artificerIndex = classesText.indexOf('id: "artificer"');
if (artificerIndex !== -1) {
  const endOfArtificer = classesText.indexOf("  }", artificerIndex);

  let block = classesText.substring(artificerIndex, endOfArtificer);

  block = block.replace(/featuresByLevel:\s*\{[\s\S]*?\},/, newFeaturesStr + ",");
  block = block.replace(/subclasses:\s*\[[\s\S]*?\]/, newSubclassesStr);

  classesText =
    classesText.substring(0, artificerIndex) + block + classesText.substring(endOfArtificer);

  fs.writeFileSync(classesFile, classesText, "utf8");
  console.log("Updated classes.ts successfully!");
} else {
  console.log("Could not find artificer in classes.ts");
}
