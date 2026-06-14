const fs = require("fs");

const path = "src/data/srd/classes.ts";
let content = fs.readFileSync(path, "utf8");

// We have 42 instances where TS complains about 'choices' not existing in startingEquipment.
// These are subclasses that accidentally copied the base class's startingEquipment and proficiencies.
// We can use a regex to completely strip "startingEquipment" from inside subclasses.
// But we also need to change startingEquipment inside the base classes.

// 1. Fix the base classes.
// A base class has `startingEquipment: { \n choices: ... \n wealth: "..." \n }`
// We will replace it safely.
content = content.replace(
  /"startingEquipment"\s*:\s*\{\s*"choices"\s*:\s*\[([\s\S]*?)\]\,\s*"wealth"\s*:\s*"([^"]+)"\s*\}/g,
  (match, choicesStr, wealthStr) => {
    return `"startingEquipment": {
      "defaultBundle": [],
      "goldAlternative": "${wealthStr}"
    }`;
  },
);

// Write to file
fs.writeFileSync(path, content);
console.log("Fixed startingEquipment in classes.ts");
