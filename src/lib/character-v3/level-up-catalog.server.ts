import type Database from "better-sqlite3";
import { createRuleFamilyKey, createRuleVersionKey } from "../character-v2/rule-identity";
import { ExactRuleRefSchema } from "./schema";
import type { Ability } from "./derived-sheet";
import type { ClassHitPointRule } from "./level-up-hp";
import type { GeneralFeatCandidate } from "./level-up-planner";
import type { LevelUpSubclassCandidate } from "./level-up-subclass";
import type { LevelUpFeatureCatalogRecord } from "./level-up-features";
import type { LevelUpFeatureCatalogRecord } from "./level-up-features";
import type { LevelUpSpellCatalogRecord } from "./level-up-spells";

type FeatRow = {
  id: string;
  name: string;
  category: string;
  level_requirement: number | null;
  repeatable: number;
  source: string | null;
  raw_json: string | null;
};

const ABILITIES = new Set<Ability>(["STR", "DEX", "CON", "INT", "WIS", "CHA"]);

export function generalFeatCandidateFromRow(row: FeatRow): GeneralFeatCandidate | null {
  if (row.category !== "General" || row.source?.toUpperCase() !== "XPHB" || !row.raw_json) {
    return null;
  }
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(row.raw_json) as Record<string, unknown>;
  } catch {
    return null;
  }
  const rawPrerequisites = Array.isArray(raw.prerequisite) ? raw.prerequisite : [];
  const prerequisiteAlternatives: GeneralFeatCandidate["prerequisiteAlternatives"] = [];
  let minimumCharacterLevel = row.level_requirement ?? 4;
  for (const alternative of rawPrerequisites) {
    if (!alternative || typeof alternative !== "object" || Array.isArray(alternative)) return null;
    const record = alternative as Record<string, unknown>;
    if (Object.keys(record).some((key) => key !== "level" && key !== "ability")) return null;
    if (typeof record.level === "number")
      minimumCharacterLevel = Math.max(minimumCharacterLevel, record.level);
    const requirements: Array<{ ability: Ability; minimum: number }> = [];
    if (record.ability !== undefined) {
      if (!Array.isArray(record.ability)) return null;
      for (const abilityRequirement of record.ability) {
        if (!abilityRequirement || typeof abilityRequirement !== "object") return null;
        for (const [rawAbility, rawMinimum] of Object.entries(
          abilityRequirement as Record<string, unknown>,
        )) {
          const ability = rawAbility.toUpperCase() as Ability;
          if (!ABILITIES.has(ability) || typeof rawMinimum !== "number") return null;
          requirements.push({ ability, minimum: rawMinimum });
        }
      }
    }
    prerequisiteAlternatives.push(requirements);
  }
  const sourceId = row.source.toUpperCase();
  const contentRevision = "2024";
  return {
    ref: ExactRuleRefSchema.parse({
      kind: "feat",
      familyKey: createRuleFamilyKey("feat", row.name),
      versionKey: createRuleVersionKey({
        kind: "feat",
        sourceId,
        upstreamId: row.id,
        contentRevision,
      }),
      name: row.name,
      rulesGeneration: "2024",
      sourceId,
      upstreamId: row.id,
      contentRevision,
      compatibility: "core-2024",
      verification: "verified",
    }),
    compatibleWith2024: true,
    minimumCharacterLevel,
    prerequisiteAlternatives,
    repeatable: Boolean(row.repeatable),
  };
}

export function loadGeneralFeatCandidates(sqlite: Database.Database): GeneralFeatCandidate[] {
  const rows = sqlite
    .prepare(
      "SELECT id, name, category, level_requirement, repeatable, source, raw_json FROM feats WHERE category = 'General'",
    )
    .all() as FeatRow[];
  return rows
    .map(generalFeatCandidateFromRow)
    .filter((candidate): candidate is GeneralFeatCandidate => candidate !== null);
}

export function loadClassHitPointRule(
  sqlite: Database.Database,
  classRef: { versionKey: string; upstreamId: string; sourceId: string },
): ClassHitPointRule {
  const row = sqlite
    .prepare("SELECT hit_dice, hp_higher_levels, source FROM classes WHERE id = ?")
    .get(classRef.upstreamId) as
    | { hit_dice: number; hp_higher_levels: number; source: string | null }
    | undefined;
  if (!row || row.source?.toUpperCase() !== classRef.sourceId.toUpperCase()) {
    throw new Error("Exact-version class Hit Point rule is unavailable");
  }
  return {
    classVersionKey: classRef.versionKey,
    hitDie: Number(row.hit_dice),
    fixedContribution: Number(row.hp_higher_levels),
  };
}

