const fs = require("fs");

const text = fs.readFileSync("fighter_raw.txt", "utf8");

const featuresByLevel = {};
for (let i = 1; i <= 20; i++) {
  featuresByLevel[i] = [];
}

const levelRegex =
  /LEVEL\s+(\d+|[li]+)\s*:\s*([^\n]+)\n([^]*?)(?=LEVEL\s+(?:\d+|[li]+)\s*:|FIGHTER SUBCLASS|$)/gi;
let match;
while ((match = levelRegex.exec(text)) !== null) {
  let levelStr = match[1].toLowerCase();
  let level = parseInt(levelStr, 10);
  if (levelStr === "l" || levelStr === "i") level = 1;
  const name = match[2].trim().toUpperCase();

  if (level >= 1 && level <= 20) {
    featuresByLevel[level].push({ name });
  }
}

console.log("Features mapped:");
for (let i = 1; i <= 20; i++) {
  if (featuresByLevel[i].length > 0) {
    console.log(`Level ${i}:`, featuresByLevel[i].map((f) => f.name).join(", "));
  }
}
