import type { PersistedCharacterMutation } from "./persistence";
import type { CharacterAggregate } from "./schema";

export type CharacterV3ClientSyncState = {
  cursor: number;
  charactersById: Record<string, CharacterAggregate>;
  eventsById: Record<string, PersistedCharacterMutation>;
};

export type CharacterV3CampaignBootstrap = {
  campaignId: string;
  cursor: number;
  characters: CharacterAggregate[];
};

export const CHARACTER_V3_RECENT_MUTATION_LIMIT = 256;

export function emptyCharacterV3ClientSyncState(): CharacterV3ClientSyncState {
  return { cursor: 0, charactersById: {}, eventsById: {} };
}

export function bootstrapCharacterV3ClientSyncState(
  snapshot: CharacterV3CampaignBootstrap,
): CharacterV3ClientSyncState {
  const charactersById = Object.fromEntries(
    snapshot.characters.map((character) => [character.identity.id, character]),
  );
  return { cursor: snapshot.cursor, charactersById, eventsById: {} };
}

export function applyCharacterV3Events(
  state: CharacterV3ClientSyncState,
  events: PersistedCharacterMutation[],
): CharacterV3ClientSyncState {
  if (events.length === 0) return state;

  let cursor = state.cursor;
  const charactersById = { ...state.charactersById };
  const eventsById = { ...state.eventsById };

  const ordered = [...events].sort((left, right) => left.sequence - right.sequence);
  for (const event of ordered) {
    if (event.sequence <= cursor || eventsById[event.mutationId]) {
      cursor = Math.max(cursor, event.sequence);
      continue;
    }
    eventsById[event.mutationId] = event;
    charactersById[event.characterId] = event.resultingCharacter;
    cursor = Math.max(cursor, event.sequence);
  }

  const retainedEvents = Object.values(eventsById).sort(
    (left, right) => right.sequence - left.sequence,
  );
  for (const event of retainedEvents.slice(CHARACTER_V3_RECENT_MUTATION_LIMIT)) {
    delete eventsById[event.mutationId];
  }

  return { cursor, charactersById, eventsById };
}

export function characterV3ClientSyncSummary(state: CharacterV3ClientSyncState): {
  cursor: number;
  characterCount: number;
  eventCount: number;
} {
  return {
    cursor: state.cursor,
    characterCount: Object.keys(state.charactersById).length,
    eventCount: Object.keys(state.eventsById).length,
  };
}
