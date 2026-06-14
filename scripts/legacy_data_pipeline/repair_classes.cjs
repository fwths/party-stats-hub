const fs = require("fs");

let classes = fs.readFileSync("src/data/srd/classes.ts", "utf8");
const startIdx = classes.indexOf('"id": "path-of-the-ancestral-guardian"');
if (startIdx !== -1) {
  const objStart = classes.lastIndexOf("{", startIdx);
  const nextSubclass = classes.indexOf('id: "path-of-the-berserker"', startIdx);
  if (nextSubclass !== -1) {
    const nextObjStart = classes.lastIndexOf("{", nextSubclass);
    classes = classes.slice(0, objStart) + classes.slice(nextObjStart);
    fs.writeFileSync("src/data/srd/classes.ts", classes);
    console.log("Reverted successfully!");
  } else {
    console.log("Could not find berserker");
  }
} else {
  console.log("Not found");
}
