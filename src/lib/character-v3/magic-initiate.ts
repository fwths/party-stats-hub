import { normalizeRuleName } from "../character-v2/reconcile";
import { CharacterAggregateSchema, type CharacterAggregate, type ExactRuleRef } from "./schema";
import {
  authorizeCharacterMutation,
  CharacterMutationPermissionError,
  type AuthorizationAudit,
  type MutationAuthority,
} from "./authority";

export type MagicInitiateFeatCatalogRecord = {
  featRef: ExactRuleRef;
  rawJson: string;
};

export type MagicInitiateSpellCatalogRecord = {
  spellRef: ExactRuleRef;
  level: number;
  classIds: string[];
};

export class MagicInitiatePermissionError extends Error {
  constructor() {
    super("Only the character owner can confirm Magic Initiate");
    this.name = "MagicInitiatePermissionError";
  }
}

export class MagicInitiateConflictError extends Error {
  constructor(
    readonly expected: number,
    readonly actual: number,
  ) {
    super(`build revision conflict: expected ${expected}, found ${actual}`);
    this.name = "MagicInitiateConflictError";
  }
}

function authorized(character: CharacterAggregate, ref: ExactRuleRef): boolean {
  return (
    ref.verification === "verified" ||
    character.resolutions.some(
      (resolution) =>
        resolution.type === "content-version-decision" &&
        resolution.selectedVersionKey === ref.versionKey,
    )
  );
}

function magicInitiateSpells(character: CharacterAggregate) {
  return character.build.spells.filter((spell) =>
    /^magic initiate\b/i.test(spell.grantSourceRef?.name ?? ""),
  );
}

