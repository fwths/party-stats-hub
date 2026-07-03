import { createHash } from "node:crypto";
import type Database from "better-sqlite3";
import { migratePersistedCharacter } from "./migration-registry";
import {
  applyDamage,
  grantTemporaryHitPoints,
  recordDeathSave,
  restoreHitPoints,
  stabilizeCharacter,
} from "./hit-point-operations";
import {
  addCharacterCondition,
  recoverCharacterResources,
  removeCharacterCondition,
  setCharacterExhaustion,
  setCharacterInspiration,
  spendCharacterResource,
  takeCharacterLongRest,
  takeCharacterShortRest,
} from "./live-state-operations";
import { advanceCharacterLevel } from "./operations";
import { mutateCompanion } from "./companion-operations";
import { mutateItem } from "./item-operations";
import { confirmImportedFoundation } from "./foundation-confirmation";
import {
  CommitCharacterMutationInputSchema,
  InitializeCharacterInputSchema,
  PersistedCharacterMutationSchema,
  type PersistedCharacterMutation,
} from "./persistence";
import { CharacterAggregateSchema, type CharacterAggregate } from "./schema";
import { characterV3PublicError } from "./public-errors";

type SnapshotRow = {
  character_id: string;
  campaign_id: string;
  schema_version: number;
  aggregate_json: string;
  aggregate_checksum: string;
};

type MutationRow = {
  sequence: number;
  mutation_id: string;
  character_id: string;
  campaign_id: string;
  actor_user_id: string;
  actor_role: "player" | "dm" | "admin";
  authorization_mode: "owner" | "administrator-override";
  override_reason: string | null;
  event_type: string;
  expected_build_revision: number | null;
  expected_live_state_revision: number | null;
  resulting_build_revision: number;
  resulting_live_state_revision: number;
  details_json: string;
  resulting_aggregate_json: string;
  resulting_aggregate_checksum: string;
  committed_at: number;
};

export class CharacterV3RevisionConflictError extends Error {
  constructor(
    expectedBuild: number,
    actualBuild: number,
    expectedLive: number,
    actualLive: number,
  ) {
    super(
      characterV3PublicError(
        "REVISION_CONFLICT",
        `Character revision conflict: expected build/live ${expectedBuild}/${expectedLive}, found ${actualBuild}/${actualLive}`,
      ).message,
    );
    this.name = "CharacterV3RevisionConflictError";
  }
}

export class CharacterV3MutationReplayMismatchError extends Error {
  constructor(mutationId: string) {
    super(
      characterV3PublicError(
        "MUTATION_ID_REUSED",
        `Mutation ID ${mutationId} was already used with different content`,
      ).message,
    );
    this.name = "CharacterV3MutationReplayMismatchError";
  }
}

export type CharacterV3CommitResult = {
  character: CharacterAggregate;
  event: PersistedCharacterMutation;
  replayed: boolean;
};

export type CharacterV3CampaignSnapshot = {
  campaignId: string;
  cursor: number;
  characters: CharacterAggregate[];
};

type AuditedCharacterMutation = {
  character: CharacterAggregate;
  auditEvent: {
    mutationId: string;
    actorUserId: string;
    characterId: string;
    type: string;
    authorization: {
      mode: "owner" | "administrator-override";
      actorRole: "player" | "dm" | "admin";
      overrideReason: string | null;
    };
    buildRevision: { before: number; after: number };
    liveStateRevision: { before: number; after: number };
  } & Record<string, unknown>;
};

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new Error("Value is not JSON serializable");
    return encoded;
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, child]) => child !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`).join(",")}}`;
}

function checksum(json: string): string {
  return createHash("sha256").update(json).digest("hex");
}

function sameIdentity(before: CharacterAggregate, after: CharacterAggregate): boolean {
  return (
    before.identity.id === after.identity.id &&
    before.identity.campaignId === after.identity.campaignId &&
    before.identity.ownerUserId === after.identity.ownerUserId
  );
}

export class CharacterV3Repository {
  constructor(
    private readonly db: Database.Database,
    private readonly now: () => number = Date.now,
  ) {}

