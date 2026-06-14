const fs = require("fs");
let txt = fs.readFileSync("src/data/srd/classes.ts", "utf8");

const startIdx = txt.indexOf('{\n        "id": "path-of-the-ancestral-guardian",');
if (startIdx !== -1) {
  const endStr = "Raging Storm";
  const endIdxStr = txt.indexOf(endStr, startIdx);
  if (endIdxStr !== -1) {
    // find the end of the object
    const endObj = txt.indexOf("}", endIdxStr);
    const endObj2 = txt.indexOf("}", endObj + 1);
    const endObj3 = txt.indexOf("}", endObj2 + 1);
    const endObj4 = txt.indexOf("},", endObj3 + 1);

    txt = txt.slice(0, startIdx) + txt.slice(endObj4 + 2);
    fs.writeFileSync("src/data/srd/classes.ts", txt);
    console.log("Deleted injected text");
  }
}
