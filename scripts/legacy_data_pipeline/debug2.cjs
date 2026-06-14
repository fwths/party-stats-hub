const fs = require("fs");
const txt = fs.readFileSync("src/data/srd/classes.ts", "utf8");
const idx = txt.lastIndexOf('"college-of-whispers"');
console.log(txt.substring(idx + 1800, idx + 2600));