  initialize(rawInput: unknown): CharacterV3CommitResult {
    const input = InitializeCharacterInputSchema.parse(rawInput);
    this.validateEventAuthority(input.character, input.event);
    const aggregateJson = canonicalJson(input.character);
    const aggregateChecksum = checksum(aggregateJson);

    return this.db
      .transaction(() => {
        const replay = this.findMutation(input.event.mutationId);
        if (replay) {
          return this.replayOrThrow(replay, null, input.character, input.event, aggregateJson);
        }
        if (this.load(input.character.identity.id)) {
          throw new Error(`Character ${input.character.identity.id} is already initialized`);
        }
        const committedAt = this.now();
        this.insertSnapshot(input.character, aggregateJson, aggregateChecksum, committedAt);
        const event = this.insertMutation(
          input.character,
          input.event,
          null,
          aggregateJson,
          aggregateChecksum,
          committedAt,
        );
        return { character: input.character, event, replayed: false };
      })
      .immediate();
  }

  commit(rawInput: unknown): CharacterV3CommitResult {
    const input = CommitCharacterMutationInputSchema.parse(rawInput);
    const aggregateJson = canonicalJson(input.character);
    const aggregateChecksum = checksum(aggregateJson);

    return this.db
      .transaction(() => {
        const replay = this.findMutation(input.event.mutationId);
        if (replay) {
          return this.replayOrThrow(
            replay,
            input.expectedRevision,
            input.character,
            input.event,
            aggregateJson,
          );
        }
        const current = this.load(input.character.identity.id);
        if (!current)
          throw new Error(`Character ${input.character.identity.id} is not initialized`);
        this.validateEventAuthority(current, input.event);
        if (!sameIdentity(current, input.character)) {
          throw new Error(
            "Ordinary character mutations cannot change character, campaign, or owner identity",
          );
        }
        const actualBuild = current.build.revision;
        const actualLive = current.liveState.revision;
        if (
          input.expectedRevision.build !== actualBuild ||
          input.expectedRevision.liveState !== actualLive
        ) {
          throw new CharacterV3RevisionConflictError(
            input.expectedRevision.build,
            actualBuild,
            input.expectedRevision.liveState,
            actualLive,
          );
        }
        this.validateRevisionStep(current, input.character);
        const committedAt = this.now();
        this.updateSnapshot(
          input.character,
          input.expectedRevision,
          aggregateJson,
          aggregateChecksum,
          committedAt,
        );
        const event = this.insertMutation(
          input.character,
          input.event,
          input.expectedRevision,
          aggregateJson,
          aggregateChecksum,
          committedAt,
        );
        return { character: input.character, event, replayed: false };
      })
      .immediate();
  }

  spendResource(characterId: string, rawInput: unknown): CharacterV3CommitResult {
    return this.commitAuditedOperation(characterId, rawInput, (character) =>
      spendCharacterResource(character, rawInput),
    );
  }

  recoverResources(characterId: string, rawInput: unknown): CharacterV3CommitResult {
    return this.commitAuditedOperation(characterId, rawInput, (character) =>
      recoverCharacterResources(character, rawInput),
    );
  }

  takeShortRest(characterId: string, rawInput: unknown): CharacterV3CommitResult {
    return this.commitAuditedOperation(characterId, rawInput, (character) =>
      takeCharacterShortRest(character, rawInput),
    );
  }

  takeLongRest(characterId: string, rawInput: unknown): CharacterV3CommitResult {
    return this.commitAuditedOperation(characterId, rawInput, (character) =>
      takeCharacterLongRest(character, rawInput),
    );
  }

  setInspiration(characterId: string, rawInput: unknown): CharacterV3CommitResult {
    return this.commitAuditedOperation(characterId, rawInput, (character) =>
      setCharacterInspiration(character, rawInput),
    );
  }

  setExhaustion(characterId: string, rawInput: unknown): CharacterV3CommitResult {
    return this.commitAuditedOperation(characterId, rawInput, (character) =>
      setCharacterExhaustion(character, rawInput),
    );
  }

  addCondition(characterId: string, rawInput: unknown): CharacterV3CommitResult {
    return this.commitAuditedOperation(characterId, rawInput, (character) =>
      addCharacterCondition(character, rawInput),
    );
  }

  removeCondition(characterId: string, rawInput: unknown): CharacterV3CommitResult {
    return this.commitAuditedOperation(characterId, rawInput, (character) =>
      removeCharacterCondition(character, rawInput),
    );
  }

  applyDamage(characterId: string, rawInput: unknown): CharacterV3CommitResult {
    return this.commitAuditedOperation(characterId, rawInput, (character) =>
      applyDamage(character, rawInput),
    );
  }

