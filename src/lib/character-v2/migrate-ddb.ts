import { parseCharacterPayload } from "@/lib/parser";
import type { PartyMember } from "@/lib/dndbeyond.types";
import { z } from "zod";
import {
  CHARACTER_RULESET,
  CHARACTER_SCHEMA_VERSION,
  CharacterAggregateSchema,
  type CharacterAggregate,
  type RuleRef,
} from "./schema";

export const DdbMigrationOptionsSchema = z
  .object({
    excludedFeatDefinitions: z
      .array(
        z
          .object({
            definitionId: z.number().int().positive(),
            reason: z.string().trim().min(1),
          })
          .strict(),
      )
      .default([]),
  })
  .strict()
  .default({ excludedFeatDefinitions: [] });

function slugify(value: unknown): string {
  const slug = String(value ?? "unknown")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "unknown";
}

function sourceId(definition: any): string {
  const source = definition?.sources?.[0];
  return String(source?.sourceId ?? source?.sourceIdNumber ?? "ddb-import");
}

function importedRuleRef(kind: RuleRef["kind"], definition: any, fallbackName: string): RuleRef {
  const name = String(definition?.name ?? fallbackName).trim() || fallbackName;
  const externalId = definition?.id ?? definition?.definitionId;
  return {
    kind,
    id: `ddb:${kind}:${externalId ?? slugify(name)}`,
    name,
    ruleset: CHARACTER_RULESET,
    sourceId: sourceId(definition),
    verification: "imported-unverified",
  };
}

function toAbilityScores(member: PartyMember) {
  const scores = new Map(
    member.abilities.map((ability) => [ability.name.slice(0, 3).toUpperCase(), ability.score]),
  );
  const byIndex = member.abilities.map((ability) => ability.score);
  return {
    STR: scores.get("STR") ?? byIndex[0] ?? 10,
    DEX: scores.get("DEX") ?? byIndex[1] ?? 10,
    CON: scores.get("CON") ?? byIndex[2] ?? 10,
    INT: scores.get("INT") ?? byIndex[3] ?? 10,
    WIS: scores.get("WIS") ?? byIndex[4] ?? 10,
    CHA: scores.get("CHA") ?? byIndex[5] ?? 10,
  };
}

function safeAvatarUrl(value: unknown): string | null {
  if (typeof value !== "string" || !/^https?:\/\//i.test(value)) return null;
  return value;
}

function normalizeResourceReset(value: string): "short-rest" | "long-rest" | "dawn" | "manual" {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("short")) return "short-rest";
  if (normalized.includes("long")) return "long-rest";
  if (normalized.includes("dawn")) return "dawn";
  return "manual";
}

