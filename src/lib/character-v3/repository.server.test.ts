import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { migrateDdbPayloadToCharacterV2 } from "../character-v2/migrate-ddb";
import { applyDatabaseMigrations } from "../../db/migrations.server";
import { migrateDdbPayloadToCharacterV3 } from "./migrate-v2";
import { advanceCharacterLevel } from "./operations";
import {
  CharacterV3MutationReplayMismatchError,
  CharacterV3Repository,
  CharacterV3RevisionConflictError,
} from "./repository.server";
import type { CharacterAggregate } from "./schema";

function dresana(): CharacterAggregate {
  const payload = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "cache", "char-132940690.json"), "utf8"),
  );
  return migrateDdbPayloadToCharacterV3({
    payload,
    ownerUserId: "andreas",
    campaignId: "mother-of-bob",
  });
}

function initialization(character: CharacterAggregate) {
  return {
    character,
    event: {
      mutationId: "mutation:dresana:initialize-v3",
      actorUserId: "andreas",
      characterId: character.identity.id,
      type: "initialize-character-v3",
      authorization: { mode: "owner" as const, actorRole: "player" as const, overrideReason: null },
      details: { source: "ddb-migration", externalId: 132940690 },
    },
  };
}

function levelSeven(character: CharacterAggregate) {
  const tough = character.build.decisions
    .flatMap((decision) => (decision.type === "rule-selection" ? decision.selections : []))
    .find((selection) => selection.name === "Tough")!;
  return advanceCharacterLevel(character, {
    mutationId: "mutation:dresana:level-7",
    actorUserId: "andreas",
    expectedBuildRevision: character.build.revision,
    expectedLiveStateRevision: character.liveState.revision,
    classRef: character.build.levels.at(-1)!.classRef,
    hp: {
      method: "fixed",
      hitDieContribution: 7,
      constitutionModifier: 3,
      bonuses: [{ sourceRef: tough, label: "Tough", amount: 2 }],
    },
    currentHpPolicy: "preserve-damage",
    decisions: [],
    spells: [],
  });
}

function persistedLevelEvent(result: ReturnType<typeof levelSeven>) {
  const { mutationId, actorUserId, characterId, type, authorization, ...details } =
    result.auditEvent;
  return { mutationId, actorUserId, characterId, type, authorization, details };
}