  restoreHitPoints(characterId: string, rawInput: unknown): CharacterV3CommitResult {
    return this.commitAuditedOperation(characterId, rawInput, (character) =>
      restoreHitPoints(character, rawInput),
    );
  }

  grantTemporaryHitPoints(characterId: string, rawInput: unknown): CharacterV3CommitResult {
    return this.commitAuditedOperation(characterId, rawInput, (character) =>
      grantTemporaryHitPoints(character, rawInput),
    );
  }

  recordDeathSave(characterId: string, rawInput: unknown): CharacterV3CommitResult {
    return this.commitAuditedOperation(characterId, rawInput, (character) =>
      recordDeathSave(character, rawInput),
    );
  }

  stabilizeCharacter(characterId: string, rawInput: unknown): CharacterV3CommitResult {
    return this.commitAuditedOperation(characterId, rawInput, (character) =>
      stabilizeCharacter(character, rawInput),
    );
  }

  mutateCompanion(characterId: string, rawInput: unknown): CharacterV3CommitResult {
    return this.commitAuditedOperation(characterId, rawInput, (character) =>
      mutateCompanion(character, rawInput),
    );
  }

  mutateItem(characterId: string, rawInput: unknown): CharacterV3CommitResult {
    return this.commitAuditedOperation(characterId, rawInput, (character) =>
      mutateItem(character, rawInput),
    );
  }

  advanceCharacterLevel(characterId: string, rawInput: unknown): CharacterV3CommitResult {
    return this.commitAuditedOperation(characterId, rawInput, (character) =>
      advanceCharacterLevel(character, rawInput),
    );
  }

  confirmImportedFoundation(characterId: string, rawInput: unknown): CharacterV3CommitResult {
    const input = rawInput as Omit<Parameters<typeof confirmImportedFoundation>[0], "character">;
    return this.commitAuditedOperation(characterId, rawInput, (character) =>
      confirmImportedFoundation({ character, ...input }),
    );
  }

  load(characterId: string): CharacterAggregate | null {
    const row = this.db
      .prepare(
        "SELECT character_id, campaign_id, schema_version, aggregate_json, aggregate_checksum FROM character_v3_snapshots WHERE character_id = ?",
      )
      .get(characterId) as SnapshotRow | undefined;
    if (!row) return null;
    if (checksum(row.aggregate_json) !== row.aggregate_checksum) {
      throw new Error(`Character snapshot checksum failed for ${characterId}`);
    }
    const migration = migratePersistedCharacter(JSON.parse(row.aggregate_json), {
      campaignId: row.campaign_id,
    });
    if (migration.sourceVersion !== row.schema_version) {
      throw new Error(`Snapshot schema-version metadata mismatch for ${characterId}`);
    }
    const character = CharacterAggregateSchema.parse(migration.character);
    if (character.identity.id !== row.character_id)
      throw new Error("Snapshot character identity mismatch");
    return character;
  }

  eventsSince(campaignId: string, afterSequence = 0, limit = 100): PersistedCharacterMutation[] {
    if (!Number.isInteger(afterSequence) || afterSequence < 0)
      throw new Error("Invalid event cursor");
    if (!Number.isInteger(limit) || limit < 1 || limit > 500)
      throw new Error("Invalid event limit");
    const rows = this.db
      .prepare(
        "SELECT * FROM character_v3_mutations WHERE campaign_id = ? AND sequence > ? ORDER BY sequence ASC LIMIT ?",
      )
      .all(campaignId, afterSequence, limit) as MutationRow[];
    return rows.map((row) => this.fromMutationRow(row));
  }

  campaignSnapshot(campaignId: string): CharacterV3CampaignSnapshot {
    if (!campaignId.trim()) throw new Error("Invalid campaign ID");
    return this.db.transaction(() => {
      const ids = this.db
        .prepare(
          "SELECT character_id FROM character_v3_snapshots WHERE campaign_id = ? ORDER BY character_id ASC",
        )
        .all(campaignId) as Array<{ character_id: string }>;
      const characters = ids.map(({ character_id }) => {
        const character = this.load(character_id);
        if (!character) throw new Error(`Character ${character_id} disappeared during snapshot read`);
        return character;
      });
      const highWater = this.db
        .prepare(
          "SELECT COALESCE(MAX(sequence), 0) AS cursor FROM character_v3_mutations WHERE campaign_id = ?",
        )
        .get(campaignId) as { cursor: number };
      return { campaignId, cursor: highWater.cursor, characters };
    })();
  }

