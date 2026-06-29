import { normalizeRuleName } from "../character-v2/reconcile";
import { CharacterAggregateSchema, type CharacterAggregate } from "./schema";
import type { MagicInitiateSpellCatalogRecord } from "./magic-initiate";
import type { SpeciesCapabilityCatalogRecord } from "./capabilities";
import { authorizeCharacterMutation, type MutationAuthority } from "./authority";

const RESISTANCE = {
  abyssal: "Poison",
  chthonic: "Necrotic",
  infernal: "Fire",
} as const;

function collectSpellNames(value: unknown, output: Set<string>) {
  if (typeof value === "string") {
    if (value.includes("|") && !value.startsWith("level=")) {
      output.add(normalizeRuleName(value.split("|")[0]));
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectSpellNames(entry, output));
    return;
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach((entry) => collectSpellNames(entry, output));
  }
}

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

export function confirmImportedTieflingLegacy(input: {
  character: CharacterAggregate;
  speciesCatalog: SpeciesCapabilityCatalogRecord[];
  spellCatalog: MagicInitiateSpellCatalogRecord[];
  actorUserId: string;
  authority?: MutationAuthority;
  expectedBuildRevision: number;
  mutationId: string;
  legacy: "abyssal" | "chthonic" | "infernal";
  castingAbility: "INT" | "WIS" | "CHA";
  selectedSpellVersionKeys: string[];
}): CharacterAggregate {
  const character = CharacterAggregateSchema.parse(input.character);
  let authorization;
  try {
    authorization = authorizeCharacterMutation({
      character,
      actorUserId: input.actorUserId,
      authority: input.authority,
    });
  } catch {
    throw new Error("Only the character owner can confirm Tiefling legacy");
  }
  if (input.expectedBuildRevision !== character.build.revision) {
    throw new Error(
      `build revision conflict: expected ${input.expectedBuildRevision}, found ${character.build.revision}`,
    );
  }
  const species = character.build.speciesRef;
  if (normalizeRuleName(species.name) !== "tiefling")
    throw new Error("Character is not a Tiefling");
  if (!authorized(character, species.versionKey, species.verification)) {
    throw new Error("Tiefling version must be verified or explicitly approved");
  }
  if (
    character.resolutions.some(
      (resolution) => resolution.type === "tiefling-legacy-import-confirmed",
    )
  ) {
    throw new Error("Tiefling legacy import has already been confirmed");
  }
  const record = input.speciesCatalog.find(
    (entry) => entry.id === species.upstreamId && entry.sourceId === species.sourceId,
  );
  if (!record?.rawJson) throw new Error("Tiefling structured data is unavailable");
  const raw = JSON.parse(record.rawJson) as { additionalSpells?: unknown[] };
  const group = raw.additionalSpells?.find(
    (entry) =>
      !!entry &&
      typeof entry === "object" &&
      "name" in entry &&
      normalizeRuleName(String(entry.name)) === input.legacy,
  ) as { ability?: { choose?: unknown[] } } | undefined;
  if (!group) throw new Error(`Unknown Tiefling legacy ${input.legacy}`);
  const abilities = Array.isArray(group.ability?.choose)
    ? group.ability!.choose!.map((value) => String(value).toUpperCase())
    : [];
  if (!abilities.includes(input.castingAbility)) {
    throw new Error(`${input.castingAbility} is not allowed for this Tiefling legacy`);
  }
  const expectedNames = new Set<string>();
  collectSpellNames(group, expectedNames);
  if (expectedNames.size !== 4) throw new Error("Tiefling legacy must define exactly four spells");
  if (
    input.selectedSpellVersionKeys.length !== 4 ||
    new Set(input.selectedSpellVersionKeys).size !== 4
  ) {
    throw new Error("Tiefling legacy requires exactly four distinct spells");
  }
  const selected = input.selectedSpellVersionKeys.map((versionKey) => {
    const matches = input.spellCatalog.filter((entry) => entry.spellRef.versionKey === versionKey);
    if (matches.length !== 1)
      throw new Error(`Spell version ${versionKey} is not uniquely cataloged`);
    const spell = matches[0];
    if (!expectedNames.has(normalizeRuleName(spell.spellRef.name))) {
      throw new Error(`${spell.spellRef.name} is not granted by ${input.legacy} legacy`);
    }
    if (!authorized(character, spell.spellRef.versionKey, spell.spellRef.verification)) {
      throw new Error(`${spell.spellRef.name} must be verified or explicitly approved`);
    }
    return spell;
  });
  if (new Set(selected.map((spell) => normalizeRuleName(spell.spellRef.name))).size !== 4) {
    throw new Error("Tiefling legacy selected spells do not cover the complete spell bundle");
  }
  const imported = character.build.spells.filter(
    (spell) => spell.grantSourceRef?.versionKey === species.versionKey,
  );
  if (imported.length !== 4) throw new Error("Expected exactly four imported Tiefling spells");
  if (imported.some((spell) => spell.castingAbility !== input.castingAbility)) {
    throw new Error("Imported Tiefling casting ability requires explicit correction first");
  }
  const exactByName = new Map(
    selected.map((spell) => [normalizeRuleName(spell.spellRef.name), spell]),
  );
  for (const spell of imported) {
    if (!exactByName.has(normalizeRuleName(spell.spellRef.name))) {
      throw new Error(
        `Imported spell ${spell.spellRef.name} does not match ${input.legacy} legacy`,
      );
    }
  }
  const resistance = RESISTANCE[input.legacy];
  const baseline = character.migrationBaseline?.capabilities ?? [];
  const resistanceMatches = baseline.filter(
    (capability) =>
      capability.kind === "resistance" &&
      normalizeRuleName(capability.label) === normalizeRuleName(resistance),
  );
  if (resistanceMatches.length !== 1) {
    throw new Error(`Expected exactly one imported ${resistance} resistance`);
  }
  const decisionId = `decision:tiefling-legacy:${input.mutationId}`;
  const removedId = resistanceMatches[0].id;
  const remaining = baseline.filter((capability) => capability.id !== removedId);
  const updated = CharacterAggregateSchema.parse({
    ...character,
    build: {
      ...character.build,
      revision: character.build.revision + 1,
      decisions: [
        ...character.build.decisions,
        {
          id: decisionId,
          type: "tiefling-legacy-selection",
          sourceRef: species,
          legacy: input.legacy,
          castingAbility: input.castingAbility,
          resistance,
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
    migrationBaseline:
      character.migrationBaseline && remaining.length > 0
        ? { ...character.migrationBaseline, capabilities: remaining }
        : null,
    resolutions: [
      ...character.resolutions,
      {
        id: `resolution:tiefling-legacy:${input.mutationId}`,
        type: "tiefling-legacy-import-confirmed",
        decisionId,
        sourceVersionKey: species.versionKey,
        baselineResistanceId: removedId,
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
      type: "confirm-tiefling-legacy-import" as const,
      legacy: input.legacy,
      castingAbility: input.castingAbility,
      resistance,
      removedCapabilityId: removedId,
      spellVersionKeys: selected.map((spell) => spell.spellRef.versionKey),
      buildRevision: { before: character.build.revision, after: updated.build.revision },
      authorization,
    },
  };
}
