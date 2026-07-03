import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../../db/schema";
import { migrateDdbPayloadToCharacterV3 } from "./migrate-v2";
import { CharacterV3Repository } from "./repository.server";
import { CharacterAggregateSchema, type CharacterAggregate } from "./schema";

export const MOB_CAMPAIGN_ID = "mother-of-bob";

export const MOB_USERS = [
  { id: "qemuel", username: "fotis", role: "admin" },
  { id: "nikos", username: "nikos", role: "player" },
  { id: "eleni", username: "eleni", role: "player" },
  { id: "alexia", username: "alexia", role: "player" },
  { id: "andreas", username: "andreas", role: "player" },
  { id: "danny", username: "danny", role: "dm" },
] as const;

export const MOB_CHARACTERS = [
  { ddbId: 97349530, ownerUserId: "qemuel", expectedName: "Qem" },
  { ddbId: 131296315, ownerUserId: "nikos", expectedName: "Willow" },
  { ddbId: 131593533, ownerUserId: "eleni", expectedName: "Ari" },
  { ddbId: 132900149, ownerUserId: "alexia", expectedName: "Echo" },
  { ddbId: 132940690, ownerUserId: "andreas", expectedName: "Dresana" },
] as const;

export type MobBootstrapResult = {
  campaignId: string;
  users: Array<{ id: string; action: "created" | "already-present" }>;
  memberships: Array<{ userId: string; action: "created" | "already-present" }>;
  characters: Array<{
    characterId: string;
    ownerUserId: string;
    name: string;
    action: "initialized" | "enriched" | "already-present";
  }>;
};

function qemuelMigrationOptions(ddbId: number) {
  return ddbId === 97349530
    ? {
        excludedFeatDefinitions: [
          {
            definitionId: 2048517,
            reason: "Player confirmed that Qemuel does not have a Dark Bargain.",
          },
        ],
      }
    : undefined;
}

