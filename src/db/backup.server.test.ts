import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { createVerifiedBackup, verifyDatabaseFile, verifyRestoreDrill } from "./backup.server";
import { applyDatabaseMigrations } from "./migrations.server";
import { bootstrapMotherOfBobV3, MOB_CAMPAIGN_ID, MOB_USERS } from "../lib/character-v3/mob-bootstrap.server";
import { CharacterV3Repository } from "../lib/character-v3/repository.server";

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

  it("restores MOB users, ownership, memberships, snapshots, revisions, and mutation history", async () => {
    const directory = temporaryDirectory();
    const sourcePath = path.join(directory, "mob-source.sqlite");
    const backupPath = path.join(directory, "backups", "mob-source.backup.sqlite");
    const restoredPath = path.join(directory, "restore-drill", "mob-restored.sqlite");
    const inspectRestorePath = path.join(directory, "restore-inspection", "mob-restored.sqlite");
    const source = new Database(sourcePath);
    applyDatabaseMigrations(source, () => 1_750_000_000_000);
    bootstrapMotherOfBobV3(source, () => 1_750_000_000_001);
    const sourceRepository = new CharacterV3Repository(source, () => 1_750_000_000_002);
    const qem = sourceRepository.load("mob:character:97349530")!;
    sourceRepository.setInspiration(qem.identity.id, {
      mutationId: "mutation:backup-drill:qemuel-inspiration",
      actorUserId: "qemuel",
      expectedBuildRevision: qem.build.revision,
      expectedLiveStateRevision: qem.liveState.revision,
      inspiration: !qem.liveState.inspiration,
    });
    const expectedSnapshot = sourceRepository.campaignSnapshot(MOB_CAMPAIGN_ID);
    const expectedEvents = sourceRepository.eventsSince(MOB_CAMPAIGN_ID);
    source.close();

    const backupManifest = await createVerifiedBackup({ sourcePath, destinationPath: backupPath });
    const restoredManifest = verifyRestoreDrill({ backupPath, restoredPath });
    expect(restoredManifest).toEqual(backupManifest);

    fs.mkdirSync(path.dirname(inspectRestorePath), { recursive: true });
    fs.copyFileSync(backupPath, inspectRestorePath, fs.constants.COPYFILE_EXCL);
    expect(verifyDatabaseFile(inspectRestorePath)).toEqual(backupManifest);

    const restored = new Database(inspectRestorePath);
    try {
      const restoredRepository = new CharacterV3Repository(restored, () => 1_750_000_000_003);
      const restoredSnapshot = restoredRepository.campaignSnapshot(MOB_CAMPAIGN_ID);
      const restoredEvents = restoredRepository.eventsSince(MOB_CAMPAIGN_ID);
      const members = restored
        .prepare("SELECT user_id FROM campaign_members WHERE campaign_id = ? ORDER BY user_id")
        .all(MOB_CAMPAIGN_ID) as Array<{ user_id: string }>;
      const campaign = restored
        .prepare("SELECT dm_user_id FROM campaigns WHERE id = ?")
        .get(MOB_CAMPAIGN_ID) as { dm_user_id: string } | undefined;
      const users = restored
        .prepare("SELECT id FROM users ORDER BY id")
        .all() as Array<{ id: string }>;

      expect(campaign?.dm_user_id).toBe("danny");
      expect(users.map((user) => user.id)).toEqual(MOB_USERS.map((user) => user.id).sort());
      expect(members.map((member) => member.user_id)).toEqual(MOB_USERS.map((user) => user.id).sort());
      expect(restoredSnapshot).toEqual(expectedSnapshot);
      expect(restoredEvents).toEqual(expectedEvents);
      expect(restoredSnapshot.characters).toHaveLength(5);
      expect(restoredEvents).toHaveLength(6);
      expect(restoredSnapshot.characters.map((character) => character.identity.ownerUserId).sort()).toEqual(
        ["alexia", "andreas", "eleni", "nikos", "qemuel"],
      );
      expect(restoredSnapshot.characters.find((character) => character.identity.ownerUserId === "qemuel")?.liveState.inspiration).toBe(
        !qem.liveState.inspiration,
      );
    } finally {
      restored.close();
    }
  });
});
