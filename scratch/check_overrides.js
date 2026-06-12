import fs from "fs";

const files = fs.readdirSync(".").filter((f) => f.startsWith("char-") && f.endsWith(".json"));

files.forEach((file) => {
  const content = JSON.parse(fs.readFileSync(file, "utf8"));
  const char = content.data;
  if (!char) return;

  const cvs = char.characterValues || [];
  const overrides = cvs.filter((cv) => cv.typeId === 26);
  if (overrides.length > 0) {
    console.log(`\nCharacter: ${char.name} (File: ${file})`);
    overrides.forEach((ov) => {
      console.log(`  Skill ID: ${ov.valueId}, Value: ${ov.value}`);
    });
  }
});
