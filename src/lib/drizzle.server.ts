import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../db/schema";
import * as path from "path";
import * as fs from "fs";
import { applyDatabaseMigrations } from "../db/migrations.server";

// Locate the sqlite.db file (from environment variable or fallback to project root)
const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), "sqlite.db");

// Ensure the parent directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(dbPath);
applyDatabaseMigrations(sqlite);
export const db = drizzle(sqlite, { schema });
