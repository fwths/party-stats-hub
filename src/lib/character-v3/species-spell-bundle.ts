import { normalizeRuleName } from "../character-v2/reconcile";
import { CharacterAggregateSchema, type CharacterAggregate } from "./schema";
import type { SpeciesCapabilityCatalogRecord } from "./capabilities";
import type { MagicInitiateSpellCatalogRecord } from "./magic-initiate";
import { authorizeCharacterMutation, type MutationAuthority } from "./authority";

function authorized(character: CharacterAggregate, versionKey: string, verification: string) {
  return (
    verification === "verified" ||
    character.resolutions.some(
      (resolution) =>
        resolution.type === "content-version-decision" &&
        resolution.selectedVersionKey === versionKey,
    )
  );
}

export function confirmImportedFirbolgMagic(input: {
  character: CharacterAggregate;
  speciesCatalog: SpeciesCapabilityCatalogRecord[];
  spellCatalog: MagicInitiateSpellCatalogRecord[];
  actorUserId: string;
  authority?: MutationAuthority;
  expectedBuildRevision: number;
  mutationId: string;
  castingAbility: "INT" | "WIS" | "CHA";
  selectedSpellVersionKeys: string[];
}) {
  const character = CharacterAggregateSchema.parse(input.character);
  let authorization;
  try {
    authorization = authorizeCharacterMutation({
      character,
      actorUserId: input.actorUserId,
      authority: input.authority,
    });
  } catch {
    throw new Error("Only the character owner can confirm Firbolg Magic");
  }
  if (input.expectedBuildRevision !== character.build.revision) {
    throw new Error(
      `build revision conflict: expected ${input.expectedBuildRevision}, found ${character.build.revision}`,
    );
  }
  const species = character.build.speciesRef;
  if (normalizeRuleName(species.name) !== "firbolg") throw new Error("Character is not a Firbolg");
  if (!authorized(character, species.versionKey, species.verification)) {
    throw new Error("Firbolg version must be verified or explicitly approved");
  }
  if (
    character.resolutions.some(
      (resolution) => resolution.type === "species-spell-bundle-import-confirmed",
    )
  ) {
    throw new Error("Firbolg Magic import has already been confirmed");
  }
  const record = input.speciesCatalog.find(
    (entry) => entry.id === species.upstreamId && entry.sourceId === species.sourceId,
  );
  if (!record?.rawJson) throw new Error("Firbolg structured data is unavailable");
  const raw = JSON.parse(record.rawJson) as {
    additionalSpells?: Array<{
      ability?: { choose?: unknown[] };
      innate?: Record<string, unknown>;
    }>;
  };
  const group = raw.additionalSpells?.[0];
  if (!group) throw new Error("Firbolg Magic spell data is unavailable");
  const abilities = Array.isArray(group.ability?.choose)
    ? group.ability!.choose!.map((value) => String(value).toUpperCase())
    : [];
  if (!abilities.includes(input.castingAbility)) {
    throw new Error(`${input.castingAbility} is not allowed for Firbolg Magic`);
  }
  const expectedNames = new Set(
    Object.values(group.innate ?? {})
      .flatMap((value) => (Array.isArray(value) ? value : []))
      .filter((value): value is string => typeof value === "string")
      .map(normalizeRuleName),
  );
  if (expectedNames.size !== 2) throw new Error("Firbolg Magic must define exactly two spells");
  if (
    input.selectedSpellVersionKeys.length !== 2 ||
    new Set(input.selectedSpellVersionKeys).size !== 2
  ) {
    throw new Error("Firbolg Magic requires exactly two distinct spells");
  }
  const selected = input.selectedSpellVersionKeys.map((versionKey) => {
    const matches = input.spellCatalog.filter((entry) => entry.spellRef.versionKey === versionKey);
    if (matches.length !== 1)
      throw new Error(`Spell version ${versionKey} is not uniquely cataloged`);
    const spell = matches[0];
    if (!expectedNames.has(normalizeRuleName(spell.spellRef.name))) {
      throw new Error(`${spell.spellRef.name} is not granted by Firbolg Magic`);
    }
    if (!authorized(character, spell.spellRef.versionKey, spell.spellRef.verification)) {
      throw new Error(`${spell.spellRef.name} must be verified or explicitly approved`);
    }
    return spell;
  });
  const imported = character.build.spells.filter(
    (spell) => spell.grantSourceRef?.versionKey === species.versionKey,
  );
  if (imported.length !== 2) throw new Error("Expected exactly two imported Firbolg Magic spells");
  if (imported.some((spell) => spell.castingAbility !== input.castingAbility)) {
    throw new Error("Imported Firbolg casting ability requires explicit correction first");
  }
  const exactByName = new Map(
    selected.map((spell) => [normalizeRuleName(spell.spellRef.name), spell]),
  );
  for (const spell of imported) {
    if (!exactByName.has(normalizeRuleName(spell.spellRef.name))) {
      throw new Error(`Imported spell ${spell.spellRef.name} does not match Firbolg Magic`);
    }
  }
  const decisionId = `decision:firbolg-magic:${input.mutationId}`;
  const updated = CharacterAggregateSchema.parse({
    ...character,
    build: {
      ...character.build,
      revision: character.build.revision + 1,
      decisions: [
        ...character.build.decisions,
        {
          id: decisionId,
          type: "species-spell-bundle-selection",
          sourceRef: species,
          traitName: "Firbolg Magic",
          castingAbility: input.castingAbility,
          spellVersionKeys: selected.map((spell) => spell.spellRef.versionKey),
          madeAtCharacterLevel: null,
          provenance: "imported",
        },
      ],
      spells: character.build.spells.map((spell) => {
        if (!imported.some((entry) => entry.id === spell.id)) return spell;
        const exact = exactByName.get(normalizeRuleName(spell.spellRef.name))!;
        return {
          ...spell,
          spellRef: exact.spellRef,
          grantSourceRef: species,
          castingAbility: input.castingAbility,
          decisionId,
        };
      }),
    },
    resolutions: [
      ...character.resolutions,
      {
        id: `resolution:firbolg-magic:${input.mutationId}`,
        type: "species-spell-bundle-import-confirmed",
        decisionId,
        sourceVersionKey: species.versionKey,
        importedSpellIds: imported.map((spell) => spell.id),
        decidedByUserId: input.actorUserId,
      },
    ],
  });
  return {
    character: updated,
    auditEvent: {
      mutationId: input.mutationId,
      actorUserId: input.actorUserId,
      characterId: character.identity.id,
      type: "confirm-firbolg-magic-import" as const,
      castingAbility: input.castingAbility,
      spellVersionKeys: selected.map((spell) => spell.spellRef.versionKey),
      buildRevision: { before: character.build.revision, after: updated.build.revision },
      authorization,
    },
  };
}
