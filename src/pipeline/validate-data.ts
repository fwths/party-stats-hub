import Database from "better-sqlite3";
import * as path from "path";

const dbPath = path.join(process.cwd(), "sqlite.db");
const db = new Database(dbPath);

const tablesToCheck = [
  "spells",
  "classes",
  "subclasses",
  "class_features",
  "species",
  "species_variants",
  "feats",
  "backgrounds",
  "weapons",
  "armor",
  "magic_items",
  "mundane_gear",
  "monsters",
  "vehicles",
  "bastions",
  "hazards",
  "vehicle_upgrades",
];

console.log("==============================================");
console.log("🔍 RUNNING FLUFF AND FOUNDRY INTEGRITY CHECKS");
console.log("==============================================\n");

let failedAny = false;

for (const tableName of tablesToCheck) {
  try {
    const totalRow = db.prepare(`SELECT count(*) as count FROM ${tableName}`).get() as {
      count: number;
    };
    const totalCount = totalRow.count;

    const fluffRow = db
      .prepare(`SELECT count(*) as count FROM ${tableName} WHERE fluff_json IS NOT NULL`)
      .get() as { count: number };
    const fluffCount = fluffRow.count;

    const foundryRow = db
      .prepare(`SELECT count(*) as count FROM ${tableName} WHERE foundry_json IS NOT NULL`)
      .get() as { count: number };
    const foundryCount = foundryRow.count;

    console.log(
      `Table: ${tableName.padEnd(20)} | Total: ${String(totalCount).padStart(5)} | Has Fluff: ${String(fluffCount).padStart(5)} (${Math.round((fluffCount / (totalCount || 1)) * 100)}%) | Has Foundry: ${String(foundryCount).padStart(5)} (${Math.round((foundryCount / (totalCount || 1)) * 100)}%)`,
    );

    // Let's assert that core tables have at least some populated rows
    if (["spells", "classes", "feats", "magic_items", "monsters"].includes(tableName)) {
      if (totalCount === 0) {
        console.error(`❌ ERROR: Core table ${tableName} has 0 rows!`);
        failedAny = true;
      }
      if (fluffCount === 0 && tableName !== "class_features") {
        console.error(`❌ ERROR: Core table ${tableName} has 0 rows with fluff!`);
        failedAny = true;
      }
      if (foundryCount === 0) {
        console.error(`❌ ERROR: Core table ${tableName} has 0 rows with Foundry data!`);
        failedAny = true;
      }
    }
  } catch (e) {
    console.error(`❌ ERROR: Failed to check table ${tableName}:`, e);
    failedAny = true;
  }
}

console.log("\n==============================================");
if (failedAny) {
  console.log("❌ INTEGRITY CHECKS FAILED!");
  process.exit(1);
} else {
  console.log("✅ ALL INTEGRITY CHECKS PASSED SUCCESSFULLY!");
  process.exit(0);
}
