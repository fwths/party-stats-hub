import type Database from "better-sqlite3";
import { CompiledSheetSchema, type CompiledSheet } from "./compiled-sheet";
import {
  CharacterBuildSchema,
  CharacterLiveStateSchema,
  type CharacterBuild,
  type CharacterLiveState,
} from "./schema";

export type CharacterCheckpoint = {
  characterId: string;
  revision: number;
  build: CharacterBuild;
  liveState: CharacterLiveState;
  sheet: CompiledSheet;
};

type CheckpointRow = {
  character_id: string;
  revision: number;
  build_json: string;
  live_state_json: string;
  sheet_json: string;
};

export class CharacterV2PrototypeStore {
  constructor(private readonly db: Database.Database) {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS character_v2_checkpoints (
        character_id TEXT NOT NULL,
        revision INTEGER NOT NULL,
        build_json TEXT NOT NULL,
        live_state_json TEXT NOT NULL,
        sheet_json TEXT NOT NULL,
        PRIMARY KEY (character_id, revision)
      );
      CREATE TABLE IF NOT EXISTS character_v2_heads (
        character_id TEXT PRIMARY KEY,
        revision INTEGER NOT NULL
      );
    `);
  }

  save(checkpoint: CharacterCheckpoint): void {
    const parsed = this.validate(checkpoint);
    this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO character_v2_checkpoints
            (character_id, revision, build_json, live_state_json, sheet_json)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(
          parsed.characterId,
          parsed.revision,
          JSON.stringify(parsed.build),
          JSON.stringify(parsed.liveState),
          JSON.stringify(parsed.sheet),
        );
      this.db
        .prepare(
          `INSERT INTO character_v2_heads (character_id, revision) VALUES (?, ?)
           ON CONFLICT(character_id) DO UPDATE SET revision = excluded.revision`,
        )
        .run(parsed.characterId, parsed.revision);
    })();
  }

  load(characterId: string, revision: number): CharacterCheckpoint | null {
    const row = this.db
      .prepare("SELECT * FROM character_v2_checkpoints WHERE character_id = ? AND revision = ?")
      .get(characterId, revision) as CheckpointRow | undefined;
    return row ? this.fromRow(row) : null;
  }

  loadCurrent(characterId: string): CharacterCheckpoint | null {
    const row = this.db
      .prepare(
        `SELECT c.* FROM character_v2_checkpoints c
         JOIN character_v2_heads h
           ON h.character_id = c.character_id AND h.revision = c.revision
         WHERE c.character_id = ?`,
      )
      .get(characterId) as CheckpointRow | undefined;
    return row ? this.fromRow(row) : null;
  }

  setHead(characterId: string, revision: number): void {
    if (!this.load(characterId, revision))
      throw new Error(`Checkpoint ${characterId}@${revision} does not exist`);
    this.db
      .prepare(
        `INSERT INTO character_v2_heads (character_id, revision) VALUES (?, ?)
         ON CONFLICT(character_id) DO UPDATE SET revision = excluded.revision`,
      )
      .run(characterId, revision);
  }

  private validate(checkpoint: CharacterCheckpoint): CharacterCheckpoint {
    if (checkpoint.build.revision !== checkpoint.revision) {
      throw new Error("Checkpoint revision must equal build revision");
    }
    return {
      characterId: checkpoint.characterId,
      revision: checkpoint.revision,
      build: CharacterBuildSchema.parse(checkpoint.build),
      liveState: CharacterLiveStateSchema.parse(checkpoint.liveState),
      sheet: CompiledSheetSchema.parse(checkpoint.sheet),
    };
  }

  private fromRow(row: CheckpointRow): CharacterCheckpoint {
    return this.validate({
      characterId: row.character_id,
      revision: row.revision,
      build: JSON.parse(row.build_json),
      liveState: JSON.parse(row.live_state_json),
      sheet: JSON.parse(row.sheet_json),
    });
  }
}
