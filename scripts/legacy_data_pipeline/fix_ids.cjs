const fs = require("fs");

const path = "src/data/srd/classes.ts";
let text = fs.readFileSync(path, "utf8");

// I need to parse the file or just use regex to add id to any object in featuresByLevel that is missing it?
// Or I can just overwrite classes.ts from the previous version since I didn't commit it? Wait, I didn't commit.
// I can just remove the two subclasses using regex, then re-inject them with IDs.
// Actually, it's safer to just write a Node script that repairs the array. Wait, classes.ts is TS code, not JSON.

// Let's replace the newly added subclasses by searching for "name": "Path of the Ancestral Guardian"
// and "name": "Path of the Storm Herald" and injecting ids into their features.

// A simpler way: we can just find any { name: "Something", description: "Something" } inside the Barbarian subclasses and add id.
// Let's just fix xanathar_barbarian.json and xanathar_bard.json, and then I will revert classes.ts and re-inject!
