import fs from "fs";
import path from "path";

const parsedClassesDir = "parsed_classes";
const files = fs.readdirSync(parsedClassesDir).filter((file) => file.endsWith(".json"));

for (const file of files) {
  const filePath = path.join(parsedClassesDir, file);
  const data = fs.readFileSync(filePath, "utf8");
  try {
    const parsed = JSON.parse(data);
    console.log(
      `Successfully parsed: ${file} (subclasses: ${parsed.subclasses ? parsed.subclasses.length : "none"})`,
    );
  } catch (e) {
    console.error(`Syntax error in ${file}:`, e.message);
  }
}
