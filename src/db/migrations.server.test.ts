import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  applyDatabaseMigrations,
  DatabaseMigrationIntegrityError,
  registeredDatabaseMigrations,
  verifyDatabaseMigrations,
} from "./migrations.server";

describe("reviewed database migrations", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
  });

  afterEach(() => db.close());

  it("applies the V3 authority schema transactionally and only once", () => {
    const first = applyDatabaseMigrations(db, () => 1_750_000_000_000);
    const second = applyDatabaseMigrations(db, () => 1_750_000_000_001);

    expect(first).toEqual([
      {
        ...registeredDatabaseMigrations()[0],
        appliedAt: 1_750_000_000_000,
      },
    ]);
    expect(second).toEqual([]);
    expect(
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'character_v3_%' ORDER BY name",
        )
        .all(),
    ).toEqual([{ name: "character_v3_mutations" }, { name: "character_v3_snapshots" }]);
    expect(() => verifyDatabaseMigrations(db)).not.toThrow();
  });

  it("fails closed when an applied migration checksum is altered", () => {
    applyDatabaseMigrations(db);
    db.prepare("UPDATE app_schema_migrations SET checksum = ?").run("0".repeat(64));

    expect(() => applyDatabaseMigrations(db)).toThrow(DatabaseMigrationIntegrityError);
    expect(() => verifyDatabaseMigrations(db)).toThrow(/manifest differs/);
  });

  it("fails closed when the database contains a migration unknown to this app", () => {
    applyDatabaseMigrations(db);
    db.prepare("INSERT INTO app_schema_migrations (id, checksum, applied_at) VALUES (?, ?, ?)").run(
      "2099-01-01-future",
      "f".repeat(64),
      1,
    );

    expect(() => applyDatabaseMigrations(db)).toThrow(/older than the database/);
  });
});