export function migrateDdbPayloadToCharacterV2(
  payload: any,
  ownerUserId: string,
  rawOptions?: unknown,
): CharacterAggregate {
  const options = DdbMigrationOptionsSchema.parse(rawOptions);
  const excludedFeatDefinitions = new Map(
    options.excludedFeatDefinitions.map((decision) => [decision.definitionId, decision.reason]),
  );
  const data = payload?.data;
  if (!data || typeof data !== "object") {
    throw new Error("D&D Beyond payload does not contain character data");
  }

  const externalId = Number(data.id);
  if (!Number.isInteger(externalId) || externalId <= 0) {
    throw new Error("D&D Beyond payload has an invalid character ID");
  }

  const member = parseCharacterPayload(externalId, payload);
  if (member.error) {
    throw new Error(`Unable to parse imported character: ${member.error}`);
  }

  const classRows = [...(data.classes ?? [])].sort((left: any, right: any) => {
    return Number(Boolean(right?.isStartingClass)) - Number(Boolean(left?.isStartingClass));
  });
  const migrationIssues: CharacterAggregate["migrationIssues"] = [
    {
      code: "DDB_BUILD_REQUIRES_2024_VERIFICATION",
      severity: "warning",
      message:
        "Imported rule references must be matched to canonical 2024 content before detachment.",
    },
    {
      code: "IMPORTED_CHOICE_LEVELS_UNKNOWN",
      severity: "warning",
      message:
        "D&D Beyond does not provide a trustworthy acquisition level for every imported choice.",
    },
  ];

  if (classRows.length > 1) {
    migrationIssues.push({
      code: "MULTICLASS_LEVEL_ORDER_REQUIRES_REVIEW",
      severity: "blocking",
      message:
        "Aggregate multiclass levels cannot prove the historical order of class progression.",
    });
  }

  const levels: CharacterAggregate["build"]["levels"] = [];
  const classRefs = new Map<any, RuleRef>();
  for (const classRow of classRows) {
    const classRef = importedRuleRef(
      "class",
      classRow?.definition,
      classRow?.definition?.name ?? "Unknown Class",
    );
    classRefs.set(classRow, classRef);
    for (let classLevel = 1; classLevel <= Number(classRow?.level ?? 0); classLevel += 1) {
      levels.push({
        characterLevel: levels.length + 1,
        classLevel,
        classRef,
        hpGain: null,
        reconstruction: classRows.length === 1 ? "single-class-import" : "unverified-import",
      });
    }
  }

  const subclasses = classRows.flatMap((classRow: any) => {
    if (!classRow?.subclassDefinition) return [];
    const classRef = classRefs.get(classRow);
    if (!classRef) return [];
    return [
      {
        classRefId: classRef.id,
        subclassRef: importedRuleRef(
          "subclass",
          classRow.subclassDefinition,
          classRow.subclassDefinition.name ?? "Unknown Subclass",
        ),
        selectedAtCharacterLevel: null,
      },
    ];
  });

  const importedFeatChoiceRows = Array.isArray(data.choices?.feat) ? data.choices.feat : [];
  const featChoices = (data.feats ?? [])
    .filter((feat: any) => !excludedFeatDefinitions.has(Number(feat?.definition?.id)))
    .map((feat: any, index: number) => {
      const definitionId = feat?.definition?.id;
      const relatedChoices = importedFeatChoiceRows.filter(
        (choice: any) => choice?.componentId === definitionId,
      );
      const unresolvedChoices = relatedChoices.filter(
        (choice: any) =>
          choice?.optionValue == null &&
          Array.isArray(choice?.optionIds) &&
          choice.optionIds.length > 0,
      );
      return {
        id: `ddb:${externalId}:feat-choice:${feat?.componentId ?? definitionId ?? index}`,
        groupId: "imported-feats",
        selection: importedRuleRef(
          "feat",
          feat?.definition,
          feat?.definition?.name ?? "Unknown Feat",
        ),
        grantedAtCharacterLevel: null,
        provenance: "imported" as const,
        selectionState:
          unresolvedChoices.length > 0
            ? ("unresolved-required-choice" as const)
            : ("confirmed" as const),
        payload:
          unresolvedChoices.length > 0
            ? {
                unresolvedChoices: unresolvedChoices.map((choice: any) => ({
                  choiceId: String(choice.id ?? "unknown"),
                  optionIds: choice.optionIds.map(String),
                })),
              }
            : undefined,
      };
    });

  for (const choice of featChoices) {
    if (choice.selectionState === "unresolved-required-choice") {
      migrationIssues.push({
        code: "DDB_REQUIRED_CHOICE_UNRESOLVED",
        severity: "blocking",
        message: `${choice.selection.name} has available options but no selected option in the D&D Beyond payload.`,
      });
    }
  }

  const speciesDefinition = data.race ?? {};
  const backgroundDefinition =
    data.background?.definition ?? data.background?.customBackground ?? {};
  const spellResources = member.spellSlots.map((slot) => ({
    key: `spell-slot:${slot.level}`,
    label: `Level ${slot.level} Spell Slots`,
    current: Math.max(0, slot.max - slot.used),
    max: slot.max,
    reset: "long-rest" as const,
  }));
  const pactResources = member.pactSlots.map((slot) => ({
    key: `pact-slot:${slot.level}`,
    label: `Level ${slot.level} Pact Slots`,
    current: Math.max(0, slot.max - slot.used),
    max: slot.max,
    reset: "short-rest" as const,
  }));
  const actionResources = member.actions
    .filter((action) => action.uses && action.uses.max > 0)
    .map((action) => ({
      key: `action:${slugify(action.source)}:${slugify(action.name)}`,
      label: action.name,
      current: action.uses!.current,
      max: action.uses!.max,
      reset: normalizeResourceReset(action.uses!.reset),
    }));

  const character: CharacterAggregate = {
    identity: {
      id: `mob:character:${externalId}`,
      ownerUserId,
      name: member.name,
      avatarUrl: safeAvatarUrl(member.avatarUrl),
      externalRefs: [{ system: "ddb", id: String(externalId) }],
    },
    build: {
      schemaVersion: CHARACTER_SCHEMA_VERSION,
      ruleset: CHARACTER_RULESET,
      contentRevision: "workspace-2024-prototype",
      revision: 1,
      speciesRef: importedRuleRef("species", speciesDefinition, member.race),
      backgroundRef: importedRuleRef("background", backgroundDefinition, member.background),
      abilityBasis: {
        method: "imported-baseline",
        scores: toAbilityScores(member),
        verified: false,
      },
      levels,
      subclasses,
      choices: featChoices,
      overrides: [
        {
          id: `ddb:${externalId}:baseline`,
          kind: "migration-baseline",
          reason:
            "Preserves the imported final ability scores until their 2024 build choices are reconciled.",
          payload: { externalCharacterId: externalId },
        },
      ],
    },
    liveState: {
      revision: 0,
      currentHp: member.hpCurrent,
      maxHp: member.hpMax,
      temporaryHp: member.tempHp,
      inspiration: member.inspiration,
      exhaustion: member.exhaustion,
      deathSaves: member.deathSaves,
      resources: [...spellResources, ...pactResources, ...actionResources],
      conditions: member.conditions.map((condition, index) => ({
        id: `ddb:${externalId}:condition:${slugify(condition)}:${index}`,
        conditionId: slugify(condition),
        label: condition,
        source: null,
        appliedByUserId: null,
      })),
    },
    items: (data.inventory ?? []).map((item: any, index: number) => {
      const definition = item?.definition;
      return {
        id: `ddb:${externalId}:item:${item?.id ?? index}`,
        definitionRef: definition
          ? importedRuleRef("item", definition, definition.name ?? "Unknown Item")
          : null,
        name: String(definition?.name ?? item?.name ?? "Unknown Item"),
        quantity: Math.max(1, Number(item?.quantity ?? 1)),
        equipped: Boolean(item?.equipped),
        attuned: Boolean(item?.isAttuned ?? item?.attuned),
        containerId: null,
        provenance: "imported" as const,
      };
    }),
    migrationIssues,
    migrationResolutions: options.excludedFeatDefinitions.map((decision) => ({
      kind: "exclude-imported-feat-wrapper" as const,
      sourceDefinitionId: String(decision.definitionId),
      reason: decision.reason,
    })),
  };

  return CharacterAggregateSchema.parse(character);
}
