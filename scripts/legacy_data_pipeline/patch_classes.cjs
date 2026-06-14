const fs = require("fs");
const path = "src/data/srd/classes.ts";

let content = fs.readFileSync(path, "utf8");

// The regex will look for `startingEquipment: { ... },` blocks
content = content.replace(
  /startingEquipment:\s*\{\s*choices:\s*\[([\s\S]*?)\]\s*,\s*wealth:\s*([^,]+)\s*\},/g,
  (match, choicesStr, wealth) => {
    return `startingEquipment: {\n    defaultBundle: [],\n    goldAlternative: ${wealth.trim()}\n  },`;
  },
);

fs.writeFileSync(path, content);
console.log("Patched startingEquipment in classes.ts");
