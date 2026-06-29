import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { verifyDatabaseMigrations } from "./migrations.server";

export type DatabaseTableManifest = {
  rows: number;
  contentChecksum: string;
};

export type DatabaseVerificationManifest = {
  integrity: "ok";
  tables: Record<string, DatabaseTableManifest>;
  migrationsVerified: boolean;
};

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function stableValue(value: unknown): unknown {
  if (Buffer.isBuffer(value)) return { $buffer: value.toString("base64") };
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableValue(child)]),
    );
  }
  if (Array.isArray(value)) return value.map(stableValue);
  return value;
}

function tableManifest(db: Database.Database, table: string): DatabaseTableManifest {
  const hash = createHash("sha256");
  let rows = 0;
  for (const row of db.prepare(`SELECT * FROM ${quoteIdentifier(table)}`).iterate()) {
    hash.update(JSON.stringify(stableValue(row)));
    hash.update("\n");
    rows += 1;
  }
  return { rows, contentChecksum: hash.digest("hex") };
}

function verifyStoredAggregateChecksums(db: Database.Database, table: string): void {
  const columns =
    table === "character_v3_snapshots"
      ? { id: "character_id", json: "aggregate_json", checksum: "aggregate_checksum" }
      : {
          id: "mutation_id",
          json: "resulting_aggregate_json",
          checksum: "resulting_aggregate_checksum",
        };
  const rows = db
    .prepare(
      `SELECT ${columns.id} AS id, ${columns.json} AS json, ${columns.checksum} AS checksum FROM ${quoteIdentifier(table)}`,
    )
    .all() as Array<{ id: string; json: string; checksum: string }>;
  for (const row of rows) {
    const actual = createHash("sha256").update(row.json).digest("hex");
    if (actual !== row.checksum) throw new Error(`${table} checksum failed for ${row.id}`);
  }
}

export function verifyOpenDatabase(db: Database.Database): DatabaseVerificationManifest {
  const integrity = db.pragma("integrity_check") as Array<{ integrity_check: string }>;
  if (integrity.length !== 1 || integrity[0]?.integrity_check !== "ok") {
    throw new Error(`SQLite integrity check failed: ${JSON.stringify(integrity)}`);
  }
  const foreignKeyFailures = db.pragma("foreign_key_check") as unknown[];
  if (foreignKeyFailures.length > 0) {
    throw new Error(`SQLite foreign-key check failed: ${JSON.stringify(foreignKeyFailures)}`);
  }

  const tableNames = (
    db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all() as Array<{ name: string }>
  ).map((row) => row.name);
  const tables = Object.fromEntries(tableNames.map((table) => [table, tableManifest(db, table)]));

  const migrationsVerified = tableNames.includes("app_schema_migrations");
  if (migrationsVerified) verifyDatabaseMigrations(db);
  if (tableNames.includes("character_v3_snapshots")) {
    verifyStoredAggregateChecksums(db, "character_v3_snapshots");
  }
  if (tableNames.includes("character_v3_mutations")) {
    verifyStoredAggregateChecksums(db, "character_v3_mutations");
  }
  return { integrity: "ok", tables, migrationsVerified };
}

export function verifyDatabaseFile(databasePath: string): DatabaseVerificationManifest {
  const db = new Database(databasePath, { readonly: true, fileMustExist: true });
  try {
    return verifyOpenDatabase(db);
  } finally {
    db.close();
  }
}

export async function createVerifiedBackup(input: {
  sourcePath: string;
  destinationPath: string;
}): Promise<DatabaseVerificationManifest> {
  const sourcePath = path.resolve(input.sourcePath);
  const destinationPath = path.resolve(input.destinationPath);
  if (sourcePath === destinationPath) throw new Error("Backup destination must differ from source");
  if (!fs.existsSync(sourcePath)) throw new Error(`Database does not exist: ${sourcePath}`);
  if (fs.existsSync(destinationPath)) {
    throw new Error(`Refusing to overwrite existing backup: ${destinationPath}`);
  }
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });

  const source = new Database(sourcePath, { readonly: true, fileMustExist: true });
  try {
    const sourceManifest = verifyOpenDatabase(source);
    await source.backup(destinationPath);
    const backupManifest = verifyDatabaseFile(destinationPath);
    if (JSON.stringify(backupManifest) !== JSON.stringify(sourceManifest)) {
      throw new Error("Backup logical manifest does not match source database");
    }
    return backupManifest;
  } catch (error) {
    if (fs.existsSync(destinationPath)) fs.unlinkSync(destinationPath);
    throw error;
  } finally {
    source.close();
  }
}

export function verifyRestoreDrill(input: {
  backupPath: string;
  restoredPath: string;
}): DatabaseVerificationManifest {
  const backupPath = path.resolve(input.backupPath);
  const restoredPath = path.resolve(input.restoredPath);
  if (!fs.existsSync(backupPath)) throw new Error(`Backup does not exist: ${backupPath}`);
  if (backupPath === restoredPath) throw new Error("Restore drill path must differ from backup");
  if (fs.existsSync(restoredPath)) {
    throw new Error(`Refusing to overwrite restore drill target: ${restoredPath}`);
  }
  fs.mkdirSync(path.dirname(restoredPath), { recursive: true });
  fs.copyFileSync(backupPath, restoredPath, fs.constants.COPYFILE_EXCL);
  try {
    const backupManifest = verifyDatabaseFile(backupPath);
    const restoredManifest = verifyDatabaseFile(restoredPath);
    if (JSON.stringify(restoredManifest) !== JSON.stringify(backupManifest)) {
      throw new Error("Restored database logical manifest does not match backup");
    }
    return restoredManifest;
  } finally {
    if (fs.existsSync(restoredPath)) fs.unlinkSync(restoredPath);
  }
}
