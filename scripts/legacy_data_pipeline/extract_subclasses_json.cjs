const fs = require("fs");

const classesFile = "src/data/srd/classes.ts";
let contentStr = fs.readFileSync(classesFile, "utf8");

const startIndex = contentStr.indexOf("[");
const endIndex = contentStr.lastIndexOf("]");
let classes = eval("(" + contentStr.substring(startIndex, endIndex + 1) + ")");

let allSubclasses = [];

for (const c of classes) {
  if (c.subclasses && c.subclasses.length > 0) {
    for (const sc of c.subclasses) {
      allSubclasses.push({
        parentClass: c.name,
        ...sc,
      });
    }
  }
}

fs.writeFileSync("src/data/reference/subclasses.json", JSON.stringify(allSubclasses, null, 2));
console.log(`Successfully extracted ${allSubclasses.length} subclasses to subclasses.json`);
