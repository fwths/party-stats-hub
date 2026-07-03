import { z } from "zod";
import { createRuleFamilyKey, createRuleVersionKey } from "../character-v2/rule-identity";
import { CharacterItemSchema, type CharacterAggregate } from "./schema";

const CatalogItemRecordSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("weapon"), id: z.string().min(1), name: z.string().min(1), source: z.string().min(1),
    category: z.string(), type: z.string(), costGp: z.number().min(0), damageDice: z.string(),
    damageType: z.string(), properties: z.array(z.string()), weight: z.number().min(0),
  }).strict(),
  z.object({
    kind: z.literal("armor"), id: z.string().min(1), name: z.string().min(1), source: z.string().min(1),
    category: z.string(), costGp: z.number().min(0), armorClass: z.number().int().min(0),
    weight: z.number().min(0),
  }).strict(),
  z.object({
    kind: z.literal("magic-item"), id: z.string().min(1), name: z.string().min(1), source: z.string().min(1),
    type: z.string(), rarity: z.string(), description: z.string(), weight: z.number().min(0).nullable(),
    requiresAttunement: z.boolean(), attunementConditions: z.string().nullable(),
  }).strict(),
]);

export type CatalogItemRecord = z.infer<typeof CatalogItemRecordSchema>;

const CORE_2024_SOURCES = new Set(["XPHB", "XDMG", "XMM", "SRD5.2"]);

export function resolveCatalogItem(input: {
  record: CatalogItemRecord;
  character: CharacterAggregate;
  instanceId: string;
  quantity: number;
}) {
  const record = CatalogItemRecordSchema.parse(input.record);
  const contentRevision = input.character.build.rulesContext.catalogRevision;
  const identity = {
    kind: "item" as const,
    sourceId: record.source,
    upstreamId: record.id,
    contentRevision,
  };
  const definitionRef = {
    kind: "item" as const,
    familyKey: createRuleFamilyKey("item", record.name),
    versionKey: createRuleVersionKey(identity),
    name: record.name,
    rulesGeneration: "2024" as const,
    sourceId: record.source,
    upstreamId: record.id,
    contentRevision,
    compatibility: CORE_2024_SOURCES.has(record.source)
      ? ("core-2024" as const)
      : ("current-2024-compatible" as const),
    verification: "verified" as const,
  };
  const common = {
    id: input.instanceId,
    definitionRef,
    name: record.name,
    quantity: input.quantity,
    equipped: false,
    attuned: false,
    attunementRequirement: record.kind === "magic-item"
      ? {
          status: record.requiresAttunement ? ("required" as const) : ("not-required" as const),
          conditions: record.attunementConditions,
          provenance: "verified-rule" as const,
        }
      : { status: "not-required" as const, conditions: null, provenance: "verified-rule" as const },
    containerId: null,
    provenance: "native" as const,
    charges: null,
  };
  const details = record.kind === "weapon"
    ? {
        sourceSystem: "rules-catalog" as const, provenance: "verified-rule" as const,
        type: `${record.category} ${record.type} Weapon`.trim(), rarity: null, magic: false,
        weight: record.weight, description: "", snippet: "", cost: record.costGp,
        damage: `${record.damageDice} ${record.damageType}`.trim(), properties: record.properties,
        armorClass: null, armorTypeId: null,
      }
    : record.kind === "armor"
      ? {
          sourceSystem: "rules-catalog" as const, provenance: "verified-rule" as const,
          type: record.category, rarity: null, magic: false, weight: record.weight,
          description: "", snippet: "", cost: record.costGp, damage: null, properties: [],
          armorClass: record.armorClass,
          armorTypeId: /shield/i.test(record.category) ? 4 : /light/i.test(record.category) ? 1 : /medium/i.test(record.category) ? 2 : /heavy/i.test(record.category) ? 3 : null,
        }
      : {
          sourceSystem: "rules-catalog" as const, provenance: "verified-rule" as const,
          type: record.type, rarity: record.rarity, magic: true, weight: record.weight,
          description: record.description, snippet: "", cost: null, damage: null, properties: [],
          armorClass: null, armorTypeId: null,
        };
  return CharacterItemSchema.parse({ ...common, details });
}
