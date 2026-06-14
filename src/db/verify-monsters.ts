import Database from "better-sqlite3";
import * as path from "path";

async function main() {
  const dbPath = path.join(process.cwd(), "sqlite.db");
  const sqlite = new Database(dbPath);
  const countRes = sqlite.prepare("SELECT count(*) as count FROM monsters").get() as {
    count: number;
  };
  console.log(`Verification query: Table 'monsters' has ${countRes.count} rows.`);
  if (countRes.count > 100) {
    console.log("Success: Count is greater than 100!");
  } else {
    console.error("Error: Count is not greater than 100.");
    process.exit(1);
  }
}

main().catch(console.error);
