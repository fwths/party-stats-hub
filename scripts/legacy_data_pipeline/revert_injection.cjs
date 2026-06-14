const fs = require("fs");

let txt = fs.readFileSync("src/data/srd/classes.ts", "utf8");

// I will write a regex to find all { name: "...", ... } that don't have an id, but wait, the TS parser error gives line numbers!
// "src/data/srd/classes.ts(27538,9):"
// It's much easier to just parse the file as JS? No, it's TS.
// Let's just fix the JSONs and use string replacement to fix classes.ts.
// In classes.ts, the injected text for Ancestral Guardian starts with:
//   {
//        "id": "path-of-the-ancestral-guardian",
//        "name": "Path of the Ancestral Guardian",

// We can just remove it and re-inject.
const idx = txt.indexOf(
  '{\n        "id": "path-of-the-ancestral-guardian",\n        "name": "Path of the Ancestral Guardian",',
);
if (idx !== -1) {
  // Find the end of Path of the Storm Herald
  const nextSubclass = txt.indexOf('{\n        "id": "path-of-the-wild-heart"', idx); // Wild heart is the next one in the array usually?
  const stormEnd = txt.indexOf("]      \n    }\n  },", idx);
  if (stormEnd !== -1) {
    txt = txt.slice(0, idx) + txt.slice(stormEnd + 19);
    fs.writeFileSync("src/data/srd/classes.ts", txt);
    console.log("Reverted classes.ts");
  } else {
    console.log("Could not find end of injected subclasses");
  }
} else {
  console.log("Could not find injected text");
}
