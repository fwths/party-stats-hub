import { normalizeRuleName } from "../character-v2/reconcile";
import { CharacterAggregateSchema, type CharacterAggregate } from "./schema";
import type { SpeciesCapabilityCatalogRecord } from "./capabilities";
import type { MagicInitiateSpellCatalogRecord } from "./magic-initiate";
import { authorizeCharacterMutation, type MutationAuthority } from "./authority";

function collectExplicitSpellNames(value: unknown, output: Set<string>) {
  if (typeof value === "string") {
    if (value.includes("|") && !value.startsWith("level=")) {
      output.add(normalizeRuleName(value.split("|")[0]));
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectExplicitSpellNames(entry, output));
    return;
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach((entry) => collectExplicitSpellNames(entry, output));
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

export function confirmImportedElfLineage(input: {
  character: CharacterAggregate;
  speciesCatalog: SpeciesCapabilityCatalogRecord[];
  spellCatalog: MagicInitiateSpellCatalogRecord[];
  actorUserId: string;
  authority?: MutationAuthority;
  expectedBuildRevision: number;
  mutationId: string;
  lineage: "drow" | "high-elf" | "wood-elf";
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
    throw new Error("Only the character owner can confirm Elf lineage");
  }
  if (input.expectedBuildRevision !== character.build.revision) {
    throw new Error(
      `build revision conflict: expected ${input.expectedBuildRevision}, found ${character.build.revision}`,
    );
  }
  const species = character.build.speciesRef;
  if (normalizeRuleName(species.name) !== "elf") throw new Error("Character is not an Elf");
  if (!authorized(character, species.versionKey, species.verification)) {
    throw new Error("Elf version must be verified or explicitly approved");
  }
  if (
    character.resolutions.some((resolution) => resolution.type === "elf-lineage-import-confirmed")
  ) {
    throw new Error("Elf lineage import has already been confirmed");
  }
  const record = input.speciesCatalog.find(
    (entry) => entry.id === species.upstreamId && entry.sourceId === species.sourceId,
  );
  if (!record?.rawJson) throw new Error("Elf structured data is unavailable");
  const raw = JSON.parse(record.rawJson) as { additionalSpells?: unknown[] };
  const group = raw.additionalSpells?.find(
    (entry) =>
      !!entry &&
      typeof entry === "object" &&
      "name" in entry &&
      normalizeRuleName(String(entry.name)) === normalizeRuleName(input.lineage),
  ) as { ability?: { choose?: unknown[] } } | undefined;
  if (!group) throw new Error(`Unknown Elf lineage ${input.lineage}`);
  const abilities = Array.isArray(group.ability?.choose)
    ? group.ability!.choose!.map((value) => String(value).toUpperCase())
    : [];
  if (!abilities.includes(input.castingAbility)) {
    throw new Error(`${input.castingAbility} is not allowed for this Elf lineage`);
  }
  if (
    input.selectedSpellVersionKeys.length !== 3 ||
    new Set(input.selectedSpellVersionKeys).size !== 3
  ) {
    throw new Error("Elf lineage requires exactly three distinct spells");
  }
  const fixedNames = new Set<string>();
  collectExplicitSpellNames(group, fixedNames);
  const selected = input.selectedSpellVersionKeys.map((versionKey) => {
    const matches = input.spellCatalog.filter((entry) => entry.spellRef.versionKey === versionKey);
    if (matches.length !== 1)
      throw new Error(`Spell version ${versionKey} is not uniquely cataloged`);
    const spell = matches[0];
    if (!authorized(character, spell.spellRef.versionKey, spell.spellRef.verification)) {
      throw new Error(`${spell.spellRef.name} must be verified or explicitly approved`);
    }
    return spell;
  });
  if (input.lineage === "high-elf") {
    const fixedSelected = selected.filter((spell) =>
      fixedNames.has(normalizeRuleName(spell.spellRef.name)),
    );
    const chosenCantrips = selected.filter(
      (spell) => spell.level === 0 && spell.classIds.includes("wizard"),
    );
    if (fixedSelected.length !== 2 || chosenCantrips.length !== 1) {
      throw new Error("High Elf requires one Wizard cantrip, Detect Magic, and Misty Step");
    }
  } else if (
    selected.some((spell) => !fixedNames.has(normalizeRuleName(spell.spellRef.name))) ||
    fixedNames.size !== 3
  ) {
    throw new Error(`${input.lineage} spells do not match the structured lineage bundle`);
  }
  const imported = character.build.spells.filter(
    (spell) => spell.grantSourceRef?.versionKey === species.versionKey,
  );
  if (imported.length !== 3) throw new Error("Expected exactly three imported Elf lineage spells");
  if (imported.some((spell) => spell.castingAbility !== input.castingAbility)) {
    throw new Error("Imported Elf casting ability requires explicit correction first");
  }
  const exactByName = new Map(
    selected.map((spell) => [normalizeRuleName(spell.spellRef.name), spell]),
  );
  for (const spell of imported) {
    if (!exactByName.has(normalizeRuleName(spell.spellRef.name))) {
      throw new Error(`Imported spell ${spell.spellRef.name} does not match ${input.lineage}`);
    }
  }
  const decisionId = `decision:elf-lineage:${input.mutationId}`;
  const updated = CharacterAggregateSchema.parse({
    ...character,
    build: {
      ...character.build,
      revision: character.build.revision + 1,
      decisions: [
        ...character.build.decisions,
        {
          id: decisionId,
          type: "elf-lineage-selection",
          sourceRef: species,
          lineage: input.lineage,
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
        id: `resolution:elf-lineage:${input.mutationId}`,
        type: "elf-lineage-import-confirmed",
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
      type: "confirm-elf-lineage-import" as const,
      lineage: input.lineage,
      castingAbility: input.castingAbility,
      spellVersionKeys: selected.map((spell) => spell.spellRef.versionKey),
      buildRevision: { before: character.build.revision, after: updated.build.revision },
      authorization,
    },
  };
}