  private commitAuditedOperation(
    characterId: string,
    rawInput: unknown,
    operation: (character: CharacterAggregate) => AuditedCharacterMutation,
  ): CharacterV3CommitResult {
    const replayBase = this.loadReplayBase(characterId, rawInput);
    const current = replayBase ?? this.load(characterId);
    if (!current) throw new Error(`Character ${characterId} is not initialized`);
    let result: AuditedCharacterMutation;
    try {
      result = operation(current);
    } catch (error) {
      if (
        replayBase &&
        typeof rawInput === "object" &&
        rawInput !== null &&
        "mutationId" in rawInput &&
        typeof rawInput.mutationId === "string"
      ) {
        throw new CharacterV3MutationReplayMismatchError(rawInput.mutationId);
      }
      throw error;
    }
    const { auditEvent } = result;
    const {
      mutationId,
      actorUserId,
      characterId: eventCharacterId,
      type,
      authorization,
      buildRevision,
      liveStateRevision,
      ...details
    } = auditEvent;
    return this.commit({
      expectedRevision: {
        build: buildRevision.before,
        liveState: liveStateRevision.before,
      },
      character: result.character,
      event: {
        mutationId,
        actorUserId,
        characterId: eventCharacterId,
        type,
        authorization,
        details,
      },
    });
  }

  private validateEventAuthority(
    character: CharacterAggregate,
    event: { actorUserId: string; characterId: string; authorization: { mode: string } },
  ): void {
    if (event.characterId !== character.identity.id)
      throw new Error("Event character does not match aggregate");
    if (
      event.authorization.mode === "owner" &&
      event.actorUserId !== character.identity.ownerUserId
    ) {
      throw new Error("Owner-authorized event actor does not own the character");
    }
  }

  private validateRevisionStep(before: CharacterAggregate, after: CharacterAggregate): void {
    const buildDelta = after.build.revision - before.build.revision;
    const liveDelta = after.liveState.revision - before.liveState.revision;
    if ((buildDelta !== 0 && buildDelta !== 1) || (liveDelta !== 0 && liveDelta !== 1)) {
      throw new Error("A mutation may increment each revision by at most one");
    }
    if (buildDelta === 0 && liveDelta === 0) throw new Error("A mutation must advance a revision");
  }

