const fs = require("fs");
let txt = fs.readFileSync("src/data/srd/classes.ts", "utf8");

const toRemove = ['"id": "path-of-the-ancestral-guardian"', '"id": "college-of-swords"'];

for (const marker of toRemove) {
  let startIdx = txt.indexOf(marker);
  if (startIdx !== -1) {
    // Find the start of the object
    const objStart = txt.lastIndexOf("{", startIdx);
    // Find the end of the second injected object. For Barbarian, it's after storm-herald. For Bard, after whispers.
    let endObjMarker = "";
    if (marker.includes("ancestral-guardian")) {
      endObjMarker = '"id": "path-of-the-storm-herald"';
    } else {
      endObjMarker = '"id": "college-of-whispers"';
    }

    const secondStartIdx = txt.indexOf(endObjMarker, startIdx);
    if (secondStartIdx !== -1) {
      // Find the end of the second object
      let openBraces = 0;
      let currentIdx = txt.lastIndexOf("{", secondStartIdx);
      let foundEnd = -1;
      for (let i = currentIdx; i < txt.length; i++) {
        if (txt[i] === "{") openBraces++;
        if (txt[i] === "}") {
          openBraces--;
          if (openBraces === 0) {
            foundEnd = i;
            break;
          }
        }
      }
      if (foundEnd !== -1) {
        // Remove the trailing comma and newline if present
        let endCut = foundEnd + 1;
        if (txt[endCut] === ",") endCut++;
        if (txt[endCut] === "\n") endCut++;

        txt = txt.slice(0, objStart) + txt.slice(endCut);
        console.log(`Removed ${marker}`);
      }
    } else {
      // maybe only one object injected?
      console.log(`Could not find second object for ${marker}`);
    }
  } else {
    console.log(`Did not find ${marker}`);
  }
}

fs.writeFileSync("src/data/srd/classes.ts", txt);
