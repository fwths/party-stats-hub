import { parseCharacterPayload } from "@/lib/parser";
import type { PartyMember, PreparedSpell } from "@/lib/dndbeyond.types";
import { migrateDdbPayloadToCharacterV2 } from "../character-v2/migrate-ddb";
import { createRuleFamilyKey, createRuleVersionKey } from "../character-v2/rule-identity";
import type {
  CharacterAggregate as CharacterAggregateV2,
  RuleRef as RuleRefV2,
} from "../character-v2/schema";
import { CharacterAggregateSchema, type CharacterAggregate, type ExactRuleRef } from "./schema";

export type V3MigrationOptions = {
  campaignId: string;
  importedMember?: PartyMember;
};

function keyPart(value: string): string {
  const result = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return result || "unknown";
}

function exactRuleRef(ref: RuleRefV2, contentRevision: string): ExactRuleRef {
  const verification = ref.verification;
  const compatibility =
    verification === "custom"
      ? ("custom" as const)
      : verification === "verified"
        ? ["XPHB", "XDMG", "XMM"].includes(ref.sourceId.toUpperCase())
          ? ("core-2024" as const)
          : ("current-2024-compatible" as const)
        : ("legacy" as const);
  return {
    kind: ref.kind,
    familyKey: createRuleFamilyKey(ref.kind, ref.name),
    versionKey: createRuleVersionKey({
      kind: ref.kind,
      sourceId: ref.sourceId,
      upstreamId: ref.id,
      contentRevision,
    }),
    name: ref.name,
    rulesGeneration: "2024",
    sourceId: ref.sourceId,
    upstreamId: ref.id,
    contentRevision,
    compatibility,
    verification,
  };
}

function importedSpellRef(spell: PreparedSpell, contentRevision: string): ExactRuleRef {
  const upstreamId = keyPart(spell.name);
  return {
    kind: "spell",
    familyKey: createRuleFamilyKey("spell", spell.name),
    versionKey: createRuleVersionKey({
      kind: "spell",
      sourceId: "ddb-import",
      upstreamId,
      contentRevision,
    }),
    name: spell.name,
    rulesGeneration: "2024",
    sourceId: "ddb-import",
    upstreamId,
    contentRevision,
    compatibility: "legacy",
    verification: "imported-unverified",
  };
}

