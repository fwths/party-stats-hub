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

  it("commits hardened live-state operations from the stored snapshot", () => {
    const before = dresana();
    repository.initialize(initialization(before));

    const inspired = repository.setInspiration(before.identity.id, {
      mutationId: "mutation:dresana:gain-inspiration",
      actorUserId: "andreas",
      expectedBuildRevision: before.build.revision,
      expectedLiveStateRevision: before.liveState.revision,
      inspiration: false,
    });

    expect(inspired.character.liveState.inspiration).toBe(false);
    expect(inspired.event).toMatchObject({
      type: "set-character-inspiration",
      expectedRevision: { build: before.build.revision, liveState: before.liveState.revision },
      resultingRevision: {
        build: before.build.revision,
        liveState: before.liveState.revision + 1,
      },
      details: { change: { before: before.liveState.inspiration, after: false } },
    });
    expect(repository.load(before.identity.id)).toEqual(inspired.character);
    expect(repository.eventsSince("mother-of-bob").map((event) => event.type)).toEqual([
      "initialize-character-v3",
      "set-character-inspiration",
    ]);
  });

  it("commits atomic level advancement from the stored snapshot", () => {
    const before = dresana();
    repository.initialize(initialization(before));
    const tough = before.build.decisions
      .flatMap((decision) => (decision.type === "rule-selection" ? decision.selections : []))
      .find((selection) => selection.name === "Tough")!;

    const committed = repository.advanceCharacterLevel(before.identity.id, {
      mutationId: "mutation:dresana:repository-level-8",
      actorUserId: "andreas",
      expectedBuildRevision: before.build.revision,
      expectedLiveStateRevision: before.liveState.revision,
      classRef: before.build.levels.at(-1)!.classRef,
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

    expect(committed.event).toMatchObject({
      type: "advance-character-level",
      expectedRevision: { build: before.build.revision, liveState: before.liveState.revision },
      resultingRevision: {
        build: before.build.revision + 1,
        liveState: before.liveState.revision + 1,
      },
      details: {
        characterLevel: { before: 7, after: 8 },
        maximumHp: { before: 89, after: 101 },
      },
    });
    expect(repository.load(before.identity.id)).toEqual(committed.character);
    expect(repository.eventsSince("mother-of-bob").map((event) => event.type)).toEqual([
      "initialize-character-v3",
      "advance-character-level",
    ]);
  });

  it("commits condition add/remove as ordered sync events", () => {
    const before = dresana();
    repository.initialize(initialization(before));
    const condition = {
      id: "condition:dresana:prone:round-2",
      conditionRef: null,
      label: "Prone",
      sourceLabel: "Battlefield shove",
      appliedByUserId: "danny",
    };

    const added = repository.addCondition(before.identity.id, {
      mutationId: "mutation:dresana:add-prone",
      actorUserId: "andreas",
      expectedBuildRevision: before.build.revision,
      expectedLiveStateRevision: before.liveState.revision,
      condition,
    });
    const removed = repository.removeCondition(before.identity.id, {
      mutationId: "mutation:dresana:remove-prone",
      actorUserId: "andreas",
      expectedBuildRevision: added.character.build.revision,
      expectedLiveStateRevision: added.character.liveState.revision,
      conditionId: condition.id,
    });

    expect(added.event.details).toEqual({ condition });
    expect(removed.event.details).toEqual({ condition });
    expect(repository.load(before.identity.id)?.liveState.conditions).not.toContainEqual(condition);
    expect(repository.eventsSince("mother-of-bob").map((event) => event.type)).toEqual([
      "initialize-character-v3",
      "add-character-condition",
      "remove-character-condition",
    ]);
  });

  it("commits Hit Point operations as ordered sync events", () => {
    const before = dresana();
    repository.initialize(initialization(before));

    const damaged = repository.applyDamage(before.identity.id, {
      mutationId: "mutation:dresana:take-5-damage",
      actorUserId: "andreas",
      expectedBuildRevision: before.build.revision,
      expectedLiveStateRevision: before.liveState.revision,
      amount: 5,
      criticalHit: false,
    });
    const healed = repository.restoreHitPoints(before.identity.id, {
      mutationId: "mutation:dresana:heal-3",
      actorUserId: "andreas",
      expectedBuildRevision: damaged.character.build.revision,
      expectedLiveStateRevision: damaged.character.liveState.revision,
      amount: 3,
    });
    const temped = repository.grantTemporaryHitPoints(before.identity.id, {
      mutationId: "mutation:dresana:temp-4",
      actorUserId: "andreas",
      expectedBuildRevision: healed.character.build.revision,
      expectedLiveStateRevision: healed.character.liveState.revision,
      amount: 4,
    });

    expect(damaged.event).toMatchObject({
      type: "apply-damage",
      details: {
        before: {
          currentHp: before.liveState.currentHp,
          temporaryHp: before.liveState.temporaryHp,
        },
        after: { currentHp: before.liveState.currentHp - 5, temporaryHp: 0 },
      },
    });
    expect(healed.character.liveState.currentHp).toBe(before.liveState.currentHp - 2);
    expect(temped.character.liveState.temporaryHp).toBe(4);
    expect(repository.load(before.identity.id)).toEqual(temped.character);
    expect(repository.eventsSince("mother-of-bob").map((event) => event.type)).toEqual([
      "initialize-character-v3",
      "apply-damage",
      "restore-hit-points",
      "grant-temporary-hit-points",
    ]);
  });

  it("commits death-save and stabilization operations from the stored snapshot", () => {
    const before = dresana();
    repository.initialize(initialization(before));
    const dropped = repository.applyDamage(before.identity.id, {
      mutationId: "mutation:dresana:drop-to-zero",
      actorUserId: "andreas",
      expectedBuildRevision: before.build.revision,
      expectedLiveStateRevision: before.liveState.revision,
      amount: before.liveState.currentHp,
      criticalHit: false,
    });
    const deathSave = repository.recordDeathSave(before.identity.id, {
      mutationId: "mutation:dresana:death-save-success",
      actorUserId: "andreas",
      expectedBuildRevision: dropped.character.build.revision,
      expectedLiveStateRevision: dropped.character.liveState.revision,
      result: "success",
    });
    const stabilized = repository.stabilizeCharacter(before.identity.id, {
      mutationId: "mutation:dresana:stabilize",
      actorUserId: "andreas",
      expectedBuildRevision: deathSave.character.build.revision,
      expectedLiveStateRevision: deathSave.character.liveState.revision,
    });

    expect(dropped.character.liveState.currentHp).toBe(0);
    expect(deathSave.character.liveState.deathSaves.successes).toBe(1);
    expect(stabilized.character.liveState.deathSaves).toEqual({
      successes: 0,
      failures: 0,
      stabilized: true,
    });
    expect(repository.eventsSince("mother-of-bob").map((event) => event.type)).toEqual([
      "initialize-character-v3",
      "apply-damage",
      "record-death-save",
      "stabilize-character",
    ]);
  });

  it("rejects stale repository live-state commands without appending events", () => {
    const before = dresana();
    repository.initialize(initialization(before));
    repository.setExhaustion(before.identity.id, {
      mutationId: "mutation:dresana:set-exhaustion",
      actorUserId: "andreas",
      expectedBuildRevision: before.build.revision,
      expectedLiveStateRevision: before.liveState.revision,
      exhaustion: 1,
    });

    expect(() =>
      repository.setInspiration(before.identity.id, {
        mutationId: "mutation:dresana:stale-inspiration",
        actorUserId: "andreas",
        expectedBuildRevision: before.build.revision,
        expectedLiveStateRevision: before.liveState.revision,
        inspiration: true,
      }),
    ).toThrow(/revision conflict/);
    expect(repository.eventsSince("mother-of-bob").map((event) => event.type)).toEqual([
      "initialize-character-v3",
      "set-character-exhaustion",
    ]);
  });

  it("persists a 2024 Long Rest as one audited campaign event", () => {
    const before = dresana();
    repository.initialize(initialization(before));
    const result = repository.takeLongRest(before.identity.id, {
      mutationId: "mutation:dresana:long-rest",
      actorUserId: "andreas",
      expectedBuildRevision: before.build.revision,
      expectedLiveStateRevision: before.liveState.revision,
    });

    expect(result.character.liveState.revision).toBe(before.liveState.revision + 1);
    expect(repository.load(before.identity.id)).toEqual(result.character);
    expect(repository.eventsSince("mother-of-bob").at(-1)?.type).toBe(
      "take-character-long-rest",
    );
  });

  it("replays exact repository live-state command retries without double-appending", () => {
    const before = dresana();
    repository.initialize(initialization(before));
    const input = {
      mutationId: "mutation:dresana:repository-inspiration-retry",
      actorUserId: "andreas",
      expectedBuildRevision: before.build.revision,
      expectedLiveStateRevision: before.liveState.revision,
      inspiration: false,
    };

    const first = repository.setInspiration(before.identity.id, input);
    const retry = repository.setInspiration(before.identity.id, input);

    expect(retry.replayed).toBe(true);
    expect(retry).toEqual({ ...first, replayed: true });
    expect(() =>
      repository.setInspiration(before.identity.id, { ...input, inspiration: true }),
    ).toThrow(CharacterV3MutationReplayMismatchError);
    expect(repository.eventsSince("mother-of-bob")).toHaveLength(2);
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
