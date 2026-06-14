const fs = require("fs");

const text = fs.readFileSync("barbarian_raw.txt", "utf8");

// 1. Extract features by level
const featuresByLevel = {};
for (let i = 1; i <= 20; i++) {
  featuresByLevel[i] = [];
}

// Features are usually formatted as "LEVEL X: FEATURE NAME"
const levelRegex = /LEVEL\s+(\d+)\s*:\s*([^\n]+)\n([^]*?)(?=LEVEL\s+\d+\s*:|$)/g;
let match;
while ((match = levelRegex.exec(text)) !== null) {
  const level = parseInt(match[1], 10);
  const name = match[2].trim();
  let desc = match[3].trim().substring(0, 1000); // truncate for now, will clean up

  if (level >= 1 && level <= 20) {
    // Only grab class features, ignore subclasses for a second
    if (!name.includes("PATH OF")) {
      featuresByLevel[level].push({ name, description: desc });
    }
  }
}

console.log("Features mapped:");
for (let i = 1; i <= 20; i++) {
  if (featuresByLevel[i].length > 0) {
    console.log(`Level ${i}:`, featuresByLevel[i].map((f) => f.name).join(", "));
  }
}
