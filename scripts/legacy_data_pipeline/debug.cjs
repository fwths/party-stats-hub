const fs = require("fs");
const txt = fs.readFileSync("src/data/srd/classes.ts", "utf8");
const idx = txt.indexOf('name: "Barbarian"');
console.log(txt.substring(idx - 50, idx + 800));