function loadCachedDdbPayload(ddbId: number): unknown {
  const file = path.join(process.cwd(), "data", "cache", `char-${ddbId}.json`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function ensureMobBootstrapTables(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'player',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      dm_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      description TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS campaign_members (
      campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (campaign_id, user_id)
    );
  `);
}

function emptyImportedProfile(character: CharacterAggregate): boolean {
  return (
    character.profile.actions.values.length === 0 ||
    character.profile.attacks.values.length === 0 ||
    character.profile.features.values.length === 0 ||
    character.profile.savingThrows.values.length === 0
  );
}

export function enrichMobCharacterFromDdb(
  existing: CharacterAggregate,
  imported: CharacterAggregate,
): CharacterAggregate | null {
  const needsProfile = emptyImportedProfile(existing);
  const needsItemDetails = existing.items.some((item) => item.details === null);
  const needsSpellDetails = existing.build.spells.some((spell) => spell.details === null);
  const needsCompanions = existing.companions.length === 0 && imported.companions.length > 0;
  if (!needsProfile && !needsItemDetails && !needsSpellDetails && !needsCompanions) {
    return null;
  }

  const importedItems = new Map(imported.items.map((item) => [item.id, item]));
  const importedSpells = new Map(
    imported.build.spells.map((spell) => [spell.spellRef.familyKey, spell]),
  );
  const profile = { ...existing.profile };
  const snapshotKeys = [
    "movement",
    "armorClass",
    "initiative",
    "passiveScores",
    "skills",
    "savingThrows",
    "spellcastingTotals",
    "senses",
    "defenses",
    "proficiencies",
    "actions",
    "attacks",
    "features",
    "encumbrance",
    "demographics",
    "specializations",
  ] as const;
  for (const key of snapshotKeys) {
    if (needsProfile) profile[key] = imported.profile[key] as never;
  }

  return CharacterAggregateSchema.parse({
    ...existing,
    profile,
    build: {
      ...existing.build,
      revision: existing.build.revision + 1,
      spells: existing.build.spells.map((spell) => ({
        ...spell,
        details: spell.details ?? importedSpells.get(spell.spellRef.familyKey)?.details ?? null,
      })),
    },
    items: existing.items.map((item) => ({
      ...item,
      details: item.details ?? importedItems.get(item.id)?.details ?? null,
    })),
    companions: needsCompanions ? imported.companions : existing.companions,
  });
}

export function bootstrapMotherOfBobV3(
  sqlite: Database.Database,
  now = Date.now,
): MobBootstrapResult {
  ensureMobBootstrapTables(sqlite);
  const db = drizzle(sqlite, { schema });
  const repository = new CharacterV3Repository(sqlite, now);
  const timestamp = now();
  const result: MobBootstrapResult = {
    campaignId: MOB_CAMPAIGN_ID,
    users: [],
    memberships: [],
    characters: [],
  };

  for (const user of MOB_USERS) {
    const existing = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, user.id))
      .limit(1)
      .all();
    if (existing.length === 0) {
      db.insert(schema.users)
        .values({
          id: user.id,
          username: user.username,
          passwordHash: "",
          role: user.role,
          createdAt: timestamp,
        })
        .run();
      result.users.push({ id: user.id, action: "created" });
    } else {
      if (existing[0].username !== user.username) {
        db.update(schema.users)
          .set({ username: user.username })
          .where(eq(schema.users.id, user.id))
          .run();
      }
      result.users.push({ id: user.id, action: "already-present" });
    }
  }

  const campaign = db
    .select()
    .from(schema.campaigns)
    .where(eq(schema.campaigns.id, MOB_CAMPAIGN_ID))
    .limit(1)
    .all();
  if (campaign.length === 0) {
    db.insert(schema.campaigns)
      .values({
        id: MOB_CAMPAIGN_ID,
        name: "Mother of Bob",
        dmUserId: "danny",
        description: "Hardcoded shared campaign space for the Mother of Bob party.",
        createdAt: timestamp,
      })
      .run();
  }

  for (const user of MOB_USERS) {
    const existing = db
      .select()
      .from(schema.campaignMembers)
      .where(
        and(
          eq(schema.campaignMembers.campaignId, MOB_CAMPAIGN_ID),
          eq(schema.campaignMembers.userId, user.id),
        ),
      )
      .limit(1)
      .all();
    if (existing.length > 0) {
      result.memberships.push({ userId: user.id, action: "already-present" });
    } else {
      db.insert(schema.campaignMembers)
        .values({
          campaignId: MOB_CAMPAIGN_ID,
          userId: user.id,
        })
        .run();
      result.memberships.push({ userId: user.id, action: "created" });
    }
  }

  for (const fixture of MOB_CHARACTERS) {
    const payload = loadCachedDdbPayload(fixture.ddbId);
    const character = migrateDdbPayloadToCharacterV3({
      payload,
      ownerUserId: fixture.ownerUserId,
      campaignId: MOB_CAMPAIGN_ID,
      v2MigrationOptions: qemuelMigrationOptions(fixture.ddbId),
    });
    const existing = repository.load(character.identity.id);
    if (existing) {
      const enriched = enrichMobCharacterFromDdb(existing, character);
      if (enriched) {
        repository.commit({
          expectedRevision: {
            build: existing.build.revision,
            liveState: existing.liveState.revision,
          },
          character: enriched,
          event: {
            mutationId: `mutation:${character.identity.id}:enrich-imported-sheet-v1`,
            actorUserId: fixture.ownerUserId,
            characterId: character.identity.id,
            type: "enrich-imported-sheet-v3",
            authorization: { mode: "owner", actorRole: "player", overrideReason: null },
            details: { source: "mob-v3-bootstrap-enrichment", externalId: fixture.ddbId },
          },
        });
      }
      result.characters.push({
        characterId: character.identity.id,
        ownerUserId: character.identity.ownerUserId,
        name: character.identity.name,
        action: enriched ? "enriched" : "already-present",
      });
    } else {
      repository.initialize({
        character,
        event: {
          mutationId: `mutation:${character.identity.id}:initialize-v3`,
          actorUserId: fixture.ownerUserId,
          characterId: character.identity.id,
          type: "initialize-character-v3",
          authorization: { mode: "owner", actorRole: "player", overrideReason: null },
          details: { source: "mob-v3-bootstrap", externalId: fixture.ddbId },
        },
      });
      result.characters.push({
        characterId: character.identity.id,
        ownerUserId: character.identity.ownerUserId,
        name: character.identity.name,
        action: "initialized",
      });
    }
  }

  return result;
}
