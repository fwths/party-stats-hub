import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

// Ensure data folder exists
const dbDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, "party-stats.db");

// Singleton connection helper for Hot Module Replacement (HMR) during dev
const globalForDb = globalThis as unknown as {
  dbInstance: DatabaseSync | undefined;
};

export const db = globalForDb.dbInstance ?? new DatabaseSync(dbPath);

if (process.env.NODE_ENV !== "production") {
  globalForDb.dbInstance = db;
}

// Initialize table
db.exec(`
  CREATE TABLE IF NOT EXISTS kv_store (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at INTEGER NOT NULL
  );
`);

export function getKv(key: string): string | null {
  const stmt = db.prepare("SELECT value FROM kv_store WHERE key = ?");
  const row = stmt.get(key) as { value: string } | undefined;
  return row ? row.value : null;
}

export function setKv(key: string, value: string): void {
  const stmt = db.prepare(`
    INSERT INTO kv_store (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `);
  stmt.run(key, value, Date.now());
}

export function deleteKv(key: string): void {
  const stmt = db.prepare("DELETE FROM kv_store WHERE key = ?");
  stmt.run(key);
}

export function getAllKv(): Record<string, string> {
  const stmt = db.prepare("SELECT key, value FROM kv_store");
  const rows = stmt.all() as Array<{ key: string; value: string }>;
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

export function getKvWithPrefix(prefix: string): Record<string, string> {
  const stmt = db.prepare("SELECT key, value FROM kv_store WHERE key LIKE ?");
  const rows = stmt.all(`${prefix}%`) as Array<{ key: string; value: string }>;
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}
