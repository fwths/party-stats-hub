import { describe, expect, it } from "vitest";
import {
  CHARACTER_V3_RECENT_MUTATION_LIMIT,
  applyCharacterV3Events,
  bootstrapCharacterV3ClientSyncState,
  characterV3ClientSyncSummary,
  emptyCharacterV3ClientSyncState,
} from "./client-sync";
import type { PersistedCharacterMutation } from "./persistence";
import type { CharacterAggregate } from "./schema";

function character(
  id: string,
  liveRevision: number,
  ownerUserId = "qemuel",
  currentHp = 10,
): CharacterAggregate {
  return {
    identity: {
      id,
      campaignId: "mother-of-bob",
      ownerUserId,
      name: id,
      avatarUrl: null,
      externalRefs: [],
    },
    profile: {
      alignment: null,
      personalityTraits: "",
      ideals: "",
      bonds: "",
      flaws: "",
      appearance: "",
      backstory: "",
      allies: "",
      enemies: "",
      organizations: "",
      notes: "",
      currencies: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    },
    build: {
      schemaVersion: 3,
      revision: 1,
      rulesContext: {
        generation: "2024",
        policyId: "test",
        catalogRevision: "test",
      },
      speciesRef: ref("species"),
      backgroundRef: ref("background"),
      abilityBasis: {
        method: "standard-array",
        baseScores: { STR: 8, DEX: 10, CON: 12, INT: 13, WIS: 14, CHA: 15 },
        verified: true,
      },
      levels: [{ characterLevel: 1, classLevel: 1, classRef: ref("class"), provenance: "native" }],
      subclasses: [],
      decisions: [],
      spells: [],
      overrides: [],
    },
    hitPoints: {
      baseline: {
        throughCharacterLevel: 1,
        maximum: 10,
        method: "native-first-level",
        verified: true,
      },
      gains: [],
    },
    liveState: {
      revision: liveRevision,
      currentHp,
      temporaryHp: 0,
      inspiration: false,
      exhaustion: 0,
      deathSaves: { successes: 0, failures: 0, stabilized: false },
      hitDice: { status: "unavailable", reason: "test" },
      resources: [],
      conditions: [],
    },
    items: [],
    migrationBaseline: null,
    resolutions: [],
    migrationIssues: [],
  };
}

function ref(kind: "species" | "background" | "class") {
  return {
    kind,
    familyKey: `family:${kind}`,
    versionKey: `rule:${kind}:test:test`,
    name: kind,
    rulesGeneration: "2024" as const,
    sourceId: "test",
    upstreamId: "test",
    contentRevision: "test",
    compatibility: "custom" as const,
    verification: "custom" as const,
  };
}

function event(sequence: number, mutationId: string, resultingCharacter: CharacterAggregate) {
  return {
    sequence,
    mutationId,
    characterId: resultingCharacter.identity.id,
    campaignId: resultingCharacter.identity.campaignId,
    actorUserId: resultingCharacter.identity.ownerUserId,
    type: "test-event",
    authorization: { mode: "owner", actorRole: "player", overrideReason: null },
    expectedRevision: null,
    resultingRevision: {
      build: resultingCharacter.build.revision,
      liveState: resultingCharacter.liveState.revision,
    },
    details: {},
    resultingCharacter,
    resultingAggregateChecksum: "a".repeat(64),
    committedAt: sequence,
  } satisfies PersistedCharacterMutation;
}

describe("Character V3 client sync event application", () => {
  it("bootstraps current snapshots without retaining historical events", () => {
    const qem = character("mob:character:97349530", 8);
    const state = bootstrapCharacterV3ClientSyncState({
      campaignId: "mother-of-bob",
      cursor: 400,
      characters: [qem],
    });
    expect(state).toEqual({
      cursor: 400,
      charactersById: { [qem.identity.id]: qem },
      eventsById: {},
    });
  });

  it("stores latest resulting snapshots and advances the cursor in sequence order", () => {
    const first = event(1, "mutation:one", character("mob:character:97349530", 0));
    const second = event(2, "mutation:two", character("mob:character:97349530", 1));

    const state = applyCharacterV3Events(emptyCharacterV3ClientSyncState(), [second, first]);

    expect(state.cursor).toBe(2);
    expect(state.charactersById["mob:character:97349530"].liveState.revision).toBe(1);
    expect(characterV3ClientSyncSummary(state)).toEqual({
      cursor: 2,
      characterCount: 1,
      eventCount: 2,
    });
  });

  it("ignores duplicate or already-consumed events without rolling snapshots back", () => {
    const first = event(1, "mutation:one", character("mob:character:97349530", 0));
    const second = event(2, "mutation:two", character("mob:character:97349530", 1));
    const state = applyCharacterV3Events(emptyCharacterV3ClientSyncState(), [first, second]);

    const replayed = applyCharacterV3Events(state, [first]);

    expect(replayed.cursor).toBe(2);
    expect(replayed.charactersById["mob:character:97349530"].liveState.revision).toBe(1);
    expect(characterV3ClientSyncSummary(replayed).eventCount).toBe(2);
  });

  it("converges independent Fotis and Alexia clients through the shared party stream", () => {
    const qemId = "mob:character:97349530";
    const echoId = "mob:character:132900149";
    const initialEvents = [
      event(1, "bootstrap:qem", character(qemId, 0, "qemuel")),
      event(2, "bootstrap:echo", character(echoId, 0, "alexia")),
    ];
    let fotisClient = applyCharacterV3Events(emptyCharacterV3ClientSyncState(), initialEvents);
    let alexiaClient = applyCharacterV3Events(emptyCharacterV3ClientSyncState(), initialEvents);

    const qemChangedByFotis = event(
      3,
      "qemuel:hp-change",
      character(qemId, 1, "qemuel", 7),
    );
    fotisClient = applyCharacterV3Events(fotisClient, [qemChangedByFotis]);
    alexiaClient = applyCharacterV3Events(alexiaClient, [qemChangedByFotis]);

    expect(alexiaClient.charactersById[qemId].liveState.currentHp).toBe(7);
    expect(qemChangedByFotis.actorUserId).toBe("qemuel");

    const echoChangedByAlexia = event(
      4,
      "alexia:hp-change",
      character(echoId, 1, "alexia", 6),
    );
    alexiaClient = applyCharacterV3Events(alexiaClient, [echoChangedByAlexia]);
    fotisClient = applyCharacterV3Events(fotisClient, [echoChangedByAlexia]);

    expect(fotisClient.charactersById[echoId].liveState.currentHp).toBe(6);
    expect(echoChangedByAlexia.actorUserId).toBe("alexia");
    expect(fotisClient).toEqual(alexiaClient);
    expect(characterV3ClientSyncSummary(fotisClient)).toEqual({
      cursor: 4,
      characterCount: 2,
      eventCount: 4,
    });
  });

  it("bounds retained mutation IDs while preserving the latest snapshot and cursor", () => {
    const characterId = "mob:character:97349530";
    const events = Array.from({ length: CHARACTER_V3_RECENT_MUTATION_LIMIT + 4 }, (_, index) =>
      event(index + 1, `mutation:${index + 1}`, character(characterId, index + 1)),
    );
    const state = applyCharacterV3Events(emptyCharacterV3ClientSyncState(), events);
    expect(state.cursor).toBe(events.length);
    expect(Object.keys(state.eventsById)).toHaveLength(CHARACTER_V3_RECENT_MUTATION_LIMIT);
    expect(state.eventsById["mutation:1"]).toBeUndefined();
    expect(state.charactersById[characterId].liveState.revision).toBe(events.length);
  });
});
