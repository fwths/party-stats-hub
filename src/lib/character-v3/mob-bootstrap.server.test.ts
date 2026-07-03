import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyDatabaseMigrations } from "../../db/migrations.server";
import {
  bootstrapMotherOfBobV3,
  enrichMobCharacterFromDdb,
  MOB_CAMPAIGN_ID,
  MOB_CHARACTERS,
  MOB_USERS,
} from "./mob-bootstrap.server";
import { CharacterV3Repository } from "./repository.server";

describe("Mother of Bob V3 bootstrap", () => {
  let sqlite: Database.Database;

  beforeEach(() => {
    sqlite = new Database(":memory:");
    applyDatabaseMigrations(sqlite);
  });

  afterEach(() => sqlite.close());

  it("seeds MOB users, memberships, and five V3 character snapshots idempotently", () => {
    const first = bootstrapMotherOfBobV3(sqlite, () => 1_750_000_000_000);
    const repository = new CharacterV3Repository(sqlite);

    expect(first.campaignId).toBe(MOB_CAMPAIGN_ID);
    expect(first.users).toHaveLength(MOB_USERS.length);
    expect(
      first.users.every((user) => user.action === "created" || user.action === "already-present"),
    ).toBe(true);
    expect(first.memberships).toHaveLength(MOB_USERS.length);
    expect(first.memberships.every((membership) => membership.action === "created")).toBe(true);
    expect(first.characters).toHaveLength(MOB_CHARACTERS.length);
    expect(first.characters.every((character) => character.action === "initialized")).toBe(true);
    expect(repository.eventsSince(MOB_CAMPAIGN_ID)).toHaveLength(MOB_CHARACTERS.length);

    for (const fixture of MOB_CHARACTERS) {
      const character = repository.load(`mob:character:${fixture.ddbId}`);
      expect(character).not.toBeNull();
      expect(character?.identity.ownerUserId).toBe(fixture.ownerUserId);
      expect(character?.identity.campaignId).toBe(MOB_CAMPAIGN_ID);
      expect(character?.identity.name).toContain(fixture.expectedName);
    }

    const qemuel = repository.load("mob:character:97349530");
    expect(qemuel?.resolutions).toContainEqual(
      expect.objectContaining({
        type: "exclude-imported-definition",
        sourceDefinitionId: "2048517",
        reason: "Player confirmed that Qemuel does not have a Dark Bargain.",
      }),
    );

    const second = bootstrapMotherOfBobV3(sqlite, () => 1_750_000_000_001);
    expect(second.users.every((user) => user.action === "already-present")).toBe(true);
    expect(second.memberships.every((membership) => membership.action === "already-present")).toBe(
      true,
    );
    expect(second.characters.every((character) => character.action === "already-present")).toBe(
      true,
    );
    expect(repository.eventsSince(MOB_CAMPAIGN_ID)).toHaveLength(MOB_CHARACTERS.length);
  });

  it("backfills imported sheet snapshots without overwriting live or narrative state", () => {
    bootstrapMotherOfBobV3(sqlite, () => 1_750_000_000_000);
    const repository = new CharacterV3Repository(sqlite);
    const imported = repository.load("mob:character:97349530")!;
    const legacy = structuredClone(imported);
    legacy.profile.notes = "Player-authored campaign note";
    legacy.profile.actions.values = [];
    legacy.profile.attacks.values = [];
    legacy.profile.features.values = [];
    legacy.profile.savingThrows.values = [];
    legacy.items = legacy.items.map((item) => ({ ...item, details: null }));
    legacy.build.spells = legacy.build.spells.map((spell) => ({ ...spell, details: null }));
    legacy.liveState.currentHp = Math.max(1, legacy.liveState.currentHp - 7);
    legacy.liveState.revision += 3;

    const enriched = enrichMobCharacterFromDdb(legacy, imported);
    expect(enriched).not.toBeNull();
    expect(enriched?.profile.notes).toBe("Player-authored campaign note");
    expect(enriched?.profile.actions.values).toEqual(imported.profile.actions.values);
    expect(enriched?.profile.savingThrows.values).toEqual(imported.profile.savingThrows.values);
    expect(enriched?.liveState).toEqual(legacy.liveState);
    expect(enriched?.build.revision).toBe(legacy.build.revision + 1);
    expect(enriched?.items.every((item) => item.details !== null)).toBe(true);
    expect(enriched?.build.spells.every((spell) => spell.details !== null)).toBe(true);
  });
});
