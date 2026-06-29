import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { createVerifiedBackup, verifyDatabaseFile, verifyRestoreDrill } from "./backup.server";
import { applyDatabaseMigrations } from "./migrations.server";

const temporaryDirectories: string[] = [];

function temporaryDirectory(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "party-stats-backup-test-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("verified SQLite backup and restore", () => {
  it("backs up, verifies, and restores a migrated database without changing the source", async () => {
    const directory = temporaryDirectory();
    const sourcePath = path.join(directory, "source.sqlite");
    const backupPath = path.join(directory, "backups", "source.backup.sqlite");
    const restoredPath = path.join(directory, "restore-drill", "restored.sqlite");
    const source = new Database(sourcePath);
    applyDatabaseMigrations(source, () => 100);
    source.exec("CREATE TABLE recovery_probe (id TEXT PRIMARY KEY, value TEXT NOT NULL)");
    source.prepare("INSERT INTO recovery_probe (id, value) VALUES (?, ?)").run("probe", "intact");
    source.close();

    const sourceBefore = fs.statSync(sourcePath).size;
    const backupManifest = await createVerifiedBackup({ sourcePath, destinationPath: backupPath });
    const restoredManifest = verifyRestoreDrill({ backupPath, restoredPath });

    expect(backupManifest).toEqual(restoredManifest);
    expect(backupManifest).toMatchObject({
      integrity: "ok",
      migrationsVerified: true,
      tables: { recovery_probe: { rows: 1 } },
    });
    expect(fs.statSync(sourcePath).size).toBe(sourceBefore);
    expect(fs.existsSync(restoredPath)).toBe(false);
  });

  it("refuses to overwrite a backup or restore target", async () => {
    const directory = temporaryDirectory();
    const sourcePath = path.join(directory, "source.sqlite");
    const occupiedPath = path.join(directory, "occupied.sqlite");
    const source = new Database(sourcePath);
    applyDatabaseMigrations(source);
    source.close();
    fs.writeFileSync(occupiedPath, "occupied");

    await expect(
      createVerifiedBackup({ sourcePath, destinationPath: occupiedPath }),
    ).rejects.toThrow(/Refusing to overwrite/);
    expect(() =>
      verifyRestoreDrill({ backupPath: sourcePath, restoredPath: occupiedPath }),
    ).toThrow(/Refusing to overwrite/);
  });

  it("detects corruption in V3 aggregate payloads even when SQLite itself is structurally valid", () => {
    const directory = temporaryDirectory();
    const databasePath = path.join(directory, "corrupt.sqlite");
    const db = new Database(databasePath);
    applyDatabaseMigrations(db);
    db.prepare(
      `INSERT INTO character_v3_snapshots
       (character_id, campaign_id, owner_user_id, schema_version, build_revision,
        live_state_revision, aggregate_json, aggregate_checksum, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run("character", "campaign", "owner", 3, 1, 0, "{}", "0".repeat(64), 1, 1);
    db.close();

    expect(() => verifyDatabaseFile(databasePath)).toThrow(/checksum failed/);
  });
});