function spellSelections(
  member: PartyMember | undefined,
  classVersionKey: string,
  contentRevision: string,
): CharacterAggregate["build"]["spells"] {
  if (!member) return [];
  const rows: CharacterAggregate["build"]["spells"] = [];
  const seen = new Set<string>();
  const add = (spell: PreparedSpell, mode: "cantrip" | "prepared" | "always-prepared") => {
    const ref = importedSpellRef(spell, contentRevision);
    const key = `${mode}:${ref.familyKey}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({
      id: `ddb:spell:${keyPart(mode)}:${keyPart(spell.name)}`,
      spellRef: ref,
      spellLevel: spell.level,
      classVersionKey,
      grantSourceRef: null,
      castingAbility: null,
      mode,
      active: true,
      selectedAtCharacterLevel: null,
      provenance: "imported",
      decisionId: null,
    });
  };
  member.cantrips.forEach((spell) => add(spell, "cantrip"));
  member.preparedSpells.forEach((spell) =>
    add(spell, spell.alwaysPrepared ? "always-prepared" : "prepared"),
  );
  return rows;
}

const DDB_ABILITY: Record<number, "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA"> = {
  1: "STR",
  2: "DEX",
  3: "CON",
  4: "INT",
  5: "WIS",
  6: "CHA",
};

function importedGrantRef(input: {
  kind: "feat" | "feature" | "item";
  name: string;
  upstreamId: string;
  contentRevision: string;
}): ExactRuleRef {
  return {
    kind: input.kind,
    familyKey: createRuleFamilyKey(input.kind, input.name),
    versionKey: createRuleVersionKey({
      kind: input.kind,
      sourceId: "ddb-import",
      upstreamId: input.upstreamId,
      contentRevision: input.contentRevision,
    }),
    name: input.name,
    rulesGeneration: "2024",
    sourceId: "ddb-import",
    upstreamId: input.upstreamId,
    contentRevision: input.contentRevision,
    compatibility: "legacy",
    verification: "imported-unverified",
  };
}

function attachDdbGrantedSpellSources(
  character: CharacterAggregate,
  payload: unknown,
): CharacterAggregate {
  const data = (payload as { data?: Record<string, unknown> })?.data;
  if (!data) return character;
  const spells = data.spells as Record<string, unknown[]> | undefined;
  const grantGroups = ["feat", "race", "item", "background"] as const;
  if (!grantGroups.some((group) => Array.isArray(spells?.[group]) && spells[group].length > 0)) {
    return character;
  }
  const classSpellNames = new Set(
    (Array.isArray(spells?.class) ? spells.class : [])
      .map((entry) =>
        entry && typeof entry === "object" && "definition" in entry
          ? (entry.definition as { name?: unknown })?.name
          : null,
      )
      .filter((name): name is string => typeof name === "string")
      .map(normalizeSpellName),
  );
  const featDefinitions = new Map<number, { name: string }>();
  for (const entry of (Array.isArray(data.feats) ? data.feats : []) as unknown[]) {
    if (!entry || typeof entry !== "object" || !("definition" in entry)) continue;
    const definition = entry.definition as { id?: unknown; name?: unknown };
    if (typeof definition.id === "number" && typeof definition.name === "string") {
      featDefinitions.set(definition.id, { name: definition.name });
    }
  }
  const itemDefinitions = new Map<number, { name: string }>();
  for (const entry of (Array.isArray(data.inventory) ? data.inventory : []) as unknown[]) {
    if (!entry || typeof entry !== "object" || !("definition" in entry)) continue;
    const definition = entry.definition as { id?: unknown; name?: unknown };
    if (typeof definition.id === "number" && typeof definition.name === "string") {
      itemDefinitions.set(definition.id, { name: definition.name });
    }
  }
  const contentRevision = character.build.rulesContext.catalogRevision;
  const granted: CharacterAggregate["build"]["spells"] = [];
  const grantedNames = new Set<string>();
  for (const group of grantGroups) {
    const entries = Array.isArray(spells?.[group]) ? spells[group] : [];
    for (const entry of entries) {
      if (!entry || typeof entry !== "object" || !("definition" in entry)) continue;
      const raw = entry as {
        componentId?: unknown;
        spellCastingAbilityId?: unknown;
        definition?: { id?: unknown; name?: unknown; level?: unknown };
      };
      const name = raw.definition?.name;
      const level = raw.definition?.level;
      const componentId = raw.componentId;
      if (
        typeof name !== "string" ||
        typeof level !== "number" ||
        typeof componentId !== "number"
      ) {
        continue;
      }
      let grantSourceRef: ExactRuleRef | null = null;
      if (group === "feat") {
        const feat = featDefinitions.get(componentId);
        if (feat) {
          grantSourceRef = importedGrantRef({
            kind: "feat",
            name: feat.name,
            upstreamId: `ddb:feat:${componentId}`,
            contentRevision,
          });
        }
      } else if (group === "race") {
        grantSourceRef = character.build.speciesRef;
      } else if (group === "background") {
        grantSourceRef = character.build.backgroundRef;
      } else {
        const item = itemDefinitions.get(componentId);
        if (item) {
          grantSourceRef = importedGrantRef({
            kind: "item",
            name: item.name,
            upstreamId: `ddb:item:${componentId}`,
            contentRevision,
          });
        }
      }
      if (!grantSourceRef) continue;
      const sourceIdentity =
        group === "race" || group === "background" ? grantSourceRef.versionKey : componentId;
      const uniqueness = `${group}:${sourceIdentity}:${normalizeSpellName(name)}:${level}`;
      if (grantedNames.has(uniqueness)) continue;
      grantedNames.add(uniqueness);
      granted.push({
        id: `ddb:spell:${group}:${componentId}:${keyPart(name)}`,
        spellRef: importedSpellRef({ name, level } as PreparedSpell, contentRevision),
        spellLevel: level,
        classVersionKey: null,
        grantSourceRef,
        castingAbility:
          typeof raw.spellCastingAbilityId === "number"
            ? (DDB_ABILITY[raw.spellCastingAbilityId] ?? null)
            : null,
        mode: "granted",
        active: true,
        selectedAtCharacterLevel: null,
        provenance: "imported",
        decisionId: null,
      });
    }
  }
  const grantOnlyNames = new Set(
    granted
      .map((spell) => normalizeSpellName(spell.spellRef.name))
      .filter((name) => !classSpellNames.has(name)),
  );
  return CharacterAggregateSchema.parse({
    ...character,
    build: {
      ...character.build,
      spells: [
        ...character.build.spells.filter(
          (spell) => !grantOnlyNames.has(normalizeSpellName(spell.spellRef.name)),
        ),
        ...granted,
      ],
    },
  });
}

function normalizeSpellName(value: string): string {
  return value.trim().toLowerCase();
}

function importedCapabilities(
  member: PartyMember | undefined,
): CharacterAggregate["migrationBaseline"] {
  if (!member) return null;
  const capabilities: NonNullable<CharacterAggregate["migrationBaseline"]>["capabilities"] = [];
  const seen = new Set<string>();
  const add = (
    kind: (typeof capabilities)[number]["kind"],
    label: string,
    value: number | null = null,
  ) => {
    const key = `${kind}:${keyPart(label)}:${value ?? "none"}`;
    if (seen.has(key)) return;
    seen.add(key);
    capabilities.push({
      id: `ddb:capability:${key}`,
      kind,
      label,
      value,
      sourceRef: null,
      status: "imported-unreconciled",
    });
  };
  member.languages.forEach((label) => add("language", label));
  member.tools.forEach((label) => add("tool", label));
  member.armorProficiencies.forEach((label) => add("armor-proficiency", label));
  member.weaponProficiencies.forEach((label) => add("weapon-proficiency", label));
  member.defenses.forEach((defense) =>
    add(
      defense.type === "condition_immunity" ? "condition-immunity" : defense.type,
      defense.damageType,
    ),
  );
  member.senses.forEach((sense) => add("sense", sense.name, sense.value));
  return { sourceSystem: "ddb", capabilities };
}

export function migrateCharacterV2ToV3(
  character: CharacterAggregateV2,
  options: V3MigrationOptions,
): CharacterAggregate {
  const contentRevision = character.build.contentRevision;
  const classRefs = new Map<string, ExactRuleRef>();
  for (const level of character.build.levels) {
    if (!classRefs.has(level.classRef.id)) {
      classRefs.set(level.classRef.id, exactRuleRef(level.classRef, contentRevision));
    }
  }
  const primaryClass = classRefs.values().next().value as ExactRuleRef | undefined;
  if (!primaryClass) throw new Error("V2 character has no class reference");

  const decisions = character.build.choices
    .filter((choice) => choice.selectionState === "confirmed")
    .map((choice) => ({
      id: choice.id,
      type: "rule-selection" as const,
      madeAtCharacterLevel: choice.grantedAtCharacterLevel,
      provenance: choice.provenance,
      selectionKind: choice.selection.kind === "feat" ? ("feat" as const) : ("other" as const),
      sourceRef: null,
      selections: [exactRuleRef(choice.selection, contentRevision)],
    }));
  const migrationIssues = [
    ...character.migrationIssues,
    {
      code: "V3_IMPORTED_HP_BASELINE",
      severity: "warning" as const,
      message:
        "Historical level-by-level HP choices remain collapsed into a verified-at-import baseline.",
    },
  ];
  if (!options.importedMember) {
    migrationIssues.push({
      code: "V3_SPELL_SNAPSHOT_NOT_PROVIDED",
      severity: "blocking",
      message: "Authoritative imported spell selections require the original character snapshot.",
    });
  } else {
    migrationIssues.push({
      code: "V3_IMPORTED_CAPABILITIES_REQUIRE_RECONCILIATION",
      severity: "warning",
      message:
        "Imported languages, proficiencies, defenses, and senses are preserved as a temporary baseline until their exact rule sources are reconciled.",
    });
  }
  if (character.build.overrides.length > 0) {
    migrationIssues.push({
      code: "V3_UNTYPED_OVERRIDES_NOT_MIGRATED",
      severity: "warning",
      message: "V2 migration-baseline payloads were not converted into executable V3 overrides.",
    });
  }

  const migrated: CharacterAggregate = {
    identity: {
      ...character.identity,
      campaignId: options.campaignId,
    },
    profile: {
      alignment: options.importedMember?.alignment ?? null,
      personalityTraits: options.importedMember?.characteristics.personalityTraits ?? "",
      ideals: options.importedMember?.characteristics.ideals ?? "",
      bonds: options.importedMember?.characteristics.bonds ?? "",
      flaws: options.importedMember?.characteristics.flaws ?? "",
      appearance: options.importedMember?.characteristics.appearance ?? "",
      backstory: options.importedMember?.characteristics.backstory ?? "",
      allies: options.importedMember?.characteristics.allies ?? "",
      enemies: options.importedMember?.characteristics.enemies ?? "",
      organizations: options.importedMember?.characteristics.organizations ?? "",
      notes: options.importedMember?.characteristics.otherNotes ?? "",
      currencies: options.importedMember?.currencies ?? { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    },
    build: {
      schemaVersion: 3,
      revision: character.build.revision,
      rulesContext: {
        generation: "2024",
        policyId: "current-2024-compatible",
        catalogRevision: contentRevision,
      },
      speciesRef: exactRuleRef(character.build.speciesRef, contentRevision),
      backgroundRef: exactRuleRef(character.build.backgroundRef, contentRevision),
      abilityBasis: {
        method: character.build.abilityBasis.method,
        baseScores: character.build.abilityBasis.scores,
        verified: character.build.abilityBasis.verified,
      },
      levels: character.build.levels.map((level) => ({
        characterLevel: level.characterLevel,
        classLevel: level.classLevel,
        classRef: classRefs.get(level.classRef.id)!,
        provenance: level.reconstruction === "native" ? "native" : "imported-single-class",
      })),
      subclasses: character.build.subclasses.map((subclass) => ({
        classVersionKey: classRefs.get(subclass.classRefId)!.versionKey,
        subclassRef: exactRuleRef(subclass.subclassRef, contentRevision),
        selectedAtCharacterLevel: subclass.selectedAtCharacterLevel,
      })),
      decisions,
      spells: spellSelections(options.importedMember, primaryClass.versionKey, contentRevision),
      overrides: [],
    },
    hitPoints: {
      baseline: {
        throughCharacterLevel: character.build.levels.length,
        maximum: character.liveState.maxHp,
        method: "imported-baseline",
        verified: false,
      },
      gains: [],
    },
    liveState: {
      revision: character.liveState.revision,
      currentHp: character.liveState.currentHp,
      temporaryHp: character.liveState.temporaryHp,
      inspiration: character.liveState.inspiration,
      exhaustion: character.liveState.exhaustion,
      deathSaves: character.liveState.deathSaves,
      resources: character.liveState.resources.map((resource) => ({
        key: resource.key,
        sourceVersionKey: null,
        label: resource.label,
        current: resource.current,
        maximum: resource.max,
        recovery: resource.reset,
      })),
      conditions: character.liveState.conditions.map((condition) => ({
        id: condition.id,
        conditionRef: null,
        label: condition.label,
        sourceLabel: condition.source,
        appliedByUserId: condition.appliedByUserId,
      })),
    },
    items: character.items.map((item) => ({
      id: item.id,
      definitionRef: item.definitionRef ? exactRuleRef(item.definitionRef, contentRevision) : null,
      name: item.name,
      quantity: item.quantity,
      equipped: item.equipped,
      attuned: item.attuned,
      containerId: item.containerId,
      provenance: item.provenance,
      charges: null,
    })),
    migrationBaseline: importedCapabilities(options.importedMember),
    resolutions: character.migrationResolutions.map((resolution) => ({
      id: `resolution:ddb:exclude:${resolution.sourceDefinitionId}`,
      type: "exclude-imported-definition" as const,
      sourceSystem: "ddb" as const,
      sourceDefinitionId: resolution.sourceDefinitionId,
      reason: resolution.reason,
    })),
    migrationIssues,
  };
  return CharacterAggregateSchema.parse(migrated);
}

export function migrateDdbPayloadToCharacterV3(input: {
  payload: unknown;
  ownerUserId: string;
  campaignId: string;
  v2MigrationOptions?: unknown;
}): CharacterAggregate {
  const payload = input.payload as { data?: { id?: unknown } };
  const externalId = Number(payload?.data?.id);
  if (!Number.isInteger(externalId) || externalId <= 0) {
    throw new Error("D&D Beyond payload has an invalid character ID");
  }
  const v2 = migrateDdbPayloadToCharacterV2(
    input.payload,
    input.ownerUserId,
    input.v2MigrationOptions,
  );
  const member = parseCharacterPayload(externalId, input.payload);
  return attachDdbGrantedSpellSources(
    migrateCharacterV2ToV3(v2, { campaignId: input.campaignId, importedMember: member }),
    input.payload,
  );
}
