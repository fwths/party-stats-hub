import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parsedClassesDir = path.join(__dirname, "parsed_classes");

try {
  if (!fs.existsSync(parsedClassesDir)) {
    console.error(`Directory not found: ${parsedClassesDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(parsedClassesDir).filter((file) => file.endsWith(".json"));
  let totalSubclassesCount = 0;

  console.log("Subclasses count per class file:");
  for (const file of files) {
    const filePath = path.join(parsedClassesDir, file);
    const content = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(content);

    // Check if subclasses field exists and is an array
    const subclassesCount = Array.isArray(parsed.subclasses) ? parsed.subclasses.length : 0;
    console.log(`- ${file}: ${subclassesCount}`);
    totalSubclassesCount += subclassesCount;
  }

  console.log(`\nTotal subclasses count across all files: ${totalSubclassesCount}`);

  if (totalSubclassesCount === 94) {
    console.log("Success: Total subclass count is exactly 94.");
    process.exit(0);
  } else {
    console.log(`Failure: Total subclass count is ${totalSubclassesCount}, expected 94.`);
    process.exit(1);
  }
} catch (error) {
  console.error("An error occurred during verification:", error);
  process.exit(1);
}
