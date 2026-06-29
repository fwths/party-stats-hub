import type { PartyMember } from "@/lib/dndbeyond.types";
import {
  CHARACTER_SCHEMA_VERSION as CHARACTER_SCHEMA_VERSION_V2,
  CharacterAggregateSchema as CharacterAggregateSchemaV2,
} from "../character-v2/schema";
import { migrateCharacterV2ToV3 } from "./migrate-v2";
import {
  CHARACTER_SCHEMA_VERSION,
  CharacterAggregateSchema,
  type CharacterAggregate,
} from "./schema";

export const OLDEST_SUPPORTED_CHARACTER_SCHEMA_VERSION = 2 as const;

export type CharacterMigrationContext = {
  campaignId: string;
  importedMember?: PartyMember;
};

export type CharacterSchemaMigrationStep = {
  fromVersion: number;
  toVersion: number;
};

export type CharacterMigrationResult = {
  character: CharacterAggregate;
  sourceVersion: number;
  targetVersion: typeof CHARACTER_SCHEMA_VERSION;
  steps: CharacterSchemaMigrationStep[];
};

export class UnsupportedCharacterSchemaVersionError extends Error {
  constructor(version: number | null) {
    super(
      version === null
        ? "Character document does not declare a valid schema version"
        : `Character schema version ${version} is unsupported; supported versions are ${OLDEST_SUPPORTED_CHARACTER_SCHEMA_VERSION}-${CHARACTER_SCHEMA_VERSION}`,
    );
    this.name = "UnsupportedCharacterSchemaVersionError";
  }
}

type Migration = (raw: unknown, context: CharacterMigrationContext) => unknown;

const migrations = new Map<number, Migration>([
  [
    CHARACTER_SCHEMA_VERSION_V2,
    (raw, context) =>
      migrateCharacterV2ToV3(CharacterAggregateSchemaV2.parse(raw), {
        campaignId: context.campaignId,
        importedMember: context.importedMember,
      }),
  ],
]);

function declaredVersion(raw: unknown): number | null {
  if (!raw || typeof raw !== "object" || !("build" in raw)) return null;
  const build = (raw as { build?: unknown }).build;
  if (!build || typeof build !== "object" || !("schemaVersion" in build)) return null;
  const version = (build as { schemaVersion?: unknown }).schemaVersion;
  return Number.isInteger(version) ? (version as number) : null;
}

function validateRegistry(): void {
  for (
    let version = OLDEST_SUPPORTED_CHARACTER_SCHEMA_VERSION;
    version < CHARACTER_SCHEMA_VERSION;
    version += 1
  ) {
    if (!migrations.has(version)) {
      throw new Error(`Missing character schema migration ${version} -> ${version + 1}`);
    }
  }
}

validateRegistry();

export function detectCharacterSchemaVersion(raw: unknown): number {
  const version = declaredVersion(raw);
  if (
    version === null ||
    version < OLDEST_SUPPORTED_CHARACTER_SCHEMA_VERSION ||
    version > CHARACTER_SCHEMA_VERSION
  ) {
    throw new UnsupportedCharacterSchemaVersionError(version);
  }
  return version;
}

export function migratePersistedCharacter(
  raw: unknown,
  context: CharacterMigrationContext,
): CharacterMigrationResult {
  const sourceVersion = detectCharacterSchemaVersion(raw);
  let document: unknown = raw;
  const steps: CharacterSchemaMigrationStep[] = [];

  for (let version = sourceVersion; version < CHARACTER_SCHEMA_VERSION; version += 1) {
    const migration = migrations.get(version);
    if (!migration)
      throw new Error(`Missing character schema migration ${version} -> ${version + 1}`);
    document = migration(document, context);
    const migratedVersion = declaredVersion(document);
    if (migratedVersion !== version + 1) {
      throw new Error(
        `Character schema migration ${version} -> ${version + 1} produced version ${String(migratedVersion)}`,
      );
    }
    steps.push({ fromVersion: version, toVersion: version + 1 });
  }

  return {
    character: CharacterAggregateSchema.parse(document),
    sourceVersion,
    targetVersion: CHARACTER_SCHEMA_VERSION,
    steps,
  };
}