  private insertSnapshot(
    character: CharacterAggregate,
    json: string,
    digest: string,
    at: number,
  ): void {
    this.db
      .prepare(
        `INSERT INTO character_v3_snapshots
       (character_id, campaign_id, owner_user_id, schema_version, build_revision, live_state_revision,
        aggregate_json, aggregate_checksum, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        character.identity.id,
        character.identity.campaignId,
        character.identity.ownerUserId,
        character.build.schemaVersion,
        character.build.revision,
        character.liveState.revision,
        json,
        digest,
        at,
        at,
      );
  }

  private updateSnapshot(
    character: CharacterAggregate,
    expected: { build: number; liveState: number },
    json: string,
    digest: string,
    at: number,
  ): void {
    const result = this.db
      .prepare(
        `UPDATE character_v3_snapshots SET schema_version = ?, build_revision = ?, live_state_revision = ?,
       aggregate_json = ?, aggregate_checksum = ?, updated_at = ? WHERE character_id = ?
       AND build_revision = ? AND live_state_revision = ?`,
      )
      .run(
        character.build.schemaVersion,
        character.build.revision,
        character.liveState.revision,
        json,
        digest,
        at,
        character.identity.id,
        expected.build,
        expected.liveState,
      );
    if (result.changes !== 1) {
      const current = this.load(character.identity.id);
      if (current) {
        throw new CharacterV3RevisionConflictError(
          expected.build,
          current.build.revision,
          expected.liveState,
          current.liveState.revision,
        );
      }
      throw new Error("Character snapshot update failed");
    }
  }

  private insertMutation(
    character: CharacterAggregate,
    event: {
      mutationId: string;
      actorUserId: string;
      type: string;
      authorization: { actorRole: string; mode: string; overrideReason: string | null };
      details: Record<string, unknown>;
    },
    expected: { build: number; liveState: number } | null,
    aggregateJson: string,
    aggregateChecksum: string,
    committedAt: number,
  ): PersistedCharacterMutation {
    const result = this.db
      .prepare(
        `INSERT INTO character_v3_mutations
       (mutation_id, character_id, campaign_id, actor_user_id, actor_role, authorization_mode,
        override_reason, event_type, expected_build_revision, expected_live_state_revision,
        resulting_build_revision, resulting_live_state_revision, details_json,
        resulting_aggregate_json, resulting_aggregate_checksum, committed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        event.mutationId,
        character.identity.id,
        character.identity.campaignId,
        event.actorUserId,
        event.authorization.actorRole,
        event.authorization.mode,
        event.authorization.overrideReason,
        event.type,
        expected?.build ?? null,
        expected?.liveState ?? null,
        character.build.revision,
        character.liveState.revision,
        canonicalJson(event.details),
        aggregateJson,
        aggregateChecksum,
        committedAt,
      );
    return this.fromMutationRow(
      this.db
        .prepare("SELECT * FROM character_v3_mutations WHERE sequence = ?")
        .get(result.lastInsertRowid) as MutationRow,
    );
  }

  private findMutation(mutationId: string): MutationRow | null {
    return (
      (this.db
        .prepare("SELECT * FROM character_v3_mutations WHERE mutation_id = ?")
        .get(mutationId) as MutationRow | undefined) ?? null
    );
  }

  private loadReplayBase(characterId: string, rawInput: unknown): CharacterAggregate | null {
    if (
      typeof rawInput !== "object" ||
      rawInput === null ||
      !("mutationId" in rawInput) ||
      typeof rawInput.mutationId !== "string"
    ) {
      return null;
    }
    const replay = this.findMutation(rawInput.mutationId);
    if (!replay) return null;
    if (replay.character_id !== characterId || replay.expected_build_revision === null) {
      throw new CharacterV3MutationReplayMismatchError(rawInput.mutationId);
    }
    const base = this.db
      .prepare(
        `SELECT * FROM character_v3_mutations
         WHERE character_id = ? AND sequence < ?
           AND resulting_build_revision = ? AND resulting_live_state_revision = ?
         ORDER BY sequence DESC LIMIT 1`,
      )
      .get(
        characterId,
        replay.sequence,
        replay.expected_build_revision,
        replay.expected_live_state_revision,
      ) as MutationRow | undefined;
    if (!base) throw new Error(`Mutation replay base is missing for ${rawInput.mutationId}`);
    return this.fromMutationRow(base).resultingCharacter;
  }

  private replayOrThrow(
    row: MutationRow,
    expected: { build: number; liveState: number } | null,
    character: CharacterAggregate,
    event: {
      actorUserId: string;
      characterId: string;
      type: string;
      authorization: unknown;
      details: unknown;
    },
    aggregateJson: string,
  ): CharacterV3CommitResult {
    const persisted = this.fromMutationRow(row);
    const matches =
      row.character_id === event.characterId &&
      row.actor_user_id === event.actorUserId &&
      row.event_type === event.type &&
      canonicalJson(persisted.authorization) === canonicalJson(event.authorization) &&
      canonicalJson(persisted.details) === canonicalJson(event.details) &&
      canonicalJson(persisted.expectedRevision) === canonicalJson(expected) &&
      row.resulting_aggregate_json === aggregateJson &&
      character.identity.id === row.character_id;
    if (!matches) throw new CharacterV3MutationReplayMismatchError(row.mutation_id);
    return { character: persisted.resultingCharacter, event: persisted, replayed: true };
  }

  private fromMutationRow(row: MutationRow): PersistedCharacterMutation {
    if (checksum(row.resulting_aggregate_json) !== row.resulting_aggregate_checksum) {
      throw new Error(`Mutation checksum failed for ${row.mutation_id}`);
    }
    return PersistedCharacterMutationSchema.parse({
      sequence: row.sequence,
      mutationId: row.mutation_id,
      characterId: row.character_id,
      campaignId: row.campaign_id,
      actorUserId: row.actor_user_id,
      type: row.event_type,
      authorization: {
        mode: row.authorization_mode,
        actorRole: row.actor_role,
        overrideReason: row.override_reason,
      },
      expectedRevision:
        row.expected_build_revision === null
          ? null
          : { build: row.expected_build_revision, liveState: row.expected_live_state_revision },
      resultingRevision: {
        build: row.resulting_build_revision,
        liveState: row.resulting_live_state_revision,
      },
      details: JSON.parse(row.details_json),
      resultingCharacter: JSON.parse(row.resulting_aggregate_json),
      resultingAggregateChecksum: row.resulting_aggregate_checksum,
      committedAt: row.committed_at,
    });
  }
}