export function loadClassProgressionJson(
  sqlite: Database.Database,
  classRef: { upstreamId: string; sourceId: string },
): string | null {
  const row = sqlite
    .prepare("SELECT options_progression_json, source FROM classes WHERE id = ?")
    .get(classRef.upstreamId) as
    | { options_progression_json: string | null; source: string | null }
    | undefined;
  if (!row || row.source?.toUpperCase() !== classRef.sourceId.toUpperCase()) {
    throw new Error("Exact-version class progression rule is unavailable");
  }
  return row.options_progression_json;
}

export function loadClassSubclassCandidates(
  sqlite: Database.Database,
  classRef: { versionKey: string; upstreamId: string; sourceId: string },
): LevelUpSubclassCandidate[] {
  const rows = sqlite
    .prepare(
      `SELECT id, name, level_chosen, source, class_source
       FROM subclasses
       WHERE class_id = ?`,
    )
    .all(classRef.upstreamId) as Array<{
    id: string;
    name: string;
    level_chosen: number;
    source: string | null;
    class_source: string | null;
  }>;
  return rows
    .filter((row) => row.class_source?.toUpperCase() === classRef.sourceId.toUpperCase())
    .filter((row) => row.source?.toUpperCase() === "XPHB")
    .map((row) => {
      const sourceId = row.source!.toUpperCase();
      const contentRevision = "2024";
      return {
        classVersionKey: classRef.versionKey,
        levelChosen: Number(row.level_chosen),
        subclassRef: ExactRuleRefSchema.parse({
          kind: "subclass",
          familyKey: createRuleFamilyKey("subclass", row.name),
          versionKey: createRuleVersionKey({
            kind: "subclass",
            sourceId,
            upstreamId: row.id,
            contentRevision,
          }),
          name: row.name,
          rulesGeneration: "2024",
          sourceId,
          upstreamId: row.id,
          contentRevision,
          compatibility: "core-2024",
          verification: "verified",
        }),
      };
    });
}

export function loadLevelUpFeatureCatalog(
  sqlite: Database.Database,
  classRef: { versionKey: string; upstreamId: string; sourceId: string },
  subclassRefs: Array<{ versionKey: string; upstreamId: string; sourceId: string }> = [],
): LevelUpFeatureCatalogRecord[] {
  const allowedSubclasses = new Map(
    subclassRefs.map((subclass) => [subclass.upstreamId, subclass]),
  );
  const rows = sqlite
    .prepare(
      `SELECT id, name, subclass_id, level_required, source, class_source, subclass_source,
              options_json, uses_json, mathematical_recovery_json
       FROM class_features
       WHERE class_id = ? AND level_required IS NOT NULL`,
    )
    .all(classRef.upstreamId) as Array<{
    id: string;
    name: string;
    subclass_id: string | null;
    level_required: number;
    source: string | null;
    class_source: string | null;
    subclass_source: string | null;
    options_json: string | null;
    uses_json: string | null;
    mathematical_recovery_json: string | null;
  }>;
  return rows.flatMap((row): LevelUpFeatureCatalogRecord[] => {
    if (
      row.source?.toUpperCase() !== "XPHB" ||
      row.class_source?.toUpperCase() !== classRef.sourceId.toUpperCase()
    ) {
      return [];
    }
    const subclass = row.subclass_id ? allowedSubclasses.get(row.subclass_id) : undefined;
    if (row.subclass_id && !subclass) return [];
    if (subclass && row.subclass_source?.toUpperCase() !== subclass.sourceId.toUpperCase()) {
      return [];
    }
    const sourceId = row.source.toUpperCase();
    const contentRevision = "2024";
    return [
      {
        featureRef: ExactRuleRefSchema.parse({
          kind: "feature",
          familyKey: createRuleFamilyKey("feature", row.name),
          versionKey: createRuleVersionKey({
            kind: "feature",
            sourceId,
            upstreamId: row.id,
            contentRevision,
          }),
          name: row.name,
          rulesGeneration: "2024",
          sourceId,
          upstreamId: row.id,
          contentRevision,
          compatibility: "core-2024",
          verification: "verified",
        }),
        classVersionKey: classRef.versionKey,
        subclassVersionKey: subclass?.versionKey ?? null,
        levelRequired: Number(row.level_required),
        optionsJson: row.options_json,
        usesJson: row.uses_json,
        mathematicalRecoveryJson: row.mathematical_recovery_json,
      },
    ];
  });
}

