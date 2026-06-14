const fs = require("fs");
const file = "src/data/srd/classes.ts";
let str = fs.readFileSync(file, "utf8");
str = str.replace(
  'uses: "1 + Warlock Level / Long Rest",\n              id: "healing-light",',
  'id: "healing-light",',
);
fs.writeFileSync(file, str);
