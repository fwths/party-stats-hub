import type Database from "better-sqlite3";

export type AppliedDatabaseMigration = {
  id: string;
  checksum: string;
  appliedAt: number;
};

export class DatabaseMigrationIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseMigrationIntegrityError";
  }
}

const migrations = [
  {
    id: "2026-06-30-001-character-v3-authority",
    checksum: "7b1525f90c118acaf654dec0168ddb740ac75a5f16918adbb3130d76bbd58111",
    sql: `
      CREATE TABLE character_v3_snapshots (
        character_id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        owner_user_id TEXT NOT NULL,
        schema_version INTEGER NOT NULL CHECK (schema_version BETWEEN 2 AND 3),
        build_revision INTEGER NOT NULL CHECK (build_revision >= 1),
        live_state_revision INTEGER NOT NULL CHECK (live_state_revision >= 0),
        aggregate_json TEXT NOT NULL,
        aggregate_checksum TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX character_v3_snapshots_campaign_idx
        ON character_v3_snapshots(campaign_id);
      CREATE INDEX character_v3_snapshots_owner_idx
        ON character_v3_snapshots(owner_user_id);

      CREATE TABLE character_v3_mutations (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        mutation_id TEXT NOT NULL UNIQUE,
        character_id TEXT NOT NULL,
        campaign_id TEXT NOT NULL,
        actor_user_id TEXT NOT NULL,
        actor_role TEXT NOT NULL CHECK (actor_role IN ('player', 'dm', 'admin')),
        authorization_mode TEXT NOT NULL
          CHECK (authorization_mode IN ('owner', 'administrator-override')),
        override_reason TEXT,
        event_type TEXT NOT NULL,
        expected_build_revision INTEGER,
        expected_live_state_revision INTEGER,
        resulting_build_revision INTEGER NOT NULL,
        resulting_live_state_revision INTEGER NOT NULL,
        details_json TEXT NOT NULL,
        resulting_aggregate_json TEXT NOT NULL,
        resulting_aggregate_checksum TEXT NOT NULL,
        committed_at INTEGER NOT NULL
      );
      CREATE INDEX character_v3_mutations_character_sequence_idx
        ON character_v3_mutations(character_id, sequence);
      CREATE INDEX character_v3_mutations_campaign_sequence_idx
        ON character_v3_mutations(campaign_id, sequence);

      CREATE TRIGGER character_v3_mutations_no_update
        BEFORE UPDATE ON character_v3_mutations
        BEGIN
          SELECT RAISE(ABORT, 'character V3 mutations are append-only');
        END;
      CREATE TRIGGER character_v3_mutations_no_delete
        BEFORE DELETE ON character_v3_mutations
        BEGIN
          SELECT RAISE(ABORT, 'character V3 mutations are append-only');
        END;
    `,
  },
] as const;

export function registeredDatabaseMigrations(): ReadonlyArray<{ id: string; checksum: string }> {
  return migrations.map((migration) => ({
    id: migration.id,
    checksum: migration.checksum,
  }));
}

export function databaseMigrationSources(): ReadonlyArray<{
  id: string;
  checksum: string;
  sql: string;
}> {
  return migrations;
}

export function applyDatabaseMigrations(
  db: Database.Database,
  now: () => number = Date.now,
): AppliedDatabaseMigration[] {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_schema_migrations (
      id TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);

  const registered = new Map(registeredDatabaseMigrations().map((entry) => [entry.id, entry]));
  const existing = db
    .prepare("SELECT id, checksum, applied_at FROM app_schema_migrations ORDER BY id")
    .all() as Array<{ id: string; checksum: string; applied_at: number }>;
  for (const row of existing) {
    const known = registered.get(row.id);
    if (!known) {
      throw new DatabaseMigrationIntegrityError(
        `Database contains unknown migration ${row.id}; this application may be older than the database`,
      );
    }
    if (known.checksum !== row.checksum) {
      throw new DatabaseMigrationIntegrityError(`Migration checksum mismatch for ${row.id}`);
    }
  }

  const applied: AppliedDatabaseMigration[] = [];
  for (const migration of migrations) {
    if (existing.some((row) => row.id === migration.id)) continue;
    const checksum = migration.checksum;
    const appliedAt = now();
    db.transaction(() => {
      db.exec(migration.sql);
      db.prepare(
        "INSERT INTO app_schema_migrations (id, checksum, applied_at) VALUES (?, ?, ?)",
      ).run(migration.id, checksum, appliedAt);
    }).immediate();
    applied.push({ id: migration.id, checksum, appliedAt });
  }
  return applied;
}

export function verifyDatabaseMigrations(db: Database.Database): void {
  const expected = registeredDatabaseMigrations();
  const actual = db
    .prepare("SELECT id, checksum FROM app_schema_migrations ORDER BY id")
    .all() as Array<{ id: string; checksum: string }>;
  if (actual.length !== expected.length) {
    throw new DatabaseMigrationIntegrityError(
      `Expected ${expected.length} database migrations, found ${actual.length}`,
    );
  }
  expected.forEach((migration, index) => {
    if (actual[index]?.id !== migration.id || actual[index]?.checksum !== migration.checksum) {
      throw new DatabaseMigrationIntegrityError(
        `Database migration manifest differs at ${migration.id}`,
      );
    }
  });
}
