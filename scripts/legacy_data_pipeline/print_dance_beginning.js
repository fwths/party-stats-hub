import fs from "fs";
import path from "path";

const contentDance = fs.readFileSync(
  path.join(".agents", "implementer_a", "extracted_texts", "dance.txt"),
  "utf8",
);
console.log(contentDance.substring(0, 5000));
