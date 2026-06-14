import fs from "fs";
const data = JSON.parse(fs.readFileSync("src/data/reference/subclasses.json", "utf-8"));
console.log(`Subclasses count in reference/subclasses.json: ${data.length}`);
for (const sc of data) {
  console.log(`- ${sc.parentClass}: ${sc.name} (${sc.id})`);
}