describe("Character V3 persistence repository", () => {
  let sqlite: Database.Database;
  let repository: CharacterV3Repository;

  beforeEach(() => {
    sqlite = new Database(":memory:");
    applyDatabaseMigrations(sqlite);
    repository = new CharacterV3Repository(sqlite, () => 1_750_000_000_000);
  });

  afterEach(() => sqlite.close());

  it("atomically stores the current aggregate and an ordered event stream", () => {
    const before = dresana();
    const initialized = repository.initialize(initialization(before));
    const advanced = levelSeven(before);
    const committed = repository.commit({
      expectedRevision: { build: before.build.revision, liveState: before.liveState.revision },
      character: advanced.character,
      event: persistedLevelEvent(advanced),
    });

    expect(initialized.event.expectedRevision).toBeNull();
    expect(committed.replayed).toBe(false);
    expect(repository.load(before.identity.id)).toEqual(advanced.character);
    expect(repository.eventsSince("mother-of-bob").map((event) => event.type)).toEqual([
      "initialize-character-v3",
      "advance-character-level",
    ]);
    expect(repository.eventsSince("mother-of-bob", initialized.event.sequence)).toEqual([
      committed.event,
    ]);
    expect(committed.event).toMatchObject({
      actorUserId: "andreas",
      authorization: { mode: "owner", actorRole: "player", overrideReason: null },
      expectedRevision: { build: 1, liveState: 0 },
      resultingRevision: { build: 2, liveState: 1 },
      resultingAggregateChecksum: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
  });

  it("returns an exact retry without appending or applying it twice", () => {
    const before = dresana();
    repository.initialize(initialization(before));
    const advanced = levelSeven(before);
    const input = {
      expectedRevision: { build: before.build.revision, liveState: before.liveState.revision },
      character: advanced.character,
      event: persistedLevelEvent(advanced),
    };

    const first = repository.commit(input);
    const retry = repository.commit(input);

    expect(retry).toMatchObject({ replayed: true, character: first.character, event: first.event });
    expect(repository.eventsSince("mother-of-bob")).toHaveLength(2);
  });

  it("rejects mutation-ID reuse with different content", () => {
    const before = dresana();
    repository.initialize(initialization(before));
    const advanced = levelSeven(before);
    const input = {
      expectedRevision: { build: before.build.revision, liveState: before.liveState.revision },
      character: advanced.character,
      event: persistedLevelEvent(advanced),
    };
    repository.commit(input);

    expect(() =>
      repository.commit({
        ...input,
        event: { ...input.event, details: { ...input.event.details, currentHp: "tampered" } },
      }),
    ).toThrow(CharacterV3MutationReplayMismatchError);
  });

  it("rejects stale revisions before changing the snapshot", () => {
    const before = dresana();
    repository.initialize(initialization(before));
    const advanced = levelSeven(before);

    expect(() =>
      repository.commit({
        expectedRevision: {
          build: before.build.revision + 1,
          liveState: before.liveState.revision,
        },
        character: advanced.character,
        event: {
          ...persistedLevelEvent(advanced),
          mutationId: "mutation:dresana:stale-level-7",
        },
      }),
    ).toThrow(CharacterV3RevisionConflictError);
    expect(repository.load(before.identity.id)).toEqual(before);
    expect(repository.eventsSince("mother-of-bob")).toHaveLength(1);
  });

  it("requires the owner for owner-authorized events", () => {
    const character = dresana();
    const input = initialization(character);
    input.event.actorUserId = "qemuel";

    expect(() => repository.initialize(input)).toThrow(/does not own/);
  });

  it("allows a reasoned administrator override without impersonating the owner", () => {
    const before = dresana();
    repository.initialize(initialization(before));
    const after = {
      ...before,
      liveState: {
        ...before.liveState,
        revision: before.liveState.revision + 1,
        inspiration: !before.liveState.inspiration,
      },
    };

    const committed = repository.commit({
      expectedRevision: { build: before.build.revision, liveState: before.liveState.revision },
      character: after,
      event: {
        mutationId: "mutation:dresana:creator-live-override",
        actorUserId: "qemuel",
        characterId: before.identity.id,
        type: "set-inspiration",
        authorization: {
          mode: "administrator-override",
          actorRole: "admin",
          overrideReason: "Creator corrected a live-state entry at Andreas's request.",
        },
        details: {
          inspiration: { before: before.liveState.inspiration, after: after.liveState.inspiration },
        },
      },
    });

    expect(committed.event).toMatchObject({
      actorUserId: "qemuel",
      authorization: { mode: "administrator-override", actorRole: "admin" },
    });
    expect(committed.character.identity.ownerUserId).toBe("andreas");
  });

  it("rolls back the snapshot when appending the event fails", () => {
    const before = dresana();
    repository.initialize(initialization(before));
    const advanced = levelSeven(before);
    sqlite.exec(`
      CREATE TRIGGER reject_test_mutation BEFORE INSERT ON character_v3_mutations
      WHEN NEW.event_type = 'force-test-failure'
      BEGIN
        SELECT RAISE(ABORT, 'forced event failure');
      END;
    `);

    expect(() =>
      repository.commit({
        expectedRevision: { build: before.build.revision, liveState: before.liveState.revision },
        character: advanced.character,
        event: { ...persistedLevelEvent(advanced), type: "force-test-failure" },
      }),
    ).toThrow(/forced event failure/);
    expect(repository.load(before.identity.id)).toEqual(before);
    expect(repository.eventsSince("mother-of-bob")).toHaveLength(1);
  });

  it("makes the mutation history append-only at the database boundary", () => {
    const before = dresana();
    repository.initialize(initialization(before));

    expect(() =>
      sqlite
        .prepare("UPDATE character_v3_mutations SET event_type = ? WHERE mutation_id = ?")
        .run("tampered", "mutation:dresana:initialize-v3"),
    ).toThrow(/append-only/);
    expect(() =>
      sqlite
        .prepare("DELETE FROM character_v3_mutations WHERE mutation_id = ?")
        .run("mutation:dresana:initialize-v3"),
    ).toThrow(/append-only/);
  });

  it("detects snapshot corruption before returning character data", () => {
    const before = dresana();
    repository.initialize(initialization(before));
    sqlite
      .prepare("UPDATE character_v3_snapshots SET aggregate_json = ? WHERE character_id = ?")
      .run("{}", before.identity.id);

    expect(() => repository.load(before.identity.id)).toThrow(/checksum failed/);
  });

  it("loads a supported V2 snapshot through the registry and rewrites it on atomic mutation", () => {
    const rawPayload = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "data", "cache", "char-132940690.json"), "utf8"),
    );
    const v2 = migrateDdbPayloadToCharacterV2(rawPayload, "andreas");
    const json = JSON.stringify(v2);
    const digest = createHash("sha256").update(json).digest("hex");
    sqlite
      .prepare(
        `INSERT INTO character_v3_snapshots
         (character_id, campaign_id, owner_user_id, schema_version, build_revision,
          live_state_revision, aggregate_json, aggregate_checksum, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        v2.identity.id,
        "mother-of-bob",
        "andreas",
        2,
        v2.build.revision,
        v2.liveState.revision,
        json,
        digest,
        1,
        1,
      );

    const migrated = repository.load(v2.identity.id)!;
    expect(migrated.build.schemaVersion).toBe(3);
    const updated = {
      ...migrated,
      liveState: {
        ...migrated.liveState,
        revision: migrated.liveState.revision + 1,
        inspiration: !migrated.liveState.inspiration,
      },
    };
    repository.commit({
      expectedRevision: {
        build: migrated.build.revision,
        liveState: migrated.liveState.revision,
      },
      character: updated,
      event: {
        mutationId: "mutation:dresana:rewrite-migrated-v2",
        actorUserId: "andreas",
        characterId: migrated.identity.id,
        type: "rewrite-migrated-character",
        authorization: { mode: "owner", actorRole: "player", overrideReason: null },
        details: { migratedFromSchemaVersion: 2, migratedToSchemaVersion: 3 },
      },
    });

    const metadata = sqlite
      .prepare("SELECT schema_version FROM character_v3_snapshots WHERE character_id = ?")
      .get(v2.identity.id) as { schema_version: number };
    expect(metadata.schema_version).toBe(3);
    expect(repository.load(v2.identity.id)).toEqual(updated);
  });
});
