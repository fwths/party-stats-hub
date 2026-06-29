import path from "node:path";
import Database from "better-sqlite3";
import { applyDatabaseMigrations } from "../src/db/migrations.server";

const databasePath = path.resolve(process.argv[2] || process.env.DATABASE_URL || "sqlite.db");
const db = new Database(databasePath, { fileMustExist: true });
try {
  const applied = applyDatabaseMigrations(db);
  console.log(JSON.stringify({ databasePath, applied }, null, 2));
} finally {
  db.close();
}

