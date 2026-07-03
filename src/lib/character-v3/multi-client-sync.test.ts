import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyDatabaseMigrations } from "../../db/migrations.server";
import { applyCharacterV3Events, bootstrapCharacterV3ClientSyncState } from "./client-sync";
import { bootstrapMotherOfBobV3, MOB_CAMPAIGN_ID } from "./mob-bootstrap.server";
import { CharacterV3Repository } from "./repository.server";

describe("Mother of Bob multi-client synchronization", () => {
  let sqlite: Database.Database;
  let repository: CharacterV3Repository;

  beforeEach(() => {
    sqlite = new Database(":memory:");
    applyDatabaseMigrations(sqlite);
    bootstrapMotherOfBobV3(sqlite, () => 1_750_000_000_000);
    repository = new CharacterV3Repository(sqlite, () => 1_750_000_000_100);
  });

  afterEach(() => sqlite.close());

  it("publishes an owner change to every subsequent party read", () => {
    const characterId = "mob:character:97349530";
    const fotisBrowser = repository.load(characterId)!;
    const alexiaBrowser = repository.load(characterId)!;

    repository.setInspiration(characterId, {
      mutationId: "mutation:qemuel:inspiration:multi-client",
      actorUserId: "qemuel",
      expectedBuildRevision: fotisBrowser.build.revision,
      expectedLiveStateRevision: fotisBrowser.liveState.revision,
      inspiration: !fotisBrowser.liveState.inspiration,
    });

    expect(alexiaBrowser.liveState.inspiration).toBe(fotisBrowser.liveState.inspiration);
    const refreshedForAlexia = repository.load(characterId)!;
    expect(refreshedForAlexia.liveState.inspiration).toBe(!fotisBrowser.liveState.inspiration);
    expect(refreshedForAlexia.liveState.revision).toBe(fotisBrowser.liveState.revision + 1);
    expect(
      repository
        .eventsSince(MOB_CAMPAIGN_ID)
        .some((event) => event.mutationId === "mutation:qemuel:inspiration:multi-client"),
    ).toBe(true);
  });

  it("rejects a stale competing browser and succeeds after refresh", () => {
    const characterId = "mob:character:132900149";
    const firstBrowser = repository.load(characterId)!;
    const secondBrowser = repository.load(characterId)!;

    repository.setExhaustion(characterId, {
      mutationId: "mutation:echo:exhaustion:first-browser",
      actorUserId: "alexia",
      expectedBuildRevision: firstBrowser.build.revision,
      expectedLiveStateRevision: firstBrowser.liveState.revision,
      exhaustion: 1,
    });

    expect(() =>
      repository.setInspiration(characterId, {
        mutationId: "mutation:echo:inspiration:stale-browser",
        actorUserId: "alexia",
        expectedBuildRevision: secondBrowser.build.revision,
        expectedLiveStateRevision: secondBrowser.liveState.revision,
        inspiration: true,
      }),
    ).toThrow(/revision conflict/i);

    const refreshed = repository.load(characterId)!;
    const result = repository.setInspiration(characterId, {
      mutationId: "mutation:echo:inspiration:refreshed-browser",
      actorUserId: "alexia",
      expectedBuildRevision: refreshed.build.revision,
      expectedLiveStateRevision: refreshed.liveState.revision,
      inspiration: true,
    });
    expect(result.character.liveState.exhaustion).toBe(1);
    expect(result.character.liveState.inspiration).toBe(true);
    expect(result.character.liveState.revision).toBe(firstBrowser.liveState.revision + 2);
  });

  it("synchronizes inventory mutations without granting another player write authority", () => {
    const characterId = "mob:character:132940690";
    const andreasBrowser = repository.load(characterId)!;
    const item = andreasBrowser.items[0];

    repository.mutateItem(characterId, {
      mutationId: "mutation:dresana:item:equip",
      actorUserId: "andreas",
      expectedBuildRevision: andreasBrowser.build.revision,
      expectedLiveStateRevision: andreasBrowser.liveState.revision,
      itemId: item.id,
      operation: "set-equipped",
      equipped: !item.equipped,
    });

    const visibleToFotis = repository.load(characterId)!;
    expect(visibleToFotis.items.find((candidate) => candidate.id === item.id)?.equipped).toBe(
      !item.equipped,
    );
    expect(() =>
      repository.mutateItem(characterId, {
        mutationId: "mutation:dresana:item:unauthorized-qemuel",
        actorUserId: "qemuel",
        expectedBuildRevision: visibleToFotis.build.revision,
        expectedLiveStateRevision: visibleToFotis.liveState.revision,
        itemId: item.id,
        operation: "set-equipped",
        equipped: item.equipped,
      }),
    ).toThrow(/character owner/i);
  });

  it("converges Fotis and Alexia after independent changes and a disconnected catch-up", () => {
    const qemId = "mob:character:97349530";
    const echoId = "mob:character:132900149";
    const snapshot = repository.campaignSnapshot(MOB_CAMPAIGN_ID);
    expect(snapshot.characters).toHaveLength(5);
    expect(snapshot.cursor).toBe(repository.eventsSince(MOB_CAMPAIGN_ID).at(-1)?.sequence);
    let fotisClient = bootstrapCharacterV3ClientSyncState(snapshot);
    let alexiaClient = bootstrapCharacterV3ClientSyncState(snapshot);

    const qem = fotisClient.charactersById[qemId];
    repository.setInspiration(qemId, {
      mutationId: "mutation:qemuel:integration-convergence",
      actorUserId: "qemuel",
      expectedBuildRevision: qem.build.revision,
      expectedLiveStateRevision: qem.liveState.revision,
      inspiration: !qem.liveState.inspiration,
    });
    alexiaClient = applyCharacterV3Events(
      alexiaClient,
      repository.eventsSince(MOB_CAMPAIGN_ID, alexiaClient.cursor),
    );

    const echo = alexiaClient.charactersById[echoId];
    repository.setExhaustion(echoId, {
      mutationId: "mutation:alexia:integration-convergence",
      actorUserId: "alexia",
      expectedBuildRevision: echo.build.revision,
      expectedLiveStateRevision: echo.liveState.revision,
      exhaustion: echo.liveState.exhaustion === 0 ? 1 : 0,
    });
    alexiaClient = applyCharacterV3Events(
      alexiaClient,
      repository.eventsSince(MOB_CAMPAIGN_ID, alexiaClient.cursor),
    );

    // Fotis was disconnected for both mutations and catches up in one ordered read.
    fotisClient = applyCharacterV3Events(
      fotisClient,
      repository.eventsSince(MOB_CAMPAIGN_ID, fotisClient.cursor),
    );

    expect(fotisClient).toEqual(alexiaClient);
    expect(fotisClient.charactersById[qemId]).toEqual(repository.load(qemId));
    expect(fotisClient.charactersById[echoId]).toEqual(repository.load(echoId));
  });

  it("passes the production two-browser MOB drill with paginated reconnect catch-up", () => {
    const qemId = "mob:character:97349530";
    const echoId = "mob:character:132900149";
    const snapshot = repository.campaignSnapshot(MOB_CAMPAIGN_ID);
    let fotisBrowser = bootstrapCharacterV3ClientSyncState(snapshot);
    let alexiaBrowser = bootstrapCharacterV3ClientSyncState(snapshot);

    const qemBefore = fotisBrowser.charactersById[qemId];
    const qemMutation = repository.setInspiration(qemId, {
      mutationId: "mutation:production-drill:fotis-qem-inspiration",
      actorUserId: "qemuel",
      expectedBuildRevision: qemBefore.build.revision,
      expectedLiveStateRevision: qemBefore.liveState.revision,
      inspiration: !qemBefore.liveState.inspiration,
    });

    alexiaBrowser = applyCharacterV3Events(
      alexiaBrowser,
      repository.eventsSince(MOB_CAMPAIGN_ID, alexiaBrowser.cursor, 1),
    );
    expect(alexiaBrowser.charactersById[qemId].liveState.inspiration).toBe(
      qemMutation.character.liveState.inspiration,
    );

    const echoBefore = alexiaBrowser.charactersById[echoId];
    const echoMutation = repository.setExhaustion(echoId, {
      mutationId: "mutation:production-drill:alexia-echo-exhaustion",
      actorUserId: "alexia",
      expectedBuildRevision: echoBefore.build.revision,
      expectedLiveStateRevision: echoBefore.liveState.revision,
      exhaustion: echoBefore.liveState.exhaustion === 0 ? 1 : 0,
    });

    expect(() =>
      repository.setInspiration(echoId, {
        mutationId: "mutation:production-drill:fotis-forged-echo",
        actorUserId: "qemuel",
        expectedBuildRevision: echoMutation.character.build.revision,
        expectedLiveStateRevision: echoMutation.character.liveState.revision,
        inspiration: true,
      }),
    ).toThrow(/character owner/i);

    expect(() =>
      repository.setExhaustion(echoId, {
        mutationId: "mutation:production-drill:alexia-stale-echo",
        actorUserId: "alexia",
        expectedBuildRevision: echoBefore.build.revision,
        expectedLiveStateRevision: echoBefore.liveState.revision,
        exhaustion: 0,
      }),
    ).toThrow(/revision conflict/i);

    alexiaBrowser = applyCharacterV3Events(
      alexiaBrowser,
      repository.eventsSince(MOB_CAMPAIGN_ID, alexiaBrowser.cursor, 1),
    );
    expect(alexiaBrowser.charactersById[echoId].liveState.exhaustion).toBe(
      echoMutation.character.liveState.exhaustion,
    );

    const missedFirstPage = repository.eventsSince(MOB_CAMPAIGN_ID, fotisBrowser.cursor, 1);
    expect(missedFirstPage).toHaveLength(1);
    fotisBrowser = applyCharacterV3Events(fotisBrowser, missedFirstPage);
    expect(fotisBrowser.charactersById[qemId].liveState.inspiration).toBe(
      qemMutation.character.liveState.inspiration,
    );
    expect(fotisBrowser.charactersById[echoId].liveState.exhaustion).toBe(
      echoBefore.liveState.exhaustion,
    );

    const missedSecondPage = repository.eventsSince(MOB_CAMPAIGN_ID, fotisBrowser.cursor, 1);
    expect(missedSecondPage).toHaveLength(1);
    fotisBrowser = applyCharacterV3Events(fotisBrowser, missedSecondPage);

    expect(repository.eventsSince(MOB_CAMPAIGN_ID, fotisBrowser.cursor, 1)).toEqual([]);
    expect(fotisBrowser).toEqual(alexiaBrowser);
    expect(fotisBrowser.charactersById[qemId]).toEqual(repository.load(qemId));
    expect(fotisBrowser.charactersById[echoId]).toEqual(repository.load(echoId));
  });
});