export function loadClassSpellCatalog(
  sqlite: Database.Database,
  classRef: { versionKey: string; upstreamId: string; sourceId: string },
): LevelUpSpellCatalogRecord[] {
  const classRow = sqlite
    .prepare("SELECT source FROM classes WHERE id = ?")
    .get(classRef.upstreamId) as { source: string | null } | undefined;
  if (!classRow || classRow.source?.toUpperCase() !== classRef.sourceId.toUpperCase()) {
    throw new Error("Exact-version class spell list is unavailable");
  }
  const rows = sqlite
    .prepare(
      `SELECT spells.id, spells.name, spells.level, spells.source
       FROM class_spells
       INNER JOIN spells ON spells.id = class_spells.spell_id
       WHERE class_spells.class_id = ?`,
    )
    .all(classRef.upstreamId) as Array<{
    id: string;
    name: string;
    level: number;
    source: string | null;
  }>;
  return rows
    .filter((row) => row.source?.toUpperCase() === "XPHB")
    .map((row) => {
      const sourceId = row.source!.toUpperCase();
      const contentRevision = "2024";
      return {
        spellRef: ExactRuleRefSchema.parse({
          kind: "spell",
          familyKey: createRuleFamilyKey("spell", row.name),
          versionKey: createRuleVersionKey({
            kind: "spell",
            sourceId,
            upstreamId: row.id,
            contentRevision,
          }),
          name: row.name,
          rulesGeneration: "2024",
          sourceId,
          upstreamId: row.id,
          contentRevision,
          compatibility: "core-2024",
          verification: "verified",
        }),
        level: Number(row.level),
        classVersionKeys: [classRef.versionKey],
      };
    });
}

export function loadSubclassAdditionalSpells(
  sqlite: Database.Database,
  subclassRef: { upstreamId: string; sourceId: string },
): unknown {
  const row = sqlite
    .prepare("SELECT source, raw_json FROM subclasses WHERE id = ?")
    .get(subclassRef.upstreamId) as { source: string | null; raw_json: string | null } | undefined;
  if (!row || row.source?.toUpperCase() !== subclassRef.sourceId.toUpperCase() || !row.raw_json) {
    throw new Error("Exact-version subclass spell data is unavailable");
  }
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(row.raw_json) as Record<string, unknown>;
  } catch {
    throw new Error("Exact-version subclass spell data is malformed");
  }
  return raw.additionalSpells ?? [];
}

export function loadVerifiedSpellCatalog(
  sqlite: Database.Database,
): Array<{ spellRef: ExactRuleRef; spellLevel: number; schoolId: string; classIds: string[] }> {
  const rows = sqlite
    .prepare("SELECT id, name, level, school, source FROM spells WHERE source = 'XPHB'")
    .all() as Array<{ id: string; name: string; level: number; school: string; source: string }>;
  const classRows = sqlite.prepare("SELECT class_id, spell_id FROM class_spells").all() as Array<{
    class_id: string;
    spell_id: string;
  }>;
  const classesBySpell = new Map<string, string[]>();
  classRows.forEach((row) =>
    classesBySpell.set(row.spell_id, [
      ...(classesBySpell.get(row.spell_id) ?? []),
      row.class_id.toLowerCase(),
    ]),
  );
  return rows.map((row) => ({
    spellRef: ExactRuleRefSchema.parse({
      kind: "spell",
      familyKey: createRuleFamilyKey("spell", row.name),
      versionKey: createRuleVersionKey({
        kind: "spell",
        sourceId: row.source.toUpperCase(),
        upstreamId: row.id,
        contentRevision: "2024",
      }),
      name: row.name,
      rulesGeneration: "2024",
      sourceId: row.source.toUpperCase(),
      upstreamId: row.id,
      contentRevision: "2024",
      compatibility: "core-2024",
      verification: "verified",
    }),
    spellLevel: Number(row.level),
    schoolId: row.school.toUpperCase(),
    classIds: classesBySpell.get(row.id) ?? [],
  }));
}
