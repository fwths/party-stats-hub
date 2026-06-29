import { z } from "zod";
import {
  isAcceptedByCurrentRulesPolicy,
  normalizeRuleName,
  type RulesCompatibility,
} from "./reconcile";

export const RuleKindSchema = z.enum([
  "species",
  "background",
  "class",
  "subclass",
  "feat",
  "spell",
  "item",
  "feature",
  "proficiency",
  "other",
]);

const IdentityPart = z.string().trim().min(1).max(200);

export const RuleVersionIdentitySchema = z
  .object({
    kind: RuleKindSchema,
    sourceId: IdentityPart,
    upstreamId: IdentityPart,
    contentRevision: IdentityPart,
  })
  .strict();

export const RuleVersionRecordSchema = z
  .object({
    identity: RuleVersionIdentitySchema,
    versionKey: IdentityPart,
    familyKey: IdentityPart,
    name: IdentityPart,
    compatibility: z.enum(["core-2024", "current-2024-compatible", "legacy"]),
    releaseOrder: z.number().int().min(0),
  })
  .strict();

export type RuleVersionRecord = z.infer<typeof RuleVersionRecordSchema>;

export const RuleAliasSchema = z
  .object({
    kind: RuleKindSchema,
    alias: IdentityPart,
    familyKey: IdentityPart,
  })
  .strict();

export type RuleAlias = z.infer<typeof RuleAliasSchema>;

function keyPart(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!normalized) throw new Error("Rule identity parts cannot normalize to an empty value");
  return normalized;
}

export function createRuleFamilyKey(kind: z.infer<typeof RuleKindSchema>, name: string): string {
  return `${kind}:${keyPart(normalizeRuleName(name))}`;
}

export function createRuleVersionKey(identity: z.infer<typeof RuleVersionIdentitySchema>): string {
  const parsed = RuleVersionIdentitySchema.parse(identity);
  return `${parsed.kind}:${keyPart(parsed.sourceId)}:${keyPart(parsed.upstreamId)}@${keyPart(parsed.contentRevision)}`;
}

export function createRuleVersion(input: {
  identity: z.infer<typeof RuleVersionIdentitySchema>;
  name: string;
  familyName?: string;
  compatibility: RulesCompatibility;
  releaseOrder: number;
}): RuleVersionRecord {
  return RuleVersionRecordSchema.parse({
    identity: input.identity,
    versionKey: createRuleVersionKey(input.identity),
    familyKey: createRuleFamilyKey(input.identity.kind, input.familyName ?? input.name),
    name: input.name,
    compatibility: input.compatibility,
    releaseOrder: input.releaseOrder,
  });
}

export type RuleCatalogIndex = {
  byVersionKey: ReadonlyMap<string, RuleVersionRecord>;
  byFamilyKey: ReadonlyMap<string, readonly RuleVersionRecord[]>;
};

export class DuplicateRuleVersionError extends Error {
  constructor(versionKey: string) {
    super(`Duplicate canonical rule version key: ${versionKey}`);
    this.name = "DuplicateRuleVersionError";
  }
}

export function buildRuleCatalogIndex(records: RuleVersionRecord[]): RuleCatalogIndex {
  const byVersionKey = new Map<string, RuleVersionRecord>();
  const byFamilyKey = new Map<string, RuleVersionRecord[]>();
  for (const rawRecord of records) {
    const record = RuleVersionRecordSchema.parse(rawRecord);
    if (byVersionKey.has(record.versionKey)) {
      throw new DuplicateRuleVersionError(record.versionKey);
    }
    byVersionKey.set(record.versionKey, record);
    const family = byFamilyKey.get(record.familyKey) ?? [];
    family.push(record);
    family.sort((left, right) => right.releaseOrder - left.releaseOrder);
    byFamilyKey.set(record.familyKey, family);
  }
  return { byVersionKey, byFamilyKey };
}

export function selectPreferredRuleVersion(
  index: RuleCatalogIndex,
  familyKey: string,
): RuleVersionRecord | null {
  const versions = index.byFamilyKey.get(familyKey) ?? [];
  return versions.find((version) => isAcceptedByCurrentRulesPolicy(version.compatibility)) ?? null;
}

export function resolveRuleFamilyKey(
  kind: z.infer<typeof RuleKindSchema>,
  name: string,
  aliases: RuleAlias[] = [],
): string {
  const normalizedName = normalizeRuleName(name);
  const alias = aliases
    .map((entry) => RuleAliasSchema.parse(entry))
    .find((entry) => entry.kind === kind && normalizeRuleName(entry.alias) === normalizedName);
  return alias?.familyKey ?? createRuleFamilyKey(kind, name);
}
