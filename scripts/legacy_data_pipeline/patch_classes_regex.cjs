const fs = require("fs");

let content = fs.readFileSync("src/data/srd/classes.ts", "utf8");

// The issue with the previous regex is that it missed the multiple line breaks or array elements inside `choices`
// Let's use a simpler string replacement
content = content.replace(
  /startingEquipment:\s*\{\s*choices:\s*\[[\s\S]*?\]\,\s*wealth:\s*"([^"]+)"\s*\}/g,
  (match, wealthStr) => {
    return `startingEquipment: {\n      defaultBundle: [],\n      goldAlternative: "${wealthStr}"\n    }`;
  },
);

fs.writeFileSync("src/data/srd/classes.ts", content);
console.log("Regex patch complete.");
