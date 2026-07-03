import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { migrateDdbPayloadToCharacterV2 } from "../character-v2/migrate-ddb";
import {
  detectCharacterSchemaVersion,
  migratePersistedCharacter,
  UnsupportedCharacterSchemaVersionError,
} from "./migration-registry";
import { migrateDdbPayloadToCharacterV3 } from "./migrate-v2";

function payload(): unknown {
  return JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "cache", "char-132940690.json"), "utf8"),
  );
}

describe("Character schema migration registry", () => {
  it("accepts current V3 documents without rewriting them", () => {
    const character = migrateDdbPayloadToCharacterV3({
      payload: payload(),
      ownerUserId: "andreas",
      campaignId: "mother-of-bob",
    });

    const result = migratePersistedCharacter(character, { campaignId: "mother-of-bob" });

    expect(result).toEqual({ character, sourceVersion: 3, targetVersion: 3, steps: [] });
  });

  it("compatibly hydrates a V3 snapshot saved before hit-die tracking", () => {
    const character = migrateDdbPayloadToCharacterV3({
      payload: payload(),
      ownerUserId: "andreas",
      campaignId: "mother-of-bob",
    });
    const legacyV3 = JSON.parse(JSON.stringify(character));
    delete legacyV3.liveState.hitDice;

    const result = migratePersistedCharacter(legacyV3, { campaignId: "mother-of-bob" });

    expect(result.sourceVersion).toBe(3);
    expect(result.steps).toEqual([]);
    expect(result.character.liveState.hitDice).toEqual({
      status: "unavailable",
      reason: "Persisted V3 snapshot predates hit-die tracking",
    });
  });

  it("compatibly marks resources from older V3 snapshots as imported-unverified", () => {
    const character = migrateDdbPayloadToCharacterV3({
      payload: payload(),
      ownerUserId: "andreas",
      campaignId: "mother-of-bob",
    });
    const legacyV3 = JSON.parse(JSON.stringify(character));
    legacyV3.liveState.resources.forEach((resource: Record<string, unknown>) => {
      delete resource.provenance;
      delete resource.additionalSourceVersionKeys;
      delete resource.recoveryRules;
    });

    const result = migratePersistedCharacter(legacyV3, { campaignId: "mother-of-bob" });

    expect(
      result.character.liveState.resources.every(
        (resource) => resource.provenance === "imported-unverified",
      ),
    ).toBe(true);
    expect(
      result.character.liveState.resources.every(
        (resource) =>
          resource.additionalSourceVersionKeys.length === 0 && resource.recoveryRules.length === 0,
      ),
    ).toBe(true);
  });

  it("deterministically migrates a persisted V2 aggregate through every registered step", () => {
    const character = migrateDdbPayloadToCharacterV2(payload(), "andreas");
    const untouched = JSON.parse(JSON.stringify(character));

    const first = migratePersistedCharacter(character, { campaignId: "mother-of-bob" });
    const second = migratePersistedCharacter(character, { campaignId: "mother-of-bob" });

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      sourceVersion: 2,
      targetVersion: 3,
      steps: [{ fromVersion: 2, toVersion: 3 }],
      character: {
        identity: { ownerUserId: "andreas", campaignId: "mother-of-bob" },
        build: { schemaVersion: 3 },
      },
    });
    expect(character).toEqual(untouched);
  });

  it.each([1, 4, 999])("fails closed for unsupported schema version %s", (schemaVersion) => {
    expect(() =>
      migratePersistedCharacter({ build: { schemaVersion } }, { campaignId: "mother-of-bob" }),
    ).toThrow(UnsupportedCharacterSchemaVersionError);
  });

  it("rejects missing and non-integer version declarations", () => {
    expect(() => detectCharacterSchemaVersion({})).toThrow(/does not declare/);
    expect(() => detectCharacterSchemaVersion({ build: { schemaVersion: "3" } })).toThrow(
      /does not declare/,
    );
  });
});
