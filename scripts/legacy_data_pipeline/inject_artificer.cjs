const fs = require("fs");
const path = require("path");

const classesFile = "src/data/srd/classes.ts";
let contentStr = fs.readFileSync(classesFile, "utf8");

const startIndex = contentStr.indexOf("[");
const endIndex = contentStr.lastIndexOf("]");
let classes = eval("(" + contentStr.substring(startIndex, endIndex + 1) + ")");

let artificerJson = JSON.parse(fs.readFileSync("parsed_classes/artificer.json", "utf8"));

// Find Abjurationist
const abjIdx = classes.findIndex((c) => c.id === "abjurationist");
if (abjIdx !== -1) {
  const abjClass = classes[abjIdx];
  // Its subclasses are the Artificer subclasses
  const artificerSubclasses = abjClass.subclasses || [];

  // Set Artificer subclasses
  artificerJson.subclasses = artificerSubclasses;

  // Remove the subclasses from Abjurationist
  abjClass.subclasses = [];

  // Convert Abjurationist to SRDSubclass
  const abjSubclass = {
    id: abjClass.id,
    name: abjClass.name,
    description: abjClass.description,
    source: abjClass.source || "Player's Handbook (2014)",
    featuresByLevel: abjClass.featuresByLevel || [],
    levelChosen: 3,
  };

  // Add Artificer to classes
  classes.push(artificerJson);

  // Remove Abjurationist from root classes
  classes.splice(abjIdx, 1);

  // Add Abjurationist to Wizard subclasses
  const wizIdx = classes.findIndex((c) => c.id === "wizard");
  if (wizIdx !== -1) {
    if (!classes[wizIdx].subclasses) classes[wizIdx].subclasses = [];
    classes[wizIdx].subclasses.push(abjSubclass);
    console.log("Moved Abjurationist to Wizard subclasses");
  } else {
    console.log("Wizard class not found!");
  }
} else {
  // If Abjurationist isn't found, just append Artificer
  classes.push(artificerJson);
}

const newContent = `import { SRDClass } from './index';\n\nexport const classes: SRDClass[] = ${JSON.stringify(classes, null, 2)};\n`;
fs.writeFileSync(classesFile, newContent);

console.log("Successfully injected Artificer and restructured subclasses.");