export function confirmImportedMagicInitiate(input: {
  character: CharacterAggregate;
  feat: MagicInitiateFeatCatalogRecord;
  spellCatalog: MagicInitiateSpellCatalogRecord[];
  actorUserId: string;
  authority?: MutationAuthority;
  expectedBuildRevision: number;
  mutationId: string;
  spellList: "cleric" | "druid" | "wizard";
  castingAbility: "INT" | "WIS" | "CHA";
  selectedSpellVersionKeys: string[];
}): {
  character: CharacterAggregate;
  auditEvent: {
    mutationId: string;
    actorUserId: string;
    characterId: string;
    type: "confirm-magic-initiate-import";
    spellList: "cleric" | "druid" | "wizard";
    castingAbility: "INT" | "WIS" | "CHA";
    spellVersionKeys: string[];
    buildRevision: { before: number; after: number };
    authorization: AuthorizationAudit;
  };
} {
  const character = CharacterAggregateSchema.parse(input.character);
  let authorization: AuthorizationAudit;
  try {
    authorization = authorizeCharacterMutation({
      character,
      actorUserId: input.actorUserId,
      authority: input.authority,
    });
  } catch (error) {
    if (error instanceof CharacterMutationPermissionError) {
      throw new MagicInitiatePermissionError();
    }
    throw error;
  }
  if (input.expectedBuildRevision !== character.build.revision) {
    throw new MagicInitiateConflictError(input.expectedBuildRevision, character.build.revision);
  }
  if (input.feat.featRef.kind !== "feat" || input.feat.featRef.name !== "Magic Initiate") {
    throw new Error("Magic Initiate confirmation requires the exact base feat version");
  }
  if (!authorized(character, input.feat.featRef)) {
    throw new Error("Magic Initiate feat version must be verified or explicitly approved");
  }
  if (
    character.resolutions.some(
      (resolution) => resolution.type === "magic-initiate-import-confirmed",
    )
  ) {
    throw new Error("Magic Initiate import has already been confirmed");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(input.feat.rawJson);
  } catch {
    throw new Error("Magic Initiate feat data is invalid JSON");
  }
  const groups =
    raw &&
    typeof raw === "object" &&
    "additionalSpells" in raw &&
    Array.isArray(raw.additionalSpells)
      ? raw.additionalSpells
      : [];
  const group = groups.find((entry) => {
    if (!entry || typeof entry !== "object" || !("name" in entry)) return false;
    return normalizeRuleName(String(entry.name)) === `${input.spellList} spells`;
  }) as { ability?: { choose?: unknown[] } } | undefined;
  if (!group) throw new Error(`${input.spellList} is not an eligible Magic Initiate spell list`);
  const allowedAbilities = Array.isArray(group.ability?.choose)
    ? group.ability!.choose!.map((value) => String(value).toUpperCase())
    : [];
  if (!allowedAbilities.includes(input.castingAbility)) {
    throw new Error(`${input.castingAbility} is not allowed by this Magic Initiate version`);
  }
  if (
    input.selectedSpellVersionKeys.length !== 3 ||
    new Set(input.selectedSpellVersionKeys).size !== 3
  ) {
    throw new Error("Magic Initiate requires exactly three distinct spells");
  }
  const selected = input.selectedSpellVersionKeys.map((versionKey) => {
    const matches = input.spellCatalog.filter(
      (record) => record.spellRef.versionKey === versionKey,
    );
    if (matches.length !== 1)
      throw new Error(`Spell version ${versionKey} is not uniquely cataloged`);
    const record = matches[0];
    if (!record.classIds.includes(input.spellList)) {
      throw new Error(`Spell ${record.spellRef.name} is not on the ${input.spellList} list`);
    }
    if (!authorized(character, record.spellRef)) {
      throw new Error(`Spell ${record.spellRef.name} must be verified or explicitly approved`);
    }
    return record;
  });
  if (selected.filter((spell) => spell.level === 0).length !== 2) {
    throw new Error("Magic Initiate requires exactly two cantrips");
  }
  if (selected.filter((spell) => spell.level === 1).length !== 1) {
    throw new Error("Magic Initiate requires exactly one level 1 spell");
  }
  const imported = magicInitiateSpells(character);
  if (imported.length !== 3)
    throw new Error("Expected exactly three imported Magic Initiate spells");
  if (imported.some((spell) => spell.castingAbility !== input.castingAbility)) {
    throw new Error("Imported Magic Initiate casting ability requires explicit correction first");
  }
  for (const spell of imported) {
    const matches = selected.filter(
      (record) =>
        normalizeRuleName(record.spellRef.name) === normalizeRuleName(spell.spellRef.name),
    );
    if (matches.length !== 1 || matches[0].level !== spell.spellLevel) {
      throw new Error(
        `Imported spell ${spell.spellRef.name} does not match the confirmed selection`,
      );
    }
  }
  const decisionId = `decision:magic-initiate:${input.mutationId}`;
  const cantrips = selected.filter((spell) => spell.level === 0);
  const levelOne = selected.find((spell) => spell.level === 1)!;
  const exactByName = new Map(
    selected.map((record) => [normalizeRuleName(record.spellRef.name), record]),
  );
  const updated = CharacterAggregateSchema.parse({
    ...character,
    build: {
      ...character.build,
      revision: character.build.revision + 1,
      decisions: [
        ...character.build.decisions,
        {
          id: decisionId,
          type: "magic-initiate-selection",
          sourceRef: input.feat.featRef,
          spellList: input.spellList,
          castingAbility: input.castingAbility,
          cantripVersionKeys: cantrips.map((spell) => spell.spellRef.versionKey),
          levelOneSpellVersionKey: levelOne.spellRef.versionKey,
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
          spellLevel: exact.level,
          grantSourceRef: input.feat.featRef,
          castingAbility: input.castingAbility,
          decisionId,
        };
      }),
    },
    resolutions: [
      ...character.resolutions,
      {
        id: `resolution:magic-initiate:${input.mutationId}`,
        type: "magic-initiate-import-confirmed",
        decisionId,
        sourceVersionKey: input.feat.featRef.versionKey,
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
      type: "confirm-magic-initiate-import",
      spellList: input.spellList,
      castingAbility: input.castingAbility,
      spellVersionKeys: input.selectedSpellVersionKeys,
      buildRevision: { before: character.build.revision, after: updated.build.revision },
      authorization,
    },
  };
}
