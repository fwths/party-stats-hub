import Database from "better-sqlite3";
import * as path from "path";

interface TableCheck {
  tableName: string;
  minCount: number;
}

const CHECKS: TableCheck[] = [
  { tableName: "backgrounds", minCount: 0 },
  { tableName: "weapons", minCount: 0 },
  { tableName: "armor", minCount: 0 },
  { tableName: "magic_items", minCount: 100 },
  { tableName: "monsters", minCount: 100 },
];

async function main() {
  const dbPath = path.join(process.cwd(), "sqlite.db");
  console.log(`Connecting to database at: ${dbPath}`);

  const sqlite = new Database(dbPath);
  let allPassed = true;
  const results: { tableName: string; count: number; minCount: number; passed: boolean }[] = [];

  for (const check of CHECKS) {
    try {
      const row = sqlite.prepare(`SELECT count(*) as count FROM ${check.tableName}`).get() as {
        count: number;
      };
      const count = row ? row.count : 0;
      const passed = count > check.minCount;
      if (!passed) {
        allPassed = false;
      }
      results.push({
        tableName: check.tableName,
        count,
        minCount: check.minCount,
        passed,
      });
    } catch (error: any) {
      console.error(`Error querying table '${check.tableName}':`, error.message || error);
      allPassed = false;
      results.push({
        tableName: check.tableName,
        count: 0,
        minCount: check.minCount,
        passed: false,
      });
    }
  }

  // Print clear, clean summary of counts
  console.log("\n==========================================");
  console.log("          DATABASE INTEGRITY REPORT        ");
  console.log("==========================================");
  console.log(
    sprintf("%-15s | %-10s | %-12s | %-8s", "Table Name", "Row Count", "Min Required", "Status"),
  );
  console.log("------------------------------------------");
  for (const res of results) {
    console.log(
      sprintf(
        "%-15s | %-10d | > %-10d | %-8s",
        res.tableName,
        res.count,
        res.minCount,
        res.passed ? "PASSED" : "FAILED",
      ),
    );
  }
  console.log("==========================================\n");

  if (allPassed) {
    console.log("All database integrity checks passed successfully!");
    process.exit(0);
  } else {
    console.error("Database integrity checks failed!");
    process.exit(1);
  }
}

// Simple sprintf padding helper to avoid external dependencies
function sprintf(format: string, ...args: any[]): string {
  let index = 0;
  return format.replace(/%-?(\d+)?([s|d])/g, (match, width, _type) => {
    const val = args[index++];
    if (val === undefined) return match;
    let strVal = String(val);
    if (width) {
      const padLen = Number(width) - strVal.length;
      if (padLen > 0) {
        const padding = " ".repeat(padLen);
        if (match.startsWith("%-")) {
          strVal = strVal + padding;
        } else {
          strVal = padding + strVal;
        }
      }
    }
    return strVal;
  });
}

main().catch((err) => {
  console.error("Fatal error during validation:", err);
  process.exit(1);
});
