const fs = require("fs");
const txt = fs.readFileSync("src/data/srd/classes.ts", "utf8");
const idx = txt.indexOf('"id": "path-of-the-ancestral-guardian"');
console.log(txt.substring(idx - 100, idx + 2000));
